from django.db import migrations


def migrate_roles_forward(apps, schema_editor):
    Membership = apps.get_model('accounts', 'Membership')
    Membership.objects.filter(role='OWNER').update(role='ROLE_ORGANISATION_ADMIN')
    Membership.objects.filter(role='ADMIN').update(role='ROLE_ORGANISATION_ADMIN')
    Membership.objects.filter(role='MANAGER').update(role='ROLE_ORGANISATION_AGENT')
    Membership.objects.filter(role='USER').update(role='ROLE_ORGANISATION_AGENT')


def migrate_roles_backward(apps, schema_editor):
    Membership = apps.get_model('accounts', 'Membership')
    Membership.objects.filter(role='ROLE_ORGANISATION_ADMIN').update(role='ADMIN')
    Membership.objects.filter(role='ROLE_ORGANISATION_AGENT').update(role='USER')


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0012_alter_customuser_options_customuser_deleted_at_and_more'),
    ]

    operations = [
        migrations.RunPython(migrate_roles_forward, migrate_roles_backward),
    ]
