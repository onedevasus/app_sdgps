import { Component, OnInit, OnDestroy, HostListener, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';
import { UserService } from '../../../../core/services/user.service';
import { OrganizationService } from '../../../../core/services/organization.service';
import { UserPreferencesService } from '../../../../core/services/user-preferences.service';
import { ToastService } from '../../../../core/services/toast.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { User, CreateUserPayload, UpdateUserPayload, UserRole } from '../../../../core/models/user.model';
import { Organization } from '../../../../core/models/organization.model';

interface ColumnConfig {
  field: string;
  label: string;
  visible: boolean;
  width?: string;
  type?: 'text' | 'email' | 'date' | 'boolean' | 'role' | 'status' | 'actions';
}

interface MenuItem {
  label: string;
  icon: string;
  action: string;
  danger?: boolean;
  divider?: boolean;
}

@Component({
  selector: 'app-user-list',
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.scss'],
})
export class UserListComponent implements OnInit, OnDestroy {
  readonly Math = Math;
  private destroy$ = new Subject<void>();
  private boundHandleClickOutside!: (event: Event) => void;

  // Données
  users: User[] = [];
  organizations: Organization[] = [];
  filteredUsers: User[] = [];
  paginatedUsers: User[] = [];

  // Configuration des colonnes
  columns: ColumnConfig[] = [
    { field: 'first_name',    label: 'Nom complet',       visible: true,  width: '200px', type: 'text' },
    { field: 'email',         label: 'Email',              visible: true,  width: '220px', type: 'email' },
    { field: 'role',          label: 'Rôle',               visible: true,  width: '140px', type: 'role' },
    { field: 'organization_name', label: 'Organisation',  visible: true,  width: '180px', type: 'text' },
    { field: 'is_active',     label: 'Statut',             visible: true,  width: '120px', type: 'status' },
    { field: 'last_connection_at', label: 'Dernière connexion', visible: true, width: '150px', type: 'date' },
    { field: 'must_change_password', label: 'MDP à changer', visible: false, width: '130px', type: 'boolean' },
    { field: 'date_joined',   label: 'Date d\'inscription', visible: false, width: '150px', type: 'date' },
    { field: 'password_changed_at', label: 'Dernier changement MDP', visible: false, width: '150px', type: 'date' },
    { field: 'is_deleted',    label: 'Supprimé',           visible: false, width: '100px', type: 'boolean' },
    { field: 'is_superuser',  label: 'Superuser',          visible: false, width: '100px', type: 'boolean' },
  ];

  // Filtres
  searchText = '';
  selectedRole = '';
  selectedStatus = '';
  selectedOrganization = '';
  displayMode: 'all' | 'selected' = 'all';
  activeFieldFilter: string | null = null;
  activeFieldFilterLabel = '';
  fieldFilterValue = '';

  // Tri
  sortColumn = 'date_joined';
  sortDirection: 'asc' | 'desc' = 'desc';

  // Sélection
  selectedIds = new Set<string>();
  isAllSelected = false;

  // Pagination
  currentPage = 1;
  pageSize = 10;
  pageSizeOptions = [5, 8, 10, 20, 50];

  // Modales CRUD & Confirmation
  showAddModal = false;
  showEditModal = false;
  showDetailModal = false;
  showDeleteModal = false;
  showConfirmToggleModal = false;
  toggleTargetUser: User | null = null;
  toggleAction: 'activer' | 'désactiver' = 'activer';
  showDetailUser: User | null = null;
  editUser: User | null = null;
  deleteUser: User | null = null;
  isBulkDelete = false;
  addForm: FormGroup;
  editForm: FormGroup;
  submitting = false;
  deleting = false;
  bulkDeleting = false;

  // Reset Password Modal
  showResetPasswordModal = false;
  resetPasswordUser: User | null = null;
  newPassword = '';
  resetting = false;
  regenerating = false;
  showPassword = false;
  copied = false;

  // Column Config Modal
  showColumnConfig = false;
  private columnsBackup: ColumnConfig[] = [];
  columnFilter: 'all' | 'visible' = 'all';
  showColumnFilterMenu = false;
  draggedColumnIndex: number | null = null;
  dragOverIndex: number | null = null;

  // Dropdowns
  showExportMenu = false;
  showFilterMenu = false;
  showFieldFilterMenu = false;

  // Menus contextuels
  showColumnContextMenu = false;
  showRowContextMenu = false;
  contextMenuPosition = { x: 0, y: 0 };
  contextMenuColumn: ColumnConfig | null = null;
  contextMenuUser: User | null = null;
  contextMenuField: string | null = null;
  selectedCellValue: string | null = null;

  // UI
  loading = false;

  // Pas de mot de passe généré automatiquement, mais bouton pour générer
  showAddPassword = true;
  generatedPassword = '';

  currentUserId: number | null = null;

  constructor(
    private userService: UserService,
    private organizationService: OrganizationService,
    private preferencesService: UserPreferencesService,
    private toastService: ToastService,
    private authService: AuthService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
  ) {
    this.currentUserId = this.authService.getUserId();
    this.addForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      first_name: ['', Validators.required],
      last_name: ['', Validators.required],
      password: [''],
      role: ['ROLE_ORGANISATION_AGENT', Validators.required],
      organization_id: ['', Validators.required],
      must_change_password: [true],
    });
    this.editForm = this.fb.group({
      first_name: ['', Validators.required],
      last_name: ['', Validators.required],
      is_active: [true],
      role: ['', Validators.required],
      organization_id: [''],
    });
  }

  ngOnInit(): void {
    this.loadUsers();
    this.loadOrganizations();
    this.loadPreferences();
    this.boundHandleClickOutside = this.handleGlobalClick.bind(this);
    document.addEventListener('click', this.boundHandleClickOutside);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.boundHandleClickOutside) {
      document.removeEventListener('click', this.boundHandleClickOutside);
    }
  }

  // ============================================
  // Chargement des données
  // ============================================

  loadUsers(): void {
    this.loading = true;
    const params: any = {};
    if (this.selectedStatus === 'deleted') {
      params.show_deleted = true;
    }
    this.userService.getUsers(params).pipe(takeUntil(this.destroy$)).subscribe({
      next: (users) => {
        this.users = users;
        this.applyFiltersAndSort();
        this.loading = false;
      },
      error: () => {
        this.toastService.error('Erreur', 'Erreur lors du chargement des utilisateurs');
        this.loading = false;
      },
    });
  }

  loadOrganizations(): void {
    this.organizationService.getOrganizations().pipe(takeUntil(this.destroy$)).subscribe({
      next: (orgs) => {
        this.organizations = orgs;
      },
    });
  }

  loadPreferences(): void {
    const saved = localStorage.getItem('sdgps_user_table_prefs');
    if (saved) {
      try {
        const prefs = JSON.parse(saved);
        if (prefs.columns) {
          this.restoreColumnConfig(prefs.columns);
        }
        if (prefs.sortColumn) this.sortColumn = prefs.sortColumn;
        if (prefs.sortDirection) this.sortDirection = prefs.sortDirection;
        if (prefs.pageSize) this.pageSize = prefs.pageSize;
        if (prefs.displayMode) this.displayMode = prefs.displayMode;
      } catch (e) {
        console.warn('Erreur lors du chargement des préférences:', e);
      }
    }
  }

  savePreferences(): void {
    const prefs = {
      columns: this.columns.map(c => ({ field: c.field, visible: c.visible })),
      sortColumn: this.sortColumn,
      sortDirection: this.sortDirection,
      pageSize: this.pageSize,
      displayMode: this.displayMode,
    };
    localStorage.setItem('sdgps_user_table_prefs', JSON.stringify(prefs));
  }

  private restoreColumnConfig(savedConfig: any[]): void {
    const restored: ColumnConfig[] = [];
    savedConfig.forEach(savedCol => {
      const existing = this.columns.find(c => c.field === savedCol.field);
      if (existing) {
        existing.visible = savedCol.visible;
        restored.push(existing);
      }
    });
    // Ajouter les colonnes non sauvegardées à la fin
    this.columns.forEach(col => {
      if (!restored.find(r => r.field === col.field)) {
        restored.push(col);
      }
    });
    // Réordonner selon savedConfig
    const ordered: ColumnConfig[] = [];
    savedConfig.forEach(savedCol => {
      const found = this.columns.find(c => c.field === savedCol.field);
      if (found) ordered.push(found);
    });
    this.columns.forEach(col => {
      if (!ordered.find(o => o.field === col.field)) ordered.push(col);
    });
    if (ordered.length === this.columns.length) {
      this.columns = ordered;
    }
  }

  // ============================================
  // Filtrage, tri, pagination
  // ============================================

  applyFiltersAndSort(): void {
    let result = [...this.users];

    if (this.displayMode === 'selected') {
      result = result.filter(u => this.selectedIds.has(String(u.id)));
    }

    if (this.searchText) {
      const q = this.searchText.toLowerCase();
      result = result.filter(u =>
        u.first_name.toLowerCase().includes(q) ||
        u.last_name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
      );
    }
    if (this.selectedRole) {
      result = result.filter(u => u.role === this.selectedRole);
    }
    if (this.selectedStatus === 'active') {
      result = result.filter(u => u.is_active);
    } else if (this.selectedStatus === 'inactive') {
      result = result.filter(u => !u.is_active && !u.is_deleted);
    } else if (this.selectedStatus === 'deleted') {
      result = result.filter(u => u.is_deleted);
    }
    if (this.selectedOrganization) {
      result = result.filter(u => u.organization_id === this.selectedOrganization);
    }
    if (this.activeFieldFilter && this.fieldFilterValue) {
      const ff = this.activeFieldFilter;
      const fv = this.fieldFilterValue.toLowerCase();
      result = result.filter(u => {
        const val = (u as any)[ff];
        return val != null && String(val).toLowerCase().includes(fv);
      });
    }

    result.sort((a, b) => {
      let valA: any, valB: any;
      switch (this.sortColumn) {
        case 'email': valA = a.email; valB = b.email; break;
        case 'first_name': valA = a.first_name; valB = b.first_name; break;
        case 'role': valA = a.role_display; valB = b.role_display; break;
        case 'organization_name': valA = a.organization_name || ''; valB = b.organization_name || ''; break;
        case 'is_active': valA = a.is_active ? 1 : 0; valB = b.is_active ? 1 : 0; break;
        case 'last_connection_at': valA = a.last_connection_at || ''; valB = b.last_connection_at || ''; break;
        case 'date_joined': valA = a.date_joined; valB = b.date_joined; break;
        default: valA = a.date_joined; valB = b.date_joined; break;
      }
      if (valA < valB) return this.sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    this.filteredUsers = result;
    this.currentPage = 1;
    this.updatePagination();
    this.savePreferences();
  }

  updatePagination(): void {
    const start = (this.currentPage - 1) * this.pageSize;
    this.paginatedUsers = this.filteredUsers.slice(start, start + this.pageSize);
    this.isAllSelected = this.paginatedUsers.length > 0 && this.paginatedUsers.every(u => this.selectedIds.has(String(u.id)));
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredUsers.length / this.pageSize));
  }

  get pageNumbers(): number[] {
    const pages: number[] = [];
    const total = this.totalPages;
    const start = Math.max(1, this.currentPage - 2);
    const end = Math.min(total, this.currentPage + 2);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.updatePagination();
  }

  onSearchChange(): void {
    this.applyFiltersAndSort();
  }

  onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchText = input.value;
    this.applyFiltersAndSort();
  }

  clearSearch(): void {
    this.searchText = '';
    this.applyFiltersAndSort();
  }

  onRoleFilterChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.selectedRole = select.value;
    this.applyFiltersAndSort();
  }

  onStatusFilterChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const prevStatus = this.selectedStatus;
    this.selectedStatus = select.value;
    if (this.selectedStatus === 'deleted' || prevStatus === 'deleted') {
      this.loadUsers();
    } else {
      this.applyFiltersAndSort();
    }
  }

  onOrganizationFilterChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.selectedOrganization = select.value;
    this.applyFiltersAndSort();
  }

  onFilterChange(): void {
    this.applyFiltersAndSort();
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.updatePagination();
    this.savePreferences();
  }

  sortBy(column: string): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    this.applyFiltersAndSort();
  }

  getSortIcon(column: string): string {
    if (this.sortColumn !== column) return 'fas fa-sort';
    return this.sortDirection === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down';
  }

  // ============================================
  // Sélection
  // ============================================

  toggleSelection(id: string): void {
    const idStr = String(id);
    if (this.selectedIds.has(idStr)) {
      this.selectedIds.delete(idStr);
    } else {
      this.selectedIds.add(idStr);
    }
    this.isAllSelected = this.paginatedUsers.length > 0 && this.paginatedUsers.every(u => this.selectedIds.has(String(u.id)));
  }

  selectAll(): void {
    this.filteredUsers.forEach(u => this.selectedIds.add(String(u.id)));
    this.isAllSelected = true;
  }

  deselectAll(): void {
    this.selectedIds.clear();
    this.isAllSelected = false;
  }

  toggleSelectAll(): void {
    if (this.isAllSelected) {
      this.deselectAll();
    } else {
      this.selectAll();
    }
  }

  invertSelection(): void {
    this.paginatedUsers.forEach(u => {
      const idStr = String(u.id);
      if (this.selectedIds.has(idStr)) {
        this.selectedIds.delete(idStr);
      } else {
        this.selectedIds.add(idStr);
      }
    });
    this.isAllSelected = this.paginatedUsers.length > 0 && this.paginatedUsers.every(u => this.selectedIds.has(String(u.id)));
  }

  isSelected(user: User): boolean {
    return this.selectedIds.has(String(user.id));
  }

  isCurrentUserSelected(): boolean {
    if (this.currentUserId === null) return false;
    return this.selectedIds.has(String(this.currentUserId));
  }

  moveSelectionToTop(): void {
    if (this.selectedIds.size === 0) return;
    const selected = this.users.filter(u => this.selectedIds.has(String(u.id)));
    const notSelected = this.users.filter(u => !this.selectedIds.has(String(u.id)));
    this.users = [...selected, ...notSelected];
    this.applyFiltersAndSort();
    const selectedFiltered = this.filteredUsers.filter(u => this.selectedIds.has(String(u.id)));
    const notSelectedFiltered = this.filteredUsers.filter(u => !this.selectedIds.has(String(u.id)));
    this.filteredUsers = [...selectedFiltered, ...notSelectedFiltered];
    this.currentPage = 1;
    this.updatePagination();
  }

  getSelectedUsersList(): User[] {
    return this.users.filter(u => this.selectedIds.has(String(u.id)));
  }

  // ============================================
  // Menu contextuel cellules (clic droit)
  // ============================================

  onCellRightClick(event: MouseEvent, user: User, field: string): void {
    event.preventDefault();
    event.stopPropagation();
    this.contextMenuPosition = { x: event.clientX, y: event.clientY };
    this.contextMenuUser = user;
    this.contextMenuField = field;
    this.selectedCellValue = field ? String((user as any)[field] ?? '') : null;
    this.showRowContextMenu = true;
  }

  toggleRowSelectionFromContext(): void {
    if (this.contextMenuUser) {
      this.toggleSelection(this.contextMenuUser.id);
    }
    this.closeAllContextMenus();
  }

  selectAllFromContext(): void {
    this.selectAll();
    this.closeAllContextMenus();
  }

  copyCellValueFromContext(): void {
    if (this.selectedCellValue != null) {
      navigator.clipboard.writeText(this.selectedCellValue).then(() => {
        this.toastService.success('Copié', 'Valeur copiée dans le presse-papier');
      });
    }
    this.closeAllContextMenus();
  }

  openDetailFromContext(): void {
    if (this.contextMenuUser) {
      this.openDetailModal(this.contextMenuUser);
    }
    this.closeAllContextMenus();
  }

  openEditFromContext(): void {
    if (this.contextMenuUser) {
      this.openEditModal(this.contextMenuUser);
    }
    this.closeAllContextMenus();
  }

  openDeleteFromContext(): void {
    if (this.contextMenuUser) {
      this.openDeleteModal(this.contextMenuUser);
    }
    this.closeAllContextMenus();
  }

  // ============================================
  // Mode d'affichage / Filtre
  // ============================================

  setDisplayMode(mode: 'all' | 'selected'): void {
    this.displayMode = mode;
    this.applyFiltersAndSort();
  }

  toggleFilterMenu(): void {
    this.showFilterMenu = !this.showFilterMenu;
    if (this.showFilterMenu) {
      this.showExportMenu = false;
    }
  }

  selectFieldForFilter(field: string, label: string): void {
    this.activeFieldFilter = field;
    this.activeFieldFilterLabel = label;
    this.fieldFilterValue = '';
    this.showFieldFilterMenu = false;
    this.showFilterMenu = false;
    this.applyFiltersAndSort();
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
    this.displayMode = 'all';
    this.applyFiltersAndSort();
  }

  // ============================================
  // Pagination
  // ============================================

  setPageSize(size: number): void {
    this.pageSize = size;
    this.currentPage = 1;
    this.updatePagination();
    this.savePreferences();
  }

  goToFirstPage(): void {
    this.goToPage(1);
  }

  goToLastPage(): void {
    this.goToPage(this.totalPages);
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePagination();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePagination();
    }
  }

  formatDate(value: any): string {
    if (!value) return '—';
    const date = new Date(value);
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // ============================================
  // Colonnes — Configuration
  // ============================================

  getVisibleColumns(): ColumnConfig[] {
    return this.columns.filter(c => c.visible);
  }

  getFilteredColumns(): ColumnConfig[] {
    if (this.columnFilter === 'visible') {
      return this.columns.filter(c => c.visible);
    }
    return this.columns;
  }

  getColumnStats(): { total: number; visible: number; hidden: number } {
    const total = this.columns.length;
    const visible = this.columns.filter(c => c.visible).length;
    return { total, visible, hidden: total - visible };
  }

  toggleColumnVisibility(field: string): void {
    const col = this.columns.find(c => c.field === field);
    if (col) {
      col.visible = !col.visible;
    }
  }

  toggleColumnConfig(): void {
    if (!this.showColumnConfig) {
      this.saveColumnsBackup();
    } else {
      this.restoreColumnsBackup();
    }
    this.showColumnConfig = !this.showColumnConfig;
  }

  openColumnConfig(): void {
    this.saveColumnsBackup();
    this.showColumnConfig = true;
  }

  confirmColumnConfig(): void {
    this.showColumnConfig = false;
    this.columnsBackup = [];
    this.savePreferences();
  }

  cancelColumnConfig(): void {
    this.restoreColumnsBackup();
    this.showColumnConfig = false;
  }

  private saveColumnsBackup(): void {
    this.columnsBackup = this.columns.map(c => ({ ...c }));
  }

  private restoreColumnsBackup(): void {
    if (this.columnsBackup.length > 0) {
      this.columns = this.columnsBackup.map(c => ({ ...c }));
      this.columnsBackup = [];
    }
  }

  selectAllColumns(): void {
    this.columns.forEach(c => c.visible = true);
  }

  deselectAllColumns(): void {
    this.columns.forEach(c => c.visible = false);
  }

  invertColumnSelection(): void {
    this.columns.forEach(c => c.visible = !c.visible);
  }

  toggleColumnFilterMenu(event: Event): void {
    event.stopPropagation();
    this.showColumnFilterMenu = !this.showColumnFilterMenu;
  }

  applyColumnFilter(filter: 'all' | 'visible'): void {
    this.columnFilter = filter;
    this.showColumnFilterMenu = false;
  }

  getColumnFilterLabel(): string {
    return this.columnFilter === 'all' ? 'Toutes les colonnes' : 'Colonnes visibles';
  }

  // Drag & Drop
  onDragStart(index: number): void {
    this.draggedColumnIndex = index;
  }

  onDragOver(event: DragEvent, index: number): void {
    event.preventDefault();
    this.dragOverIndex = index;
  }

  onDragLeave(): void {
    this.dragOverIndex = null;
  }

  onDrop(index: number): void {
    if (this.draggedColumnIndex === null || this.draggedColumnIndex === index) {
      this.draggedColumnIndex = null;
      this.dragOverIndex = null;
      return;
    }
    const dragged = this.columns[this.draggedColumnIndex];
    this.columns.splice(this.draggedColumnIndex, 1);
    this.columns.splice(index, 0, dragged);
    this.draggedColumnIndex = null;
    this.dragOverIndex = null;
  }

  onDragEnd(): void {
    this.draggedColumnIndex = null;
    this.dragOverIndex = null;
  }

  moveColumnUp(index: number): void {
    if (index > 0) {
      const temp = this.columns[index];
      this.columns[index] = this.columns[index - 1];
      this.columns[index - 1] = temp;
    }
  }

  moveColumnDown(index: number): void {
    if (index < this.columns.length - 1) {
      const temp = this.columns[index];
      this.columns[index] = this.columns[index + 1];
      this.columns[index + 1] = temp;
    }
  }

  moveColumnToTop(index: number): void {
    if (index > 0) {
      const col = this.columns.splice(index, 1)[0];
      this.columns.unshift(col);
    }
  }

  moveColumnToBottom(index: number): void {
    if (index < this.columns.length - 1) {
      const col = this.columns.splice(index, 1)[0];
      this.columns.push(col);
    }
  }

  onColumnHeaderRightClick(event: MouseEvent, col: ColumnConfig): void {
    event.preventDefault();
    event.stopPropagation();
    this.contextMenuPosition = { x: event.clientX, y: event.clientY };
    this.contextMenuColumn = col;
    this.showColumnContextMenu = true;
  }

  hideColumn(col: ColumnConfig): void {
    col.visible = false;
    this.showColumnContextMenu = false;
  }

  hideColumnFromContext(): void {
    if (this.contextMenuColumn) {
      this.contextMenuColumn.visible = false;
    }
    this.showColumnContextMenu = false;
    this.contextMenuColumn = null;
  }

  openColumnConfigFromContext(): void {
    this.showColumnContextMenu = false;
    this.openColumnConfig();
  }

  getTypeLabel(type?: string): string {
    const labels: Record<string, string> = {
      text: 'TEXTE',
      email: 'EMAIL',
      date: 'DATE',
      boolean: 'BOOLÉEN',
      role: 'RÔLE',
      status: 'STATUT',
      actions: 'ACTIONS',
    };
    return type ? (labels[type] || 'TEXTE') : 'TEXTE';
  }

  getFieldDescription(field: string): string {
    const descriptions: Record<string, string> = {
      first_name: 'Nom complet de l\'utilisateur (prénom et nom)',
      email: 'Adresse email utilisée pour la connexion',
      role: 'Rôle principal de l\'utilisateur dans le système',
      organization_name: 'Organisation principale à laquelle appartient l\'utilisateur',
      is_active: 'Indique si le compte est actif ou désactivé',
      last_connection_at: 'Date et heure de la dernière connexion réussie',
      must_change_password: 'L\'utilisateur doit changer son mot de passe à la prochaine connexion',
      date_joined: 'Date et heure de création du compte',
      password_changed_at: 'Date du dernier changement de mot de passe',
      is_deleted: 'Indique si l\'utilisateur a été supprimé (soft delete)',
      is_superuser: 'Indique si l\'utilisateur a les droits super-admin',
    };
    return descriptions[field] || '';
  }

  // ============================================
  // Export
  // ============================================

  toggleExportMenu(event?: Event): void {
    if (event) event.stopPropagation();
    this.showExportMenu = !this.showExportMenu;
  }

  exportCSV(selectedOnly: boolean = false): void {
    this.showExportMenu = false;
    const data = selectedOnly
      ? this.filteredUsers.filter(u => this.selectedIds.has(String(u.id)))
      : this.filteredUsers;
    if (data.length === 0) {
      this.toastService.warning('Export', 'Aucune donnée à exporter');
      return;
    }
    const visibleCols = this.getVisibleColumns();
    const headers = visibleCols.map(c => c.label).join(';');
    const rows = data.map(u =>
      visibleCols.map(c => {
        let val: any;
        switch (c.field) {
          case 'first_name': val = `${u.first_name} ${u.last_name}`; break;
          case 'is_active': val = u.is_active ? 'Actif' : 'Inactif'; break;
          case 'is_deleted': val = u.is_deleted ? 'Oui' : 'Non'; break;
          case 'is_superuser': val = u.is_superuser ? 'Oui' : 'Non'; break;
          case 'must_change_password': val = u.must_change_password ? 'Oui' : 'Non'; break;
          case 'role': val = u.role_display; break;
          default: val = (u as any)[c.field] ?? ''; break;
        }
        return `"${String(val).replace(/"/g, '""')}"`;
      }).join(';')
    );
    const csv = '\uFEFF' + [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    const timestamp = new Date().toISOString().slice(0, 10);
    link.download = selectedOnly ? `utilisateurs_selectionnes_${timestamp}.csv` : `tous_utilisateurs_${timestamp}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    this.toastService.success('Export', 'Export CSV réussi');
  }

  // ============================================
  // CRUD
  // ============================================

  get activeUsersCount(): number {
    return this.users.filter(u => u.is_active).length;
  }

  openAddModal(): void {
    this.addForm.reset({
      role: 'ROLE_ORGANISATION_AGENT',
      must_change_password: true,
    });
    this.showAddPassword = true;
    this.generatedPassword = this.generatePassword();
    this.addForm.patchValue({ password: this.generatedPassword });
    this.showAddModal = true;
    document.body.style.overflow = 'hidden';
  }

  closeAddModal(): void {
    if (this.submitting) return;
    this.showAddModal = false;
    document.body.style.overflow = '';
  }

  generatePassword(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let pwd = '';
    for (let i = 0; i < 12; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pwd;
  }

  regeneratePassword(): void {
    this.generatedPassword = this.generatePassword();
    this.addForm.patchValue({ password: this.generatedPassword });
  }

  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      this.copied = true;
      this.toastService.success('Succès', 'Copié dans le presse-papier');
      setTimeout(() => { this.copied = false; }, 2000);
    });
  }

  onSubmitAdd(): void {
    if (this.addForm.invalid || this.submitting) {
      Object.keys(this.addForm.controls).forEach(key => {
        this.addForm.get(key)?.markAsTouched();
      });
      if (this.addForm.invalid) {
        this.toastService.error('Formulaire Invalide', 'Veuillez corriger les erreurs avant de soumettre.');
        return;
      }
      return;
    }
    this.submitting = true;
    const payload: CreateUserPayload = this.addForm.value;
    this.userService.createUser(payload).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.submitting = false;
        this.toastService.success('Succès', 'Utilisateur créé avec succès');
        this.closeAddModal();
        this.loadUsers();
      },
      error: (error) => {
        this.submitting = false;
        let msg = 'Erreur lors de la création';
        if (error.status === 400 && error.error) {
          if (error.error.email) msg = `Email : ${error.error.email}`;
          else if (error.error.detail) msg = error.error.detail;
        } else if (error.status === 409) {
          msg = 'Cet email est déjà utilisé.';
        }
        this.toastService.error('Échec de la Création', msg);
      },
    });
  }

  openEditModal(user: User): void {
    this.editUser = user;
    this.editForm.patchValue({
      first_name: user.first_name,
      last_name: user.last_name,
      is_active: user.is_active,
      role: user.role,
      organization_id: user.organization_id || '',
    });
    if (user.is_superuser) {
      this.editForm.get('role')?.disable();
    } else {
      this.editForm.get('role')?.enable();
    }
    this.showEditModal = true;
    document.body.style.overflow = 'hidden';
  }

  closeEditModal(): void {
    if (this.submitting) return;
    this.showEditModal = false;
    this.editUser = null;
    this.editForm.get('role')?.enable();
    document.body.style.overflow = '';
  }

  onSubmitEdit(): void {
    if (!this.editUser || this.editForm.invalid || this.submitting) {
      Object.keys(this.editForm.controls).forEach(key => {
        this.editForm.get(key)?.markAsTouched();
      });
      return;
    }
    this.submitting = true;
    const payload: UpdateUserPayload = {};
    const formVal = this.editForm.value;
    if (formVal.first_name !== this.editUser.first_name) payload.first_name = formVal.first_name;
    if (formVal.last_name !== this.editUser.last_name) payload.last_name = formVal.last_name;
    if (formVal.is_active !== this.editUser.is_active) payload.is_active = formVal.is_active;
    if (!this.editUser.is_superuser && formVal.role !== this.editUser.role) payload.role = formVal.role;
    if (formVal.organization_id !== (this.editUser.organization_id || '')) payload.organization_id = formVal.organization_id;

    this.userService.updateUser(this.editUser.id, payload).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.submitting = false;
        this.toastService.success('Succès', 'Utilisateur modifié avec succès');
        this.closeEditModal();
        this.loadUsers();
      },
      error: (error) => {
        this.submitting = false;
        let msg = 'Erreur lors de la modification';
        if (error.status === 400 && error.error) {
          if (error.error.detail) msg = error.error.detail;
        }
        this.toastService.error('Échec de la Modification', msg);
      },
    });
  }

  openDetailModal(user: User): void {
    this.showDetailUser = user;
    this.showDetailModal = true;
    document.body.style.overflow = 'hidden';
  }

  closeDetailModal(): void {
    this.showDetailModal = false;
    this.showDetailUser = null;
    document.body.style.overflow = '';
  }

  openDeleteModal(user: User): void {
    this.deleteUser = user;
    this.isBulkDelete = false;
    this.showDeleteModal = true;
    document.body.style.overflow = 'hidden';
  }

  openBulkDeleteModal(): void {
    this.isBulkDelete = true;
    this.showDeleteModal = true;
    document.body.style.overflow = 'hidden';
  }

  closeDeleteModal(): void {
    if (this.deleting || this.bulkDeleting) return;
    this.showDeleteModal = false;
    this.deleteUser = null;
    this.isBulkDelete = false;
    document.body.style.overflow = '';
  }

  confirmDelete(): void {
    if (this.isBulkDelete) {
      if (this.bulkDeleting || this.selectedIds.size === 0) return;
      if (this.isCurrentUserSelected()) {
        this.selectedIds.delete(String(this.currentUserId!));
        if (this.selectedIds.size === 0) {
          this.toastService.warning('Opération annulée', 'Vous ne pouvez pas supprimer votre propre compte.');
          this.closeDeleteModal();
          return;
        }
        this.toastService.warning('Attention', 'Votre propre compte a été exclu de la suppression.');
      }
      this.bulkDeleting = true;
      const ids = Array.from(this.selectedIds);
      let completed = 0;
      let hasError = false;
      ids.forEach(id => {
        this.userService.deleteUser(id).pipe(takeUntil(this.destroy$)).subscribe({
          next: () => {
            completed++;
            if (completed === ids.length) {
              this.bulkDeleting = false;
              if (!hasError) {
                this.toastService.success('Succès', `${ids.length} utilisateur(s) supprimé(s)`);
              }
              this.closeDeleteModal();
              this.selectedIds.clear();
              this.loadUsers();
            }
          },
          error: () => {
            hasError = true;
            completed++;
            if (completed === ids.length) {
              this.bulkDeleting = false;
              this.closeDeleteModal();
              this.selectedIds.clear();
              this.loadUsers();
            }
          },
        });
      });
    } else if (this.deleteUser) {
      if (this.deleting) return;
      this.deleting = true;
      this.userService.deleteUser(this.deleteUser.id).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          this.deleting = false;
          this.toastService.success('Suppression Réussie', `L'utilisateur "${this.deleteUser!.first_name} ${this.deleteUser!.last_name}" a été supprimé.`);
          this.closeDeleteModal();
          this.loadUsers();
        },
        error: (error) => {
          this.deleting = false;
          let msg = 'Erreur lors de la suppression';
          if (error.status === 400 && error.error?.detail) msg = error.error.detail;
          this.toastService.error('Suppression Impossible', msg);
        },
      });
    }
  }

  openResetPasswordModal(user: User): void {
    if (this.isCurrentUser(user)) return;
    this.resetPasswordUser = user;
    this.newPassword = '';
    this.resetting = false;
    this.regenerating = false;
    this.showResetPasswordModal = true;
    document.body.style.overflow = 'hidden';
  }

  closeResetPasswordModal(): void {
    this.showResetPasswordModal = false;
    this.resetPasswordUser = null;
    this.newPassword = '';
    this.resetting = false;
    this.regenerating = false;
    this.showPassword = false;
    this.copied = false;
    document.body.style.overflow = '';
  }

  confirmResetPassword(): void {
    if (!this.resetPasswordUser) return;
    this.resetting = true;
    this.userService.resetPassword(this.resetPasswordUser.id, { must_change_password: true }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        this.newPassword = res.new_password;
        this.resetting = false;
      },
      error: () => {
        this.resetting = false;
        this.toastService.error('Erreur', 'Erreur lors de la réinitialisation');
      },
    });
  }

  regenerateResetPassword(): void {
    if (!this.resetPasswordUser) return;
    this.regenerating = true;
    this.copied = false;
    this.userService.resetPassword(this.resetPasswordUser.id, { must_change_password: true }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        this.newPassword = res.new_password;
        this.regenerating = false;
      },
      error: () => {
        this.regenerating = false;
        this.toastService.error('Erreur', 'Erreur lors de la régénération');
      },
    });
  }

  isCurrentUser(user: User): boolean {
    return this.currentUserId !== null && Number(user.id) === this.currentUserId;
  }

  openToggleModal(user: User): void {
    this.toggleTargetUser = user;
    this.toggleAction = user.is_active ? 'désactiver' : 'activer';
    this.showConfirmToggleModal = true;
    document.body.style.overflow = 'hidden';
  }

  closeToggleModal(): void {
    this.showConfirmToggleModal = false;
    this.toggleTargetUser = null;
    document.body.style.overflow = '';
  }

  confirmToggle(): void {
    if (!this.toggleTargetUser) return;
    this.userService.toggleActive(this.toggleTargetUser.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.toastService.success('Succès', `Compte ${this.toggleAction} avec succès`);
        this.closeToggleModal();
        this.loadUsers();
      },
      error: () => this.toastService.error('Erreur', 'Erreur lors du changement de statut'),
    });
  }

  // ============================================
  // Menu contextuel des lignes (clic droit)
  // ============================================

  onRowRightClick(event: MouseEvent, user: User, field?: string): void {
    event.preventDefault();
    event.stopPropagation();
    this.contextMenuPosition = { x: event.clientX, y: event.clientY };
    this.contextMenuUser = user;
    this.contextMenuField = field || null;
    this.selectedCellValue = field ? String((user as any)[field] ?? '') : null;
    this.showRowContextMenu = true;
  }

  // ============================================
  // Helpers globaux
  // ============================================

  getRoleBadgeClass(role: string): string {
    switch (role) {
      case 'ROLE_SUPER_ADMIN': return 'badge-super-admin';
      case 'ROLE_APP_ADMIN': return 'badge-admin';
      case 'ROLE_ORGANISATION_ADMIN': return 'badge-org-admin';
      case 'ROLE_ORGANISATION_AGENT': return 'badge-agent';
      default: return 'badge-default';
    }
  }

  getRoleLongName(role: string): string {
    switch (role) {
      case 'ROLE_SUPER_ADMIN': return 'Super Admin';
      case 'ROLE_APP_ADMIN': return 'Admin Système';
      case 'ROLE_ORGANISATION_ADMIN': return 'Admin Organisation';
      case 'ROLE_ORGANISATION_AGENT': return 'Agent Organisation';
      default: return role;
    }
  }

  getCellValue(user: User, field: string): string {
    switch (field) {
      case 'first_name': return `${user.first_name} ${user.last_name}`;
      case 'role': return this.getRoleLongName(user.role);
      case 'is_active': return user.is_active ? 'Actif' : (user.is_deleted ? 'Supprimé' : 'Inactif');
      case 'is_deleted': return user.is_deleted ? 'Oui' : 'Non';
      case 'is_superuser': return user.is_superuser ? 'Oui' : 'Non';
      case 'must_change_password': return user.must_change_password ? 'Oui' : 'Non';
      default: return String((user as any)[field] ?? '—');
    }
  }

  closeAllContextMenus(): void {
    this.showColumnContextMenu = false;
    this.showRowContextMenu = false;
    this.contextMenuColumn = null;
    this.contextMenuUser = null;
    this.contextMenuField = null;
  }

  private handleGlobalClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.filter-menu-wrapper') && !target.closest('.context-menu')) {
      this.showExportMenu = false;
      this.showFilterMenu = false;
      this.showFieldFilterMenu = false;
      this.showColumnFilterMenu = false;
      this.closeAllContextMenus();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.showColumnConfig) { this.cancelColumnConfig(); return; }
    if (this.showAddModal) { this.closeAddModal(); return; }
    if (this.showEditModal) { this.closeEditModal(); return; }
    if (this.showDetailModal) { this.closeDetailModal(); return; }
    if (this.showDeleteModal) { this.closeDeleteModal(); return; }
    if (this.showResetPasswordModal) { this.closeResetPasswordModal(); return; }
    if (this.showConfirmToggleModal) { this.closeToggleModal(); return; }
  }
}