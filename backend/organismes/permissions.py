"""Permissions DRF réutilisables pour le registre des organismes."""
from rest_framework.permissions import BasePermission, SAFE_METHODS


def _is_admin(user):
    """Super Admin (superuser) ou Admin Système."""
    return bool(user and user.is_authenticated
                and (user.is_superuser or user.get_primary_role() == 'ROLE_ADMIN_SYSTEME'))


class IsSuperAdminOrSysteme(BasePermission):
    """Autorise uniquement `ROLE_SUPER_ADMIN` (superuser) et `ROLE_ADMIN_SYSTEME`.

    Formalise l'idiome inline répété dans les vues admin (cf.
    `organizations/views.py`). À combiner avec `IsAuthenticated`."""

    message = "Accès réservé au Super Admin et à l'Admin Système."

    def has_permission(self, request, view):
        return _is_admin(request.user)

    def has_object_permission(self, request, view, obj):
        return self.has_permission(request, view)


class ReadOnlyOrSuperAdminSysteme(BasePermission):
    """Lecture (GET/HEAD/OPTIONS) ouverte à tout utilisateur authentifié — nécessaire pour
    alimenter les listes déroulantes du formulaire de propriété — mais création / modification
    / suppression réservées au Super Admin et à l'Admin Système."""

    message = "La gestion des organismes est réservée au Super Admin et à l'Admin Système."

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        if request.method in SAFE_METHODS:
            return True
        return _is_admin(user)

    def has_object_permission(self, request, view, obj):
        return self.has_permission(request, view)
