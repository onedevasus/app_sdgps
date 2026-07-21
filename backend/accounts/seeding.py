"""Amorçage IDEMPOTENT des données de référence de la plateforme SDGPS.

Point unique de vérité des données injectées **automatiquement à chaque réinitialisation de
la base** (signal `post_migrate`, cf. `accounts/apps.py`) et manuellement via la commande
`python manage.py seed_initial_data`.

Les données proviennent d'un **fichier JSON externe** :
- par défaut, le fichier embarqué `accounts/seed_data/initial_data.json` ;
- surchargeable via la variable d'environnement `SEED_DATA_FILE` (chemin absolu), typiquement
  monté en volume Docker en production → on modifie la liste sans reconstruire l'image.

Contenu (données de RÉFÉRENCE réelles, `is_test_data=False` pour les organisations) :
- Utilisateurs : 1 super-admin + N admins d'application (`ROLE_ADMIN_SYSTEME`). Le fichier porte
  les IDENTITÉS (email, nom, rôle) ; les **mots de passe restent en variables d'environnement**
  (jamais dans le fichier). Un champ `<clé>_env` est prioritaire sur la valeur littérale
  `<clé>` si la variable d'environnement est définie.
- Organisations prédéfinies.
- Organismes premier niveau (ANCFCC) + deuxième niveau (services).

Tout est idempotent (`get_or_create` / `filter().exists()`).
"""
import json
import random
import string
from pathlib import Path

from decouple import config
from django.contrib.auth import get_user_model
from django.db import transaction

from accounts.models import Organization

User = get_user_model()

# Fichier de données par défaut (embarqué). Surchargé par la variable SEED_DATA_FILE.
DEFAULT_SEED_FILE = Path(__file__).resolve().parent / 'seed_data' / 'initial_data.json'


def load_seed_data():
    """Charge les données d'initialisation depuis SEED_DATA_FILE, sinon le fichier par défaut."""
    path = config('SEED_DATA_FILE', default='') or str(DEFAULT_SEED_FILE)
    with open(path, encoding='utf-8') as fh:
        return json.load(fh)


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


def _resolve(entry, key, default=''):
    """Résout un champ : variable d'environnement `<key>_env` si définie, sinon littéral `<key>`.

    Permet de garder les valeurs sensibles (mots de passe) hors du fichier tout en autorisant
    une surcharge par l'environnement des autres champs (ex. email de l'admin).
    """
    env_name = entry.get(f'{key}_env')
    if env_name:
        value = config(env_name, default='')
        if value:
            return value
    return entry.get(key, default)


def _seed_users(users, summary, log):
    """Crée les utilisateurs d'initialisation (idempotent par email).

    `role` : 'super_admin' (is_superuser) ou 'app_admin' (platform_role=ROLE_ADMIN_SYSTEME).
    """
    for entry in users:
        email = _resolve(entry, 'email')
        if not email:
            continue
        if User.objects.filter(email=email).exists():
            log(f"  Utilisateur déjà présent : {email}")
            continue

        role = entry.get('role')
        # Mot de passe : uniquement via l'environnement (password_env) ; généré si absent.
        password = _resolve(entry, 'password') or _generate_password()
        extra = {}
        if role == 'super_admin':
            extra.update(is_superuser=True, is_staff=True)
        elif role == 'app_admin':
            extra.update(platform_role='ROLE_ADMIN_SYSTEME')

        User.objects.create_user(
            username=email,
            email=email,
            password=password,
            first_name=entry.get('first_name', ''),
            last_name=entry.get('last_name', ''),
            is_active=True,
            must_change_password=False,
            **extra,
        )
        summary['users_created'] += 1
        log(f"  Utilisateur créé : {email} ({role})")


def _seed_organizations(organizations, summary, log):
    """Crée les organisations prédéfinies (données réelles, is_test_data=False)."""
    for data in organizations:
        # all_objects : contourne le filtrage is_test_data du manager par défaut.
        _, created = Organization.all_objects.get_or_create(
            code=data['code'],
            defaults={**data, 'is_test_data': False, 'created_by': None},
        )
        if created:
            summary['organizations_created'] += 1
        log(("  Créée" if created else "  Existante") + f" : organisation {data['code']}")


def _seed_organismes(niveau1, niveau2, summary, log):
    """Crée les organismes N1 puis les N2 rattachés (via `niveau1_code`)."""
    # Import local : évite un couplage d'import au chargement du module accounts.
    from organismes.models import OrganismeNiveau1, OrganismeNiveau2

    by_code = {}
    for data in niveau1:
        n1, created = OrganismeNiveau1.objects.get_or_create(
            code=data['code'],
            defaults={'nom': data['nom'], 'sigle': data.get('sigle', '')})
        by_code[data['code']] = n1
        if created:
            summary['organismes_created'] += 1
        log(("  Créé" if created else "  Existant") + f" : organisme N1 {data['code']}")

    for data in niveau2:
        n1 = by_code.get(data['niveau1_code'])
        if n1 is None:
            # Le N1 référencé n'est pas dans le fichier : on le rattache s'il existe déjà en base.
            n1 = OrganismeNiveau1.objects.filter(code=data['niveau1_code']).first()
        if n1 is None:
            log(f"  Ignoré : organisme N2 {data['code']} (N1 {data['niveau1_code']} introuvable)")
            continue
        _, created = OrganismeNiveau2.objects.get_or_create(
            code=data['code'],
            defaults={'nom': data['nom'], 'ville': data.get('ville', ''), 'niveau1': n1})
        if created:
            summary['organismes_created'] += 1
        log(("  Créé" if created else "  Existant") + f" : organisme N2 {data['code']}")


@transaction.atomic
def run_seed(stdout=None, data=None):
    """Injecte l'ensemble des données de référence (idempotent).

    `data` (optionnel) : dict déjà chargé ; sinon lu via load_seed_data() (SEED_DATA_FILE ou
    fichier par défaut). Retourne {users_created, organizations_created, organismes_created}.
    """
    if data is None:
        data = load_seed_data()

    summary = {'users_created': 0, 'organizations_created': 0, 'organismes_created': 0}

    def log(message):
        if stdout is not None:
            stdout.write(message)

    log("Amorçage des données de référence SDGPS…")
    _seed_users(data.get('users', []), summary, log)
    _seed_organizations(data.get('organizations', []), summary, log)
    _seed_organismes(
        data.get('organismes_niveau1', []), data.get('organismes_niveau2', []), summary, log)
    log(
        f"Terminé : {summary['users_created']} utilisateur(s), "
        f"{summary['organizations_created']} organisation(s), "
        f"{summary['organismes_created']} organisme(s) créés."
    )
    return summary
