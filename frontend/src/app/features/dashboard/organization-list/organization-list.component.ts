import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { OrganizationService } from '../../../core/services/organization.service';
import { OrganizationMetadataService } from '../../../core/services/organization-metadata.service';
import { UserPreferencesService, ColumnMetadata } from '../../../core/services/user-preferences.service';
import { ToastService } from '../../../core/services/toast.service';
import { Organization } from '../../../core/models/organization.model';
import { debounceTime, Subject } from 'rxjs';

interface ColumnConfig {
  field: keyof Organization;
  label: string;
  visible: boolean;
  width?: string;
  type?: 'text' | 'number' | 'date' | 'email' | 'boolean'; // Type de données
}

@Component({
  selector: 'app-organization-list',
  templateUrl: './organization-list.component.html',
  styleUrls: ['./organization-list.component.scss']
})
export class OrganizationListComponent implements OnInit {
  // Exposer Math pour le template
  readonly Math = Math;
  
  organizations: Organization[] = [];
  filteredOrganizations: Organization[] = [];
  selectedOrganizations: Set<string> = new Set();  // IDs sont des strings (UUID)
  
  // Configuration des colonnes
  columns: ColumnConfig[] = [
    { field: 'code', label: 'Code', visible: true, width: '100px', type: 'text' },
    { field: 'name', label: 'Nom', visible: true, width: '200px', type: 'text' },
    { field: 'type_display', label: 'Type', visible: true, width: '150px', type: 'text' },
    { field: 'legal_id', label: 'ID Légal', visible: false, width: '120px', type: 'text' },
    { field: 'address', label: 'Adresse', visible: false, width: '200px', type: 'text' },
    { field: 'phone', label: 'Téléphone', visible: false, width: '130px', type: 'text' },
    { field: 'email', label: 'Email', visible: true, width: '200px', type: 'email' },
    { field: 'website', label: 'Site Web', visible: false, width: '180px', type: 'text' },
    { field: 'is_active', label: 'Statut', visible: true, width: '100px', type: 'boolean' },
    { field: 'member_count', label: 'Membres', visible: true, width: '90px', type: 'number' },
    { field: 'created_by_email', label: 'Créé par', visible: false, width: '200px', type: 'email' },
    { field: 'modified_by_email', label: 'Modifié par', visible: false, width: '200px', type: 'email' },
    { field: 'is_test_data', label: 'Type de données', visible: false, width: '130px', type: 'boolean' },
    { field: 'created_at', label: 'Date Création', visible: false, width: '150px', type: 'date' },
    { field: 'updated_at', label: 'Date Modification', visible: false, width: '150px', type: 'date' }
  ];

  // Tri
  sortColumn: keyof Organization | null = null;
  sortDirection: 'asc' | 'desc' = 'asc';
  
  // Filtrage
  searchQuery: string = '';
  typeFilter: string = 'all';
  displayMode: 'all' | 'selected' = 'all';
  buttonLabel: string = 'Toutes les organisations'; // Texte affiché dans le bouton

  // Menus déroulants
  showExportMenu: boolean = false;
  showFilterMenu: boolean = false;
  showFieldFilterMenu: boolean = false;

  // Filtre par champ
  activeFieldFilter: string | null = null;
  activeFieldFilterLabel: string = '';
  fieldFilterValue: string = '';

  // Pagination
  currentPage: number = 1;
  pageSize: number = 10;

  // UI
  showColumnConfig: boolean = false;
  loading: boolean = false;
  private boundHandleClickOutside!: (event: Event) => void;
  
  // Sauvegarde temporaire des colonnes pour annulation
  private columnsBackup: ColumnConfig[] = [];
  
  // Métadonnées des champs (descriptions)
  fieldDescriptions: { [fieldName: string]: string } = {};
  
  // Drag & Drop pour réorganisation des colonnes
  draggedColumnIndex: number | null = null;
  dragOverIndex: number | null = null;
  
  // Filtre d'affichage des colonnes dans la modale
  columnFilter: 'all' | 'visible' = 'all';
  showColumnFilterMenu: boolean = false;
  
  // Menus contextuels (clic droit)
  showColumnContextMenu: boolean = false;
  showRowContextMenu: boolean = false;
  contextMenuPosition: { x: number; y: number } = { x: 0, y: 0 };
  selectedColumnForContext: ColumnConfig | null = null;
  selectedRowForContext: Organization | null = null;
  selectedCellForContext: { row: Organization; field: keyof Organization; value: any } | null = null;

  // Modal d'ajout d'organisation
  showAddOrgModal: boolean = false;
  addOrgForm!: FormGroup;
  submitting: boolean = false;

  // Modal de suppression
  showDeleteModal: boolean = false;
  organizationToDelete: Organization | null = null;
  deleting: boolean = false;

  // Modal de suppression en groupe
  showBulkDeleteModal: boolean = false;
  bulkDeleting: boolean = false;

  // Modal de détails d'organisation
  showDetailModal: boolean = false;
  organizationToView: Organization | null = null;

  // Modal d'édition d'organisation
  showEditModal: boolean = false;
  organizationToEdit: Organization | null = null;
  editOrgForm!: FormGroup;
  editing: boolean = false;

  // Subject pour sauvegarde différée des préférences
  private savePreferencesSubject = new Subject<void>();

  constructor(
    private organizationService: OrganizationService, 
    private metadataService: OrganizationMetadataService,
    private preferencesService: UserPreferencesService,
    private cdr: ChangeDetectorRef,
    private fb: FormBuilder,
    private toastService: ToastService
  ) { }

  ngOnInit(): void {
    // Initialiser le formulaire d'ajout d'organisation
    this.initAddOrgForm();
    
    // Charger les métadonnées des colonnes depuis le backend
    this.loadColumnMetadata();
    
    // Configurer la sauvegarde différée des préférences (debounce 1 seconde)
    this.savePreferencesSubject.pipe(
      debounceTime(1000) // Attendre 1s après le dernier changement
    ).subscribe(() => {
      this.savePreferencesToBackend();
    });
    
    this.loadOrganizations();
    
    // Fermer les menus en cliquant en dehors
    this.boundHandleClickOutside = this.handleClickOutside.bind(this);
    document.addEventListener('click', this.boundHandleClickOutside);
  }

  ngOnDestroy(): void {
    // Sauvegarder avant destruction du composant
    this.savePreferencesToBackend();
    this.savePreferencesSubject.complete();
    
    // Nettoyer l'écouteur d'événements
    document.removeEventListener('click', this.boundHandleClickOutside);
  }

  private handleClickOutside(event: Event): void {
    const target = event.target as HTMLElement;
    // Fermer seulement si le clic n'est PAS dans un dropdown-container ou un context-menu
    if (!target.closest('.dropdown-container') && !target.closest('.context-menu')) {
      this.closeAllMenus();
      this.closeAllContextMenus();
      // Fermer aussi le menu de filtre des colonnes
      this.showColumnFilterMenu = false;
    }
  }

  loadOrganizations(): void {
    this.loading = true;
    console.log('🔄 Début du chargement des organisations...');
    console.log('URL API:', 'http://localhost:8000/api/v1/organizations/');
    
    this.organizationService.getOrganizations().subscribe({
      next: (data: Organization[]) => {
        console.log('✅ Données reçues du service:', data);
        console.log('Type de données:', typeof data, Array.isArray(data));
        console.log('Nombre d\'organisations:', data.length);
        
        if (data.length > 0) {
          console.log('Première organisation:', data[0]);
        }
        
        this.organizations = data;
        this.filteredOrganizations = [...data];
        this.loading = false;
        
        console.log('✓ organizations.length:', this.organizations.length);
        console.log('✓ filteredOrganizations.length:', this.filteredOrganizations.length);
        console.log('✓ paginatedOrganizations.length:', this.paginatedOrganizations.length);
      },
      error: (err: any) => {
        console.error('❌ Erreur lors du chargement des organisations:', err);
        console.error('Status:', err.status);
        console.error('Message:', err.message);
        console.error('Error detail:', err.error);
        this.loading = false;
      }
    });
  }

  loadFieldDescriptions(): void {
    this.metadataService.getAllDescriptions().subscribe(descriptions => {
      this.fieldDescriptions = descriptions;
      console.log('📝 Descriptions des champs chargées:', Object.keys(descriptions).length);
    });
  }

  /**
   * Charger les métadonnées des colonnes depuis le backend
   * et initialiser la configuration des colonnes avec les labels du modèle Django
   */
  private loadColumnMetadata(): void {
    this.preferencesService.getColumnMetadata().subscribe({
      next: (metadataMap: Map<string, ColumnMetadata>) => {
        console.log('✅ Métadonnées reçues:', metadataMap.size, 'colonnes');
        
        // Mettre à jour les descriptions pour les infobulles AVANT de reconstruire les colonnes
        metadataMap.forEach((meta, fieldName) => {
          this.fieldDescriptions[fieldName] = meta.description;
        });
        console.log('📝 Descriptions mises à jour:', Object.keys(this.fieldDescriptions).length);
        
        // Reconstruire la configuration des colonnes avec les labels du backend
        const newColumns: ColumnConfig[] = [];
        
        metadataMap.forEach((meta: ColumnMetadata) => {
          // Chercher si cette colonne existe déjà dans la config actuelle
          const existingColumn = this.columns.find(col => col.field === meta.field);
          
          if (existingColumn) {
            // Conserver l'état visible actuel, mais mettre à jour le label
            newColumns.push({
              field: meta.field as keyof Organization,  // Cast nécessaire
              label: meta.label,  // ← Label depuis le backend !
              visible: existingColumn.visible,
              width: existingColumn.width || '150px',
              type: this.mapFieldType(meta.type)
            });
          } else {
            // Nouvelle colonne : utiliser visible_by_default
            newColumns.push({
              field: meta.field as keyof Organization,  // Cast nécessaire
              label: meta.label,
              visible: meta.visible_by_default,
              width: '150px',
              type: this.mapFieldType(meta.type)
            });
          }
        });
        
        // Trier selon l'ordre par défaut (visible en premier)
        newColumns.sort((a, b) => {
          if (a.visible && !b.visible) return -1;
          if (!a.visible && b.visible) return 1;
          return 0;
        });
        
        this.columns = newColumns;
        console.log('📊 Colonnes configurées:', this.columns.length);
        
        // Forcer la détection des changements pour afficher les descriptions
        this.cdr.markForCheck();
        
        // Charger ensuite les préférences utilisateur
        this.loadUserPreferences();
      },
      error: (error) => {
        console.error('❌ Erreur chargement métadonnées:', error);
        // Fallback : charger les descriptions depuis l'ancien service
        this.loadFieldDescriptions();
        // Puis charger les préférences
        this.loadUserPreferences();
      }
    });
  }

  /**
   * Mapper le type Django vers le type TypeScript
   */
  private mapFieldType(djangoType: string): 'text' | 'number' | 'date' | 'email' | 'boolean' {
    const typeMap: { [key: string]: 'text' | 'number' | 'date' | 'email' | 'boolean' } = {
      'CharField': 'text',
      'TextField': 'text',
      'IntegerField': 'number',
      'FloatField': 'number',
      'DecimalField': 'number',
      'EmailField': 'email',
      'BooleanField': 'boolean',
      'DateTimeField': 'date',
      'DateField': 'date',
      'URLField': 'text',
      'ImageField': 'text',
    };
    return typeMap[djangoType] || 'text';
  }

  /**
   * Charger les préférences utilisateur depuis le backend
   */
  private loadUserPreferences(): void {
    this.preferencesService.getTablePreferences().subscribe({
      next: (preferences) => {
        console.log('📥 Préférences chargées:', preferences);
        
        // Restaurer la configuration des colonnes
        if (preferences.column_config && preferences.column_config.length > 0) {
          this.restoreColumnConfig(preferences.column_config);
        }
        
        // Restaurer le tri
        if (preferences.sort_config && preferences.sort_config.column) {
          this.sortColumn = preferences.sort_config.column as keyof Organization;
          this.sortDirection = preferences.sort_config.direction || 'asc';
        }
        
        // Restaurer le mode d'affichage
        if (preferences.display_mode) {
          this.displayMode = preferences.display_mode as 'all' | 'selected';
        }
        
        // Appliquer les changements
        this.applyFiltersAndSort();
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('❌ Erreur chargement préférences:', error);
        // Utiliser les valeurs par défaut
      }
    });
  }

  /**
   * Restaurer la configuration des colonnes depuis les préférences
   */
  private restoreColumnConfig(savedConfig: any[]): void {
    // Créer un map des colonnes sauvegardées
    const configMap = new Map(savedConfig.map(col => [col.field, col]));
    
    // Mettre à jour les colonnes actuelles
    this.columns.forEach(col => {
      const saved = configMap.get(col.field);
      if (saved) {
        col.visible = saved.visible;
      }
    });
    
    // Réordonner selon la configuration sauvegardée
    const fieldOrder = savedConfig.map(col => col.field);
    this.columns.sort((a, b) => {
      return fieldOrder.indexOf(a.field) - fieldOrder.indexOf(b.field);
    });
    
    console.log('✅ Configuration des colonnes restaurée');
  }

  /**
   * Déclencher la sauvegarde des préférences (avec debounce)
   */
  private triggerSavePreferences(): void {
    this.savePreferencesSubject.next();
  }

  /**
   * Sauvegarder les préférences vers le backend
   */
  private savePreferencesToBackend(): void {
    const preferences = {
      column_config: this.columns.map(col => ({
        field: col.field,
        label: col.label,
        visible: col.visible,
        type: col.type
      })),
      sort_config: {
        column: this.sortColumn,
        direction: this.sortDirection
      },
      display_mode: this.displayMode,
      active_filters: {
        searchQuery: this.searchQuery,
        activeFieldFilter: this.activeFieldFilter,
        fieldFilterValue: this.fieldFilterValue
      }
    };

    this.preferencesService.saveTablePreferences(preferences).subscribe({
      next: () => console.log('✅ Préférences sauvegardées'),
      error: (error) => console.error('❌ Erreur sauvegarde préférences:', error)
    });
  }

  /**
   * Récupère la description d'un champ pour affichage en infobulle
   */
  getFieldDescription(fieldName: string): string {
    return this.fieldDescriptions[fieldName] || '';
  }

  // --- Drag & Drop pour réorganisation des colonnes ---
  
  /**
   * Début du glissement d'une colonne
   */
  onDragStart(index: number): void {
    this.draggedColumnIndex = index;
  }

  /**
   * Survol d'une zone de dépôt
   */
  onDragOver(event: DragEvent, index: number): void {
    event.preventDefault(); // Nécessaire pour autoriser le drop
    if (this.draggedColumnIndex !== null && this.draggedColumnIndex !== index) {
      this.dragOverIndex = index;
    }
  }

  /**
   * Fin du survol
   */
  onDragLeave(): void {
    this.dragOverIndex = null;
  }

  /**
   * Dépôt de la colonne
   */
  onDrop(index: number): void {
    if (this.draggedColumnIndex === null || this.draggedColumnIndex === index) {
      this.draggedColumnIndex = null;
      this.dragOverIndex = null;
      return;
    }

    // Réorganiser le tableau
    const draggedColumn = this.columns[this.draggedColumnIndex];
    this.columns.splice(this.draggedColumnIndex, 1); // Retirer l'élément déplacé
    this.columns.splice(index, 0, draggedColumn); // L'insérer à la nouvelle position

    // Réinitialiser
    this.draggedColumnIndex = null;
    this.dragOverIndex = null;
  }

  /**
   * Fin du glissement (annulation ou succès)
   */
  onDragEnd(): void {
    this.draggedColumnIndex = null;
    this.dragOverIndex = null;
  }

  // --- Boutons de réorganisation des colonnes ---

  /**
   * Déplacer une colonne vers le haut d'une position
   */
  moveColumnUp(index: number): void {
    if (index > 0) {
      const temp = this.columns[index];
      this.columns[index] = this.columns[index - 1];
      this.columns[index - 1] = temp;
    }
  }

  /**
   * Déplacer une colonne en première position
   */
  moveColumnToTop(index: number): void {
    if (index > 0) {
      const column = this.columns.splice(index, 1)[0];
      this.columns.unshift(column);
    }
  }

  /**
   * Déplacer une colonne vers le bas d'une position
   */
  moveColumnDown(index: number): void {
    if (index < this.columns.length - 1) {
      const temp = this.columns[index];
      this.columns[index] = this.columns[index + 1];
      this.columns[index + 1] = temp;
    }
  }

  /**
   * Déplacer une colonne en dernière position
   */
  moveColumnToBottom(index: number): void {
    if (index < this.columns.length - 1) {
      const column = this.columns.splice(index, 1)[0];
      this.columns.push(column);
    }
  }

  /**
   * Obtenir les colonnes à afficher selon le filtre
   */
  getFilteredColumns(): ColumnConfig[] {
    if (this.columnFilter === 'visible') {
      return this.columns.filter(col => col.visible);
    }
    return this.columns;
  }

  /**
   * Basculer le menu de filtre d'affichage des colonnes
   */
  toggleColumnFilterMenu(event: Event): void {
    event.stopPropagation();
    this.showColumnFilterMenu = !this.showColumnFilterMenu;
  }

  /**
   * Appliquer une option de filtre
   */
  applyColumnFilter(filterType: 'all' | 'visible'): void {
    this.columnFilter = filterType;
    this.showColumnFilterMenu = false;
  }

  /**
   * Obtenir le label du bouton de filtre
   */
  getColumnFilterLabel(): string {
    return this.columnFilter === 'all' ? 'Toutes les colonnes' : 'Colonnes visibles uniquement';
  }

  /**
   * Obtenir les statistiques des colonnes
   */
  getColumnStats(): { total: number; visible: number; hidden: number } {
    const total = this.columns.length;
    const visible = this.columns.filter(col => col.visible).length;
    const hidden = total - visible;
    return { total, visible, hidden };
  }

  // --- Menus contextuels (clic droit) ---

  /**
   * Ouvrir le menu contextuel sur un en-tête de colonne
   */
  onColumnHeaderRightClick(event: MouseEvent, column: ColumnConfig): void {
    event.preventDefault();
    event.stopPropagation();
    
    this.selectedColumnForContext = column;
    this.contextMenuPosition = { x: event.clientX, y: event.clientY };
    this.showColumnContextMenu = true;
    this.showRowContextMenu = false;
  }

  /**
   * Ouvrir le menu contextuel sur une ligne
   */
  onRowRightClick(event: MouseEvent, org: Organization): void {
    event.preventDefault();
    event.stopPropagation();
    
    this.selectedRowForContext = org;
    this.contextMenuPosition = { x: event.clientX, y: event.clientY };
    this.showRowContextMenu = true;
    this.showColumnContextMenu = false;
  }

  /**
   * Ouvrir le menu contextuel sur une cellule
   */
  onCellRightClick(event: MouseEvent, org: Organization, field: keyof Organization): void {
    event.preventDefault();
    event.stopPropagation();
    
    const value = org[field];
    this.selectedCellForContext = { row: org, field, value };
    this.selectedRowForContext = org;
    this.contextMenuPosition = { x: event.clientX, y: event.clientY };
    this.showRowContextMenu = true;
    this.showColumnContextMenu = false;
  }

  /**
   * Fermer tous les menus contextuels
   */
  closeAllContextMenus(): void {
    this.showColumnContextMenu = false;
    this.showRowContextMenu = false;
    this.selectedColumnForContext = null;
    this.selectedRowForContext = null;
    this.selectedCellForContext = null;
  }

  /**
   * Masquer la colonne depuis le menu contextuel
   */
  hideColumnFromContext(): void {
    if (this.selectedColumnForContext) {
      this.toggleColumnVisibility(this.selectedColumnForContext.field);
    }
    this.closeAllContextMenus();
  }

  /**
   * Ouvrir la fenêtre d'organisation des colonnes depuis le menu contextuel
   */
  openColumnConfigFromContext(): void {
    this.closeAllContextMenus();
    this.toggleColumnConfig();
  }

  /**
   * Sélectionner/Désélectionner la ligne depuis le menu contextuel
   */
  toggleRowSelectionFromContext(): void {
    if (this.selectedRowForContext) {
      this.toggleSelection(this.selectedRowForContext.id);
    }
    this.closeAllContextMenus();
  }

  /**
   * Sélectionner toutes les lignes depuis le menu contextuel
   */
  selectAllFromContext(): void {
    this.selectAll();
    this.closeAllContextMenus();
  }

  /**
   * Copier la valeur de la cellule depuis le menu contextuel
   */
  copyCellValueFromContext(): void {
    if (this.selectedCellForContext) {
      const value = this.selectedCellForContext.value;
      const textToCopy = value !== null && value !== undefined ? String(value) : '';
      
      navigator.clipboard.writeText(textToCopy).then(() => {
        console.log('✅ Valeur copiée:', textToCopy);
      }).catch(err => {
        console.error('❌ Erreur lors de la copie:', err);
      });
    }
    this.closeAllContextMenus();
  }

  // --- Tri ---
  sort(column: keyof Organization): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    this.applyFiltersAndSort();
    this.triggerSavePreferences(); // Sauvegarder le changement de tri
  }

  getSortIcon(column: keyof Organization): string {
    if (this.sortColumn !== column) return 'fas fa-sort';
    return this.sortDirection === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down';
  }

  // --- Gestion des menus ---
  toggleExportMenu(): void {
    this.showExportMenu = !this.showExportMenu;
    if (this.showExportMenu) {
      this.showFilterMenu = false;
      setTimeout(() => this.positionDropdown('export'), 0);
    }
  }

  toggleFilterMenu(): void {
    this.showFilterMenu = !this.showFilterMenu;
    if (this.showFilterMenu) {
      this.showExportMenu = false;
      setTimeout(() => this.positionDropdown('filter'), 0);
    }
  }

  private positionDropdown(type: 'export' | 'filter'): void {
    const button = document.querySelector(`.${type === 'export' ? 'btn-secondary' : 'btn-statusbar'}`);
    const dropdown = document.querySelector(`.${type === 'export' ? '' : 'dropdown-menu-left'}`);
    
    if (button && dropdown) {
      const rect = button.getBoundingClientRect();
      const dropdownElement = dropdown as HTMLElement;
      
      // Positionner AU-DESSUS du bouton
      const spacing = 10; // Espace entre le bouton et le menu
      const menuHeight = dropdownElement.offsetHeight || 200; // Hauteur estimée si pas encore rendu
      const topPosition = rect.top - menuHeight - spacing;
      
      dropdownElement.style.top = `${topPosition}px`;
      dropdownElement.style.left = `${rect.left}px`;
      
      // Animation d'entrée
      dropdownElement.style.opacity = '0';
      dropdownElement.style.transform = 'translateY(10px) scale(0.95)';
      
      requestAnimationFrame(() => {
        dropdownElement.style.transition = 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
        dropdownElement.style.opacity = '1';
        dropdownElement.style.transform = 'translateY(0) scale(1)';
      });
    }
  }

  setDisplayMode(mode: 'all' | 'selected'): void {
    this.displayMode = mode;
    // Mettre à jour le texte du bouton selon l'option choisie
    if (mode === 'all') {
      this.buttonLabel = 'Toutes les organisations';
    } else if (mode === 'selected') {
      this.buttonLabel = 'N\'afficher que les organisations sélectionnées';
    }
    this.applyFiltersAndSort();
    this.triggerSavePreferences(); // Sauvegarder le changement de mode
    // Forcer la détection des changements pour mettre à jour le texte du bouton
    this.cdr.markForCheck();
  }

  getDisplayModeLabel(): string {
    switch (this.displayMode) {
      case 'selected':
        return `Sélectionnées (${this.selectedOrganizations.size})`;
      case 'all':
      default:
        return 'Toutes les organisations';
    }
  }

  // --- Gestion du filtre par champ ---
  onFieldFilterMenuLeave(): void {
    // Délai pour permettre le clic avant de fermer
    setTimeout(() => {
      this.showFieldFilterMenu = false;
    }, 200);
  }

  selectFieldForFilter(field: string, label: string): void {
    this.activeFieldFilter = field;
    this.activeFieldFilterLabel = label;
    this.fieldFilterValue = '';
    // Mettre à jour le texte du bouton
    this.buttonLabel = `Filtre sur ${label}`;
    this.showFieldFilterMenu = false;
    this.showFilterMenu = false;
    this.applyFiltersAndSort();
    // Forcer la détection des changements
    this.cdr.markForCheck();
  }

  onFieldFilterInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.fieldFilterValue = input.value;
    this.applyFiltersAndSort();
  }

  clearFieldFilter(): void {
    this.activeFieldFilter = null;
    this.activeFieldFilterLabel = '';
    this.fieldFilterValue = '';
    // Remettre le texte du bouton à "Toutes les organisations"
    this.buttonLabel = 'Toutes les organisations';
    this.displayMode = 'all';
    this.applyFiltersAndSort();
    // Forcer la détection des changements
    this.cdr.markForCheck();
  }

  closeAllMenus(): void {
    this.showExportMenu = false;
    this.showFilterMenu = false;
  }
  onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery = input.value;
    this.applyFiltersAndSort();
    this.triggerSavePreferences(); // Sauvegarder le changement de filtre
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.applyFiltersAndSort();
  }

  onSearchChange(): void {
    this.applyFiltersAndSort();
  }

  onTypeFilterChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.typeFilter = select.value;
    this.applyFiltersAndSort();
  }

  private applyFiltersAndSort(): void {
    let result = [...this.organizations];

    // Filtre par mode d'affichage
    if (this.displayMode === 'selected') {
      result = result.filter(org => this.selectedOrganizations.has(org.id));
    }

    // Filtre par recherche globale
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      result = result.filter(org => 
        org.name.toLowerCase().includes(query) || 
        org.code.toLowerCase().includes(query) ||
        (org.email && org.email.toLowerCase().includes(query))
      );
    }

    // Filtre par type
    if (this.typeFilter !== 'all') {
      result = result.filter(org => org.type === this.typeFilter);
    }

    // Filtre par champ spécifique
    if (this.activeFieldFilter && this.fieldFilterValue) {
      const filterValue = this.fieldFilterValue.toLowerCase();
      result = result.filter(org => {
        const fieldValue = org[this.activeFieldFilter as keyof Organization];
        if (fieldValue == null) return false;
        return String(fieldValue).toLowerCase().includes(filterValue);
      });
    }

    // Tri
    if (this.sortColumn) {
      result.sort((a, b) => {
        const valueA = a[this.sortColumn as keyof Organization];
        const valueB = b[this.sortColumn as keyof Organization];
        
        if (valueA == null) return 1;
        if (valueB == null) return -1;
        
        let comparison = 0;
        if (typeof valueA === 'string' && typeof valueB === 'string') {
          comparison = valueA.localeCompare(valueB);
        } else if (typeof valueA === 'number' && typeof valueB === 'number') {
          comparison = valueA - valueB;
        } else {
          comparison = String(valueA).localeCompare(String(valueB));
        }
        
        return this.sortDirection === 'asc' ? comparison : -comparison;
      });
    }

    this.filteredOrganizations = result;
  }

  // --- Sélection ---
  toggleSelection(orgId: string): void {
    if (this.selectedOrganizations.has(orgId)) {
      this.selectedOrganizations.delete(orgId);
    } else {
      this.selectedOrganizations.add(orgId);
    }
  }

  selectAll(): void {
    this.filteredOrganizations.forEach(org => {
      this.selectedOrganizations.add(org.id);
    });
  }

  deselectAll(): void {
    this.selectedOrganizations.clear();
  }

  invertSelection(): void {
    const newSelection = new Set<string>();
    this.filteredOrganizations.forEach(org => {
      if (!this.selectedOrganizations.has(org.id)) {
        newSelection.add(org.id);
      }
    });
    this.selectedOrganizations = newSelection;
  }

  moveSelectionToTop(): void {
    if (this.selectedOrganizations.size === 0) return;
    
    const selected = this.organizations.filter(org => 
      this.selectedOrganizations.has(org.id)
    );
    const notSelected = this.organizations.filter(org => 
      !this.selectedOrganizations.has(org.id)
    );
    
    this.organizations = [...selected, ...notSelected];
    this.applyFiltersAndSort();
  }

  toggleSelectAll(): void {
    if (this.selectedOrganizations.size === this.filteredOrganizations.length) {
      this.deselectAll();
    } else {
      this.selectAll();
    }
  }

  isAllSelected(): boolean {
    return this.filteredOrganizations.length > 0 && 
           this.selectedOrganizations.size === this.filteredOrganizations.length;
  }

  // --- Gestion des colonnes ---
  toggleColumnVisibility(field: keyof Organization): void {
    const column = this.columns.find(c => c.field === field);
    if (column) {
      column.visible = !column.visible;
      this.triggerSavePreferences(); // Sauvegarder le changement
    }
  }

  getTypeLabel(type?: string): string {
    const labels: { [key: string]: string } = {
      'text': 'Texte',
      'number': 'Nombre',
      'date': 'Date',
      'email': 'Email',
      'boolean': 'Booléen'
    };
    return labels[type || 'text'] || 'Texte';
  }

  toggleColumnConfig(): void {
    if (!this.showColumnConfig) {
      // Ouvrir la fenêtre : sauvegarder l'état actuel
      this.saveColumnsBackup();
    } else {
      // Fermer la fenêtre sans appliquer : restaurer l'ancien état
      this.restoreColumnsBackup();
    }
    this.showColumnConfig = !this.showColumnConfig;
  }

  confirmColumnConfig(): void {
    // Confirmer les changements et fermer la fenêtre
    this.showColumnConfig = false;
    this.triggerSavePreferences(); // Sauvegarder la configuration des colonnes
    // La sauvegarde n'est pas restaurée, donc les changements sont conservés
  }

  cancelColumnConfig(): void {
    // Annuler les changements : restaurer l'ancien état et fermer
    this.restoreColumnsBackup();
    this.showColumnConfig = false;
  }

  private saveColumnsBackup(): void {
    // Sauvegarder une copie profonde des colonnes actuelles
    this.columnsBackup = this.columns.map(col => ({ ...col }));
  }

  private restoreColumnsBackup(): void {
    // Restaurer l'état sauvegardé
    if (this.columnsBackup.length > 0) {
      this.columns = this.columnsBackup.map(col => ({ ...col }));
      this.columnsBackup = [];
    }
  }

  selectAllColumns(): void {
    this.columns.forEach(col => col.visible = true);
    this.triggerSavePreferences(); // Sauvegarder le changement
  }

  deselectAllColumns(): void {
    this.columns.forEach(col => col.visible = false);
    this.triggerSavePreferences(); // Sauvegarder le changement
  }

  invertColumnSelection(): void {
    this.columns.forEach(col => col.visible = !col.visible);
    this.triggerSavePreferences(); // Sauvegarder le changement
  }

  // --- Actions ---
  deleteOrganization(orgId: string): void {
    const org = this.organizations.find(o => o.id === orgId);
    if (!org) return;

    if (confirm(`Êtes-vous sûr de vouloir supprimer l'organisation "${org.name}" ?`)) {
      // TODO: Implémenter la suppression via API
      console.log('Suppression de l\'organisation:', orgId);
      
      // Supprimer localement pour l'instant
      this.organizations = this.organizations.filter(o => o.id !== orgId);
      this.selectedOrganizations.delete(orgId);
      this.applyFiltersAndSort();
    }
  }

  deleteSelected(): void {
    if (this.selectedOrganizations.size === 0) return;
    
    if (confirm(`Êtes-vous sûr de vouloir supprimer ${this.selectedOrganizations.size} organisation(s) ?`)) {
      // TODO: Implémenter la suppression via API
      console.log('Suppression des organisations:', Array.from(this.selectedOrganizations));
      this.selectedOrganizations.clear();
    }
  }

  exportToExcel(selectedOnly: boolean = false): void {
    const dataToExport = selectedOnly 
      ? this.organizations.filter(org => this.selectedOrganizations.has(org.id))
      : this.organizations;

    if (dataToExport.length === 0) {
      alert('Aucune donnée à exporter');
      return;
    }

    // Créer le contenu CSV
    const headers = [
      'Code',
      'Nom',
      'Type',
      'ID Légal',
      'Adresse',
      'Téléphone',
      'Email',
      'Site Web',
      'Statut',
      'Membres',
      'Créé par',
      'Date Création',
      'Date Modification'
    ];

    const rows = dataToExport.map(org => [
      org.code,
      org.name,
      org.type_display,
      org.legal_id || '',
      org.address || '',
      org.phone || '',
      org.email || '',
      org.website || '',
      org.is_active ? 'Actif' : 'Inactif',
      org.member_count,
      org.created_by_email || '',
      this.formatDate(org.created_at),
      this.formatDate(org.updated_at)
    ]);

    // Convertir en CSV avec BOM pour Excel
    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(';'))
    ].join('\n');

    // Ajouter le BOM UTF-8 pour qu'Excel reconnaisse l'encodage
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // Créer le lien de téléchargement
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = selectedOnly 
      ? `organisations_selectionnees_${timestamp}.csv`
      : `toutes_organisations_${timestamp}.csv`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // --- Utilitaires ---
  getVisibleColumns(): ColumnConfig[] {
    return this.columns.filter(col => col.visible);
  }

  getStatusBadgeClass(isActive: boolean): string {
    return isActive ? 'badge badge-success' : 'badge badge-danger';
  }

  getStatusText(isActive: boolean): string {
    return isActive ? 'Active' : 'Inactive';
  }

  getTypeBadgeClass(type: string): string {
    return type === 'PRIVATE' ? 'badge badge-primary' : 'badge badge-info';
  }

  getTestDataBadgeClass(isTestData: boolean | undefined): string {
    return isTestData ? 'badge badge-warning' : 'badge badge-secondary';
  }

  getTestDataText(isTestData: boolean | undefined): string {
    return isTestData ? 'TEST' : 'RÉEL';
  }

  formatDate(dateString: string): string {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // --- Pagination ---
  get paginatedOrganizations(): Organization[] {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    return this.filteredOrganizations.slice(startIndex, endIndex);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredOrganizations.length / this.pageSize);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(this.totalPages, start + maxVisible - 1);
    
    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    return pages;
  }

  // ==========================================
  // GESTION DU FORMULAIRE D'AJOUT D'ORGANISATION
  // ==========================================

  /**
   * Initialiser le formulaire réactif d'ajout d'organisation
   */
  private initAddOrgForm(): void {
    this.addOrgForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      code: ['', [
        Validators.required,
        Validators.pattern(/^[A-Z0-9\-]+$/)
      ]],
      type: ['', Validators.required],
      legal_id: [''],
      address: [''],
      phone: ['', Validators.pattern(/^[\+]?[0-9\s\-]{8,15}$/)],
      email: ['', Validators.email],
      website: ['', Validators.pattern(/^https?:\/\/.+/)],
      is_active: [true]
    });
  }

  /**
   * Ouvrir la modale d'ajout d'organisation
   */
  openAddOrganizationModal(): void {
    this.showAddOrgModal = true;
    this.initAddOrgForm(); // Réinitialiser le formulaire
    document.body.style.overflow = 'hidden'; // Empêcher le scroll du body
  }

  /**
   * Fermer la modale d'ajout d'organisation
   */
  closeAddOrganizationModal(): void {
    if (!this.submitting) {
      this.showAddOrgModal = false;
      this.addOrgForm.reset();
      document.body.style.overflow = ''; // Réactiver le scroll
    }
  }

  /**
   * Soumettre le formulaire d'ajout d'organisation
   */
  onSubmitAddOrganization(): void {
    if (this.addOrgForm.invalid || this.submitting) {
      // Marquer tous les champs comme touchés pour afficher les erreurs
      Object.keys(this.addOrgForm.controls).forEach(key => {
        const control = this.addOrgForm.get(key);
        control?.markAsTouched();
      });
      
      // Afficher un toast d'erreur si formulaire invalide
      this.toastService.error(
        'Formulaire Invalide',
        'Veuillez corriger les erreurs avant de soumettre.'
      );
      return;
    }

    this.submitting = true;

    // Préparer les données
    const formData = this.addOrgForm.value;
    const newOrganization: Partial<Organization> = {
      name: formData.name.trim(),
      code: formData.code.trim().toUpperCase(),
      type: formData.type,
      legal_id: formData.legal_id?.trim() || null,
      address: formData.address?.trim() || null,
      phone: formData.phone?.trim() || null,
      email: formData.email?.trim() || null,
      website: formData.website?.trim() || null,
      is_active: formData.is_active
    };

    console.log('📤 Création de l\'organisation:', newOrganization);

    // Appel API pour créer l'organisation
    this.organizationService.createOrganization(newOrganization).subscribe({
      next: (createdOrg: Organization) => {
        console.log('✅ Organisation créée avec succès:', createdOrg);
        
        // Mettre submitting à false AVANT de fermer
        this.submitting = false;
        
        // Fermer la modale
        this.showAddOrgModal = false;
        this.addOrgForm.reset();
        document.body.style.overflow = '';
        
        // Recharger la liste des organisations
        this.loadOrganizations();
        
        // Afficher un toast de succès
        this.toastService.success(
          'Organisation Ajoutée',
          `L'organisation "${createdOrg.name}" a été ajoutée avec succès.`
        );
      },
      error: (error) => {
        console.error('❌ Erreur lors de la création:', error);
        
        let errorMessage = 'Une erreur est survenue lors de la création.';
        
        if (error.status === 400 && error.error) {
          // Erreurs de validation du backend
          if (error.error.code) {
            errorMessage = `Code invalide : ${error.error.code}`;
          } else if (error.error.name) {
            errorMessage = `Nom invalide : ${error.error.name}`;
          } else if (error.error.detail) {
            errorMessage = error.error.detail;
          }
        } else if (error.status === 409) {
          errorMessage = 'Ce code d\'organisation existe déjà. Veuillez en choisir un autre.';
        } else if (error.status === 500) {
          errorMessage = 'Erreur serveur. Veuillez réessayer plus tard.';
        }
        
        // Afficher un toast d'erreur
        this.toastService.error(
          'Échec de l\'Ajout',
          `L'organisation n'a pas pu être ajoutée. ${errorMessage}`
        );
        
        this.submitting = false;
      }
    });
  }

  // ==========================================
  // GESTION DES DÉTAILS D'ORGANISATION
  // ==========================================

  /**
   * Ouvrir le modal de détails d'une organisation
   */
  openOrganizationDetail(org: Organization): void {
    this.organizationToView = org;
    this.showDetailModal = true;
    document.body.style.overflow = 'hidden';
  }

  /**
   * Fermer le modal de détails
   */
  closeDetailModal(): void {
    this.showDetailModal = false;
    this.organizationToView = null;
    document.body.style.overflow = '';
  }

  // ==========================================
  // GESTION DE L'ÉDITION D'ORGANISATION
  // ==========================================

  /**
   * Ouvrir le modal d'édition d'une organisation
   */
  openEditOrganization(org: Organization): void {
    this.organizationToEdit = org;
    this.showEditModal = true;
    document.body.style.overflow = 'hidden';
    
    // Initialiser le formulaire avec les données existantes
    this.editOrgForm = this.fb.group({
      name: [org.name, [Validators.required, Validators.minLength(3)]],
      code: [org.code, [Validators.required, Validators.pattern('^[A-Za-z0-9_-]+$')]],
      type: [org.type, Validators.required],
      legal_id: [org.legal_id || ''],
      address: [org.address || ''],
      phone: [org.phone || '', [Validators.pattern('^[+]?[0-9\\s-]+$')]],
      email: [org.email || '', [Validators.email]],
      website: [org.website || '', [Validators.pattern('^https?://.+')]],
      is_active: [org.is_active]
    });
  }

  /**
   * Fermer le modal d'édition
   */
  closeEditModal(): void {
    if (!this.editing) {
      this.showEditModal = false;
      this.organizationToEdit = null;
      this.editOrgForm.reset();
      document.body.style.overflow = '';
    }
  }

  /**
   * Soumettre le formulaire d'édition
   */
  onSubmitEditOrganization(): void {
    if (this.editOrgForm.invalid || this.editing || !this.organizationToEdit) {
      Object.keys(this.editOrgForm.controls).forEach(key => {
        const control = this.editOrgForm.get(key);
        control?.markAsTouched();
      });
      
      this.toastService.error(
        'Formulaire Invalide',
        'Veuillez corriger les erreurs avant de soumettre.'
      );
      return;
    }

    this.editing = true;
    const formData = this.editOrgForm.value;
    const updatedOrganization: Partial<Organization> = {
      name: formData.name.trim(),
      code: formData.code.trim().toUpperCase(),
      type: formData.type,
      legal_id: formData.legal_id?.trim() || null,
      address: formData.address?.trim() || null,
      phone: formData.phone?.trim() || null,
      email: formData.email?.trim() || null,
      website: formData.website?.trim() || null,
      is_active: formData.is_active
    };

    console.log('📝 Mise à jour de l\'organisation:', updatedOrganization);

    this.organizationService.updateOrganization(this.organizationToEdit.id, updatedOrganization).subscribe({
      next: (updatedOrg: Organization) => {
        console.log('✅ Organisation mise à jour avec succès:', updatedOrg);
        
        // Mettre editing à false avant de fermer
        this.editing = false;
        
        // Fermer le modal
        this.showEditModal = false;
        this.organizationToEdit = null;
        this.editOrgForm.reset();
        document.body.style.overflow = '';
        
        // Recharger la liste
        this.loadOrganizations();
        
        // Afficher le toast de succès
        this.toastService.success(
          'Organisation Modifiée',
          `L'organisation "${updatedOrg.name}" a été modifiée avec succès.`
        );
      },
      error: (error) => {
        console.error('❌ Erreur lors de la modification:', error);
        
        let errorMessage = 'Une erreur est survenue lors de la modification.';
        
        if (error.status === 400 && error.error) {
          if (error.error.code) {
            errorMessage = `Code invalide : ${error.error.code}`;
          } else if (error.error.name) {
            errorMessage = `Nom invalide : ${error.error.name}`;
          } else if (error.error.detail) {
            errorMessage = error.error.detail;
          }
        } else if (error.status === 409) {
          errorMessage = 'Ce code d\'organisation existe déjà. Veuillez en choisir un autre.';
        } else if (error.status === 500) {
          errorMessage = 'Erreur serveur. Veuillez réessayer plus tard.';
        }
        
        this.toastService.error(
          'Échec de la Modification',
          `L'organisation n'a pas pu être modifiée. ${errorMessage}`
        );
        
        this.editing = false;
      }
    });
  }

  // ==========================================
  // GESTION DE LA SUPPRESSION D'ORGANISATION
  // ==========================================

  /**
   * Ouvrir la fenêtre de confirmation de suppression
   */
  openDeleteConfirmation(org: Organization): void {
    this.organizationToDelete = org;
    this.showDeleteModal = true;
    document.body.style.overflow = 'hidden';
  }

  /**
   * Fermer la fenêtre de confirmation
   */
  closeDeleteConfirmation(): void {
    if (!this.deleting) {
      this.showDeleteModal = false;
      this.organizationToDelete = null;
      document.body.style.overflow = '';
    }
  }

  /**
   * Confirmer et exécuter la suppression
   */
  confirmDelete(): void {
    if (!this.organizationToDelete || this.deleting) {
      return;
    }

    this.deleting = true;
    const orgId = this.organizationToDelete.id;
    const orgName = this.organizationToDelete.name;

    console.log('🗑️ Suppression de l\'organisation:', orgId);

    this.organizationService.deleteOrganization(orgId).subscribe({
      next: () => {
        console.log('✅ Organisation supprimée avec succès');
        
        // Fermer le modal
        this.deleting = false;
        this.showDeleteModal = false;
        this.organizationToDelete = null;
        document.body.style.overflow = '';
        
        // Recharger la liste
        this.loadOrganizations();
        
        // Afficher un toast de succès
        this.toastService.success(
          'Organisation Supprimée',
          `L'organisation "${orgName}" a été supprimée avec succès.`
        );
      },
      error: (error) => {
        console.error('❌ Erreur lors de la suppression:', error);
        
        let errorMessage = 'Une erreur est survenue lors de la suppression.';
        
        if (error.status === 400 && error.error) {
          // Erreur de validation du backend (membres présents)
          if (error.error.detail) {
            errorMessage = error.error.detail;
          } else if (error.error.non_field_errors) {
            errorMessage = error.error.non_field_errors[0];
          }
        } else if (error.status === 404) {
          errorMessage = 'Cette organisation n\'existe plus.';
        } else if (error.status === 403) {
          errorMessage = 'Vous n\'avez pas les permissions pour supprimer cette organisation.';
        } else if (error.status === 500) {
          errorMessage = 'Erreur serveur. Veuillez réessayer plus tard.';
        }
        
        // Afficher un toast d'erreur
        this.toastService.error(
          'Suppression Impossible',
          errorMessage
        );
        
        this.deleting = false;
      }
    });
  }

  // ==========================================
  // GESTION DE LA SUPPRESSION EN GROUPE
  // ==========================================

  /**
   * Obtenir la liste des organisations sélectionnées
   */
  getSelectedOrganizationsList(): Organization[] {
    return this.organizations.filter(org => this.selectedOrganizations.has(org.id));
  }

  /**
   * Ouvrir la fenêtre de confirmation de suppression en groupe
   */
  openBulkDeleteConfirmation(): void {
    if (this.selectedOrganizations.size === 0) {
      this.toastService.warning(
        'Aucune Sélection',
        'Veuillez sélectionner au moins une organisation à supprimer.'
      );
      return;
    }
    
    this.showBulkDeleteModal = true;
    document.body.style.overflow = 'hidden';
  }

  /**
   * Fermer la fenêtre de confirmation de suppression en groupe
   */
  closeBulkDeleteConfirmation(): void {
    if (!this.bulkDeleting) {
      this.showBulkDeleteModal = false;
      document.body.style.overflow = '';
    }
  }

  /**
   * Confirmer et exécuter la suppression en groupe
   */
  confirmBulkDelete(): void {
    if (this.selectedOrganizations.size === 0 || this.bulkDeleting) {
      return;
    }

    this.bulkDeleting = true;
    const selectedIds = Array.from(this.selectedOrganizations);

    console.log('🗑️ Suppression en groupe des organisations:', selectedIds);

    this.organizationService.bulkDeleteOrganizations(selectedIds).subscribe({
      next: (response) => {
        console.log('✅ Suppression en groupe réussie:', response);
        
        const deletedCount = response.deleted_count || 0;
        const totalRequested = response.total_requested || 0;
        const nonDeletable = response.non_deletable || [];
        
        // Fermer le modal
        this.bulkDeleting = false;
        this.showBulkDeleteModal = false;
        document.body.style.overflow = '';
        
        // Vider la sélection
        this.selectedOrganizations.clear();
        
        // Recharger la liste
        this.loadOrganizations();
        
        // Construire le message de succès détaillé
        let successMessage = `${deletedCount} organisation(s) sur ${totalRequested} ont été supprimées avec succès.`;
        
        if (nonDeletable.length > 0) {
          const orgNames = nonDeletable.map((org: any) => `"${org.name}" (${org.member_count} membre(s))`).join(', ');
          successMessage += `\n\nLes organisations suivantes n'ont pas pu être supprimées car elles contiennent des membres actifs : ${orgNames}`;
          
          this.toastService.warning(
            'Suppression Partielle',
            successMessage
          );
        } else {
          this.toastService.success(
            'Suppression Réussie',
            successMessage
          );
        }
      },
      error: (error) => {
        console.error('❌ Erreur lors de la suppression en groupe:', error);
        
        let errorMessage = 'Une erreur est survenue lors de la suppression.';
        
        if (error.status === 400 && error.error) {
          if (error.error.detail) {
            errorMessage = error.error.detail;
          }
          
          // Si des organisations ne peuvent pas être supprimées
          if (error.error.non_deletable && error.error.non_deletable.length > 0) {
            const orgNames = error.error.non_deletable.map((org: any) => `"${org.name}" (${org.member_count} membre(s))`).join(', ');
            errorMessage += `\n\nOrganisations concernées : ${orgNames}`;
          }
        } else if (error.status === 403) {
          errorMessage = 'Vous n\'avez pas les permissions pour supprimer des organisations.';
        } else if (error.status === 404) {
          errorMessage = 'Aucune organisation trouvée.';
        } else if (error.status === 500) {
          errorMessage = 'Erreur serveur. Veuillez réessayer plus tard.';
        }
        
        this.toastService.error(
          'Échec de la Suppression',
          errorMessage
        );
        
        this.bulkDeleting = false;
      }
    });
  }
}
