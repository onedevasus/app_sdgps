# Generated manually - rename ROLE_APP_ADMIN to ROLE_ADMIN_SYSTEME

from django.db import migrations, models


def rename_role_forward(apps, schema_editor):
    CustomUser = apps.get_model('accounts', 'CustomUser')
    updated = CustomUser.objects.filter(platform_role='ROLE_APP_ADMIN').update(
        platform_role='ROLE_ADMIN_SYSTEME'
    )
    if updated:
        print(f'  ✓ {updated} utilisateur(s) mis à jour : ROLE_APP_ADMIN → ROLE_ADMIN_SYSTEME')


def rename_role_backward(apps, schema_editor):
    CustomUser = apps.get_model('accounts', 'CustomUser')
    updated = CustomUser.objects.filter(platform_role='ROLE_ADMIN_SYSTEME').update(
        platform_role='ROLE_APP_ADMIN'
    )
    if updated:
        print(f'  ✓ {updated} utilisateur(s) restauré(s) : ROLE_ADMIN_SYSTEME → ROLE_APP_ADMIN')


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0017_add_platform_role'),
    ]

    operations = [
        migrations.AlterField(
            model_name='customuser',
            name='platform_role',
            field=models.CharField(blank=True, choices=[('ROLE_ADMIN_SYSTEME', 'Admin Système')], default=None, max_length=30, null=True, verbose_name='Rôle plateforme'),
        ),
        migrations.RunPython(rename_role_forward, rename_role_backward),
    ]
