"""Supprime l'utilisateur « abderrazzak.cadazilal@gmail.com ».

Ce compte figurait dans les données d'initialisation (`initial_data.json`) et a donc été
créé sur les bases déjà déployées. Il en a été retiré ; cette migration le supprime des bases
existantes (local + production) à chaque `migrate`. Idempotente : no-op s'il n'existe pas.
"""
from django.db import migrations

CADAZILAL_EMAIL = 'abderrazzak.cadazilal@gmail.com'


def remove_cadazilal_user(apps, schema_editor):
    User = apps.get_model('accounts', 'CustomUser')
    user = User.objects.filter(email=CADAZILAL_EMAIL).first()
    if user is not None:
        # Les adhésions éventuelles partent en cascade (Membership.user CASCADE).
        user.delete()


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0025_remove_default_super_admin'),
    ]

    operations = [
        migrations.RunPython(remove_cadazilal_user, migrations.RunPython.noop),
    ]
