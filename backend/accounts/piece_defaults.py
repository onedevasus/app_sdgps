"""Configuration de tri par défaut des tableaux de pièces.

SOURCE de vérité : la configuration de tri du compte SUPER ADMIN (page
« /admin/profile/parametres/tri-pieces »). Elle sert :
- de valeur par défaut du champ CustomUser.piece_sort_config (tout compte nouvellement créé
  hérite, à sa création, de la configuration courante du super admin) ;
- de graine pour les comptes existants SANS configuration (commande de management
  `seed_piece_sort_config`).

`DEFAULT_PIECE_SORT_CONFIG` est un REPLI figé (dernière valeur connue, initialement copiée
depuis « agent1@sdgps.ma »), utilisé uniquement quand aucun super admin n'existe encore ou
que sa configuration est vide (ex. tout premier `createsuperuser`). Ce nom reste importé par
la migration accounts.0022 : ne pas le renommer.

Forme : { '<TYPE_PIECE>': [ {'field': .., 'dir': 'asc'|'desc'}, .. ]
          | {'brut': [..], 'ecarts': [..]} }  (cf. CustomUser.piece_sort_config).
"""
import copy

DEFAULT_PIECE_SORT_CONFIG = {
    "LPA": [
        {
            "field": "nom_point",
            "dir": "asc"
        },
        {
            "field": "reference",
            "dir": "asc"
        },
        {
            "field": "nature_materialisation",
            "dir": "asc"
        },
        {
            "field": "nature_signalisation",
            "dir": "asc"
        }
    ],
    "PPA": [
        {
            "field": "nom_point",
            "dir": "asc"
        },
        {
            "field": "date_visite",
            "dir": "asc"
        },
        {
            "field": "zone_projection",
            "dir": "asc"
        },
        {
            "field": "systeme_projection",
            "dir": "asc"
        }
    ],
    "PPN": [
        {
            "field": "nom_point",
            "dir": "asc"
        },
        {
            "field": "date_visite",
            "dir": "asc"
        },
        {
            "field": "zone_projection",
            "dir": "asc"
        },
        {
            "field": "systeme_projection",
            "dir": "asc"
        }
    ],
    "ROB": [
        {
            "field": "point",
            "dir": "asc"
        },
        {
            "field": "heure_debut",
            "dir": "asc"
        },
        {
            "field": "duree",
            "dir": "asc"
        },
        {
            "field": "type",
            "dir": "asc"
        }
    ],
    "RTLB": [
        {
            "field": "id_vec",
            "dir": "asc"
        },
        {
            "field": "duree",
            "dir": "desc"
        },
        {
            "field": "longueur_m",
            "dir": "desc"
        },
        {
            "field": "heure_debut",
            "dir": "asc"
        }
    ],
    "RFB": [
        {
            "field": "delta_3d_m",
            "dir": "desc"
        },
        {
            "field": "longueur_3d_m",
            "dir": "asc"
        },
        {
            "field": "tolerance_m",
            "dir": "asc"
        }
    ],
    "RDL": {
        "brut": [
            {
                "field": "nom_point",
                "dir": "asc"
            }
        ],
        "ecarts": [
            {
                "field": "nom_point_calcule",
                "dir": "asc"
            },
            {
                "field": "delta_d_m",
                "dir": "desc"
            }
        ]
    },
    "RDN": {
        "brut": [
            {
                "field": "nom_point",
                "dir": "asc"
            }
        ],
        "ecarts": [
            {
                "field": "nom_point_fixe",
                "dir": "asc"
            },
            {
                "field": "nom_point_calcule",
                "dir": "asc"
            },
            {
                "field": "delta_d_m",
                "dir": "desc"
            }
        ]
    },
    "RDIA": {
        "brut": [
            {
                "field": "determination",
                "dir": "asc"
            },
            {
                "field": "nom_point",
                "dir": "asc"
            }
        ],
        "ecarts": [
            {
                "field": "determination",
                "dir": "asc"
            },
            {
                "field": "nom_point_fixe",
                "dir": "asc"
            },
            {
                "field": "nom_point_calcule",
                "dir": "asc"
            },
            {
                "field": "delta_d_m",
                "dir": "desc"
            }
        ]
    },
    "RDI": [
        {
            "field": "nom_point_fixe",
            "dir": "asc"
        },
        {
            "field": "nom_point_calcule",
            "dir": "asc"
        },
        {
            "field": "delta_d_m",
            "dir": "desc"
        }
    ],
    "RDD": [
        {
            "field": "nom_point",
            "dir": "asc"
        }
    ],
    "RC": [
        {
            "field": "nom_point_fixe",
            "dir": "asc"
        },
        {
            "field": "nom_point_calcule",
            "dir": "asc"
        },
        {
            "field": "delta_d_m",
            "dir": "desc"
        }
    ]
}


def superadmin_piece_sort_config():
    """Configuration de tri du compte super admin de référence, ou `None` si indisponible
    (aucun super admin, ou configuration vide). Choix déterministe : le super admin le plus
    ancien (par date d'inscription puis email)."""
    from django.contrib.auth import get_user_model
    User = get_user_model()
    admin = (User.objects.filter(is_superuser=True)
             .order_by('date_joined', 'email').first())
    cfg = getattr(admin, 'piece_sort_config', None) if admin else None
    return cfg or None


def default_piece_sort_config():
    """Valeur par défaut du champ `piece_sort_config` (copie profonde : jamais l'objet partagé).

    Source = configuration courante du super admin ; à défaut (pas encore de super admin, ou
    configuration vide), repli sur `DEFAULT_PIECE_SORT_CONFIG`. Invoquée à la création d'un
    compte (create_user / inscription / admin / seeds) quand le champ n'est pas fourni."""
    cfg = superadmin_piece_sort_config()
    return copy.deepcopy(cfg if cfg else DEFAULT_PIECE_SORT_CONFIG)


def superadmin_piece_fields_config():
    """Configuration des CHAMPS (colonnes) du compte super admin de référence, ou `None` si
    indisponible (aucun super admin, ou configuration vide). Choix déterministe : le super
    admin le plus ancien (par date d'inscription puis email). Calqué sur
    `superadmin_piece_sort_config`."""
    from django.contrib.auth import get_user_model
    User = get_user_model()
    admin = (User.objects.filter(is_superuser=True)
             .order_by('date_joined', 'email').first())
    cfg = getattr(admin, 'piece_fields_config', None) if admin else None
    return cfg or None


def default_piece_fields_config():
    """Valeur par défaut du champ `piece_fields_config` (copie profonde : jamais l'objet partagé).

    Source = configuration de colonnes courante du super admin ; à défaut (pas encore de super
    admin, ou configuration vide), repli sur `{}` (config vide = toutes les colonnes, ordre du
    catalogue). Invoquée à la création d'un compte quand le champ n'est pas fourni."""
    cfg = superadmin_piece_fields_config()
    return copy.deepcopy(cfg) if cfg else {}
