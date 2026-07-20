from django.db import migrations


# Champs obligatoires par défaut (verrouillés dans la vue « Import des données »).
# Valeurs inlinées pour rendre la migration stable et indépendante des évolutions futures
# de `pieces.catalog._REQUIRED_FIELDS`. L'App Admin peut ensuite les modifier via l'écran
# « Champs par défaut des pièces » (endpoint required-fields).
_SEED = {
    'LPA':  ['nom_point', 'x_m', 'y_m'],
    'PPA':  ['nom_point'],
    'PPN':  ['nom_point'],
    'RDL':  ['nom_point', 'x_m', 'y_m', 'sigma_x_m', 'sigma_y_m'],
    'RDN':  ['nom_point', 'x_m', 'y_m', 'sigma_x_m', 'sigma_y_m'],
    'RDD':  ['nom_point', 'x_m', 'y_m', 'sigma_x_m', 'sigma_y_m'],
    'RDIA': ['nom_point', 'x_m', 'y_m', 'sigma_x_m', 'sigma_y_m'],
}


def seed_required(apps, schema_editor):
    PieceFieldMeta = apps.get_model('pieces', 'PieceFieldMeta')
    for type_piece, fields in _SEED.items():
        for field_name in fields:
            PieceFieldMeta.objects.update_or_create(
                type_piece=type_piece, field_name=field_name,
                defaults={'required': True},
            )


def unseed_required(apps, schema_editor):
    """Retour arrière : remet `required=False` (et supprime les lignes vides créées ici)."""
    PieceFieldMeta = apps.get_model('pieces', 'PieceFieldMeta')
    for type_piece, fields in _SEED.items():
        for m in PieceFieldMeta.objects.filter(type_piece=type_piece, field_name__in=fields):
            if not m.description and not m.tooltip:
                m.delete()
            else:
                m.required = False
                m.save(update_fields=['required'])


class Migration(migrations.Migration):

    dependencies = [
        ('pieces', '0013_piecefieldmeta_required'),
    ]

    operations = [
        migrations.RunPython(seed_required, unseed_required),
    ]
