"""
Managers personnalisés pour l'application accounts
"""
from django.db import models
from django.conf import settings


class OrganizationManager(models.Manager):
    """
    Manager qui filtre automatiquement les données de test en production.
    
    En mode production, exclut automatiquement les organisations marquées comme test data.
    En mode développement, affiche toutes les organisations par défaut.
    """
    
    def get_queryset(self):
        qs = super().get_queryset()
        
        # En production, exclure automatiquement les données de test
        if getattr(settings, 'ENVIRONMENT', 'development') == 'production':
            qs = qs.filter(is_test_data=False)
        
        return qs
    
    def all_with_test_data(self):
        """Retourne TOUTES les organisations (test + réelles), même en production"""
        return super().get_queryset()
    
    def test_data_only(self):
        """Retourne uniquement les données de test"""
        return super().get_queryset().filter(is_test_data=True)
    
    def real_data_only(self):
        """Retourne uniquement les données réelles"""
        return super().get_queryset().filter(is_test_data=False)
