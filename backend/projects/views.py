"""
Vues API du domaine métier — CRUD avec scoping RBAC par organisation.

Portée : Admin Système / Super Admin → tout ; Admin Org & Agent → entités de leur(s)
organisation(s). Suppression = soft-delete. `created_by` renseigné automatiquement.
"""
from django.db.models import Count, Q, QuerySet
from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from .models import Projet, Propriete, Affaire, Ssdgps, Session
from .serializers import (
    ProjetSerializer, ProprieteSerializer, AffaireSerializer,
    SsdgpsSerializer, SessionSerializer,
)


def user_org_ids(user):
    """Retourne l'ensemble des org_id de l'utilisateur, ou None s'il voit tout."""
    if user.is_superuser or user.is_platform_admin():
        return None
    return set(
        user.memberships.filter(is_active=True).values_list('organization_id', flat=True)
    )


class BaseOrgScopedViewSet(viewsets.ModelViewSet):
    """Base : scoping RBAC, soft-delete, created_by, filtre parent optionnel."""
    permission_classes = [permissions.IsAuthenticated]

    # À définir dans les sous-classes :
    org_lookup = None          # ex. 'projet__organization_id'
    parent_query_param = None  # ex. ('projet', 'projet_id')

    def _annotate_counts(self, qs: QuerySet) -> QuerySet:
        """
        Point d'extension : les sous-classes y ajoutent leurs compteurs agrégés
        (`Count(..., filter=..., distinct=True)`). Appelé à la fois par `get_queryset()`
        et `_org_scoped_queryset()` afin que les compteurs soient toujours présents,
        y compris sur l'objet renvoyé par `restore`/`bulk_restore`.
        """
        return qs

    def get_queryset(self):
        show_deleted = self.request.query_params.get('show_deleted', '').lower() in ('true', '1', 'yes')
        qs = self.queryset.filter(is_deleted=True) if show_deleted else self.queryset.filter(is_deleted=False)
        ids = user_org_ids(self.request.user)
        if ids is not None:
            qs = qs.filter(**{f'{self.org_lookup}__in': ids})
        if self.parent_query_param:
            param, field = self.parent_query_param
            value = self.request.query_params.get(param)
            if value:
                qs = qs.filter(**{field: value})
        return self._annotate_counts(qs)

    def _org_scoped_queryset(self):
        """Queryset filtré par organisation, SANS filtre is_deleted (pour la restauration)."""
        qs = self.queryset
        ids = user_org_ids(self.request.user)
        if ids is not None:
            qs = qs.filter(**{f'{self.org_lookup}__in': ids})
        return self._annotate_counts(qs)

    def _org_id_of_validated(self, serializer):
        """Org cible d'une création — à surcharger."""
        raise NotImplementedError

    def perform_create(self, serializer):
        ids = user_org_ids(self.request.user)
        if ids is not None:
            target_org = self._org_id_of_validated(serializer)
            if target_org not in ids:
                raise PermissionDenied(
                    "Vous ne pouvez créer une ressource que dans votre organisation."
                )
        serializer.save(created_by=self.request.user)

    def perform_destroy(self, instance):
        instance.is_deleted = True
        instance.deleted_at = timezone.now()
        instance.save(update_fields=['is_deleted', 'deleted_at'])

    @action(detail=True, methods=['post'])
    def restore(self, request, pk=None):
        """POST /…/{id}/restore/ — annule la suppression logique (scopé à l'organisation)."""
        instance = self._org_scoped_queryset().filter(pk=pk, is_deleted=True).first()
        if instance is None:
            return Response({'detail': 'Élément non trouvé ou non supprimé.'}, status=status.HTTP_404_NOT_FOUND)
        instance.is_deleted = False
        instance.deleted_at = None
        instance.save(update_fields=['is_deleted', 'deleted_at'])
        serializer = self.get_serializer(instance)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='bulk-restore')
    def bulk_restore(self, request):
        """POST /…/bulk-restore/ — {"ids": [...]} — restaure plusieurs éléments (scopé)."""
        ids = request.data.get('ids', [])
        if not isinstance(ids, list) or not ids:
            return Response({'detail': 'La liste ids est requise.'}, status=status.HTTP_400_BAD_REQUEST)
        qs = self._org_scoped_queryset().filter(pk__in=ids, is_deleted=True)
        restored_count = qs.count()
        qs.update(is_deleted=False, deleted_at=None)
        return Response({'restored_count': restored_count}, status=status.HTTP_200_OK)


class ProjetViewSet(BaseOrgScopedViewSet):
    queryset = Projet.objects.all()
    serializer_class = ProjetSerializer
    org_lookup = 'organization_id'

    def _org_id_of_validated(self, serializer):
        return serializer.validated_data['organization'].id

    def _annotate_counts(self, qs):
        # Compteurs agrégés annotés au niveau du queryset (une seule requête, pas de N+1),
        # en excluant les éléments supprimés à chaque niveau traversé.
        return qs.annotate(
            nbr_total_proprietes=Count(
                'proprietes', filter=Q(proprietes__is_deleted=False), distinct=True),
            nbr_total_affaires=Count(
                'proprietes__affaires',
                filter=Q(proprietes__is_deleted=False, proprietes__affaires__is_deleted=False),
                distinct=True),
            nbr_total_ssdgps=Count(
                'proprietes__affaires__ssdgps_set',
                filter=Q(
                    proprietes__is_deleted=False,
                    proprietes__affaires__is_deleted=False,
                    proprietes__affaires__ssdgps_set__is_deleted=False,
                ),
                distinct=True),
            nbr_total_sessions=Count(
                'proprietes__affaires__ssdgps_set__sessions',
                filter=Q(
                    proprietes__is_deleted=False,
                    proprietes__affaires__is_deleted=False,
                    proprietes__affaires__ssdgps_set__is_deleted=False,
                    proprietes__affaires__ssdgps_set__sessions__is_deleted=False,
                ),
                distinct=True),
        )


class ProprieteViewSet(BaseOrgScopedViewSet):
    queryset = Propriete.objects.select_related('projet')
    serializer_class = ProprieteSerializer
    org_lookup = 'projet__organization_id'
    parent_query_param = ('projet', 'projet_id')

    def _org_id_of_validated(self, serializer):
        return serializer.validated_data['projet'].organization_id

    def _annotate_counts(self, qs):
        return qs.annotate(
            nbr_total_affaires=Count(
                'affaires', filter=Q(affaires__is_deleted=False), distinct=True),
            nbr_total_ssdgps=Count(
                'affaires__ssdgps_set',
                filter=Q(affaires__is_deleted=False, affaires__ssdgps_set__is_deleted=False),
                distinct=True),
            nbr_total_sessions=Count(
                'affaires__ssdgps_set__sessions',
                filter=Q(
                    affaires__is_deleted=False,
                    affaires__ssdgps_set__is_deleted=False,
                    affaires__ssdgps_set__sessions__is_deleted=False,
                ),
                distinct=True),
        )


class AffaireViewSet(BaseOrgScopedViewSet):
    queryset = Affaire.objects.select_related('propriete__projet')
    serializer_class = AffaireSerializer
    org_lookup = 'propriete__projet__organization_id'
    parent_query_param = ('propriete', 'propriete_id')

    def _org_id_of_validated(self, serializer):
        return serializer.validated_data['propriete'].projet.organization_id

    def _annotate_counts(self, qs):
        return qs.annotate(
            nbr_total_ssdgps=Count(
                'ssdgps_set', filter=Q(ssdgps_set__is_deleted=False), distinct=True),
            nbr_total_sessions=Count(
                'ssdgps_set__sessions',
                filter=Q(ssdgps_set__is_deleted=False, ssdgps_set__sessions__is_deleted=False),
                distinct=True),
        )


class SsdgpsViewSet(BaseOrgScopedViewSet):
    queryset = Ssdgps.objects.select_related('affaire__propriete__projet')
    serializer_class = SsdgpsSerializer
    org_lookup = 'affaire__propriete__projet__organization_id'
    parent_query_param = ('affaire', 'affaire_id')

    def _org_id_of_validated(self, serializer):
        return serializer.validated_data['affaire'].propriete.projet.organization_id

    def _annotate_counts(self, qs):
        return qs.annotate(
            nbr_total_sessions=Count(
                'sessions', filter=Q(sessions__is_deleted=False), distinct=True),
        )


class SessionViewSet(BaseOrgScopedViewSet):
    queryset = Session.objects.select_related('ssdgps__affaire__propriete__projet')
    serializer_class = SessionSerializer
    org_lookup = 'ssdgps__affaire__propriete__projet__organization_id'
    parent_query_param = ('ssdgps', 'ssdgps_id')

    def _org_id_of_validated(self, serializer):
        return serializer.validated_data['ssdgps'].affaire.propriete.projet.organization_id
