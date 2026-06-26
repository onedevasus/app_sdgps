from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from django.db import models
from django.utils import timezone
from .models import Membership, Organization
from .users_serializers import (
    UserListSerializer, UserDetailSerializer,
    UserCreateSerializer, UserUpdateSerializer,
    RoleSerializer, ResetPasswordSerializer,
)
import logging

logger = logging.getLogger(__name__)
User = get_user_model()

ROLES_CONFIG = [
    {
        'id': 'ROLE_APP_ADMIN',
        'name': 'Administrateur de l\'application',
        'description': 'Accès complet à toute la plateforme. Gère les utilisateurs, organisations, configuration système et supervision.',
        'permissions': [
            'Voir tous les utilisateurs',
            'Créer/Modifier/Supprimer tout utilisateur',
            'Réinitialiser le mot de passe de tout utilisateur',
            'Voir toutes les organisations',
            'Configurer le système',
            'Consulter les rapports consolidés',
        ],
    },
    {
        'id': 'ROLE_ORGANISATION_ADMIN',
        'name': 'Responsable Admin',
        'description': 'Gère les agents de son organisation. Valide les opérations et configure les paramètres spécifiques.',
        'permissions': [
            'Voir les agents de son organisation',
            'Créer/Modifier/Supprimer les agents',
            'Réinitialiser le mot de passe des agents',
            'Configurer les paramètres de l\'organisation',
            'Consulter les rapports de l\'organisation',
        ],
    },
    {
        'id': 'ROLE_ORGANISATION_AGENT',
        'name': 'Agent',
        'description': 'Profil opérationnel. Gère les projets, la saisie de données et la génération de documents.',
        'permissions': [
            'Gérer ses projets',
            'Saisir et importer des données',
            'Générer des rapports et documents',
            'Consulter l\'historique de ses actions',
            'Modifier son profil',
        ],
    },
]


def get_user_queryset_for_admin(admin_user):
    if admin_user.is_superuser:
        return User.objects.filter(is_deleted=False)
    org_memberships = admin_user.memberships.filter(
        is_active=True,
        role='ROLE_ORGANISATION_ADMIN',
    ).values_list('organization_id', flat=True)
    return User.objects.filter(
        memberships__organization_id__in=org_memberships,
        memberships__is_active=True,
        memberships__role='ROLE_ORGANISATION_AGENT',
        is_deleted=False,
    ).distinct()


def can_manage_user(admin_user, target_user):
    if admin_user.is_superuser:
        return True, None
    if target_user.is_superuser:
        return False, "Vous ne pouvez pas gérer un administrateur de l'application."
    admin_org_ids = set(
        admin_user.memberships.filter(
            is_active=True,
            role='ROLE_ORGANISATION_ADMIN',
        ).values_list('organization_id', flat=True)
    )
    target_org_ids = set(
        target_user.memberships.filter(
            is_active=True,
        ).values_list('organization_id', flat=True)
    )
    common_orgs = admin_org_ids & target_org_ids
    if not common_orgs:
        return False, "Vous ne pouvez gérer que les agents de votre organisation."
    target_role = target_user.get_primary_role()
    if target_role == 'ROLE_ORGANISATION_ADMIN':
        return False, "Vous ne pouvez pas gérer un responsable admin."
    return True, None


class UserListView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return UserCreateSerializer
        return UserListSerializer

    def get_queryset(self):
        user = self.request.user
        if not (user.is_superuser or user.memberships.filter(
            is_active=True,
            role='ROLE_ORGANISATION_ADMIN',
        ).exists()):
            return User.objects.none()

        queryset = get_user_queryset_for_admin(user)

        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                models.Q(first_name__icontains=search) |
                models.Q(last_name__icontains=search) |
                models.Q(email__icontains=search)
            )

        role = self.request.query_params.get('role', None)
        if role:
            if role == 'ROLE_APP_ADMIN':
                return User.objects.filter(is_superuser=True)
            queryset = queryset.filter(memberships__role=role)

        is_active = self.request.query_params.get('is_active', None)
        if is_active is not None:
            is_active_bool = is_active.lower() == 'true'
            queryset = queryset.filter(is_active=is_active_bool)

        organization_id = self.request.query_params.get('organization_id', None)
        if organization_id:
            queryset = queryset.filter(
                memberships__organization_id=organization_id
            )

        return queryset.order_by('-date_joined')

    def perform_create(self, serializer):
        serializer.save()
        logger.info(f"Utilisateur créé par: {self.request.user.email}")


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return UserUpdateSerializer
        return UserDetailSerializer

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return User.objects.filter(is_deleted=False)
        return get_user_queryset_for_admin(user)

    def check_object_permissions(self, request, obj):
        super().check_object_permissions(request, obj)
        allowed, msg = can_manage_user(request.user, obj)
        if not allowed:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied(msg)

    def perform_destroy(self, instance):
        from django.utils import timezone
        instance.is_deleted = True
        instance.deleted_at = timezone.now()
        instance.is_active = False
        instance.save(update_fields=['is_deleted', 'deleted_at', 'is_active'])
        logger.info(f"Utilisateur supprimé (soft delete): {instance.email} par {self.request.user.email}")


class UserResetPasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            user = User.objects.get(pk=pk, is_deleted=False)
        except User.DoesNotExist:
            return Response(
                {'detail': 'Utilisateur non trouvé.'},
                status=status.HTTP_404_NOT_FOUND
            )

        allowed, msg = can_manage_user(request.user, user)
        if not allowed:
            return Response({'detail': msg}, status=status.HTTP_403_FORBIDDEN)

        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        new_password = serializer.validated_data.get('new_password')
        if not new_password:
            new_password = serializer.generate_password()

        user.set_password(new_password)
        user.must_change_password = serializer.validated_data.get('must_change_password', True)
        user.save(update_fields=['password', 'must_change_password'])

        logger.info(f"Mot de passe réinitialisé pour {user.email} par {request.user.email}")

        return Response({
            'detail': 'Mot de passe réinitialisé avec succès.',
            'new_password': new_password,
            'must_change_password': user.must_change_password,
        }, status=status.HTTP_200_OK)


class UserToggleActiveView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            user = User.objects.get(pk=pk, is_deleted=False)
        except User.DoesNotExist:
            return Response(
                {'detail': 'Utilisateur non trouvé.'},
                status=status.HTTP_404_NOT_FOUND
            )

        allowed, msg = can_manage_user(request.user, user)
        if not allowed:
            return Response({'detail': msg}, status=status.HTTP_403_FORBIDDEN)

        user.is_active = not user.is_active
        user.save(update_fields=['is_active'])

        status_text = 'activé' if user.is_active else 'désactivé'
        logger.info(f"Utilisateur {status_text}: {user.email} par {request.user.email}")

        return Response({
            'detail': f"Utilisateur {status_text} avec succès.",
            'is_active': user.is_active,
        }, status=status.HTTP_200_OK)


class RolesListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        if not (user.is_superuser or user.memberships.filter(
            is_active=True,
            role='ROLE_ORGANISATION_ADMIN',
        ).exists()):
            return Response(
                {'detail': 'Accès non autorisé.'},
                status=status.HTTP_403_FORBIDDEN
            )

        roles_data = []
        for role_config in ROLES_CONFIG:
            role_id = role_config['id']
            if role_id == 'ROLE_APP_ADMIN':
                count = User.objects.filter(is_superuser=True, is_deleted=False).count()
            else:
                count = User.objects.filter(
                    memberships__role=role_id,
                    memberships__is_active=True,
                    is_deleted=False,
                ).distinct().count()

            roles_data.append({
                **role_config,
                'user_count': count,
            })

        return Response(roles_data, status=status.HTTP_200_OK)
