from django.urls import path
from .users_views import (
    UserListView, UserDetailView,
    UserResetPasswordView, UserToggleActiveView,
    RolesListView, UserRestoreView, UserBulkRestoreView,
    UserPermanentDeleteView, UserBulkPermanentDeleteView,
)

urlpatterns = [
    path('', UserListView.as_view(), name='user-list'),
    path('roles/', RolesListView.as_view(), name='user-roles'),
    path('bulk-restore/', UserBulkRestoreView.as_view(), name='user-bulk-restore'),
    path('permanent-delete/', UserBulkPermanentDeleteView.as_view(), name='user-bulk-permanent-delete'),
    path('<int:pk>/', UserDetailView.as_view(), name='user-detail'),
    path('<int:pk>/reset-password/', UserResetPasswordView.as_view(), name='user-reset-password'),
    path('<int:pk>/toggle-active/', UserToggleActiveView.as_view(), name='user-toggle-active'),
    path('<int:pk>/restore/', UserRestoreView.as_view(), name='user-restore'),
    path('<int:pk>/permanent/', UserPermanentDeleteView.as_view(), name='user-permanent-delete'),
]
