"""
Analytique de l'espace de stockage occupé par les fichiers importés dans l'app.

`StorageSnapshot` = un instantané horodaté de la volumétrie totale et de ses ventilations
(par nature de fichier, organisation, projet, utilisateur). Une ligne est enregistrée
périodiquement par la commande `snapshot_storage`, ce qui permet de tracer l'ÉVOLUTION du
stockage dans le temps (la ventilation courante, elle, est recalculée à la volée par le
service `compute_storage_overview`).
"""
from django.db import models
from django.utils import timezone


class StorageSnapshot(models.Model):
    """Instantané de la volumétrie de stockage à un instant donné."""

    # `default` (et non `auto_now_add`) pour pouvoir fixer la date des instantanés historiques
    # reconstruits par `snapshot_storage --backfill`.
    taken_at = models.DateTimeField(
        default=timezone.now, db_index=True, verbose_name="Horodatage de l'instantané",
    )
    # Repère la source : instantané réel (commande périodique) ou reconstruit (backfill
    # historique à partir des dates d'import). Utile pour distinguer l'historique estimé.
    is_backfill = models.BooleanField(
        default=False, verbose_name="Reconstruit (historique estimé)",
    )
    total_bytes = models.BigIntegerField(default=0, verbose_name="Octets totaux")
    total_files = models.PositiveIntegerField(default=0, verbose_name="Nombre de fichiers")

    # Ventilations : { clé lisible : octets }. JSON pour rester souple (une ligne / snapshot).
    by_type = models.JSONField(default=dict, blank=True, verbose_name="Par nature de fichier")
    by_organization = models.JSONField(default=dict, blank=True, verbose_name="Par organisation")
    by_project = models.JSONField(default=dict, blank=True, verbose_name="Par projet")
    by_role = models.JSONField(default=dict, blank=True, verbose_name="Par rôle applicatif")
    by_user = models.JSONField(default=dict, blank=True, verbose_name="Par utilisateur")

    class Meta:
        ordering = ['-taken_at']
        verbose_name = "Instantané de stockage"
        verbose_name_plural = "Instantanés de stockage"

    def __str__(self):
        mo = self.total_bytes / (1024 * 1024)
        return f"Stockage {self.taken_at:%Y-%m-%d %H:%M} — {mo:.1f} Mo"
