"""
Modèles du domaine métier SDGPS.

Hiérarchie : Projet → Propriété → Affaire (SD) → SSDGPS → Session.
Toutes les entités partagent : PK UUID, horodatage, soft-delete, auteur.
"""
import uuid
from django.conf import settings
from django.core.validators import RegexValidator
from django.db import models

from accounts.models import Organization
from .validators import (
    REQUISITION_RE, TITRE_RE,
    validate_affaire_coherence,
)


class BaseModel(models.Model):
    """Base commune : UUID, horodatage, suppression logique, auteur."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Créé le")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Modifié le")
    is_deleted = models.BooleanField(default=False, verbose_name="Supprimé (logique)")
    deleted_at = models.DateTimeField(null=True, blank=True, verbose_name="Date de suppression")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='+',
        verbose_name="Créé par",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='+',
        verbose_name="Modifié par",
    )
    deleted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='+',
        verbose_name="Supprimé par",
    )

    class Meta:
        abstract = True


class Projet(BaseModel):
    """Projet — conteneur racine, rattaché à une organisation (scoping RBAC)."""

    class Statut(models.TextChoices):
        BROUILLON = 'brouillon', 'Brouillon'
        EN_COURS = 'en_cours', 'En cours'
        CLOTURE = 'cloture', 'Clôturé'
        ARCHIVE = 'archive', 'Archivé'

    nom_projet = models.CharField(max_length=255, verbose_name="Nom du projet")
    description_projet = models.TextField(blank=True, verbose_name="Description")
    code_projet = models.CharField(
        max_length=50, unique=True, db_index=True, verbose_name="Code projet",
        help_text="Identifiant court unique du projet",
    )
    organization = models.ForeignKey(
        Organization,
        on_delete=models.PROTECT,
        related_name='projets',
        verbose_name="Organisation",
    )
    statut = models.CharField(
        max_length=20, choices=Statut.choices, default=Statut.BROUILLON,
        verbose_name="Statut",
    )

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Projet"
        verbose_name_plural = "Projets"
        indexes = [models.Index(fields=['organization', 'is_deleted'])]

    def __str__(self):
        return f"{self.code_projet} — {self.nom_projet}"


class Propriete(BaseModel):
    """Propriété (propriété-dite), identifiée par une réquisition et/ou un titre."""

    nom_propriete = models.CharField(max_length=255, verbose_name="Propriété-dite")
    id_requisition = models.CharField(
        max_length=50, blank=True, verbose_name="Réquisition",
        validators=[RegexValidator(REQUISITION_RE, "Format attendu : R<numéro>/<indice>.")],
        help_text="Ex. R19000/55",
    )
    id_titre = models.CharField(
        max_length=50, blank=True, verbose_name="Titre foncier",
        validators=[RegexValidator(TITRE_RE, "Format attendu : T<numéro>/<indice>.")],
        help_text="Ex. T12345/A",
    )
    projet = models.ForeignKey(
        Projet, on_delete=models.CASCADE, related_name='proprietes',
        verbose_name="Projet",
    )

    class Meta:
        ordering = ['nom_propriete']
        verbose_name = "Propriété"
        verbose_name_plural = "Propriétés"

    def __str__(self):
        return self.nom_propriete

    def clean(self):
        from django.core.exceptions import ValidationError
        if not self.id_requisition and not self.id_titre:
            raise ValidationError(
                "Renseignez au moins la réquisition ou le titre foncier."
            )


class Affaire(BaseModel):
    """Sous-dossier d'affaire (SD) — procédure et nature d'affaire dépendantes."""

    class Procedure(models.TextChoices):
        IFF = 'IFF', "Immatriculation Foncière Facultative"
        IFE = 'IFE', "Immatriculation Foncière d'Ensemble"
        IFR = 'IFR', "Immatriculation Foncière de Remembrement"
        PS_FORET = 'PS_FORET', "Procédure spéciale Forêt"
        PS_COLLECTIF = 'PS_COLLECTIF', "Procédure spéciale Collectif"
        PS_EXPROPRIATION = 'PS_EXPROPRIATION', "Procédure spéciale Expropriation"
        AS = 'AS', "Affaires subséquentes"

    class Nature(models.TextChoices):
        BI = 'BI', "Bornage d'immatriculation"
        BC = 'BC', "Bornage complémentaire"
        IFE = 'IFE', "Immatriculation Foncière d'Ensemble"
        IFR = 'IFR', "Immatriculation Foncière de Remembrement"
        RB = 'RB', "Recollement de bornage"
        MEC = 'MEC', "Mise en Concordance"
        MT = 'MT', "Morcellement"
        FS = 'FS', "Fusion"
        MT_FS = 'MT-FS', "Morcellement-Fusion"
        LOT = 'LOT', "Lotissement"
        COP = 'COP', "Copropriété"

    numero_sd_affaire = models.PositiveIntegerField(
        verbose_name="Numéro du SD d'affaire",
        help_text="Numéro d'ordre dans la propriété mère",
    )
    nature_procedure_affaire = models.CharField(
        max_length=20, choices=Procedure.choices, verbose_name="Nature de procédure",
    )
    nature_affaire = models.CharField(
        max_length=10, choices=Nature.choices, verbose_name="Nature d'affaire",
    )
    date_bornage = models.DateField(
        null=True, blank=True, verbose_name="Date de bornage / recollement",
        help_text="Requise pour IFF/AS/PS_* ; non définie pour IFE/IFR",
    )
    propriete = models.ForeignKey(
        Propriete, on_delete=models.CASCADE, related_name='affaires',
        verbose_name="Propriété",
    )

    class Meta:
        ordering = ['numero_sd_affaire']
        verbose_name = "Affaire (SD)"
        verbose_name_plural = "Affaires (SD)"
        constraints = [
            models.UniqueConstraint(
                fields=['propriete', 'numero_sd_affaire'],
                name='unique_numero_sd_par_propriete',
            )
        ]

    def __str__(self):
        return f"SD {self.numero_sd_affaire} — {self.nature_affaire}"

    def clean(self):
        validate_affaire_coherence(
            self.nature_procedure_affaire, self.nature_affaire, self.date_bornage
        )


class Ssdgps(BaseModel):
    """Sous-sous-dossier GPS — unité de production d'un rapport SSDGPS."""

    class NatureSSDGPS(models.TextChoices):
        PDC = 'PDC/GPS', "Projet de densification cadastrale par GPS"
        DDC = 'DDC/GPS', "Dossier de densification cadastrale par GPS"
        PLC = 'PLC/GPS', "Projet de levé cadastral par GPS"
        DLC = 'DLC/GPS', "Dossier de levé cadastral par GPS"

    class TypeSSDGPS(models.TextChoices):
        MONO = 'mono-session', "Mono-session"
        MULTI = 'multi-session', "Multi-session"

    nature_ssdgps = models.CharField(
        max_length=10, choices=NatureSSDGPS.choices, verbose_name="Nature du SSDGPS",
    )
    numero_ssdgps = models.PositiveIntegerField(
        verbose_name="Numéro du SSDGPS",
        help_text="Numéro d'ordre dans le SD d'affaire mère",
    )
    type_ssdgps = models.CharField(
        max_length=15, choices=TypeSSDGPS.choices, default=TypeSSDGPS.MONO,
        verbose_name="Type du SSDGPS",
    )
    affaire = models.ForeignKey(
        Affaire, on_delete=models.CASCADE, related_name='ssdgps_set',
        verbose_name="Affaire (SD)",
    )

    class Meta:
        ordering = ['numero_ssdgps']
        verbose_name = "SSDGPS"
        verbose_name_plural = "SSDGPS"
        constraints = [
            models.UniqueConstraint(
                fields=['affaire', 'numero_ssdgps'],
                name='unique_numero_ssdgps_par_affaire',
            )
        ]

    def __str__(self):
        return f"SSDGPS {self.numero_ssdgps} ({self.nature_ssdgps})"


class Session(BaseModel):
    """Session d'observations GPS d'un SSDGPS."""

    ssdgps = models.ForeignKey(
        Ssdgps, on_delete=models.CASCADE, related_name='sessions',
        verbose_name="SSDGPS",
    )
    numero_session = models.PositiveIntegerField(verbose_name="Numéro de session")
    date_session = models.DateField(null=True, blank=True, verbose_name="Date de la session")

    class Meta:
        ordering = ['numero_session']
        verbose_name = "Session GPS"
        verbose_name_plural = "Sessions GPS"
        constraints = [
            models.UniqueConstraint(
                fields=['ssdgps', 'numero_session'],
                name='unique_numero_session_par_ssdgps',
            )
        ]

    def __str__(self):
        return f"Session {self.numero_session}"
