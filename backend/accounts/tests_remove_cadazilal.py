"""Tests de la migration 0026 (suppression de abderrazzak.cadazilal@gmail.com)."""
import importlib

from django.apps import apps as django_apps
from django.contrib.auth import get_user_model
from django.test import TestCase

User = get_user_model()

_mig = importlib.import_module('accounts.migrations.0026_remove_cadazilal_user')
remove_cadazilal_user = _mig.remove_cadazilal_user
EMAIL = 'abderrazzak.cadazilal@gmail.com'


class RemoveCadazilalTests(TestCase):
    def test_supprime_le_compte(self):
        User.objects.create_user(username=EMAIL, email=EMAIL, password='x')
        remove_cadazilal_user(django_apps, None)
        self.assertFalse(User.objects.filter(email=EMAIL).exists())

    def test_noop_si_absent(self):
        before = User.objects.count()
        remove_cadazilal_user(django_apps, None)
        self.assertEqual(User.objects.count(), before)

    def test_idempotent(self):
        User.objects.create_user(username=EMAIL, email=EMAIL, password='x')
        remove_cadazilal_user(django_apps, None)
        remove_cadazilal_user(django_apps, None)
        self.assertFalse(User.objects.filter(email=EMAIL).exists())
