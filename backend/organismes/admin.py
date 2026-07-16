from django.contrib import admin

from .models import OrganismeNiveau1, OrganismeNiveau2


@admin.register(OrganismeNiveau1)
class OrganismeNiveau1Admin(admin.ModelAdmin):
    list_display = ('code', 'nom', 'sigle', 'is_active', 'is_deleted')
    list_filter = ('is_active', 'is_deleted')
    search_fields = ('code', 'nom', 'sigle')


@admin.register(OrganismeNiveau2)
class OrganismeNiveau2Admin(admin.ModelAdmin):
    list_display = ('code', 'nom', 'niveau1', 'ville', 'is_active', 'is_deleted')
    list_filter = ('is_active', 'is_deleted', 'niveau1')
    search_fields = ('code', 'nom', 'sigle', 'ville')
