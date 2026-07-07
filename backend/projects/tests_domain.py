"""
Tests du domaine métier (Phase 5) : validations conditionnelles + scoping RBAC.
"""
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import Organization, Membership
from projects.models import Projet, Propriete, Affaire, Ssdgps, Session

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

    def _ssdgps(self, affaire=None, numero=1):
        return Ssdgps.objects.create(
            nature_ssdgps='PDC/GPS', numero_ssdgps=numero,
            type_ssdgps='multi-session', affaire=affaire or self._affaire(),
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


class RestoreTests(DomainBaseTest):
    """Suppression logique + restauration (unitaire et groupée), scopées par organisation."""

    def test_deleted_project_hidden_by_default_and_listed_with_show_deleted(self):
        p = self._projet(code='P-DEL')
        self.client.delete(f'/api/v1/projets/{p.id}/')

        resp = self.client.get('/api/v1/projets/')
        codes = {x['code_projet'] for x in resp.json().get('results', resp.json())} \
            if isinstance(resp.json(), dict) else {x['code_projet'] for x in resp.json()}
        self.assertNotIn('P-DEL', codes)

        resp2 = self.client.get('/api/v1/projets/?show_deleted=true')
        data2 = resp2.json()
        data2 = data2.get('results', data2) if isinstance(data2, dict) else data2
        codes2 = {x['code_projet'] for x in data2}
        self.assertIn('P-DEL', codes2)

    def test_restore_single_project(self):
        p = self._projet(code='P-RESTORE')
        self.client.delete(f'/api/v1/projets/{p.id}/')

        resp = self.client.post(f'/api/v1/projets/{p.id}/restore/')
        self.assertEqual(resp.status_code, 200, resp.content)
        p.refresh_from_db()
        self.assertFalse(p.is_deleted)
        self.assertIsNone(p.deleted_at)

    def test_bulk_restore_projects(self):
        p1 = self._projet(code='P-BULK1')
        p2 = self._projet(code='P-BULK2')
        self.client.delete(f'/api/v1/projets/{p1.id}/')
        self.client.delete(f'/api/v1/projets/{p2.id}/')

        resp = self.client.post('/api/v1/projets/bulk-restore/', {'ids': [str(p1.id), str(p2.id)]}, format='json')
        self.assertEqual(resp.status_code, 200, resp.content)
        self.assertEqual(resp.json()['restored_count'], 2)
        p1.refresh_from_db(); p2.refresh_from_db()
        self.assertFalse(p1.is_deleted)
        self.assertFalse(p2.is_deleted)

    def test_cannot_restore_project_of_foreign_org(self):
        foreign = self._projet(org=self.org2, code='P-FOREIGN')
        foreign.is_deleted = True
        foreign.save(update_fields=['is_deleted'])

        resp = self.client.post(f'/api/v1/projets/{foreign.id}/restore/')
        self.assertEqual(resp.status_code, 404)


class AggregateCountsTests(DomainBaseTest):
    """Compteurs `nbr_total_*` annotés au niveau du queryset, à chaque niveau."""

    def setUp(self):
        super().setUp()
        self.projet = self._projet(code='P-COUNTS')
        self.propriete = self._propriete(projet=self.projet)
        self.affaire = self._affaire(propriete=self.propriete)
        # Ssdgps en multi-session : pas de session auto-créée, on en ajoute 2 manuellement.
        self.ssdgps = self._ssdgps(affaire=self.affaire, numero=1)
        Session.objects.create(ssdgps=self.ssdgps, numero_session=1, date_session='2023-04-09')
        Session.objects.create(ssdgps=self.ssdgps, numero_session=2, date_session='2023-04-10')
        # Un 2e SSDGPS avec une session supprimée : ne doit pas être compté.
        self.ssdgps2 = self._ssdgps(affaire=self.affaire, numero=2)
        deleted_session = Session.objects.create(
            ssdgps=self.ssdgps2, numero_session=1, date_session='2023-04-09',
        )
        deleted_session.is_deleted = True
        deleted_session.save(update_fields=['is_deleted'])

    def test_projet_counts(self):
        resp = self.client.get(f'/api/v1/projets/{self.projet.id}/')
        self.assertEqual(resp.status_code, 200, resp.content)
        data = resp.json()
        self.assertEqual(data['nbr_total_proprietes'], 1)
        self.assertEqual(data['nbr_total_affaires'], 1)
        self.assertEqual(data['nbr_total_ssdgps'], 2)
        self.assertEqual(data['nbr_total_sessions'], 2)

    def test_propriete_counts(self):
        resp = self.client.get(f'/api/v1/proprietes/{self.propriete.id}/')
        self.assertEqual(resp.status_code, 200, resp.content)
        data = resp.json()
        self.assertEqual(data['nbr_total_affaires'], 1)
        self.assertEqual(data['nbr_total_ssdgps'], 2)
        self.assertEqual(data['nbr_total_sessions'], 2)

    def test_affaire_counts(self):
        resp = self.client.get(f'/api/v1/affaires/{self.affaire.id}/')
        self.assertEqual(resp.status_code, 200, resp.content)
        data = resp.json()
        self.assertEqual(data['nbr_total_ssdgps'], 2)
        self.assertEqual(data['nbr_total_sessions'], 2)

    def test_ssdgps_counts(self):
        resp = self.client.get(f'/api/v1/ssdgps/{self.ssdgps.id}/')
        self.assertEqual(resp.status_code, 200, resp.content)
        self.assertEqual(resp.json()['nbr_total_sessions'], 2)

        resp2 = self.client.get(f'/api/v1/ssdgps/{self.ssdgps2.id}/')
        self.assertEqual(resp2.json()['nbr_total_sessions'], 0)

    def test_deleted_propriete_excluded_from_projet_counts(self):
        extra = self._propriete(projet=self.projet)
        extra.is_deleted = True
        extra.save(update_fields=['is_deleted'])

        resp = self.client.get(f'/api/v1/projets/{self.projet.id}/')
        self.assertEqual(resp.json()['nbr_total_proprietes'], 1)

    def test_restore_response_includes_counts(self):
        """Le sérialiseur de restore doit lire les compteurs sans planter (queryset annoté)."""
        self.projet.is_deleted = True
        self.projet.save(update_fields=['is_deleted'])

        resp = self.client.post(f'/api/v1/projets/{self.projet.id}/restore/')
        self.assertEqual(resp.status_code, 200, resp.content)
        self.assertEqual(resp.json()['nbr_total_proprietes'], 1)
