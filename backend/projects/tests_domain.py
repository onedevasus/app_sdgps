"""
Tests du domaine métier (Phase 5) : validations conditionnelles + scoping RBAC.
"""
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import Organization, Membership
from projects.models import Projet, Propriete, Affaire, Ssdgps

User = get_user_model()


def make_agent(email, org):
    u = User.objects.create_user(username=email, email=email, password='Passw0rd!')
    Membership.objects.create(user=u, organization=org, role='ROLE_ORGANISATION_AGENT')
    return u


class DomainBaseTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.org1 = Organization.objects.create(code='ORG-1', name='Org 1')
        self.org2 = Organization.objects.create(code='ORG-2', name='Org 2')
        self.agent1 = make_agent('a1@example.com', self.org1)
        self.agent2 = make_agent('a2@example.com', self.org2)
        self.client.force_authenticate(self.agent1)

    def _projet(self, org=None, code='P-1'):
        return Projet.objects.create(
            nom_projet='Projet', code_projet=code,
            organization=org or self.org1, created_by=self.agent1,
        )

    def _propriete(self, projet=None):
        return Propriete.objects.create(
            nom_propriete='AMADLE 0', id_requisition='R19000/55',
            projet=projet or self._projet(),
        )

    def _affaire(self, propriete=None):
        return Affaire.objects.create(
            numero_sd_affaire=1, nature_procedure_affaire='IFF', nature_affaire='BI',
            date_bornage='2023-04-09', propriete=propriete or self._propriete(),
        )


class ProprieteValidationTests(DomainBaseTest):
    def test_requires_requisition_or_titre(self):
        projet = self._projet()
        resp = self.client.post('/api/v1/proprietes/', {
            'nom_propriete': 'Sans id', 'projet': str(projet.id),
        }, format='json')
        self.assertEqual(resp.status_code, 400)

    def test_requisition_format_rejected(self):
        projet = self._projet()
        resp = self.client.post('/api/v1/proprietes/', {
            'nom_propriete': 'X', 'id_requisition': 'XYZ', 'projet': str(projet.id),
        }, format='json')
        self.assertEqual(resp.status_code, 400)

    def test_valid_requisition_accepted(self):
        projet = self._projet()
        resp = self.client.post('/api/v1/proprietes/', {
            'nom_propriete': 'AMADLE 0', 'id_requisition': 'R19000/55', 'projet': str(projet.id),
        }, format='json')
        self.assertEqual(resp.status_code, 201, resp.content)


class AffaireCoherenceTests(DomainBaseTest):
    def _post(self, **over):
        propriete = self._propriete()
        data = {
            'numero_sd_affaire': 1, 'nature_procedure_affaire': 'IFF',
            'nature_affaire': 'BI', 'date_bornage': '2023-04-09',
            'propriete': str(propriete.id),
        }
        data.update(over)
        return self.client.post('/api/v1/affaires/', data, format='json')

    def test_nature_incompatible_with_procedure(self):
        resp = self._post(nature_affaire='RB')  # RB invalide pour IFF
        self.assertEqual(resp.status_code, 400)

    def test_iff_requires_date_bornage(self):
        resp = self._post(date_bornage=None)
        self.assertEqual(resp.status_code, 400)

    def test_ife_forbids_date_bornage(self):
        resp = self._post(nature_procedure_affaire='IFE', nature_affaire='IFE',
                          date_bornage='2023-04-09')
        self.assertEqual(resp.status_code, 400)

    def test_ife_without_date_ok(self):
        resp = self._post(nature_procedure_affaire='IFE', nature_affaire='IFE', date_bornage=None)
        self.assertEqual(resp.status_code, 201, resp.content)


class SsdgpsSessionTests(DomainBaseTest):
    def test_mono_session_autocreates_one_session(self):
        affaire = self._affaire()
        resp = self.client.post('/api/v1/ssdgps/', {
            'nature_ssdgps': 'PDC/GPS', 'numero_ssdgps': 1,
            'type_ssdgps': 'mono-session', 'affaire': str(affaire.id),
        }, format='json')
        self.assertEqual(resp.status_code, 201, resp.content)
        ss = Ssdgps.objects.get(pk=resp.json()['id'])
        self.assertEqual(ss.sessions.count(), 1)
        self.assertEqual(ss.sessions.first().numero_session, 1)

    def test_multi_session_no_autocreate(self):
        affaire = self._affaire()
        resp = self.client.post('/api/v1/ssdgps/', {
            'nature_ssdgps': 'DDC/GPS', 'numero_ssdgps': 2,
            'type_ssdgps': 'multi-session', 'affaire': str(affaire.id),
        }, format='json')
        self.assertEqual(resp.status_code, 201, resp.content)
        ss = Ssdgps.objects.get(pk=resp.json()['id'])
        self.assertEqual(ss.sessions.count(), 0)

    def test_unique_numero_ssdgps_per_affaire(self):
        affaire = self._affaire()
        payload = {'nature_ssdgps': 'PDC/GPS', 'numero_ssdgps': 1,
                   'type_ssdgps': 'mono-session', 'affaire': str(affaire.id)}
        self.assertEqual(self.client.post('/api/v1/ssdgps/', payload, format='json').status_code, 201)
        self.assertEqual(self.client.post('/api/v1/ssdgps/', payload, format='json').status_code, 400)


class RbacScopingTests(DomainBaseTest):
    def test_agent_sees_only_own_org_projects(self):
        self._projet(org=self.org1, code='P-ORG1')
        self._projet(org=self.org2, code='P-ORG2')
        resp = self.client.get('/api/v1/projets/')
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        data = data.get('results', data) if isinstance(data, dict) else data
        codes = {p['code_projet'] for p in data}
        self.assertIn('P-ORG1', codes)
        self.assertNotIn('P-ORG2', codes)

    def test_agent_cannot_create_project_in_foreign_org(self):
        resp = self.client.post('/api/v1/projets/', {
            'nom_projet': 'X', 'code_projet': 'P-X', 'organization': str(self.org2.id),
        }, format='json')
        self.assertEqual(resp.status_code, 403)

    def test_agent_creates_project_in_own_org(self):
        resp = self.client.post('/api/v1/projets/', {
            'nom_projet': 'X', 'code_projet': 'P-OK', 'organization': str(self.org1.id),
        }, format='json')
        self.assertEqual(resp.status_code, 201, resp.content)
