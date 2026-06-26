from django.urls import path
from .users_views import (
    UserListView, UserDetailView,
    UserResetPasswordView, UserToggleActiveView,
    RolesListView,
)

urlpatterns = [
    path('', UserListView.as_view(), name='user-list'),
    path('roles/', RolesListView.as_view(), name='user-roles'),
    path('<int:pk>/', UserDetailView.as_view(), name='user-detail'),
    path('<int:pk>/reset-password/', UserResetPasswordView.as_view(), name='user-reset-password'),
    path('<int:pk>/toggle-active/', UserToggleActiveView.as_view(), name='user-toggle-active'),
]
