"""Tests de la commande reset_db (réinitialisation gardée de la base).

La logique de CONFIRMATION GRADUÉE est le cœur de sécurité : on la teste à fond. `flush` et
`run_seed` sont mockés pour ne PAS vider la base de test et isoler la logique de garde.
"""
from unittest import mock

from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase, override_settings

_SUMMARY = {'users_created': 0, 'organizations_created': 0, 'organismes_created': 0}


def _run_reset(**kwargs):
    """Lance reset_db avec flush + run_seed mockés ; retourne les deux mocks."""
    with mock.patch('accounts.management.commands.reset_db.call_command') as flush_mock, \
         mock.patch('accounts.seeding.run_seed', return_value=_SUMMARY) as seed_mock:
        call_command('reset_db', **kwargs)
    return flush_mock, seed_mock


@override_settings(IS_PRODUCTION_LIKE=False, ENVIRONMENT='development')
class ResetDbDevStagingTests(TestCase):
    def test_refuse_sans_confirmation(self):
        with self.assertRaises(CommandError):
            call_command('reset_db')

    def test_ok_avec_yes(self):
        flush_mock, seed_mock = _run_reset(yes=True)
        flush_mock.assert_called_once()   # flush a bien été invoqué
        seed_mock.assert_called_once()    # re-seed a bien été invoqué

    @override_settings(ENVIRONMENT='staging')
    def test_staging_ok_avec_yes(self):
        _, seed_mock = _run_reset(yes=True)
        seed_mock.assert_called_once()


@override_settings(IS_PRODUCTION_LIKE=True, ENVIRONMENT='production')
class ResetDbProductionLikeTests(TestCase):
    def test_yes_seul_ne_suffit_pas(self):
        with self.assertRaises(CommandError):
            call_command('reset_db', yes=True)

    def test_refuse_mauvais_nom_environnement(self):
        with self.assertRaises(CommandError):
            call_command('reset_db', confirm_environment='staging')

    def test_refuse_sans_confirmation(self):
        with self.assertRaises(CommandError):
            call_command('reset_db')

    def test_ok_avec_nom_exact(self):
        flush_mock, seed_mock = _run_reset(confirm_environment='production')
        flush_mock.assert_called_once()
        seed_mock.assert_called_once()

    @override_settings(ENVIRONMENT='preprod')
    def test_preprod_exige_son_propre_nom(self):
        # Le nom d'un AUTRE environnement type production ne débloque pas preprod.
        with self.assertRaises(CommandError):
            call_command('reset_db', confirm_environment='production')
        flush_mock, seed_mock = _run_reset(confirm_environment='preprod')
        seed_mock.assert_called_once()
