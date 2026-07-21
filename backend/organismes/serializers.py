"""Sérialiseurs DRF des organismes premier / deuxième niveau."""
from rest_framework import serializers

from .models import OrganismeNiveau1, OrganismeNiveau2


class _OrganismeBaseSerializer(serializers.ModelSerializer):
    """Champs communs + normalisation/unicité du `code` et méta d'audit en lecture."""
    # `allow_null=True` : sans lui, DRF « saute » le champ (SkipField) quand l'auteur est
    # nul (données amorcées, lignes jamais modifiées/supprimées) → le champ disparaîtrait
    # de la réponse au lieu de valoir null.
    created_by_email = serializers.EmailField(source='created_by.email', read_only=True, allow_null=True)
    updated_by_email = serializers.EmailField(source='updated_by.email', read_only=True, allow_null=True)
    deleted_by_email = serializers.EmailField(source='deleted_by.email', read_only=True, allow_null=True)

    # Modèle concret défini par les sous-classes.
    model = None

    class Meta:
        model = None
        fields = [
            'id', 'code', 'nom', 'sigle', 'is_active',
            'created_at', 'updated_at', 'is_deleted', 'deleted_at',
            'created_by_email', 'updated_by_email', 'deleted_by_email',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'is_deleted', 'deleted_at']

    def validate_code(self, value):
        value = (value or '').strip().upper()
        qs = self.Meta.model.objects.filter(code=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("Ce code est déjà utilisé.")
        return value


class OrganismeNiveau1Serializer(_OrganismeBaseSerializer):
    nbr_niveaux2 = serializers.IntegerField(read_only=True)

    class Meta(_OrganismeBaseSerializer.Meta):
        model = OrganismeNiveau1
        fields = _OrganismeBaseSerializer.Meta.fields + ['nbr_niveaux2']


class OrganismeNiveau2Serializer(_OrganismeBaseSerializer):
    niveau1_nom = serializers.CharField(source='niveau1.nom', read_only=True)

    class Meta(_OrganismeBaseSerializer.Meta):
        model = OrganismeNiveau2
        fields = _OrganismeBaseSerializer.Meta.fields + ['niveau1', 'niveau1_nom', 'ville']

    def validate_niveau1(self, value):
        if value.is_deleted:
            raise serializers.ValidationError(
                "Cet organisme de premier niveau est supprimé.")
        return value
