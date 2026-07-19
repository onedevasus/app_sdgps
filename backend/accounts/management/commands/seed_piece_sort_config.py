"""Applique la configuration de tri des pièces du compte SUPER ADMIN aux autres comptes.

Par défaut, ne touche QUE les comptes sans configuration (`piece_sort_config` vide) — pour
« les comptes déjà présents qui n'ont pas cette config ». Le compte super admin (la source)
n'est jamais modifié. `--overwrite` réaligne aussi les comptes ayant déjà une configuration.

Exemples :
    python manage.py seed_piece_sort_config
    python manage.py seed_piece_sort_config --overwrite
"""
import copy

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from accounts.piece_defaults import superadmin_piece_sort_config


class Command(BaseCommand):
    help = ("Copie la config de tri des pièces du super admin vers les comptes sans config "
            "(ou tous les comptes non-super-admin avec --overwrite).")

    def add_arguments(self, parser):
        parser.add_argument(
            '--overwrite', action='store_true',
            help="Écrase aussi les comptes ayant déjà une configuration (la source super admin "
                 "reste inchangée).")

    def handle(self, *args, **options):
        User = get_user_model()
        src = superadmin_piece_sort_config()
        if not src:
            self.stderr.write(self.style.ERROR(
                "Aucune configuration de tri disponible sur un compte super admin : rien à faire."))
            return

        overwrite = options['overwrite']
        updated = skipped = 0
        for user in User.objects.all().iterator():
            if user.is_superuser:  # ne pas toucher la source
                continue
            if user.piece_sort_config and not overwrite:
                skipped += 1
                continue
            user.piece_sort_config = copy.deepcopy(src)
            user.save(update_fields=['piece_sort_config'])
            updated += 1

        self.stdout.write(self.style.SUCCESS(
            f"{updated} compte(s) mis à jour ; {skipped} inchangé(s) (config déjà présente)."))
