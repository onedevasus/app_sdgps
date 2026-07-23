"""
Tests des endpoints organisations : authentification requise, visibilité limitée aux
organisations de l'utilisateur, création réservée aux administrateurs de l'app.
"""
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import Organization, Membership

User = get_user_model()


def make_agent(email, org):
    u = User.objects.create_user(username=email, email=email, password='Passw0rd!')
    Membership.objects.create(user=u, organization=org, role='ROLE_ORGANISATION_AGENT')
    return u


class OrganizationListTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.org1 = Organization.objects.create(code='ORG-1', name='Org Un')
        self.org2 = Organization.objects.create(code='ORG-2', name='Org Deux')
        self.agent1 = make_agent('a1@example.com', self.org1)

    def test_requires_authentication(self):
        resp = self.client.get('/api/v1/organizations/')
        self.assertIn(resp.status_code, (401, 403))

    def test_authenticated_agent_can_list_organizations(self):
        self.client.force_authenticate(self.agent1)
        resp = self.client.get('/api/v1/organizations/')
        self.assertEqual(resp.status_code, 200, resp.content)
        # L'utilisateur voit au moins sa propre organisation.
        self.assertIn('Org Un', resp.content.decode())

    def test_agent_cannot_create_organization(self):
        self.client.force_authenticate(self.agent1)
        resp = self.client.post('/api/v1/organizations/', {
            'name': 'Nouvelle', 'code': 'NEW-1',
        }, format='json')
        self.assertEqual(resp.status_code, 403)

    def test_app_admin_can_create_organization(self):
        admin = User.objects.create_user(
            username='admin@example.com', email='admin@example.com',
            password='Passw0rd!', is_superuser=True, is_staff=True)
        self.client.force_authenticate(admin)
        resp = self.client.post('/api/v1/organizations/', {
            'name': 'Cabinet Admin', 'code': 'ADM-1', 'type': 'PRIVATE',
        }, format='json')
        self.assertIn(resp.status_code, (200, 201), resp.content)


class OrganizationModelTests(TestCase):
    def test_soft_delete_flags(self):
        org = Organization.objects.create(code='ORG-SD', name='À supprimer')
        org.is_deleted = True
        org.save(update_fields=['is_deleted'])
        self.assertTrue(Organization.all_objects.filter(pk=org.pk, is_deleted=True).exists())
