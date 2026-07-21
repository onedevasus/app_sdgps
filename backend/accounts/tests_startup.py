"""Tests de la commande de démarrage `wait_for_db` (durcissement production)."""
from unittest import mock

from django.core.management import call_command
from django.core.management.base import CommandError
from django.db import connections
from django.db.utils import OperationalError
from django.test import SimpleTestCase


class WaitForDbTests(SimpleTestCase):
    def test_succes_immediat(self):
        conn = connections['default']
        with mock.patch.object(conn, 'ensure_connection') as ensure:
            with mock.patch('time.sleep') as sleep:
                call_command('wait_for_db')
        ensure.assert_called_once()
        sleep.assert_not_called()

    def test_reprise_apres_indisponibilite(self):
        conn = connections['default']
        with mock.patch.object(conn, 'ensure_connection',
                               side_effect=[OperationalError('down'), None]) as ensure:
            with mock.patch.object(conn, 'close') as close:
                with mock.patch('time.sleep') as sleep:
                    call_command('wait_for_db', '--interval', '0.01')
        self.assertEqual(ensure.call_count, 2)  # échec puis succès
        close.assert_called_once()              # connexion fermée avant de retenter
        sleep.assert_called_once()

    def test_echec_apres_timeout(self):
        conn = connections['default']
        with mock.patch.object(conn, 'ensure_connection',
                               side_effect=OperationalError('down')):
            with mock.patch.object(conn, 'close'):
                with mock.patch('time.sleep'):
                    with self.assertRaises(CommandError):
                        call_command('wait_for_db', '--timeout', '0')
