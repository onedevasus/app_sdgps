"""
Règles de validation métier des pièces, partagées entre `Piece.clean()` et
`PieceSerializer.validate()` (même convention que projects/validators.py).
"""
import os

from django.conf import settings
from django.core.exceptions import ValidationError

from .catalog import get_piece_def, natures_applicable

ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.pdf', '.csv', '.xlsx'}

# Extensions autorisées pour les images d'une pièce (galerie multi-images).
ALLOWED_IMAGE_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.tif', '.tiff', '.webp'}

# Sources catalogue compatibles avec chaque valeur de Piece.SourceSaisie
_SOURCE_SAISIE_COMPAT = {
    'image': {'image', 'image_csv_manuel', 'ui'},
    'import': {'csv_manuel', 'image_csv_manuel'},
    'manuel': {'csv_manuel', 'image_csv_manuel', 'manuel'},
    'ui': {'ui'},
}


def validate_piece_file_extension(value):
    ext = os.path.splitext(value.name)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValidationError(
            f"Extension « {ext} » non autorisée. Formats acceptés : "
            f"{', '.join(sorted(ALLOWED_EXTENSIONS))}."
        )


def validate_piece_image_extension(value):
    ext = os.path.splitext(value.name)[1].lower()
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        raise ValidationError(
            f"Extension « {ext} » non autorisée. Formats image acceptés : "
            f"{', '.join(sorted(ALLOWED_IMAGE_EXTENSIONS))}."
        )


def validate_piece_file_size(value):
    max_mb = getattr(settings, 'PIECE_MAX_FILE_SIZE_MB', 20)
    if value.size > max_mb * 1024 * 1024:
        raise ValidationError(f"Fichier trop volumineux (maximum {max_mb} Mo).")


def validate_image_content(value):
    """Vérifie que le fichier est réellement une image valide (défense en profondeur,
    au-delà de l'extension)."""
    from PIL import Image, UnidentifiedImageError
    try:
        value.seek(0)
        Image.open(value).verify()
    except (UnidentifiedImageError, OSError):
        raise ValidationError("Le fichier fourni n'est pas une image valide.")
    finally:
        value.seek(0)


def validate_piece_coherence(type_piece, ssdgps, session, numero, source_saisie=None, exclude_pk=None):
    """
    Vérifie : type connu, `ssdgps` toujours renseigné, `session` (si fournie)
    appartenant bien à ce SSDGPS, nature du SSDGPS compatible, numero cohérent
    avec repeatable, absence de doublon, source_saisie compatible avec le
    catalogue. Lève ValidationError (dict) sinon.

    Niveau (SSDGPS commun vs Session spécifique) : le catalogue (`niveau` dans
    PIECE_CATALOG) n'est qu'une valeur par défaut suggérée à la création — le
    niveau réel d'une pièce est un choix libre de l'utilisateur, matérialisé
    uniquement par la présence ou non de `session` (aucune contrainte croisée
    avec le type ni avec mono/multi-session ici).
    """
    errors = {}
    try:
        piece_def = get_piece_def(type_piece)
    except KeyError:
        raise ValidationError({'type_piece': "Type de pièce inconnu."})

    if not ssdgps:
        errors['ssdgps'] = "Une pièce doit toujours être rattachée à un SSDGPS."
    elif session and session.ssdgps_id != ssdgps.id:
        errors['session'] = "La session choisie n'appartient pas au SSDGPS indiqué."

    nature = ssdgps.nature_ssdgps if ssdgps else None
    if nature and not natures_applicable(type_piece, nature):
        errors['type_piece'] = (
            f"Le type « {type_piece} » n'est pas applicable à la nature « {nature} »."
        )

    if piece_def['repeatable']:
        if not numero:
            errors['numero'] = "Un numéro est requis pour ce type de pièce répétable."
    elif numero:
        errors['numero'] = "Ce type de pièce n'accepte pas de numéro."

    if source_saisie:
        compat = _SOURCE_SAISIE_COMPAT.get(source_saisie, set())
        if piece_def['source'] not in compat:
            errors['source_saisie'] = (
                f"La source « {source_saisie} » n'est pas compatible avec le type « {type_piece} »."
            )

    if not errors:
        from .models import Piece  # import tardif : évite le cycle models <-> validators
        qs = Piece.objects.filter(type_piece=type_piece, ssdgps=ssdgps, session=session, is_deleted=False)
        qs = qs.filter(numero=numero) if piece_def['repeatable'] else qs.filter(numero__isnull=True)
        if exclude_pk:
            qs = qs.exclude(pk=exclude_pk)
        if qs.exists():
            label = f"{type_piece}" + (f" n°{numero}" if numero else "")
            errors['type_piece'] = f"Une pièce « {label} » existe déjà pour ce parent."

    if errors:
        raise ValidationError(errors)
