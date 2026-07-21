from django.contrib import admin

from .models import Piece


@admin.register(Piece)
class PieceAdmin(admin.ModelAdmin):
    list_display = ('type_piece', 'numero', 'ssdgps', 'session', 'source_saisie', 'statut', 'is_deleted')
    list_filter = ('type_piece', 'source_saisie', 'statut', 'is_deleted')
    search_fields = ('type_piece',)
