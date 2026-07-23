"""Tests de la migration 0025 (suppression du super admin par défaut admin@sdgps.com).

Indépendants de l'environnement : selon que `SUPER_ADMIN_EMAIL` est défini ou non, la migration
0002 crée le super admin de base sous `admin@sdgps.com` (défaut, cas CI) ou sous un autre email
(cas local avec .env). Les tests provisionnent donc explicitement leurs pré-conditions
(get_or_create) au lieu de supposer un baseline particulier.
"""
import importlib

from django.apps import apps as django_apps
from django.contrib.auth import get_user_model
from django.test import TestCase

from accounts.models import Membership, Organization

User = get_user_model()

_mig = importlib.import_module('accounts.migrations.0025_remove_default_super_admin')
remove_default_super_admin = _mig.remove_default_super_admin
DEFAULT_ADMIN_EMAIL = 'admin@sdgps.com'


class RemoveDefaultSuperAdminTests(TestCase):
    def _ensure_default_admin(self):
        admin, _ = User.objects.get_or_create(
            email=DEFAULT_ADMIN_EMAIL,
            defaults={'username': DEFAULT_ADMIN_EMAIL, 'is_superuser': True, 'is_staff': True})
        org, _ = Organization.all_objects.get_or_create(
            code='SDGPSADMI-TEST', defaults={'name': 'SDGPS Administration', 'type': 'PUBLIC'})
        Membership.objects.get_or_create(
            user=admin, organization=org, defaults={'role': 'ROLE_ORGANISATION_ADMIN'})
        return admin, org

    def _ensure_other_super_admin(self):
        User.objects.get_or_create(
            email='autre-super@sdgps.ma',
            defaults={'username': 'autre-super@sdgps.ma', 'is_superuser': True, 'is_staff': True})

    def test_supprime_admin_par_defaut_et_son_org(self):
        _, org = self._ensure_default_admin()
        self._ensure_other_super_admin()  # garantit un autre super admin (indépendant du baseline)
        remove_default_super_admin(django_apps, None)
        self.assertFalse(User.objects.filter(email=DEFAULT_ADMIN_EMAIL).exists())
        self.assertFalse(Organization.all_objects.filter(pk=org.pk).exists())

    def test_ne_supprime_pas_si_seul_super_admin(self):
        self._ensure_default_admin()
        # admin@sdgps.com devient le SEUL super admin → garde-fou : conservé.
        User.objects.filter(is_superuser=True).exclude(email=DEFAULT_ADMIN_EMAIL).delete()
        remove_default_super_admin(django_apps, None)
        self.assertTrue(User.objects.filter(email=DEFAULT_ADMIN_EMAIL).exists())

    def test_noop_si_admin_absent(self):
        User.objects.filter(email=DEFAULT_ADMIN_EMAIL).delete()
        before = User.objects.count()
        remove_default_super_admin(django_apps, None)
        self.assertEqual(User.objects.count(), before)

    def test_idempotent(self):
        self._ensure_default_admin()
        self._ensure_other_super_admin()
        remove_default_super_admin(django_apps, None)
        remove_default_super_admin(django_apps, None)
        self.assertFalse(User.objects.filter(email=DEFAULT_ADMIN_EMAIL).exists())
