"""Amorce les données de référence de la plateforme (idempotent).

Injecte : 1 super-admin + 2 admins d'application, les organisations prédéfinies et les
organismes (ANCFCC + services). Ces mêmes données sont réinjectées automatiquement à chaque
`migrate` via le signal post_migrate (cf. accounts/apps.py) ; cette commande permet un
lancement manuel explicite.

    python manage.py seed_initial_data
"""
from django.core.management.base import BaseCommand

from accounts.seeding import run_seed


class Command(BaseCommand):
    help = "Amorce les données de référence (super-admin, admins app, organisations, organismes)."

    def handle(self, *args, **options):
        summary = run_seed(stdout=self.stdout)
        self.stdout.write(self.style.SUCCESS(
            f"✅ Seed terminé : {summary['users_created']} utilisateur(s), "
            f"{summary['organizations_created']} organisation(s), "
            f"{summary['organismes_created']} organisme(s) créés."
        ))
