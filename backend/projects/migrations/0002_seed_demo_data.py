# Migration de données NEUTRALISÉE (no-op).
#
# Cette migration créait autrefois un jeu de démonstration : organisation `DEMO-PROJETS`
# (`is_test_data=True`) + projet `DEMO-SEED-01` et toute sa cascade. La politique du projet est
# désormais : AUCUNE donnée de démo/test n'est générée, dans AUCUN environnement — seules les
# données d'initialisation (accounts/seed_data/initial_data.json) sont injectées. L'opération
# est donc remplacée par un no-op : les bases neuves / réinitialisées ne créent plus ces données.
#
# On conserve la migration (même nom, même place dans le graphe) pour ne pas casser l'historique
# des bases déjà migrées ; les éventuelles données de démo présentes ne sont pas retouchées ici.
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('projects', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(migrations.RunPython.noop, migrations.RunPython.noop),
    ]
