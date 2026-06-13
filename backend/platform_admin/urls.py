"""
URLs pour la gestion du profil Super Admin
"""
from django.urls import path
from .views import SuperAdminProfileView, ChangePasswordView

app_name = 'platform_admin'

urlpatterns = [
    # Profil Super Admin
    path(
        'me/profile/',
        SuperAdminProfileView.as_view(),
        name='superadmin-profile'
    ),
    
    # Changement de mot de passe
    path(
        'me/change-password/',
        ChangePasswordView.as_view(),
        name='change-password'
    ),
]
