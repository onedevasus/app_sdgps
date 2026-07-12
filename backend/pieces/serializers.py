from rest_framework import serializers

from .models import Piece, PieceImage
from .validators import validate_piece_coherence, points_without_photo


class PieceImageSerializer(serializers.ModelSerializer):
    fichier_url = serializers.SerializerMethodField()
    apercu_url = serializers.SerializerMethodField()

    class Meta:
        model = PieceImage
        fields = [
            'id', 'fichier_url', 'apercu_url', 'ordre', 'point_ref', 'format',
            'taille_octets', 'largeur', 'hauteur', 'mode_couleur', 'compression',
            'date_creation', 'date_modification', 'created_at',
        ]

    def _abs_url(self, field):
        request = self.context.get('request')
        if field and request:
            return request.build_absolute_uri(field.url)
        return field.url if field else None

    def get_fichier_url(self, obj):
        return self._abs_url(obj.fichier)

    def get_apercu_url(self, obj):
        return self._abs_url(obj.apercu)


class PieceSerializer(serializers.ModelSerializer):
    type_piece_display = serializers.CharField(source='get_type_piece_display', read_only=True)
    fichier_url = serializers.SerializerMethodField()
    organization_id = serializers.UUIDField(read_only=True)
    session_numero = serializers.IntegerField(
        source='session.numero_session', read_only=True, allow_null=True, default=None)
    niveau = serializers.SerializerMethodField()
    portee = serializers.SerializerMethodField()
    created_by_email = serializers.EmailField(source='created_by.email', read_only=True)
    updated_by_email = serializers.EmailField(source='updated_by.email', read_only=True)
    deleted_by_email = serializers.EmailField(source='deleted_by.email', read_only=True)
    images = PieceImageSerializer(many=True, read_only=True)

    class Meta:
        model = Piece
        fields = [
            'id', 'type_piece', 'type_piece_display', 'numero', 'ssdgps', 'session',
            'session_numero', 'niveau', 'portee', 'ordre',
            'fichier', 'fichier_url', 'images', 'payload', 'source_saisie', 'statut',
            'commentaire', 'organization_id', 'created_at', 'updated_at', 'is_deleted',
            'deleted_at', 'created_by_email', 'updated_by_email', 'deleted_by_email',
        ]
        read_only_fields = ['id', 'ordre', 'created_at', 'updated_at', 'is_deleted', 'deleted_at']

    def get_fichier_url(self, obj):
        request = self.context.get('request')
        if obj.fichier and request:
            return request.build_absolute_uri(obj.fichier.url)
        return obj.fichier.url if obj.fichier else None

    def get_niveau(self, obj):
        """
        Niveau réel de CETTE pièce — un choix libre de l'utilisateur (matérialisé par
        la présence ou non de `session`), indépendant du niveau par défaut suggéré par
        le catalogue pour son `type_piece` (cf. `validators.validate_piece_coherence`).
        """
        return 'session' if obj.session_id else 'ssdgps'

    def get_portee(self, obj):
        return self.get_niveau(obj)

    def validate(self, attrs):
        inst = self.instance
        type_piece = attrs.get('type_piece', getattr(inst, 'type_piece', None))
        ssdgps = attrs.get('ssdgps', getattr(inst, 'ssdgps', None))
        session = attrs.get('session', getattr(inst, 'session', None))
        numero = attrs.get('numero', getattr(inst, 'numero', None))
        source_saisie = attrs.get('source_saisie', getattr(inst, 'source_saisie', None))
        validate_piece_coherence(
            type_piece, ssdgps, session, numero, source_saisie,
            exclude_pk=inst.pk if inst else None,
        )

        # PPA/PPN : le passage du statut à « valide » exige qu'au moins une photo soit
        # rattachée à chaque point. On ne contrôle qu'à la TRANSITION vers `valide`.
        statut = attrs.get('statut', getattr(inst, 'statut', None))
        was_valide = getattr(inst, 'statut', None) == 'valide'
        if inst and statut == 'valide' and not was_valide:
            payload = attrs.get('payload', inst.payload)
            refs = list(inst.images.values_list('point_ref', flat=True))
            missing = points_without_photo(type_piece, payload, refs)
            if missing:
                shown = ', '.join(missing[:10]) + ('…' if len(missing) > 10 else '')
                raise serializers.ValidationError({'statut': (
                    f"Validation impossible : {len(missing)} point(s) sans photo ({shown}). "
                    "Chaque point doit avoir au moins une photo."
                )})
        return attrs
