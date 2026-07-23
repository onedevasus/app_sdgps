"""Transfère les données de l'ancienne base SQLite vers la base PostgreSQL courante.

Opération PONCTUELLE. Encapsule `dumpdata` (depuis l'alias `sqlite_legacy`) puis `loaddata`
(vers la base `default` = PostgreSQL), en excluant les tables régénérées par `migrate`
(contenttypes, permissions, sessions, logs admin).

Procédure complète (base PostgreSQL vide). Le moteur DB étant dérivé de ENVIRONMENT
(SQLite en dev, PostgreSQL en prod), on cible explicitement PostgreSQL via DB_ENGINE :

    # 1. Renseigner l'environnement
    #    DB_ENGINE=postgresql  (force PostgreSQL même en dev)
    #    POSTGRES_DB / POSTGRES_USER / POSTGRES_PASSWORD / POSTGRES_HOST / POSTGRES_PORT
    #    SQLITE_LEGACY_PATH=/chemin/vers/db.sqlite3  (active l'alias sqlite_legacy)

    # 2. Créer le schéma SANS auto-seed (évite les collisions de clés uniques)
    DB_ENGINE=postgresql SEED_INITIAL_DATA=0 python manage.py migrate

    # 3. Transférer les données existantes
    DB_ENGINE=postgresql python manage.py migrate_sqlite_to_postgres

Résultat : la base PostgreSQL contient une copie exacte des données SQLite. Les
réinitialisations ultérieures (sans SEED_INITIAL_DATA=0) réinjecteront le jeu de référence.
"""
import os
import tempfile

from django.conf import settings
from django.core.management import call_command
from django.core.management.base import BaseCommand, CommandError

# Applications/labels dont les tables sont (re)créées par `migrate` et NE doivent PAS être
# rechargées depuis le dump (sinon conflits d'unicité / d'intégrité).
DEFAULT_EXCLUDES = ['contenttypes', 'auth.permission', 'admin.logentry', 'sessions']


class Command(BaseCommand):
    help = "Transfère les données de la base SQLite (alias sqlite_legacy) vers PostgreSQL (default)."

    def add_arguments(self, parser):
        parser.add_argument(
            '--source', default='sqlite_legacy',
            help="Alias de la base source (défaut : sqlite_legacy).")
        parser.add_argument(
            '--keep-dump', action='store_true',
            help="Conserve le fichier JSON intermédiaire (par défaut supprimé).")

    def handle(self, *args, **options):
        source = options['source']
        if source not in settings.DATABASES:
            raise CommandError(
                f"Alias de base « {source} » introuvable. Renseignez SQLITE_LEGACY_PATH dans "
                f"l'environnement pour activer l'alias sqlite_legacy."
            )
        if settings.DATABASES['default']['ENGINE'] != 'django.db.backends.postgresql':
            raise CommandError(
                "La base « default » n'est pas PostgreSQL. Configurez DB_ENGINE=postgresql "
                "et les variables POSTGRES_* avant de lancer la migration des données."
            )

        fd, dump_path = tempfile.mkstemp(suffix='.json', prefix='sdgps_legacy_')
        os.close(fd)
        try:
            self.stdout.write(f"Export des données depuis « {source} »…")
            with open(dump_path, 'w', encoding='utf-8') as out:
                call_command(
                    'dumpdata',
                    database=source,
                    exclude=DEFAULT_EXCLUDES,
                    natural_foreign=True,
                    natural_primary=True,
                    indent=2,
                    stdout=out,
                )

            self.stdout.write("Import des données dans PostgreSQL (default)…")
            call_command('loaddata', dump_path, database='default')

            self.stdout.write(self.style.SUCCESS("✅ Migration des données terminée."))
        finally:
            if not options['keep_dump'] and os.path.exists(dump_path):
                os.remove(dump_path)
            elif options['keep_dump']:
                self.stdout.write(f"Dump conservé : {dump_path}")
