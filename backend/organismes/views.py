"""
Vues API des organismes premier / deuxième niveau — CRUD admin-only (registre global).

Réservé à `ROLE_SUPER_ADMIN` / `ROLE_ADMIN_SYSTEME`. Suppression = soft-delete, avec
actions `restore`, `bulk-restore` et `bulk-delete`. Reprend le patron de
`projects.views.BaseOrgScopedViewSet` SANS le scoping par organisation (registre global).
"""
from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import OrganismeNiveau1, OrganismeNiveau2
from .permissions import ReadOnlyOrSuperAdminSysteme
from .serializers import OrganismeNiveau1Serializer, OrganismeNiveau2Serializer


class _BaseOrganismeViewSet(viewsets.ModelViewSet):
    """Base : lecture ouverte aux utilisateurs authentifiés (listes déroulantes du
    formulaire de propriété) ; écriture réservée au Super Admin / Admin Système. Filtre
    `show_deleted`, soft-delete, audit, actions bulk."""
    permission_classes = [IsAuthenticated, ReadOnlyOrSuperAdminSysteme]

    def _annotate(self, qs):
        return qs

    def get_queryset(self):
        show_deleted = self.request.query_params.get('show_deleted', '').lower() in ('true', '1', 'yes')
        qs = self.queryset.filter(is_deleted=show_deleted)
        return self._annotate(qs)

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)

    def perform_destroy(self, instance):
        instance.is_deleted = True
        instance.deleted_at = timezone.now()
        instance.deleted_by = self.request.user
        instance.save(update_fields=['is_deleted', 'deleted_at', 'deleted_by'])

    @action(detail=True, methods=['post'])
    def restore(self, request, pk=None):
        """POST /…/{id}/restore/ — annule la suppression logique."""
        instance = self._annotate(self.queryset).filter(pk=pk, is_deleted=True).first()
        if instance is None:
            return Response({'detail': 'Élément non trouvé ou non supprimé.'},
                            status=status.HTTP_404_NOT_FOUND)
        instance.is_deleted = False
        instance.deleted_at = None
        instance.deleted_by = None
        instance.save(update_fields=['is_deleted', 'deleted_at', 'deleted_by'])
        return Response(self.get_serializer(instance).data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='bulk-restore')
    def bulk_restore(self, request):
        """POST /…/bulk-restore/ — {"ids": [...]} — restaure plusieurs éléments."""
        ids = request.data.get('ids', [])
        if not isinstance(ids, list) or not ids:
            return Response({'detail': 'La liste ids est requise.'},
                            status=status.HTTP_400_BAD_REQUEST)
        qs = self.queryset.filter(pk__in=ids, is_deleted=True)
        restored_count = qs.count()
        qs.update(is_deleted=False, deleted_at=None, deleted_by=None)
        return Response({'restored_count': restored_count}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='bulk-delete')
    def bulk_delete(self, request):
        """POST /…/bulk-delete/ — {"ids": [...]} — soft-delete en masse."""
        ids = request.data.get('ids', [])
        if not isinstance(ids, list) or not ids:
            return Response({'detail': 'La liste ids est requise.'},
                            status=status.HTTP_400_BAD_REQUEST)
        qs = self.queryset.filter(pk__in=ids, is_deleted=False)
        deleted_count = qs.count()
        qs.update(is_deleted=True, deleted_at=timezone.now(), deleted_by=request.user)
        return Response({'deleted_count': deleted_count}, status=status.HTTP_200_OK)


class OrganismeNiveau1ViewSet(_BaseOrganismeViewSet):
    queryset = OrganismeNiveau1.objects.all()
    serializer_class = OrganismeNiveau1Serializer

    def _annotate(self, qs):
        return qs.annotate(
            nbr_niveaux2=Count('niveaux2', filter=Q(niveaux2__is_deleted=False), distinct=True),
        )


class OrganismeNiveau2ViewSet(_BaseOrganismeViewSet):
    queryset = OrganismeNiveau2.objects.select_related('niveau1')
    serializer_class = OrganismeNiveau2Serializer

    def get_queryset(self):
        """Filtre optionnel `?niveau1=<id>` (pour le select dépendant du formulaire)."""
        qs = super().get_queryset()
        niveau1 = self.request.query_params.get('niveau1')
        if niveau1:
            qs = qs.filter(niveau1_id=niveau1)
        return qs
