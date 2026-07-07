# Migration de données : jeu de démonstration Projet → Propriété → Affaire → SSDGPS → Session
#
# Suit le même patron que accounts/migrations/0002_complete_rbac_and_super_admin.py :
# s'exécute automatiquement à chaque `migrate` (donc après réinitialisation de la BDD via
# run.ps1), et est idempotente (get_or_create sur les clés naturelles / contraintes uniques
# des modèles) — ne crée rien si les données existent déjà.
from django.db import migrations


DEMO_ORG_CODE = 'DEMO-PROJETS'
DEMO_PROJET_CODE = 'DEMO-SEED-01'


def seed_demo_data(apps, schema_editor):
    Organization = apps.get_model('accounts', 'Organization')
    Projet = apps.get_model('projects', 'Projet')
    Propriete = apps.get_model('projects', 'Propriete')
    Affaire = apps.get_model('projects', 'Affaire')
    Ssdgps = apps.get_model('projects', 'Ssdgps')
    Session = apps.get_model('projects', 'Session')

    organization, _ = Organization.objects.get_or_create(
        code=DEMO_ORG_CODE,
        defaults={
            'name': 'Organisation Démo — Projets SDGPS',
            'type': 'PRIVATE',
            'is_active': True,
            'is_test_data': True,
        },
    )

    projet, _ = Projet.objects.get_or_create(
        code_projet=DEMO_PROJET_CODE,
        defaults={
            'nom_projet': 'Démo — Densification & Levé cadastral Azilal',
            'description_projet': (
                "Projet de démonstration illustrant la hiérarchie "
                "Propriété → Affaire → SSDGPS → Session, avec des exemples "
                "couvrant les 4 natures de SSDGPS et les deux types de session."
            ),
            'organization': organization,
            'statut': 'en_cours',
        },
    )

    def get_or_create_propriete(nom, requisition=None, titre=None):
        propriete, _ = Propriete.objects.get_or_create(
            projet=projet, nom_propriete=nom,
            defaults={'id_requisition': requisition or '', 'id_titre': titre or ''},
        )
        return propriete

    def get_or_create_affaire(propriete, numero, procedure, nature, date_bornage=None):
        affaire, _ = Affaire.objects.get_or_create(
            propriete=propriete, numero_sd_affaire=numero,
            defaults={
                'nature_procedure_affaire': procedure,
                'nature_affaire': nature,
                'date_bornage': date_bornage,
            },
        )
        return affaire

    def get_or_create_ssdgps(affaire, numero, nature, type_ssdgps, sessions_dates):
        ssdgps, created = Ssdgps.objects.get_or_create(
            affaire=affaire, numero_ssdgps=numero,
            defaults={'nature_ssdgps': nature, 'type_ssdgps': type_ssdgps},
        )
        # Le signal d'auto-création de session (post_save sur le vrai modèle Ssdgps) ne se
        # déclenche pas ici : les modèles historiques des migrations ne sont pas connectés
        # aux signaux applicatifs. On crée donc les sessions explicitement.
        for i, date in enumerate(sessions_dates, start=1):
            Session.objects.get_or_create(
                ssdgps=ssdgps, numero_session=i,
                defaults={'date_session': date},
            )
        return ssdgps

    # --- Propriété 1 : « AMADLE 0 » — cas simple, procédure IFF, SSDGPS PDC mono-session ---
    p1 = get_or_create_propriete('AMADLE 0', requisition='R19000/55')
    a1 = get_or_create_affaire(p1, 1, 'IFF', 'BI', date_bornage='2023-04-09')
    get_or_create_ssdgps(a1, 1, 'PDC/GPS', 'mono-session', ['2023-04-09'])

    # --- Propriété 2 : « Ferme Toumliline » — procédure AS, SSDGPS DDC multi-session ---
    p2 = get_or_create_propriete('Ferme Toumliline', requisition='R20500/12')
    a2 = get_or_create_affaire(p2, 1, 'AS', 'MT', date_bornage='2024-01-15')
    get_or_create_ssdgps(a2, 1, 'DDC/GPS', 'multi-session', ['2024-01-15', '2024-01-16'])

    # --- Propriété 3 : « Domaine Sidi Baza » — identifiée par titre seul (pas de réquisition) ---
    p3 = get_or_create_propriete('Domaine Sidi Baza', titre='T08342/B')

    # SD 1 : procédure IFR → date_bornage non définie (règle métier)
    a3 = get_or_create_affaire(p3, 1, 'IFR', 'IFR', date_bornage=None)
    get_or_create_ssdgps(a3, 1, 'PLC/GPS', 'mono-session', ['2024-05-20'])

    # SD 2 : procédure spéciale forêt → date de recollement, SSDGPS DLC multi-session (3 sessions)
    a4 = get_or_create_affaire(p3, 2, 'PS_FORET', 'RB', date_bornage='2024-06-01')
    get_or_create_ssdgps(a4, 1, 'DLC/GPS', 'multi-session', ['2024-06-01', '2024-06-02', '2024-06-03'])


def remove_demo_data(apps, schema_editor):
    """Rollback : supprime le projet de démo (cascade sur toute la hiérarchie)."""
    Projet = apps.get_model('projects', 'Projet')
    Organization = apps.get_model('accounts', 'Organization')
    Projet.objects.filter(code_projet=DEMO_PROJET_CODE).delete()
    Organization.objects.filter(code=DEMO_ORG_CODE).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('projects', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(seed_demo_data, remove_demo_data),
    ]
