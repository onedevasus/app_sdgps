"""
Agrégation de l'espace de stockage occupé par les fichiers importés dans l'app.

Trois sources de fichiers sont recensées :
- `PieceImage.fichier` (+ aperçu) — taille principale déjà stockée dans `taille_octets` ;
- `Piece.fichier` (document source : image / CSV / Excel / HTML) — taille lue sur disque ;
- `CustomUser.profile_picture` (avatars).

Pour chaque fichier on résout {organisation, projet, utilisateur, nature} et on somme les
tailles. Le résultat sert à la fois à la vue « ventilation courante » (à la volée, mise en
cache) et à la commande d'instantané (`snapshot_storage`).
"""
import os

from django.core.cache import cache

from pieces.models import Piece, PieceImage
from accounts.models import CustomUser, Membership


# --- Nature de fichier (par extension) --------------------------------------
_EXT_TO_TYPE = {
    'jpg': 'images', 'jpeg': 'images', 'png': 'images', 'gif': 'images',
    'tif': 'images', 'tiff': 'images', 'webp': 'images', 'bmp': 'images',
    'csv': 'csv',
    'xls': 'excel', 'xlsx': 'excel', 'xlsm': 'excel',
    'htm': 'html', 'html': 'html',
    'pdf': 'pdf',
}
# Libellés lisibles (frontend). L'ordre définit aussi l'ordre d'affichage.
TYPE_LABELS = {
    'images': 'Images',
    'csv': 'CSV',
    'excel': 'Excel',
    'html': 'HTML',
    'pdf': 'PDF',
    'autres': 'Autres',
}

# Catégorie de la ventilation « par projet » regroupant les fichiers NON rattachés à un
# projet (avatars / photos de profil, et tout futur fichier hors projet). Permet à la
# somme « par projet » de réconcilier avec le total affiché.
NON_PROJECT_LABEL = 'Hors projet (avatars, photos…)'

# Catégorie de la ventilation « par organisation » regroupant les fichiers dont le
# propriétaire n'a AUCUNE organisation active (ex. avatar d'un utilisateur sans adhésion,
# projet d'un créateur sans organisation courante). Même rôle de réconciliation.
NON_ORG_LABEL = 'Hors organisation'


def categorize(filename) -> str:
    """Nature d'un fichier d'après son extension (repli : « autres »)."""
    if not filename:
        return 'autres'
    ext = os.path.splitext(str(filename))[1].lstrip('.').lower()
    return _EXT_TO_TYPE.get(ext, 'autres')


def _file_size(field) -> int:
    """Taille d'un FieldFile (stat disque), 0 si absent/introuvable (fichier manquant)."""
    if not field:
        return 0
    try:
        return field.size or 0
    except (OSError, ValueError, NotImplementedError):
        return 0


class _Acc:
    """Accumulateur de ventilations {clé: octets} + totaux."""
    def __init__(self):
        self.total_bytes = 0
        self.total_files = 0
        self.by_type = {}
        self.by_organization = {}
        self.by_project = {}
        self.by_role = {}
        self.by_user = {}

    def add(self, size, *, ftype, org, project, role, user):
        if size <= 0:
            # On compte quand même le fichier (présence), mais 0 octet.
            pass
        self.total_bytes += size
        self.total_files += 1
        self.by_type[ftype] = self.by_type.get(ftype, 0) + size
        if org:
            self.by_organization[org] = self.by_organization.get(org, 0) + size
        if project:
            self.by_project[project] = self.by_project.get(project, 0) + size
        if role:
            self.by_role[role] = self.by_role.get(role, 0) + size
        if user:
            self.by_user[user] = self.by_user.get(user, 0) + size

    def as_dict(self):
        return {
            'total_bytes': self.total_bytes,
            'total_files': self.total_files,
            'by_type': self.by_type,
            'by_organization': self.by_organization,
            'by_project': self.by_project,
            'by_role': self.by_role,
            'by_user': self.by_user,
        }


def _primary_org_map() -> dict:
    """user_id → (org_id, org_name) : organisation PRINCIPALE de chaque utilisateur
    (sa première adhésion active, comme `CustomUser.get_primary_organization`).

    Pré-calculé en une requête pour éviter un N+1 dans les boucles de ventilation.
    """
    mapping = {}
    rows = (Membership.objects.filter(is_active=True)
            .order_by('user_id', 'joined_at')
            .values_list('user_id', 'organization_id', 'organization__name'))
    for user_id, org_id, org_name in rows:
        # La première ligne rencontrée pour un utilisateur = adhésion active la plus ancienne.
        if user_id not in mapping:
            mapping[user_id] = (org_id, org_name)
    return mapping


# Libellés lisibles des rôles applicatifs (cf. CustomUser.get_primary_role_display).
_ROLE_LABELS = {
    'ROLE_SUPER_ADMIN': 'Super Admin',
    'ROLE_ADMIN_SYSTEME': 'Admin Système',
    'ROLE_ORGANISATION_ADMIN': 'Admin Org',
    'ROLE_ORGANISATION_AGENT': 'Agent Org',
}


def _primary_role_map() -> dict:
    """user_id → libellé du rôle principal (même hiérarchie que
    `CustomUser.get_primary_role` : Super Admin > Admin Système > Admin Org > Agent Org).

    Pré-calculé pour éviter un N+1 dans les boucles de ventilation.
    """
    # Rôle issu de la première adhésion active (utilisé si ni superuser ni admin plateforme).
    first_role = {}
    for uid, role in (Membership.objects.filter(is_active=True)
                      .order_by('user_id', 'joined_at')
                      .values_list('user_id', 'role')):
        first_role.setdefault(uid, role)

    mapping = {}
    for u in CustomUser.objects.all().only('id', 'is_superuser', 'platform_role'):
        if u.is_superuser:
            code = 'ROLE_SUPER_ADMIN'
        elif u.is_platform_admin():
            code = 'ROLE_ADMIN_SYSTEME'
        else:
            code = first_role.get(u.id, 'ROLE_ORGANISATION_AGENT')
        mapping[u.id] = _ROLE_LABELS.get(code, code)
    return mapping


def _project_label(projet) -> str:
    return f"{projet.code_projet} — {projet.nom_projet}" if projet else ''


def _user_label(user) -> str:
    if not user:
        return ''
    full = f"{user.first_name} {user.last_name}".strip()
    return full or user.email


def compute_storage_overview(organization_id=None) -> dict:
    """Calcule la ventilation COURANTE du stockage. `organization_id` (UUID) restreint à une
    organisation. Retourne un dict {total_bytes, total_files, by_type, by_organization,
    by_project, by_user} (ventilations = {libellé: octets}).

    L'organisation d'un fichier suit son propriétaire : pour les pièces, l'organisation
    COURANTE du créateur du projet (les projets « suivent » leur créateur — cf.
    `projects.views`) ; pour les avatars, l'organisation courante de l'utilisateur. Ainsi,
    changer l'organisation d'un utilisateur ré-attribue automatiquement sa volumétrie.
    """
    acc = _Acc()
    org_map = _primary_org_map()
    role_map = _primary_role_map()

    def _org_of(user_id):
        """(org_id, org_name) courants du propriétaire, ('', '') si sans organisation active."""
        return org_map.get(user_id, (None, ''))

    def _role_of(user_id):
        """Libellé du rôle applicatif courant du propriétaire (repli : « Agent Org »)."""
        return role_map.get(user_id, _ROLE_LABELS['ROLE_ORGANISATION_AGENT'])

    def _keep(org_id):
        return not organization_id or str(org_id) == str(organization_id)

    # (1) Images de pièces — taille principale stockée (+ aperçu best-effort).
    img_qs = (PieceImage.objects
              .filter(piece__is_deleted=False)
              .select_related('piece__ssdgps__affaire__propriete__projet',
                              'piece__created_by'))
    for img in img_qs.iterator():
        piece = img.piece
        projet = piece.ssdgps.affaire.propriete.projet
        org_id, org_name = _org_of(projet.created_by_id)
        if not _keep(org_id):
            continue
        size = (img.taille_octets or 0) + _file_size(img.apercu)
        acc.add(size, ftype='images', org=org_name or NON_ORG_LABEL,
                project=_project_label(projet), role=_role_of(projet.created_by_id),
                user=_user_label(piece.created_by))

    # (2) Fichiers source des pièces (document importé : image / CSV / Excel / HTML).
    piece_qs = (Piece.objects
                .filter(is_deleted=False)
                .exclude(fichier='')
                .select_related('ssdgps__affaire__propriete__projet', 'created_by'))
    for piece in piece_qs.iterator():
        projet = piece.ssdgps.affaire.propriete.projet
        org_id, org_name = _org_of(projet.created_by_id)
        if not _keep(org_id):
            continue
        # Taille figée à l'upload (pas de HEAD réseau sur stockage objet) ; repli disque
        # pour les pièces legacy dont `taille_octets` n'a pas encore été renseignée.
        size = piece.taille_octets or _file_size(piece.fichier)
        acc.add(size, ftype=categorize(piece.fichier.name),
                org=org_name or NON_ORG_LABEL, project=_project_label(projet),
                role=_role_of(projet.created_by_id), user=_user_label(piece.created_by))

    # (3) Avatars (photos de profil) — rattachés à l'utilisateur/organisation, sans projet.
    user_qs = CustomUser.objects.exclude(profile_picture='')
    for user in user_qs.iterator():
        org_id, org_name = _org_of(user.id)
        if not _keep(org_id):
            continue
        acc.add(_file_size(user.profile_picture), ftype='images',
                org=org_name or NON_ORG_LABEL, project=NON_PROJECT_LABEL,
                role=_role_of(user.id), user=_user_label(user))

    return acc.as_dict()


_VERSION_KEY = 'storage_overview_version'


def overview_version() -> int:
    """Génération courante du cache de ventilation. Incrémentée à chaque changement de
    donnée pertinent (cf. `invalidate_storage_overview`) : la clé de cache l'intègre, si
    bien qu'un bump rend obsolètes d'un coup toutes les variantes (globale + par org)."""
    v = cache.get(_VERSION_KEY)
    if v is None:
        cache.set(_VERSION_KEY, 1, None)
        v = 1
    return v


def invalidate_storage_overview() -> None:
    """Force le recalcul de la ventilation au prochain appel (bump de version)."""
    try:
        cache.incr(_VERSION_KEY)
    except ValueError:
        # Clé absente (jamais initialisée) → on la pose.
        cache.set(_VERSION_KEY, 1, None)


def cached_storage_overview(organization_id=None, ttl=300) -> dict:
    """Ventilation courante avec cache (par défaut 5 min) — évite les stats disque répétées.

    La clé embarque la version courante : toute modification des utilisateurs / organisations
    / projets / pièces invalide le cache (cf. `analytics.signals`), donc les KPIs se
    rafraîchissent automatiquement au prochain chargement.
    """
    key = f"storage_overview:{organization_id or 'all'}:v{overview_version()}"
    data = cache.get(key)
    if data is None:
        data = compute_storage_overview(organization_id)
        cache.set(key, data, ttl)
    return data
