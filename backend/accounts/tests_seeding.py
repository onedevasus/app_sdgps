"""Tests de l'amorçage des données de référence (accounts.seeding.run_seed).

Le signal post_migrate est neutralisé pendant les tests (settings.TESTING) ; `run_seed()` est
donc appelé explicitement ici. La base de test contient déjà une baseline injectée par des
migrations de données (super-admin `.env`, organisations T-ORG…) : les tests vérifient donc
l'EXISTENCE des entités seedées et l'idempotence, sans s'appuyer sur des compteurs absolus.
"""
import os

from decouple import config
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase, override_settings

from accounts.models import Organization
from accounts.seeding import (
    run_seed, forbid_in_production, PREDEFINED_ORGANIZATIONS, PREDEFINED_ORGANISMES_N2,
)
from organismes.models import OrganismeNiveau1, OrganismeNiveau2

User = get_user_model()

APP_ADMIN1 = config('APP_ADMIN1_EMAIL', default='appadmin1@sdgps.ma')
APP_ADMIN2 = config('APP_ADMIN2_EMAIL', default='appadmin2@sdgps.ma')
SUPER_ADMIN = config('SUPER_ADMIN_EMAIL', default='admin@sdgps.com')


class RunSeedTests(TestCase):
    def test_super_admin_present_et_role_correct(self):
        run_seed()
        sa = User.objects.get(email=SUPER_ADMIN)
        self.assertTrue(sa.is_superuser)
        self.assertEqual(sa.get_primary_role(), 'ROLE_SUPER_ADMIN')

    def test_cree_deux_app_admins(self):
        run_seed()
        for email in (APP_ADMIN1, APP_ADMIN2):
            admin = User.objects.get(email=email)
            self.assertEqual(admin.platform_role, 'ROLE_ADMIN_SYSTEME')
            self.assertFalse(admin.is_superuser)
            self.assertTrue(admin.is_active)
            self.assertFalse(admin.must_change_password)

    def test_cree_organisations_predefinies_en_donnees_reelles(self):
        run_seed()
        for data in PREDEFINED_ORGANIZATIONS:
            org = Organization.all_objects.get(code=data['code'])
            # Données RÉELLES : is_test_data=False (visibles même en production).
            self.assertFalse(org.is_test_data)
            self.assertEqual(org.name, data['name'])
            self.assertEqual(org.type, data['type'])

    def test_cree_organismes_n1_et_n2(self):
        run_seed()
        n1 = OrganismeNiveau1.objects.get(code='ANCFCC')
        for data in PREDEFINED_ORGANISMES_N2:
            n2 = OrganismeNiveau2.objects.get(code=data['code'])
            self.assertEqual(n2.niveau1_id, n1.id)
            self.assertEqual(n2.ville, data['ville'])

    def test_idempotent(self):
        run_seed()
        second = run_seed()

        # Le second passage ne crée rien.
        self.assertEqual(second['users_created'], 0)
        self.assertEqual(second['organizations_created'], 0)
        self.assertEqual(second['organismes_created'], 0)

        # Aucun doublon : exactement une entrée par code/email après deux exécutions.
        for data in PREDEFINED_ORGANIZATIONS:
            self.assertEqual(Organization.all_objects.filter(code=data['code']).count(), 1)
        self.assertEqual(OrganismeNiveau1.objects.filter(code='ANCFCC').count(), 1)
        for email in (APP_ADMIN1, APP_ADMIN2):
            self.assertEqual(User.objects.filter(email=email).count(), 1)

    def test_respecte_surcharge_email_admin_app_via_environnement(self):
        custom_email = 'admin.app.custom@sdgps.ma'
        os.environ['APP_ADMIN1_EMAIL'] = custom_email
        try:
            run_seed()
            self.assertTrue(
                User.objects.filter(email=custom_email, platform_role='ROLE_ADMIN_SYSTEME').exists()
            )
        finally:
            del os.environ['APP_ADMIN1_EMAIL']

    def test_summary_retourne_les_compteurs(self):
        summary = run_seed()
        self.assertEqual(
            set(summary.keys()),
            {'users_created', 'organizations_created', 'organismes_created'},
        )
        # Premier passage : les 2 app-admins et les organisations/organismes prédéfinis créés.
        self.assertGreaterEqual(summary['users_created'], 2)
        self.assertEqual(summary['organizations_created'], len(PREDEFINED_ORGANIZATIONS))


class ProductionGuardTests(TestCase):
    """Garde-fou : les données de démo/test sont interdites en production."""

    @override_settings(ENVIRONMENT='development')
    def test_autorise_en_developpement(self):
        # N'émet aucune exception hors production.
        self.assertIsNone(forbid_in_production())

    @override_settings(ENVIRONMENT='production')
    def test_bloque_en_production(self):
        with self.assertRaises(CommandError):
            forbid_in_production()

    @override_settings(ENVIRONMENT='production')
    def test_commande_seed_demo_orgs_bloquee_en_production(self):
        with self.assertRaises(CommandError):
            call_command('seed_demo_orgs')

    @override_settings(ENVIRONMENT='production')
    def test_commande_seed_test_users_bloquee_en_production(self):
        with self.assertRaises(CommandError):
            call_command('seed_test_users')
