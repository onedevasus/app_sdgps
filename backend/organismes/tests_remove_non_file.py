"""Test de la migration organismes.0002 (retrait des services hors fichier + réassignation)."""
import importlib

from django.apps import apps as django_apps
from django.test import TestCase

from accounts.models import Organization
from organismes.models import OrganismeNiveau1, OrganismeNiveau2
from projects.models import Projet, Propriete

_mig = importlib.import_module('organismes.migrations.0002_remove_non_file_services')
remove_non_file_services = _mig.remove_non_file_services


class RemoveNonFileServicesTests(TestCase):
    def setUp(self):
        self.n1, _ = OrganismeNiveau1.objects.get_or_create(
            code='ANCFCC', defaults={'nom': 'ANCFCC', 'sigle': 'ANCFCC'})

    def _n2(self, code):
        return OrganismeNiveau2.objects.create(code=code, nom=code, niveau1=self.n1)

    def test_supprime_les_services_hors_fichier_et_reassigne(self):
        rabat = self._n2('SCA-RABAT')
        self._n2('SCA-RABAT-CENTRE')
        self._n2('SCA-CASA')
        self._n2('SC-HAOUZ')
        self._n2('SCA-AGADIR')  # service du fichier → doit rester
        org = Organization.all_objects.create(code='ORG-T', name='t', type='PUBLIC')
        projet = Projet.objects.create(
            code_projet='P-T', nom_projet='p', organization=org, statut='en_cours')
        prop = Propriete.objects.create(
            projet=projet, nom_propriete='pp', id_requisition='R1/1', organisme_niveau2=rabat)

        remove_non_file_services(django_apps, None)

        for code in ('SCA-RABAT', 'SCA-CASA', 'SC-HAOUZ'):
            self.assertFalse(OrganismeNiveau2.objects.filter(code=code).exists(), code)
        for code in ('SCA-RABAT-CENTRE', 'SCA-AGADIR'):
            self.assertTrue(OrganismeNiveau2.objects.filter(code=code).exists(), code)
        prop.refresh_from_db()
        self.assertEqual(prop.organisme_niveau2.code, 'SCA-RABAT-CENTRE')

    def test_noop_si_absents(self):
        before = OrganismeNiveau2.objects.count()
        remove_non_file_services(django_apps, None)
        self.assertEqual(OrganismeNiveau2.objects.count(), before)

    def test_idempotent(self):
        self._n2('SCA-CASA')
        remove_non_file_services(django_apps, None)
        remove_non_file_services(django_apps, None)
        self.assertFalse(OrganismeNiveau2.objects.filter(code='SCA-CASA').exists())
