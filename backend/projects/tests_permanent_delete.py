"""Suppression DÉFINITIVE (irréversible) des entités métier en corbeille.

- Autorisée sur une feuille (sans sous-données) en corbeille.
- Bloquée sur un parent qui contient des sous-éléments.
- Scopée : un élément hors portée RBAC renvoie 404.
- Masse : purge les purgeables, liste les bloqués.
"""
from projects.models import Projet, Propriete, Ssdgps
from pieces.models import Piece
from projects.tests_domain import DomainBaseTest


class PermanentDeleteTests(DomainBaseTest):
    def _soft_delete(self, instance):
        instance.is_deleted = True
        instance.save(update_fields=['is_deleted'])
        return instance

    def test_purge_feuille(self):
        p = self._soft_delete(self._projet(code='P-LEAF'))
        resp = self.client.delete(f'/api/v1/projets/{p.id}/permanent/')
        self.assertEqual(resp.status_code, 204)
        self.assertFalse(Projet.objects.filter(pk=p.id).exists())

    def test_bloque_si_sous_donnees(self):
        propriete = self._propriete()  # crée aussi le projet parent
        projet = propriete.projet
        self._soft_delete(projet)
        resp = self.client.delete(f'/api/v1/projets/{projet.id}/permanent/')
        self.assertEqual(resp.status_code, 400)
        self.assertIn('sous-élément', resp.data['detail'])
        self.assertTrue(Projet.objects.filter(pk=projet.id).exists())

    def test_scoping_hors_portee_404(self):
        # Projet d'un autre agent/organisation : agent1 ne peut pas le purger.
        p = self._soft_delete(self._projet(org=self.org2, code='P-OTHER', created_by=self.agent2))
        resp = self.client.delete(f'/api/v1/projets/{p.id}/permanent/')
        self.assertEqual(resp.status_code, 404)
        self.assertTrue(Projet.objects.filter(pk=p.id).exists())

    def test_purge_uniquement_en_corbeille(self):
        p = self._projet(code='P-ACTIVE')  # non supprimé
        resp = self.client.delete(f'/api/v1/projets/{p.id}/permanent/')
        self.assertEqual(resp.status_code, 404)
        self.assertTrue(Projet.objects.filter(pk=p.id).exists())

    def test_purge_ssdgps_mono_session(self):
        """Un SSDGPS mono-session en corbeille est purgeable : sa session n°1 auto-créée
        (invisible dans l'UI) ne doit PAS bloquer la suppression définitive."""
        affaire = self._affaire()
        ssdgps = Ssdgps.objects.create(
            nature_ssdgps='PDC/GPS', numero_ssdgps=1,
            type_ssdgps='mono-session', affaire=affaire,
        )
        self.assertEqual(ssdgps.sessions.count(), 1)  # session implicite auto-créée
        self._soft_delete(ssdgps)
        resp = self.client.delete(f'/api/v1/ssdgps/{ssdgps.id}/permanent/')
        self.assertEqual(resp.status_code, 204)
        self.assertFalse(Ssdgps.objects.filter(pk=ssdgps.id).exists())

    def test_purge_ssdgps_mono_session_bloque_si_piece(self):
        """Une pièce rattachée bloque la purge, même pour un SSDGPS mono-session."""
        ssdgps = Ssdgps.objects.create(
            nature_ssdgps='PDC/GPS', numero_ssdgps=2,
            type_ssdgps='mono-session', affaire=self._affaire(),
        )
        Piece.objects.create(type_piece='PGSDGPS', ssdgps=ssdgps, source_saisie='manuel')
        self._soft_delete(ssdgps)
        resp = self.client.delete(f'/api/v1/ssdgps/{ssdgps.id}/permanent/')
        self.assertEqual(resp.status_code, 400)
        self.assertTrue(Ssdgps.objects.filter(pk=ssdgps.id).exists())

    def test_purge_ssdgps_multi_session_bloque_si_session(self):
        """Un SSDGPS multi-session reste bloqué par ses sessions (créées manuellement)."""
        ssdgps = self._ssdgps()  # multi-session par défaut
        from projects.models import Session
        Session.objects.create(ssdgps=ssdgps, numero_session=1)
        self._soft_delete(ssdgps)
        resp = self.client.delete(f'/api/v1/ssdgps/{ssdgps.id}/permanent/')
        self.assertEqual(resp.status_code, 400)
        self.assertTrue(Ssdgps.objects.filter(pk=ssdgps.id).exists())

    def test_bulk_purge_mixte(self):
        leaf = self._soft_delete(self._projet(code='P-A'))
        parent = self._soft_delete(self._propriete().projet)  # a une propriété → bloqué
        resp = self.client.post('/api/v1/projets/permanent-delete/',
                                {'ids': [str(leaf.id), str(parent.id)]}, format='json')
        self.assertEqual(resp.data['deleted_count'], 1)
        self.assertEqual(len(resp.data['errors']), 1)
        self.assertFalse(Projet.objects.filter(pk=leaf.id).exists())
        self.assertTrue(Projet.objects.filter(pk=parent.id).exists())
