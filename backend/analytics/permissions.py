from rest_framework import permissions


class IsAppAdmin(permissions.BasePermission):
    """Réservé aux administrateurs de l'app : super-admin ou Admin Système (plateforme).
    Le défaut DRF étant `AllowAny`, cette permission doit être posée explicitement."""
    message = "Accès réservé aux administrateurs de la plateforme."

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user and user.is_authenticated
            and (user.is_superuser or user.is_platform_admin())
        )
