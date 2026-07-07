from django.apps import AppConfig


class ProjectsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'projects'
    verbose_name = "Projets & Dossiers GPS"

    def ready(self):
        # Enregistre les signaux (auto-création de session mono-session)
        from . import signals  # noqa: F401
