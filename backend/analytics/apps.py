from django.apps import AppConfig


class AnalyticsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'analytics'
    verbose_name = "Analytique (stockage, volumétrie)"

    def ready(self):
        # Enregistre les signaux d'invalidation du cache de ventilation du stockage.
        from . import signals  # noqa: F401
