import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { forkJoin, Subscription } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { PiecesService, SortablePiece } from '../../../../core/services/pieces.service';
import { PieceSortConfigService, PieceSortConfig, sortVersions } from '../../../../core/services/piece-sort-config.service';

/** Un niveau de tri (champ + sens). */
interface SortLevel { field: string; dir: 'asc' | 'desc'; }
/** Version de tableau configurable : brute des données ou écarts / détermination définitive. */
type SortVersion = 'brut' | 'ecarts';
/** Ligne de configuration du tri par défaut d'un type de pièce tabulaire (multi-niveaux).
 * Les types RDL/RDN/RDIA exposent deux versions (`hasEcarts`) : brute + écarts. */
interface SortTypeRow {
  code: string;
  nom: string;
  champs: { name: string; label: string }[];
  levels: SortLevel[];
  hasEcarts: boolean;
  ecartsChamps: { name: string; label: string }[];
  ecartsLevels: SortLevel[];
}
/** Pièces candidates regroupées par SSDGPS (pour la section « appliquer aux tableaux »). */
interface SortableGroup {
  ssdgpsId: string;
  ssdgpsLabel: string;
  pieces: SortablePiece[];
}

/**
 * Configuration, par l'opérateur connecté, du champ de tri par défaut de chaque type de pièce
 * tabulaire. Ce tri s'applique à l'affichage des tableaux ET au rapport PDF (tri + renumérotation
 * de la colonne ID). Utilisé en page dédiée (`/admin/profile/tri-pieces`, `embedded=false`) et
 * intégré dans « Mon Profil » (`embedded=true`).
 */
@Component({
  selector: 'app-piece-sort-settings',
  templateUrl: './piece-sort-settings.component.html',
  styleUrls: ['./piece-sort-settings.component.scss'],
})
export class PieceSortSettingsComponent implements OnInit, OnDestroy {
  /** true = intégré dans une autre page (pas d'en-tête de page). */
  @Input() embedded = false;

  sortTypes: SortTypeRow[] = [];
  /** Accordéons des deux sections de la page (repliés par défaut). */
  sortSectionCollapsed = true;
  applySectionCollapsed = true;
  savingSort = false;
  loading = false;
  /** Affiche brièvement « Modifications enregistrées » après un enregistrement auto réussi. */
  savedFlash = false;
  private saveTimer: any;

  // --- Réinitialisation avec la configuration SOURCE (compte administrateur) ---
  resettingSource = false;
  showResetConfirm = false;
  /** État replié par type de pièce (accordéon), indexé par code. */
  collapsed: Record<string, boolean> = {};

  // --- Application du tri aux tableaux STOCKÉS des pièces existantes ---
  /** Pièces candidates (types configurés + données), groupées par SSDGPS. */
  sortableGroups: SortableGroup[] = [];
  loadingSortable = false;
  applying = false;
  /** Ids des pièces cochées pour l'application ciblée. */
  selectedIds = new Set<string>();
  /** État replié par groupe SSDGPS (accordéon de la section application). */
  groupCollapsed: Record<string, boolean> = {};
  /** Modale de confirmation avant écrasement de l'ordre stocké. `applyScope` : 'all'
   * (toutes les pièces) ou 'selected' (les pièces cochées). */
  confirmOpen = false;
  applyScope: 'all' | 'selected' = 'selected';

  private subscriptions = new Subscription();

  constructor(
    private piecesService: PiecesService,
    private sortConfigService: PieceSortConfigService,
    private toastr: ToastrService,
  ) {}

  ngOnInit(): void { this.loadSortConfig(); this.loadSortable(); }

  ngOnDestroy(): void { clearTimeout(this.saveTimer); this.subscriptions.unsubscribe(); }

  /** Charge le catalogue (types tabulaires) + la config de tri de l'opérateur. */
  private loadSortConfig(): void {
    this.loading = true;
    this.subscriptions.add(
      forkJoin({
        catalog: this.piecesService.getCatalog(),
        config: this.sortConfigService.get(),
      }).subscribe({
        next: ({ catalog, config }) => {
          const cfg = config as PieceSortConfig;
          // TOUS les types de pièce sont listés. Les types dotés d'un tableau de données
          // (avec champs, y compris PPA/PPN dont le tri ordonne les points/photos du rapport PDF)
          // sont configurables ; les types sans colonne triable (ex. page de garde) apparaissent
          // avec une note « sans colonne triable » (voir isSortable / gabarit).
          this.sortTypes = (catalog || [])
            .map(d => {
              const v = sortVersions(cfg[d.code]);
              const hasEcarts = !!d.ecarts && (d.ecarts_champs?.length || 0) > 0;
              return {
                code: d.code, nom: d.nom,
                champs: (d.champs || []).map(c => ({ name: c.name, label: c.label })),
                levels: v.brut.map(l => ({ field: l.field, dir: l.dir } as SortLevel)),
                hasEcarts,
                ecartsChamps: (d.ecarts_champs || []).map(c => ({ name: c.name, label: c.label })),
                ecartsLevels: v.ecarts.map(l => ({ field: l.field, dir: l.dir } as SortLevel)),
              } as SortTypeRow;
            });
          // Accordéons repliés par défaut : liste compacte et défilable ; le résumé du tri
          // reste visible dans l'en-tête de chaque type.
          this.sortTypes.forEach(t => { this.collapsed[t.code] = true; });
          this.loading = false;
        },
        error: () => { this.loading = false; /* silencieux : la section reste vide */ },
      })
    );
  }

  // --- Accordéon (repli / dépli par type) ---
  toggleType(code: string): void { this.collapsed[code] = !this.collapsed[code]; }
  isCollapsed(code: string): boolean { return !!this.collapsed[code]; }

  /** Vrai si le type possède au moins une colonne triable (tableau brut et/ou écarts). Les
   * types sans colonne (ex. page de garde) restent listés mais non configurables. */
  isSortable(t: SortTypeRow): boolean { return t.champs.length > 0 || t.hasEcarts; }

  // --- Réinitialisation avec la configuration SOURCE (compte administrateur) ---
  askResetSource(): void { if (!this.resettingSource) this.showResetConfirm = true; }
  cancelResetSource(): void { this.showResetConfirm = false; }

  /** Remplace la config de tri de l'opérateur par la configuration source (compte admin),
   * puis recharge la section pour refléter le nouveau tri. */
  confirmResetSource(): void {
    if (this.resettingSource) return;
    this.resettingSource = true;
    this.subscriptions.add(
      this.sortConfigService.resetToSource().subscribe({
        next: () => {
          this.resettingSource = false;
          this.showResetConfirm = false;
          this.loadSortConfig();  // reconstruit les types depuis la config (cache mis à jour)
          this.loadSortable();    // la liste des pièces applicables dépend des types configurés
          this.toastr.success('Tri réinitialisé avec la configuration source', 'Succès');
        },
        error: (e) => {
          this.resettingSource = false;
          this.showResetConfirm = false;
          this.toastr.error(e?.error?.detail || 'Réinitialisation impossible', 'Erreur');
        },
      })
    );
  }

  // --- Accès aux niveaux / champs d'une version (brute ou écarts) ---
  levelsOf(t: SortTypeRow, v: SortVersion): SortLevel[] { return v === 'ecarts' ? t.ecartsLevels : t.levels; }
  champsOf(t: SortTypeRow, v: SortVersion): { name: string; label: string }[] {
    return v === 'ecarts' ? t.ecartsChamps : t.champs;
  }
  private setLevels(t: SortTypeRow, v: SortVersion, list: SortLevel[]): void {
    if (v === 'ecarts') t.ecartsLevels = list; else t.levels = list;
  }

  /** Vrai si au moins un niveau de tri valide (champ choisi) est configuré pour la version. */
  hasSort(t: SortTypeRow, v: SortVersion = 'brut'): boolean { return this.levelsOf(t, v).some(l => !!l.field); }
  /** Résumé court du tri d'une version (affiché dans l'en-tête / le titre de version). */
  levelsSummary(t: SortTypeRow, v: SortVersion = 'brut'): string {
    const champs = this.champsOf(t, v);
    const valid = this.levelsOf(t, v).filter(l => l.field);
    if (!valid.length) return "Aucun tri (ordre d'import)";
    return valid.map(l => {
      const label = champs.find(c => c.name === l.field)?.label || l.field;
      return `${label} ${l.dir === 'desc' ? '↓' : '↑'}`;
    }).join('  ·  ');
  }

  // --- Gestion des niveaux de tri d'une version (enregistrement auto après chaque modification) ---
  addLevel(t: SortTypeRow, v: SortVersion = 'brut'): void {
    this.setLevels(t, v, [...this.levelsOf(t, v), { field: '', dir: 'asc' }]);
  }
  removeLevel(t: SortTypeRow, i: number, v: SortVersion = 'brut'): void {
    this.setLevels(t, v, this.levelsOf(t, v).filter((_, k) => k !== i)); this.queueAutoSave();
  }
  moveLevelUp(t: SortTypeRow, i: number, v: SortVersion = 'brut'): void {
    if (i <= 0) return;
    const l = [...this.levelsOf(t, v)]; [l[i - 1], l[i]] = [l[i], l[i - 1]]; this.setLevels(t, v, l); this.queueAutoSave();
  }
  moveLevelDown(t: SortTypeRow, i: number, v: SortVersion = 'brut'): void {
    const cur = this.levelsOf(t, v);
    if (i >= cur.length - 1) return;
    const l = [...cur]; [l[i + 1], l[i]] = [l[i], l[i + 1]]; this.setLevels(t, v, l); this.queueAutoSave();
  }
  /** Champs sélectionnables pour un niveau : tous sauf ceux déjà choisis dans les AUTRES niveaux
   * de la même version. */
  fieldsFor(t: SortTypeRow, level: SortLevel, v: SortVersion = 'brut'): { name: string; label: string }[] {
    const used = new Set(this.levelsOf(t, v).filter(l => l !== level && l.field).map(l => l.field));
    return this.champsOf(t, v).filter(c => !used.has(c.name));
  }

  /** Programme un enregistrement automatique (anti-rebond) après une modification. */
  queueAutoSave(): void {
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.saveSortConfig(), 500);
  }

  /** Enregistre la config (par type : niveaux valides ordonnés ; sans niveau = pas de tri).
   * Déclenché automatiquement à chaque modification (plus de bouton). */
  /** Déduplique/nettoie une liste de niveaux : champs renseignés, chacun une seule fois. */
  private cleanLevels(levels: SortLevel[]): SortLevel[] {
    const seen = new Set<string>();
    return levels
      .filter(l => l.field && !seen.has(l.field) && (seen.add(l.field) || true))
      .map(l => ({ field: l.field, dir: l.dir }));
  }

  saveSortConfig(): void {
    this.savingSort = true;
    const config: PieceSortConfig = {};
    this.sortTypes.forEach(t => {
      const brut = this.cleanLevels(t.levels);
      const ecarts = t.hasEcarts ? this.cleanLevels(t.ecartsLevels) : [];
      if (ecarts.length) config[t.code] = { brut, ecarts };
      else if (brut.length) config[t.code] = brut;
    });
    this.subscriptions.add(
      this.sortConfigService.save(config).subscribe({
        next: () => {
          this.savingSort = false; this.savedFlash = true;
          setTimeout(() => { this.savedFlash = false; }, 2500);
          // La liste des pièces applicables dépend des types configurés : on la rafraîchit.
          this.loadSortable();
        },
        error: () => { this.savingSort = false; this.toastr.error('Enregistrement du tri impossible', 'Erreur'); },
      })
    );
  }

  // ============================================================
  // Application du tri configuré aux tableaux STOCKÉS des pièces
  // ============================================================
  /** Charge les pièces candidates (types configurés + données) dans la portée de
   * l'utilisateur, regroupées par SSDGPS. Purge la sélection des ids disparus. */
  loadSortable(): void {
    this.loadingSortable = true;
    this.subscriptions.add(
      this.piecesService.listSortable().subscribe({
        next: ({ items }) => {
          const groups = new Map<string, SortableGroup>();
          (items || []).forEach(p => {
            let g = groups.get(p.ssdgps_id);
            if (!g) { g = { ssdgpsId: p.ssdgps_id, ssdgpsLabel: p.ssdgps_label, pieces: [] }; groups.set(p.ssdgps_id, g); }
            g.pieces.push(p);
          });
          this.sortableGroups = Array.from(groups.values());
          // Conserve uniquement les sélections encore présentes.
          const present = new Set((items || []).map(p => p.id));
          Array.from(this.selectedIds).forEach(id => { if (!present.has(id)) this.selectedIds.delete(id); });
          this.loadingSortable = false;
        },
        error: () => { this.loadingSortable = false; this.sortableGroups = []; },
      })
    );
  }

  /** Nombre total de pièces candidates (tous groupes confondus). */
  get sortableCount(): number { return this.sortableGroups.reduce((n, g) => n + g.pieces.length, 0); }

  // --- Accordéon des groupes SSDGPS ---
  toggleGroup(id: string): void { this.groupCollapsed[id] = !this.groupCollapsed[id]; }
  isGroupCollapsed(id: string): boolean { return !!this.groupCollapsed[id]; }

  // --- Sélection des pièces ---
  isPieceSelected(id: string): boolean { return this.selectedIds.has(id); }
  togglePiece(id: string): void {
    this.selectedIds.has(id) ? this.selectedIds.delete(id) : this.selectedIds.add(id);
  }
  /** Libellé court d'une pièce (type + n° pour les répétables). */
  pieceLabel(p: SortablePiece): string {
    const num = p.numero != null ? ` n°${p.numero}` : '';
    const sess = p.session_numero != null ? ` — session n°${p.session_numero}` : '';
    return `${p.type_nom} (${p.type_piece})${num}${sess}`;
  }
  /** Toutes les pièces d'un groupe sont-elles cochées ? */
  isGroupSelected(g: SortableGroup): boolean {
    return g.pieces.length > 0 && g.pieces.every(p => this.selectedIds.has(p.id));
  }
  toggleGroupSelection(g: SortableGroup): void {
    const all = this.isGroupSelected(g);
    g.pieces.forEach(p => all ? this.selectedIds.delete(p.id) : this.selectedIds.add(p.id));
  }
  get allSelected(): boolean {
    return this.sortableCount > 0 && this.sortableGroups.every(g => this.isGroupSelected(g));
  }
  toggleSelectAll(): void {
    if (this.allSelected) { this.selectedIds.clear(); return; }
    this.sortableGroups.forEach(g => g.pieces.forEach(p => this.selectedIds.add(p.id)));
  }

  // --- Confirmation puis application ---
  askApply(scope: 'all' | 'selected'): void {
    if (this.applying) return;
    if (scope === 'selected' && this.selectedIds.size === 0) {
      this.toastr.info('Sélectionnez au moins une pièce.', 'Aucune pièce sélectionnée');
      return;
    }
    this.applyScope = scope;
    this.confirmOpen = true;
  }
  cancelApply(): void { this.confirmOpen = false; }
  /** Nombre de pièces impactées par l'action confirmée (résumé de la modale). */
  get applyCount(): number { return this.applyScope === 'all' ? this.sortableCount : this.selectedIds.size; }

  confirmApply(): void {
    if (this.applying) return;
    this.applying = true;
    const ids = this.applyScope === 'all' ? undefined : Array.from(this.selectedIds);
    this.subscriptions.add(
      this.piecesService.applySortConfig(ids).subscribe({
        next: (res) => {
          this.applying = false;
          this.confirmOpen = false;
          if (this.applyScope === 'selected') this.selectedIds.clear();
          this.toastr.success(
            `${res.updated} tableau(x) réordonné(s)` + (res.skipped ? `, ${res.skipped} inchangé(s)` : ''),
            'Tri appliqué');
        },
        error: (e) => {
          this.applying = false;
          this.confirmOpen = false;
          this.toastr.error(e?.error?.detail || 'Application du tri impossible', 'Erreur');
        },
      })
    );
  }
}
