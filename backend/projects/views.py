"""
Vues API du domaine métier — CRUD avec scoping RBAC par organisation.

Portée : Admin Système / Super Admin → tout ; Admin Org & Agent → entités de leur(s)
organisation(s). Suppression = soft-delete. `created_by` renseigné automatiquement.
"""
from django.utils import timezone
from rest_framework import viewsets, permissions
from rest_framework.exceptions import PermissionDenied

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

    def get_queryset(self):
        qs = self.queryset.filter(is_deleted=False)
        ids = user_org_ids(self.request.user)
        if ids is not None:
            qs = qs.filter(**{f'{self.org_lookup}__in': ids})
        if self.parent_query_param:
            param, field = self.parent_query_param
            value = self.request.query_params.get(param)
            if value:
                qs = qs.filter(**{field: value})
        return qs

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


class ProjetViewSet(BaseOrgScopedViewSet):
    queryset = Projet.objects.all()
    serializer_class = ProjetSerializer
    org_lookup = 'organization_id'

    def _org_id_of_validated(self, serializer):
        return serializer.validated_data['organization'].id


class ProprieteViewSet(BaseOrgScopedViewSet):
    queryset = Propriete.objects.select_related('projet')
    serializer_class = ProprieteSerializer
    org_lookup = 'projet__organization_id'
    parent_query_param = ('projet', 'projet_id')

    def _org_id_of_validated(self, serializer):
        return serializer.validated_data['projet'].organization_id


class AffaireViewSet(BaseOrgScopedViewSet):
    queryset = Affaire.objects.select_related('propriete__projet')
    serializer_class = AffaireSerializer
    org_lookup = 'propriete__projet__organization_id'
    parent_query_param = ('propriete', 'propriete_id')

    def _org_id_of_validated(self, serializer):
        return serializer.validated_data['propriete'].projet.organization_id


class SsdgpsViewSet(BaseOrgScopedViewSet):
    queryset = Ssdgps.objects.select_related('affaire__propriete__projet')
    serializer_class = SsdgpsSerializer
    org_lookup = 'affaire__propriete__projet__organization_id'
    parent_query_param = ('affaire', 'affaire_id')

    def _org_id_of_validated(self, serializer):
        return serializer.validated_data['affaire'].propriete.projet.organization_id


class SessionViewSet(BaseOrgScopedViewSet):
    queryset = Session.objects.select_related('ssdgps__affaire__propriete__projet')
    serializer_class = SessionSerializer
    org_lookup = 'ssdgps__affaire__propriete__projet__organization_id'
    parent_query_param = ('ssdgps', 'ssdgps_id')

    def _org_id_of_validated(self, serializer):
        return serializer.validated_data['ssdgps'].affaire.propriete.projet.organization_id
