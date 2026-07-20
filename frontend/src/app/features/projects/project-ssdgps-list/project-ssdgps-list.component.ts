import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ProjectsService } from '../../../core/services/projects.service';
import { BreadcrumbService } from '../../../core/layout/services/breadcrumb.service';
import { ToastService } from '../../../core/services/toast.service';
import { SsdgpsSortConfigService, SsdgpsSortLevel } from '../../../core/services/ssdgps-sort-config.service';
import {
  Projet, Ssdgps, proprieteLabel, NATURE_SSDGPS_OPTIONS, TYPE_SSDGPS_OPTIONS,
} from '../../../core/models/project.model';

interface ColumnConfig {
  field: string;
  label: string;
  visible: boolean;
  type?: 'text' | 'date' | 'number' | 'boolean';
}

const COLUMNS_KEY = 'sdgps_projet_ssdgps_columns';

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { field: 'numero_ssdgps', label: 'SSDGPS', visible: true, type: 'number' },
  { field: 'nature_ssdgps', label: 'Nature', visible: true, type: 'text' },
  { field: 'type_ssdgps', label: 'Type', visible: true, type: 'text' },
  { field: 'propriete_label', label: 'Propriété', visible: true, type: 'text' },
  { field: 'affaire_numero', label: 'Affaire (SD)', visible: true, type: 'text' },
  { field: 'nbr_total_sessions', label: 'Sessions', visible: true, type: 'number' },
  { field: 'nbr_total_pieces', label: 'Pièces', visible: true, type: 'number' },
  { field: 'propriete_nom', label: 'Propriété-dite', visible: false, type: 'text' },
  { field: 'propriete_id_titre', label: 'Titre foncier', visible: false, type: 'text' },
  { field: 'propriete_id_requisition', label: 'Réquisition', visible: false, type: 'text' },
  { field: 'created_at', label: 'Créé le', visible: false, type: 'date' },
  { field: 'updated_at', label: 'Modifié le', visible: false, type: 'date' },
  { field: 'is_deleted', label: 'Supprimé', visible: false, type: 'boolean' },
  { field: 'deleted_at', label: 'Supprimé le', visible: false, type: 'date' },
  { field: 'created_by_email', label: 'Créé par', visible: false, type: 'text' },
  { field: 'updated_by_email', label: 'Modifié par', visible: false, type: 'text' },
  { field: 'deleted_by_email', label: 'Supprimé par', visible: false, type: 'text' },
];

/** Colonnes triables (allowlist alignée sur le backend SSDGPS_SORT_FIELDS), avec libellé. */
const SORTABLE_FIELDS: { field: string; label: string }[] = [
  { field: 'numero_ssdgps', label: 'SSDGPS (numéro)' },
  { field: 'nature_ssdgps', label: 'Nature' },
  { field: 'type_ssdgps', label: 'Type' },
  { field: 'propriete_label', label: 'Propriété' },
  { field: 'affaire_numero', label: 'Affaire (SD)' },
  { field: 'nbr_total_sessions', label: 'Sessions' },
  { field: 'nbr_total_pieces', label: 'Pièces' },
  { field: 'propriete_nom', label: 'Propriété-dite' },
  { field: 'propriete_id_titre', label: 'Titre foncier' },
  { field: 'propriete_id_requisition', label: 'Réquisition' },
  { field: 'created_at', label: 'Créé le' },
  { field: 'updated_at', label: 'Modifié le' },
];

const FIELD_DESCRIPTIONS: Record<string, string> = {
  numero_ssdgps: "Numéro d'ordre du SSDGPS dans l'affaire",
  nature_ssdgps: 'Nature du sous-sous-dossier GPS',
  type_ssdgps: 'Mono-session ou multi-session',
  propriete_label: 'Propriété de rattachement (titre foncier, sinon réquisition)',
  affaire_numero: "Numéro du SD d'affaire de rattachement",
  nbr_total_sessions: 'Nombre total de sessions rattachées',
  nbr_total_pieces: 'Nombre total de pièces rattachées au rapport',
  propriete_nom: 'Nom de la propriété (propriété-dite)',
  propriete_id_titre: 'Identifiant du titre foncier',
  propriete_id_requisition: 'Identifiant de réquisition',
  created_at: "Date de création de l'enregistrement",
  updated_at: "Date de dernière modification de l'enregistrement",
  is_deleted: "Indique si l'enregistrement a été supprimé (logique)",
  deleted_at: "Date de suppression de l'enregistrement",
  created_by_email: "Utilisateur ayant créé l'enregistrement",
  updated_by_email: "Utilisateur ayant modifié l'enregistrement en dernier",
  deleted_by_email: "Utilisateur ayant supprimé l'enregistrement",
};

/**
 * Vue à plat de TOUS les SSDGPS d'un projet (toutes propriétés / affaires confondues) —
 * raccourci évitant de parcourir la hiérarchie Projet > Propriété > Affaire > SSDGPS.
 * Reprend l'outillage du tableau de l'explorateur : sélection, colonnes configurables,
 * filtres (recherche + par champ), export CSV, onglets Actifs/Corbeille, pagination.
 */
@Component({
  selector: 'app-project-ssdgps-list',
  templateUrl: './project-ssdgps-list.component.html',
  styleUrls: ['./project-ssdgps-list.component.scss'],
})
export class ProjectSsdgpsListComponent implements OnInit, OnDestroy {
  loading = true;
  projectId!: string;
  projet: Projet | null = null;

  private activeItems: Ssdgps[] = [];
  private deletedItems: Ssdgps[] = [];
  showDeleted = false;

  searchText = '';
  natureFilter = '';
  typeFilter = '';
  private manualOrder: string[] | null = null;

  // --- Tri MULTI-NIVEAUX (config opérateur, héritée du super admin) ---
  /** Niveaux de tri appliqués au tableau (niveau 0 = prioritaire). */
  sortLevels: SsdgpsSortLevel[] = [];
  /** Champs triables proposés dans le panneau de configuration. */
  readonly sortableFields = SORTABLE_FIELDS;
  /** Panneau de configuration du tri (modale dédiée). */
  showSortConfig = false;
  savingSort = false;
  savedSortFlash = false;
  resettingSort = false;
  showResetConfirm = false;
  private sortSaveTimer: any;

  pageSize = 25;
  currentPage = 1;
  pageSizeOptions = [10, 25, 50, 100];

  natureOptions = NATURE_SSDGPS_OPTIONS;
  typeOptions = TYPE_SSDGPS_OPTIONS;
  proprieteLabel = proprieteLabel;

  restoring: string | null = null;
  bulkRestoring = false;

  // Sélection
  selectedIds = new Set<string>();

  // Mode d'affichage / filtre par champ (pied de tableau)
  displayMode: 'all' | 'selected' = 'all';
  activeFieldFilter: string | null = null;
  activeFieldFilterLabel = '';
  fieldFilterValue = '';
  showFilterMenu = false;
  showFieldFilterMenu = false;

  // Colonnes
  columns: ColumnConfig[] = DEFAULT_COLUMNS.map(c => ({ ...c }));
  private columnsBackup: ColumnConfig[] = [];
  showColumnConfig = false;
  columnFilter: 'all' | 'visible' = 'all';
  showColumnFilterMenu = false;
  draggedColumnIndex: number | null = null;
  dragOverIndex: number | null = null;

  // Menu contextuel de colonne
  showColumnContextMenu = false;
  contextMenuPosition = { x: 0, y: 0 };
  contextMenuColumn: ColumnConfig | null = null;

  constructor(
    private service: ProjectsService,
    private toast: ToastService,
    private route: ActivatedRoute,
    private router: Router,
    private sortConfigService: SsdgpsSortConfigService,
    private breadcrumb: BreadcrumbService,
  ) {}

  ngOnInit(): void {
    this.projectId = this.route.snapshot.paramMap.get('id')!;
    this.loadColumnPreferences();
    this.load();
    this.loadSortConfig();
    this.service.getProjet(this.projectId).subscribe({
      next: (p) => { this.projet = p; this.updateTopbarBreadcrumb(); },
      error: () => {},
    });
  }

  ngOnDestroy(): void {
    this.breadcrumb.clear();
  }

  /** Fil d'Ariane métier : Accueil › Projets › <Projet> › Tous les SSDGPS. */
  private updateTopbarBreadcrumb(): void {
    const base = this.router.url.startsWith('/admin') ? '/admin/projets' : '/projets';
    this.breadcrumb.set([
      { label: 'Accueil', route: '/home', icon: 'fa-house' },
      { label: 'Projets', route: base, icon: 'fa-folder-open' },
      { label: this.projet?.nom_projet || this.projet?.code_projet || 'Projet', route: `${base}/${this.projectId}`, icon: 'fa-diagram-project' },
      { label: 'Tous les SSDGPS', icon: 'fa-satellite-dish', isActive: true },
    ]);
  }

  /** Charge le tri multi-niveaux de l'opérateur (hérité du super admin par défaut). */
  private loadSortConfig(): void {
    this.sortConfigService.get().subscribe(levels => { this.sortLevels = levels; });
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.showFilterMenu = false;
    this.showFieldFilterMenu = false;
    this.showColumnFilterMenu = false;
    this.showColumnContextMenu = false;
  }

  load(): void {
    this.loading = true;
    forkJoin([
      this.service.getSsdgpsByProjet(this.projectId),
      this.service.getSsdgpsByProjet(this.projectId, { show_deleted: true }),
    ]).subscribe({
      next: ([active, deleted]) => {
        this.activeItems = active;
        this.deletedItems = deleted;
        this.selectedIds.clear();
        this.manualOrder = null;
        this.loading = false;
      },
      error: () => { this.toast.error('Erreur', 'Chargement des SSDGPS impossible'); this.loading = false; },
    });
  }

  // --- Onglets Actifs / Corbeille ---
  get activeCount(): number { return this.activeItems.length; }
  get deletedCount(): number { return this.deletedItems.length; }
  setTab(deleted: boolean): void {
    if (this.showDeleted === deleted) return;
    this.showDeleted = deleted;
    this.selectedIds.clear();
    this.manualOrder = null;
    this.displayMode = 'all';
    this.currentPage = 1;
  }
  get items(): Ssdgps[] { return this.showDeleted ? this.deletedItems : this.activeItems; }

  // --- Recherche / filtres / tri ---
  private matchesSearch(s: Ssdgps, q: string): boolean {
    if (!q) return true;
    const hay = [
      `ssdgps ${s.numero_ssdgps}`, s.nature_ssdgps, s.type_ssdgps,
      this.proprieteLabel(s), s.propriete_nom, s.affaire_numero,
    ].filter(Boolean).join(' ').toLowerCase();
    return hay.includes(q);
  }

  get filteredItems(): Ssdgps[] {
    const q = this.searchText.trim().toLowerCase();
    let rows = this.items.filter((s) => {
      if (this.displayMode === 'selected' && !this.selectedIds.has(s.id)) return false;
      if (this.natureFilter && s.nature_ssdgps !== this.natureFilter) return false;
      if (this.typeFilter && s.type_ssdgps !== this.typeFilter) return false;
      if (!this.matchesSearch(s, q)) return false;
      if (this.activeFieldFilter && this.fieldFilterValue) {
        const v = this.getCellValue(s, this.activeFieldFilter).toLowerCase();
        if (!v.includes(this.fieldFilterValue.toLowerCase())) return false;
      }
      return true;
    });
    if (this.manualOrder) {
      const idx = new Map(this.manualOrder.map((id, i) => [id, i]));
      rows = [...rows].sort((a, b) =>
        (idx.has(a.id) ? idx.get(a.id)! : Number.MAX_SAFE_INTEGER) -
        (idx.has(b.id) ? idx.get(b.id)! : Number.MAX_SAFE_INTEGER));
    } else if (this.sortLevels.length) {
      rows = [...rows].sort((a, b) => this.compareByLevels(a, b));
    }
    return rows;
  }

  /** Comparateur multi-niveaux : parcourt les niveaux dans l'ordre, le premier départage. */
  private compareByLevels(a: Ssdgps, b: Ssdgps): number {
    for (const lvl of this.sortLevels) {
      const va = this.fieldSortValue(a, lvl.field);
      const vb = this.fieldSortValue(b, lvl.field);
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      if (cmp !== 0) return lvl.dir === 'desc' ? -cmp : cmp;
    }
    return 0;
  }

  private fieldSortValue(s: Ssdgps, field: string): number | string {
    if (field === 'propriete_label') return (this.proprieteLabel(s) || '').toLowerCase();
    const v = (s as any)[field];
    if (v == null) return '';
    return typeof v === 'string' ? v.toLowerCase() : v;
  }

  // --- Marqueurs de tri sur les en-têtes de colonnes ---
  /** Rang (1..n) du champ dans le tri multi-niveaux, ou 0 s'il n'est pas trié. */
  sortLevelOf(field: string): number {
    const i = this.sortLevels.findIndex(l => l.field === field);
    return i < 0 ? 0 : i + 1;
  }
  /** Sens de tri du champ ('asc'/'desc') s'il est trié, sinon ''. */
  sortDirOf(field: string): '' | 'asc' | 'desc' {
    return this.sortLevels.find(l => l.field === field)?.dir || '';
  }
  /** Libellé d'un champ triable (pour les badges / résumé). */
  fieldLabel(field: string): string {
    return this.sortableFields.find(f => f.field === field)?.label || field;
  }
  /** Résumé court du tri multi-niveaux (en-tête du panneau). */
  get sortSummary(): string {
    if (!this.sortLevels.length) return 'Aucun tri';
    return this.sortLevels
      .map(l => `${this.fieldLabel(l.field)} ${l.dir === 'desc' ? '↓' : '↑'}`)
      .join('  ·  ');
  }

  // ============================================
  // Panneau de configuration du tri multi-niveaux
  // ============================================
  openSortConfig(): void { this.showSortConfig = true; }
  closeSortConfig(): void { this.showSortConfig = false; }

  /** Champs disponibles pour un niveau donné : tous sauf ceux déjà choisis ailleurs. */
  fieldsForLevel(current: SsdgpsSortLevel): { field: string; label: string }[] {
    const used = new Set(this.sortLevels.filter(l => l !== current).map(l => l.field));
    return this.sortableFields.filter(f => !used.has(f.field));
  }
  /** Premier champ triable non encore utilisé (pour l'ajout d'un niveau). */
  private firstUnusedField(): string | null {
    const used = new Set(this.sortLevels.map(l => l.field));
    return this.sortableFields.find(f => !used.has(f.field))?.field || null;
  }
  get canAddLevel(): boolean { return this.sortLevels.length < this.sortableFields.length; }

  addLevel(): void {
    const field = this.firstUnusedField();
    if (!field) return;
    this.sortLevels = [...this.sortLevels, { field, dir: 'asc' }];
    this.queueSaveSort();
  }
  removeLevel(i: number): void {
    this.sortLevels = this.sortLevels.filter((_, k) => k !== i);
    this.queueSaveSort();
  }
  moveLevelUp(i: number): void {
    if (i <= 0) return;
    const l = [...this.sortLevels]; [l[i - 1], l[i]] = [l[i], l[i - 1]]; this.sortLevels = l; this.queueSaveSort();
  }
  moveLevelDown(i: number): void {
    if (i >= this.sortLevels.length - 1) return;
    const l = [...this.sortLevels]; [l[i + 1], l[i]] = [l[i], l[i + 1]]; this.sortLevels = l; this.queueSaveSort();
  }
  changeLevelField(i: number, field: string): void {
    // Empêche les doublons : si le champ est déjà utilisé ailleurs, on ignore.
    if (this.sortLevels.some((l, k) => k !== i && l.field === field)) return;
    this.sortLevels[i] = { ...this.sortLevels[i], field };
    this.sortLevels = [...this.sortLevels];
    this.queueSaveSort();
  }
  changeLevelDir(i: number, dir: 'asc' | 'desc'): void {
    this.sortLevels[i] = { ...this.sortLevels[i], dir };
    this.sortLevels = [...this.sortLevels];
    this.queueSaveSort();
  }

  /** Enregistrement automatique (anti-rebond) de la config de tri. */
  private queueSaveSort(): void {
    this.currentPage = 1;
    clearTimeout(this.sortSaveTimer);
    this.sortSaveTimer = setTimeout(() => this.saveSortConfig(), 500);
  }
  private saveSortConfig(): void {
    this.savingSort = true;
    this.sortConfigService.save(this.sortLevels).subscribe({
      next: (saved) => {
        this.sortLevels = saved; this.savingSort = false; this.savedSortFlash = true;
        setTimeout(() => { this.savedSortFlash = false; }, 2500);
      },
      error: () => { this.savingSort = false; this.toast.error('Erreur', 'Enregistrement du tri impossible'); },
    });
  }

  // --- Réinitialisation avec la configuration SOURCE (compte administrateur) ---
  askResetSort(): void { if (!this.resettingSort) this.showResetConfirm = true; }
  cancelResetSort(): void { this.showResetConfirm = false; }
  confirmResetSort(): void {
    if (this.resettingSort) return;
    this.resettingSort = true;
    this.sortConfigService.resetToSource().subscribe({
      next: (levels) => {
        this.sortLevels = levels; this.resettingSort = false; this.showResetConfirm = false;
        this.currentPage = 1;
        this.toast.success('Succès', 'Tri réinitialisé avec la configuration source');
      },
      error: (e) => {
        this.resettingSort = false; this.showResetConfirm = false;
        this.toast.error('Erreur', e?.error?.detail || 'Réinitialisation impossible');
      },
    });
  }
  clearFilters(): void {
    this.searchText = ''; this.natureFilter = ''; this.typeFilter = '';
    this.clearFieldFilter(); this.displayMode = 'all'; this.currentPage = 1;
  }
  get hasActiveFilter(): boolean {
    return !!(this.searchText || this.natureFilter || this.typeFilter || this.activeFieldFilter || this.displayMode !== 'all');
  }

  typeBadgeClass(type: string): string {
    return type === 'multi-session' ? 'badge badge-primary' : 'badge badge-secondary';
  }

  // --- Sélection ---
  isSelected(s: Ssdgps): boolean { return this.selectedIds.has(s.id); }
  toggleSelect(s: Ssdgps, ev: Event): void {
    ev.stopPropagation();
    this.selectedIds.has(s.id) ? this.selectedIds.delete(s.id) : this.selectedIds.add(s.id);
  }
  get selectedCount(): number { return this.selectedIds.size; }
  get isAllSelected(): boolean {
    const f = this.paginatedItems;
    return f.length > 0 && f.every(s => this.selectedIds.has(s.id));
  }
  toggleSelectAll(): void {
    const f = this.paginatedItems;
    if (this.isAllSelected) f.forEach(s => this.selectedIds.delete(s.id));
    else f.forEach(s => this.selectedIds.add(s.id));
  }
  invertSelection(): void {
    this.paginatedItems.forEach(s => this.selectedIds.has(s.id) ? this.selectedIds.delete(s.id) : this.selectedIds.add(s.id));
  }
  private selectedList(): Ssdgps[] { return this.items.filter(s => this.selectedIds.has(s.id)); }
  moveSelectionToTop(): void {
    if (this.selectedIds.size === 0) return;
    const sel = this.filteredItems.filter(s => this.selectedIds.has(s.id)).map(s => s.id);
    const rest = this.filteredItems.filter(s => !this.selectedIds.has(s.id)).map(s => s.id);
    this.manualOrder = [...sel, ...rest];
    this.currentPage = 1;
  }

  // --- Mode d'affichage / filtre par champ (pied) ---
  setDisplayMode(mode: 'all' | 'selected'): void {
    if (mode === 'selected' && this.selectedCount === 0) return;
    this.displayMode = mode; this.currentPage = 1;
  }
  toggleFilterMenu(): void { this.showFilterMenu = !this.showFilterMenu; }
  selectFieldForFilter(field: string, label: string): void {
    this.activeFieldFilter = field; this.activeFieldFilterLabel = label; this.fieldFilterValue = '';
    this.showFieldFilterMenu = false; this.showFilterMenu = false; this.currentPage = 1;
  }
  onFieldFilterInput(event: Event): void {
    this.fieldFilterValue = (event.target as HTMLInputElement).value; this.currentPage = 1;
  }
  clearFieldFilter(): void { this.activeFieldFilter = null; this.activeFieldFilterLabel = ''; this.fieldFilterValue = ''; }

  // --- Colonnes ---
  private loadColumnPreferences(): void {
    try {
      const raw = localStorage.getItem(COLUMNS_KEY);
      if (!raw) return;
      const saved: { field: string; visible: boolean }[] = JSON.parse(raw);
      saved.forEach(sc => { const col = this.columns.find(c => c.field === sc.field); if (col) col.visible = sc.visible; });
      const ordered: ColumnConfig[] = [];
      saved.forEach(sc => { const col = this.columns.find(c => c.field === sc.field); if (col) ordered.push(col); });
      this.columns.forEach(c => { if (!ordered.includes(c)) ordered.push(c); });
      if (ordered.length === this.columns.length) this.columns = ordered;
    } catch { /* ignore */ }
  }
  private saveColumnPreferences(): void {
    localStorage.setItem(COLUMNS_KEY, JSON.stringify(this.columns.map(c => ({ field: c.field, visible: c.visible }))));
  }
  getVisibleColumns(): ColumnConfig[] { return this.columns.filter(c => c.visible); }
  getFilteredColumns(): ColumnConfig[] { return this.columnFilter === 'visible' ? this.columns.filter(c => c.visible) : this.columns; }
  getColumnStats(): { total: number; visible: number; hidden: number } {
    const total = this.columns.length; const visible = this.columns.filter(c => c.visible).length;
    return { total, visible, hidden: total - visible };
  }
  toggleColumnVisibility(field: string): void { const c = this.columns.find(x => x.field === field); if (c) c.visible = !c.visible; }
  toggleColumnConfig(): void {
    if (!this.showColumnConfig) this.columnsBackup = this.columns.map(c => ({ ...c }));
    else this.restoreColumnsBackup();
    this.showColumnConfig = !this.showColumnConfig;
  }
  openColumnConfig(): void { this.columnsBackup = this.columns.map(c => ({ ...c })); this.showColumnConfig = true; }
  confirmColumnConfig(): void { this.showColumnConfig = false; this.columnsBackup = []; this.saveColumnPreferences(); }
  cancelColumnConfig(): void { this.restoreColumnsBackup(); this.showColumnConfig = false; }
  private restoreColumnsBackup(): void {
    if (this.columnsBackup.length) { this.columns = this.columnsBackup.map(c => ({ ...c })); this.columnsBackup = []; }
  }
  selectAllColumns(): void { this.columns.forEach(c => c.visible = true); }
  deselectAllColumns(): void { this.columns.forEach(c => c.visible = false); }
  invertColumnSelection(): void { this.columns.forEach(c => c.visible = !c.visible); }
  toggleColumnFilterMenu(event: Event): void { event.stopPropagation(); this.showColumnFilterMenu = !this.showColumnFilterMenu; }
  applyColumnFilter(filter: 'all' | 'visible'): void { this.columnFilter = filter; this.showColumnFilterMenu = false; }
  getColumnFilterLabel(): string { return this.columnFilter === 'all' ? 'Toutes les colonnes' : 'Colonnes visibles'; }
  getTypeLabel(type?: string): string { return { text: 'TEXTE', date: 'DATE', number: 'NOMBRE', boolean: 'BOOLÉEN' }[type || 'text'] || 'TEXTE'; }
  getFieldDescription(field: string): string { return FIELD_DESCRIPTIONS[field] || ''; }

  // Réordonnancement des colonnes
  onDragStart(i: number): void { this.draggedColumnIndex = i; }
  onDragOver(e: DragEvent, i: number): void { e.preventDefault(); this.dragOverIndex = i; }
  onDragLeave(): void { this.dragOverIndex = null; }
  onDrop(i: number): void {
    if (this.draggedColumnIndex === null || this.draggedColumnIndex === i) { this.draggedColumnIndex = null; this.dragOverIndex = null; return; }
    const dragged = this.columns[this.draggedColumnIndex];
    this.columns.splice(this.draggedColumnIndex, 1);
    this.columns.splice(i, 0, dragged);
    this.draggedColumnIndex = null; this.dragOverIndex = null;
  }
  onDragEnd(): void { this.draggedColumnIndex = null; this.dragOverIndex = null; }
  moveColumnUp(i: number): void { if (i > 0) [this.columns[i], this.columns[i - 1]] = [this.columns[i - 1], this.columns[i]]; }
  moveColumnDown(i: number): void { if (i < this.columns.length - 1) [this.columns[i], this.columns[i + 1]] = [this.columns[i + 1], this.columns[i]]; }
  moveColumnToTop(i: number): void { if (i > 0) { const c = this.columns.splice(i, 1)[0]; this.columns.unshift(c); } }
  moveColumnToBottom(i: number): void { if (i < this.columns.length - 1) { const c = this.columns.splice(i, 1)[0]; this.columns.push(c); } }

  // Menu contextuel de colonne (clic droit sur l'en-tête)
  onColumnHeaderRightClick(event: MouseEvent, col: ColumnConfig): void {
    event.preventDefault(); event.stopPropagation();
    this.contextMenuPosition = { x: event.clientX, y: event.clientY };
    this.contextMenuColumn = col;
    this.showColumnContextMenu = true;
  }
  hideColumnFromContext(): void { if (this.contextMenuColumn) this.contextMenuColumn.visible = false; this.showColumnContextMenu = false; this.contextMenuColumn = null; }
  openColumnConfigFromContext(): void { this.showColumnContextMenu = false; this.openColumnConfig(); }

  // --- Valeur de cellule (affichage + CSV + filtre par champ) ---
  formatDate(value: any): string {
    if (!value) return '—';
    return new Date(value).toLocaleString('fr-FR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
  getCellValue(s: Ssdgps, field: string): string {
    switch (field) {
      case 'propriete_label': return this.proprieteLabel(s) || '—';
      case 'affaire_numero': return s.affaire_numero ? `SD ${s.affaire_numero}` : '—';
      case 'type_ssdgps': return s.type_ssdgps === 'multi-session' ? 'Multi-session' : 'Mono-session';
      case 'created_at': case 'updated_at': case 'deleted_at': return this.formatDate((s as any)[field]);
      case 'is_deleted': return s.is_deleted ? 'Oui' : 'Non';
      default: { const v = (s as any)[field]; return v == null || v === '' ? '—' : String(v); }
    }
  }

  // --- Export CSV ---
  private csvEscape(v: any): string { const t = v == null ? '' : String(v); return /[",\n;]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; }
  exportCsv(): void {
    const cols = this.columns.filter(c => c.visible);
    const header = cols.map(c => c.label).join(';');
    const rows = this.filteredItems.map(s => cols.map(c => this.csvEscape(this.getCellValue(s, c.field))).join(';'));
    const csv = '﻿' + [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `ssdgps_${this.projet?.code_projet || this.projectId}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    this.toast.success('Export', `${this.filteredItems.length} SSDGPS exporté(s)`);
  }

  // --- Pagination ---
  get totalPages(): number { return Math.max(1, Math.ceil(this.filteredItems.length / this.pageSize)); }
  get paginatedItems(): Ssdgps[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredItems.slice(start, start + this.pageSize);
  }
  get pageNumbers(): number[] {
    const total = this.totalPages; const out: number[] = [];
    const start = Math.max(1, this.currentPage - 2); const end = Math.min(total, this.currentPage + 2);
    for (let p = start; p <= end; p++) out.push(p);
    return out;
  }
  setPageSize(n: number): void { this.pageSize = n; this.currentPage = 1; }
  goToPage(p: number): void { this.currentPage = Math.min(Math.max(1, p), this.totalPages); }
  prevPage(): void { this.goToPage(this.currentPage - 1); }
  nextPage(): void { this.goToPage(this.currentPage + 1); }
  goToFirstPage(): void { this.goToPage(1); }
  goToLastPage(): void { this.goToPage(this.totalPages); }

  // --- Navigation ---
  /** Base absolue « …/projets » (fonctionne sous /projets ET /admin/projets). */
  private projetsBase(): string[] {
    const segs = this.router.url.split('?')[0].split('/').filter(Boolean);
    const idx = segs.lastIndexOf('projets');
    return ['/', ...(idx >= 0 ? segs.slice(0, idx + 1) : ['dashboard', 'projets'])];
  }
  openPieces(s: Ssdgps): void {
    if (s.is_deleted) return;
    this.router.navigate([...this.projetsBase(), this.projectId, 'pieces', s.id], {
      queryParams: { proprieteId: s.propriete, affaireId: s.affaire },
    });
  }
  backToExplorer(): void { this.router.navigate([...this.projetsBase(), this.projectId]); }

  restore(s: Ssdgps): void {
    if (this.restoring) return;
    this.restoring = s.id;
    this.service.restoreSsdgps(s.id).subscribe({
      next: () => { this.restoring = null; this.toast.success('Restauré', 'SSDGPS restauré'); this.load(); },
      error: () => { this.restoring = null; this.toast.error('Échec', 'Restauration impossible'); },
    });
  }
  bulkRestore(): void {
    const ids = this.selectedList().filter(s => s.is_deleted).map(s => s.id);
    if (!ids.length || this.bulkRestoring) return;
    this.bulkRestoring = true;
    this.service.bulkRestoreSsdgps(ids).subscribe({
      next: (r) => { this.bulkRestoring = false; this.toast.success('Restauré', `${r.restored_count} SSDGPS restauré(s)`); this.load(); },
      error: () => { this.bulkRestoring = false; this.toast.error('Échec', 'Restauration impossible'); },
    });
  }
}
