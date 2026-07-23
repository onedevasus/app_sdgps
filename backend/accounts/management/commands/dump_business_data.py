"""Génère le snapshot des données métier RÉELLES pour le seed de production.

Exporte la cascade Projet → Propriété → Affaire → SSDGPS → Session → Pièce → PieceImage
(plus les métadonnées de champs `PieceFieldMeta`) de la base courante vers le fichier
`accounts/seed_data/business_data.json`, et copie les fichiers médias référencés dans
`accounts/seed_data/media/`.

Périmètre = données RÉELLES uniquement :
- organisation NON `is_test_data`,
- entités NON `is_deleted` (soft-delete) à chaque niveau de la cascade.

Choix de sérialisation (idempotence + portabilité entre bases) :
- Les PK UUID sont conservées telles quelles → les relations restent cohérentes au rejeu.
- Les FK vers des entités seedées par ailleurs sont exportées en CLÉ NATURELLE :
  utilisateurs (`created_by`/`updated_by`/`deleted_by`) par email, organisation par `code`,
  organismes par `code`. Elles seront ré-résolues au seed (cf. `accounts/seeding.py`).
- Les horodatages d'audit (`created_at`/`updated_at`) sont conservés pour préserver l'ordre
  d'affichage (les tableaux trient par date).

Le fichier produit est rejoué automatiquement à chaque `migrate` via `run_seed()`.

    python manage.py dump_business_data
"""
import json
import shutil
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand

from accounts.seeding import DEFAULT_BUSINESS_FILE, SEED_MEDIA_DIR


def _iso(value):
    """Sérialise un datetime en ISO 8601 (ou None)."""
    return value.isoformat() if value else None


def _email(user):
    return user.email if user else None


class Command(BaseCommand):
    help = ("Exporte les données métier réelles (projets → pièces) et leurs médias vers "
            "accounts/seed_data/ pour le seed de production.")

    def handle(self, *args, **options):
        from projects.models import Projet, Propriete, Affaire, Ssdgps, Session
        from pieces.models import Piece, PieceImage, PieceFieldMeta

        # --- Cascade filtrée sur les données réelles (org non-test, non supprimées) ---
        projets = list(
            Projet.objects.filter(is_deleted=False, organization__is_test_data=False)
            .select_related('organization', 'created_by', 'updated_by', 'deleted_by')
        )
        projet_ids = [p.id for p in projets]
        proprietes = list(
            Propriete.objects.filter(is_deleted=False, projet_id__in=projet_ids)
            .select_related('organisme_niveau1', 'organisme_niveau2', 'created_by',
                            'updated_by', 'deleted_by')
        )
        propriete_ids = [p.id for p in proprietes]
        affaires = list(
            Affaire.objects.filter(is_deleted=False, propriete_id__in=propriete_ids)
            .select_related('created_by', 'updated_by', 'deleted_by')
        )
        affaire_ids = [a.id for a in affaires]
        ssdgps = list(
            Ssdgps.objects.filter(is_deleted=False, affaire_id__in=affaire_ids)
            .select_related('created_by', 'updated_by', 'deleted_by')
        )
        ssdgps_ids = [s.id for s in ssdgps]
        sessions = list(
            Session.objects.filter(is_deleted=False, ssdgps_id__in=ssdgps_ids)
            .select_related('created_by', 'updated_by', 'deleted_by')
        )
        pieces = list(
            Piece.objects.filter(is_deleted=False, ssdgps_id__in=ssdgps_ids)
            .select_related('created_by', 'updated_by', 'deleted_by')
        )
        piece_ids = [p.id for p in pieces]
        images = list(PieceImage.objects.filter(piece_id__in=piece_ids))
        field_meta = list(PieceFieldMeta.objects.all())

        media_files = set()

        def audit(obj):
            """Champs communs de BaseModel (audit + soft-delete)."""
            return {
                'created_at': _iso(obj.created_at),
                'updated_at': _iso(obj.updated_at),
                'is_deleted': obj.is_deleted,
                'deleted_at': _iso(obj.deleted_at),
                'created_by': _email(obj.created_by),
                'updated_by': _email(obj.updated_by),
                'deleted_by': _email(obj.deleted_by),
            }

        data = {
            '_comment': (
                "Snapshot des donnees metier REELLES (org non-test, non supprimees) : "
                "Projet -> Propriete -> Affaire -> SSDGPS -> Session -> Piece -> PieceImage, "
                "plus PieceFieldMeta. Genere par `manage.py dump_business_data`. Rejoue par "
                "run_seed(). PK UUID conservees ; FK users/org/organismes en cle naturelle."
            ),
            'projets': [{
                'id': str(p.id), 'code_projet': p.code_projet, 'nom_projet': p.nom_projet,
                'description_projet': p.description_projet, 'statut': p.statut,
                'organization_code': p.organization.code, **audit(p),
            } for p in projets],
            'proprietes': [{
                'id': str(p.id), 'projet_id': str(p.projet_id), 'nom_propriete': p.nom_propriete,
                'id_requisition': p.id_requisition, 'id_titre': p.id_titre,
                'organisme_niveau1_code': p.organisme_niveau1.code if p.organisme_niveau1 else None,
                'organisme_niveau2_code': p.organisme_niveau2.code if p.organisme_niveau2 else None,
                **audit(p),
            } for p in proprietes],
            'affaires': [{
                'id': str(a.id), 'propriete_id': str(a.propriete_id),
                'numero_sd_affaire': a.numero_sd_affaire,
                'nature_procedure_affaire': a.nature_procedure_affaire,
                'nature_affaire': a.nature_affaire, 'date_bornage': _iso(a.date_bornage),
                **audit(a),
            } for a in affaires],
            'ssdgps': [{
                'id': str(s.id), 'affaire_id': str(s.affaire_id),
                'nature_ssdgps': s.nature_ssdgps, 'numero_ssdgps': s.numero_ssdgps,
                'type_ssdgps': s.type_ssdgps, **audit(s),
            } for s in ssdgps],
            'sessions': [{
                'id': str(s.id), 'ssdgps_id': str(s.ssdgps_id),
                'numero_session': s.numero_session, 'date_session': _iso(s.date_session),
                **audit(s),
            } for s in sessions],
            'pieces': [{
                'id': str(p.id), 'ssdgps_id': str(p.ssdgps_id),
                'session_id': str(p.session_id) if p.session_id else None,
                'type_piece': p.type_piece, 'numero': p.numero,
                'fichier': p.fichier.name or None if p.fichier else None,
                'taille_octets': p.taille_octets, 'ordre': p.ordre, 'payload': p.payload,
                'source_saisie': p.source_saisie, 'statut': p.statut,
                'orientation': p.orientation, 'versions_rapport': p.versions_rapport,
                'commentaire': p.commentaire, **audit(p),
            } for p in pieces],
            # PieceImage : PK entière conservée (table vierge en prod), FK piece par UUID.
            'piece_images': [{
                'id': im.id, 'piece_id': str(im.piece_id),
                'fichier': im.fichier.name or None if im.fichier else None,
                'apercu': im.apercu.name or None if im.apercu else None,
                'ordre': im.ordre, 'point_ref': im.point_ref, 'format': im.format,
                'taille_octets': im.taille_octets, 'largeur': im.largeur, 'hauteur': im.hauteur,
                'mode_couleur': im.mode_couleur, 'compression': im.compression,
                'date_creation': _iso(im.date_creation),
                'date_modification': _iso(im.date_modification),
                'created_at': _iso(im.created_at),
            } for im in images],
            # Métadonnées de champs (communes, éditables App Admin) : clé (type_piece, field_name).
            'piece_field_meta': [{
                'type_piece': m.type_piece, 'field_name': m.field_name,
                'description': m.description, 'tooltip': m.tooltip, 'required': m.required,
            } for m in field_meta],
        }

        # Manifeste des médias à embarquer (fichiers de pièces + images + aperçus).
        for p in pieces:
            if p.fichier:
                media_files.add(p.fichier.name)
        for im in images:
            if im.fichier:
                media_files.add(im.fichier.name)
            if im.apercu:
                media_files.add(im.apercu.name)
        data['media_files'] = sorted(media_files)

        # --- Écriture du JSON ---
        DEFAULT_BUSINESS_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(DEFAULT_BUSINESS_FILE, 'w', encoding='utf-8') as fh:
            json.dump(data, fh, ensure_ascii=False, indent=2)

        # --- Copie des binaires médias vers seed_data/media/ ---
        copied, missing = 0, 0
        media_root = Path(settings.MEDIA_ROOT)
        for rel in data['media_files']:
            src = media_root / rel
            dst = SEED_MEDIA_DIR / rel
            if not src.exists():
                missing += 1
                self.stdout.write(self.style.WARNING(f"  Média manquant sur disque : {rel}"))
                continue
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, dst)
            copied += 1

        self.stdout.write(self.style.SUCCESS(
            f"✅ Snapshot écrit dans {DEFAULT_BUSINESS_FILE.name} : "
            f"{len(data['projets'])} projet(s), {len(data['proprietes'])} propriété(s), "
            f"{len(data['affaires'])} affaire(s), {len(data['ssdgps'])} SSDGPS, "
            f"{len(data['sessions'])} session(s), {len(data['pieces'])} pièce(s), "
            f"{len(data['piece_images'])} image(s), {len(data['piece_field_meta'])} méta-champ(s). "
            f"Médias copiés : {copied} (manquants : {missing})."
        ))
