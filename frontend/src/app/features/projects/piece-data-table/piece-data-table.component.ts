import {
  Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, HostListener,
} from '@angular/core';
import * as XLSX from 'xlsx';
import {
  CellType, detectColumnType, makeRowComparator, sortIcon, cellTypeLabel,
} from '../piece-table.util';

interface Champ { name: string; label: string; type?: string; }
interface Column { name: string; label: string; type: string; visible: boolean; cellType: CellType; }
type Row = Record<string, any>;

/**
 * Tableau de données des pièces doté d'une barre d'outils complète (inspiré du tableau de
 * gestion des projets `project-list`) : filtres (footer gauche), pagination (footer droite),
 * tri par colonne dépendant du type de données, sélection (tout/rien/inverser/déplacer en
 * haut), gestion des colonnes (visibilité + réordonnancement), export CSV/Excel et
 * suppression en masse.
 *
 * Deux modes :
 * - consultation (`editable=false`) : cellules en texte ; les actions « mutantes » (suppression,
 *   déplacement) n'affectent que la VUE (non persistées) ;
 * - édition (`editable=true`) : cellules éditables (`ngModel`) ; les mutations sont émises via
 *   `rowsChange` et persistées par le parent via son bouton « Enregistrer » habituel.
 */
@Component({
  selector: 'app-piece-data-table',
  templateUrl: './piece-data-table.component.html',
  styleUrls: ['./piece-data-table.component.scss'],
})
export class PieceDataTableComponent implements OnChanges {
  @Input() champs: Champ[] = [];
  @Input() rows: Row[] = [];
  @Input() editable = false;
  /** Clé de persistance locale des préférences (colonnes/pagination/tri), ex. `piece:RDIA:brut`. */
  @Input() tableKey = '';
  /** Désactive les actions pendant un enregistrement côté parent. */
  @Input() busy = false;
  /** Libellé de l'entité pour les exports/messages (ex. « ligne »). */
  @Input() entityLabel = 'ligne';
  /** Affiche le compteur intégré (Total · Filtrées · Sélection) dans la barre d'outils.
   * Le parent peut le passer à `false` et récupérer les stats via `statsChange` pour les
   * afficher ailleurs (ex. dans le titre de section). */
  @Input() showStats = true;
  /** Tri par défaut (paramètres opérateur), à PLUSIEURS niveaux (niveau 1 prioritaire, etc.),
   * appliqué tant que l'utilisateur n'a pas trié manuellement (ni de tri mémorisé en local).
   * `null`/vide = ordre d'import. */
  @Input() defaultSort: { field: string; dir: 'asc' | 'desc' }[] | null = null;
  /** Compteur-signal : à chaque incrément, la vue oublie tout tri explicite (manuel ou
   * mémorisé) et revient au tri par défaut opérateur. Utilisé après l'application du tri
   * configuré au tableau STOCKÉ, pour que l'affichage reflète le nouvel ordre. */
  @Input() resetSort = 0;

  @Output() rowsChange = new EventEmitter<Row[]>();
  /** Émis quand l'utilisateur valide une suppression en masse en édition (le parent enregistre). */
  @Output() persistRequested = new EventEmitter<Row[]>();
  /** Statistiques du tableau (total / filtrées / sélectionnées), émises de façon différée. */
  @Output() statsChange = new EventEmitter<{ total: number; filtered: number; selected: number }>();
  /** Tri choisi manuellement par l'utilisateur (clic sur un en-tête de colonne) — liste de
   * niveaux. Le parent peut le persister (config opérateur) pour que le rapport PDF suive. */
  @Output() sortChange = new EventEmitter<{ field: string; dir: 'asc' | 'desc' }[]>();

  columns: Column[] = [];
  /** Modèle canonique (ordre de référence) — les lignes sont les objets partagés avec le parent. */
  private model: Row[] = [];
  filtered: Row[] = [];
  paginated: Row[] = [];
  private lastEmitted: Row[] | null = null;

  /** Nombre total de lignes du modèle (exposé au template). */
  get rowCount(): number { return this.model.length; }

  // Filtres
  searchText = '';
  displayMode: 'all' | 'selected' = 'all';
  activeFieldFilter: string | null = null;
  activeFieldFilterLabel = '';
  fieldFilterValue = '';

  // Tri — liste de niveaux actifs (niveau 1 prioritaire). Vide = ordre d'import.
  sortLevels: { field: string; dir: 'asc' | 'desc' }[] = [];
  /** Vrai dès qu'un tri EXPLICITE existe (mémorisé en local ou choisi manuellement) : le tri
   * par défaut opérateur ne s'applique alors plus. */
  private hasExplicitSort = false;

  // Sélection (par référence d'objet ligne → stable au tri/filtre/pagination)
  selected = new Set<Row>();

  // Pagination
  currentPage = 1;
  pageSize = 10;
  pageSizeOptions = [10, 25, 50, 100];

  // Menus / modales
  showFilterMenu = false;
  showFieldFilterMenu = false;
  showExportMenu = false;
  showColumnConfig = false;
  private columnsBackup: Column[] = [];
  draggedColumnIndex: number | null = null;
  dragOverIndex: number | null = null;
  columnFilter: 'all' | 'visible' = 'all';
  showColumnFilterMenu = false;
  showDeleteConfirm = false;

  readonly sortIcon = sortIcon;
  readonly cellTypeLabel = cellTypeLabel;

  // Signatures pour ne réagir qu'aux changements RÉELS (un parent peut fournir un tableau
  // `champs`/`rows` recréé à chaque cycle de détection sans que le contenu change : on ne doit
  // ni tout reconstruire ni émettre en boucle).
  private champsSig = ' ';
  private prefsLoadedFor: string | null = null;

  // ============================================================
  // Cycle de vie
  // ============================================================
  ngOnChanges(changes: SimpleChanges): void {
    const rowsChanged = !!changes['rows'] && this.rows !== this.lastEmitted;
    if (rowsChanged) {
      this.model = (this.rows || []).slice();
      this.pruneSelection();
    }
    const sig = (this.champs || []).map(c => `${c.name}:${c.type || ''}`).join('|');
    const champsChanged = sig !== this.champsSig;
    if (champsChanged) this.champsSig = sig;

    if (champsChanged || rowsChanged) {
      this.buildColumns();
      if (this.prefsLoadedFor !== this.tableKey) { this.loadPrefs(); this.prefsLoadedFor = this.tableKey; }
      this.applyDefaultSort();
      this.applyPipeline();
    } else if (changes['defaultSort']) {
      // La config opérateur peut arriver après le premier cycle (chargée en async par le parent).
      this.applyDefaultSort();
      this.applyPipeline();
    }

    // Réinitialisation du tri demandée par le parent (signal). Traitée APRÈS la prise en compte
    // des nouvelles lignes/colonnes pour écraser tout tri explicite conservé (manuel/mémorisé).
    if (changes['resetSort'] && !changes['resetSort'].firstChange) {
      this.resetSortToDefault();
    }
  }

  /** Oublie tout tri explicite (manuel ou mémorisé en local) et réapplique le tri par défaut
   * opérateur (ou l'ordre d'import si aucun). Purge aussi le tri mémorisé en localStorage. */
  resetSortToDefault(): void {
    this.hasExplicitSort = false;
    this.applyDefaultSort();
    this.currentPage = 1;
    this.applyPipeline();
    this.savePrefs();
  }

  /** Applique le tri par défaut opérateur (multi-niveaux) tant qu'aucun tri explicite n'est
   * actif. Ne garde que les niveaux dont le champ existe dans les colonnes courantes. */
  private applyDefaultSort(): void {
    if (this.hasExplicitSort) return;
    const known = new Set(this.columns.map(c => c.name));
    this.sortLevels = (this.defaultSort || [])
      .filter(l => known.has(l.field))
      .map(l => ({ field: l.field, dir: l.dir }));
  }

  /** Position (1..n) d'une colonne dans le tri actif, ou -1. Sert à l'affichage des flèches. */
  sortLevelIndex(name: string): number { return this.sortLevels.findIndex(l => l.field === name); }
  /** Sens de tri actif pour une colonne (asc par défaut pour l'icône). */
  sortDirFor(name: string): 'asc' | 'desc' {
    const l = this.sortLevels.find(x => x.field === name);
    return l ? l.dir : 'asc';
  }

  /** Numéro d'affichage (position 1..n de haut en bas, continu entre pages) d'une ligne de la
   * page courante — recalculé à chaque tri/pagination. Sert à rendre la colonne ID. */
  displayId(indexInPage: number): number {
    return (this.currentPage - 1) * this.pageSize + indexInPage + 1;
  }

  /** Construit la liste de colonnes à partir des `champs`, en détectant le type réel de chaque
   * colonne d'après les valeurs présentes (pour un tri adapté). Préserve visibilité/ordre déjà
   * choisis si les colonnes n'ont pas changé. */
  private buildColumns(): void {
    const previous = new Map(this.columns.map(c => [c.name, c]));
    const values = (name: string) => this.model.map(r => r?.[name]);
    const next: Column[] = (this.champs || []).map(ch => {
      const prev = previous.get(ch.name);
      return {
        name: ch.name,
        label: ch.label,
        type: ch.type || 'text',
        visible: prev ? prev.visible : true,
        cellType: detectColumnType(ch.type, values(ch.name)),
      };
    });
    // Conserve l'ordre précédent (drag & drop) pour les colonnes déjà connues.
    if (previous.size) {
      const order = this.columns.map(c => c.name);
      next.sort((a, b) => {
        const ia = order.indexOf(a.name), ib = order.indexOf(b.name);
        if (ia === -1 && ib === -1) return 0;
        if (ia === -1) return 1;
        if (ib === -1) return -1;
        return ia - ib;
      });
    }
    this.columns = next;
  }

  // ============================================================
  // Pipeline filtre → tri → pagination
  // ============================================================
  private applyPipeline(): void {
    let result = this.model.slice();

    if (this.displayMode === 'selected') {
      result = result.filter(r => this.selected.has(r));
    }
    const q = this.searchText.trim().toLowerCase();
    if (q) {
      result = result.filter(r => this.columns.some(c =>
        String(r?.[c.name] ?? '').toLowerCase().includes(q)));
    }
    if (this.activeFieldFilter && this.fieldFilterValue.trim()) {
      const fv = this.fieldFilterValue.trim().toLowerCase();
      result = result.filter(r =>
        String(r?.[this.activeFieldFilter as string] ?? '').toLowerCase().includes(fv));
    }
    if (this.sortLevels.length) {
      const comps = this.sortLevels
        .map(l => {
          const col = this.columns.find(c => c.name === l.field);
          return col ? makeRowComparator(col.name, col.cellType, l.dir) : null;
        })
        .filter((c): c is (a: Row, b: Row) => number => !!c);
      if (comps.length) {
        result.sort((a, b) => {
          for (const cmp of comps) { const c = cmp(a, b); if (c !== 0) return c; }
          return 0;
        });
      }
    }

    this.filtered = result;
    const total = this.totalPages;
    if (this.currentPage > total) this.currentPage = total;
    if (this.currentPage < 1) this.currentPage = 1;
    const start = (this.currentPage - 1) * this.pageSize;
    this.paginated = this.filtered.slice(start, start + this.pageSize);
    this.emitStats();
  }

  private lastStatsSig = '';
  /** Émet les stats de façon DIFFÉRÉE (microtâche) : le parent qui les affiche est mis à jour
   * lors d'un cycle de détection ultérieur, ce qui évite l'ExpressionChangedAfterItHasBeenChecked. */
  private emitStats(): void {
    const stats = { total: this.model.length, filtered: this.filtered.length, selected: this.selected.size };
    const sig = `${stats.total}|${stats.filtered}|${stats.selected}`;
    if (sig === this.lastStatsSig) return;
    this.lastStatsSig = sig;
    Promise.resolve().then(() => this.statsChange.emit(stats));
  }

  // ============================================================
  // Émission (mode édition)
  // ============================================================
  /** Notifie le parent d'une mutation structurelle (ajout/suppression/réordonnancement). */
  private emit(): void {
    this.applyPipeline();
    if (!this.editable) return;
    this.lastEmitted = this.model.slice();
    this.rowsChange.emit(this.lastEmitted);
  }

  /** Édition d'une cellule (binding contrôlé) : écrit la valeur dans l'objet ligne puis prévient
   * le parent. `standalone` sur le ngModel évite toute dépendance à un éventuel `<form>` parent. */
  onCellInput(row: Row, name: string, value: any): void {
    row[name] = value;
    if (!this.editable) return;
    this.lastEmitted = this.model.slice();
    this.rowsChange.emit(this.lastEmitted);
  }

  // ============================================================
  // Recherche / filtres (footer gauche)
  // ============================================================
  onSearchInput(event: Event): void {
    this.searchText = (event.target as HTMLInputElement).value;
    this.currentPage = 1;
    this.applyPipeline();
  }
  clearSearch(): void { this.searchText = ''; this.currentPage = 1; this.applyPipeline(); }

  toggleFilterMenu(): void {
    this.showFilterMenu = !this.showFilterMenu;
    if (this.showFilterMenu) this.showExportMenu = false;
  }
  setDisplayMode(mode: 'all' | 'selected'): void {
    this.displayMode = mode; this.currentPage = 1; this.applyPipeline();
  }
  selectFieldForFilter(field: string, label: string): void {
    this.activeFieldFilter = field;
    this.activeFieldFilterLabel = label;
    this.fieldFilterValue = '';
    this.showFieldFilterMenu = false;
    this.showFilterMenu = false;
    this.applyPipeline();
  }
  onFieldFilterInput(event: Event): void {
    this.fieldFilterValue = (event.target as HTMLInputElement).value;
    this.currentPage = 1;
    this.applyPipeline();
  }
  clearFieldFilter(): void {
    this.activeFieldFilter = null; this.activeFieldFilterLabel = ''; this.fieldFilterValue = '';
    this.applyPipeline();
  }
  get hasActiveFilter(): boolean {
    return this.displayMode !== 'all' || !!this.activeFieldFilter || !!this.searchText;
  }

  // ============================================================
  // Tri
  // ============================================================
  /** Clic sur un en-tête = tri mono-colonne (remplace le tri courant) ; re-clic sur la même
   * colonne inverse le sens. Pour un tri multi-niveaux, l'opérateur passe par les paramètres. */
  sortBy(name: string): void {
    const cur = this.sortLevels.length === 1 ? this.sortLevels[0] : null;
    const dir: 'asc' | 'desc' = cur && cur.field === name && cur.dir === 'asc' ? 'desc' : 'asc';
    this.sortLevels = [{ field: name, dir }];
    this.hasExplicitSort = true;
    this.applyPipeline();
    this.savePrefs();
    this.sortChange.emit(this.sortLevels.map(l => ({ ...l })));
  }

  // ============================================================
  // Sélection
  // ============================================================
  isSelected(row: Row): boolean { return this.selected.has(row); }
  toggleSelection(row: Row): void {
    this.selected.has(row) ? this.selected.delete(row) : this.selected.add(row);
    this.emitStats();
  }
  get allVisibleSelected(): boolean {
    return this.filtered.length > 0 && this.filtered.every(r => this.selected.has(r));
  }
  selectAll(): void { this.filtered.forEach(r => this.selected.add(r)); this.emitStats(); }
  deselectAll(): void { this.selected.clear(); this.emitStats(); }
  toggleSelectAll(): void { this.allVisibleSelected ? this.deselectAll() : this.selectAll(); }
  invertSelection(): void {
    this.filtered.forEach(r => this.selected.has(r) ? this.selected.delete(r) : this.selected.add(r));
    this.emitStats();
  }
  private pruneSelection(): void {
    const set = new Set(this.model);
    Array.from(this.selected).forEach(r => { if (!set.has(r)) this.selected.delete(r); });
  }

  /** Déplace les lignes sélectionnées en tête du modèle (ordre de sélection conservé). Annule le
   * tri courant (réordonnancement manuel). En édition, la nouvelle ordonnance est émise. */
  moveSelectionToTop(): void {
    if (this.selected.size === 0) return;
    const selected = this.model.filter(r => this.selected.has(r));
    const rest = this.model.filter(r => !this.selected.has(r));
    this.model = [...selected, ...rest];
    this.sortLevels = [];
    this.hasExplicitSort = true;
    this.currentPage = 1;
    this.emit();
  }

  // ============================================================
  // Mutations de lignes (édition)
  // ============================================================
  addRow(): void {
    if (!this.editable) return;
    const row: Row = {};
    this.columns.forEach(c => row[c.name] = '');
    this.model = [...this.model, row];
    this.currentPage = this.totalPages;
    this.emit();
  }
  removeRow(row: Row): void {
    if (!this.editable) return;
    this.model = this.model.filter(r => r !== row);
    this.selected.delete(row);
    this.emit();
  }
  clearRows(): void {
    if (!this.editable) return;
    this.model = [];
    this.selected.clear();
    this.emit();
  }

  openBulkDelete(): void { if (this.selected.size) this.showDeleteConfirm = true; }
  cancelBulkDelete(): void { this.showDeleteConfirm = false; }
  confirmBulkDelete(): void {
    if (this.editable) {
      this.model = this.model.filter(r => !this.selected.has(r));
      this.selected.clear();
      this.showDeleteConfirm = false;
      this.emit();
      this.persistRequested.emit(this.model.slice());
    } else {
      // Consultation : retrait de la vue courante uniquement (non persisté).
      this.model = this.model.filter(r => !this.selected.has(r));
      this.selected.clear();
      this.showDeleteConfirm = false;
      this.applyPipeline();
    }
  }

  // ============================================================
  // Pagination (footer droite)
  // ============================================================
  get totalPages(): number { return Math.max(1, Math.ceil(this.filtered.length / this.pageSize)); }
  get pageNumbers(): number[] {
    const total = this.totalPages;
    const max = 5;
    let start = Math.max(1, this.currentPage - Math.floor(max / 2));
    const end = Math.min(total, start + max - 1);
    start = Math.max(1, end - max + 1);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }
  setPageSize(size: number): void {
    this.pageSize = size; this.currentPage = 1; this.applyPipeline(); this.savePrefs();
  }
  goToPage(p: number): void { this.currentPage = p; this.applyPipeline(); }
  goToFirstPage(): void { this.goToPage(1); }
  goToLastPage(): void { this.goToPage(this.totalPages); }
  prevPage(): void { if (this.currentPage > 1) this.goToPage(this.currentPage - 1); }
  nextPage(): void { if (this.currentPage < this.totalPages) this.goToPage(this.currentPage + 1); }

  // ============================================================
  // Gestion des colonnes
  // ============================================================
  get visibleColumns(): Column[] { return this.columns.filter(c => c.visible); }
  get visibleColumnCount(): number { return this.visibleColumns.length; }
  toggleColumnVisibility(name: string): void {
    const c = this.columns.find(x => x.name === name);
    if (c) c.visible = !c.visible;
  }
  selectAllColumns(): void { this.columns.forEach(c => c.visible = true); }
  deselectAllColumns(): void { this.columns.forEach(c => c.visible = false); }
  invertColumnSelection(): void { this.columns.forEach(c => c.visible = !c.visible); }

  /** Statistiques d'en-tête de la modale (total / visibles / masquées). */
  getColumnStats(): { total: number; visible: number; hidden: number } {
    const visible = this.columns.filter(c => c.visible).length;
    return { total: this.columns.length, visible, hidden: this.columns.length - visible };
  }
  /** Colonnes listées dans la modale, filtrées par le sélecteur toutes / visibles. */
  getFilteredColumns(): Column[] {
    return this.columnFilter === 'visible' ? this.columns.filter(c => c.visible) : this.columns;
  }
  toggleColumnFilterMenu(event: Event): void { event.stopPropagation(); this.showColumnFilterMenu = !this.showColumnFilterMenu; }
  applyColumnFilter(filter: 'all' | 'visible'): void { this.columnFilter = filter; this.showColumnFilterMenu = false; }
  getColumnFilterLabel(): string { return this.columnFilter === 'all' ? 'Toutes les colonnes' : 'Colonnes visibles'; }

  /** Texte de description d'une colonne : nom technique du champ + nature des données détectée. */
  columnDescription(col: Column): string {
    return `Champ « ${col.name} » — données de type ${cellTypeLabel(col.cellType).toLowerCase()}.`;
  }

  openColumnConfig(): void { this.columnsBackup = this.columns.map(c => ({ ...c })); this.showColumnConfig = true; }
  confirmColumnConfig(): void { this.showColumnConfig = false; this.showColumnFilterMenu = false; this.columnsBackup = []; this.applyPipeline(); this.savePrefs(); }
  cancelColumnConfig(): void {
    if (this.columnsBackup.length) this.columns = this.columnsBackup.map(c => ({ ...c }));
    this.columnsBackup = [];
    this.showColumnConfig = false;
    this.showColumnFilterMenu = false;
  }

  // --- Réordonnancement : drag & drop + 4 boutons (par référence de colonne → correct même
  //     quand la liste est filtrée sur « colonnes visibles »). ---
  columnRealIndex(col: Column): number { return this.columns.indexOf(col); }
  isFirstColumn(col: Column): boolean { return this.columnRealIndex(col) === 0; }
  isLastColumn(col: Column): boolean { return this.columnRealIndex(col) === this.columns.length - 1; }
  private moveColumn(from: number, to: number): void {
    if (from < 0 || to < 0 || from >= this.columns.length || to >= this.columns.length || from === to) return;
    const cols = [...this.columns];
    const [c] = cols.splice(from, 1);
    cols.splice(to, 0, c);
    this.columns = cols;
  }
  moveColumnUp(col: Column): void { const i = this.columnRealIndex(col); this.moveColumn(i, i - 1); }
  moveColumnDown(col: Column): void { const i = this.columnRealIndex(col); this.moveColumn(i, i + 1); }
  moveColumnToTop(col: Column): void { this.moveColumn(this.columnRealIndex(col), 0); }
  moveColumnToBottom(col: Column): void { this.moveColumn(this.columnRealIndex(col), this.columns.length - 1); }

  onDragStart(index: number): void { this.draggedColumnIndex = index; }
  onDragOver(event: DragEvent, index: number): void { event.preventDefault(); this.dragOverIndex = index; }
  onDragLeave(): void { this.dragOverIndex = null; }
  onDragEnd(): void { this.draggedColumnIndex = null; this.dragOverIndex = null; }
  onDrop(index: number): void {
    if (this.draggedColumnIndex === null || this.draggedColumnIndex === index) {
      this.draggedColumnIndex = null; this.dragOverIndex = null; return;
    }
    this.moveColumn(this.draggedColumnIndex, index);
    this.draggedColumnIndex = null;
    this.dragOverIndex = null;
  }

  // ============================================================
  // Export CSV / Excel
  // ============================================================
  toggleExportMenu(): void {
    this.showExportMenu = !this.showExportMenu;
    if (this.showExportMenu) this.showFilterMenu = false;
  }
  private exportRows(onlySelected: boolean): Row[] {
    const base = onlySelected ? this.filtered.filter(r => this.selected.has(r)) : this.filtered;
    return base.map(r => {
      const o: Row = {};
      this.visibleColumns.forEach(c => o[c.label] = r?.[c.name] ?? '');
      return o;
    });
  }
  private exportBasename(): string {
    const key = (this.tableKey || 'pieces').replace(/[^0-9A-Za-z._-]+/g, '-');
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, '0');
    const stamp = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}`;
    return `export_${key}_${stamp}`;
  }
  exportCSV(onlySelected: boolean): void {
    const data = this.exportRows(onlySelected);
    this.showExportMenu = false;
    if (!data.length) return;
    const headers = this.visibleColumns.map(c => c.label);
    const esc = (v: any) => {
      const s = String(v ?? '');
      return /[",;\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const lines = [headers.map(esc).join(';')];
    data.forEach(r => lines.push(headers.map(h => esc(r[h])).join(';')));
    // BOM UTF-8 pour Excel (accents corrects).
    const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    this.download(blob, this.exportBasename() + '.csv');
  }
  exportXLSX(onlySelected: boolean): void {
    const data = this.exportRows(onlySelected);
    this.showExportMenu = false;
    if (!data.length) return;
    const ws = XLSX.utils.json_to_sheet(data, { header: this.visibleColumns.map(c => c.label) });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Données');
    XLSX.writeFile(wb, this.exportBasename() + '.xlsx');
  }
  private download(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ============================================================
  // Préférences locales (localStorage, par tableKey)
  // ============================================================
  private prefKey(): string | null { return this.tableKey ? `pieceTable:${this.tableKey}` : null; }
  private savePrefs(): void {
    const key = this.prefKey();
    if (!key) return;
    try {
      localStorage.setItem(key, JSON.stringify({
        columns: this.columns.map(c => ({ name: c.name, visible: c.visible })),
        pageSize: this.pageSize,
        // NB : le TRI n'est plus mémorisé ici. La clé `tableKey` est commune à toutes les pièces
        // d'un même type (colonnes/pagination = préférence d'affichage partagée), or le tri est
        // PROPRE à chaque pièce (`payload.sort`, fourni via `defaultSort`). Le mémoriser ici le
        // ferait fuiter d'une pièce à l'autre et écraserait le tri propre de la pièce.
      }));
    } catch { /* quota / mode privé : préférences ignorées */ }
  }
  private loadPrefs(): void {
    const key = this.prefKey();
    if (!key) return;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const p = JSON.parse(raw);
      if (Array.isArray(p.columns)) {
        const order = p.columns.map((c: any) => c.name);
        const vis = new Map<string, boolean>(p.columns.map((c: any) => [c.name, c.visible]));
        this.columns.forEach(c => { if (vis.has(c.name)) c.visible = !!vis.get(c.name); });
        this.columns.sort((a, b) => {
          const ia = order.indexOf(a.name), ib = order.indexOf(b.name);
          if (ia === -1 && ib === -1) return 0;
          if (ia === -1) return 1;
          if (ib === -1) return -1;
          return ia - ib;
        });
      }
      if (p.pageSize) this.pageSize = p.pageSize;
      // Le tri n'est plus lu depuis localStorage : il est propre à la pièce et fourni par le
      // parent via `defaultSort` (cf. savePrefs). D'anciennes entrées `sortLevels`/`sortColumn`
      // éventuelles sont donc simplement ignorées.
    } catch { /* préférences illisibles : on ignore */ }
  }

  // ============================================================
  // Fermeture des menus au clic extérieur
  // ============================================================
  @HostListener('document:click', ['$event'])
  onDocClick(event: Event): void {
    const t = event.target as HTMLElement;
    if (!t.closest('.pdt-filter-wrapper')) this.showFilterMenu = this.showFieldFilterMenu = false;
    if (!t.closest('.pdt-export-wrapper')) this.showExportMenu = false;
    if (!t.closest('.pdt-colcfg-filter')) this.showColumnFilterMenu = false;
  }

  trackByIndex(i: number): number { return i; }
}
