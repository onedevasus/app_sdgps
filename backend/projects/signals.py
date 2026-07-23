"""Signaux de l'app projects."""
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Ssdgps, Session


@receiver(post_save, sender=Ssdgps)
def autocreate_mono_session(sender, instance, created, **kwargs):
    """
    Auto-crée une session unique (n°1) pour un SSDGPS mono-session à sa création.
    Les SSDGPS multi-session gèrent leurs sessions manuellement.
    """
    if not created:
        return
    if instance.type_ssdgps == Ssdgps.TypeSSDGPS.MONO and not instance.sessions.exists():
        Session.objects.create(
            ssdgps=instance,
            numero_session=1,
            created_by=instance.created_by,
        )
