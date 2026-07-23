from django.contrib import admin

from .models import Projet, Propriete, Affaire, Ssdgps, Session


@admin.register(Projet)
class ProjetAdmin(admin.ModelAdmin):
    list_display = ('code_projet', 'nom_projet', 'organization', 'statut', 'is_deleted')
    list_filter = ('statut', 'is_deleted')
    search_fields = ('code_projet', 'nom_projet')


@admin.register(Propriete)
class ProprieteAdmin(admin.ModelAdmin):
    list_display = ('nom_propriete', 'id_requisition', 'id_titre', 'projet')
    search_fields = ('nom_propriete', 'id_requisition', 'id_titre')


@admin.register(Affaire)
class AffaireAdmin(admin.ModelAdmin):
    list_display = ('numero_sd_affaire', 'nature_procedure_affaire', 'nature_affaire', 'propriete')
    list_filter = ('nature_procedure_affaire',)


@admin.register(Ssdgps)
class SsdgpsAdmin(admin.ModelAdmin):
    list_display = ('numero_ssdgps', 'nature_ssdgps', 'type_ssdgps', 'affaire')
    list_filter = ('nature_ssdgps', 'type_ssdgps')


@admin.register(Session)
class SessionAdmin(admin.ModelAdmin):
    list_display = ('numero_session', 'ssdgps', 'date_session')
