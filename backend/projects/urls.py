"""Routes du domaine métier — montées sous /api/v1/."""
from rest_framework.routers import DefaultRouter

from .views import (
    ProjetViewSet, ProprieteViewSet, AffaireViewSet, SsdgpsViewSet, SessionViewSet,
)

router = DefaultRouter()
router.register('projets', ProjetViewSet, basename='projet')
router.register('proprietes', ProprieteViewSet, basename='propriete')
router.register('affaires', AffaireViewSet, basename='affaire')
router.register('ssdgps', SsdgpsViewSet, basename='ssdgps')
router.register('sessions', SessionViewSet, basename='session')

urlpatterns = router.urls
