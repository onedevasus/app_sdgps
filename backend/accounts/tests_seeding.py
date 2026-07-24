"""Tests de l'amorçage des données de référence (accounts.seeding.run_seed).

Le signal post_migrate est neutralisé pendant les tests (settings.TESTING) ; `run_seed()` est
donc appelé explicitement ici. Les attentes sont dérivées du fichier de seed
(`accounts/seed_data/initial_data.json`) pour rester alignées si son contenu évolue. La base de
test contient déjà une baseline injectée par des migrations de données : les tests vérifient
donc l'EXISTENCE des entités seedées et l'idempotence, sans compteurs absolus.
"""
import json
import os
import tempfile

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase, override_settings

from accounts.models import Organization, Membership
from accounts.seeding import run_seed, load_seed_data, _resolve
from organismes.models import OrganismeNiveau1, OrganismeNiveau2

User = get_user_model()

SEED_DATA = load_seed_data()


class RunSeedTests(TestCase):
    def test_cree_tous_les_utilisateurs_du_fichier(self):
        run_seed()
        for entry in SEED_DATA['users']:
            email = _resolve(entry, 'email')
            self.assertTrue(User.objects.filter(email=email).exists(), f"manquant : {email}")

    def test_super_admin_role_correct(self):
        run_seed()
        for entry in SEED_DATA['users']:
            if entry.get('is_superuser'):
                sa = User.objects.get(email=_resolve(entry, 'email'))
                self.assertTrue(sa.is_superuser)
                self.assertEqual(sa.get_primary_role(), 'ROLE_SUPER_ADMIN')

    def test_super_admin_identite_et_org_depuis_le_fichier(self):
        """Le super admin vient UNIQUEMENT du fichier (la migration 0002 ne le crée plus) : son
        nom est celui du fichier, et il n'a d'organisation que si le fichier lui en attribue une
        (ici aucune → aucun membership)."""
        run_seed()
        entry = next(u for u in SEED_DATA['users'] if u.get('is_superuser'))
        sa = User.objects.get(email=_resolve(entry, 'email'))
        self.assertEqual(sa.first_name, entry.get('first_name', ''))
        self.assertEqual(sa.last_name, entry.get('last_name', ''))
        self.assertEqual(
            Membership.objects.filter(user=sa).count(), len(entry.get('memberships', [])))

    def test_adhesions_des_utilisateurs(self):
        run_seed()
        for entry in SEED_DATA['users']:
            memberships = entry.get('memberships', [])
            if not memberships:
                continue
            user = User.objects.get(email=_resolve(entry, 'email'))
            for m in memberships:
                org = Organization.all_objects.filter(code=m['organization_code']).first()
                self.assertIsNotNone(org, f"org {m['organization_code']} absente")
                self.assertTrue(
                    Membership.objects.filter(user=user, organization=org).exists(),
                    f"adhésion manquante : {user.email} → {m['organization_code']}",
                )

    def test_cree_toutes_les_organisations_en_preservant_is_test_data(self):
        run_seed()
        for data in SEED_DATA['organizations']:
            org = Organization.all_objects.get(code=data['code'])
            self.assertEqual(org.is_test_data, data.get('is_test_data', False), org.code)
            self.assertEqual(org.name, data['name'])

    def test_cree_organismes_n1_et_n2(self):
        run_seed()
        for data in SEED_DATA['organismes_niveau1']:
            self.assertTrue(OrganismeNiveau1.objects.filter(code=data['code']).exists())
        for data in SEED_DATA['organismes_niveau2']:
            n2 = OrganismeNiveau2.objects.get(code=data['code'])
            self.assertEqual(n2.niveau1.code, data['niveau1_code'])

    def test_seed_admins_systeme_et_org(self):
        run_seed()
        for email in ('appadmin1@sdgps.ma', 'appadmin2@sdgps.ma'):
            self.assertEqual(User.objects.get(email=email).platform_role,
                             'ROLE_ADMIN_SYSTEME', email)
        expected = {'orgadmin1@sdgps.ma': 'SC-AZILAL', 'orgadmin2@sdgps.ma': 'SC-HAOUZ',
                    'orgadmin3@sdgps.ma': 'ITKANTOPO-V2'}
        for email, code in expected.items():
            user = User.objects.get(email=email)
            org = Organization.all_objects.get(code=code)
            membership = Membership.objects.get(user=user, organization=org)
            self.assertEqual(membership.role, 'ROLE_ORGANISATION_ADMIN', email)

    def test_cadazilal_pas_dans_le_seed(self):
        run_seed()
        self.assertFalse(
            User.objects.filter(email='abderrazzak.cadazilal@gmail.com').exists())

    def test_idempotent(self):
        run_seed()
        second = run_seed()
        self.assertEqual(second['users_created'], 0)
        self.assertEqual(second['organizations_created'], 0)
        self.assertEqual(second['organismes_created'], 0)
        # Aucun doublon : une seule entrée par code/email.
        for data in SEED_DATA['organizations']:
            self.assertEqual(Organization.all_objects.filter(code=data['code']).count(), 1)
        for entry in SEED_DATA['users']:
            self.assertEqual(User.objects.filter(email=_resolve(entry, 'email')).count(), 1)

    def test_summary_retourne_les_compteurs(self):
        summary = run_seed()
        # Les compteurs de référence sont toujours présents ; le seed métier ajoute ses
        # propres compteurs (projets_created, …, media_copied) quand des données métier
        # sont embarquées.
        self.assertLessEqual(
            {'users_created', 'organizations_created', 'organismes_created'},
            set(summary.keys()),
        )

    def test_charge_donnees_depuis_fichier_externe(self):
        """SEED_DATA_FILE surcharge le fichier par défaut."""
        payload = {
            'users': [],
            'organizations': [{
                'code': 'EXT-ORG-1', 'name': 'Organisation externe', 'type': 'PRIVATE',
                'is_active': True, 'is_test_data': False,
            }],
            'organismes_niveau1': [{'code': 'EXT-N1', 'nom': 'Organisme externe', 'sigle': 'EXT'}],
            'organismes_niveau2': [{
                'code': 'EXT-N2', 'nom': 'Service externe', 'ville': 'Rabat', 'niveau1_code': 'EXT-N1',
            }],
        }
        fd, path = tempfile.mkstemp(suffix='.json')
        os.close(fd)
        os.environ['SEED_DATA_FILE'] = path
        try:
            with open(path, 'w', encoding='utf-8') as fh:
                json.dump(payload, fh)
            run_seed()
            org = Organization.all_objects.get(code='EXT-ORG-1')
            self.assertFalse(org.is_test_data)
            self.assertTrue(OrganismeNiveau1.objects.filter(code='EXT-N1').exists())
            n2 = OrganismeNiveau2.objects.get(code='EXT-N2')
            self.assertEqual(n2.niveau1.code, 'EXT-N1')
        finally:
            del os.environ['SEED_DATA_FILE']
            os.remove(path)


class PasswordSyncTests(TestCase):
    """Synchronisation du mot de passe des comptes de référence depuis l'environnement."""

    ENTRY = {'email': 'refacct@sdgps.ma', 'password_env': 'TEST_SEED_PW',
             'first_name': 'Ref', 'last_name': 'Acct'}
    DATA = {'users': [ENTRY], 'organizations': [], 'organismes_niveau1': [],
            'organismes_niveau2': []}

    def _run(self):
        return run_seed(data=self.DATA, business_data={})

    def test_synchronise_le_mot_de_passe_dun_compte_existant(self):
        User.objects.create_user(username=self.ENTRY['email'], email=self.ENTRY['email'],
                                 password='AncienMDP@1')
        os.environ['TEST_SEED_PW'] = 'NouveauMDP@2026'
        try:
            summary = self._run()
        finally:
            del os.environ['TEST_SEED_PW']
        user = User.objects.get(email=self.ENTRY['email'])
        self.assertTrue(user.check_password('NouveauMDP@2026'))
        self.assertEqual(summary.get('passwords_synced', 0), 1)

    def test_pas_de_sync_si_aucun_mot_de_passe_fourni(self):
        User.objects.create_user(username=self.ENTRY['email'], email=self.ENTRY['email'],
                                 password='Garde@1')
        # TEST_SEED_PW non défini → resolved_pw vide → aucune modification.
        summary = self._run()
        user = User.objects.get(email=self.ENTRY['email'])
        self.assertTrue(user.check_password('Garde@1'))
        self.assertEqual(summary.get('passwords_synced', 0), 0)

    def test_sync_idempotent(self):
        User.objects.create_user(username=self.ENTRY['email'], email=self.ENTRY['email'],
                                 password='AncienMDP@1')
        os.environ['TEST_SEED_PW'] = 'MDP@2026'
        try:
            first = self._run()
            second = self._run()
        finally:
            del os.environ['TEST_SEED_PW']
        self.assertEqual(first.get('passwords_synced', 0), 1)
        self.assertEqual(second.get('passwords_synced', 0), 0)


class TestDataCommandsRemovedTests(TestCase):
    """Les commandes de génération de données de démo/test ont été SUPPRIMÉES : plus aucune
    donnée de test n'est générable, dans aucun environnement. Seules les données
    d'initialisation (initial_data.json) sont utilisées."""

    def test_commandes_de_test_absentes(self):
        for name in ('seed_demo_orgs', 'generate_test_data', 'seed_test_users'):
            with self.assertRaises(CommandError, msg=f"{name} devrait être introuvable"):
                call_command(name)


class NoTestDataFromMigrationsTests(TestCase):
    """Après application des migrations (baseline de la base de test), AUCUNE donnée de démo/test
    n'est présente : les migrations `projects.0002/0003` ont été neutralisées (no-op) et aucune
    autre migration ne génère de données `is_test_data=True`. Garantit l'objectif « aucune donnée
    de test dans aucun environnement »."""

    def test_aucune_organisation_is_test_data_dans_la_baseline(self):
        self.assertEqual(Organization.all_objects.filter(is_test_data=True).count(), 0)

    def test_aucune_org_ni_compte_de_demo(self):
        for code in ('DEMO-PROJETS', 'T-ORG-A', 'T-ORG-B', 'T-ORG-C'):
            self.assertFalse(Organization.all_objects.filter(code=code).exists(), code)
        for email in ('agent1@sdgps.ma', 'agent2@sdgps.ma', 'agent3@sdgps.ma'):
            self.assertFalse(User.objects.filter(email=email).exists(), email)


class EnvironmentStrategyTests(TestCase):
    """Stratégie des environnements progressifs (development → staging → preprod → production)."""

    def test_classification_des_environnements(self):
        from django.conf import settings
        # Bases PostgreSQL dédiées côté serveur ; SQLite en dev local.
        self.assertEqual(settings.SERVER_ENVIRONMENTS, ('staging', 'preprod', 'production'))
        # Données de démo/test masquées en preprod + production.
        self.assertEqual(settings.PRODUCTION_LIKE_ENVIRONMENTS, ('preprod', 'production'))
