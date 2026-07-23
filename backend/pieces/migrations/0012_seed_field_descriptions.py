# Seed des descriptions (courte = infobulle, détaillée) des champs du catalogue de pièces.
# Rédigées par analyse des schémas de colonnes (catalog.py) et du domaine géodésique/cadastral
# (contexte ANCFCC : projection Lambert conique conforme, canevas GPS). Idempotent
# (update_or_create) et ÉDITABLE ensuite par l'App Admin via l'écran d'administration.
from django.db import migrations


# --- Fragments réutilisables : (tooltip, description) ---
ID_ORD = ("Numéro d'ordre",
          "Identifiant séquentiel de la ligne dans le tableau ; renuméroté 1..n selon l'ordre d'affichage/tri.")
CO_X = ("Coordonnée Est X (m)",
        "Coordonnée planimétrique Est (X) du point, en mètres, dans le système de projection "
        "Lambert conique conforme en vigueur.")
CO_Y = ("Coordonnée Nord Y (m)",
        "Coordonnée planimétrique Nord (Y) du point, en mètres, dans le système de projection "
        "Lambert conique conforme en vigueur.")
SIG_X = ("Écart-type σx (m)",
         "Écart-type (incertitude) sur la coordonnée X issu de la compensation, en mètres ; "
         "plus il est faible, plus la coordonnée est précise.")
SIG_Y = ("Écart-type σy (m)",
         "Écart-type (incertitude) sur la coordonnée Y issu de la compensation, en mètres ; "
         "plus il est faible, plus la coordonnée est précise.")
NPC = ("Point calculé",
       "Nom du point dont les coordonnées calculées sont comparées à la référence.")
XC = ("X calculé (m)", "Coordonnée Est (X) calculée du point, en mètres.")
YC = ("Y calculé (m)", "Coordonnée Nord (Y) calculée du point, en mètres.")
DX = ("Écart ΔX (m)", "Écart sur la coordonnée Est : X calculé − X de référence, en mètres.")
DY = ("Écart ΔY (m)", "Écart sur la coordonnée Nord : Y calculé − Y de référence, en mètres.")
DD = ("Écart planimétrique ΔD (m)",
      "Écart planimétrique total (distance) entre le point calculé et le point de référence, "
      "en mètres : √(ΔX² + ΔY²).")
DETERM = ("Détermination (Libre / N°k)",
          "Étiquette du bloc de détermination assemblé auquel appartient la ligne (Libre, N°1, N°2…).")

# Ensemble « écarts vs détermination définitive » (RDL/RDN/RDIA — version écarts).
ECARTS = {
    'id': ID_ORD,
    'nom_point_fixe': ("Point(s) fixe(s) — définitif",
                       "Nom du ou des point(s) fixe(s) issus de la détermination définitive (RDD), "
                       "pris comme référence (coordonnées supposées vraies)."),
    'nom_point_calcule': NPC,
    'x_m_fixe': ("X définitif (m)", "Coordonnée Est (X) définitive du point (RDD), en mètres."),
    'y_m_fixe': ("Y définitif (m)", "Coordonnée Nord (Y) définitive du point (RDD), en mètres."),
    'x_m_calcule': XC, 'y_m_calcule': YC,
    'delta_x_m': DX, 'delta_y_m': DY, 'delta_d_m': DD,
}

# Ensemble « détermination brute » (RDL/RDN/RDD).
RDX = {
    'id': ID_ORD,
    'nom_point': ("Nom du point déterminé",
                  "Désignation du point dont les coordonnées sont déterminées dans ce rapport."),
    'x_m': CO_X, 'sigma_x_m': SIG_X, 'y_m': CO_Y, 'sigma_y_m': SIG_Y,
}

# Photos des points (PPA / PPN).
PPX = {
    'id': ID_ORD,
    'nom_point': ("Nom du point photographié",
                  "Désignation du point (ancien pour PPA, nouveau pour PPN) auquel se rattachent "
                  "la ou les photos."),
    'x_m': CO_X, 'y_m': CO_Y,
    'date_visite': ("Date de la prise de vue", "Date de la visite terrain / de la prise de la photo du point."),
    'systeme_projection': ("Système géodésique",
                           "Système géodésique de référence des coordonnées (ex. Merchich)."),
    'zone_projection': ("Zone de projection",
                        "Zone / fuseau de la projection cartographique (ex. Nord, Sud, Sahara) "
                        "déterminant le système Lambert applicable."),
    'fichier_image': ("Nom du fichier photo",
                      "Nom du fichier image de la photo du point, servant à rattacher la photo au "
                      "point dans la galerie."),
}

# Comparaison fixe vs calculé (RDI / RC).
FIX_CALC = {
    'id': ID_ORD,
    'nom_point_fixe': ("Point fixe (référence)",
                       "Nom du point fixe (coordonnées connues, supposées vraies) servant de "
                       "référence à la comparaison."),
    'nom_point_calcule': NPC,
    'x_m_fixe': ("X fixe (m)", "Coordonnée Est (X) de référence du point fixe, en mètres."),
    'y_m_fixe': ("Y fixe (m)", "Coordonnée Nord (Y) de référence du point fixe, en mètres."),
    'x_m_calcule': XC, 'y_m_calcule': YC,
    'delta_x_m': DX, 'delta_y_m': DY, 'delta_d_m': DD,
}


def _merge(*dicts):
    out = {}
    for d in dicts:
        out.update(d)
    return out


DESCRIPTIONS = {
    'LPA': {
        'id': ID_ORD,
        'nom_point': ("Nom / matricule du point",
                      "Désignation officielle du point ancien (matricule de borne ou numéro de "
                      "canevas) telle qu'elle figure dans les archives cadastrales."),
        'x_m': CO_X, 'y_m': CO_Y,
        'reference': ("Référence / source",
                      "Référence documentaire ou source d'origine des coordonnées du point ancien "
                      "(dossier, canevas, réquisition d'origine)."),
        'nature_materialisation': ("Type de matérialisation",
                                   "Nature de la matérialisation physique du point sur le terrain "
                                   "(borne en béton, repère scellé, clou, spit, etc.)."),
        'nature_signalisation': ("Type de signalisation",
                                 "Nature de la signalisation facilitant le repérage du point "
                                 "(balise, peinture, témoin, etc.)."),
    },
    'PPA': PPX,
    'PPN': PPX,
    'FTR': {
        'recepteur': ("Modèle du récepteur", "Marque et modèle du récepteur GPS utilisé."),
        'numero_serie': ("Numéro de série", "Numéro de série du récepteur GPS."),
        'antenne': ("Antenne", "Type / modèle de l'antenne associée au récepteur."),
        'observations': ("Observations", "Remarques libres sur le récepteur ou son utilisation."),
    },
    'ROB': {
        'id': ID_ORD,
        'point': ("Point stationné",
                  "Nom du point sur lequel le récepteur GPS a été installé (stationné) pendant la "
                  "session d'observation."),
        'heure_debut': ("Heure de début", "Heure de début de la session d'observation GPS."),
        'heure_fin': ("Heure de fin", "Heure de fin de la session d'observation GPS."),
        'duree': ("Durée d'observation", "Durée totale de la session d'observation (format hh:mm:ss)."),
        'type': ("Type d'observation", "Mode d'observation GPS (statique, statique rapide, cinématique…)."),
        'fichier': ("Fichier d'observation",
                    "Nom du fichier de données brutes issu du récepteur (ex. fichier RINEX)."),
        'epoques': ("Nombre d'époques", "Nombre d'époques (mesures successives) enregistrées durant la session."),
        'cadence': ("Cadence d'enregistrement", "Intervalle de temps entre deux époques enregistrées (ex. 15 s)."),
        'haut_ant_m': ("Hauteur d'antenne (m)",
                       "Hauteur de l'antenne au-dessus du repère du point, en mètres "
                       "(indispensable au calcul des coordonnées)."),
        'antenne': ("Modèle d'antenne", "Type / modèle de l'antenne GPS utilisée."),
        'ref_antenne': ("Référence / n° d'antenne", "Numéro de série ou référence de l'antenne utilisée."),
    },
    'RTLB': {
        'id': ID_ORD,
        'id_vec': ("Identifiant du vecteur", "Identifiant de la ligne de base (vecteur) traitée."),
        'de': ("Point de départ", "Point d'origine de la ligne de base (station de référence du vecteur)."),
        'vers': ("Point d'arrivée", "Point de destination de la ligne de base."),
        'solution': ("Type de solution",
                     "Type de solution du traitement (fixe / flottante) selon la résolution des "
                     "ambiguïtés entières de phase."),
        'heure_debut': ("Heure de début", "Heure de début de la session commune aux deux points du vecteur."),
        'heure_fin': ("Heure de fin", "Heure de fin de la session commune aux deux points du vecteur."),
        'duree': ("Durée", "Durée d'observation commune exploitée pour le vecteur (hh:mm:ss)."),
        'methode_terrain': ("Méthode terrain",
                            "Méthode d'observation terrain de la ligne de base (statique, statique rapide…)."),
        'longueur_m': ("Longueur du vecteur (m)", "Longueur 3D de la ligne de base, en mètres."),
        'rms_m': ("RMS (m)", "Erreur quadratique moyenne (RMS) du traitement du vecteur, en mètres."),
        'prec_horiz_m': ("Précision horizontale (m)", "Précision planimétrique estimée du vecteur, en mètres."),
        'prec_vert_m': ("Précision verticale (m)", "Précision altimétrique estimée du vecteur, en mètres."),
        'satellites': ("Nombre de satellites", "Nombre de satellites communs utilisés dans le traitement."),
        'nb_epoques': ("Nombre d'époques", "Nombre d'époques communes utilisées dans le traitement."),
        'delta_x_m': ("Composante ΔX (m)",
                      "Composante X du vecteur ligne de base (différence de coordonnées cartésiennes "
                      "géocentriques), en mètres."),
        'delta_y_m': ("Composante ΔY (m)",
                      "Composante Y du vecteur ligne de base (différence de coordonnées cartésiennes "
                      "géocentriques), en mètres."),
        'delta_z_m': ("Composante ΔZ (m)",
                      "Composante Z du vecteur ligne de base (différence de coordonnées cartésiennes "
                      "géocentriques), en mètres."),
    },
    'RFB': {
        'id': ID_ORD,
        'id_boucle': ("Identifiant de la boucle", "Identifiant de la boucle de vecteurs contrôlée."),
        'nom_boucle': ("Nom de la boucle",
                       "Désignation de la boucle : enchaînement de lignes de base formant un circuit fermé."),
        'longueur_3d_m': ("Longueur 3D (m)",
                          "Périmètre 3D total de la boucle (somme des longueurs des vecteurs), en mètres."),
        'delta_x_m': ("Fermeture ΔX (m)",
                      "Écart de fermeture de la boucle sur la composante X, en mètres (idéalement proche de 0)."),
        'delta_y_m': ("Fermeture ΔY (m)", "Écart de fermeture de la boucle sur la composante Y, en mètres."),
        'delta_z_m': ("Fermeture ΔZ (m)", "Écart de fermeture de la boucle sur la composante Z, en mètres."),
        'delta_h_m': ("Fermeture ΔH (m)", "Écart de fermeture planimétrique (horizontal) de la boucle, en mètres."),
        'delta_v_m': ("Fermeture ΔV (m)", "Écart de fermeture altimétrique (vertical) de la boucle, en mètres."),
        'ppm': ("Fermeture relative (ppm)",
                "Écart de fermeture relatif rapporté au périmètre de la boucle, en parties par million."),
        'delta_3d_m': ("Fermeture Δ3D (m)", "Écart de fermeture 3D total de la boucle, en mètres."),
        'tolerance_m': ("Tolérance (m)", "Tolérance maximale admissible pour la fermeture de la boucle, en mètres."),
        'tolerable': ("Dans la tolérance ?", "Indique si la fermeture de la boucle respecte la tolérance (Oui / Non)."),
    },
    # Déterminations brutes + version « écarts » (RDL/RDN ont les deux versions).
    'RDL': _merge(RDX, ECARTS),
    'RDN': _merge(RDX, ECARTS),
    'RDD': RDX,
    'RDIA': _merge(RDX, {'determination': DETERM}, ECARTS),
    'RDI': FIX_CALC,
    'RC': _merge(FIX_CALC, {
        'nom_point_fixe': ("Point ancien (fixe)",
                           "Nom du point ancien connu servant de contrôle (référence)."),
        'delta_x_m': ("Écart ΔX (m)",
                      "Écart sur X entre point calculé et point ancien, en mètres "
                      "(« -- » pour le point fixe de la détermination courante)."),
        'delta_y_m': ("Écart ΔY (m)",
                      "Écart sur Y entre point calculé et point ancien, en mètres "
                      "(« -- » pour le point fixe de la détermination courante)."),
    }),
}


def seed(apps, schema_editor):
    PieceFieldMeta = apps.get_model('pieces', 'PieceFieldMeta')
    for type_piece, fields in DESCRIPTIONS.items():
        for field_name, (tooltip, description) in fields.items():
            PieceFieldMeta.objects.update_or_create(
                type_piece=type_piece, field_name=field_name,
                defaults={'tooltip': tooltip[:255], 'description': description})


def unseed(apps, schema_editor):
    # Réversible sans risque : ne supprime QUE les couples semés (l'admin peut avoir
    # ajouté d'autres descriptions entre-temps, qu'on préserve).
    PieceFieldMeta = apps.get_model('pieces', 'PieceFieldMeta')
    for type_piece, fields in DESCRIPTIONS.items():
        PieceFieldMeta.objects.filter(type_piece=type_piece, field_name__in=list(fields)).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('pieces', '0011_piececustomfield'),
    ]

    operations = [
        migrations.RunPython(seed, unseed),
    ]
