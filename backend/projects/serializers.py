"""Sérialiseurs DRF du domaine métier, avec validations conditionnelles."""
from rest_framework import serializers

from .models import Projet, Propriete, Affaire, Ssdgps, Session
from .validators import validate_affaire_coherence


class ProjetSerializer(serializers.ModelSerializer):
    statut_display = serializers.CharField(source='get_statut_display', read_only=True)
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    # Alimentés par l'annotation de queryset dans ProjetViewSet._annotate_counts
    nbr_total_proprietes = serializers.IntegerField(read_only=True)
    nbr_total_affaires = serializers.IntegerField(read_only=True)
    nbr_total_ssdgps = serializers.IntegerField(read_only=True)
    nbr_total_sessions = serializers.IntegerField(read_only=True)

    class Meta:
        model = Projet
        fields = [
            'id', 'nom_projet', 'description_projet', 'code_projet',
            'organization', 'organization_name', 'statut', 'statut_display',
            'nbr_total_proprietes', 'nbr_total_affaires', 'nbr_total_ssdgps', 'nbr_total_sessions',
            'created_at', 'updated_at', 'is_deleted', 'deleted_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'is_deleted', 'deleted_at']

    def validate_code_projet(self, value):
        qs = Projet.objects.filter(code_projet=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("Ce code projet est déjà utilisé.")
        return value


class ProprieteSerializer(serializers.ModelSerializer):
    nbr_total_affaires = serializers.IntegerField(read_only=True)
    nbr_total_ssdgps = serializers.IntegerField(read_only=True)
    nbr_total_sessions = serializers.IntegerField(read_only=True)

    class Meta:
        model = Propriete
        fields = [
            'id', 'nom_propriete', 'id_requisition', 'id_titre', 'projet',
            'nbr_total_affaires', 'nbr_total_ssdgps', 'nbr_total_sessions',
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
    nbr_total_ssdgps = serializers.IntegerField(read_only=True)
    nbr_total_sessions = serializers.IntegerField(read_only=True)

    class Meta:
        model = Affaire
        fields = [
            'id', 'numero_sd_affaire', 'nature_procedure_affaire', 'nature_affaire',
            'date_bornage', 'propriete', 'nbr_total_ssdgps', 'nbr_total_sessions',
            'created_at', 'updated_at', 'is_deleted', 'deleted_at',
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
    nbr_total_sessions = serializers.IntegerField(read_only=True)

    class Meta:
        model = Ssdgps
        fields = [
            'id', 'nature_ssdgps', 'numero_ssdgps', 'type_ssdgps', 'affaire',
            'nbr_total_sessions', 'created_at', 'updated_at', 'is_deleted', 'deleted_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'is_deleted', 'deleted_at']


class SessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Session
        fields = ['id', 'ssdgps', 'numero_session', 'date_session', 'created_at', 'updated_at', 'is_deleted', 'deleted_at']
        read_only_fields = ['id', 'created_at', 'updated_at', 'is_deleted', 'deleted_at']
