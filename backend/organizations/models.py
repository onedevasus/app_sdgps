"""
Application Organizations - Modèles déplacés vers accounts.models
Ce fichier est conservé pour compatibilité.
"""

# Les modèles Organization et Membership sont maintenant dans accounts.models
from accounts.models import Organization, Membership

__all__ = ['Organization', 'Membership']
