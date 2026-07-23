"""Routes des organismes — montées sous /api/v1/."""
from rest_framework.routers import DefaultRouter

from .views import OrganismeNiveau1ViewSet, OrganismeNiveau2ViewSet

router = DefaultRouter()
router.register('organismes-niveau1', OrganismeNiveau1ViewSet, basename='organisme-niveau1')
router.register('organismes-niveau2', OrganismeNiveau2ViewSet, basename='organisme-niveau2')

urlpatterns = router.urls
