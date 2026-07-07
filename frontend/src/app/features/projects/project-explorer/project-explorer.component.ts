import { Component, OnInit, HostListener } from '@angular/core';
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

@Component({
  selector: 'app-project-explorer',
  templateUrl: './project-explorer.component.html',
  styleUrls: ['./project-explorer.component.scss'],
})
export class ProjectExplorerComponent implements OnInit {
  readonly procedureOptions = PROCEDURE_OPTIONS;
  readonly natureSsdgpsOptions = NATURE_SSDGPS_OPTIONS;
  readonly typeSsdgpsOptions = TYPE_SSDGPS_OPTIONS;

  projet: Projet | null = null;
  level: Level = 'propriete';
  chain: { propriete?: Propriete; affaire?: Affaire; ssdgps?: Ssdgps } = {};
  activeItems: any[] = [];
  deletedItems: any[] = [];
  loading = false;

  /** Éléments du niveau courant selon l'onglet sélectionné (Actifs / Corbeille). */
  get items(): any[] { return this.showDeleted ? this.deletedItems : this.activeItems; }
  get activeCount(): number { return this.activeItems.length; }
  get deletedCount(): number { return this.deletedItems.length; }

  // Recherche & sélection
  searchText = '';
  selectedIds = new Set<string>();

  // Tri
  sortDirection: 'asc' | 'desc' = 'asc';

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

  // Modale de saisie
  showModal = false;
  editing: any = null;
  submitting = false;
  form!: FormGroup;

  // Formulaire Affaire dynamique
  availableNatures: { value: NatureAffaire; label: string }[] = [];
  dateBornageRequired = true;

  // Menu contextuel
  showContextMenu = false;
  contextMenuPosition = { x: 0, y: 0 };
  contextMenuItem: any = null;

  constructor(
    private service: ProjectsService,
    private route: ActivatedRoute,
    private router: Router,
    private toast: ToastService,
    private fb: FormBuilder,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.service.getProjet(id).subscribe({
      next: (p) => { this.projet = p; this.goToLevel('propriete'); },
      error: () => { this.toast.error('Erreur', 'Projet introuvable'); this.backToList(); },
    });
  }

  // --- Navigation ---
  private childOf(level: Level): Level | null {
    return ({ propriete: 'affaire', affaire: 'ssdgps', ssdgps: 'session', session: null } as any)[level];
  }

  goToLevel(level: Level): void {
    this.level = level;
    this.showDeleted = false;
    // Nettoie la chaîne au-delà du niveau courant
    if (level === 'propriete') this.chain = {};
    else if (level === 'affaire') this.chain = { propriete: this.chain.propriete };
    else if (level === 'ssdgps') this.chain = { propriete: this.chain.propriete, affaire: this.chain.affaire };
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
    if (item.is_deleted) return; // ne pas naviguer dans un élément supprimé
    const child = this.childOf(this.level);
    if (!child) return; // session = feuille
    if (this.level === 'propriete') this.chain.propriete = item;
    else if (this.level === 'affaire') this.chain.affaire = item;
    else if (this.level === 'ssdgps') this.chain.ssdgps = item;
    this.level = child;
    this.showDeleted = false;
    this.loadLevel();
  }

  // --- Onglets Actifs / Corbeille ---
  setTab(deleted: boolean): void {
    if (this.showDeleted === deleted) return;
    this.showDeleted = deleted;
    this.selectedIds.clear();
    this.searchText = '';
  }

  // --- Tri ---
  toggleSort(): void {
    this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
  }

  private sortKey(item: any): number | string {
    switch (this.level) {
      case 'propriete': return (item.nom_propriete || '').toLowerCase();
      case 'affaire': return item.numero_sd_affaire ?? 0;
      case 'ssdgps': return item.numero_ssdgps ?? 0;
      case 'session': return item.numero_session ?? 0;
      default: return 0;
    }
  }

  // --- Libellés ---
  get levelTitle(): string {
    return { propriete: 'Propriétés', affaire: 'Affaires (SD)', ssdgps: 'SSDGPS', session: 'Sessions' }[this.level];
  }

  itemLabel(item: any, level: Level = this.level): string {
    switch (level) {
      case 'propriete': return item.nom_propriete + (item.id_requisition ? ` (${item.id_requisition})` : '');
      case 'affaire': return `SD ${item.numero_sd_affaire} — ${item.nature_affaire}`;
      case 'ssdgps': return `SSDGPS ${item.numero_ssdgps} (${item.nature_ssdgps})`;
      case 'session': return `Session ${item.numero_session}`;
      default: return '';
    }
  }

  natureLabel(v: string): string { return NATURE_AFFAIRE_LABELS[v as NatureAffaire] || v; }
  isLeaf(): boolean { return this.level === 'session'; }

  levelIcon(level: Level = this.level): string {
    return { propriete: 'fa-map-marker-alt', affaire: 'fa-file-signature', ssdgps: 'fa-satellite-dish', session: 'fa-clock' }[level];
  }

  childLabel(): string {
    return { propriete: 'propriété', affaire: 'affaire', ssdgps: 'SSDGPS', session: '' }[this.level];
  }

  // --- Recherche, tri & sélection ---
  get filteredItems(): any[] {
    let result = this.items;
    if (this.searchText) {
      const q = this.searchText.toLowerCase();
      result = result.filter(it => this.itemLabel(it).toLowerCase().includes(q));
    }
    result = [...result].sort((a, b) => {
      const ka = this.sortKey(a), kb = this.sortKey(b);
      const cmp = ka < kb ? -1 : ka > kb ? 1 : 0;
      return this.sortDirection === 'asc' ? cmp : -cmp;
    });
    return result;
  }
  isSelected(it: any): boolean { return this.selectedIds.has(it.id); }
  toggleSelect(it: any, ev: Event): void {
    ev.stopPropagation();
    this.selectedIds.has(it.id) ? this.selectedIds.delete(it.id) : this.selectedIds.add(it.id);
  }
  get selectedCount(): number { return this.selectedIds.size; }
  clearSelection(): void { this.selectedIds.clear(); }
  get isAllSelected(): boolean {
    const f = this.filteredItems;
    return f.length > 0 && f.every(it => this.selectedIds.has(it.id));
  }
  toggleSelectAll(): void {
    if (this.isAllSelected) this.filteredItems.forEach(it => this.selectedIds.delete(it.id));
    else this.filteredItems.forEach(it => this.selectedIds.add(it.id));
  }
  invertSelection(): void {
    this.filteredItems.forEach(it => this.selectedIds.has(it.id) ? this.selectedIds.delete(it.id) : this.selectedIds.add(it.id));
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

  // --- Menu contextuel (clic droit) ---
  onItemRightClick(event: MouseEvent, item: any): void {
    event.preventDefault(); event.stopPropagation();
    this.contextMenuPosition = { x: event.clientX, y: event.clientY };
    this.contextMenuItem = item;
    this.showContextMenu = true;
  }
  toggleSelectFromContext(): void { if (this.contextMenuItem) this.toggleSelect(this.contextMenuItem, new Event('click')); this.closeContextMenu(); }
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
  closeContextMenu(): void { this.showContextMenu = false; this.contextMenuItem = null; }

  @HostListener('document:click')
  onDocumentClick(): void { this.closeContextMenu(); }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.showContextMenu) { this.closeContextMenu(); return; }
    if (this.showModal) { this.closeModal(); return; }
    if (this.showDeleteModal) { this.closeDeleteModal(); return; }
    if (this.showRestoreModal) { this.closeRestoreModal(); return; }
  }

  backToList(): void {
    // Navigation relative : remonte de /…/projets/:id vers /…/projets (admin ou dashboard).
    this.router.navigate(['..'], { relativeTo: this.route });
  }
}
