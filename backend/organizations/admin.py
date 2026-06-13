"""
Administration Django pour les organisations
"""
from django.contrib import admin
from accounts.models import Organization, Membership


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    """Interface d'administration pour les organisations"""
    
    list_display = ['name', 'code', 'type', 'is_active', 'get_member_count', 'created_at']
    list_filter = ['type', 'is_active', 'created_at']
    search_fields = ['name', 'code', 'email', 'legal_id']
    readonly_fields = ['id', 'created_at', 'updated_at', 'get_full_path']
    
    fieldsets = (
        ('Informations de base', {
            'fields': ('name', 'code', 'type', 'logo')
        }),
        ('Informations légales', {
            'fields': ('legal_id', 'address', 'phone', 'email', 'website')
        }),
        ('Hiérarchie', {
            'fields': ('parent', 'get_full_path'),
            'classes': ('collapse',)
        }),
        ('Statut', {
            'fields': ('is_active', 'created_by')
        }),
        ('Métadonnées', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_member_count(self, obj):
        return obj.get_member_count()
    get_member_count.short_description = 'Membres'


@admin.register(Membership)
class MembershipAdmin(admin.ModelAdmin):
    """Interface d'administration pour les adhésions"""
    
    list_display = ['user', 'organization', 'role', 'is_active', 'joined_at']
    list_filter = ['role', 'is_active', 'joined_at', 'organization__type']
    search_fields = ['user__email', 'organization__name', 'organization__code']
    readonly_fields = ['id', 'joined_at']
    
    fieldsets = (
        ('Adhésion', {
            'fields': ('user', 'organization', 'role')
        }),
        ('Statut', {
            'fields': ('is_active',)
        }),
        ('Métadonnées', {
            'fields': ('id', 'joined_at'),
            'classes': ('collapse',)
        }),
    )
