import { Component, OnInit, HostListener } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Observable, forkJoin } from 'rxjs';
import { OrganismeService } from '../../../../core/services/organisme.service';
import { ToastService } from '../../../../core/services/toast.service';
import { OrganismeNiveau1 } from '../../../../core/models/organisme.model';

interface ColumnConfig {
  field: string;
  label: string;
  visible: boolean;
  type: 'text' | 'number' | 'boolean' | 'date';
}

/**
 * Gestion (CRUD) des organismes — composant unique piloté par `route.data.niveau` (1 ou 2).
 * Aligné sur la page « gestion des projets » : onglets Actifs / Corbeille, tableau avec tous
 * les outils (sélection, export, organisation des colonnes, filtres footer gauche, pagination
 * footer droite, menus contextuels) et modales au design du design system. UI réservée à
 * SUPER_ADMIN / ADMIN_SYSTEME.
 */
@Component({
  selector: 'app-organisme-list',
  templateUrl: './organisme-list.component.html',
  styleUrls: ['./organisme-list.component.scss'],
})
export class OrganismeListComponent implements OnInit {
  readonly Math = Math;

  niveau: 1 | 2 = 1;
  title = 'Organismes';

  // Onglets Actifs / Corbeille : les deux listes sont chargées en une fois.
  activeRows: any[] = [];
  deletedRows: any[] = [];
  showDeleted = false;
  get rows(): any[] { return this.showDeleted ? this.deletedRows : this.activeRows; }
  get activeCount(): number { return this.activeRows.length; }
  get deletedCount(): number { return this.deletedRows.length; }

  filtered: any[] = [];
  selectedIds = new Set<string>();
  niveau1Options: OrganismeNiveau1[] = [];

  columns: ColumnConfig[] = [];
  private columnsBackup: ColumnConfig[] = [];

  // Tri
  sortColumn: string | null = 'nom';
  sortDirection: 'asc' | 'desc' = 'asc';

  // Recherche + filtres
  searchQuery = '';
  statusFilter: 'all' | 'active' | 'inactive' = 'all';
  displayMode: 'all' | 'selected' = 'all';

  // Filtre par champ (footer gauche)
  activeFieldFilter: string | null = null;
  activeFieldFilterLabel = '';
  fieldFilterValue = '';

  // Pagination
  currentPage = 1;
  pageSize = 8;
  pageSizeOptions = [5, 8, 10, 20, 50];

  // Menus
  showExportMenu = false;
  showFilterMenu = false;
  showFieldFilterMenu = false;
  showColumnConfig = false;
  showColumnFilterMenu = false;
  columnFilter: 'all' | 'visible' = 'all';

  // Drag & drop colonnes
  draggedColumnIndex: number | null = null;
  dragOverIndex: number | null = null;

  // Menus contextuels
  showColumnContextMenu = false;
  showRowContextMenu = false;
  contextMenuPosition = { x: 0, y: 0 };
  columnForContext: ColumnConfig | null = null;
  rowForContext: any = null;
  cellForContext: { row: any; field: string; value: any } | null = null;

  // État UI
  loading = false;
  submitting = false;
  deleting = false;
  bulkBusy = false;

  // Modales
  showFormModal = false;
  editing: any = null;
  form!: FormGroup;
  showDeleteModal = false;
  toDelete: any = null;
  isBulkDelete = false;
  showRestoreModal = false;
  toRestore: any = null;
  isBulkRestore = false;

  private readonly descriptions: { [k: string]: string } = {
    code: "Identifiant court unique de l'organisme.",
    nom: "Nom officiel de l'organisme.",
    sigle: 'Abréviation / sigle.',
    ville: 'Ville ou province de rattachement (deuxième niveau).',
    niveau1_nom: 'Organisme de premier niveau dont dépend cette entité.',
    nbr_niveaux2: "Nombre d'organismes de deuxième niveau rattachés.",
    is_active: 'Organisme actif ou désactivé.',
    created_at: 'Date de création.',
    updated_at: 'Date de dernière modification.',
    deleted_at: 'Date de suppression (corbeille).',
    created_by_email: "Utilisateur ayant créé l'organisme.",
    updated_by_email: "Utilisateur ayant effectué la dernière modification.",
    deleted_by_email: "Utilisateur ayant supprimé l'organisme.",
  };

  constructor(
    private fb: FormBuilder,
    private service: OrganismeService,
    private toast: ToastService,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.route.data.subscribe(d => {
      this.niveau = d['niveau'] === 2 ? 2 : 1;
      this.title = d['title'] || (this.niveau === 1 ? 'Organismes — premier niveau'
                                                    : 'Organismes — deuxième niveau');
      this.sortColumn = 'nom';
      this.showDeleted = false;
      this.selectedIds.clear();
      this.initColumns();
      this.buildForm();
      this.loadNiveau1Options();
      this.load();
    });
  }

  // ------------------------------------------------------------------ rôles
  get isN2(): boolean { return this.niveau === 2; }

  get currentUserRole(): string {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return 'ROLE_ORGANISATION_AGENT';
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.platform_role || payload.role || 'ROLE_ORGANISATION_AGENT';
    } catch { return 'ROLE_ORGANISATION_AGENT'; }
  }

  get canManage(): boolean {
    return this.currentUserRole === 'ROLE_SUPER_ADMIN'
        || this.currentUserRole === 'ROLE_ADMIN_SYSTEME';
  }

  // ------------------------------------------------------------------ colonnes
  private storageKey(): string { return `sdgps_organismes_n${this.niveau}_cols`; }

  private initColumns(): void {
    const audit: ColumnConfig[] = [
      { field: 'created_at', label: 'Créé le', visible: true, type: 'date' },
      { field: 'created_by_email', label: 'Créé par', visible: false, type: 'text' },
      { field: 'updated_at', label: 'Modifié le', visible: false, type: 'date' },
      { field: 'updated_by_email', label: 'Modifié par', visible: false, type: 'text' },
      { field: 'deleted_at', label: 'Supprimé le', visible: false, type: 'date' },
      { field: 'deleted_by_email', label: 'Supprimé par', visible: false, type: 'text' },
    ];
    const defaults: ColumnConfig[] = this.isN2 ? [
      { field: 'code', label: 'Code', visible: true, type: 'text' },
      { field: 'nom', label: 'Nom', visible: true, type: 'text' },
      { field: 'niveau1_nom', label: 'Premier niveau', visible: true, type: 'text' },
      { field: 'ville', label: 'Ville / province', visible: true, type: 'text' },
      { field: 'sigle', label: 'Sigle', visible: false, type: 'text' },
      { field: 'is_active', label: 'Statut', visible: true, type: 'boolean' },
      ...audit,
    ] : [
      { field: 'code', label: 'Code', visible: true, type: 'text' },
      { field: 'nom', label: 'Nom', visible: true, type: 'text' },
      { field: 'sigle', label: 'Sigle', visible: true, type: 'text' },
      { field: 'nbr_niveaux2', label: 'Nb. 2e niveau', visible: true, type: 'number' },
      { field: 'is_active', label: 'Statut', visible: true, type: 'boolean' },
      ...audit,
    ];
    try {
      const saved = JSON.parse(localStorage.getItem(this.storageKey()) || 'null');
      if (Array.isArray(saved) && saved.length) {
        const known = new Map(defaults.map(c => [c.field, c]));
        const ordered: ColumnConfig[] = [];
        saved.forEach((s: any) => {
          const c = known.get(s.field);
          if (c) { ordered.push({ ...c, visible: !!s.visible }); known.delete(s.field); }
        });
        known.forEach(c => ordered.push(c));
        this.columns = ordered;
        return;
      }
    } catch {}
    this.columns = defaults;
  }

  private saveColumns(): void {
    try {
      localStorage.setItem(this.storageKey(),
        JSON.stringify(this.columns.map(c => ({ field: c.field, visible: c.visible }))));
    } catch {}
  }

  getVisibleColumns(): ColumnConfig[] { return this.columns.filter(c => c.visible); }
  getFieldDescription(field: string): string { return this.descriptions[field] || ''; }
  getTypeLabel(type: string): string {
    return { text: 'Texte', number: 'Nombre', boolean: 'Booléen', date: 'Date' }[type] || 'Texte';
  }

  // ------------------------------------------------------------------ chargement
  private buildForm(item?: any): void {
    const base: any = {
      code: [item?.code || '', Validators.required],
      nom: [item?.nom || '', Validators.required],
      sigle: [item?.sigle || ''],
      is_active: [item?.is_active ?? true],
    };
    if (this.isN2) {
      base.niveau1 = [item?.niveau1 || '', Validators.required];
      base.ville = [item?.ville || ''];
    }
    this.form = this.fb.group(base);
  }

  private loadNiveau1Options(): void {
    this.service.getNiveau1().subscribe({
      next: opts => (this.niveau1Options = opts),
      error: () => (this.niveau1Options = []),
    });
  }

  load(): void {
    this.loading = true;
    const active$ = this.isN2 ? this.service.getNiveau2({ show_deleted: false }) : this.service.getNiveau1({ show_deleted: false });
    const deleted$ = this.isN2 ? this.service.getNiveau2({ show_deleted: true }) : this.service.getNiveau1({ show_deleted: true });
    forkJoin([active$, deleted$]).subscribe({
      next: ([active, deleted]) => {
        this.activeRows = active; this.deletedRows = deleted;
        this.selectedIds.clear(); this.applyFilters(); this.loading = false;
      },
      error: () => { this.toast.error('Erreur', 'Chargement des organismes impossible.'); this.activeRows = []; this.deletedRows = []; this.applyFilters(); this.loading = false; },
    });
  }

  setTab(deleted: boolean): void {
    if (this.showDeleted === deleted) return;
    this.showDeleted = deleted;
    this.selectedIds.clear();
    this.searchQuery = '';
    this.statusFilter = 'all';
    this.displayMode = 'all';
    this.activeFieldFilter = null;
    this.currentPage = 1;
    this.applyFilters();
  }

  // ------------------------------------------------------------------ filtres/tri
  applyFilters(): void {
    let data = [...this.rows];

    if (this.displayMode === 'selected') data = data.filter(r => this.selectedIds.has(r.id));

    const q = this.searchQuery.trim().toLowerCase();
    if (q) {
      data = data.filter(r => [r.code, r.nom, r.sigle, r.ville, r.niveau1_nom]
        .filter(v => v != null).some(v => String(v).toLowerCase().includes(q)));
    }

    if (!this.showDeleted) {
      if (this.statusFilter === 'active') data = data.filter(r => r.is_active);
      else if (this.statusFilter === 'inactive') data = data.filter(r => !r.is_active);
    }

    if (this.activeFieldFilter && this.fieldFilterValue.trim()) {
      const fv = this.fieldFilterValue.trim().toLowerCase();
      const f = this.activeFieldFilter;
      data = data.filter(r => String(r[f] ?? '').toLowerCase().includes(fv));
    }

    if (this.sortColumn) {
      const col = this.sortColumn, dir = this.sortDirection === 'asc' ? 1 : -1;
      data.sort((a, b) => {
        const av = a[col] ?? '', bv = b[col] ?? '';
        if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
        return String(av).localeCompare(String(bv), 'fr', { numeric: true }) * dir;
      });
    }

    this.filtered = data;
    if (this.currentPage > this.totalPages) this.currentPage = this.totalPages;
  }

  onSearchInput(ev: Event): void { this.searchQuery = (ev.target as HTMLInputElement).value; this.currentPage = 1; this.applyFilters(); }
  clearSearch(): void { this.searchQuery = ''; this.currentPage = 1; this.applyFilters(); }
  onStatusFilterChange(ev: Event): void { this.statusFilter = (ev.target as HTMLSelectElement).value as any; this.currentPage = 1; this.applyFilters(); }

  sort(field: string): void {
    if (this.sortColumn === field) this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    else { this.sortColumn = field; this.sortDirection = 'asc'; }
    this.applyFilters();
  }
  getSortIcon(field: string): string {
    if (this.sortColumn !== field) return 'fas fa-sort';
    return this.sortDirection === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down';
  }

  // Footer gauche : menu filtres
  toggleFilterMenu(): void { this.showFilterMenu = !this.showFilterMenu; if (!this.showFilterMenu) this.showFieldFilterMenu = false; }
  setDisplayMode(mode: 'all' | 'selected'): void {
    if (mode === 'selected' && this.selectedIds.size === 0) return;
    this.displayMode = mode; this.currentPage = 1; this.applyFilters();
  }
  selectFieldForFilter(field: string, label: string): void {
    this.activeFieldFilter = field; this.activeFieldFilterLabel = label; this.fieldFilterValue = '';
    this.showFilterMenu = false; this.showFieldFilterMenu = false; this.applyFilters();
  }
  onFieldFilterInput(ev: Event): void { this.fieldFilterValue = (ev.target as HTMLInputElement).value; this.currentPage = 1; this.applyFilters(); }
  clearFieldFilter(): void { this.activeFieldFilter = null; this.activeFieldFilterLabel = ''; this.fieldFilterValue = ''; this.applyFilters(); }

  // ------------------------------------------------------------------ pagination
  get totalPages(): number { return Math.max(1, Math.ceil(this.filtered.length / this.pageSize)); }
  get paginatedRows(): any[] { const s = (this.currentPage - 1) * this.pageSize; return this.filtered.slice(s, s + this.pageSize); }
  setPageSize(n: number): void { this.pageSize = n; this.currentPage = 1; }
  goToFirstPage(): void { this.currentPage = 1; }
  goToLastPage(): void { this.currentPage = this.totalPages; }
  prevPage(): void { if (this.currentPage > 1) this.currentPage--; }
  nextPage(): void { if (this.currentPage < this.totalPages) this.currentPage++; }

  // ------------------------------------------------------------------ sélection
  toggleSelection(id: string): void { this.selectedIds.has(id) ? this.selectedIds.delete(id) : this.selectedIds.add(id); }
  isAllSelected(): boolean { const p = this.paginatedRows; return p.length > 0 && p.every(r => this.selectedIds.has(r.id)); }
  toggleSelectAll(): void { const p = this.paginatedRows; this.isAllSelected() ? p.forEach(r => this.selectedIds.delete(r.id)) : p.forEach(r => this.selectedIds.add(r.id)); }
  selectAll(): void { this.filtered.forEach(r => this.selectedIds.add(r.id)); }
  deselectAll(): void { this.selectedIds.clear(); if (this.displayMode === 'selected') this.setDisplayMode('all'); }
  invertSelection(): void { this.filtered.forEach(r => this.toggleSelection(r.id)); }
  moveSelectionToTop(): void {
    if (!this.selectedIds.size) return;
    const arr = this.showDeleted ? this.deletedRows : this.activeRows;
    const sel = arr.filter(r => this.selectedIds.has(r.id));
    const rest = arr.filter(r => !this.selectedIds.has(r.id));
    const reordered = [...sel, ...rest];
    if (this.showDeleted) this.deletedRows = reordered; else this.activeRows = reordered;
    this.sortColumn = null;
    this.applyFilters();
  }

  // ------------------------------------------------------------------ badges/format
  getStatusBadgeClass(active: boolean): string { return active ? 'badge badge-success' : 'badge badge-secondary'; }
  getStatusText(active: boolean): string { return active ? 'Actif' : 'Inactif'; }
  formatDate(v: string): string {
    if (!v) return '-';
    const d = new Date(v);
    return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('fr-FR');
  }

  // ------------------------------------------------------------------ CRUD
  openCreate(): void { if (!this.canManage) return; this.editing = null; this.buildForm(); this.showFormModal = true; }
  openEdit(item: any): void { if (!this.canManage) return; this.editing = item; this.buildForm(item); this.showFormModal = true; }
  closeForm(): void { this.showFormModal = false; this.editing = null; }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.submitting = true;
    const payload = this.form.value;
    const id = this.editing?.id;
    const obs: Observable<any> = this.isN2
      ? (id ? this.service.updateNiveau2(id, payload) : this.service.createNiveau2(payload))
      : (id ? this.service.updateNiveau1(id, payload) : this.service.createNiveau1(payload));
    obs.subscribe({
      next: () => { this.toast.success('Succès', id ? 'Organisme mis à jour.' : 'Organisme créé.'); this.submitting = false; this.closeForm(); this.load(); },
      error: err => { this.submitting = false; this.toast.error('Erreur', this.firstError(err) || 'Enregistrement impossible.'); },
    });
  }

  // Suppression (unitaire + groupée)
  askDelete(item: any): void { this.toDelete = item; this.isBulkDelete = false; this.showDeleteModal = true; }
  openBulkDeleteModal(): void { if (this.selectedIds.size) { this.isBulkDelete = true; this.toDelete = null; this.showDeleteModal = true; } }
  closeDeleteModal(): void { this.toDelete = null; this.isBulkDelete = false; this.showDeleteModal = false; }
  confirmDelete(): void {
    this.deleting = true;
    const ids = this.isBulkDelete ? Array.from(this.selectedIds) : [this.toDelete.id];
    const obs: Observable<any> = this.isBulkDelete
      ? (this.isN2 ? this.service.bulkDeleteNiveau2(ids) : this.service.bulkDeleteNiveau1(ids))
      : (this.isN2 ? this.service.deleteNiveau2(ids[0]) : this.service.deleteNiveau1(ids[0]));
    obs.subscribe({
      next: (r: any) => { this.toast.success('Succès', `${this.isBulkDelete ? (r?.deleted_count ?? ids.length) : 1} organisme(s) supprimé(s).`); this.deleting = false; this.closeDeleteModal(); this.load(); },
      error: err => { this.deleting = false; this.toast.error('Erreur', this.firstError(err) || 'Suppression impossible.'); },
    });
  }

  // Restauration (unitaire + groupée)
  askRestore(item: any): void { this.toRestore = item; this.isBulkRestore = false; this.showRestoreModal = true; }
  openBulkRestoreModal(): void { if (this.selectedIds.size) { this.isBulkRestore = true; this.toRestore = null; this.showRestoreModal = true; } }
  closeRestoreModal(): void { this.toRestore = null; this.isBulkRestore = false; this.showRestoreModal = false; }
  confirmRestore(): void {
    this.bulkBusy = true;
    const ids = this.isBulkRestore ? Array.from(this.selectedIds) : [this.toRestore.id];
    const obs: Observable<any> = this.isBulkRestore
      ? (this.isN2 ? this.service.bulkRestoreNiveau2(ids) : this.service.bulkRestoreNiveau1(ids))
      : (this.isN2 ? this.service.restoreNiveau2(ids[0]) : this.service.restoreNiveau1(ids[0]));
    obs.subscribe({
      next: (r: any) => { this.toast.success('Succès', `${this.isBulkRestore ? (r?.restored_count ?? ids.length) : 1} organisme(s) restauré(s).`); this.bulkBusy = false; this.closeRestoreModal(); this.load(); },
      error: () => { this.bulkBusy = false; this.toast.error('Erreur', 'Restauration impossible.'); },
    });
  }

  // ------------------------------------------------------------------ export
  toggleExportMenu(): void { this.showExportMenu = !this.showExportMenu; }
  exportCSV(selectedOnly: boolean): void {
    this.showExportMenu = false;
    const source = selectedOnly ? this.filtered.filter(r => this.selectedIds.has(r.id)) : this.filtered;
    if (!source.length) { this.toast.warning('Attention', 'Aucune ligne à exporter.'); return; }
    const cols = this.getVisibleColumns();
    const sep = ';';
    const header = cols.map(c => c.label).join(sep);
    const lines = source.map(r => cols.map(c => {
      let v = r[c.field];
      if (c.type === 'boolean') v = v ? 'Actif' : 'Inactif';
      if (c.type === 'date') v = this.formatDate(v);
      if (v == null) v = '';
      return `"${String(v).replace(/"/g, '""')}"`;
    }).join(sep));
    const csv = '﻿' + [header, ...lines].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `organismes_niveau${this.niveau}${this.showDeleted ? '_corbeille' : ''}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  // ------------------------------------------------------------------ config colonnes
  toggleColumnConfig(): void {
    this.showColumnConfig = !this.showColumnConfig;
    if (this.showColumnConfig) { this.columnsBackup = this.columns.map(c => ({ ...c })); this.columnFilter = 'all'; }
  }
  toggleColumnFilterMenu(ev: Event): void { ev.stopPropagation(); this.showColumnFilterMenu = !this.showColumnFilterMenu; }
  getColumnFilterLabel(): string { return this.columnFilter === 'visible' ? 'Colonnes visibles' : 'Toutes les colonnes'; }
  applyColumnFilter(mode: 'all' | 'visible'): void { this.columnFilter = mode; this.showColumnFilterMenu = false; }
  getFilteredColumns(): ColumnConfig[] { return this.columnFilter === 'visible' ? this.columns.filter(c => c.visible) : this.columns; }
  getColumnStats() { const total = this.columns.length; const visible = this.columns.filter(c => c.visible).length; return { total, visible, hidden: total - visible }; }
  toggleColumnVisibility(field: string): void { const c = this.columns.find(x => x.field === field); if (c) c.visible = !c.visible; }
  selectAllColumns(): void { this.columns.forEach(c => (c.visible = true)); }
  deselectAllColumns(): void { this.columns.forEach(c => (c.visible = false)); }
  invertColumnSelection(): void { this.columns.forEach(c => (c.visible = !c.visible)); }
  moveColumnUp(i: number): void { if (i > 0) [this.columns[i - 1], this.columns[i]] = [this.columns[i], this.columns[i - 1]]; }
  moveColumnDown(i: number): void { if (i < this.columns.length - 1) [this.columns[i + 1], this.columns[i]] = [this.columns[i], this.columns[i + 1]]; }
  moveColumnToTop(i: number): void { if (i > 0) { const [c] = this.columns.splice(i, 1); this.columns.unshift(c); } }
  moveColumnToBottom(i: number): void { if (i < this.columns.length - 1) { const [c] = this.columns.splice(i, 1); this.columns.push(c); } }
  cancelColumnConfig(): void { this.columns = this.columnsBackup.map(c => ({ ...c })); this.showColumnConfig = false; }
  confirmColumnConfig(): void { this.saveColumns(); this.showColumnConfig = false; }

  onDragStart(i: number): void { this.draggedColumnIndex = i; }
  onDragOver(ev: DragEvent, i: number): void { ev.preventDefault(); this.dragOverIndex = i; }
  onDragLeave(): void { this.dragOverIndex = null; }
  onDrop(i: number): void {
    if (this.draggedColumnIndex === null || this.draggedColumnIndex === i) return;
    const [c] = this.columns.splice(this.draggedColumnIndex, 1);
    this.columns.splice(i, 0, c);
    this.draggedColumnIndex = null; this.dragOverIndex = null;
  }
  onDragEnd(): void { this.draggedColumnIndex = null; this.dragOverIndex = null; }

  // ------------------------------------------------------------------ menus contextuels
  onColumnHeaderRightClick(ev: MouseEvent, col: ColumnConfig): void {
    ev.preventDefault(); this.closeContextMenus();
    this.columnForContext = col; this.contextMenuPosition = { x: ev.clientX, y: ev.clientY }; this.showColumnContextMenu = true;
  }
  onRowRightClick(ev: MouseEvent, row: any): void {
    ev.preventDefault(); this.closeContextMenus();
    this.rowForContext = row; this.cellForContext = null;
    this.contextMenuPosition = { x: ev.clientX, y: ev.clientY }; this.showRowContextMenu = true;
  }
  onCellRightClick(ev: MouseEvent, row: any, field: string): void {
    ev.preventDefault(); ev.stopPropagation(); this.closeContextMenus();
    this.rowForContext = row; this.cellForContext = { row, field, value: row[field] };
    this.contextMenuPosition = { x: ev.clientX, y: ev.clientY }; this.showRowContextMenu = true;
  }
  hideColumnFromContext(): void { if (this.columnForContext) this.columnForContext.visible = false; this.saveColumns(); this.closeContextMenus(); }
  openColumnConfigFromContext(): void { this.closeContextMenus(); this.toggleColumnConfig(); }
  toggleRowSelectionFromContext(): void { if (this.rowForContext) this.toggleSelection(this.rowForContext.id); this.closeContextMenus(); }
  selectAllFromContext(): void { this.selectAll(); this.closeContextMenus(); }
  copyCellValueFromContext(): void {
    if (this.cellForContext) { try { navigator.clipboard.writeText(String(this.cellForContext.value ?? '')); this.toast.success('Copié', 'Valeur copiée.'); } catch {} }
    this.closeContextMenus();
  }
  editFromContext(): void { const r = this.rowForContext; this.closeContextMenus(); if (r) this.openEdit(r); }
  deleteFromContext(): void { const r = this.rowForContext; this.closeContextMenus(); if (r && !r.is_deleted) this.askDelete(r); }
  restoreFromContext(): void { const r = this.rowForContext; this.closeContextMenus(); if (r && r.is_deleted) this.askRestore(r); }
  private closeContextMenus(): void { this.showColumnContextMenu = false; this.showRowContextMenu = false; }

  // ------------------------------------------------------------------ global
  @HostListener('document:click')
  onDocumentClick(): void { this.showExportMenu = false; this.showFilterMenu = false; this.showFieldFilterMenu = false; this.showColumnFilterMenu = false; this.closeContextMenus(); }

  @HostListener('document:keydown.escape')
  onEscape(): void { this.showFormModal = false; this.showDeleteModal = false; this.showRestoreModal = false; this.showColumnConfig = false; this.onDocumentClick(); }

  private firstError(err: any): string {
    const e = err?.error; if (!e) return '';
    if (typeof e === 'string') return e;
    const k = Object.keys(e)[0]; const v = e[k];
    return Array.isArray(v) ? v[0] : String(v);
  }
}
