# Migration de données : jeu de test volumineux pour les agents de démo
# (agent1@sdgps.ma / agent2@sdgps.ma / agent3@sdgps.ma).
#
# Pour chaque agent : 3-4 projets, chacun avec 3-4 propriétés, chacune avec 3-4 affaires,
# chacune avec 3-4 SSDGPS, chacun avec 1-4 sessions (1 pour mono-session, 2-4 pour
# multi-session — invariant métier respecté).
#
# S'exécute automatiquement à chaque `migrate` (donc après réinitialisation de la BDD),
# et est idempotente : les agents/organisations sont récupérés ou créés (get_or_create sur
# email/code), donc aucun doublon même si `seed_test_users` a déjà été lancé séparément ou
# si cette migration est rejouée sur une base déjà peuplée.
from datetime import date, timedelta

from django.db import migrations
from django.contrib.auth.hashers import make_password


ORGS_DATA = [
    {'code': 'T-ORG-A', 'name': 'Cabinet Tech & Innovation', 'legal_id': 'RC-11111-CAS', 'email': 'contact@tech-innovation.ma'},
    {'code': 'T-ORG-B', 'name': 'Fiduciaire Atlas Conseil', 'legal_id': 'RC-22222-RBA', 'email': 'contact@atlas-conseil.ma'},
    {'code': 'T-ORG-C', 'name': "Bureau d'Études Génie Civil", 'legal_id': 'RC-33333-MRK', 'email': 'contact@bet-geniecivil.ma'},
]

AGENTS_DATA = [
    {'email': 'agent1@sdgps.ma', 'first_name': 'Youssef', 'last_name': 'Idrissi', 'org_code': 'T-ORG-A', 'n_projets': 4},
    {'email': 'agent2@sdgps.ma', 'first_name': 'Fatima', 'last_name': 'Zahra', 'org_code': 'T-ORG-B', 'n_projets': 3},
    {'email': 'agent3@sdgps.ma', 'first_name': 'Omar', 'last_name': 'Saidi', 'org_code': 'T-ORG-C', 'n_projets': 4},
]

# Combinaisons (procédure, nature) valides — cf. accounts/../projects/validators.py
AFFAIRE_COMBOS = [
    ('IFF', 'BI'), ('IFF', 'BC'), ('IFE', 'IFE'), ('IFR', 'IFR'),
    ('PS_FORET', 'RB'), ('PS_COLLECTIF', 'RB'), ('PS_EXPROPRIATION', 'RB'),
    ('AS', 'MEC'), ('AS', 'MT'), ('AS', 'FS'), ('AS', 'MT-FS'), ('AS', 'LOT'), ('AS', 'COP'),
]
NO_DATE_BORNAGE_PROCEDURES = {'IFE', 'IFR'}

SSDGPS_NATURES = ['PDC/GPS', 'DDC/GPS', 'PLC/GPS', 'DLC/GPS']

PLACE_NAMES = [
    'Ferme Zaytoun', 'Domaine El Jadida', 'Lotissement Ennasr', 'Terrain Ait Melloul',
    'Propriété Bouznika', 'Verger Ouislane', 'Parcelle Skhirat', 'Domaine Ain Sebaa',
    'Ferme Sidi Yahya', 'Lotissement Tamesna', 'Terrain Dar Bouazza', 'Propriété Had Soualem',
]

BASE_DATE = date(2024, 1, 8)


def count_3_or_4(index):
    """Alterne 3 et 4 selon la parité de l'index (couvre la plage 3-4 demandée)."""
    return 4 if index % 2 == 0 else 3


def seed_agent_projects(apps, schema_editor):
    Organization = apps.get_model('accounts', 'Organization')
    CustomUser = apps.get_model('accounts', 'CustomUser')
    Membership = apps.get_model('accounts', 'Membership')
    Projet = apps.get_model('projects', 'Projet')
    Propriete = apps.get_model('projects', 'Propriete')
    Affaire = apps.get_model('projects', 'Affaire')
    Ssdgps = apps.get_model('projects', 'Ssdgps')
    Session = apps.get_model('projects', 'Session')

    # --- Organisations (idempotent : réutilise celles de seed_test_users si déjà créées) ---
    orgs = {}
    for data in ORGS_DATA:
        org, _ = Organization.objects.get_or_create(
            code=data['code'],
            defaults={
                'name': data['name'], 'type': 'PRIVATE', 'legal_id': data['legal_id'],
                'email': data['email'], 'is_active': True, 'is_test_data': True,
            },
        )
        orgs[data['code']] = org

    combo_i = 0     # index global pour cycler les combinaisons Affaire
    place_i = 0     # index global pour cycler les noms de propriétés
    day_offset = 0  # décalage de date pour varier les dates générées

    def next_combo():
        nonlocal combo_i
        combo = AFFAIRE_COMBOS[combo_i % len(AFFAIRE_COMBOS)]
        combo_i += 1
        return combo

    def next_place_name():
        nonlocal place_i
        name = PLACE_NAMES[place_i % len(PLACE_NAMES)]
        place_i += 1
        return f"{name} #{place_i}"

    def next_date():
        nonlocal day_offset
        day_offset += 3
        return BASE_DATE + timedelta(days=day_offset)

    for agent_data in AGENTS_DATA:
        organization = orgs[agent_data['org_code']]

        # --- Agent (idempotent : réutilise le compte de seed_test_users si déjà créé) ---
        agent, created = CustomUser.objects.get_or_create(
            email=agent_data['email'],
            defaults={
                'username': agent_data['email'],
                'password': make_password('Agent@2026'),
                'first_name': agent_data['first_name'],
                'last_name': agent_data['last_name'],
                'is_active': True,
                'must_change_password': False,
            },
        )
        Membership.objects.get_or_create(
            user=agent, organization=organization,
            defaults={'role': 'ROLE_ORGANISATION_AGENT', 'is_active': True},
        )

        n_projets = agent_data['n_projets']
        agent_prefix = agent_data['email'].split('@')[0].upper()  # ex. AGENT1

        for p_idx in range(1, n_projets + 1):
            projet, _ = Projet.objects.get_or_create(
                code_projet=f"{agent_prefix}-PRJ-{p_idx}",
                defaults={
                    'nom_projet': f"Projet {p_idx} — {agent_data['first_name']} {agent_data['last_name']}",
                    'description_projet': "Projet de test généré automatiquement (jeu de données de démonstration).",
                    'organization': organization,
                    'statut': 'en_cours',
                    'created_by': agent,
                },
            )

            n_proprietes = count_3_or_4(p_idx)
            for prop_idx in range(1, n_proprietes + 1):
                variant = (p_idx + prop_idx) % 3
                requisition = f"R{20000 + place_i}/{10 + (place_i % 90)}" if variant != 1 else ''
                titre = f"T{9000 + place_i}/{chr(65 + (place_i % 26))}" if variant != 0 else ''

                propriete, _ = Propriete.objects.get_or_create(
                    projet=projet, nom_propriete=next_place_name(),
                    defaults={
                        'id_requisition': requisition, 'id_titre': titre,
                        'created_by': agent,
                    },
                )

                n_affaires = count_3_or_4(prop_idx)
                for aff_idx in range(1, n_affaires + 1):
                    procedure, nature = next_combo()
                    date_bornage = None if procedure in NO_DATE_BORNAGE_PROCEDURES else next_date()

                    affaire, _ = Affaire.objects.get_or_create(
                        propriete=propriete, numero_sd_affaire=aff_idx,
                        defaults={
                            'nature_procedure_affaire': procedure,
                            'nature_affaire': nature,
                            'date_bornage': date_bornage,
                            'created_by': agent,
                        },
                    )

                    n_ssdgps = count_3_or_4(aff_idx)
                    for ssdgps_idx in range(1, n_ssdgps + 1):
                        nature_ssdgps = SSDGPS_NATURES[(aff_idx + ssdgps_idx) % len(SSDGPS_NATURES)]
                        is_mono = (ssdgps_idx % 2 == 1)
                        type_ssdgps = 'mono-session' if is_mono else 'multi-session'

                        ssdgps, _ = Ssdgps.objects.get_or_create(
                            affaire=affaire, numero_ssdgps=ssdgps_idx,
                            defaults={
                                'nature_ssdgps': nature_ssdgps,
                                'type_ssdgps': type_ssdgps,
                                'created_by': agent,
                            },
                        )

                        # Invariant métier : mono-session -> exactement 1 session ;
                        # multi-session -> 2 à 4 sessions (respecte la plage 1-4 demandée).
                        n_sessions = 1 if is_mono else (2 + (ssdgps_idx % 3))
                        for session_idx in range(1, n_sessions + 1):
                            Session.objects.get_or_create(
                                ssdgps=ssdgps, numero_session=session_idx,
                                defaults={'date_session': next_date(), 'created_by': agent},
                            )


def remove_agent_projects(apps, schema_editor):
    """Rollback : supprime les projets générés (cascade), laisse agents/organisations intacts."""
    Projet = apps.get_model('projects', 'Projet')
    prefixes = [a['email'].split('@')[0].upper() + '-PRJ-' for a in AGENTS_DATA]
    for prefix in prefixes:
        Projet.objects.filter(code_projet__startswith=prefix).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('projects', '0002_seed_demo_data'),
        ('accounts', '0019_alter_customuser_platform_role_alter_membership_role'),
    ]

    operations = [
        migrations.RunPython(seed_agent_projects, remove_agent_projects),
    ]
