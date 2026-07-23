"""Supprime le projet de démonstration « DEMO-SEED-01 » et toute sa descendance.

Ce projet est créé par `projects.0002_seed_demo_data` (jeu de démo). On le retire des bases
existantes (local + production) et, comme cette migration s'exécute APRÈS 0002, également des
bases neuves — la démo n'est donc plus persistée. La suppression du projet entraîne en CASCADE
celle de ses propriétés → affaires → SSDGPS → sessions → pièces → images.

Dépend de la dernière migration de `pieces` pour que l'état des modèles connaisse les relations
Pièce → SSDGPS / Image → Pièce, indispensable à la cascade complète (les FK Django sont gérées
côté application). Idempotente : no-op si le projet n'existe pas. L'organisation de démo
(`DEMO-PROJETS`) n'est pas touchée (hors périmètre : seul le projet et ses données le sont).
"""
from django.db import migrations

DEMO_PROJET_CODE = 'DEMO-SEED-01'


def remove_demo_seed_project(apps, schema_editor):
    Projet = apps.get_model('projects', 'Projet')
    # .delete() sur le queryset déclenche la cascade Django (propriétés → … → images).
    Projet.objects.filter(code_projet=DEMO_PROJET_CODE).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('projects', '0006_alter_affaire_date_bornage_and_more'),
        ('pieces', '0015_piece_taille_octets'),
    ]

    operations = [
        migrations.RunPython(remove_demo_seed_project, migrations.RunPython.noop),
    ]
