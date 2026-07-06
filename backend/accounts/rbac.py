"""
Règles RBAC partagées pour la protection des rôles.

Regroupe les garde-fous « dernier administrateur » d'une organisation, réutilisés à la
fois par les vues (`users_views.py`) et les serializers (`users_serializers.py`) sans
créer d'import circulaire entre eux.

Analogue aux protections globales des rôles supérieurs (« au moins 2 super admins / admins
système actifs »), mais appliqué **par organisation** : une organisation doit toujours
conserver au moins un administrateur actif.
"""
from .models import Membership

# Nombre minimum d'admins actifs qu'une organisation doit conserver.
MIN_ACTIVE_ORG_ADMINS = 1


def count_other_active_org_admins(organization, exclude_user):
    """
    Nombre d'AUTRES administrateurs actifs de l'organisation.

    Un administrateur est compté si son adhésion est active, que son compte est actif et
    qu'il n'est pas supprimé logiquement. L'utilisateur `exclude_user` est exclu du décompte.
    """
    return Membership.objects.filter(
        organization=organization,
        role='ROLE_ORGANISATION_ADMIN',
        is_active=True,
        user__is_active=True,
        user__is_deleted=False,
    ).exclude(user=exclude_user).count()


def organizations_left_without_admin(user):
    """
    Retourne la liste des organisations dont `user` est l'administrateur actif et où le
    retirer ferait passer le nombre d'admins actifs sous `MIN_ACTIVE_ORG_ADMINS`.
    """
    result = []
    memberships = user.memberships.filter(
        is_active=True,
        role='ROLE_ORGANISATION_ADMIN',
    ).select_related('organization')
    for membership in memberships:
        others = count_other_active_org_admins(membership.organization, user)
        if others < MIN_ACTIVE_ORG_ADMINS:
            result.append(membership.organization)
    return result


def check_org_admin_not_last(user):
    """
    Vérifie qu'agir sur `user` (suppression / désactivation) n'orphelinerait aucune org.

    Returns:
        (allowed: bool, message: str | None)
    """
    orphaned = organizations_left_without_admin(user)
    if orphaned:
        names = ', '.join(org.name for org in orphaned)
        message = (
            f"Impossible : {user.email} est le dernier administrateur actif de : {names}. "
            f"Ajoutez un autre administrateur à cette organisation avant."
        )
        return False, message
    return True, None
