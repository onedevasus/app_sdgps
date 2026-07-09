"""
Vues API des pièces (Phase 6.5) — CRUD + import CSV/Excel en deux phases + ordre.

`Piece.ssdgps` est toujours renseigné (c'est la portée du rapport et de l'`ordre`) ;
le scoping RBAC ne passe donc que par ce chemin unique, contrairement au design
précédent (dual ssdgps/session) — mais `PieceViewSet` n'hérite toujours pas de
`projects.views.BaseOrgScopedViewSet` car les actions `reorder`/`catalog`/`import`
et l'auto-incrémentation d'`ordre` sont spécifiques aux pièces.
"""
import json

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.db.models import Max
from django.utils import timezone
from rest_framework import viewsets, permissions, status, parsers
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from projects.views import user_org_ids
from .catalog import serialize_catalog, get_piece_def
from .imaging import extract_image_metadata, make_png_preview, NON_WEB_FORMATS
from .models import Piece, PieceImage
from .parsing import parse_uploaded_table, apply_mapping
from .serializers import PieceSerializer


class PieceViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = PieceSerializer
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]
    queryset = Piece.objects.select_related(
        'ssdgps__affaire__propriete__projet', 'session').prefetch_related('images')

    def _scope(self, qs):
        ids = user_org_ids(self.request.user)
        if ids is not None:
            qs = qs.filter(ssdgps__affaire__propriete__projet__organization_id__in=ids)
        return qs

    def get_queryset(self):
        show_deleted = self.request.query_params.get('show_deleted', '').lower() in ('true', '1', 'yes')
        qs = self._scope(self.queryset.filter(is_deleted=show_deleted))
        ssdgps_id = self.request.query_params.get('ssdgps')
        if ssdgps_id:
            # Ensemble unifié : renvoie toutes les pièces du SSDGPS, qu'elles soient
            # de niveau SSDGPS, communes, ou spécifiques à l'une de ses sessions —
            # puisque `ssdgps_id` est désormais toujours renseigné sur chaque pièce.
            qs = qs.filter(ssdgps_id=ssdgps_id)
        session_id = self.request.query_params.get('session')
        if session_id:
            qs = qs.filter(session_id=session_id)
        return qs

    def _org_scoped_queryset(self):
        """Queryset filtré par organisation, SANS filtre is_deleted (pour la restauration)."""
        return self._scope(self.queryset)

    def _check_scope(self, ssdgps):
        ids = user_org_ids(self.request.user)
        if ids is None:
            return
        if ssdgps.affaire.propriete.projet.organization_id not in ids:
            raise PermissionDenied("Vous ne pouvez créer une pièce que dans votre organisation.")

    def perform_create(self, serializer):
        ssdgps = serializer.validated_data.get('ssdgps')
        self._check_scope(ssdgps)
        max_ordre = Piece.objects.filter(ssdgps=ssdgps, is_deleted=False).aggregate(m=Max('ordre'))['m']
        serializer.save(created_by=self.request.user, ordre=(max_ordre + 1) if max_ordre is not None else 0)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)

    def perform_destroy(self, instance):
        instance.is_deleted = True
        instance.deleted_at = timezone.now()
        instance.deleted_by = self.request.user
        instance.save(update_fields=['is_deleted', 'deleted_at', 'deleted_by'])

    @action(detail=True, methods=['post'])
    def restore(self, request, pk=None):
        instance = self._org_scoped_queryset().filter(pk=pk, is_deleted=True).first()
        if instance is None:
            return Response({'detail': 'Pièce non trouvée ou non supprimée.'}, status=status.HTTP_404_NOT_FOUND)
        instance.is_deleted = False
        instance.deleted_at = None
        instance.deleted_by = None
        instance.save(update_fields=['is_deleted', 'deleted_at', 'deleted_by'])
        return Response(self.get_serializer(instance).data)

    @action(detail=False, methods=['post'], url_path='bulk-restore')
    def bulk_restore(self, request):
        ids = request.data.get('ids', [])
        if not isinstance(ids, list) or not ids:
            return Response({'detail': 'La liste ids est requise.'}, status=status.HTTP_400_BAD_REQUEST)
        qs = self._org_scoped_queryset().filter(pk__in=ids, is_deleted=True)
        restored_count = qs.count()
        qs.update(is_deleted=False, deleted_at=None, deleted_by=None)
        return Response({'restored_count': restored_count})

    @action(detail=False, methods=['get'])
    def catalog(self, request):
        """GET /api/v1/pieces/catalog/ — registre statique des types de pièces."""
        return Response(serialize_catalog())

    @action(detail=False, methods=['post'])
    def reorder(self, request):
        """
        POST /api/v1/pieces/reorder/  {ssdgps: <uuid>, ordered_ids: [<uuid>, ...]}
        Réordonne, en une transaction, TOUTES les pièces actives d'un SSDGPS (y
        compris celles issues de ses sessions) selon la liste ordered_ids fournie.
        """
        ssdgps_id = request.data.get('ssdgps')
        ordered_ids = request.data.get('ordered_ids')
        if not ssdgps_id or not isinstance(ordered_ids, list) or not ordered_ids:
            return Response({'detail': 'ssdgps et ordered_ids (liste) sont requis.'}, status=400)
        qs = self._scope(self.queryset.filter(ssdgps_id=ssdgps_id, is_deleted=False))
        pieces_by_id = {str(p.id): p for p in qs}
        if set(pieces_by_id) != {str(i) for i in ordered_ids}:
            return Response(
                {'detail': "ordered_ids doit contenir exactement l'ensemble des pièces actives de ce SSDGPS."},
                status=400,
            )
        with transaction.atomic():
            for index, pid in enumerate(ordered_ids):
                piece = pieces_by_id[str(pid)]
                if piece.ordre != index:
                    piece.ordre = index
                    piece.save(update_fields=['ordre'])
        return Response(self.get_serializer(qs.order_by('ordre'), many=True).data)

    @action(detail=True, methods=['post'])
    def move(self, request, pk=None):
        """
        POST /api/v1/pieces/{id}/move/  {position: <entier, 0-based>}
        Déplace une seule pièce à la position indiquée dans le rapport de son SSDGPS,
        en réindexant les autres pièces actives en conséquence (même mécanique que
        `reorder`, mais sans devoir renvoyer l'ensemble complet des ids depuis le client
        — pratique pour un champ de position isolé dans un formulaire d'ajout/édition).
        """
        instance = self._org_scoped_queryset().filter(pk=pk, is_deleted=False).first()
        if instance is None:
            return Response({'detail': 'Pièce non trouvée.'}, status=status.HTTP_404_NOT_FOUND)
        try:
            new_index = int(request.data.get('position'))
        except (TypeError, ValueError):
            return Response({'detail': 'position (entier) requise.'}, status=status.HTTP_400_BAD_REQUEST)

        qs = self._scope(self.queryset.filter(ssdgps_id=instance.ssdgps_id, is_deleted=False)).order_by('ordre')
        pieces_by_id = {str(p.id): p for p in qs}
        ordered_ids = list(pieces_by_id.keys())
        ordered_ids.remove(str(instance.id))
        new_index = max(0, min(new_index, len(ordered_ids)))
        ordered_ids.insert(new_index, str(instance.id))

        with transaction.atomic():
            for index, pid in enumerate(ordered_ids):
                piece = pieces_by_id[pid]
                if piece.ordre != index:
                    piece.ordre = index
                    piece.save(update_fields=['ordre'])
        instance.refresh_from_db()
        return Response(self.get_serializer(instance).data)

    # ------------------------------------------------------------------
    # Galerie multi-images d'une pièce (RDC, CLC, PPA…)
    # ------------------------------------------------------------------
    @action(detail=True, methods=['post'], url_path='images',
            parser_classes=[parsers.MultiPartParser, parsers.FormParser])
    def add_images(self, request, pk=None):
        """POST {id}/images/ (multipart) — champs : `fichiers` (multiple),
        `last_modified` (multiple, epoch ms navigateur, aligné sur `fichiers`)."""
        piece = self._org_scoped_queryset().filter(pk=pk, is_deleted=False).first()
        if piece is None:
            return Response({'detail': 'Pièce non trouvée.'}, status=status.HTTP_404_NOT_FOUND)
        files = request.FILES.getlist('fichiers')
        if not files:
            return Response({'detail': 'Aucun fichier fourni (champ « fichiers »).'}, status=400)
        last_modified = request.data.getlist('last_modified')
        max_ordre = piece.images.aggregate(m=Max('ordre'))['m']
        next_ordre = (max_ordre + 1) if max_ordre is not None else 0
        try:
            with transaction.atomic():
                for idx, f in enumerate(files):
                    lm = last_modified[idx] if idx < len(last_modified) else None
                    meta = extract_image_metadata(f, lm)
                    img = PieceImage(piece=piece, fichier=f, ordre=next_ordre + idx, **meta)
                    img.full_clean()
                    img.save()
                    # Aperçu PNG pour les formats non affichables nativement (TIFF).
                    if (img.format or '').upper() in NON_WEB_FORMATS:
                        preview = make_png_preview(img.fichier)
                        if preview:
                            img.apercu.save(f'{img.pk}.png', preview, save=True)
        except DjangoValidationError as e:
            detail = e.message_dict if hasattr(e, 'message_dict') else e.messages
            return Response({'detail': detail}, status=status.HTTP_400_BAD_REQUEST)
        piece.refresh_from_db()
        return Response(self.get_serializer(piece).data, status=status.HTTP_201_CREATED)

    # NB : id numérique explicite — sinon le regex générique capterait aussi
    # « images/reorder » (ordre alphabétique des actions DRF) et le POST de
    # réordonnancement tomberait sur cette route DELETE (→ 405).
    @action(detail=True, methods=['delete'], url_path=r'images/(?P<image_id>[0-9]+)')
    def delete_image(self, request, pk=None, image_id=None):
        """DELETE {id}/images/{image_id}/ — supprime une image (fichier + ligne)."""
        piece = self._org_scoped_queryset().filter(pk=pk).first()
        if piece is None:
            return Response({'detail': 'Pièce non trouvée.'}, status=status.HTTP_404_NOT_FOUND)
        img = piece.images.filter(pk=image_id).first()
        if img is None:
            return Response({'detail': 'Image non trouvée.'}, status=status.HTTP_404_NOT_FOUND)
        img.fichier.delete(save=False)
        img.delete()
        piece.refresh_from_db()
        return Response(self.get_serializer(piece).data)

    @action(detail=True, methods=['post'], url_path='images/reorder')
    def reorder_images(self, request, pk=None):
        """POST {id}/images/reorder/  {ordered_ids: [...]} — réindexe l'ordre de la galerie."""
        piece = self._org_scoped_queryset().filter(pk=pk).first()
        if piece is None:
            return Response({'detail': 'Pièce non trouvée.'}, status=status.HTTP_404_NOT_FOUND)
        ordered_ids = request.data.get('ordered_ids')
        if not isinstance(ordered_ids, list) or not ordered_ids:
            return Response({'detail': 'ordered_ids (liste) requis.'}, status=400)
        images_by_id = {str(i.id): i for i in piece.images.all()}
        if set(images_by_id) != {str(i) for i in ordered_ids}:
            return Response(
                {'detail': "ordered_ids doit contenir exactement les images de la pièce."},
                status=400,
            )
        with transaction.atomic():
            for index, iid in enumerate(ordered_ids):
                im = images_by_id[str(iid)]
                if im.ordre != index:
                    im.ordre = index
                    im.save(update_fields=['ordre'])
        piece.refresh_from_db()
        return Response(self.get_serializer(piece).data)

    @action(detail=False, methods=['post'], url_path='import', parser_classes=[parsers.MultiPartParser])
    def import_file(self, request):
        """
        POST /api/v1/pieces/import/  (multipart)
        Champs : fichier (requis), type_piece (requis), ssdgps (requis en phase 2),
        session (optionnelle — spécifique si renseignée, commune sinon), numero
        (requis si type répétable), mapping (JSON, absent en phase 1),
        piece_id (optionnel — met à jour cette pièce existante au lieu d'en créer une).
        - Sans `mapping` : PHASE 1 — parse et retourne un aperçu, NE PERSISTE RIEN.
        - Avec `mapping` : PHASE 2 — parse intégralement, applique le mapping,
          valide (cohérence + doublons), crée (ou met à jour si `piece_id`) la Piece.
        """
        f = request.FILES.get('fichier')
        type_piece = request.data.get('type_piece')
        if not f or not type_piece:
            return Response({'detail': 'fichier et type_piece sont requis.'}, status=400)
        try:
            piece_def = get_piece_def(type_piece)
        except KeyError:
            return Response({'detail': 'Type de pièce inconnu.'}, status=400)
        try:
            columns, rows = parse_uploaded_table(f)
        except ValueError as e:
            return Response({'detail': str(e)}, status=400)

        mapping_raw = request.data.get('mapping')
        if not mapping_raw:
            # --- Phase 1 : aperçu ---
            return Response({
                'columns': columns,
                'preview_rows': rows[:20],
                'total_rows': len(rows),
                'champs': piece_def['champs'],
            })

        # --- Phase 2 : confirmation ---
        try:
            mapping = json.loads(mapping_raw)
        except (json.JSONDecodeError, TypeError):
            return Response({'detail': 'mapping invalide (JSON attendu).'}, status=400)

        mapped_rows = apply_mapping(columns, rows, mapping)
        payload = {'rows': mapped_rows}

        data = {
            'type_piece': type_piece,
            'ssdgps': request.data.get('ssdgps') or None,
            'session': request.data.get('session') or None,
            'numero': request.data.get('numero') or None,
            'payload': payload,
            'source_saisie': 'import',
            'fichier': f,
        }

        piece_id = request.data.get('piece_id')
        if piece_id:
            # Ré-import : on remplace uniquement les données et le fichier ; l'identité
            # de la pièce (ssdgps/session/numéro/type) reste inchangée. Ne PAS repasser
            # `ssdgps` ici — le front ne le renvoie pas, et un `ssdgps=None` ferait
            # échouer la validation du FK non-null.
            instance = self._org_scoped_queryset().filter(pk=piece_id, is_deleted=False).first()
            if instance is None:
                return Response({'detail': 'Pièce introuvable.'}, status=status.HTTP_404_NOT_FOUND)
            update_data = {'payload': payload, 'source_saisie': 'import', 'fichier': f}
            serializer = self.get_serializer(instance, data=update_data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save(updated_by=request.user)
            return Response(serializer.data)

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        ssdgps = serializer.validated_data.get('ssdgps')
        self._check_scope(ssdgps)
        max_ordre = Piece.objects.filter(ssdgps=ssdgps, is_deleted=False).aggregate(m=Max('ordre'))['m']
        serializer.save(created_by=request.user, ordre=(max_ordre + 1) if max_ordre is not None else 0)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
