"""
Enregistre un instantané (`StorageSnapshot`) de la volumétrie de stockage courante.

Usage :
- `python manage.py snapshot_storage`            → un instantané « maintenant ».
- `python manage.py snapshot_storage --backfill` → reconstruit un historique MENSUEL cumulé
  à partir des dates d'import (`created_at`), pour disposer d'une courbe d'évolution immédiate.

À ordonnancer (tâche planifiée / cron) pour un suivi régulier — aucune infra planifiée n'est
fournie par le projet.
"""
from collections import defaultdict
from datetime import datetime

from django.core.management.base import BaseCommand
from django.utils import timezone

from analytics.models import StorageSnapshot
from analytics.services import (
    compute_storage_overview, categorize, _file_size,
    _primary_org_map, _primary_role_map, _project_label, _user_label,
    _ROLE_LABELS, NON_ORG_LABEL, NON_PROJECT_LABEL,
)
from pieces.models import Piece, PieceImage
from accounts.models import CustomUser


class Command(BaseCommand):
    help = "Enregistre un instantané de la volumétrie de stockage (option --backfill : historique mensuel)."

    def add_arguments(self, parser):
        parser.add_argument(
            '--backfill', action='store_true',
            help="Reconstruit un historique mensuel cumulé depuis les dates d'import.",
        )

    def handle(self, *args, **options):
        if options['backfill']:
            self._backfill()
        else:
            self._snapshot_now()

    def _snapshot_now(self):
        data = compute_storage_overview()
        snap = StorageSnapshot.objects.create(
            total_bytes=data['total_bytes'],
            total_files=data['total_files'],
            by_type=data['by_type'],
            by_organization=data['by_organization'],
            by_project=data['by_project'],
            by_role=data['by_role'],
            by_user=data['by_user'],
        )
        mo = snap.total_bytes / (1024 * 1024)
        self.stdout.write(self.style.SUCCESS(
            f"Instantané enregistré : {snap.total_files} fichier(s), {mo:.1f} Mo."))

    def _backfill(self):
        """Historique mensuel cumulé (total + toutes les ventilations) depuis les `created_at`.

        L'attribution (organisation / rôle du propriétaire) est prise dans son état COURANT —
        le backfill est une estimation historique, cohérente avec la ventilation courante.
        """
        org_map = _primary_org_map()
        role_map = _primary_role_map()
        agent_role = _ROLE_LABELS['ROLE_ORGANISATION_AGENT']

        # (mois 'YYYY-MM') -> {dimension -> {clé -> octets ajoutés ce mois}}
        DIMS = ('by_type', 'by_organization', 'by_project', 'by_role', 'by_user')
        monthly = defaultdict(lambda: {d: defaultdict(int) for d in DIMS})

        def add(dt, size, *, ftype, org, project, role, user):
            if not dt or size <= 0:
                return
            buckets = monthly[dt.strftime('%Y-%m')]
            buckets['by_type'][ftype] += size
            if org:
                buckets['by_organization'][org] += size
            if project:
                buckets['by_project'][project] += size
            if role:
                buckets['by_role'][role] += size
            if user:
                buckets['by_user'][user] += size

        def org_of(uid):
            return org_map.get(uid, (None, ''))[1] or NON_ORG_LABEL

        def role_of(uid):
            return role_map.get(uid, agent_role)

        for img in (PieceImage.objects.filter(piece__is_deleted=False)
                    .select_related('piece__ssdgps__affaire__propriete__projet', 'piece__created_by')):
            piece = img.piece
            projet = piece.ssdgps.affaire.propriete.projet
            add(img.created_at, (img.taille_octets or 0) + _file_size(img.apercu),
                ftype='images', org=org_of(projet.created_by_id),
                project=_project_label(projet), role=role_of(projet.created_by_id),
                user=_user_label(piece.created_by))

        for piece in (Piece.objects.filter(is_deleted=False).exclude(fichier='')
                      .select_related('ssdgps__affaire__propriete__projet', 'created_by')):
            projet = piece.ssdgps.affaire.propriete.projet
            add(piece.created_at, piece.taille_octets or _file_size(piece.fichier),
                ftype=categorize(piece.fichier.name), org=org_of(projet.created_by_id),
                project=_project_label(projet), role=role_of(projet.created_by_id),
                user=_user_label(piece.created_by))

        for user in CustomUser.objects.exclude(profile_picture=''):
            add(user.date_joined, _file_size(user.profile_picture),
                ftype='images', org=org_of(user.id), project=NON_PROJECT_LABEL,
                role=role_of(user.id), user=_user_label(user))

        if not monthly:
            self.stdout.write(self.style.WARNING("Aucun fichier daté à reconstruire."))
            return

        # Remplace un éventuel backfill précédent (idempotent).
        StorageSnapshot.objects.filter(is_backfill=True).delete()

        cum = {d: defaultdict(int) for d in DIMS}
        cum_total = 0
        created = 0
        for month in sorted(monthly.keys()):
            for dim in DIMS:
                for key, size in monthly[month][dim].items():
                    cum[dim][key] += size
            cum_total = sum(cum['by_type'].values())
            # Instantané daté à la fin du mois (1er du mois suivant à minuit, heure locale).
            year, mon = map(int, month.split('-'))
            taken = timezone.make_aware(datetime(year + (mon // 12), (mon % 12) + 1, 1))
            StorageSnapshot.objects.create(
                taken_at=taken, is_backfill=True,
                total_bytes=cum_total, total_files=0,
                by_type=dict(cum['by_type']),
                by_organization=dict(cum['by_organization']),
                by_project=dict(cum['by_project']),
                by_role=dict(cum['by_role']),
                by_user=dict(cum['by_user']),
            )
            created += 1

        self.stdout.write(self.style.SUCCESS(
            f"Backfill : {created} instantané(s) mensuel(s) reconstruit(s)."))
