"""Amorce un jeu d'organismes de référence (idempotent).

Crée l'ANCFCC (niveau 1) et quelques services provinciaux (niveau 2) rattachés, pour
que l'en-tête du rapport soit immédiatement significatif.

    python manage.py seed_organismes
"""
from django.core.management.base import BaseCommand

from organismes.models import OrganismeNiveau1, OrganismeNiveau2

ANCFCC_NOM = ("AGENCE NATIONALE DE LA CONSERVATION FONCIÈRE "
              "DU CADASTRE ET DE LA CARTOGRAPHIE")

NIVEAUX2 = [
    {'code': 'SCA-AZILAL', 'nom': "Service du cadastre d'Azilal", 'ville': 'Azilal'},
    {'code': 'SCA-RABAT', 'nom': "Service du cadastre de Rabat", 'ville': 'Rabat'},
    {'code': 'SCA-CASA', 'nom': "Service du cadastre de Casablanca", 'ville': 'Casablanca'},
]


class Command(BaseCommand):
    help = "Crée des organismes de référence (ANCFCC + services provinciaux)."

    def handle(self, *args, **options):
        n1, created = OrganismeNiveau1.objects.get_or_create(
            code='ANCFCC', defaults={'nom': ANCFCC_NOM, 'sigle': 'ANCFCC'})
        self.stdout.write(("Créé" if created else "Existe déjà") + f" : N1 {n1.code}")

        for data in NIVEAUX2:
            n2, created = OrganismeNiveau2.objects.get_or_create(
                code=data['code'],
                defaults={'nom': data['nom'], 'ville': data['ville'], 'niveau1': n1})
            self.stdout.write(("Créé" if created else "Existe déjà") + f" : N2 {n2.code}")

        self.stdout.write(self.style.SUCCESS("Amorçage des organismes terminé."))
