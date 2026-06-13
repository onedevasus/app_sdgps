# Migration complète : Schéma RBAC + Super Admin + Sécurité MDP
from django.db import migrations, models
import uuid
from decouple import config
import random
import string


def create_super_admin(apps, schema_editor):
    """
    Crée un utilisateur super admin avec sa propre organisation.
    Cette migration s'exécute après la création des modèles ET des champs sécurité.
    """
    CustomUser = apps.get_model('accounts', 'CustomUser')
    Organization = apps.get_model('accounts', 'Organization')
    Membership = apps.get_model('accounts', 'Membership')
    
    # Configuration depuis .env
    admin_email = config('SUPER_ADMIN_EMAIL', default='admin@sdgps.com')
    admin_password = config('SUPER_ADMIN_PASSWORD', default=None)
    org_name = config('SUPER_ADMIN_ORG_NAME', default='SDGPS Administration')
    org_code = config('SUPER_ADMIN_ORG_CODE', default=None)
    
    # Vérifier si déjà existant
    if CustomUser.objects.filter(email=admin_email).exists():
        print(f"⚠️  Super admin '{admin_email}' déjà existant - Migration ignorée")
        return
    
    # Générer mot de passe si non fourni
    password_generated = False
    if not admin_password:
        admin_password = ''.join(random.choices(string.ascii_letters + string.digits + '!@#$%^&*', k=16))
        password_generated = True
    
    # Générer code organisation si non fourni
    if not org_code:
        prefix = ''.join(e for e in org_name.upper() if e.isalnum())[:8]
        suffix = random.randint(1000, 9999)
        org_code = f"{prefix}-{suffix}"
        
        # Assurer unicité
        while Organization.objects.filter(code=org_code).exists():
            suffix = random.randint(1000, 9999)
            org_code = f"{prefix}-{suffix}"
    
    # Afficher credentials
    print("\n" + "="*70)
    print("🔐 SUPER ADMIN CRÉÉ - CONSERVEZ CES IDENTIFIANTS")
    print("="*70)
    print(f"📧 Email: {admin_email}")
    print(f"🔑 Mot de passe: {admin_password}")
    if password_generated:
        print("   ⚠️  Mot de passe généré automatiquement")
    else:
        print("   ✓ Mot de passe défini dans .env")
    print(f"🏢 Organisation: {org_name}")
    print(f"🔖 Code Org: {org_code}")
    print("="*70)
    print("⚠️  IMPORTANT: Changez ce mot de passe dès la première connexion!")
    print("="*70 + "\n")
    
    # Créer l'utilisateur super admin AVEC flag must_change_password
    from django.contrib.auth.hashers import make_password
    
    super_admin = CustomUser.objects.create(
        username=admin_email,
        email=admin_email,
        password=make_password(admin_password),  # Hashage du mot de passe
        nom='Super',
        prenom='Admin',
        nom_societe='SDGPS Administration',
        is_staff=True,
        is_superuser=True,
        must_change_password=True,  # ← FORCER CHANGEMENT MDP
        password_changed_at=None
    )
    
    # Créer l'organisation
    organization = Organization.objects.create(
        name=org_name,
        code=org_code,
        description=f'Organisation système créée pour le super admin {admin_email}'
    )
    
    # Créer l'adhésion avec rôle ADMIN
    Membership.objects.create(
        user=super_admin,
        organization=organization,
        role='ADMIN'
    )
    
    print(f"✅ Super admin '{admin_email}' configuré avec forçage changement MDP")
    print("   À la première connexion, il devra définir un nouveau mot de passe\n")


def remove_super_admin(apps, schema_editor):
    """Rollback: supprime le super admin et son organisation."""
    CustomUser = apps.get_model('accounts', 'CustomUser')
    Organization = apps.get_model('accounts', 'Organization')
    Membership = apps.get_model('accounts', 'Membership')
    
    from decouple import config
    admin_email = config('SUPER_ADMIN_EMAIL', default='admin@sdgps.com')
    
    try:
        super_admin = CustomUser.objects.get(email=admin_email)
        membership = Membership.objects.get(user=super_admin)
        organization = membership.organization
        
        # Supprimer dans l'ordre inverse (foreign keys)
        membership.delete()
        organization.delete()
        super_admin.delete()
        
        print(f"🗑️  Super admin '{admin_email}' et organisation supprimés")
    except CustomUser.DoesNotExist:
        print(f"⚠️  Super admin '{admin_email}' n'existe pas - Rollback ignoré")


class Migration(migrations.Migration):
    """
    Migration complète qui :
    1. Crée les modèles CustomUser, Organization, Membership avec tous les champs
    2. Crée le modèle PasswordResetToken
    3. Crée le super admin avec forçage changement MDP activé
    """
    
    initial = True
    
    dependencies = [
        ('auth', '0012_alter_user_first_name_max_length'),
    ]

    operations = [
        # ==========================================
        # 1. CRÉATION DU MODÈLE CUSTOMUSER
        # ==========================================
        migrations.CreateModel(
            name='CustomUser',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('password', models.CharField(max_length=128, verbose_name='password')),
                ('last_login', models.DateTimeField(blank=True, null=True, verbose_name='last login')),
                ('is_superuser', models.BooleanField(default=False, help_text='Designates that this user has all permissions without explicitly assigning them.', verbose_name='superuser status')),
                ('first_name', models.CharField(blank=True, max_length=150, verbose_name='first name')),
                ('last_name', models.CharField(blank=True, max_length=150, verbose_name='last name')),
                ('is_staff', models.BooleanField(default=False, help_text='Designates whether the user can log into this admin site.', verbose_name='staff status')),
                ('is_active', models.BooleanField(default=True, help_text='Designates whether this user should be treated as active. Unselect this instead of deleting accounts.', verbose_name='active')),
                ('date_joined', models.DateTimeField(auto_now_add=True, verbose_name='date joined')),
                ('username', models.CharField(blank=True, max_length=150)),
                ('nom', models.CharField(blank=True, max_length=100)),
                ('prenom', models.CharField(blank=True, max_length=100)),
                ('nom_societe', models.CharField(blank=True, max_length=200)),
                ('email', models.EmailField(max_length=254, unique=True, verbose_name='Adresse email')),
                # Champs sécurité mot de passe
                ('must_change_password', models.BooleanField(default=False, help_text="L'utilisateur doit changer son mot de passe à la prochaine connexion", verbose_name='Doit changer le mot de passe')),
                ('password_changed_at', models.DateTimeField(blank=True, null=True, verbose_name='Date dernier changement MDP')),
                ('groups', models.ManyToManyField(blank=True, help_text='The groups this user belongs to. A user will get all permissions granted to each of their groups.', related_name='user_set', related_query_name='user', to='auth.group', verbose_name='groups')),
                ('user_permissions', models.ManyToManyField(blank=True, help_text='Specific permissions for this user.', related_name='user_set', related_query_name='user', to='auth.permission', verbose_name='user permissions')),
            ],
            options={
                'verbose_name': 'user',
                'verbose_name_plural': 'users',
            },
        ),
        
        # ==========================================
        # 2. CRÉATION DU MODÈLE ORGANIZATION
        # ==========================================
        migrations.CreateModel(
            name='Organization',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=200, verbose_name="Nom de l'organisation")),
                ('code', models.CharField(db_index=True, help_text="Code unique pour rejoindre l'organisation", max_length=50, unique=True, verbose_name="Code d'organisation")),
                ('description', models.TextField(blank=True, null=True, verbose_name='Description')),
                ('is_active', models.BooleanField(default=True, verbose_name='Active')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Organisation',
                'verbose_name_plural': 'Organisations',
                'ordering': ['name'],
            },
        ),
        
        # ==========================================
        # 3. CRÉATION DU MODÈLE MEMBERSHIP
        # ==========================================
        migrations.CreateModel(
            name='Membership',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('role', models.CharField(choices=[('ADMIN', 'Administrateur'), ('MANAGER', 'Gestionnaire'), ('USER', 'Utilisateur')], default='USER', max_length=10, verbose_name='Rôle')),
                ('joined_at', models.DateTimeField(auto_now_add=True)),
                ('is_active', models.BooleanField(default=True, verbose_name='Membre actif')),
                ('organization', models.ForeignKey(on_delete=models.deletion.CASCADE, related_name='members', to='accounts.organization', verbose_name='Organisation')),
                ('user', models.ForeignKey(on_delete=models.deletion.CASCADE, related_name='memberships', to='accounts.customuser', verbose_name='Utilisateur')),
            ],
            options={
                'verbose_name': 'Adhésion',
                'verbose_name_plural': 'Adhésions',
                'ordering': ['-joined_at'],
            },
        ),
        
        # Contrainte unique : un utilisateur ne peut avoir qu'un rôle par org
        migrations.AlterUniqueTogether(
            name='membership',
            unique_together={('user', 'organization')},
        ),
        
        # ==========================================
        # 4. CRÉATION DU MODÈLE PASSWORDRESETTOKEN
        # ==========================================
        migrations.CreateModel(
            name='PasswordResetToken',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('token', models.CharField(db_index=True, max_length=255, unique=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('expires_at', models.DateTimeField()),
                ('used', models.BooleanField(default=False)),
                ('ip_address', models.GenericIPAddressField(blank=True, null=True)),
                ('user', models.ForeignKey(on_delete=models.deletion.CASCADE, related_name='reset_tokens', to='accounts.customuser', verbose_name='Utilisateur')),
            ],
            options={
                'verbose_name': 'Token de Réinitialisation',
                'verbose_name_plural': 'Tokens de Réinitialisation',
                'ordering': ['-created_at'],
            },
        ),
        
        # ==========================================
        # 5. CRÉATION DU SUPER ADMIN
        # ==========================================
        migrations.RunPython(create_super_admin, remove_super_admin),
    ]
