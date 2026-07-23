"""Supprime les organismes N2 hors « liste des services du fichier ANCFCC ».

On ne conserve que les services issus du fichier `services_cadastre_ancfcc.json`. Les entrées
historiques génériques (`SCA-CASA`, `SCA-RABAT`) et l'entrée locale `SC-HAOUZ` sont retirées des
bases existantes (local + prod) à chaque `migrate`. Idempotente.

`SCA-RABAT` étant référencé par une propriété des données métier (FK PROTECT), on réassigne
d'abord ces propriétés vers `SCA-RABAT-CENTRE` (un service du fichier) avant de le supprimer.
Sur une base neuve, ces codes ne sont plus seedés (retirés d'initial_data.json) → no-op.
"""
from django.db import migrations

RABAT_OLD = 'SCA-RABAT'
RABAT_NEW = 'SCA-RABAT-CENTRE'
TO_DELETE = ['SCA-CASA', 'SCA-RABAT', 'SC-HAOUZ']


def remove_non_file_services(apps, schema_editor):
    OrganismeNiveau2 = apps.get_model('organismes', 'OrganismeNiveau2')
    Propriete = apps.get_model('projects', 'Propriete')

    # Réassigner les propriétés référençant SCA-RABAT vers un service Rabat du fichier.
    old = OrganismeNiveau2.objects.filter(code=RABAT_OLD).first()
    new = OrganismeNiveau2.objects.filter(code=RABAT_NEW).first()
    if old is not None and new is not None:
        Propriete.objects.filter(organisme_niveau2=old).update(organisme_niveau2=new)

    # Supprimer les organismes hors fichier, seulement s'ils ne sont plus référencés.
    for code in TO_DELETE:
        org = OrganismeNiveau2.objects.filter(code=code).first()
        if org is not None and not Propriete.objects.filter(organisme_niveau2=org).exists():
            org.delete()


class Migration(migrations.Migration):

    dependencies = [
        ('organismes', '0001_initial'),
        ('projects', '0007_remove_demo_seed_project'),
    ]

    operations = [
        migrations.RunPython(remove_non_file_services, migrations.RunPython.noop),
    ]
