"""Tests de la corbeille des organisations : listing des supprimées, restauration et
suppression définitive (unitaire + en masse), avec contrôle des permissions (RBAC)."""
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import Organization

User = get_user_model()

LIST_URL = '/api/v1/organizations/'


def make_user(email, is_superuser=False, app_admin=False):
    user = User.objects.create_user(username=email, email=email, password='Passw0rd!')
    if is_superuser:
        user.is_superuser = True
        user.is_staff = True
        user.save(update_fields=['is_superuser', 'is_staff'])
    if app_admin:
        user.platform_role = 'ROLE_ADMIN_SYSTEME'
        user.save(update_fields=['platform_role'])
    return user


class OrganizationTrashTests(APITestCase):
    def setUp(self):
        self.admin = make_user('sys@example.com', app_admin=True)
        self.agent = make_user('agent@example.com')
        self.active = Organization.objects.create(code='ACT-1', name='Active 1')
        self.deleted = Organization.objects.create(
            code='DEL-1', name='Supprimée 1', is_deleted=True, deleted_at=timezone.now())

    # --- Listing ---------------------------------------------------------------
    def test_liste_active_par_defaut(self):
        self.client.force_authenticate(self.admin)
        res = self.client.get(LIST_URL)
        codes = [o['code'] for o in res.data]
        self.assertIn('ACT-1', codes)
        self.assertNotIn('DEL-1', codes)

    def test_liste_show_deleted(self):
        self.client.force_authenticate(self.admin)
        res = self.client.get(LIST_URL, {'show_deleted': 'true'})
        codes = [o['code'] for o in res.data]
        self.assertIn('DEL-1', codes)
        self.assertNotIn('ACT-1', codes)

    # --- Restauration ----------------------------------------------------------
    def test_restore_par_admin(self):
        self.client.force_authenticate(self.admin)
        res = self.client.post(f'{LIST_URL}{self.deleted.id}/restore/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.deleted.refresh_from_db()
        self.assertFalse(self.deleted.is_deleted)

    def test_restore_refuse_pour_agent(self):
        self.client.force_authenticate(self.agent)
        res = self.client.post(f'{LIST_URL}{self.deleted.id}/restore/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        self.deleted.refresh_from_db()
        self.assertTrue(self.deleted.is_deleted)

    def test_bulk_restore(self):
        d2 = Organization.objects.create(code='DEL-2', name='Supprimée 2', is_deleted=True)
        self.client.force_authenticate(self.admin)
        res = self.client.post(f'{LIST_URL}bulk-restore/',
                               {'organization_ids': [str(self.deleted.id), str(d2.id)]}, format='json')
        self.assertEqual(res.data['restored_count'], 2)
        self.assertFalse(Organization.all_objects.get(pk=d2.id).is_deleted)

    # --- Suppression définitive ------------------------------------------------
    def test_permanent_delete_par_admin(self):
        self.client.force_authenticate(self.admin)
        res = self.client.delete(f'{LIST_URL}{self.deleted.id}/permanent/')
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Organization.all_objects.filter(pk=self.deleted.id).exists())

    def test_permanent_delete_refuse_si_non_corbeille(self):
        self.client.force_authenticate(self.admin)
        res = self.client.delete(f'{LIST_URL}{self.active.id}/permanent/')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(Organization.all_objects.filter(pk=self.active.id).exists())

    def test_permanent_delete_refuse_pour_agent(self):
        self.client.force_authenticate(self.agent)
        res = self.client.delete(f'{LIST_URL}{self.deleted.id}/permanent/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(Organization.all_objects.filter(pk=self.deleted.id).exists())

    def test_bulk_permanent_delete(self):
        d2 = Organization.objects.create(code='DEL-2', name='Supprimée 2', is_deleted=True)
        self.client.force_authenticate(self.admin)
        res = self.client.post(f'{LIST_URL}permanent-delete/',
                               {'organization_ids': [str(self.deleted.id), str(d2.id), str(self.active.id)]},
                               format='json')
        # Seules les 2 organisations en corbeille sont purgées ; l'active est ignorée.
        self.assertEqual(res.data['deleted_count'], 2)
        self.assertFalse(Organization.all_objects.filter(pk=self.deleted.id).exists())
        self.assertTrue(Organization.all_objects.filter(pk=self.active.id).exists())
