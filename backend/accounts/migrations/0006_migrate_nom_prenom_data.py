# Generated migration to migrate nom/prenom to first_name/last_name and remove old fields

from django.db import migrations


def migrate_nom_prenom_to_first_last_name(apps, schema_editor):
    """
    Migre les données des champs nom/prenom vers first_name/last_name
    pour tous les utilisateurs existants.
    """
    CustomUser = apps.get_model('accounts', 'CustomUser')
    
    users_migrated = 0
    for user in CustomUser.objects.all():
        needs_save = False
        
        # Migrer prenom → first_name si first_name est vide
        if not user.first_name and user.prenom:
            user.first_name = user.prenom
            needs_save = True
        
        # Migrer nom → last_name si last_name est vide
        if not user.last_name and user.nom:
            user.last_name = user.nom
            needs_save = True
        
        if needs_save:
            user.save(update_fields=['first_name', 'last_name'])
            users_migrated += 1
    
    print(f"✅ Migration terminée: {users_migrated} utilisateur(s) mis à jour")


def reverse_migration(apps, schema_editor):
    """
    Reverse: migre first_name/last_name vers nom/prenom (pour rollback)
    """
    CustomUser = apps.get_model('accounts', 'CustomUser')
    
    users_reversed = 0
    for user in CustomUser.objects.all():
        needs_save = False
        
        # Reverse: first_name → prenom
        if not user.prenom and user.first_name:
            user.prenom = user.first_name
            needs_save = True
        
        # Reverse: last_name → nom
        if not user.nom and user.last_name:
            user.nom = user.last_name
            needs_save = True
        
        if needs_save:
            user.save(update_fields=['nom', 'prenom'])
            users_reversed += 1
    
    print(f"⚠️  Reverse migration: {users_reversed} utilisateur(s) restaurés")


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0005_add_profile_picture'),  # Dernière migration existante
    ]

    operations = [
        migrations.RunPython(
            migrate_nom_prenom_to_first_last_name,
            reverse_migration
        ),
    ]
