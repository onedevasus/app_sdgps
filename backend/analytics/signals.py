"""
Invalidation du cache de ventilation du stockage.

Dès qu'une donnée qui influe sur la volumétrie ou son attribution change — pièces et
images (taille), projets (propriétaire), adhésions / organisations / utilisateurs
(organisation courante d'un propriétaire) — on incrémente la version du cache. Le prochain
appel à `cached_storage_overview` recalcule alors la ventilation : les KPIs de
`/admin/quotas/stockage` se mettent à jour automatiquement.
"""
from django.db.models.signals import post_save, post_delete

from accounts.models import CustomUser, Membership, Organization
from projects.models import Projet
from pieces.models import Piece, PieceImage
from .services import invalidate_storage_overview

# Modèles dont toute création / modification / suppression doit rafraîchir la ventilation.
_TRACKED_MODELS = (Piece, PieceImage, Projet, Membership, Organization, CustomUser)


def _invalidate_on_change(sender, **kwargs):
    invalidate_storage_overview()


for _model in _TRACKED_MODELS:
    post_save.connect(_invalidate_on_change, sender=_model,
                      dispatch_uid=f'storage_overview_invalidate_save_{_model.__name__}')
    post_delete.connect(_invalidate_on_change, sender=_model,
                        dispatch_uid=f'storage_overview_invalidate_delete_{_model.__name__}')
