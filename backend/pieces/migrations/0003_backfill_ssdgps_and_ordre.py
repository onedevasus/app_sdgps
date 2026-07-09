"""
Migration de données : rétro-remplit `ssdgps` pour les pièces rattachées uniquement
à une Session (via session.ssdgps), et calcule un `ordre` séquentiel par groupe de
SSDGPS (tri stable sur type_piece/numero, l'ordre actuel).

DOIT s'exécuter avant 0004 (qui rend `ssdgps` non-nullable) : SQLite reconstruit
entièrement la table lors d'un changement de nullabilité de colonne — s'il restait
des lignes avec ssdgps_id NULL, cette reconstruction échouerait. D'où le séquencement
en 2 temps (données ici, schéma ensuite), obligatoire sur SQLite.
"""
from collections import defaultdict

from django.db import migrations


def backfill(apps, schema_editor):
    Piece = apps.get_model('pieces', 'Piece')

    for p in Piece.objects.filter(ssdgps__isnull=True, session__isnull=False):
        p.ssdgps_id = p.session.ssdgps_id
        p.save(update_fields=['ssdgps'])

    groups = defaultdict(list)
    for p in Piece.objects.all().order_by('type_piece', 'numero'):
        groups[p.ssdgps_id].append(p)
    for pieces in groups.values():
        for i, p in enumerate(pieces):
            if p.ordre != i:
                p.ordre = i
                p.save(update_fields=['ordre'])


class Migration(migrations.Migration):

    dependencies = [
        ('pieces', '0002_piece_ordre'),
    ]

    operations = [
        migrations.RunPython(backfill, reverse_code=migrations.RunPython.noop),
    ]
