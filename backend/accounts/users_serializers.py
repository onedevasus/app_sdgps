from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Membership, Organization
import secrets
import string

User = get_user_model()


class UserListSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()
    role_display = serializers.SerializerMethodField()
    organization_name = serializers.SerializerMethodField()
    organization_id = serializers.SerializerMethodField()
    is_superuser = serializers.BooleanField(read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'nom_societe',
            'is_active', 'is_superuser', 'is_deleted', 'platform_role',
            'role', 'role_display', 'organization_name', 'organization_id',
            'last_connection_at', 'password_changed_at',
            'must_change_password', 'date_joined',
        ]

    def get_role(self, obj):
        return obj.get_primary_role()

    def get_role_display(self, obj):
        return obj.get_primary_role_display()

    def get_organization_name(self, obj):
        org = obj.get_primary_organization()
        return org.name if org else None

    def get_organization_id(self, obj):
        org = obj.get_primary_organization()
        return str(org.id) if org else None


class UserDetailSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()
    role_display = serializers.SerializerMethodField()
    organization_name = serializers.SerializerMethodField()
    organization_id = serializers.SerializerMethodField()
    memberships = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'nom_societe',
            'is_active', 'is_superuser', 'is_deleted', 'deleted_at', 'platform_role',
            'role', 'role_display', 'organization_name', 'organization_id',
            'memberships',
            'last_connection_at', 'password_changed_at',
            'must_change_password', 'date_joined',
        ]
        read_only_fields = ['id', 'email', 'date_joined', 'last_connection_at',
                           'password_changed_at', 'deleted_at', 'is_superuser']

    def get_role(self, obj):
        return obj.get_primary_role()

    def get_role_display(self, obj):
        return obj.get_primary_role_display()

    def get_organization_name(self, obj):
        org = obj.get_primary_organization()
        return org.name if org else None

    def get_organization_id(self, obj):
        org = obj.get_primary_organization()
        return str(org.id) if org else None

    def get_memberships(self, obj):
        memberships = obj.memberships.filter(is_active=True).select_related('organization')
        return [
            {
                'organization_id': str(m.organization.id),
                'organization_name': m.organization.name,
                'role': m.role,
                'role_display': m.get_role_display(),
                'joined_at': m.joined_at,
            }
            for m in memberships
        ]


class BlankableUUIDField(serializers.UUIDField):
    """
    UUIDField that accepts empty strings as None.
    """
    def to_internal_value(self, data):
        if data == '':
            return None
        return super().to_internal_value(data)


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    role = serializers.ChoiceField(
        choices=['ROLE_ORGANISATION_ADMIN', 'ROLE_ORGANISATION_AGENT', 'ROLE_ADMIN_SYSTEME'],
        default='ROLE_ORGANISATION_AGENT'
    )
    organization_id = BlankableUUIDField(required=False, allow_null=True)
    must_change_password = serializers.BooleanField(default=True)

    class Meta:
        model = User
        fields = [
            'email', 'first_name', 'last_name', 'nom_societe',
            'password', 'role', 'organization_id', 'must_change_password',
        ]

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Cet email est déjà utilisé.")
        return value

    def validate_role(self, value):
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            if request.user.is_superuser:
                return value
            if value == 'ROLE_ADMIN_SYSTEME':
                raise serializers.ValidationError(
                    "Seul un Super Admin peut créer un compte Admin Système."
                )
        return value

    def validate_organization_id(self, value):
        role = self.initial_data.get('role', 'ROLE_ORGANISATION_AGENT')
        if role == 'ROLE_ADMIN_SYSTEME':
            return None
        if not value:
            raise serializers.ValidationError("Ce champ est obligatoire.")
        if not Organization.objects.filter(id=value, is_active=True, is_deleted=False).exists():
            raise serializers.ValidationError("L'organisation spécifiée n'existe pas.")
        return value

    def create(self, validated_data):
        role = validated_data.pop('role')
        organization_id = validated_data.pop('organization_id', None)
        must_change_password = validated_data.pop('must_change_password', True)

        is_app_admin = role == 'ROLE_ADMIN_SYSTEME'

        user = User.objects.create_user(
            username=validated_data['email'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            nom_societe=validated_data.get('nom_societe', ''),
            is_superuser=False,
            platform_role='ROLE_ADMIN_SYSTEME' if is_app_admin else None,
            must_change_password=must_change_password,
        )

        if organization_id and not is_app_admin:
            organization = Organization.objects.get(id=organization_id)
            Membership.objects.create(
                user=user,
                organization=organization,
                role=role,
            )

        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    role = serializers.ChoiceField(
        choices=['ROLE_ORGANISATION_ADMIN', 'ROLE_ORGANISATION_AGENT', 'ROLE_ADMIN_SYSTEME'],
        required=False
    )
    organization_id = BlankableUUIDField(required=False, allow_null=True)

    class Meta:
        model = User
        fields = [
            'first_name', 'last_name', 'nom_societe',
            'is_active', 'role', 'organization_id',
        ]

    def validate_role(self, value):
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            if value == 'ROLE_ADMIN_SYSTEME' and not request.user.is_superuser:
                raise serializers.ValidationError(
                    "Seul un Super Admin peut attribuer le rôle Admin Système."
                )
            if self.instance and self.instance.pk == request.user.pk:
                if request.user.is_superuser or request.user.is_platform_admin():
                    if value != self.instance.get_primary_role():
                        raise serializers.ValidationError(
                            "Vous ne pouvez pas modifier votre propre rôle."
                        )
        return value

    def update(self, instance, validated_data):
        role = validated_data.pop('role', None)
        organization_id = validated_data.pop('organization_id', None)

        if instance.is_superuser:
            if role is not None:
                raise serializers.ValidationError(
                    {'role': 'Impossible de modifier le rôle d\'un super administrateur.'}
                )
            if 'is_active' in validated_data:
                request = self.context.get('request')
                if request and request.user.pk != instance.pk:
                    raise serializers.ValidationError(
                        {'is_active': 'Utilisez l\'action Désactiver/Activer pour modifier le statut d\'un super administrateur.'}
                    )
            organization_id = None  # Les super admins n'ont pas d'organisation

        if instance.is_platform_admin():
            if role is not None:
                request = self.context.get('request')
                if request and request.user.pk == instance.pk:
                    raise serializers.ValidationError(
                        {'role': 'Vous ne pouvez pas modifier votre propre rôle.'}
                    )

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        is_app_admin = role == 'ROLE_ADMIN_SYSTEME'

        if is_app_admin:
            instance.platform_role = 'ROLE_ADMIN_SYSTEME'
            organization_id = None  # Les admins système n'ont pas d'organisation
        elif role and instance.platform_role and role != 'ROLE_ADMIN_SYSTEME':
            instance.platform_role = None

        if organization_id:
            organization = Organization.objects.get(id=organization_id)
            membership, created = Membership.objects.get_or_create(
                user=instance,
                organization=organization,
                defaults={'role': role or 'ROLE_ORGANISATION_AGENT', 'is_active': True},
            )
            if not created:
                if role and not is_app_admin:
                    membership.role = role
                membership.is_active = True
                membership.save()
        elif role and not is_app_admin:
            membership = instance.memberships.filter(is_active=True).first()
            if membership:
                membership.role = role
                membership.save()

        instance.save()
        return instance


class RoleSerializer(serializers.Serializer):
    id = serializers.CharField()
    name = serializers.CharField()
    description = serializers.CharField()
    permissions = serializers.ListField(child=serializers.CharField())
    user_count = serializers.IntegerField()


class ResetPasswordSerializer(serializers.Serializer):
    new_password = serializers.CharField(min_length=8, required=False)
    must_change_password = serializers.BooleanField(default=True)

    def generate_password(self):
        alphabet = string.ascii_letters + string.digits + '!@#$%^&*'
        password = ''.join(secrets.choice(alphabet) for _ in range(12))
        return password
