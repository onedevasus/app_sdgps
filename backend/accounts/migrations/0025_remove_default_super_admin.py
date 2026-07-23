"""Supprime le super admin par défaut « admin@sdgps.com » et son organisation.

Ce compte n'est créé par `0002_complete_rbac_and_super_admin` que lorsque `SUPER_ADMIN_EMAIL`
n'est PAS défini (valeur par défaut historique). Sur la base de production, il a été créé lors
du tout premier déploiement (avant que `SUPER_ADMIN_EMAIL` ne soit configuré) ; le vrai super
admin est désormais celui des données d'initialisation. On le retire donc de la base déployée
ET, plus largement, de toute base migrée.

Garde-fou : on ne supprime `admin@sdgps.com` QUE s'il reste au moins un AUTRE super admin actif
— pour ne jamais laisser une base sans super admin (ex. base neuve sans variable d'env, où ce
compte est le seul filet de sécurité). Idempotent : no-op s'il n'existe pas.
"""
from django.db import migrations

DEFAULT_ADMIN_EMAIL = 'admin@sdgps.com'


def remove_default_super_admin(apps, schema_editor):
    User = apps.get_model('accounts', 'CustomUser')
    Membership = apps.get_model('accounts', 'Membership')
    Organization = apps.get_model('accounts', 'Organization')

    admin = User.objects.filter(email=DEFAULT_ADMIN_EMAIL).first()
    if admin is None:
        return

    # Ne pas supprimer s'il est le seul super admin (éviter une base sans super admin).
    if not User.objects.filter(is_superuser=True).exclude(pk=admin.pk).exists():
        return

    # Organisations dont ce compte est membre (créée pour lui en 0002).
    org_ids = list(
        Membership.objects.filter(user=admin).values_list('organization_id', flat=True)
    )
    Membership.objects.filter(user=admin).delete()
    admin.delete()

    # Supprime chaque organisation devenue orpheline (plus aucun membre). On ignore une org
    # encore référencée (ex. par des projets, FK PROTECT) — ne devrait pas arriver pour ce compte.
    for oid in org_ids:
        org = Organization.objects.filter(pk=oid).first()
        if org and not Membership.objects.filter(organization=org).exists():
            try:
                org.delete()
            except Exception:
                pass


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0024_customuser_ssdgps_sort_config'),
    ]

    operations = [
        migrations.RunPython(remove_default_super_admin, migrations.RunPython.noop),
    ]
