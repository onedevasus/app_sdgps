"""
Tests Phase 6.5 : catalogue, cohérence métier (niveau/nature/numero/doublons),
upload image, import CSV/Excel (2 phases), scoping RBAC dual-parent.
"""
import json

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import Organization, Membership
from projects.models import Projet, Propriete, Affaire, Ssdgps, Session
from .models import Piece

User = get_user_model()


def make_agent(email, org):
    u = User.objects.create_user(username=email, email=email, password='Passw0rd!')
    Membership.objects.create(user=u, organization=org, role='ROLE_ORGANISATION_AGENT')
    return u


class PieceBaseTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.org1 = Organization.objects.create(code='ORG-1', name='Org 1')
        self.org2 = Organization.objects.create(code='ORG-2', name='Org 2')
        self.agent1 = make_agent('a1@example.com', self.org1)
        self.agent2 = make_agent('a2@example.com', self.org2)
        self.client.force_authenticate(self.agent1)
        self.ssdgps1 = self._make_ssdgps(self.org1, nature='PDC/GPS', numero=1)
        self.ssdgps2 = self._make_ssdgps(self.org2, nature='PDC/GPS', numero=1)
        self.session1 = Session.objects.create(ssdgps=self.ssdgps1, numero_session=1)

    def _make_ssdgps(self, org, nature='PDC/GPS', numero=1, type_ssdgps='multi-session'):
        projet = Projet.objects.create(nom_projet='P', code_projet=f'P-{org.code}-{numero}', organization=org)
        propriete = Propriete.objects.create(nom_propriete='X', id_requisition='R19000/55', projet=projet)
        affaire = Affaire.objects.create(numero_sd_affaire=1, nature_procedure_affaire='IFF',
                                          nature_affaire='BI', date_bornage='2023-04-09', propriete=propriete)
        return Ssdgps.objects.create(nature_ssdgps=nature, numero_ssdgps=numero,
                                      type_ssdgps=type_ssdgps, affaire=affaire)


class CatalogTests(PieceBaseTest):
    def test_catalog_has_17_effective_entries(self):
        resp = self.client.get('/api/v1/pieces/catalog/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.json()), 17)  # 17 codes (RDN factorise N°1/2/3)


class CoherenceTests(PieceBaseTest):
    def test_ssdgps_level_type_can_be_forced_to_session_level(self):
        # RC est niveau SSDGPS par défaut (catalogue), mais l'utilisateur peut
        # librement le rattacher à une session : ce n'est plus une contrainte figée.
        resp = self.client.post('/api/v1/pieces/', {
            'type_piece': 'RC', 'ssdgps': str(self.ssdgps1.id), 'session': str(self.session1.id),
            'source_saisie': 'manuel', 'payload': {'rows': []},
        }, format='json')
        self.assertEqual(resp.status_code, 201, resp.content)
        self.assertEqual(resp.json()['niveau'], 'session')

    def test_session_level_type_with_ssdgps_only_is_valid_niveau_ssdgps(self):
        # ROB est niveau Session par défaut (catalogue) ; sans session, la pièce est
        # de niveau SSDGPS (commune à toutes les sessions) — toujours valide.
        resp = self.client.post('/api/v1/pieces/', {
            'type_piece': 'ROB', 'ssdgps': str(self.ssdgps1.id),
            'source_saisie': 'manuel', 'payload': {'rows': []},
        }, format='json')
        self.assertEqual(resp.status_code, 201, resp.content)
        self.assertEqual(resp.json()['niveau'], 'ssdgps')
        self.assertIsNone(resp.json()['session'])

    def test_mono_session_allows_both_niveau_ssdgps_and_niveau_session(self):
        mono = self._make_ssdgps(self.org1, numero=9, type_ssdgps='mono-session')
        # Un SSDGPS mono-session reçoit automatiquement une session n°1 (signal post_save).
        mono_session = mono.sessions.get()
        resp = self.client.post('/api/v1/pieces/', {
            'type_piece': 'ROB', 'ssdgps': str(mono.id),
            'source_saisie': 'manuel', 'payload': {'rows': []},
        }, format='json')
        self.assertEqual(resp.status_code, 201, resp.content)
        self.assertEqual(resp.json()['niveau'], 'ssdgps')
        resp2 = self.client.post('/api/v1/pieces/', {
            'type_piece': 'ROB', 'ssdgps': str(mono.id), 'session': str(mono_session.id),
            'source_saisie': 'manuel', 'payload': {'rows': []},
        }, format='json')
        self.assertEqual(resp2.status_code, 201, resp2.content)
        self.assertEqual(resp2.json()['niveau'], 'session')

    def test_multi_session_allows_ssdgps_and_session_level_for_same_type(self):
        resp1 = self.client.post('/api/v1/pieces/', {
            'type_piece': 'RTLB', 'ssdgps': str(self.ssdgps1.id),
            'source_saisie': 'manuel', 'payload': {'rows': []},
        }, format='json')
        self.assertEqual(resp1.status_code, 201, resp1.content)
        resp2 = self.client.post('/api/v1/pieces/', {
            'type_piece': 'RTLB', 'ssdgps': str(self.ssdgps1.id), 'session': str(self.session1.id),
            'source_saisie': 'manuel', 'payload': {'rows': []},
        }, format='json')
        self.assertEqual(resp2.status_code, 201, resp2.content)
        self.assertEqual(resp1.json()['niveau'], 'ssdgps')
        self.assertEqual(resp2.json()['niveau'], 'session')

    def test_session_must_belong_to_ssdgps_rejected(self):
        other = self._make_ssdgps(self.org1, numero=8)
        other_session = Session.objects.create(ssdgps=other, numero_session=1)
        resp = self.client.post('/api/v1/pieces/', {
            'type_piece': 'ROB', 'ssdgps': str(self.ssdgps1.id), 'session': str(other_session.id),
            'source_saisie': 'manuel', 'payload': {'rows': []},
        }, format='json')
        self.assertEqual(resp.status_code, 400)

    def test_nature_not_applicable_rejected(self):
        # CCSPA seulement pour PDC/GPS ; ssdgps DDC/GPS doit échouer
        ddc = self._make_ssdgps(self.org1, nature='DDC/GPS', numero=2)
        resp = self.client.post('/api/v1/pieces/', {
            'type_piece': 'CCSPA', 'ssdgps': str(ddc.id), 'source_saisie': 'image',
        }, format='json')
        self.assertEqual(resp.status_code, 400)

    def test_duplicate_non_repeatable_rejected(self):
        payload = {'type_piece': 'RC', 'ssdgps': str(self.ssdgps1.id),
                   'source_saisie': 'manuel', 'payload': {'rows': [{'contenu': 'ok'}]}}
        self.assertEqual(self.client.post('/api/v1/pieces/', payload, format='json').status_code, 201)
        self.assertEqual(self.client.post('/api/v1/pieces/', payload, format='json').status_code, 400)

    def test_rdn_requires_numero_and_allows_repeats(self):
        base = {'type_piece': 'RDN', 'ssdgps': str(self.ssdgps1.id), 'session': str(self.session1.id),
                'source_saisie': 'manuel', 'payload': {'rows': []}}
        self.assertEqual(self.client.post('/api/v1/pieces/', base, format='json').status_code, 400)
        self.assertEqual(self.client.post('/api/v1/pieces/', {**base, 'numero': 1}, format='json').status_code, 201)
        self.assertEqual(self.client.post('/api/v1/pieces/', {**base, 'numero': 2}, format='json').status_code, 201)
        self.assertEqual(self.client.post('/api/v1/pieces/', {**base, 'numero': 1}, format='json').status_code, 400)

    def test_new_piece_appended_at_end_of_ordre(self):
        r1 = self.client.post('/api/v1/pieces/', {
            'type_piece': 'RC', 'ssdgps': str(self.ssdgps1.id), 'source_saisie': 'manuel',
            'payload': {'rows': []},
        }, format='json')
        r2 = self.client.post('/api/v1/pieces/', {
            'type_piece': 'FTR', 'ssdgps': str(self.ssdgps1.id), 'source_saisie': 'manuel',
            'payload': {'rows': []},
        }, format='json')
        self.assertEqual(r1.json()['ordre'], 0)
        self.assertEqual(r2.json()['ordre'], 1)


class ImageUploadTests(PieceBaseTest):
    def test_image_upload_creates_piece(self):
        img = SimpleUploadedFile('rdc.jpg', b'\xff\xd8\xff' + b'0' * 100, content_type='image/jpeg')
        resp = self.client.post('/api/v1/pieces/', {
            'type_piece': 'RDC', 'ssdgps': str(self.ssdgps1.id),
            'source_saisie': 'image', 'fichier': img,
        }, format='multipart')
        self.assertEqual(resp.status_code, 201, resp.content)

    def test_bad_extension_rejected(self):
        bad = SimpleUploadedFile('malware.exe', b'MZ', content_type='application/octet-stream')
        resp = self.client.post('/api/v1/pieces/', {
            'type_piece': 'RDC', 'ssdgps': str(self.ssdgps1.id),
            'source_saisie': 'image', 'fichier': bad,
        }, format='multipart')
        self.assertEqual(resp.status_code, 400)


class ImportTests(PieceBaseTest):
    def _csv(self, name, content):
        return SimpleUploadedFile(name, content.encode('utf-8'), content_type='text/csv')

    def test_preview_then_confirm_lpa_ssdgps_level(self):
        csv_content = (
            "ID;Nom Point;X(m);Y(m);Référence;Nature Matérialisation;Nature Signalisation\n"
            "1;P1;100.5;200.1;REF1;Borne;Peinture\n"
        )
        preview = self.client.post('/api/v1/pieces/import/', {
            'fichier': self._csv('lpa.csv', csv_content), 'type_piece': 'LPA',
        }, format='multipart')
        self.assertEqual(preview.status_code, 200, preview.content)
        self.assertIn('Nom Point', preview.json()['columns'])
        self.assertEqual(Piece.objects.count(), 0)  # phase 1 ne persiste rien

        mapping = {
            'id': 'ID', 'nom_point': 'Nom Point', 'x_m': 'X(m)', 'y_m': 'Y(m)',
            'reference': 'Référence', 'nature_materialisation': 'Nature Matérialisation',
            'nature_signalisation': 'Nature Signalisation',
        }
        confirm = self.client.post('/api/v1/pieces/import/', {
            'fichier': self._csv('lpa.csv', csv_content), 'type_piece': 'LPA',
            'ssdgps': str(self.ssdgps1.id), 'mapping': json.dumps(mapping),
        }, format='multipart')
        self.assertEqual(confirm.status_code, 201, confirm.content)
        self.assertEqual(len(confirm.json()['payload']['rows']), 1)
        self.assertEqual(confirm.json()['payload']['rows'][0]['nom_point'], 'P1')

    def test_preview_then_confirm_rob_session_level(self):
        csv_content = "ID;Point;Heure Début;Heure Fin;Durée;Type\n1;PT1;08:00;09:00;1h;Statique\n"
        preview = self.client.post('/api/v1/pieces/import/', {
            'fichier': self._csv('rob.csv', csv_content), 'type_piece': 'ROB',
        }, format='multipart')
        self.assertEqual(preview.status_code, 200, preview.content)

        mapping = {'id': 'ID', 'point': 'Point', 'heure_debut': 'Heure Début',
                   'heure_fin': 'Heure Fin', 'duree': 'Durée', 'type': 'Type'}
        confirm = self.client.post('/api/v1/pieces/import/', {
            'fichier': self._csv('rob.csv', csv_content), 'type_piece': 'ROB',
            'ssdgps': str(self.ssdgps1.id), 'session': str(self.session1.id),
            'mapping': json.dumps(mapping),
        }, format='multipart')
        self.assertEqual(confirm.status_code, 201, confirm.content)
        self.assertEqual(confirm.json()['ssdgps'], str(self.ssdgps1.id))
        self.assertEqual(confirm.json()['session'], str(self.session1.id))


class RbacScopingTests(PieceBaseTest):
    def test_agent_sees_only_own_org_pieces_ssdgps_level(self):
        resp = self.client.post('/api/v1/pieces/', {
            'type_piece': 'RC', 'ssdgps': str(self.ssdgps1.id), 'source_saisie': 'manuel',
            'payload': {'rows': [{'contenu': 'x'}]},
        }, format='json')
        self.assertEqual(resp.status_code, 201)

        self.client.force_authenticate(self.agent2)
        resp2 = self.client.get('/api/v1/pieces/', {'ssdgps': str(self.ssdgps1.id)})
        self.assertEqual(resp2.json(), [])

        # Type différent (FTR) pour ne pas se heurter à la contrainte de doublon
        # (RC existe déjà sur ce SSDGPS) et bien isoler le contrôle RBAC.
        resp3 = self.client.post('/api/v1/pieces/', {
            'type_piece': 'FTR', 'ssdgps': str(self.ssdgps1.id), 'source_saisie': 'manuel',
            'payload': {'rows': []},
        }, format='json')
        self.assertEqual(resp3.status_code, 403)

    def test_agent_sees_only_own_org_pieces_session_level(self):
        resp = self.client.post('/api/v1/pieces/', {
            'type_piece': 'RDL', 'ssdgps': str(self.ssdgps1.id), 'session': str(self.session1.id),
            'source_saisie': 'manuel', 'payload': {'rows': []},
        }, format='json')
        self.assertEqual(resp.status_code, 201)

        self.client.force_authenticate(self.agent2)
        resp2 = self.client.get('/api/v1/pieces/', {'session': str(self.session1.id)})
        self.assertEqual(resp2.json(), [])


class UnifiedFetchTests(PieceBaseTest):
    def test_unified_fetch_returns_ssdgps_and_all_session_pieces(self):
        self.client.post('/api/v1/pieces/', {
            'type_piece': 'RC', 'ssdgps': str(self.ssdgps1.id), 'source_saisie': 'manuel',
            'payload': {'rows': []},
        }, format='json')
        self.client.post('/api/v1/pieces/', {
            'type_piece': 'RTLB', 'ssdgps': str(self.ssdgps1.id), 'source_saisie': 'manuel',
            'payload': {'rows': []},
        }, format='json')
        self.client.post('/api/v1/pieces/', {
            'type_piece': 'RDL', 'ssdgps': str(self.ssdgps1.id), 'session': str(self.session1.id),
            'source_saisie': 'manuel', 'payload': {'rows': []},
        }, format='json')
        resp = self.client.get('/api/v1/pieces/', {'ssdgps': str(self.ssdgps1.id)})
        self.assertEqual(len(resp.json()), 3)


class ReorderTests(PieceBaseTest):
    def _create(self, type_piece):
        resp = self.client.post('/api/v1/pieces/', {
            'type_piece': type_piece, 'ssdgps': str(self.ssdgps1.id), 'source_saisie': 'manuel',
            'payload': {'rows': []},
        }, format='json')
        self.assertEqual(resp.status_code, 201, resp.content)
        return resp.json()['id']

    def test_reorder_endpoint_sets_sequential_ordre(self):
        id1, id2, id3 = self._create('RC'), self._create('FTR'), self._create('LPA')
        shuffled = [id3, id1, id2]
        resp = self.client.post('/api/v1/pieces/reorder/', {
            'ssdgps': str(self.ssdgps1.id), 'ordered_ids': shuffled,
        }, format='json')
        self.assertEqual(resp.status_code, 200, resp.content)
        ordres = {p['id']: p['ordre'] for p in resp.json()}
        self.assertEqual(ordres[id3], 0)
        self.assertEqual(ordres[id1], 1)
        self.assertEqual(ordres[id2], 2)

        # Persistance : un GET ultérieur renvoie le même ordre.
        listing = self.client.get('/api/v1/pieces/', {'ssdgps': str(self.ssdgps1.id)})
        self.assertEqual([p['id'] for p in listing.json()], shuffled)

    def test_reorder_endpoint_rejects_mismatched_id_set(self):
        id1 = self._create('RC')
        resp = self.client.post('/api/v1/pieces/reorder/', {
            'ssdgps': str(self.ssdgps1.id), 'ordered_ids': [id1, 'not-a-real-id'],
        }, format='json')
        self.assertEqual(resp.status_code, 400)

    def test_reorder_endpoint_scoped_by_organization(self):
        id1 = self._create('RC')
        self.client.force_authenticate(self.agent2)
        resp = self.client.post('/api/v1/pieces/reorder/', {
            'ssdgps': str(self.ssdgps1.id), 'ordered_ids': [id1],
        }, format='json')
        self.assertEqual(resp.status_code, 400)  # agent2 ne voit aucune pièce de ce ssdgps -> ensemble vide != [id1]


class MoveTests(PieceBaseTest):
    def _create(self, type_piece):
        resp = self.client.post('/api/v1/pieces/', {
            'type_piece': type_piece, 'ssdgps': str(self.ssdgps1.id), 'source_saisie': 'manuel',
            'payload': {'rows': []},
        }, format='json')
        self.assertEqual(resp.status_code, 201, resp.content)
        return resp.json()['id']

    def test_move_endpoint_reindexes_siblings(self):
        id1, id2, id3 = self._create('RC'), self._create('FTR'), self._create('LPA')
        # id1=0, id2=1, id3=2 -> déplace id3 en première position.
        resp = self.client.post(f'/api/v1/pieces/{id3}/move/', {'position': 0}, format='json')
        self.assertEqual(resp.status_code, 200, resp.content)
        self.assertEqual(resp.json()['ordre'], 0)
        listing = self.client.get('/api/v1/pieces/', {'ssdgps': str(self.ssdgps1.id)})
        self.assertEqual([p['id'] for p in listing.json()], [id3, id1, id2])

    def test_move_endpoint_clamps_out_of_range_position(self):
        id1, id2 = self._create('RC'), self._create('FTR')
        resp = self.client.post(f'/api/v1/pieces/{id1}/move/', {'position': 999}, format='json')
        self.assertEqual(resp.status_code, 200, resp.content)
        self.assertEqual(resp.json()['ordre'], 1)  # clampé à la dernière position possible

    def test_move_endpoint_scoped_by_organization(self):
        id1 = self._create('RC')
        self.client.force_authenticate(self.agent2)
        resp = self.client.post(f'/api/v1/pieces/{id1}/move/', {'position': 0}, format='json')
        self.assertEqual(resp.status_code, 404)
