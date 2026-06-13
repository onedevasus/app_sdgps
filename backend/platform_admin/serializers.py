"""
Sérialiseurs pour la gestion du profil utilisateur Super Admin
"""
from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
import re

User = get_user_model()


class SuperAdminProfileSerializer(serializers.ModelSerializer):
    """
    Sérialiseur pour la consultation et modification du profil Super Admin
    
    Champs en lecture seule : email, role, date_joined
    Champs modifiables : first_name, last_name, nom_societe
    """
    
    # Champs calculés pour l'affichage
    full_name = serializers.SerializerMethodField()
    role = serializers.CharField(source='get_primary_role', read_only=True)
    role_display = serializers.CharField(source='get_primary_role_display', read_only=True)
    profile_picture_url = serializers.SerializerMethodField()  # URL complète de la photo
    
    class Meta:
        model = User
        fields = [
            'id',
            'email',
            'first_name',
            'last_name',
            'full_name',
            'nom_societe',  # Remplace phone par nom_societe
            'role',
            'role_display',
            'date_joined',
            'last_login',
            'last_connection_at',  # ← AJOUT: Dernière connexion personnalisée
            'password_changed_at',  # ← AJOUT: Date dernière modification MDP
            'profile_picture',     # ← AJOUT: Photo de profil (upload)
            'profile_picture_url', # ← AJOUT: URL complète photo
        ]
        read_only_fields = [
            'id',
            'email',
            'role',
            'role_display',
            'date_joined',
            'last_login',
            'last_connection_at',  # ← Lecture seule
            'password_changed_at',  # ← Lecture seule
        ]
    
    def get_full_name(self, obj):
        """Retourne le nom complet formaté"""
        return f"{obj.first_name} {obj.last_name}".strip() or obj.email
    
    def get_profile_picture_url(self, obj):
        """Retourne l'URL complète de la photo de profil"""
        if obj.profile_picture:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.profile_picture.url)
            return obj.profile_picture.url
        return None
    
    def validate_email(self, value):
        """
        Validation email unique (sauf si c'est l'email actuel)
        """
        user = self.context['request'].user
        
        if User.objects.filter(email=value).exclude(pk=user.pk).exists():
            raise serializers.ValidationError(
                "Cet email est déjà utilisé par un autre compte."
            )
        
        # Validation format email
        email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_regex, value):
            raise serializers.ValidationError(
                "Format d'email invalide."
            )
        
        return value
    
    def validate_nom_societe(self, value):
        """Validation nom de société"""
        if value and len(value.strip()) < 2:
            raise serializers.ValidationError(
                "Le nom de société doit contenir au moins 2 caractères."
            )
        return value.strip() if value else value
    
    def validate_first_name(self, value):
        """Validation prénom"""
        if len(value.strip()) < 2:
            raise serializers.ValidationError(
                "Le prénom doit contenir au moins 2 caractères."
            )
        return value.strip()
    
    def validate_last_name(self, value):
        """Validation nom"""
        if len(value.strip()) < 2:
            raise serializers.ValidationError(
                "Le nom doit contenir au moins 2 caractères."
            )
        return value.strip()
    
    def update(self, instance, validated_data):
        """
        Mise à jour du profil avec logging
        Supporte l'upload de photo de profil
        """
        request = self.context['request']
        
        # Champs modifiables (selon modèle CustomUser)
        updatable_fields = ['first_name', 'last_name', 'nom_societe', 'profile_picture']
        
        for field in updatable_fields:
            if field in validated_data:
                setattr(instance, field, validated_data[field])
        
        instance.save(update_fields=updatable_fields)
        
        # Log de la modification (optionnel - pour audit)
        print(f"📝 Profil Super Admin modifié par: {instance.email}")
        
        return instance


class ChangePasswordSerializer(serializers.Serializer):
    """
    Sérialiseur pour le changement de mot de passe
    """
    current_password = serializers.CharField(
        required=True,
        write_only=True,
        style={'input_type': 'password'}
    )
    new_password = serializers.CharField(
        required=True,
        write_only=True,
        style={'input_type': 'password'},
        min_length=8
    )
    confirm_password = serializers.CharField(
        required=True,
        write_only=True,
        style={'input_type': 'password'}
    )
    
    def validate_current_password(self, value):
        """Vérifie que le mot de passe actuel est correct"""
        user = self.context['request'].user
        
        if not user.check_password(value):
            raise serializers.ValidationError(
                "Le mot de passe actuel est incorrect."
            )
        
        return value
    
    def validate_new_password(self, value):
        """
        Validation mot de passe fort
        """
        errors = []
        
        if len(value) < 8:
            errors.append("Au moins 8 caractères")
        
        if not re.search(r'[A-Z]', value):
            errors.append("Au moins une majuscule")
        
        if not re.search(r'[a-z]', value):
            errors.append("Au moins une minuscule")
        
        if not re.search(r'\d', value):
            errors.append("Au moins un chiffre")
        
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', value):
            errors.append("Au moins un caractère spécial")
        
        if errors:
            raise serializers.ValidationError(
                f"Mot de passe trop faible: {'; '.join(errors)}"
            )
        
        # Vérifier que le nouveau mot de passe n'est pas identique à l'ancien
        user = self.context['request'].user
        if user.check_password(value):
            raise serializers.ValidationError(
                "Le nouveau mot de passe doit être différent de l'actuel."
            )
        
        return value
    
    def validate(self, attrs):
        """Vérifie que les mots de passe correspondent"""
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError({
                'confirm_password': "Les mots de passe ne correspondent pas."
            })
        
        return attrs
