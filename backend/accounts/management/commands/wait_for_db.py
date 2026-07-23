"""Attend que la base de données accepte les connexions avant de poursuivre.

Utilisé au démarrage du conteneur (cf. backend/docker-entrypoint.sh) pour éviter la course
au démarrage : en production, PostgreSQL peut ne pas être immédiatement prêt (premier boot du
volume, redémarrage). La commande boucle jusqu'à ce que la connexion réussisse, puis rend la
main ; elle échoue (code de sortie non nul) au-delà d'un délai maximal.

    python manage.py wait_for_db [--timeout 60] [--interval 1]
"""
import time

from django.core.management.base import BaseCommand, CommandError
from django.db import connections
from django.db.utils import OperationalError


class Command(BaseCommand):
    help = "Attend que la base de données 'default' soit disponible."

    def add_arguments(self, parser):
        parser.add_argument(
            '--timeout', type=int, default=60,
            help="Délai maximal d'attente en secondes (défaut : 60).")
        parser.add_argument(
            '--interval', type=float, default=1.0,
            help="Intervalle entre deux tentatives en secondes (défaut : 1).")

    def handle(self, *args, **options):
        timeout = options['timeout']
        interval = options['interval']
        start = time.monotonic()
        conn = connections['default']

        while True:
            try:
                conn.ensure_connection()
                self.stdout.write(self.style.SUCCESS("✅ Base de données disponible."))
                return
            except OperationalError as exc:
                # La connexion peut rester dans un état incohérent après un échec : la fermer
                # avant de retenter.
                conn.close()
                if time.monotonic() - start >= timeout:
                    raise CommandError(
                        f"Base de données indisponible après {timeout}s : {exc}"
                    )
                self.stdout.write(
                    f"⏳ Base indisponible, nouvelle tentative dans {interval}s…"
                )
                time.sleep(interval)
