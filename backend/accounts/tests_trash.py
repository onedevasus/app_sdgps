"""Tests de la suppression DÉFINITIVE des utilisateurs en corbeille (unitaire + en masse),
avec contrôle des permissions (RBAC) et garde-fou d'auto-suppression."""
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

User = get_user_model()

LIST_URL = '/api/v1/users/'


def make_user(email, is_superuser=False, app_admin=False, is_deleted=False):
    user = User.objects.create_user(username=email, email=email, password='Passw0rd!')
    fields = []
    if is_superuser:
        user.is_superuser = True
        user.is_staff = True
        fields += ['is_superuser', 'is_staff']
    if app_admin:
        user.platform_role = 'ROLE_ADMIN_SYSTEME'
        fields += ['platform_role']
    if is_deleted:
        user.is_deleted = True
        user.is_active = False
        user.deleted_at = timezone.now()
        fields += ['is_deleted', 'is_active', 'deleted_at']
    if fields:
        user.save(update_fields=fields)
    return user


class UserPermanentDeleteTests(APITestCase):
    def setUp(self):
        self.admin = make_user('sys@example.com', app_admin=True)
        self.agent = make_user('agent@example.com')
        self.deleted = make_user('trashed@example.com', is_deleted=True)
        self.active = make_user('active@example.com')

    def test_permanent_delete_par_admin(self):
        self.client.force_authenticate(self.admin)
        res = self.client.delete(f'{LIST_URL}{self.deleted.id}/permanent/')
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(User.objects.filter(pk=self.deleted.id).exists())

    def test_refuse_si_non_corbeille(self):
        self.client.force_authenticate(self.admin)
        res = self.client.delete(f'{LIST_URL}{self.active.id}/permanent/')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(User.objects.filter(pk=self.active.id).exists())

    def test_refuse_pour_agent(self):
        self.client.force_authenticate(self.agent)
        res = self.client.delete(f'{LIST_URL}{self.deleted.id}/permanent/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(User.objects.filter(pk=self.deleted.id).exists())

    def test_refuse_auto_suppression(self):
        # Un admin en corbeille (cas théorique) ne peut pas se purger lui-même.
        admin_deleted = make_user('selfadmin@example.com', app_admin=True, is_deleted=True)
        self.client.force_authenticate(admin_deleted)
        res = self.client.delete(f'{LIST_URL}{admin_deleted.id}/permanent/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(User.objects.filter(pk=admin_deleted.id).exists())

    def test_bulk_permanent_delete(self):
        d2 = make_user('trashed2@example.com', is_deleted=True)
        self.client.force_authenticate(self.admin)
        res = self.client.post(
            f'{LIST_URL}permanent-delete/',
            {'user_ids': [self.deleted.id, d2.id, self.active.id]}, format='json')
        # Seuls les comptes en corbeille sont purgés ; l'actif est ignoré (erreur listée).
        self.assertEqual(res.data['deleted_count'], 2)
        self.assertFalse(User.objects.filter(pk=self.deleted.id).exists())
        self.assertTrue(User.objects.filter(pk=self.active.id).exists())

    def test_bulk_refuse_pour_agent(self):
        self.client.force_authenticate(self.agent)
        res = self.client.post(
            f'{LIST_URL}permanent-delete/', {'user_ids': [self.deleted.id]}, format='json')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
