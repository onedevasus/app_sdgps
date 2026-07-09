"""
Modèle générique des pièces d'un rapport SSDGPS (Phase 6.5).

Fondation légère du modèle `Piece` complet prévu en Phase 6 (§7.3 du plan de dev) :
un type de pièce (registre statique `catalog.py`), une source de saisie (image,
import CSV/Excel, saisie manuelle, générée automatiquement), une position dans le
rapport (`ordre`) et des données structurées (`payload` JSON) et/ou un fichier.
"""
from django.db import models

from projects.models import BaseModel, Ssdgps, Session
from .catalog import PIECE_CHOICES
from .validators import (
    validate_piece_file_extension, validate_piece_file_size,
    validate_piece_image_extension, validate_image_content,
)


def piece_upload_path(instance, filename):
    return f'pieces/{instance.ssdgps_id}/{instance.type_piece}/{filename}'


def piece_image_upload_path(instance, filename):
    piece = instance.piece
    return f'pieces/{piece.ssdgps_id}/{piece.type_piece}/images/{filename}'


def piece_image_preview_path(instance, filename):
    piece = instance.piece
    return f'pieces/{piece.ssdgps_id}/{piece.type_piece}/images/previews/{filename}'


class Piece(BaseModel):
    """Pièce jointe au rapport d'un SSDGPS. `ssdgps` est toujours renseigné (c'est
    la portée du rapport et de l'ordre `ordre`) ; `session` est optionnelle et
    matérialise le niveau choisi par l'utilisateur à la création/modification,
    indépendamment du niveau par défaut suggéré par le catalogue : renseignée, la
    pièce est de niveau Session (spécifique à cette session, contenu potentiellement
    différent d'une session à l'autre) ; vide, la pièce est de niveau SSDGPS (un
    contenu unique, commun à toutes les sessions du rapport)."""

    class SourceSaisie(models.TextChoices):
        MANUEL = 'manuel', 'Saisie manuelle'
        IMPORT = 'import', 'Import CSV/Excel'
        IMAGE = 'image', 'Upload image'
        UI = 'ui', 'Généré automatiquement'

    class Statut(models.TextChoices):
        BROUILLON = 'brouillon', 'Brouillon'
        VALIDE = 'valide', 'Validée'
        REJETE = 'rejete', 'Rejetée'

    type_piece = models.CharField(max_length=10, choices=PIECE_CHOICES, verbose_name="Type de pièce")
    numero = models.PositiveSmallIntegerField(
        null=True, blank=True, verbose_name="Numéro (types répétables, ex. RDN)",
        help_text="Requis uniquement pour les types répétables (RDN n°1, 2, 3…)",
    )
    ssdgps = models.ForeignKey(Ssdgps, on_delete=models.CASCADE, related_name='pieces',
                                verbose_name="SSDGPS")
    session = models.ForeignKey(Session, on_delete=models.CASCADE, related_name='pieces',
                                 null=True, blank=True, verbose_name="Session (spécifique)")
    fichier = models.FileField(
        upload_to=piece_upload_path, null=True, blank=True,
        validators=[validate_piece_file_extension, validate_piece_file_size],
        verbose_name="Fichier (image ou document source)",
    )
    ordre = models.PositiveIntegerField(default=0, verbose_name="Ordre dans le rapport")
    payload = models.JSONField(default=dict, blank=True, verbose_name="Données structurées")
    source_saisie = models.CharField(max_length=10, choices=SourceSaisie.choices,
                                      verbose_name="Source de saisie")
    statut = models.CharField(max_length=10, choices=Statut.choices, default=Statut.BROUILLON,
                               verbose_name="Statut")
    commentaire = models.TextField(blank=True, verbose_name="Commentaire")

    class Meta:
        ordering = ['ordre', 'type_piece', 'numero']
        verbose_name = "Pièce"
        verbose_name_plural = "Pièces"
        constraints = [
            # NOTE : cette contrainte d'unicité ne protège que les types RÉPÉTABLES
            # (numero non NULL) — SQL considère NULL != NULL, donc deux pièces
            # non-répétables (numero=NULL) du même type sur le même (ssdgps, session)
            # ne sont PAS bloquées ici. L'unicité des types non-répétables est garantie
            # au niveau applicatif par `validators.validate_piece_coherence`. Ne pas
            # tenter de "corriger" en donnant un numero par défaut aux non-répétables.
            # `session` fait partie de la contrainte : le même type peut ainsi exister
            # une fois « commune » (session=NULL) et une fois par session distincte.
            models.UniqueConstraint(
                fields=['ssdgps', 'type_piece', 'numero', 'session'],
                condition=models.Q(is_deleted=False),
                name='unique_piece_type_numero_session_par_ssdgps',
            ),
        ]

    @property
    def organization_id(self):
        if self.ssdgps_id:
            return self.ssdgps.affaire.propriete.projet.organization_id
        return None

    def clean(self):
        from .validators import validate_piece_coherence
        validate_piece_coherence(
            self.type_piece, self.ssdgps, self.session, self.numero,
            self.source_saisie, exclude_pk=self.pk,
        )

    def __str__(self):
        return f"{self.type_piece}" + (f" n°{self.numero}" if self.numero else "")


class PieceImage(models.Model):
    """Image d'une pièce à base d'image (RDC, CLC, PPA…). Une pièce peut en porter
    plusieurs, ordonnées (`ordre`). Les métadonnées techniques sont extraites à
    l'upload (cf. `imaging.extract_image_metadata`) et figées ici pour l'affichage."""

    piece = models.ForeignKey(Piece, on_delete=models.CASCADE, related_name='images',
                              verbose_name="Pièce")
    fichier = models.ImageField(
        upload_to=piece_image_upload_path,
        validators=[validate_piece_image_extension, validate_piece_file_size,
                    validate_image_content],
        verbose_name="Fichier image",
    )
    apercu = models.ImageField(
        upload_to=piece_image_preview_path, null=True, blank=True,
        verbose_name="Aperçu PNG (formats non affichables, ex. TIFF)",
    )
    ordre = models.PositiveIntegerField(default=0, verbose_name="Ordre dans la galerie")

    # Métadonnées techniques (figées à l'upload)
    format = models.CharField(max_length=10, blank=True, verbose_name="Format")
    taille_octets = models.PositiveIntegerField(default=0, verbose_name="Taille (octets)")
    largeur = models.PositiveIntegerField(default=0, verbose_name="Largeur (px)")
    hauteur = models.PositiveIntegerField(default=0, verbose_name="Hauteur (px)")
    mode_couleur = models.CharField(max_length=20, blank=True, verbose_name="Type d'image")
    compression = models.CharField(max_length=40, blank=True, verbose_name="Compression")
    date_creation = models.DateTimeField(null=True, blank=True, verbose_name="Date de création")
    date_modification = models.DateTimeField(null=True, blank=True,
                                             verbose_name="Date de dernière modification")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Ajoutée le")

    class Meta:
        ordering = ['ordre', 'id']
        verbose_name = "Image de pièce"
        verbose_name_plural = "Images de pièce"

    def __str__(self):
        return f"Image {self.ordre} de {self.piece_id}"
