"""Les projets appartiennent toujours à l'organisation courante de leur créateur.

- À la création par un agent, l'organisation du projet est FORCÉE sur l'organisation active
  de l'agent (indépendamment de la valeur envoyée).
- Au changement d'organisation d'un utilisateur, tous les projets qu'il a créés sont
  rattachés à sa nouvelle organisation.
"""
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import Organization, Membership
from projects.models import Projet

User = get_user_model()

PROJETS_URL = '/api/v1/projets/'
USERS_URL = '/api/v1/users/'


def make_user(email, is_superuser=False, app_admin=False):
    user = User.objects.create_user(username=email, email=email, password='Passw0rd!')
    fields = []
    if is_superuser:
        user.is_superuser = True
        user.is_staff = True
        fields += ['is_superuser', 'is_staff']
    if app_admin:
        user.platform_role = 'ROLE_ADMIN_SYSTEME'
        fields += ['platform_role']
    if fields:
        user.save(update_fields=fields)
    return user


class ProjectOrgFollowsCreatorTests(APITestCase):
    def setUp(self):
        self.org_a = Organization.objects.create(code='ORG-A', name='Org A')
        self.org_b = Organization.objects.create(code='ORG-B', name='Org B')
        self.agent = make_user('agent@x.ma')
        Membership.objects.create(
            user=self.agent, organization=self.org_a,
            role='ROLE_ORGANISATION_AGENT', is_active=True)

    def test_creation_force_org_courante_de_lagent(self):
        self.client.force_authenticate(self.agent)
        # L'agent tente de créer le projet dans une AUTRE organisation (org_b).
        res = self.client.post(PROJETS_URL, {
            'code_projet': 'PRJ-1', 'nom_projet': 'Projet 1', 'organization': str(self.org_b.id),
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        projet = Projet.objects.get(code_projet='PRJ-1')
        # L'organisation est forcée sur celle de l'agent (org_a), pas org_b.
        self.assertEqual(projet.organization_id, self.org_a.id)
        self.assertEqual(projet.created_by_id, self.agent.id)

    def test_admin_conserve_org_du_payload(self):
        admin = make_user('sys@x.ma', app_admin=True)
        self.client.force_authenticate(admin)
        res = self.client.post(PROJETS_URL, {
            'code_projet': 'PRJ-2', 'nom_projet': 'Projet 2', 'organization': str(self.org_b.id),
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        # L'admin n'a pas d'organisation : l'org du payload est conservée.
        self.assertEqual(Projet.objects.get(code_projet='PRJ-2').organization_id, self.org_b.id)

    def test_changement_org_reaffecte_les_projets_du_createur(self):
        # L'agent crée deux projets (rattachés à org_a).
        p1 = Projet.objects.create(code_projet='PRJ-3', nom_projet='P3',
                                   organization=self.org_a, created_by=self.agent)
        p2 = Projet.objects.create(code_projet='PRJ-4', nom_projet='P4',
                                   organization=self.org_a, created_by=self.agent)
        # Un projet d'un AUTRE utilisateur ne doit pas être touché.
        other = make_user('other@x.ma')
        Membership.objects.create(user=other, organization=self.org_a,
                                  role='ROLE_ORGANISATION_AGENT', is_active=True)
        p_other = Projet.objects.create(code_projet='PRJ-5', nom_projet='P5',
                                        organization=self.org_a, created_by=other)

        # Un super admin change l'organisation de l'agent vers org_b.
        admin = make_user('super@x.ma', is_superuser=True)
        self.client.force_authenticate(admin)
        res = self.client.patch(f'{USERS_URL}{self.agent.id}/',
                                {'organization_id': str(self.org_b.id)}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        # Les projets de l'agent suivent : ils appartiennent désormais à org_b.
        p1.refresh_from_db(); p2.refresh_from_db(); p_other.refresh_from_db()
        self.assertEqual(p1.organization_id, self.org_b.id)
        self.assertEqual(p2.organization_id, self.org_b.id)
        # Le projet d'un autre créateur reste inchangé.
        self.assertEqual(p_other.organization_id, self.org_a.id)
