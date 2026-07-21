from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from accounts.models import Organization, Membership
from accounts.seeding import forbid_in_production

User = get_user_model()


class Command(BaseCommand):
    help = 'Crée des utilisateurs de test pour le développement : super admins, app admins, org admins et agents'

    def handle(self, *args, **options):
        forbid_in_production()  # comptes de test interdits en production
        created_users = []
        created_orgs = []

        orgs_data = [
            {'code': 'T-ORG-A', 'name': 'Cabinet Tech & Innovation', 'type': 'PRIVATE',
             'legal_id': 'RC-11111-CAS', 'email': 'contact@tech-innovation.ma'},
            {'code': 'T-ORG-B', 'name': 'Fiduciaire Atlas Conseil', 'type': 'PRIVATE',
             'legal_id': 'RC-22222-RBA', 'email': 'contact@atlas-conseil.ma'},
            {'code': 'T-ORG-C', 'name': 'Bureau d\'Études Génie Civil', 'type': 'PRIVATE',
             'legal_id': 'RC-33333-MRK', 'email': 'contact@bet-geniecivil.ma'},
        ]

        users_data = [
            # 3 super admins
            {'email': 'boulmanejamila@gmail.com', 'password': 'SuperAdmin@2026', 'first_name': 'Jamila',
             'last_name': 'Boulmane', 'is_superuser': True},
            {'email': 'testsuperadmin1@gmail.com', 'password': 'SuperAdmin@2026', 'first_name': 'PtestSA1',
             'last_name': 'NtestSA1', 'is_superuser': True},
            {'email': 'testsuperadmin2@gmail.com', 'password': 'SuperAdmin@2026', 'first_name': 'PtestSA2',
             'last_name': 'NtestSA2', 'is_superuser': True},
            # 2 app admins
            {'email': 'appadmin1@sdgps.ma', 'password': 'AppAdmin@2026', 'first_name': 'Amine',
             'last_name': 'Benali', 'platform_role': 'ROLE_ADMIN_SYSTEME'},
            {'email': 'appadmin2@sdgps.ma', 'password': 'AppAdmin@2026', 'first_name': 'Sara',
             'last_name': 'El Amrani', 'platform_role': 'ROLE_ADMIN_SYSTEME'},
            # 3 org admins (un par organisation)
            {'email': 'orgadmin1@sdgps.ma', 'password': 'OrgAdmin@2026', 'first_name': 'Karim',
             'last_name': 'Tazi', 'org_code': 'T-ORG-A', 'membership_role': 'ROLE_ORGANISATION_ADMIN'},
            {'email': 'orgadmin2@sdgps.ma', 'password': 'OrgAdmin@2026', 'first_name': 'Nadia',
             'last_name': 'Fassi', 'org_code': 'T-ORG-B', 'membership_role': 'ROLE_ORGANISATION_ADMIN'},
            {'email': 'orgadmin3@sdgps.ma', 'password': 'OrgAdmin@2026', 'first_name': 'Hicham',
             'last_name': 'Bennani', 'org_code': 'T-ORG-C', 'membership_role': 'ROLE_ORGANISATION_ADMIN'},
            # 3 agents (un par organisation)
            {'email': 'agent1@sdgps.ma', 'password': 'Agent@2026', 'first_name': 'Youssef',
             'last_name': 'Idrissi', 'org_code': 'T-ORG-A', 'membership_role': 'ROLE_ORGANISATION_AGENT'},
            {'email': 'agent2@sdgps.ma', 'password': 'Agent@2026', 'first_name': 'Fatima',
             'last_name': 'Zahra', 'org_code': 'T-ORG-B', 'membership_role': 'ROLE_ORGANISATION_AGENT'},
            {'email': 'agent3@sdgps.ma', 'password': 'Agent@2026', 'first_name': 'Omar',
             'last_name': 'Saidi', 'org_code': 'T-ORG-C', 'membership_role': 'ROLE_ORGANISATION_AGENT'},
        ]

        for org_data in orgs_data:
            org, created = Organization.all_objects.get_or_create(
                code=org_data['code'],
                defaults={**org_data, 'is_test_data': True, 'is_active': True},
            )
            status = 'Créée' if created else 'Existante'
            created_orgs.append(org)
            self.stdout.write(f'  Organisation {org.code} ({org.name}) — {status}')

        for user_data in users_data:
            email = user_data['email']
            if User.objects.filter(email=email).exists():
                self.stdout.write(f'  {email} — Déjà existant, ignoré')
                continue

            user = User.objects.create_user(
                username=email,
                email=email,
                password=user_data['password'],
                first_name=user_data['first_name'],
                last_name=user_data['last_name'],
                is_superuser=user_data.get('is_superuser', False),
                is_staff=user_data.get('is_superuser', False),
                is_active=True,
                must_change_password=False,
            )

            if user_data.get('platform_role'):
                user.platform_role = user_data['platform_role']
                user.save(update_fields=['platform_role'])

            org_code = user_data.get('org_code')
            if org_code:
                org = Organization.all_objects.get(code=org_code)
                Membership.objects.get_or_create(
                    user=user,
                    organization=org,
                    defaults={'role': user_data['membership_role'], 'is_active': True},
                )

            created_users.append(user)
            role_label = 'Super Admin' if user.is_superuser else (
                'App Admin' if user.platform_role == 'ROLE_ADMIN_SYSTEME' else user_data['membership_role']
            )
            self.stdout.write(f'  {email} ({user.first_name} {user.last_name}) — {role_label} — Créé')

        self.stdout.write(self.style.SUCCESS(
            f'\n✅ {len(created_orgs)} organisations, {len(created_users)} utilisateurs créés'
        ))
        self.stdout.write(self.style.NOTICE(
            '\nComptes créés :\n'
            '  Super Admins : boulmanejamila@gmail.com, testsuperadmin1@gmail.com, testsuperadmin2@gmail.com / SuperAdmin@2026\n'
            '  App Admins   : appadmin1@sdgps.ma, appadmin2@sdgps.ma / AppAdmin@2026\n'
            '  Org Admins   : orgadmin1@sdgps.ma, orgadmin2@sdgps.ma, orgadmin3@sdgps.ma / OrgAdmin@2026\n'
            '  Agents       : agent1@sdgps.ma, agent2@sdgps.ma, agent3@sdgps.ma / Agent@2026'
        ))
