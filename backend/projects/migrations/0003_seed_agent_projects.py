# Migration de données NEUTRALISÉE (no-op).
#
# Cette migration créait autrefois un jeu de test volumineux pour des agents de démonstration :
# organisations `T-ORG-A/B/C` (`is_test_data=True`) + comptes `agent1/2/3@sdgps.ma` + projets et
# toute leur cascade (propriétés → affaires → SSDGPS → sessions). La politique du projet est
# désormais : AUCUNE donnée de démo/test n'est générée, dans AUCUN environnement — seules les
# données d'initialisation (initial_data.json) sont injectées. L'opération est donc un no-op :
# les bases neuves / réinitialisées ne créent plus ni ces organisations, ni ces comptes agents,
# ni ces projets.
#
# On conserve la migration (même nom, même place dans le graphe) pour ne pas casser l'historique
# des bases déjà migrées. La migration `accounts.0027_fix_agent_organizations`, qui réconciliait
# ces agents, devient de fait un no-op garde-fou (elle ignore les comptes absents).
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('projects', '0002_seed_demo_data'),
        ('accounts', '0019_alter_customuser_platform_role_alter_membership_role'),
    ]

    operations = [
        migrations.RunPython(migrations.RunPython.noop, migrations.RunPython.noop),
    ]
