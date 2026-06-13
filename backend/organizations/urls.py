"""
URLs pour l'application organizations
"""
from django.urls import path
from . import views

urlpatterns = [
    # Liste et création d'organisations
    path('', views.OrganizationListView.as_view(), name='organization-list'),
    
    # Suppression en groupe d'organisations
    path('bulk-delete/', views.OrganizationBulkDeleteView.as_view(), name='organization-bulk-delete'),
    
    # Métadonnées des champs (descriptions, types, etc.)
    path('metadata/', views.OrganizationMetadataView.as_view(), name='organization-metadata'),
    
    # Détails d'une organisation
    path('<uuid:pk>/', views.OrganizationDetailView.as_view(), name='organization-detail'),
    
    # Mes organisations (utilisateur courant)
    path('my-organizations/', views.UserOrganizationsView.as_view(), name='user-organizations'),
    
    # Membres d'une organisation
    path('<uuid:pk>/members/', views.OrganizationMembersView.as_view(), name='organization-members'),
    
    # Ajouter un membre
    path('<uuid:pk>/add-member/', views.AddMemberView.as_view(), name='add-member'),
]
