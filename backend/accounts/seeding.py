"""Amorçage IDEMPOTENT des données de référence de la plateforme SDGPS.

Ce module est le point unique de vérité des données injectées **automatiquement à chaque
réinitialisation de la base** (via le signal `post_migrate`, cf. `accounts/apps.py`) et
manuellement via la commande `python manage.py seed_initial_data`.

Il crée des données de RÉFÉRENCE réelles (`is_test_data=False` pour les organisations, donc
visibles même en `ENVIRONMENT=production`) :
- Utilisateurs : 1 super-admin + 2 admins d'application (`ROLE_ADMIN_SYSTEME`), identifiants
  lus depuis l'environnement (valeurs de repli fournies).
- Organisations prédéfinies (liste curée ci-dessous).
- Organismes premier niveau (ANCFCC) + deuxième niveau (services provinciaux).

Toutes les opérations sont idempotentes (`get_or_create` / `filter(...).exists()`) : lancer
le seed plusieurs fois ne crée aucun doublon.
"""
import random
import string

from decouple import config
from django.contrib.auth import get_user_model
from django.db import transaction

from accounts.models import Organization

User = get_user_model()


# ---------------------------------------------------------------------------
# Organisations prédéfinies (données RÉELLES de référence : is_test_data=False).
# Liste curée — à ajuster selon les besoins métier. Le `code` sert de clé d'idempotence.
# ---------------------------------------------------------------------------
PREDEFINED_ORGANIZATIONS = [
    {
        'code': 'ANCFCC-SIEGE',
        'name': "Agence Nationale de la Conservation Foncière du Cadastre et de la Cartographie",
        'type': 'PUBLIC',
        'legal_id': 'Loi n° 58-00',
        'address': 'Avenue Al Araar, Hay Riad, Rabat 10100',
        'phone': '+212 5 37 57 22 00',
        'email': 'contact@ancfcc.gov.ma',
        'website': 'https://www.ancfcc.gov.ma',
        'is_active': True,
    },
    {
        'code': 'DRC-RABAT',
        'name': "Direction Régionale de la Conservation Foncière de Rabat",
        'type': 'PUBLIC',
        'legal_id': 'Décret n° 2-97-359',
        'address': 'Avenue Mohammed V, Rabat 10000',
        'phone': '+212 5 37 70 10 20',
        'email': 'dr.rabat@ancfcc.gov.ma',
        'website': 'https://www.ancfcc.gov.ma',
        'is_active': True,
    },
    {
        'code': 'DRC-CASA',
        'name': "Direction Régionale de la Conservation Foncière de Casablanca",
        'type': 'PUBLIC',
        'legal_id': 'Décret n° 2-97-359',
        'address': 'Boulevard Zerktouni, Casablanca 20000',
        'phone': '+212 5 22 26 10 20',
        'email': 'dr.casablanca@ancfcc.gov.ma',
        'website': 'https://www.ancfcc.gov.ma',
        'is_active': True,
    },
    {
        'code': 'CAB-GEOTOP',
        'name': "Cabinet de Géomètre-Topographe Géotop",
        'type': 'PRIVATE',
        'legal_id': 'RC-45231-RBA',
        'address': '12 Avenue Fal Ould Oumeir, Agdal, Rabat 10080',
        'phone': '+212 5 37 68 45 12',
        'email': 'contact@geotop.ma',
        'website': 'https://www.geotop.ma',
        'is_active': True,
    },
    {
        'code': 'CAB-TOPOPLAN',
        'name': "Cabinet TopoPlan Ingénierie",
        'type': 'PRIVATE',
        'legal_id': 'RC-67123-CAS',
        'address': '34 Rue Ibn Batouta, Maârif, Casablanca 20100',
        'phone': '+212 5 22 99 33 44',
        'email': 'contact@topoplan.ma',
        'website': 'https://www.topoplan.ma',
        'is_active': True,
    },
]


# ---------------------------------------------------------------------------
# Organismes (en-tête des rapports) — repris de la commande seed_organismes.
# ---------------------------------------------------------------------------
ANCFCC_NOM = ("AGENCE NATIONALE DE LA CONSERVATION FONCIÈRE "
              "DU CADASTRE ET DE LA CARTOGRAPHIE")

PREDEFINED_ORGANISMES_N2 = [
    {'code': 'SCA-AZILAL', 'nom': "Service du cadastre d'Azilal", 'ville': 'Azilal'},
    {'code': 'SCA-RABAT', 'nom': "Service du cadastre de Rabat", 'ville': 'Rabat'},
    {'code': 'SCA-CASA', 'nom': "Service du cadastre de Casablanca", 'ville': 'Casablanca'},
]


def forbid_in_production():
    """Interdit l'exécution d'une commande de données de démo/test en production.

    Les données d'initialisation (super-admin, admins app, organisations & organismes
    prédéfinis) sont seedées PARTOUT via run_seed(). En revanche les données de démo/test
    (`is_test_data=True`) ne doivent JAMAIS être injectées en production : ce garde-fou est
    appelé en tête des commandes correspondantes (seed_demo_orgs, generate_test_data,
    seed_test_users).
    """
    from django.conf import settings
    from django.core.management.base import CommandError

    if getattr(settings, 'ENVIRONMENT', 'development') == 'production':
        raise CommandError(
            "Commande de données de démo/test interdite en production "
            "(ENVIRONMENT=production). Seules les données d'initialisation y sont autorisées."
        )


def _generate_password(length=16):
    """Génère un mot de passe aléatoire (utilisé si aucun mot de passe n'est fourni)."""
    alphabet = string.ascii_letters + string.digits + '!@#$%^&*'
    return ''.join(random.choices(alphabet, k=length))


def _seed_users(summary, log):
    """Crée le super-admin + 2 admins d'application (idempotent par email)."""
    # --- Super-admin ---
    sa_email = config('SUPER_ADMIN_EMAIL', default='admin@sdgps.com')
    if not User.objects.filter(email=sa_email).exists():
        sa_password = config('SUPER_ADMIN_PASSWORD', default='') or _generate_password()
        User.objects.create_user(
            username=sa_email,
            email=sa_email,
            password=sa_password,
            first_name='Super',
            last_name='Admin',
            is_superuser=True,
            is_staff=True,
            is_active=True,
            must_change_password=False,
        )
        summary['users_created'] += 1
        log(f"  Super-admin créé : {sa_email}")
    else:
        log(f"  Super-admin déjà présent : {sa_email}")

    # --- 2 admins d'application (ROLE_ADMIN_SYSTEME) ---
    app_admins = [
        {
            'email': config('APP_ADMIN1_EMAIL', default='appadmin1@sdgps.ma'),
            'password': config('APP_ADMIN1_PASSWORD', default='AppAdmin@2026'),
            'first_name': 'Admin', 'last_name': 'App 1',
        },
        {
            'email': config('APP_ADMIN2_EMAIL', default='appadmin2@sdgps.ma'),
            'password': config('APP_ADMIN2_PASSWORD', default='AppAdmin@2026'),
            'first_name': 'Admin', 'last_name': 'App 2',
        },
    ]
    for data in app_admins:
        if User.objects.filter(email=data['email']).exists():
            log(f"  Admin app déjà présent : {data['email']}")
            continue
        User.objects.create_user(
            username=data['email'],
            email=data['email'],
            password=data['password'],
            first_name=data['first_name'],
            last_name=data['last_name'],
            platform_role='ROLE_ADMIN_SYSTEME',
            is_active=True,
            must_change_password=False,
        )
        summary['users_created'] += 1
        log(f"  Admin app créé : {data['email']}")


def _seed_organizations(summary, log):
    """Crée les organisations prédéfinies (données réelles, is_test_data=False)."""
    for data in PREDEFINED_ORGANIZATIONS:
        # all_objects : contourne le filtrage is_test_data du manager par défaut.
        _, created = Organization.all_objects.get_or_create(
            code=data['code'],
            defaults={**data, 'is_test_data': False, 'created_by': None},
        )
        if created:
            summary['organizations_created'] += 1
        log(("  Créée" if created else "  Existante") + f" : organisation {data['code']}")


def _seed_organismes(summary, log):
    """Crée l'organisme N1 (ANCFCC) + les organismes N2 rattachés."""
    # Import local : évite un couplage d'import au chargement du module accounts.
    from organismes.models import OrganismeNiveau1, OrganismeNiveau2

    n1, created = OrganismeNiveau1.objects.get_or_create(
        code='ANCFCC', defaults={'nom': ANCFCC_NOM, 'sigle': 'ANCFCC'})
    if created:
        summary['organismes_created'] += 1
    log(("  Créé" if created else "  Existant") + f" : organisme N1 {n1.code}")

    for data in PREDEFINED_ORGANISMES_N2:
        _, created = OrganismeNiveau2.objects.get_or_create(
            code=data['code'],
            defaults={'nom': data['nom'], 'ville': data['ville'], 'niveau1': n1})
        if created:
            summary['organismes_created'] += 1
        log(("  Créé" if created else "  Existant") + f" : organisme N2 {data['code']}")


@transaction.atomic
def run_seed(stdout=None):
    """Injecte l'ensemble des données de référence (idempotent).

    Retourne un dict de compteurs : {users_created, organizations_created, organismes_created}.
    `stdout` (optionnel) : flux d'écriture (ex. celui d'une commande de management).
    """
    summary = {'users_created': 0, 'organizations_created': 0, 'organismes_created': 0}

    def log(message):
        if stdout is not None:
            stdout.write(message)

    log("Amorçage des données de référence SDGPS…")
    _seed_users(summary, log)
    _seed_organizations(summary, log)
    _seed_organismes(summary, log)
    log(
        f"Terminé : {summary['users_created']} utilisateur(s), "
        f"{summary['organizations_created']} organisation(s), "
        f"{summary['organismes_created']} organisme(s) créés."
    )
    return summary
