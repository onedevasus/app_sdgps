import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Observable, forkJoin } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { ProjectsService } from '../../../core/services/projects.service';
import { ToastService } from '../../../core/services/toast.service';
import {
  Projet, Propriete, Affaire, Ssdgps, Session,
  PROCEDURE_OPTIONS, PROCEDURE_NATURES, PROCEDURES_SANS_DATE_BORNAGE,
  NATURE_AFFAIRE_LABELS, NATURE_SSDGPS_OPTIONS, TYPE_SSDGPS_OPTIONS, NatureAffaire,
} from '../../../core/models/project.model';

type Level = 'propriete' | 'affaire' | 'ssdgps' | 'session';

interface ColumnConfig {
  field: string;
  label: string;
  visible: boolean;
  type?: 'text' | 'date' | 'number' | 'boolean';
}

const VIEW_MODE_KEY = 'sdgps_explorer_view_mode';

const COLUMNS_BY_LEVEL: Record<Level, ColumnConfig[]> = {
  propriete: [
    { field: 'nom_propriete', label: 'Propriété-dite', visible: true, type: 'text' },
    { field: 'id_requisition', label: 'Réquisition', visible: true, type: 'text' },
    { field: 'id_titre', label: 'Titre foncier', visible: true, type: 'text' },
    { field: 'nbr_total_affaires', label: 'Affaires', visible: true, type: 'number' },
    { field: 'nbr_total_ssdgps', label: 'SSDGPS', visible: true, type: 'number' },
    { field: 'nbr_total_sessions', label: 'Sessions', visible: true, type: 'number' },
    { field: 'created_at', label: 'Créé le', visible: false, type: 'date' },
    { field: 'updated_at', label: 'Modifié le', visible: false, type: 'date' },
    { field: 'is_deleted', label: 'Supprimé', visible: false, type: 'boolean' },
    { field: 'deleted_at', label: 'Supprimé le', visible: false, type: 'date' },
    { field: 'created_by_email', label: 'Créé par', visible: false, type: 'text' },
    { field: 'updated_by_email', label: 'Modifié par', visible: false, type: 'text' },
    { field: 'deleted_by_email', label: 'Supprimé par', visible: false, type: 'text' },
  ],
  affaire: [
    { field: 'numero_sd_affaire', label: 'N° SD', visible: true, type: 'number' },
    { field: 'nature_procedure_affaire', label: 'Procédure', visible: true, type: 'text' },
    { field: 'nature_affaire', label: 'Nature', visible: true, type: 'text' },
    { field: 'date_bornage', label: 'Date bornage', visible: true, type: 'date' },
    { field: 'nbr_total_ssdgps', label: 'SSDGPS', visible: true, type: 'number' },
    { field: 'nbr_total_sessions', label: 'Sessions', visible: true, type: 'number' },
    { field: 'created_at', label: 'Créé le', visible: false, type: 'date' },
    { field: 'updated_at', label: 'Modifié le', visible: false, type: 'date' },
    { field: 'is_deleted', label: 'Supprimé', visible: false, type: 'boolean' },
    { field: 'deleted_at', label: 'Supprimé le', visible: false, type: 'date' },
    { field: 'created_by_email', label: 'Créé par', visible: false, type: 'text' },
    { field: 'updated_by_email', label: 'Modifié par', visible: false, type: 'text' },
    { field: 'deleted_by_email', label: 'Supprimé par', visible: false, type: 'text' },
  ],
  ssdgps: [
    { field: 'nature_ssdgps', label: 'Nature SSDGPS', visible: true, type: 'text' },
    { field: 'numero_ssdgps', label: 'Numéro', visible: true, type: 'number' },
    { field: 'type_ssdgps', label: 'Type', visible: true, type: 'text' },
    { field: 'nbr_total_sessions', label: 'Sessions', visible: true, type: 'number' },
    { field: 'nbr_total_pieces', label: 'Pièces', visible: true, type: 'number' },
    { field: 'created_at', label: 'Créé le', visible: false, type: 'date' },
    { field: 'updated_at', label: 'Modifié le', visible: false, type: 'date' },
    { field: 'is_deleted', label: 'Supprimé', visible: false, type: 'boolean' },
    { field: 'deleted_at', label: 'Supprimé le', visible: false, type: 'date' },
    { field: 'created_by_email', label: 'Créé par', visible: false, type: 'text' },
    { field: 'updated_by_email', label: 'Modifié par', visible: false, type: 'text' },
    { field: 'deleted_by_email', label: 'Supprimé par', visible: false, type: 'text' },
  ],
  session: [
    { field: 'numero_session', label: 'N° Session', visible: true, type: 'number' },
    { field: 'date_session', label: 'Date session', visible: true, type: 'date' },
    { field: 'nbr_total_pieces', label: 'Pièces', visible: true, type: 'number' },
    { field: 'created_at', label: 'Créé le', visible: false, type: 'date' },
    { field: 'updated_at', label: 'Modifié le', visible: false, type: 'date' },
    { field: 'is_deleted', label: 'Supprimé', visible: false, type: 'boolean' },
    { field: 'deleted_at', label: 'Supprimé le', visible: false, type: 'date' },
    { field: 'created_by_email', label: 'Créé par', visible: false, type: 'text' },
    { field: 'updated_by_email', label: 'Modifié par', visible: false, type: 'text' },
    { field: 'deleted_by_email', label: 'Supprimé par', visible: false, type: 'text' },
  ],
};

const DEFAULT_SORT_BY_LEVEL: Record<Level, string> = {
  propriete: 'nom_propriete', affaire: 'numero_sd_affaire', ssdgps: 'numero_ssdgps', session: 'numero_session',
};

const FIELD_DESCRIPTIONS: Record<string, string> = {
  nom_propriete: 'Nom de la propriété (propriété-dite)',
  id_requisition: 'Identifiant de réquisition (R<numéro>/<indice>)',
  id_titre: 'Identifiant du titre foncier (T<numéro>/<indice>)',
  numero_sd_affaire: "Numéro d'ordre du SD d'affaire dans la propriété",
  nature_procedure_affaire: "Type de procédure d'immatriculation",
  nature_affaire: "Nature précise de l'affaire (dépend de la procédure)",
  date_bornage: 'Date de bornage ou de recollement',
  nature_ssdgps: 'Nature du sous-sous-dossier GPS',
  numero_ssdgps: "Numéro d'ordre du SSDGPS dans l'affaire",
  type_ssdgps: 'Mono-session ou multi-session',
  nbr_total_affaires: 'Nombre total d\'affaires (SD) rattachées',
  nbr_total_ssdgps: 'Nombre total de SSDGPS rattachés',
  nbr_total_sessions: 'Nombre total de sessions rattachées',
  nbr_total_pieces: 'Nombre total de pièces rattachées au rapport',
  numero_session: "Numéro d'ordre de la session",
  date_session: "Date de l'observation",
  created_at: "Date de création de l'enregistrement",
  updated_at: "Date de dernière modification de l'enregistrement",
  is_deleted: "Indique si l'enregistrement a été supprimé (logique)",
  deleted_at: "Date de suppression de l'enregistrement",
  created_by_email: "Utilisateur ayant créé l'enregistrement",
  updated_by_email: "Utilisateur ayant modifié l'enregistrement en dernier",
  deleted_by_email: "Utilisateur ayant supprimé l'enregistrement",
};

@Component({
  selector: 'app-project-explorer',
  templateUrl: './project-explorer.component.html',
  styleUrls: ['./project-explorer.component.scss'],
})
export class ProjectExplorerComponent implements OnInit, OnDestroy {
  readonly procedureOptions = PROCEDURE_OPTIONS;
  readonly natureSsdgpsOptions = NATURE_SSDGPS_OPTIONS;
  readonly typeSsdgpsOptions = TYPE_SSDGPS_OPTIONS;

  private boundHandleClickOutside!: (event: Event) => void;

  projet: Projet | null = null;
  level: Level = 'propriete';
  chain: { propriete?: Propriete; affaire?: Affaire; ssdgps?: Ssdgps } = {};
  activeItems: any[] = [];
  deletedItems: any[] = [];
  loading = false;
  private manualOrder: string[] | null = null;

  /** Éléments du niveau courant selon l'onglet sélectionné (Actifs / Corbeille). */
  get items(): any[] { return this.showDeleted ? this.deletedItems : this.activeItems; }
  get activeCount(): number { return this.activeItems.length; }
  get deletedCount(): number { return this.deletedItems.length; }

  // Vue Cartes / Tableau
  viewMode: 'cards' | 'table' = 'cards';

  // Recherche & sélection
  searchText = '';
  selectedIds = new Set<string>();

  // Mode d'affichage (footer) / filtre par champ
  displayMode: 'all' | 'selected' = 'all';
  activeFieldFilter: string | null = null;
  activeFieldFilterLabel = '';
  fieldFilterValue = '';
  showFilterMenu = false;
  showFieldFilterMenu = false;

  // Tri (générique, partagé entre les modes Cartes et Tableau)
  sortColumn = DEFAULT_SORT_BY_LEVEL.propriete;
  sortDirection: 'asc' | 'desc' = 'asc';

  // Colonnes (mode Tableau)
  columns: ColumnConfig[] = [];
  private columnsBackup: ColumnConfig[] = [];
  showColumnConfig = false;
  columnFilter: 'all' | 'visible' = 'all';
  showColumnFilterMenu = false;
  draggedColumnIndex: number | null = null;
  dragOverIndex: number | null = null;

  // Pagination (mode Tableau)
  currentPage = 1;
  pageSize = 10;
  pageSizeOptions = [5, 10, 25, 50];

  // Affichage des éléments supprimés
  showDeleted = false;

  // Suppression (confirmation)
  showDeleteModal = false;
  deleteTarget: any = null;
  isBulkDelete = false;
  deleting = false;

  // Restauration
  showRestoreModal = false;
  restoreTarget: any = null;
  isBulkRestore = false;
  restoring = false;

  // Pièces (Phase 6.5) — page dédiée par SSDGPS
  openPieces(item: any, ev: Event): void {
    ev.stopPropagation();
    const base = { proprieteId: this.chain.propriete?.id, affaireId: this.chain.affaire?.id };
    if (this.level === 'ssdgps') {
      if (item.type_ssdgps === 'mono-session') {
        // Mono-session : accès direct aux pièces, aucune sélection de session intermédiaire
        this.router.navigate(['pieces', item.id], { relativeTo: this.route, queryParams: base });
      } else {
        // Multi-session : descendre en liste sessions (même effet que clic carte)
        this.descend(item);
      }
    } else if (this.level === 'session') {
      // Session précise → passer ssdgpsId pour que goBack() revienne ici
      this.router.navigate(['pieces', this.chain.ssdgps!.id], {
        relativeTo: this.route,
        queryParams: { ...base, session: item.id, ssdgpsId: this.chain.ssdgps!.id },
      });
    }
  }

  // Modale de saisie
  showModal = false;
  editing: any = null;
  submitting = false;
  form!: FormGroup;

  // Formulaire Affaire dynamique
  availableNatures: { value: NatureAffaire; label: string }[] = [];
  dateBornageRequired = true;

  // Menu contextuel des lignes/cellules
  showContextMenu = false;
  contextMenuPosition = { x: 0, y: 0 };
  contextMenuItem: any = null;
  contextMenuField: string | null = null;
  selectedCellValue: string | null = null;

  // Menu contextuel des colonnes
  showColumnContextMenu = false;
  contextMenuColumn: ColumnConfig | null = null;

  constructor(
    private service: ProjectsService,
    private route: ActivatedRoute,
    private router: Router,
    private toast: ToastService,
    private fb: FormBuilder,
  ) {}

  ngOnInit(): void {
    this.viewMode = (localStorage.getItem(VIEW_MODE_KEY) as 'cards' | 'table') || 'cards';
    this.boundHandleClickOutside = this.handleGlobalClick.bind(this);
    document.addEventListener('click', this.boundHandleClickOutside);

    const id = this.route.snapshot.paramMap.get('id')!;
    const proprieteId = this.route.snapshot.queryParamMap.get('proprieteId');
    const affaireId = this.route.snapshot.queryParamMap.get('affaireId');
    const ssdgpsId = this.route.snapshot.queryParamMap.get('ssdgpsId');
    this.service.getProjet(id).subscribe({
      next: (p) => {
        this.projet = p;
        if (proprieteId && affaireId && ssdgpsId) this.restoreToSessionLevel(proprieteId, affaireId, ssdgpsId);
        else if (proprieteId && affaireId) this.restoreToSsdgpsLevel(proprieteId, affaireId);
        else this.goToLevel('propriete');
      },
      error: () => { this.toast.error('Erreur', 'Projet introuvable'); this.backToList(); },
    });
  }

  /**
   * Revient directement au niveau SSDGPS d'une affaire donnée (retour depuis la page
   * dédiée des pièces, qui vit sur une route sœur de `:id` et ne peut donc pas
   * reconstruire la chaîne propriété/affaire via une navigation relative `..`).
   */
  private restoreToSsdgpsLevel(proprieteId: string, affaireId: string): void {
    this.service.getProprietes(this.projet!.id).subscribe({
      next: (proprietes) => {
        const propriete = proprietes.find(p => p.id === proprieteId);
        if (!propriete) { this.goToLevel('propriete'); return; }
        this.service.getAffaires(propriete.id).subscribe({
          next: (affaires) => {
            const affaire = affaires.find(a => a.id === affaireId);
            if (!affaire) { this.goToLevel('propriete'); return; }
            this.chain = { propriete, affaire };
            this.level = 'ssdgps';
            this.showDeleted = false;
            this.resetLevelState();
            this.loadLevel();
          },
          error: () => this.goToLevel('propriete'),
        });
      },
      error: () => this.goToLevel('propriete'),
    });
  }

  /** Restaure la chaîne jusqu'au niveau session (retour depuis la page pièces d'un SSDGPS multi-session). */
  private restoreToSessionLevel(proprieteId: string, affaireId: string, ssdgpsId: string): void {
    this.service.getProprietes(this.projet!.id).subscribe({
      next: (proprietes) => {
        const propriete = proprietes.find(p => p.id === proprieteId);
        if (!propriete) { this.goToLevel('propriete'); return; }
        this.service.getAffaires(propriete.id).subscribe({
          next: (affaires) => {
            const affaire = affaires.find(a => a.id === affaireId);
            if (!affaire) { this.goToLevel('propriete'); return; }
            this.service.getSsdgps(affaire.id).subscribe({
              next: (ssdgpsList) => {
                const ssdgps = ssdgpsList.find(s => s.id === ssdgpsId);
                if (!ssdgps) {
                  this.chain = { propriete, affaire };
                  this.level = 'ssdgps';
                  this.resetLevelState();
                  this.loadLevel();
                  return;
                }
                this.chain = { propriete, affaire, ssdgps };
                this.level = 'session';
                this.showDeleted = false;
                this.resetLevelState();
                this.loadLevel();
              },
              error: () => this.goToLevel('propriete'),
            });
          },
          error: () => this.goToLevel('propriete'),
        });
      },
      error: () => this.goToLevel('propriete'),
    });
  }

  ngOnDestroy(): void {
    if (this.boundHandleClickOutside) document.removeEventListener('click', this.boundHandleClickOutside);
  }

  toggleViewMode(mode: 'cards' | 'table'): void {
    this.viewMode = mode;
    localStorage.setItem(VIEW_MODE_KEY, mode);
  }

  // --- Navigation ---
  private childOf(level: Level): Level | null {
    return ({ propriete: 'affaire', affaire: 'ssdgps', ssdgps: 'session', session: null } as any)[level];
  }

  private resetLevelState(): void {
    this.manualOrder = null;
    this.columns = COLUMNS_BY_LEVEL[this.level].map(c => ({ ...c }));
    this.loadColumnPreferences();
    this.sortColumn = DEFAULT_SORT_BY_LEVEL[this.level];
    this.sortDirection = 'asc';
    this.currentPage = 1;
    this.displayMode = 'all';
    this.clearFieldFilter();
    this.closeAllContextMenus();
  }

  goToLevel(level: Level): void {
    this.level = level;
    this.showDeleted = false;
    // Nettoie la chaîne au-delà du niveau courant
    if (level === 'propriete') this.chain = {};
    else if (level === 'affaire') this.chain = { propriete: this.chain.propriete };
    else if (level === 'ssdgps') this.chain = { propriete: this.chain.propriete, affaire: this.chain.affaire };
    this.resetLevelState();
    this.loadLevel();
  }

  /**
   * Charge en une fois les éléments actifs ET supprimés du niveau courant, afin d'afficher
   * les deux compteurs des onglets Actifs/Corbeille sans aller-retour réseau supplémentaire
   * lors du changement d'onglet.
   */
  loadLevel(): void {
    this.loading = true;
    this.searchText = '';
    this.selectedIds.clear();
    const done = ([active, deleted]: [any[], any[]]) => {
      this.activeItems = active;
      this.deletedItems = deleted;
      this.loading = false;
    };
    const fail = () => { this.toast.error('Erreur', 'Chargement impossible'); this.loading = false; };
    const deletedParams = { show_deleted: true };
    let active$: Observable<any[]>;
    let deleted$: Observable<any[]>;
    switch (this.level) {
      case 'propriete':
        active$ = this.service.getProprietes(this.projet!.id);
        deleted$ = this.service.getProprietes(this.projet!.id, deletedParams);
        break;
      case 'affaire':
        active$ = this.service.getAffaires(this.chain.propriete!.id);
        deleted$ = this.service.getAffaires(this.chain.propriete!.id, deletedParams);
        break;
      case 'ssdgps':
        active$ = this.service.getSsdgps(this.chain.affaire!.id);
        deleted$ = this.service.getSsdgps(this.chain.affaire!.id, deletedParams);
        break;
      case 'session':
        active$ = this.service.getSessions(this.chain.ssdgps!.id);
        deleted$ = this.service.getSessions(this.chain.ssdgps!.id, deletedParams);
        break;
    }
    forkJoin([active$, deleted$]).subscribe({ next: done, error: fail });
  }

  descend(item: any): void {
    if (item.is_deleted) return;
    const child = this.childOf(this.level);
    if (!child) return;
    // Mono-session : aller directement aux pièces (aucun niveau session intermédiaire)
    if (this.level === 'ssdgps' && item.type_ssdgps === 'mono-session') {
      const qp = { proprieteId: this.chain.propriete?.id, affaireId: this.chain.affaire?.id };
      this.router.navigate(['pieces', item.id], { relativeTo: this.route, queryParams: qp });
      return;
    }
    if (this.level === 'propriete') this.chain.propriete = item;
    else if (this.level === 'affaire') this.chain.affaire = item;
    else if (this.level === 'ssdgps') this.chain.ssdgps = item;
    this.level = child;
    this.showDeleted = false;
    this.resetLevelState();
    this.loadLevel();
  }

  // --- Onglets Actifs / Corbeille ---
  setTab(deleted: boolean): void {
    if (this.showDeleted === deleted) return;
    this.showDeleted = deleted;
    this.selectedIds.clear();
    this.searchText = '';
    this.manualOrder = null;
    this.currentPage = 1;
  }

  // --- Tri ---
  toggleSort(): void {
    this.manualOrder = null;
    this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
  }

  sortBy(field: string): void {
    this.manualOrder = null;
    if (this.sortColumn === field) this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    else { this.sortColumn = field; this.sortDirection = 'asc'; }
    this.currentPage = 1;
  }

  getSortIcon(field: string): string {
    if (this.sortColumn !== field) return 'fas fa-sort';
    return this.sortDirection === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down';
  }

  private sortValue(item: any): number | string {
    const v = item[this.sortColumn];
    if (v == null) return '';
    return typeof v === 'string' ? v.toLowerCase() : v;
  }

  // --- Libellés ---
  get levelTitle(): string {
    return { propriete: 'Propriétés', affaire: 'Affaires (SD)', ssdgps: 'SSDGPS', session: 'Sessions' }[this.level];
  }

  itemLabel(item: any, level: Level = this.level): string {
    switch (level) {
      case 'propriete': {
        // Identifiant affiché : le titre foncier s'il existe, sinon la réquisition.
        const idPropriete = item.id_titre || item.id_requisition;
        return item.nom_propriete + (idPropriete ? ` (${idPropriete})` : '');
      }
      // Note : le fil d'Ariane utilise `proprieteBreadcrumbLabel` (identifiant seul).
      case 'affaire': return `SD ${item.numero_sd_affaire} — ${item.nature_affaire}`;
      case 'ssdgps': return `SSDGPS ${item.numero_ssdgps} (${item.nature_ssdgps})`;
      case 'session': return `Session ${item.numero_session}`;
      default: return '';
    }
  }

  /** Libellé de propriété pour le fil d'Ariane : uniquement l'identifiant
   * (titre foncier s'il existe, sinon réquisition), sans le nom de la propriété. */
  proprieteBreadcrumbLabel(item: any): string {
    return item?.id_titre || item?.id_requisition || item?.nom_propriete || '';
  }

  natureLabel(v: string): string { return NATURE_AFFAIRE_LABELS[v as NatureAffaire] || v; }
  isLeaf(): boolean { return this.level === 'session'; }

  levelIcon(level: Level = this.level): string {
    return { propriete: 'fa-map-marker-alt', affaire: 'fa-file-signature', ssdgps: 'fa-satellite-dish', session: 'fa-clock' }[level];
  }

  childLabel(): string {
    return { propriete: 'propriété', affaire: 'affaire', ssdgps: 'SSDGPS', session: '' }[this.level];
  }

  formatDate(value: any): string {
    if (!value) return '—';
    return new Date(value).toLocaleDateString('fr-FR', { year: 'numeric', month: '2-digit', day: '2-digit' });
  }

  // --- Recherche, filtre, tri & sélection ---
  get filteredItems(): any[] {
    let result = this.items;
    if (this.displayMode === 'selected') {
      result = result.filter(it => this.selectedIds.has(it.id));
    }
    if (this.searchText) {
      const q = this.searchText.toLowerCase();
      result = result.filter(it => this.itemLabel(it).toLowerCase().includes(q));
    }
    if (this.activeFieldFilter && this.fieldFilterValue) {
      const ff = this.activeFieldFilter;
      const fv = this.fieldFilterValue.toLowerCase();
      result = result.filter(it => {
        const val = it[ff];
        return val != null && String(val).toLowerCase().includes(fv);
      });
    }
    if (this.manualOrder) {
      const idx = new Map(this.manualOrder.map((id, i) => [id, i]));
      result = [...result].sort((a, b) => {
        const ia = idx.has(a.id) ? idx.get(a.id)! : Number.MAX_SAFE_INTEGER;
        const ib = idx.has(b.id) ? idx.get(b.id)! : Number.MAX_SAFE_INTEGER;
        return ia - ib;
      });
    } else {
      result = [...result].sort((a, b) => {
        const ka = this.sortValue(a), kb = this.sortValue(b);
        const cmp = ka < kb ? -1 : ka > kb ? 1 : 0;
        return this.sortDirection === 'asc' ? cmp : -cmp;
      });
    }
    return result;
  }

  get paginatedItems(): any[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredItems.slice(start, start + this.pageSize);
  }

  get totalPages(): number { return Math.max(1, Math.ceil(this.filteredItems.length / this.pageSize)); }

  get pageNumbers(): number[] {
    const pages: number[] = [];
    const start = Math.max(1, this.currentPage - 2);
    const end = Math.min(this.totalPages, this.currentPage + 2);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }

  goToPage(page: number): void { if (page >= 1 && page <= this.totalPages) this.currentPage = page; }
  goToFirstPage(): void { this.goToPage(1); }
  goToLastPage(): void { this.goToPage(this.totalPages); }
  prevPage(): void { if (this.currentPage > 1) this.currentPage--; }
  nextPage(): void { if (this.currentPage < this.totalPages) this.currentPage++; }
  setPageSize(size: number): void { this.pageSize = size; this.currentPage = 1; }

  isSelected(it: any): boolean { return this.selectedIds.has(it.id); }
  toggleSelect(it: any, ev: Event): void {
    ev.stopPropagation();
    this.selectedIds.has(it.id) ? this.selectedIds.delete(it.id) : this.selectedIds.add(it.id);
  }
  get selectedCount(): number { return this.selectedIds.size; }
  clearSelection(): void { this.selectedIds.clear(); }
  get isAllSelected(): boolean {
    const f = this.viewMode === 'table' ? this.paginatedItems : this.filteredItems;
    return f.length > 0 && f.every(it => this.selectedIds.has(it.id));
  }
  toggleSelectAll(): void {
    const f = this.viewMode === 'table' ? this.paginatedItems : this.filteredItems;
    if (this.isAllSelected) f.forEach(it => this.selectedIds.delete(it.id));
    else f.forEach(it => this.selectedIds.add(it.id));
  }
  selectAll(): void { this.filteredItems.forEach(it => this.selectedIds.add(it.id)); }
  deselectAll(): void { this.selectedIds.clear(); }
  invertSelection(): void {
    const f = this.viewMode === 'table' ? this.paginatedItems : this.filteredItems;
    f.forEach(it => this.selectedIds.has(it.id) ? this.selectedIds.delete(it.id) : this.selectedIds.add(it.id));
  }

  getSelectedItemsList(): any[] { return this.items.filter(it => this.selectedIds.has(it.id)); }

  get allSelectedAreDeleted(): boolean {
    if (this.selectedCount === 0) return false;
    return this.getSelectedItemsList().every(it => it.is_deleted);
  }

  moveSelectionToTop(): void {
    if (this.selectedIds.size === 0) return;
    const selected = this.filteredItems.filter(it => this.selectedIds.has(it.id)).map(it => it.id);
    const rest = this.filteredItems.filter(it => !this.selectedIds.has(it.id)).map(it => it.id);
    this.manualOrder = [...selected, ...rest];
    this.currentPage = 1;
  }

  // --- Mode d'affichage / filtre par champ (pied de tableau) ---
  setDisplayMode(mode: 'all' | 'selected'): void { this.displayMode = mode; this.currentPage = 1; }

  toggleFilterMenu(): void { this.showFilterMenu = !this.showFilterMenu; }

  selectFieldForFilter(field: string, label: string): void {
    this.activeFieldFilter = field;
    this.activeFieldFilterLabel = label;
    this.fieldFilterValue = '';
    this.showFieldFilterMenu = false;
    this.showFilterMenu = false;
    this.currentPage = 1;
  }

  onFieldFilterInput(event: Event): void {
    this.fieldFilterValue = (event.target as HTMLInputElement).value;
    this.currentPage = 1;
  }

  clearFieldFilter(): void {
    this.activeFieldFilter = null;
    this.activeFieldFilterLabel = '';
    this.fieldFilterValue = '';
  }

  // --- Colonnes (mode Tableau) ---
  private columnPrefsKey(): string { return `sdgps_explorer_columns_${this.level}`; }

  private loadColumnPreferences(): void {
    try {
      const raw = localStorage.getItem(this.columnPrefsKey());
      if (!raw) return;
      const saved: { field: string; visible: boolean }[] = JSON.parse(raw);
      saved.forEach(sc => {
        const col = this.columns.find(c => c.field === sc.field);
        if (col) col.visible = sc.visible;
      });
      const ordered: ColumnConfig[] = [];
      saved.forEach(sc => {
        const col = this.columns.find(c => c.field === sc.field);
        if (col) ordered.push(col);
      });
      this.columns.forEach(c => { if (!ordered.includes(c)) ordered.push(c); });
      if (ordered.length === this.columns.length) this.columns = ordered;
    } catch { /* ignore */ }
  }

  private saveColumnPreferences(): void {
    localStorage.setItem(this.columnPrefsKey(), JSON.stringify(this.columns.map(c => ({ field: c.field, visible: c.visible }))));
  }

  getVisibleColumns(): ColumnConfig[] { return this.columns.filter(c => c.visible); }
  getFilteredColumns(): ColumnConfig[] { return this.columnFilter === 'visible' ? this.columns.filter(c => c.visible) : this.columns; }
  getColumnStats(): { total: number; visible: number; hidden: number } {
    const total = this.columns.length;
    const visible = this.columns.filter(c => c.visible).length;
    return { total, visible, hidden: total - visible };
  }
  toggleColumnVisibility(field: string): void {
    const col = this.columns.find(c => c.field === field);
    if (col) col.visible = !col.visible;
  }

  toggleColumnConfig(): void {
    if (!this.showColumnConfig) this.saveColumnsBackup();
    else this.restoreColumnsBackup();
    this.showColumnConfig = !this.showColumnConfig;
  }
  openColumnConfig(): void { this.saveColumnsBackup(); this.showColumnConfig = true; }
  confirmColumnConfig(): void { this.showColumnConfig = false; this.columnsBackup = []; this.saveColumnPreferences(); }
  cancelColumnConfig(): void { this.restoreColumnsBackup(); this.showColumnConfig = false; }
  private saveColumnsBackup(): void { this.columnsBackup = this.columns.map(c => ({ ...c })); }
  private restoreColumnsBackup(): void {
    if (this.columnsBackup.length > 0) { this.columns = this.columnsBackup.map(c => ({ ...c })); this.columnsBackup = []; }
  }

  selectAllColumns(): void { this.columns.forEach(c => c.visible = true); }
  deselectAllColumns(): void { this.columns.forEach(c => c.visible = false); }
  invertColumnSelection(): void { this.columns.forEach(c => c.visible = !c.visible); }

  toggleColumnFilterMenu(event: Event): void { event.stopPropagation(); this.showColumnFilterMenu = !this.showColumnFilterMenu; }
  applyColumnFilter(filter: 'all' | 'visible'): void { this.columnFilter = filter; this.showColumnFilterMenu = false; }
  getColumnFilterLabel(): string { return this.columnFilter === 'all' ? 'Toutes les colonnes' : 'Colonnes visibles'; }

  // Drag & drop réordonnancement
  onDragStart(index: number): void { this.draggedColumnIndex = index; }
  onDragOver(event: DragEvent, index: number): void { event.preventDefault(); this.dragOverIndex = index; }
  onDragLeave(): void { this.dragOverIndex = null; }
  onDrop(index: number): void {
    if (this.draggedColumnIndex === null || this.draggedColumnIndex === index) { this.draggedColumnIndex = null; this.dragOverIndex = null; return; }
    const dragged = this.columns[this.draggedColumnIndex];
    this.columns.splice(this.draggedColumnIndex, 1);
    this.columns.splice(index, 0, dragged);
    this.draggedColumnIndex = null; this.dragOverIndex = null;
  }
  onDragEnd(): void { this.draggedColumnIndex = null; this.dragOverIndex = null; }

  moveColumnUp(index: number): void { if (index > 0) { [this.columns[index], this.columns[index - 1]] = [this.columns[index - 1], this.columns[index]]; } }
  moveColumnDown(index: number): void { if (index < this.columns.length - 1) { [this.columns[index], this.columns[index + 1]] = [this.columns[index + 1], this.columns[index]]; } }
  moveColumnToTop(index: number): void { if (index > 0) { const c = this.columns.splice(index, 1)[0]; this.columns.unshift(c); } }
  moveColumnToBottom(index: number): void { if (index < this.columns.length - 1) { const c = this.columns.splice(index, 1)[0]; this.columns.push(c); } }

  onColumnHeaderRightClick(event: MouseEvent, col: ColumnConfig): void {
    event.preventDefault(); event.stopPropagation();
    this.contextMenuPosition = { x: event.clientX, y: event.clientY };
    this.contextMenuColumn = col;
    this.showColumnContextMenu = true;
  }
  hideColumnFromContext(): void {
    if (this.contextMenuColumn) this.contextMenuColumn.visible = false;
    this.showColumnContextMenu = false; this.contextMenuColumn = null;
  }
  openColumnConfigFromContext(): void { this.showColumnContextMenu = false; this.openColumnConfig(); }

  getTypeLabel(type?: string): string {
    return { text: 'TEXTE', date: 'DATE', number: 'NOMBRE', boolean: 'BOOLÉEN' }[type || 'text'] || 'TEXTE';
  }
  getFieldDescription(field: string): string { return FIELD_DESCRIPTIONS[field] || ''; }

  getCellValue(item: any, field: string): string {
    if (field === 'date_bornage' || field === 'date_session' || field === 'created_at' || field === 'updated_at' || field === 'deleted_at') return this.formatDate(item[field]);
    if (field === 'nature_affaire') return this.natureLabel(item[field]);
    if (field === 'is_deleted') return item[field] ? 'Oui' : 'Non';
    return String(item[field] ?? '—');
  }

  // --- Export CSV ---
  private csvEscape(v: any): string {
    const s = v == null ? '' : String(v);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }

  exportCsv(): void {
    const cols = this.columns.filter(c => c.visible);
    const header = cols.map(c => c.label).join(';');
    const rows = this.filteredItems.map(it => cols.map(c => this.csvEscape(this.getCellValue(it, c.field))).join(';'));
    const csv = '﻿' + [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.level}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    this.toast.success('Export', `${this.filteredItems.length} élément(s) exporté(s)`);
  }

  // --- Formulaire ---
  openCreate(): void { this.editing = null; this.buildForm(); this.showModal = true; }
  openEdit(item: any, ev: Event): void { ev.stopPropagation(); this.editing = item; this.buildForm(item); this.showModal = true; }
  closeModal(): void { if (this.submitting) return; this.showModal = false; this.editing = null; }

  private buildForm(item?: any): void {
    switch (this.level) {
      case 'propriete':
        this.form = this.fb.group({
          nom_propriete: [item?.nom_propriete || '', Validators.required],
          id_requisition: [item?.id_requisition || ''],
          id_titre: [item?.id_titre || ''],
        });
        break;
      case 'affaire':
        this.form = this.fb.group({
          numero_sd_affaire: [item?.numero_sd_affaire ?? null, Validators.required],
          nature_procedure_affaire: [item?.nature_procedure_affaire || '', Validators.required],
          nature_affaire: [item?.nature_affaire || '', Validators.required],
          date_bornage: [item?.date_bornage || null],
        });
        this.onProcedureChange(item?.nature_procedure_affaire || '');
        this.form.get('nature_procedure_affaire')!.valueChanges.subscribe(v => this.onProcedureChange(v));
        break;
      case 'ssdgps':
        this.form = this.fb.group({
          nature_ssdgps: [item?.nature_ssdgps || '', Validators.required],
          numero_ssdgps: [item?.numero_ssdgps ?? null, Validators.required],
          type_ssdgps: [item?.type_ssdgps || 'mono-session', Validators.required],
        });
        break;
      case 'session':
        this.form = this.fb.group({
          numero_session: [item?.numero_session ?? null, Validators.required],
          date_session: [item?.date_session || null],
        });
        break;
    }
  }

  /** Met à jour les natures disponibles + l'obligation de date selon la procédure. */
  onProcedureChange(procedure: string): void {
    const natures = PROCEDURE_NATURES[procedure as keyof typeof PROCEDURE_NATURES] || [];
    this.availableNatures = natures.map(n => ({ value: n, label: `${n} — ${NATURE_AFFAIRE_LABELS[n]}` }));
    this.dateBornageRequired = !!procedure && !PROCEDURES_SANS_DATE_BORNAGE.includes(procedure as any);
    const natureCtrl = this.form.get('nature_affaire');
    if (natureCtrl && !natures.includes(natureCtrl.value)) natureCtrl.setValue('');
    if (procedure && !this.dateBornageRequired) this.form.get('date_bornage')?.setValue(null);
  }

  get isProprieteInvalid(): boolean {
    if (this.level !== 'propriete') return false;
    return !this.form.value.id_requisition && !this.form.value.id_titre;
  }

  submit(): void {
    if (this.form.invalid || this.submitting) { this.form.markAllAsTouched(); return; }
    if (this.isProprieteInvalid) { this.toast.error('Validation', 'Renseignez au moins la réquisition ou le titre.'); return; }
    if (this.level === 'affaire' && this.dateBornageRequired && !this.form.value.date_bornage) {
      this.toast.error('Validation', 'La date de bornage/recollement est requise pour cette procédure.'); return;
    }
    this.submitting = true;
    const payload: any = { ...this.form.value };
    // Rattache le parent
    if (this.level === 'propriete') payload.projet = this.projet!.id;
    else if (this.level === 'affaire') payload.propriete = this.chain.propriete!.id;
    else if (this.level === 'ssdgps') payload.affaire = this.chain.affaire!.id;
    else if (this.level === 'session') payload.ssdgps = this.chain.ssdgps!.id;

    const done = () => { this.submitting = false; this.closeModal(); this.loadLevel(); this.toast.success('Succès', 'Enregistré'); };
    const fail = (e: any) => {
      this.submitting = false;
      const err = e?.error;
      const msg = typeof err === 'object' && err ? Object.values(err).flat().join(' ') : 'Erreur lors de l\'enregistrement';
      this.toast.error('Échec', String(msg));
    };
    const svc = this.service;
    const id = this.editing?.id;
    const call: Observable<any> = {
      propriete: () => id ? svc.updatePropriete(id, payload) : svc.createPropriete(payload),
      affaire: () => id ? svc.updateAffaire(id, payload) : svc.createAffaire(payload),
      ssdgps: () => id ? svc.updateSsdgps(id, payload) : svc.createSsdgps(payload),
      session: () => id ? svc.updateSession(id, payload) : svc.createSession(payload),
    }[this.level]();
    call.subscribe({ next: done, error: fail });
  }

  // --- Suppression (avec confirmation) ---
  private deleteCall(id: string): Observable<any> {
    const svc = this.service;
    return {
      propriete: () => svc.deletePropriete(id),
      affaire: () => svc.deleteAffaire(id),
      ssdgps: () => svc.deleteSsdgps(id),
      session: () => svc.deleteSession(id),
    }[this.level]();
  }

  openDeleteModal(item: any, ev: Event): void {
    ev.stopPropagation();
    this.deleteTarget = item; this.isBulkDelete = false; this.showDeleteModal = true;
  }
  openBulkDelete(): void {
    if (this.selectedCount === 0) return;
    this.deleteTarget = null; this.isBulkDelete = true; this.showDeleteModal = true;
  }
  closeDeleteModal(): void { if (!this.deleting) { this.showDeleteModal = false; this.deleteTarget = null; } }

  confirmDelete(): void {
    this.deleting = true;
    const finish = (n: number) => {
      this.deleting = false; this.showDeleteModal = false; this.deleteTarget = null;
      this.clearSelection(); this.loadLevel(); this.toast.success('Succès', `${n} élément(s) supprimé(s)`);
    };
    const fail = () => { this.deleting = false; this.toast.error('Erreur', 'Suppression impossible'); };
    if (this.isBulkDelete) {
      const ids = Array.from(this.selectedIds);
      forkJoin(ids.map(id => this.deleteCall(id))).subscribe({ next: () => finish(ids.length), error: fail });
    } else if (this.deleteTarget) {
      this.deleteCall(this.deleteTarget.id).subscribe({ next: () => finish(1), error: fail });
    }
  }

  // --- Restauration ---
  private restoreCall(id: string): Observable<any> {
    const svc = this.service;
    return {
      propriete: () => svc.restorePropriete(id),
      affaire: () => svc.restoreAffaire(id),
      ssdgps: () => svc.restoreSsdgps(id),
      session: () => svc.restoreSession(id),
    }[this.level]();
  }

  openRestoreModal(item: any): void { this.restoreTarget = item; this.isBulkRestore = false; this.showRestoreModal = true; }
  openBulkRestoreModal(): void { if (this.selectedCount === 0) return; this.restoreTarget = null; this.isBulkRestore = true; this.showRestoreModal = true; }
  closeRestoreModal(): void { if (!this.restoring) { this.showRestoreModal = false; this.restoreTarget = null; } }

  confirmRestore(): void {
    this.restoring = true;
    const finish = (n: number) => {
      this.restoring = false; this.showRestoreModal = false; this.restoreTarget = null;
      this.clearSelection(); this.loadLevel(); this.toast.success('Succès', `${n} élément(s) restauré(s)`);
    };
    const fail = () => { this.restoring = false; this.toast.error('Erreur', 'Restauration impossible'); };
    if (this.isBulkRestore) {
      const ids = Array.from(this.selectedIds);
      forkJoin(ids.map(id => this.restoreCall(id))).subscribe({ next: () => finish(ids.length), error: fail });
    } else if (this.restoreTarget) {
      this.restoreCall(this.restoreTarget.id).subscribe({ next: () => finish(1), error: fail });
    }
  }

  // --- Menu contextuel des lignes/cellules (clic droit) ---
  onItemRightClick(event: MouseEvent, item: any, field: string | null = null): void {
    event.preventDefault(); event.stopPropagation();
    this.contextMenuPosition = { x: event.clientX, y: event.clientY };
    this.contextMenuItem = item;
    this.contextMenuField = field;
    this.selectedCellValue = field ? this.getCellValue(item, field) : null;
    this.showContextMenu = true;
  }
  toggleSelectFromContext(): void { if (this.contextMenuItem) this.toggleSelect(this.contextMenuItem, new Event('click')); this.closeContextMenu(); }
  selectAllFromContext(): void { this.selectAll(); this.closeContextMenu(); }
  copyCellValueFromContext(): void {
    if (this.selectedCellValue != null) {
      navigator.clipboard.writeText(this.selectedCellValue).then(() => this.toast.success('Copié', 'Valeur copiée dans le presse-papier'));
    }
    this.closeContextMenu();
  }
  openFromContext(): void { if (this.contextMenuItem && !this.contextMenuItem.is_deleted) this.descend(this.contextMenuItem); this.closeContextMenu(); }
  openEditFromContext(): void {
    if (this.contextMenuItem && !this.contextMenuItem.is_deleted) { this.editing = this.contextMenuItem; this.buildForm(this.contextMenuItem); this.showModal = true; }
    this.closeContextMenu();
  }
  openDeleteFromContext(): void {
    if (this.contextMenuItem && !this.contextMenuItem.is_deleted) { this.deleteTarget = this.contextMenuItem; this.isBulkDelete = false; this.showDeleteModal = true; }
    this.closeContextMenu();
  }
  openRestoreFromContext(): void {
    if (this.contextMenuItem?.is_deleted) this.openRestoreModal(this.contextMenuItem);
    this.closeContextMenu();
  }
  closeContextMenu(): void { this.showContextMenu = false; this.contextMenuItem = null; this.contextMenuField = null; }

  closeAllContextMenus(): void {
    this.showColumnContextMenu = false; this.contextMenuColumn = null;
    this.closeContextMenu();
  }

  private handleGlobalClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.filter-menu-wrapper') && !target.closest('.context-menu') && !target.closest('.dropdown-container')) {
      this.showFilterMenu = false;
      this.showFieldFilterMenu = false;
      this.showColumnFilterMenu = false;
      this.closeAllContextMenus();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.showColumnConfig) { this.cancelColumnConfig(); return; }
    if (this.showContextMenu || this.showColumnContextMenu) { this.closeAllContextMenus(); return; }
    if (this.showModal) { this.closeModal(); return; }
    if (this.showDeleteModal) { this.closeDeleteModal(); return; }
    if (this.showRestoreModal) { this.closeRestoreModal(); return; }
  }

  backToList(): void {
    // Navigation relative : remonte de /…/projets/:id vers /…/projets (admin ou dashboard).
    this.router.navigate(['..'], { relativeTo: this.route });
  }
}
