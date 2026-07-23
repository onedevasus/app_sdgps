"""Corrige l'organisation des agents seedés (agent1/2/3).

Ces comptes s'étaient retrouvés avec plusieurs adhésions (dont des organisations de test) et
une organisation active incohérente. On réconcilie : une UNIQUE adhésion active « Agent » dans
la bonne organisation, et suppression de toutes les autres.

  agent1@sdgps.ma → Cadastre Azilal (SC-AZILAL)
  agent2@sdgps.ma → Cadastre Haouz  (SC-HAOUZ)
  agent3@sdgps.ma → ITKANTOPO       (ITKANTOPO-V2)

Dépend de `projects.0003_seed_agent_projects` (qui CRÉE les agents) : garantit que la
réconciliation s'exécute APRÈS leur création, y compris sur une base neuve. Idempotente.
"""
from django.db import migrations

AGENT_ORGS = {
    'agent1@sdgps.ma': 'SC-AZILAL',
    'agent2@sdgps.ma': 'SC-HAOUZ',
    'agent3@sdgps.ma': 'ITKANTOPO-V2',
}


def fix_agent_organizations(apps, schema_editor):
    User = apps.get_model('accounts', 'CustomUser')
    Membership = apps.get_model('accounts', 'Membership')
    Organization = apps.get_model('accounts', 'Organization')

    for email, code in AGENT_ORGS.items():
        user = User.objects.filter(email=email).first()
        org = Organization.objects.filter(code=code).first()
        if user is None or org is None:
            continue
        # Retire toutes les adhésions vers une AUTRE organisation.
        Membership.objects.filter(user=user).exclude(organization=org).delete()
        # Assure une unique adhésion active « Agent » dans la bonne organisation.
        membership, created = Membership.objects.get_or_create(
            user=user, organization=org,
            defaults={'role': 'ROLE_ORGANISATION_AGENT', 'is_active': True},
        )
        if not created and (membership.role != 'ROLE_ORGANISATION_AGENT'
                            or not membership.is_active):
            membership.role = 'ROLE_ORGANISATION_AGENT'
            membership.is_active = True
            membership.save()


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0026_remove_cadazilal_user'),
        ('projects', '0003_seed_agent_projects'),
    ]

    operations = [
        migrations.RunPython(fix_agent_organizations, migrations.RunPython.noop),
    ]
