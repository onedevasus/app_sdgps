"""Suppression DÉFINITIVE (irréversible) des pièces en corbeille (feuille, scopée)."""
from pieces.models import Piece
from pieces.tests import PieceBaseTest


class PiecePermanentDeleteTests(PieceBaseTest):
    def _piece(self, ssdgps, code='FTR', deleted=True):
        piece = Piece.objects.create(
            type_piece=code, ssdgps=ssdgps, created_by=self.agent1,
            source_saisie='manuel', payload={'rows': []},
        )
        if deleted:
            piece.is_deleted = True
            piece.save(update_fields=['is_deleted'])
        return piece

    def test_purge_piece_en_corbeille(self):
        p = self._piece(self.ssdgps1)
        resp = self.client.delete(f'/api/v1/pieces/{p.id}/permanent/')
        self.assertEqual(resp.status_code, 204)
        self.assertFalse(Piece.objects.filter(pk=p.id).exists())

    def test_purge_uniquement_en_corbeille(self):
        p = self._piece(self.ssdgps1, deleted=False)
        resp = self.client.delete(f'/api/v1/pieces/{p.id}/permanent/')
        self.assertEqual(resp.status_code, 404)
        self.assertTrue(Piece.objects.filter(pk=p.id).exists())

    def test_scoping_hors_portee_404(self):
        p = self._piece(self.ssdgps2)  # org2, hors portée d'agent1
        resp = self.client.delete(f'/api/v1/pieces/{p.id}/permanent/')
        self.assertEqual(resp.status_code, 404)
        self.assertTrue(Piece.objects.filter(pk=p.id).exists())

    def test_bulk_purge(self):
        a = self._piece(self.ssdgps1, code='FTR')
        b = self._piece(self.ssdgps1, code='ROB')
        resp = self.client.post('/api/v1/pieces/permanent-delete/',
                                {'ids': [str(a.id), str(b.id)]}, format='json')
        self.assertEqual(resp.data['deleted_count'], 2)
        self.assertFalse(Piece.objects.filter(pk__in=[a.id, b.id]).exists())
