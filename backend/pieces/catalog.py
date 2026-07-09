"""
Registre statique des types de pièces (Phase 6.5).

Source : docs/notes/RAPPORTS.xlsm, feuille "Liste-Noms" (19 entrées ; les
« Rapport de la détermination N°1/2/3 » sont factorisées ici en un seul type
répétable RDN, doté d'un champ `numero` variable — cf. PLAN_DEV.md §7.2/§7.2.1).

Ce module N'EST PAS piloté par la base : c'est un dict Python figé, jamais une table.

Le champ `niveau` de chaque entrée est un niveau PAR DÉFAUT (utilisé pour
pré-sélectionner l'assistant d'ajout) — l'utilisateur peut librement choisir, pour
n'importe quel type, un niveau SSDGPS (commun à toutes les sessions) ou Session
(spécifique, potentiellement différent d'une session à l'autre) à la création ou
à la modification d'une pièce. `validators.validate_piece_coherence` ne contraint
donc plus le niveau réel d'une pièce par rapport à ce champ.
"""

TOUTES = 'toutes'


def _champ(entries):
    return [{'name': n, 'label': l, 'type': t} for n, l, t in entries]


# --- Schémas de colonnes, issus tels quels du classeur -------------------------

_LPA_CHAMPS = [
    ('id', 'ID', 'text'), ('nom_point', 'Nom Point', 'text'),
    ('x_m', 'X(m)', 'number'), ('y_m', 'Y(m)', 'number'),
    ('reference', 'Référence', 'text'),
    ('nature_materialisation', 'Nature Matérialisation', 'text'),
    ('nature_signalisation', 'Nature Signalisation', 'text'),
]

_PPX_CHAMPS = [  # PPA / PPN
    ('id', 'ID', 'text'), ('nom_point', 'Nom Point', 'text'),
    ('x_m', 'X(m)', 'number'), ('y_m', 'Y(m)', 'number'),
    ('date_visite', 'Date Visite', 'date'),
    ('systeme_projection', 'Système Projection', 'text'),
    ('zone_projection', 'Zone Projection', 'text'),
    ('fichier_image', 'Fichier Image', 'text'),
]

_ROB_CHAMPS = [
    ('id', 'ID', 'text'), ('point', 'Point', 'text'),
    ('heure_debut', 'Heure Début', 'text'), ('heure_fin', 'Heure Fin', 'text'),
    ('duree', 'Durée', 'text'), ('type', 'Type', 'text'), ('fichier', 'Fichier', 'text'),
    ('epoques', 'Epoques', 'number'), ('cadence', 'Cadence', 'text'),
    ('haut_ant_m', 'Haut. Ant. (m)', 'number'), ('antenne', 'Antenne', 'text'),
    ('ref_antenne', 'Réf. antenne', 'text'),
]

_RTLB_CHAMPS = [
    ('id', 'ID', 'text'), ('id_vec', 'ID Vec.', 'text'), ('de', 'De', 'text'), ('vers', 'Vers', 'text'),
    ('solution', 'Solution', 'text'), ('heure_debut', 'Heure Début', 'text'), ('heure_fin', 'Heure Fin', 'text'),
    ('duree', 'Durée', 'text'), ('methode_terrain', 'Méthode Terrain', 'text'),
    ('longueur_m', 'Longueur (m)', 'number'), ('rms_m', 'RMS (m)', 'number'),
    ('prec_horiz_m', 'Prec. Horiz. (m)', 'number'), ('prec_vert_m', 'Prec. Vert. (m)', 'number'),
    ('satellites', 'Satellites', 'number'), ('nb_epoques', 'Nb Epoques', 'number'),
    ('delta_x_m', 'Δ X (m)', 'number'), ('delta_y_m', 'Δ Y (m)', 'number'), ('delta_z_m', 'Δ Z (m)', 'number'),
]

_RFB_CHAMPS = [
    ('id', 'ID', 'text'), ('id_boucle', 'ID Boucle', 'text'), ('nom_boucle', 'Nom Boucle', 'text'),
    ('longueur_3d_m', 'Longueur 3D(m)', 'number'), ('delta_x_m', 'ΔX(m)', 'number'),
    ('delta_y_m', 'ΔY(m)', 'number'), ('delta_z_m', 'ΔZ(m)', 'number'), ('delta_h_m', 'ΔH(m)', 'number'),
    ('delta_v_m', 'ΔV(m)', 'number'), ('ppm', 'ppm', 'number'), ('delta_3d_m', 'Δ3D(m)', 'number'),
    ('tolerance_m', 'Tolérance(m)', 'number'), ('tolerable', 'Tolérable', 'text'),
]

_RDX_CHAMPS = [  # RDL / RDN / RDD — schéma identique
    ('id', 'ID', 'text'), ('nom_point', 'Nom Point', 'text'),
    ('x_m', 'X(m)', 'number'), ('sigma_x_m', 'σx(m)', 'number'),
    ('y_m', 'Y(m)', 'number'), ('sigma_y_m', 'σy(m)', 'number'),
]

_RDI_CHAMPS = [
    ('id', 'ID', 'text'), ('nom_point_fixe', 'Nom Point Fixe', 'text'),
    ('nom_point_calcule', 'Nom Point Calculé', 'text'),
    ('x_m_fixe', 'X(m) [Fixe]', 'number'), ('y_m_fixe', 'Y(m) [Fixe]', 'number'),
    ('x_m_calcule', 'X(m) [Calculé]', 'number'), ('y_m_calcule', 'Y(m) [Calculé]', 'number'),
    ('delta_x_m', 'ΔX(m)', 'number'), ('delta_y_m', 'ΔY(m)', 'number'), ('delta_d_m', 'ΔD(m)', 'number'),
]

# Aucun schéma tabulaire trouvé dans le classeur pour FTR/RC → formulaires manuels
# minimalistes, à confirmer avec le métier avant que le générateur de rapport (Phase 6)
# ne consomme leur payload.
_FTR_CHAMPS = [
    ('recepteur', 'Récepteur (modèle)', 'text'), ('numero_serie', 'Numéro de série', 'text'),
    ('antenne', 'Antenne', 'text'), ('observations', 'Observations', 'textarea'),
]
_RC_CHAMPS = [('contenu', 'Contenu du rapport de contrôle', 'textarea')]


PIECE_CATALOG = {
    'PGSDGPS': {'nom': 'Page de Garde SDGPS', 'niveau': 'ssdgps', 'source': 'ui',
                'natures': TOUTES, 'champs': [], 'repeatable': False},
    'RDC':     {'nom': 'Rapport de Consultation', 'niveau': 'ssdgps', 'source': 'image',
                'natures': TOUTES, 'champs': [], 'repeatable': False},
    'LPA':     {'nom': 'Liste des Points Anciens', 'niveau': 'ssdgps', 'source': 'csv_manuel',
                'natures': ['PDC/GPS', 'PLC/GPS', 'DDC/GPS', 'DLC/GPS'], 'champs': _champ(_LPA_CHAMPS),
                'repeatable': False},
    'CCSPA':   {'nom': 'Canevas de Contrôle de Stabilité des Points Anciens', 'niveau': 'ssdgps',
                'source': 'image', 'natures': ['PDC/GPS'], 'champs': [], 'repeatable': False},
    'CDC':     {'nom': 'Canevas de Densification Cadastrale', 'niveau': 'ssdgps', 'source': 'image',
                'natures': ['DDC/GPS'], 'champs': [], 'repeatable': False},
    'CLC':     {'nom': 'Canevas de Levé Cadastral', 'niveau': 'ssdgps', 'source': 'image',
                'natures': ['PLC/GPS', 'DLC/GPS'], 'champs': [], 'repeatable': False},
    'PPA':     {'nom': 'Photos des points anciens', 'niveau': 'ssdgps', 'source': 'image_csv_manuel',
                'natures': ['PDC/GPS', 'DLC/GPS'], 'champs': _champ(_PPX_CHAMPS), 'repeatable': False},
    'PPN':     {'nom': 'Photos des points nouveaux', 'niveau': 'ssdgps', 'source': 'image_csv_manuel',
                'natures': ['DDC/GPS', 'DLC/GPS'], 'champs': _champ(_PPX_CHAMPS), 'repeatable': False},
    'FTR':     {'nom': 'Fiche Technique des Récepteurs', 'niveau': 'ssdgps', 'source': 'csv_manuel',
                'natures': TOUTES, 'champs': _champ(_FTR_CHAMPS), 'repeatable': False},
    'ROB':     {'nom': 'Rapport des Observations Brutes', 'niveau': 'session', 'source': 'csv_manuel',
                'natures': TOUTES, 'champs': _champ(_ROB_CHAMPS), 'repeatable': False},
    'RTLB':    {'nom': 'Rapport du traitement des lignes de base', 'niveau': 'session',
                'source': 'csv_manuel', 'natures': TOUTES, 'champs': _champ(_RTLB_CHAMPS), 'repeatable': False},
    'RFB':     {'nom': 'Rapport des fermetures des Boucles', 'niveau': 'session', 'source': 'csv_manuel',
                'natures': TOUTES, 'champs': _champ(_RFB_CHAMPS), 'repeatable': False},
    'RDL':     {'nom': 'Rapport de la détermination libre', 'niveau': 'session', 'source': 'csv_manuel',
                'natures': TOUTES, 'champs': _champ(_RDX_CHAMPS), 'repeatable': False},
    'RDN':     {'nom': 'Rapport de la détermination N°k', 'niveau': 'session', 'source': 'csv_manuel',
                'natures': ['PDC/GPS', 'DDC/GPS', 'PLC/GPS'], 'champs': _champ(_RDX_CHAMPS),
                'repeatable': True},
    'RDI':     {'nom': 'Rapport des déterminations Intermédiaires', 'niveau': 'session',
                'source': 'csv_manuel', 'natures': ['DLC/GPS'], 'champs': _champ(_RDI_CHAMPS),
                'repeatable': False},
    'RDD':     {'nom': 'Rapport de la détermination définitive', 'niveau': 'session',
                'source': 'csv_manuel', 'natures': ['DDC/GPS', 'DLC/GPS'], 'champs': _champ(_RDX_CHAMPS),
                'repeatable': False},
    'RC':      {'nom': 'Rapport de contrôle', 'niveau': 'ssdgps', 'source': 'manuel',
                'natures': TOUTES, 'champs': _champ(_RC_CHAMPS), 'repeatable': False},
}

PIECE_CHOICES = [(code, d['nom']) for code, d in PIECE_CATALOG.items()]


def get_piece_def(type_piece: str) -> dict:
    d = PIECE_CATALOG.get(type_piece)
    if d is None:
        raise KeyError(f"Type de pièce inconnu : {type_piece}")
    return d


def natures_applicable(type_piece: str, nature_ssdgps: str) -> bool:
    d = get_piece_def(type_piece)
    return d['natures'] == TOUTES or nature_ssdgps in d['natures']


def serialize_catalog() -> list:
    """Représentation JSON du registre, consommée par GET /api/v1/pieces/catalog/."""
    return [
        {'code': code, 'nom': d['nom'], 'niveau': d['niveau'], 'source': d['source'],
         'natures': d['natures'], 'champs': d['champs'], 'repeatable': d['repeatable']}
        for code, d in PIECE_CATALOG.items()
    ]
