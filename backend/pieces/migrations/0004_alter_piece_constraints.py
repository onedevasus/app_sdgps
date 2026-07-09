"""
Rend `ssdgps` obligatoire (toute pièce appartient désormais toujours à un SSDGPS,
qui définit la portée de l'`ordre` du rapport) et remplace les 3 anciennes
contraintes par une contrainte unique unique incluant `session` — permettant au
même type d'exister une fois « commune » (session=NULL) et une fois par session.

Doit s'appliquer après 0003_backfill_ssdgps_and_ordre, qui garantit qu'aucune ligne
n'a plus `ssdgps_id` NULL avant que cette migration ne durcisse la contrainte.
"""
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('pieces', '0003_backfill_ssdgps_and_ordre'),
    ]

    operations = [
        migrations.RemoveConstraint(
            model_name='piece',
            name='piece_exactly_one_parent',
        ),
        migrations.RemoveConstraint(
            model_name='piece',
            name='unique_piece_type_numero_par_ssdgps',
        ),
        migrations.RemoveConstraint(
            model_name='piece',
            name='unique_piece_type_numero_par_session',
        ),
        migrations.AlterField(
            model_name='piece',
            name='ssdgps',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE, related_name='pieces',
                to='projects.ssdgps', verbose_name='SSDGPS',
            ),
        ),
        migrations.AlterField(
            model_name='piece',
            name='session',
            field=models.ForeignKey(
                blank=True, null=True, on_delete=django.db.models.deletion.CASCADE,
                related_name='pieces', to='projects.session', verbose_name='Session (spécifique)',
            ),
        ),
        migrations.AlterModelOptions(
            name='piece',
            options={
                'ordering': ['ordre', 'type_piece', 'numero'],
                'verbose_name': 'Pièce',
                'verbose_name_plural': 'Pièces',
            },
        ),
        migrations.AddConstraint(
            model_name='piece',
            constraint=models.UniqueConstraint(
                condition=models.Q(('is_deleted', False)),
                fields=('ssdgps', 'type_piece', 'numero', 'session'),
                name='unique_piece_type_numero_session_par_ssdgps',
            ),
        ),
    ]
