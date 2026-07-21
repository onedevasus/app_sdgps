from django.apps import AppConfig


class AccountsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'accounts'

    def ready(self):
        # Auto-seed des données de référence après chaque `migrate` (cf. accounts/seeding.py).
        from django.db.models.signals import post_migrate
        post_migrate.connect(seed_reference_data, sender=self)


def seed_reference_data(sender, **kwargs):
    """Récepteur post_migrate : réinjecte les données de référence à chaque `migrate`.

    Garde-fous :
    - S'exécute UNE seule fois par `migrate` : le sender est fixé à l'AppConfig `accounts` lors
      du branchement. Les signaux post_migrate étant émis après application de TOUTES les
      migrations, l'ensemble des tables (accounts + organismes) existe déjà à ce stade.
    - Neutralisé pendant les tests (`settings.TESTING`) : la suite part d'une base vierge.
    - Désactivable via `SEED_INITIAL_DATA=0` (utilisé lors de l'import ponctuel des données
      legacy SQLite → PostgreSQL, pour éviter les collisions de clés uniques).
    """
    import logging

    from django.conf import settings
    from decouple import config

    if getattr(settings, 'TESTING', False):
        return
    if not config('SEED_INITIAL_DATA', default=True, cast=bool):
        return

    from accounts.seeding import run_seed

    logger = logging.getLogger('accounts.seeding')
    try:
        summary = run_seed()
        logger.info(
            "Données d'initialisation amorcées : %s utilisateur(s), %s organisation(s), "
            "%s organisme(s) créés.",
            summary['users_created'], summary['organizations_created'],
            summary['organismes_created'],
        )
    except Exception:
        # Échec explicite : on journalise clairement puis on relance pour faire échouer
        # `migrate` (et donc le démarrage du conteneur via docker-entrypoint.sh).
        logger.exception("Échec de l'amorçage des données d'initialisation")
        raise
