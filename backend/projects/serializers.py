"""Sérialiseurs DRF du domaine métier, avec validations conditionnelles."""
from rest_framework import serializers

from .models import Projet, Propriete, Affaire, Ssdgps, Session
from .validators import validate_affaire_coherence


class ProjetSerializer(serializers.ModelSerializer):
    statut_display = serializers.CharField(source='get_statut_display', read_only=True)
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    proprietes_count = serializers.SerializerMethodField()

    class Meta:
        model = Projet
        fields = [
            'id', 'nom_projet', 'description_projet', 'code_projet',
            'organization', 'organization_name', 'statut', 'statut_display',
            'proprietes_count', 'created_at', 'updated_at', 'is_deleted', 'deleted_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'is_deleted', 'deleted_at']

    def get_proprietes_count(self, obj):
        return obj.proprietes.filter(is_deleted=False).count()

    def validate_code_projet(self, value):
        qs = Projet.objects.filter(code_projet=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("Ce code projet est déjà utilisé.")
        return value


class ProprieteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Propriete
        fields = [
            'id', 'nom_propriete', 'id_requisition', 'id_titre', 'projet',
            'created_at', 'updated_at', 'is_deleted', 'deleted_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'is_deleted', 'deleted_at']

    def validate(self, attrs):
        req = attrs.get('id_requisition', getattr(self.instance, 'id_requisition', ''))
        titre = attrs.get('id_titre', getattr(self.instance, 'id_titre', ''))
        if not req and not titre:
            raise serializers.ValidationError(
                "Renseignez au moins la réquisition ou le titre foncier."
            )
        return attrs


class AffaireSerializer(serializers.ModelSerializer):
    class Meta:
        model = Affaire
        fields = [
            'id', 'numero_sd_affaire', 'nature_procedure_affaire', 'nature_affaire',
            'date_bornage', 'propriete', 'created_at', 'updated_at', 'is_deleted', 'deleted_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'is_deleted', 'deleted_at']

    def validate(self, attrs):
        inst = self.instance
        procedure = attrs.get('nature_procedure_affaire', getattr(inst, 'nature_procedure_affaire', None))
        nature = attrs.get('nature_affaire', getattr(inst, 'nature_affaire', None))
        date_bornage = attrs.get('date_bornage', getattr(inst, 'date_bornage', None))
        # Réutilise la règle métier partagée (lève ValidationError avec dict de champs)
        validate_affaire_coherence(procedure, nature, date_bornage)
        return attrs


class SsdgpsSerializer(serializers.ModelSerializer):
    sessions_count = serializers.SerializerMethodField()

    class Meta:
        model = Ssdgps
        fields = [
            'id', 'nature_ssdgps', 'numero_ssdgps', 'type_ssdgps', 'affaire',
            'sessions_count', 'created_at', 'updated_at', 'is_deleted', 'deleted_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'is_deleted', 'deleted_at']

    def get_sessions_count(self, obj):
        return obj.sessions.filter(is_deleted=False).count()


class SessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Session
        fields = ['id', 'ssdgps', 'numero_session', 'date_session', 'created_at', 'updated_at', 'is_deleted', 'deleted_at']
        read_only_fields = ['id', 'created_at', 'updated_at', 'is_deleted', 'deleted_at']
