"""
Commande Django pour générer des données de test pour les organisations
"""
from django.core.management.base import BaseCommand
from accounts.models import Organization
import random


class Command(BaseCommand):
    help = 'Génère des données de test pour les organisations'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--count',
            type=int,
            default=50,
            help='Nombre d\'organisations de test à créer (défaut: 50)'
        )
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Supprimer toutes les données de test existantes avant génération'
        )
    
    def handle(self, *args, **options):
        count = options['count']
        
        # Données de test réalistes
        organizations_data = [
            # Cabinets Privés
            {'name': 'Cabinet Conseil Strategy Plus', 'type': 'PRIVATE', 'code': 'TEST-CSP-001'},
            {'name': 'Audit & Finance SARL', 'type': 'PRIVATE', 'code': 'TEST-AF-002'},
            {'name': 'Tech Solutions Maroc', 'type': 'PRIVATE', 'code': 'TEST-TSM-003'},
            {'name': 'Digital Innovation Hub', 'type': 'PRIVATE', 'code': 'TEST-DIH-004'},
            {'name': 'Conseil Juridique Associés', 'type': 'PRIVATE', 'code': 'TEST-CJA-005'},
            {'name': 'Marketing Digital Pro', 'type': 'PRIVATE', 'code': 'TEST-MDP-006'},
            {'name': 'Expertise Comptable Elite', 'type': 'PRIVATE', 'code': 'TEST-ECE-007'},
            {'name': 'Formation Continue Academy', 'type': 'PRIVATE', 'code': 'TEST-FCA-008'},
            {'name': 'Logistics Services International', 'type': 'PRIVATE', 'code': 'TEST-LSI-009'},
            {'name': 'Immobilier Prestige', 'type': 'PRIVATE', 'code': 'TEST-IP-010'},
            
            # Entités Publiques
            {'name': 'Direction Générale des Impôts', 'type': 'PUBLIC', 'code': 'TEST-DGI-001'},
            {'name': 'Ministère de l\'Économie et des Finances', 'type': 'PUBLIC', 'code': 'TEST-MEF-002'},
            {'name': 'Agence Nationale de Sécurité Sanitaire', 'type': 'PUBLIC', 'code': 'TEST-ANSS-003'},
            {'name': 'Office National de l\'Électricité', 'type': 'PUBLIC', 'code': 'TEST-ONE-004'},
            {'name': 'Direction Régionale de l\'Éducation', 'type': 'PUBLIC', 'code': 'TEST-DRE-005'},
            {'name': 'Centre Hospitalier Universitaire', 'type': 'PUBLIC', 'code': 'TEST-CHU-006'},
            {'name': 'Agence Urbaine de Rabat', 'type': 'PUBLIC', 'code': 'TEST-AUR-007'},
            {'name': 'Division des Ressources Humaines', 'type': 'PUBLIC', 'code': 'TEST-DRH-008'},
            {'name': 'Service Provincial de l\'Agriculture', 'type': 'PUBLIC', 'code': 'TEST-SPA-009'},
            {'name': 'Direction de la Formation Continue', 'type': 'PUBLIC', 'code': 'TEST-DFC-010'},
        ]
        
        if options['clear']:
            deleted_count, _ = Organization.objects.test_data_only().delete()
            self.stdout.write(
                self.style.WARNING(f'⚠️  {deleted_count} anciennes données de test supprimées')
            )
        
        created_count = 0
        skipped_count = 0
        
        for org_data in organizations_data[:count]:
            # Vérifier si l'organisation existe déjà
            if Organization.all_objects.filter(code=org_data['code']).exists():
                skipped_count += 1
                continue
            
            organization = Organization.objects.create(
                code=org_data['code'],
                name=org_data['name'],
                type=org_data['type'],
                legal_id=f'RC-{random.randint(10000, 99999)}' if org_data['type'] == 'PRIVATE' else None,
                address=f'{random.randint(1, 999)} Avenue Mohammed V, Casablanca',
                phone=f'+212 5{random.randint(20, 99)} {random.randint(10, 99)} {random.randint(10, 99)} {random.randint(10, 99)}',
                email=f'contact@{org_data["code"].lower().replace("-", "")}.ma',
                website=f'https://www.{org_data["code"].lower().replace("-", "")}.ma',
                is_active=random.choice([True, True, True, False]),  # 75% actives
                is_test_data=True,  # ← MARQUÉ COMME DONNÉE DE TEST
                created_by=None
            )
            created_count += 1
        
        self.stdout.write(
            self.style.SUCCESS(f'✅ {created_count} organisations de test créées avec succès')
        )
        
        if skipped_count > 0:
            self.stdout.write(
                self.style.WARNING(f'⚠️  {skipped_count} organisations ignorées (déjà existantes)')
            )
        
        self.stdout.write(
            self.style.NOTICE(f'💡 Pour voir les données de test: python manage.py shell\n'
                            f'   >>> from accounts.models import Organization\n'
                            f'   >>> Organization.objects.test_data_only().count()')
        )
