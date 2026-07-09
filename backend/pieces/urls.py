"""Routes des pièces — montées sous /api/v1/."""
from rest_framework.routers import DefaultRouter

from .views import PieceViewSet

router = DefaultRouter()
router.register('pieces', PieceViewSet, basename='piece')

urlpatterns = router.urls
