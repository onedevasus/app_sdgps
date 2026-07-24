"""Tests des valeurs par défaut de configuration (accounts.piece_defaults).

Régression PostgreSQL : les fonctions `superadmin_*_config()` interrogent la table des
utilisateurs en sélectionnant une colonne (`ssdgps_sort_config`…) qui n'existe pas encore
pendant la migration `AddField` qui la crée. Sur PostgreSQL, un tel SELECT met la transaction
de migration en état « aborted » ; l'`ADD COLUMN` suivant échoue alors en
`InFailedSqlTransaction`. Le correctif isole la requête dans un savepoint (`transaction.atomic`)
pour contenir l'échec. On verrouille ici l'usage du savepoint (le bug ne se reproduit pas sur
SQLite) + le comportement de repli/source.
"""
from unittest import mock

from django.contrib.auth import get_user_model
from django.db import transaction
from django.test import TestCase

from accounts import piece_defaults
from accounts.piece_defaults import (
    DEFAULT_SSDGPS_SORT_CONFIG,
    default_ssdgps_sort_config,
    superadmin_piece_fields_config,
    superadmin_piece_sort_config,
    superadmin_ssdgps_sort_config,
)

User = get_user_model()


class SsdgpsSortDefaultTests(TestCase):
    def _oldest_super_admin(self):
        # Le super admin « source » vient des données d'initialisation (non rejouées en test, et
        # la migration 0002 ne le crée plus) : on le provisionne donc explicitement ici.
        admin = (User.objects.filter(is_superuser=True)
                 .order_by('date_joined', 'email').first())
        if admin is None:
            admin = User.objects.create_user(
                username='super@sdgps.ma', email='super@sdgps.ma',
                password='Test@2026', is_superuser=True, is_staff=True)
        return admin

    def test_repli_sans_super_admin(self):
        User.objects.filter(is_superuser=True).delete()
        self.assertEqual(default_ssdgps_sort_config(), DEFAULT_SSDGPS_SORT_CONFIG)

    def test_source_super_admin(self):
        cfg = [{'field': 'numero_ssdgps', 'dir': 'desc'}]
        admin = self._oldest_super_admin()
        admin.ssdgps_sort_config = cfg
        admin.save(update_fields=['ssdgps_sort_config'])
        self.assertEqual(default_ssdgps_sort_config(), cfg)

    def test_repli_si_config_super_admin_vide(self):
        admin = self._oldest_super_admin()
        admin.ssdgps_sort_config = []
        admin.save(update_fields=['ssdgps_sort_config'])
        self.assertEqual(default_ssdgps_sort_config(), DEFAULT_SSDGPS_SORT_CONFIG)


class SavepointRegressionTests(TestCase):
    """Chaque lecture de la config « source » doit s'exécuter dans un savepoint pour ne pas
    empoisonner la transaction de migration sur PostgreSQL (échoue sans le correctif)."""

    def _assert_uses_atomic(self, func):
        with mock.patch('accounts.piece_defaults.transaction.atomic',
                        wraps=transaction.atomic) as m:
            func()
        m.assert_called()

    def test_ssdgps_sort_utilise_un_savepoint(self):
        self._assert_uses_atomic(superadmin_ssdgps_sort_config)

    def test_piece_sort_utilise_un_savepoint(self):
        self._assert_uses_atomic(superadmin_piece_sort_config)

    def test_piece_fields_utilise_un_savepoint(self):
        self._assert_uses_atomic(superadmin_piece_fields_config)

    def test_requete_en_echec_retombe_sur_le_repli_sans_lever(self):
        """Si la requête de source échoue, on retombe sur le repli sans propager l'exception."""
        # get_user_model est importé DANS la fonction (from django.contrib.auth import …) :
        # on patche donc la source réelle.
        with mock.patch('django.contrib.auth.get_user_model') as g:
            g.return_value.objects.filter.side_effect = Exception('colonne inexistante')
            self.assertEqual(default_ssdgps_sort_config(), DEFAULT_SSDGPS_SORT_CONFIG)
