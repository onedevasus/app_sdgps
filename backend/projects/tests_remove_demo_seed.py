"""Test de la migration 0007 (suppression du projet démo DEMO-SEED-01 + cascade)."""
import importlib

from django.apps import apps as django_apps
from django.test import TestCase

from accounts.models import Organization
from pieces.models import Piece, PieceImage
from projects.models import Affaire, Projet, Propriete, Session, Ssdgps

_mig = importlib.import_module('projects.migrations.0007_remove_demo_seed_project')
remove_demo_seed_project = _mig.remove_demo_seed_project


class RemoveDemoSeedProjectTests(TestCase):
    def _build_cascade(self):
        org = Organization.all_objects.create(code='DEMO-X', name='Démo', type='PUBLIC')
        projet = Projet.objects.create(
            code_projet='DEMO-SEED-01', nom_projet='Démo', organization=org, statut='en_cours')
        prop = Propriete.objects.create(
            projet=projet, nom_propriete='P', id_requisition='R1/1')
        aff = Affaire.objects.create(
            propriete=prop, numero_sd_affaire=1,
            nature_procedure_affaire='IFF', nature_affaire='BI')
        # multi-session : pas de session auto (le signal n'en crée que pour mono-session).
        ss = Ssdgps.objects.create(
            affaire=aff, numero_ssdgps=1, nature_ssdgps='PDC/GPS', type_ssdgps='multi-session')
        sess = Session.objects.create(ssdgps=ss, numero_session=1)
        piece = Piece.objects.create(ssdgps=ss, type_piece='RDC', source_saisie='manuel')
        img = PieceImage.objects.create(piece=piece, fichier='pieces/x/RDC/images/a.jpg')
        return projet, prop, aff, ss, sess, piece, img

    def test_supprime_le_projet_et_toute_sa_cascade(self):
        projet, prop, aff, ss, sess, piece, img = self._build_cascade()
        remove_demo_seed_project(django_apps, None)
        self.assertFalse(Projet.objects.filter(code_projet='DEMO-SEED-01').exists())
        self.assertFalse(Propriete.objects.filter(pk=prop.pk).exists())
        self.assertFalse(Affaire.objects.filter(pk=aff.pk).exists())
        self.assertFalse(Ssdgps.objects.filter(pk=ss.pk).exists())
        self.assertFalse(Session.objects.filter(pk=sess.pk).exists())
        self.assertFalse(Piece.objects.filter(pk=piece.pk).exists())
        self.assertFalse(PieceImage.objects.filter(pk=img.pk).exists())

    def test_noop_si_projet_absent(self):
        before = Projet.objects.count()
        remove_demo_seed_project(django_apps, None)
        self.assertEqual(Projet.objects.count(), before)

    def test_idempotent(self):
        self._build_cascade()
        remove_demo_seed_project(django_apps, None)
        remove_demo_seed_project(django_apps, None)
        self.assertFalse(Projet.objects.filter(code_projet='DEMO-SEED-01').exists())
