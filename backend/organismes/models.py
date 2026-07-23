"""
Registre administratif des organismes du rapport SDGPS.

Deux entités distinctes :
- `OrganismeNiveau1` : organisme central (ex. ANCFCC). Sert de ligne « agence » de
  l'en-tête du rapport.
- `OrganismeNiveau2` : entité décentralisée rattachée à UN organisme de premier niveau
  (ex. « Service du cadastre d'Azilal »). Sert de ligne « service » de l'en-tête.

Ce registre est GLOBAL (hors multi-locataire) : il est géré uniquement par les rôles
`ROLE_SUPER_ADMIN` / `ROLE_ADMIN_SYSTEME` et choisi sur la propriété. Il est volontairement
séparé du modèle `accounts.Organization` (cabinets + memberships du multi-locataire).
"""
import uuid

from django.conf import settings
from django.db import models


class OrganismeBase(models.Model):
    """Base commune : UUID, horodatage, suppression logique, auteur.

    Reproduit `projects.BaseModel` sans créer de dépendance vers l'app `projects`
    (c'est `projects` qui dépend de `organismes`, via les FK de `Propriete`)."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(
        max_length=50, unique=True, db_index=True, verbose_name="Code",
        help_text="Identifiant court unique de l'organisme (ex. ANCFCC, SCA-AZILAL).",
    )
    nom = models.CharField(max_length=255, verbose_name="Nom officiel")
    sigle = models.CharField(max_length=50, blank=True, verbose_name="Sigle / abréviation")
    is_active = models.BooleanField(default=True, verbose_name="Actif")

    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Créé le")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Modifié le")
    is_deleted = models.BooleanField(default=False, verbose_name="Supprimé (logique)")
    deleted_at = models.DateTimeField(null=True, blank=True, verbose_name="Date de suppression")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+', verbose_name="Créé par",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+', verbose_name="Modifié par",
    )
    deleted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+', verbose_name="Supprimé par",
    )

    class Meta:
        abstract = True

    def __str__(self):
        return self.nom


class OrganismeNiveau1(OrganismeBase):
    """Organisme de premier niveau (central, ex. ANCFCC)."""

    class Meta:
        ordering = ['nom']
        verbose_name = "Organisme de premier niveau"
        verbose_name_plural = "Organismes de premier niveau"
        indexes = [models.Index(fields=['is_deleted']), models.Index(fields=['code'])]


class OrganismeNiveau2(OrganismeBase):
    """Organisme de deuxième niveau (entité décentralisée d'un premier niveau)."""

    niveau1 = models.ForeignKey(
        OrganismeNiveau1, on_delete=models.PROTECT, related_name='niveaux2',
        verbose_name="Organisme de premier niveau",
    )
    ville = models.CharField(max_length=120, blank=True, verbose_name="Ville / province")

    class Meta:
        ordering = ['nom']
        verbose_name = "Organisme de deuxième niveau"
        verbose_name_plural = "Organismes de deuxième niveau"
        indexes = [
            models.Index(fields=['is_deleted']),
            models.Index(fields=['code']),
            models.Index(fields=['niveau1']),
        ]
