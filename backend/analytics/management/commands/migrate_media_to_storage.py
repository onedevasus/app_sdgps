"""
Migre les fichiers uploadés du système de fichiers LOCAL (`MEDIA_ROOT`) vers le backend de
stockage par défaut configuré (`STORAGES['default']`, p. ex. un bucket S3 / R2 / MinIO), et
renseigne au passage `Piece.taille_octets` pour les pièces legacy.

Usage :
- `python manage.py migrate_media_to_storage`            → copie + backfill des tailles.
- `python manage.py migrate_media_to_storage --dry-run`  → simulation (n'écrit rien).
- `python manage.py migrate_media_to_storage --sizes-only`→ ne fait QUE le backfill des tailles.

Idempotent : un objet déjà présent dans le storage cible est ignoré. La copie ne supprime
jamais les fichiers locaux (bascule sûre ; nettoyer `media/` manuellement une fois validé).
"""
from django.conf import settings
from django.core.files.storage import default_storage, FileSystemStorage
from django.core.management.base import BaseCommand

from accounts.models import CustomUser, Organization
from pieces.models import Piece, PieceImage

# (Modèle, nom du champ FileField/ImageField) — sources de fichiers de l'app.
_FILE_FIELDS = [
    (Organization, 'logo'),
    (CustomUser, 'profile_picture'),
    (Piece, 'fichier'),
    (PieceImage, 'fichier'),
    (PieceImage, 'apercu'),
]


class Command(BaseCommand):
    help = "Copie les fichiers locaux vers le storage par défaut + backfill des tailles de pièces."

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true', help="Simulation, aucune écriture.")
        parser.add_argument('--sizes-only', action='store_true',
                            help="N'effectue que le backfill de Piece.taille_octets.")

    def handle(self, *args, **options):
        dry = options['dry_run']
        local = FileSystemStorage(location=settings.MEDIA_ROOT)

        if not options['sizes_only']:
            self._copy_files(local, dry)
        self._backfill_sizes(local, dry)

    def _copy_files(self, local, dry):
        remote_is_local = isinstance(default_storage, FileSystemStorage)
        if remote_is_local:
            self.stdout.write(self.style.WARNING(
                "Le storage par défaut est local (aucun bucket configuré) : rien à copier. "
                "Configurez AWS_STORAGE_BUCKET_NAME pour cibler un stockage objet."))
            return

        copied = skipped = missing = 0
        for model, field in _FILE_FIELDS:
            qs = model.objects.exclude(**{field: ''}).exclude(**{f'{field}__isnull': True})
            for obj in qs.iterator():
                name = getattr(obj, field).name
                if not name:
                    continue
                if default_storage.exists(name):
                    skipped += 1
                    continue
                if not local.exists(name):
                    missing += 1
                    self.stdout.write(self.style.WARNING(f"  absent en local : {name}"))
                    continue
                if dry:
                    self.stdout.write(f"  [dry-run] copierait {name}")
                    copied += 1
                    continue
                with local.open(name) as f:
                    default_storage.save(name, f)
                copied += 1

        self.stdout.write(self.style.SUCCESS(
            f"Copie : {copied} copié(s), {skipped} déjà présent(s), {missing} absent(s) en local."))

    def _backfill_sizes(self, local, dry):
        updated = 0
        for piece in Piece.objects.exclude(fichier='').filter(taille_octets=0).iterator():
            name = piece.fichier.name
            size = 0
            try:
                # Priorité au fichier local (rapide) ; repli sur le storage cible.
                size = local.size(name) if local.exists(name) else piece.fichier.size
            except (OSError, ValueError, NotImplementedError):
                size = 0
            if not size:
                continue
            if dry:
                self.stdout.write(f"  [dry-run] taille {name} = {size}")
                updated += 1
                continue
            piece.taille_octets = size
            piece.save(update_fields=['taille_octets'])
            updated += 1

        self.stdout.write(self.style.SUCCESS(
            f"Backfill tailles : {updated} pièce(s) mise(s) à jour."))
