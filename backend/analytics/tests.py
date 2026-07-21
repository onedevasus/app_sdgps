"""
Tests de l'analytique de stockage : attribution suivant le créateur du projet,
catégories de réconciliation (« Hors projet » / « Hors organisation »), ventilation
par rôle, invalidation du cache par signaux, et permission d'accès (App Admin).

Les tailles sont portées par `PieceImage.taille_octets` (aucune lecture disque), donc
les tests sont hermétiques.
"""
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import Organization, Membership
from projects.models import Projet, Propriete, Affaire, Ssdgps
from pieces.models import Piece, PieceImage
from analytics.services import (
    compute_storage_overview, cached_storage_overview, overview_version,
    NON_PROJECT_LABEL, NON_ORG_LABEL,
)

User = get_user_model()


def make_agent(email, org=None):
    u = User.objects.create_user(username=email, email=email, password='Passw0rd!')
    if org:
        Membership.objects.create(user=u, organization=org, role='ROLE_ORGANISATION_AGENT')
    return u


class StorageBaseTest(TestCase):
    def setUp(self):
        cache.clear()
        self.org1 = Organization.objects.create(code='ORG-1', name='Org 1')
        self.org2 = Organization.objects.create(code='ORG-2', name='Org 2')
        self.agent1 = make_agent('a1@example.com', self.org1)

    def _piece_image(self, *, created_by, org=None, code='P-1', taille=1000):
        """Crée la hiérarchie Projet→…→Piece + une PieceImage de taille donnée."""
        projet = Projet.objects.create(
            nom_projet='P', code_projet=code, organization=org or self.org1,
            created_by=created_by)
        prop = Propriete.objects.create(
            nom_propriete='X', id_requisition='R19000/55', projet=projet)
        aff = Affaire.objects.create(
            numero_sd_affaire=1, nature_procedure_affaire='IFF', nature_affaire='BI',
            date_bornage='2023-04-09', propriete=prop)
        ss = Ssdgps.objects.create(
            nature_ssdgps='PDC/GPS', numero_ssdgps=1, type_ssdgps='multi-session', affaire=aff)
        piece = Piece.objects.create(
            type_piece='RDC', ssdgps=ss, source_saisie='image', created_by=created_by)
        PieceImage.objects.create(piece=piece, fichier='fake/img.jpg', taille_octets=taille, ordre=0)
        return projet


class AttributionTests(StorageBaseTest):
    def test_org_attribution_follows_project_creator_current_org(self):
        self._piece_image(created_by=self.agent1, org=self.org1, taille=1000)
        d = compute_storage_overview()
        self.assertEqual(d['by_organization'].get('Org 1'), 1000)

        # L'agent change d'organisation : sa volumétrie doit suivre vers Org 2.
        self.agent1.memberships.update(is_active=False)
        Membership.objects.create(
            user=self.agent1, organization=self.org2, role='ROLE_ORGANISATION_AGENT')
        cache.clear()
        d2 = compute_storage_overview()
        self.assertNotIn('Org 1', d2['by_organization'])
        self.assertEqual(d2['by_organization'].get('Org 2'), 1000)

    def test_by_role_bucket(self):
        self._piece_image(created_by=self.agent1, taille=500)
        d = compute_storage_overview()
        self.assertEqual(d['by_role'].get('Agent Org'), 500)

    def test_non_org_category_for_creator_without_membership(self):
        orphan = make_agent('orphan@example.com')  # aucune adhésion
        self._piece_image(created_by=orphan, org=self.org1, code='P-ORPH', taille=700)
        d = compute_storage_overview()
        self.assertEqual(d['by_organization'].get(NON_ORG_LABEL), 700)

    def test_reconciliation_by_organization_equals_total(self):
        self._piece_image(created_by=self.agent1, taille=1000, code='A')
        self._piece_image(created_by=self.agent1, taille=250, code='B')
        d = compute_storage_overview()
        self.assertEqual(sum(d['by_organization'].values()), d['total_bytes'])
        self.assertEqual(d['total_bytes'], 1250)

    def test_organization_filter_restricts_scope(self):
        self._piece_image(created_by=self.agent1, org=self.org1, code='A', taille=1000)
        other = make_agent('a2@example.com', self.org2)
        self._piece_image(created_by=other, org=self.org2, code='B', taille=400)
        d = compute_storage_overview(organization_id=str(self.org1.id))
        self.assertEqual(d['total_bytes'], 1000)


class CacheInvalidationTests(StorageBaseTest):
    def test_version_bumps_on_data_change_and_refreshes_overview(self):
        d1 = cached_storage_overview()
        self.assertEqual(d1['total_bytes'], 0)
        v1 = overview_version()

        # Une nouvelle pièce (signal) doit invalider le cache -> version incrémentée.
        self._piece_image(created_by=self.agent1, taille=1234)
        self.assertGreater(overview_version(), v1)
        d2 = cached_storage_overview()
        self.assertEqual(d2['total_bytes'], 1234)


class StoragePermissionTests(StorageBaseTest):
    def setUp(self):
        super().setUp()
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username='admin@example.com', email='admin@example.com',
            password='Passw0rd!', is_superuser=True, is_staff=True)

    def test_agent_forbidden(self):
        self.client.force_authenticate(self.agent1)
        resp = self.client.get('/api/v1/analytics/storage/overview/')
        self.assertEqual(resp.status_code, 403)

    def test_anonymous_forbidden(self):
        resp = self.client.get('/api/v1/analytics/storage/overview/')
        self.assertIn(resp.status_code, (401, 403))

    def test_app_admin_allowed_and_shape(self):
        self._piece_image(created_by=self.agent1, taille=1000)
        cache.clear()
        self.client.force_authenticate(self.admin)
        resp = self.client.get('/api/v1/analytics/storage/overview/')
        self.assertEqual(resp.status_code, 200, resp.content)
        body = resp.json()
        for key in ('total_bytes', 'by_type', 'by_organization', 'by_project', 'by_user'):
            self.assertIn(key, body)
        self.assertEqual(body['total_bytes'], 1000)
