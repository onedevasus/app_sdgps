"""Tests de la migration 0025 (suppression du super admin par défaut admin@sdgps.com)."""
import importlib

from django.apps import apps as django_apps
from django.contrib.auth import get_user_model
from django.test import TestCase

from accounts.models import Membership, Organization

User = get_user_model()

# Nom de module commençant par un chiffre → import via importlib.
_mig = importlib.import_module('accounts.migrations.0025_remove_default_super_admin')
remove_default_super_admin = _mig.remove_default_super_admin


class RemoveDefaultSuperAdminTests(TestCase):
    def _make_default_admin(self):
        admin = User.objects.create_user(
            username='admin@sdgps.com', email='admin@sdgps.com', password='x',
            is_superuser=True, is_staff=True,
        )
        org = Organization.all_objects.create(
            name='SDGPS Administration', code='SDGPSADMI-TEST', type='PUBLIC',
        )
        Membership.objects.create(user=admin, organization=org,
                                  role='ROLE_ORGANISATION_ADMIN')
        return admin, org

    def test_supprime_admin_par_defaut_et_son_org(self):
        # La base de test contient déjà un autre super admin (migration 0002).
        self.assertTrue(
            User.objects.filter(is_superuser=True).exclude(email='admin@sdgps.com').exists())
        _, org = self._make_default_admin()
        remove_default_super_admin(django_apps, None)
        self.assertFalse(User.objects.filter(email='admin@sdgps.com').exists())
        self.assertFalse(Organization.all_objects.filter(pk=org.pk).exists())

    def test_ne_supprime_pas_si_seul_super_admin(self):
        # Retire les autres super admins : admin@sdgps.com devient le seul → conservé (garde-fou).
        User.objects.filter(is_superuser=True).delete()
        _, org = self._make_default_admin()
        remove_default_super_admin(django_apps, None)
        self.assertTrue(User.objects.filter(email='admin@sdgps.com').exists())
        self.assertTrue(Organization.all_objects.filter(pk=org.pk).exists())

    def test_noop_si_admin_absent(self):
        before = User.objects.count()
        remove_default_super_admin(django_apps, None)
        self.assertEqual(User.objects.count(), before)

    def test_idempotent(self):
        self._make_default_admin()
        remove_default_super_admin(django_apps, None)
        # Second passage : plus rien à supprimer, aucune erreur.
        remove_default_super_admin(django_apps, None)
        self.assertFalse(User.objects.filter(email='admin@sdgps.com').exists())
