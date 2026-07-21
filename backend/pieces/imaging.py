"""
Extraction des métadonnées techniques d'une image de pièce (galerie multi-images).

Utilise Pillow pour lire format, dimensions, mode couleur et compression, et l'EXIF
pour la date de création. La date de modification provient du navigateur (`lastModified`).
"""
from datetime import datetime, timezone as dt_timezone
from io import BytesIO

from django.core.files.base import ContentFile
from django.utils import timezone
from PIL import Image

# Formats non affichables nativement par les navigateurs → on génère un aperçu PNG.
NON_WEB_FORMATS = {'TIFF', 'MPO'}

# Tags EXIF (valeurs numériques standard).
_EXIF_DATETIME_ORIGINAL = 36867  # DateTimeOriginal
_EXIF_DATETIME = 306             # DateTime

# Libellés lisibles des compressions rencontrées (surtout TIFF, via img.info).
_COMPRESSION_LABELS = {
    'raw': 'Aucune (brut)',
    'none': 'Aucune (brut)',
    'tiff_lzw': 'LZW (sans perte)',
    'tiff_adobe_deflate': 'Deflate (sans perte)',
    'tiff_deflate': 'Deflate (sans perte)',
    'packbits': 'PackBits (sans perte)',
    'group3': 'CCITT Group 3 (fax)',
    'group4': 'CCITT Group 4 (fax)',
    'jpeg': 'JPEG (avec perte)',
    'webp': 'WebP',
}


def _classify_mode(mode: str) -> str:
    """Classe le mode Pillow en type d'image métier."""
    if mode == '1':
        return 'Noir & blanc'
    if mode in ('L', 'LA', 'I', 'I;16'):
        return 'Niveaux de gris'
    return 'Couleur'


def _compression_label(img) -> str:
    fmt = (img.format or '').upper()
    comp = img.info.get('compression')
    if comp:
        return _COMPRESSION_LABELS.get(str(comp).lower(), str(comp))
    if fmt == 'JPEG':
        return 'JPEG (avec perte)'
    if fmt == 'PNG':
        return 'Deflate/ZIP (sans perte)'
    if fmt == 'GIF':
        return 'LZW (sans perte)'
    return '—'


def _parse_exif_datetime(value):
    """EXIF stocke les dates au format « YYYY:MM:DD HH:MM:SS »."""
    try:
        return timezone.make_aware(datetime.strptime(value, '%Y:%m:%d %H:%M:%S'))
    except (ValueError, TypeError):
        return None


def extract_image_metadata(django_file, client_last_modified=None) -> dict:
    """
    Renvoie les métadonnées techniques d'un fichier image téléversé.

    - `date_creation` : EXIF DateTimeOriginal (ou DateTime) si présent, sinon maintenant.
    - `date_modification` : `client_last_modified` (epoch ms du navigateur) si fourni,
      sinon maintenant.
    Robuste : toute erreur de lecture laisse des valeurs par défaut sûres.
    """
    now = timezone.now()
    meta = {
        'format': '',
        'taille_octets': getattr(django_file, 'size', 0) or 0,
        'largeur': 0,
        'hauteur': 0,
        'mode_couleur': '',
        'compression': '',
        'date_creation': now,
        'date_modification': now,
    }
    try:
        django_file.seek(0)
        with Image.open(django_file) as img:
            meta['format'] = img.format or ''
            meta['largeur'], meta['hauteur'] = img.size
            meta['mode_couleur'] = _classify_mode(img.mode)
            meta['compression'] = _compression_label(img)
            try:
                exif = img.getexif()
                raw = exif.get(_EXIF_DATETIME_ORIGINAL) or exif.get(_EXIF_DATETIME)
                parsed = _parse_exif_datetime(raw) if raw else None
                if parsed:
                    meta['date_creation'] = parsed
            except Exception:
                pass
    except Exception:
        pass
    finally:
        try:
            django_file.seek(0)
        except Exception:
            pass

    if client_last_modified:
        try:
            ms = int(client_last_modified)
            meta['date_modification'] = datetime.fromtimestamp(ms / 1000, tz=dt_timezone.utc)
        except (ValueError, TypeError, OSError):
            pass

    return meta


def make_png_preview(django_file, max_size=(1600, 1600)):
    """Génère un aperçu PNG web-compatible (surtout pour TIFF, non affichable en
    <img>). Renvoie un `ContentFile` ou `None` en cas d'échec."""
    try:
        django_file.seek(0)
        with Image.open(django_file) as im:
            # Conserver la transparence si présente ; convertir les modes exotiques
            # (CMYK, YCbCr, I, F…) en RGB pour un PNG valide.
            if im.mode in ('RGBA', 'LA', 'RGB', 'L', 'P', '1'):
                out = im.copy()
            else:
                out = im.convert('RGB')
            out.thumbnail(max_size)
            buf = BytesIO()
            out.save(buf, format='PNG')
            return ContentFile(buf.getvalue())
    except Exception:
        return None
    finally:
        try:
            django_file.seek(0)
        except Exception:
            pass
