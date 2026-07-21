import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { forkJoin, Subscription } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { PiecesService } from '../../../../core/services/pieces.service';
import { AuthService } from '../../../../core/auth/auth.service';
import {
  PieceFieldsConfig, PieceFieldsConfigService, PieceFieldsVersion, PieceFieldsView,
} from '../../../../core/services/piece-fields-config.service';

/** Un champ (colonne) configurable d'une vue/version : libellé + visibilité, dans l'ordre.
 * `required` = champ verrouillé (toujours importé, non désactivable dans la vue « Import »). */
interface FieldItem { name: string; label: string; description?: string; tooltip?: string; visible: boolean; required?: boolean; }
/** État d'une vue (import / app / pdf), une liste ordonnée par version. La vue `import` n'a
 * que la version brute (les écarts sont calculés, jamais importés). */
interface ViewState { brut: FieldItem[]; ecarts: FieldItem[]; }
/** Champ source (catalogue) d'un type, avec l'indicateur `required`. */
interface ChampSrc { name: string; label: string; description?: string; tooltip?: string; required?: boolean; }
/** Ligne de configuration des colonnes d'un type de pièce tabulaire. */
interface FieldsTypeRow {
  code: string;
  nom: string;
  hasEcarts: boolean;
  champsBrut: ChampSrc[];
  champsEcarts: ChampSrc[];
  import: ViewState;
  app: ViewState;
  pdf: ViewState;
}

/**
 * Configuration, par l'opérateur connecté, des COLONNES (champs) à afficher pour chaque type
 * de pièce, dans DEUX vues : « Affichage app » (tableaux lus dans l'app) et « Rapport PDF ».
 * Pour chaque vue, l'opérateur coche/décoche les champs et les réordonne. La sélection est
 * appliquée à l'affichage (lecture seule) et au rapport PDF. Page dédiée
 * (`/…/profile/parametres/champs-pieces`) ; réutilisable en `embedded`. Calqué sur
 * PieceSortSettingsComponent.
 */
@Component({
  selector: 'app-piece-fields-settings',
  templateUrl: './piece-fields-settings.component.html',
  styleUrls: ['./piece-fields-settings.component.scss'],
})
export class PieceFieldsSettingsComponent implements OnInit, OnDestroy {
  /** true = intégré dans une autre page (pas d'en-tête de page). */
  @Input() embedded = false;

  types: FieldsTypeRow[] = [];
  loading = false;
  saving = false;
  savedFlash = false;
  /** État replié par type (accordéon), indexé par code. */
  collapsed: Record<string, boolean> = {};

  // --- Réinitialisation avec la configuration SOURCE (compte administrateur) ---
  resettingSource = false;
  showResetConfirm = false;

  /** Vues configurables (ordre d'affichage des panneaux). `import` en tête = filtre-maître. */
  readonly views: PieceFieldsView[] = ['import', 'app', 'pdf'];
  /** Libellés des vues (en-têtes de section). */
  readonly viewLabels: Record<PieceFieldsView, string> = {
    import: 'Import des données', app: 'Affichage dans l\'app', pdf: 'Rapport PDF',
  };
  readonly viewIcons: Record<PieceFieldsView, string> = {
    import: 'fas fa-file-import', app: 'fas fa-table-cells', pdf: 'fas fa-file-pdf',
  };

  /** Vrai pour un super-admin / App Admin : peut définir les champs OBLIGATOIRES (réglage
   * commun du catalogue) dans la vue « Import des données ». Sinon, les requis sont en lecture
   * seule (verrouillés). La vraie barrière est côté backend. */
  isAdmin = false;

  private saveTimer: any;
  private reqSaveTimer: any;
  private subscriptions = new Subscription();

  constructor(
    private piecesService: PiecesService,
    private fieldsConfigService: PieceFieldsConfigService,
    private toastr: ToastrService,
    private auth: AuthService,
  ) {}

  ngOnInit(): void { this.isAdmin = this.auth.isPlatformAdmin(); this.load(); }
  ngOnDestroy(): void { clearTimeout(this.saveTimer); clearTimeout(this.reqSaveTimer); this.subscriptions.unsubscribe(); }

  /** Charge le catalogue (types tabulaires) + la config de colonnes de l'opérateur. */
  private load(): void {
    this.loading = true;
    this.subscriptions.add(
      forkJoin({
        catalog: this.piecesService.getCatalog(),
        config: this.fieldsConfigService.get(),
      }).subscribe({
        next: ({ catalog, config }) => {
          const cfg = config as PieceFieldsConfig;
          this.types = (catalog || [])
            .filter(d => (d.champs?.length || 0) > 0)
            .map(d => {
              const hasEcarts = !!d.ecarts && (d.ecarts_champs?.length || 0) > 0;
              const champsBrut = (d.champs || []).map(c => ({ name: c.name, label: c.label, description: c.description, tooltip: c.tooltip, required: !!c.required }));
              const champsEcarts = (d.ecarts_champs || []).map(c => ({ name: c.name, label: c.label, description: c.description, tooltip: c.tooltip, required: !!c.required }));
              const typeCfg = cfg[d.code] || {};
              // Vue « import » (brut uniquement) : les champs requis restent toujours visibles.
              const importBrut = this.buildItems(champsBrut, typeCfg.import?.brut);
              importBrut.forEach(it => { if (it.required) it.visible = true; });
              const row: FieldsTypeRow = {
                code: d.code, nom: d.nom, hasEcarts, champsBrut, champsEcarts,
                import: { brut: importBrut, ecarts: [] },
                app: {
                  brut: this.buildItems(champsBrut, typeCfg.app?.brut),
                  ecarts: this.buildItems(champsEcarts, typeCfg.app?.ecarts),
                },
                pdf: {
                  brut: this.buildItems(champsBrut, typeCfg.pdf?.brut),
                  ecarts: this.buildItems(champsEcarts, typeCfg.pdf?.ecarts),
                },
              };
              // Cascade initiale : un champ non importé ne peut rester visible en app/pdf.
              this.applyCascade(row);
              return row;
            });
          this.types.forEach(t => { this.collapsed[t.code] = true; });
          this.loading = false;
        },
        error: () => { this.loading = false; },
      })
    );
  }

  /**
   * Construit la liste ordonnée d'items d'une vue/version à partir des champs du catalogue et
   * des noms visibles configurés. `undefined` (absent) = tous visibles (ordre catalogue) ;
   * liste VIDE `[]` = tous masqués (colonnes désactivées). Sinon : d'abord les champs visibles
   * dans l'ordre configuré, puis les champs restants (masqués) en fin.
   */
  private buildItems(
    champs: { name: string; label: string; description?: string; tooltip?: string }[],
    visibleNames?: string[]): FieldItem[] {
    if (visibleNames === undefined) {
      return champs.map(c => ({ ...c, visible: true }));
    }
    const byName = new Map(champs.map(c => [c.name, c]));
    const items: FieldItem[] = [];
    const used = new Set<string>();
    for (const n of visibleNames) {
      const c = byName.get(n);
      if (c && !used.has(n)) { items.push({ ...c, visible: true }); used.add(n); }
    }
    for (const c of champs) {
      if (!used.has(c.name)) items.push({ ...c, visible: false });
    }
    return items;
  }

  // --- Accordéon ---
  toggleType(code: string): void { this.collapsed[code] = !this.collapsed[code]; }
  isCollapsed(code: string): boolean { return !!this.collapsed[code]; }

  // --- Réinitialisation avec la configuration SOURCE (compte administrateur) ---
  askResetSource(): void { if (!this.resettingSource) this.showResetConfirm = true; }
  cancelResetSource(): void { this.showResetConfirm = false; }

  /** Remplace la config de colonnes de l'opérateur par la configuration source (compte admin),
   * puis recharge la section pour refléter les nouvelles colonnes. */
  confirmResetSource(): void {
    if (this.resettingSource) return;
    this.resettingSource = true;
    this.subscriptions.add(
      this.fieldsConfigService.resetToSource().subscribe({
        next: () => {
          this.resettingSource = false;
          this.showResetConfirm = false;
          this.load();  // reconstruit les types depuis la config (cache mis à jour)
          this.toastr.success('Champs réinitialisés avec la configuration source', 'Succès');
        },
        error: (e) => {
          this.resettingSource = false;
          this.showResetConfirm = false;
          this.toastr.error(e?.error?.detail || 'Réinitialisation impossible', 'Erreur');
        },
      })
    );
  }

  // --- Accès aux items d'une vue/version ---
  itemsOf(t: FieldsTypeRow, view: PieceFieldsView, v: PieceFieldsVersion): FieldItem[] {
    return t[view][v];
  }
  /** Nombre de colonnes visibles / total (résumé). */
  visibleCount(t: FieldsTypeRow, view: PieceFieldsView, v: PieceFieldsVersion): number {
    return this.itemsOf(t, view, v).filter(i => i.visible).length;
  }
  summary(t: FieldsTypeRow, view: PieceFieldsView, v: PieceFieldsVersion): string {
    const items = this.itemsOf(t, view, v);
    return `${items.filter(i => i.visible).length} / ${items.length} colonnes`;
  }

  // --- Cascade « import » → app/pdf (un champ non importé ne peut être affiché/imprimé) ---
  /** Noms des champs bruts activés à l'import (filtre-maître) pour un type. */
  private importEnabledSet(t: FieldsTypeRow): Set<string> {
    return new Set(t.import.brut.filter(i => i.visible).map(i => i.name));
  }
  /** Retire des vues app/pdf (brut) tout champ désactivé à l'import. */
  private applyCascade(t: FieldsTypeRow): void {
    const enabled = this.importEnabledSet(t);
    for (const dv of ['app', 'pdf'] as PieceFieldsView[]) {
      t[dv].brut.forEach(f => { if (!enabled.has(f.name)) f.visible = false; });
    }
  }
  /** Champ verrouillé pour une vue/version : requis en vue import (coché forcé) ou non importé
   * en app/pdf (décoché forcé). Les écarts ne sont pas contraints (jamais importés). */
  isLocked(t: FieldsTypeRow, view: PieceFieldsView, v: PieceFieldsVersion, item: FieldItem): boolean {
    if (view === 'import') return v === 'brut' && !!item.required;
    if (v === 'ecarts') return false;
    return !this.importEnabledSet(t).has(item.name);
  }
  /** État affiché de la case (tient compte des verrous). */
  isChecked(t: FieldsTypeRow, view: PieceFieldsView, v: PieceFieldsVersion, item: FieldItem): boolean {
    if (view === 'import' && v === 'brut' && item.required) return true;
    if (view !== 'import' && v === 'brut' && !this.importEnabledSet(t).has(item.name)) return false;
    return item.visible;
  }
  /** Motif du verrou (infobulle). */
  lockHint(t: FieldsTypeRow, view: PieceFieldsView, v: PieceFieldsVersion, item: FieldItem): string {
    if (view === 'import') return item.required ? 'Champ obligatoire : toujours importé' : '';
    if (this.isLocked(t, view, v, item)) return 'Champ non importé : activez-le d\'abord dans « Import des données »';
    return '';
  }

  // --- Modifications (enregistrement auto anti-rebond) ---
  toggleVisible(t: FieldsTypeRow, view: PieceFieldsView, v: PieceFieldsVersion, item: FieldItem): void {
    if (this.isLocked(t, view, v, item)) return;
    item.visible = !item.visible;
    // Désactivation à l'import → cascade sur app/pdf (le champ y devient inaccessible).
    if (view === 'import' && v === 'brut' && !item.visible) this.applyCascade(t);
    this.queueAutoSave();
  }

  // --- Champs OBLIGATOIRES (réglage COMMUN, App Admin uniquement) ---
  /** (Dé)marque un champ comme obligatoire dans la vue « Import des données ». Un champ requis
   * est forcément importé (visible). Réglage commun persisté via l'endpoint dédié. */
  toggleRequired(t: FieldsTypeRow, item: FieldItem): void {
    if (!this.isAdmin) return;
    item.required = !item.required;
    if (item.required) item.visible = true;                 // un champ requis est toujours importé
    const src = t.champsBrut.find(c => c.name === item.name);
    if (src) src.required = item.required;                   // cohérence de la source (isDefault…)
    this.queueSaveRequired(t);
  }
  private queueSaveRequired(t: FieldsTypeRow): void {
    clearTimeout(this.reqSaveTimer);
    this.reqSaveTimer = setTimeout(() => this.saveRequired(t), 500);
  }
  /** Persiste l'ensemble EXACT des champs obligatoires (bruts) du type. */
  private saveRequired(t: FieldsTypeRow): void {
    const names = t.import.brut.filter(i => i.required).map(i => i.name);
    this.subscriptions.add(
      this.piecesService.saveRequiredFields({ [t.code]: names }).subscribe({
        next: () => { this.savedFlash = true; setTimeout(() => { this.savedFlash = false; }, 2500); },
        error: (e) => this.toastr.error(e?.error?.detail || 'Enregistrement des champs obligatoires impossible', 'Erreur'),
      })
    );
  }

  moveUp(t: FieldsTypeRow, view: PieceFieldsView, v: PieceFieldsVersion, i: number): void {
    if (i <= 0) return;
    const list = this.itemsOf(t, view, v);
    [list[i - 1], list[i]] = [list[i], list[i - 1]];
    this.queueAutoSave();
  }
  moveDown(t: FieldsTypeRow, view: PieceFieldsView, v: PieceFieldsVersion, i: number): void {
    const list = this.itemsOf(t, view, v);
    if (i >= list.length - 1) return;
    [list[i + 1], list[i]] = [list[i], list[i + 1]];
    this.queueAutoSave();
  }
  /** Déplace un champ tout en haut de la liste (vue/version). */
  moveToStart(t: FieldsTypeRow, view: PieceFieldsView, v: PieceFieldsVersion, i: number): void {
    if (i <= 0) return;
    const list = this.itemsOf(t, view, v);
    const [item] = list.splice(i, 1);
    list.unshift(item);
    this.queueAutoSave();
  }
  /** Déplace un champ tout en bas de la liste (vue/version). */
  moveToEnd(t: FieldsTypeRow, view: PieceFieldsView, v: PieceFieldsVersion, i: number): void {
    const list = this.itemsOf(t, view, v);
    if (i >= list.length - 1) return;
    const [item] = list.splice(i, 1);
    list.push(item);
    this.queueAutoSave();
  }

  // --- Outils de sélection groupée (vue/version) ---
  /** Coche toutes les colonnes activables de la vue/version (ignore les champs verrouillés). */
  selectAll(t: FieldsTypeRow, view: PieceFieldsView, v: PieceFieldsVersion): void {
    this.itemsOf(t, view, v).forEach(it => { if (!this.isLocked(t, view, v, it)) it.visible = true; });
    this.queueAutoSave();
  }
  /** Décoche toutes les colonnes de la vue/version (les champs requis restent cochés à l'import). */
  deselectAll(t: FieldsTypeRow, view: PieceFieldsView, v: PieceFieldsVersion): void {
    this.itemsOf(t, view, v).forEach(it => { if (!this.isLocked(t, view, v, it)) it.visible = false; });
    if (view === 'import' && v === 'brut') this.applyCascade(t);
    this.queueAutoSave();
  }
  /** Inverse la visibilité de chaque colonne activable de la vue/version. */
  invertSelection(t: FieldsTypeRow, view: PieceFieldsView, v: PieceFieldsVersion): void {
    this.itemsOf(t, view, v).forEach(it => { if (!this.isLocked(t, view, v, it)) it.visible = !it.visible; });
    if (view === 'import' && v === 'brut') this.applyCascade(t);
    this.queueAutoSave();
  }

  /** Réinitialise une vue/version : tous les champs visibles, ordre du catalogue. */
  resetView(t: FieldsTypeRow, view: PieceFieldsView, v: PieceFieldsVersion): void {
    const champs = v === 'ecarts' ? t.champsEcarts : t.champsBrut;
    t[view][v] = champs.map(c => ({ ...c, visible: true }));
    this.queueAutoSave();
  }
  /** Vrai si la vue/version est à l'état par défaut (tout visible, ordre catalogue). */
  isDefault(t: FieldsTypeRow, view: PieceFieldsView, v: PieceFieldsVersion): boolean {
    const champs = v === 'ecarts' ? t.champsEcarts : t.champsBrut;
    const items = this.itemsOf(t, view, v);
    if (items.length !== champs.length) return true;
    return items.every((it, idx) => it.visible && it.name === champs[idx].name);
  }

  queueAutoSave(): void {
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.save(), 500);
  }

  /** Liste ordonnée des noms visibles d'une vue/version :
   * - `undefined` si état par défaut (tout visible + ordre catalogue) → omis (= toutes colonnes) ;
   * - liste VIDE `[]` si toutes les colonnes sont désactivées → persistée (= aucune colonne) ;
   * - sinon la liste ordonnée des noms visibles. */
  private serializeView(t: FieldsTypeRow, view: PieceFieldsView, v: PieceFieldsVersion): string[] | undefined {
    if (this.isDefault(t, view, v)) return undefined;
    return this.itemsOf(t, view, v).filter(i => i.visible).map(i => i.name);
  }

  save(): void {
    this.saving = true;
    const config: PieceFieldsConfig = {};
    for (const t of this.types) {
      const entry: PieceFieldsConfig[string] = {};
      for (const view of this.views) {
        const viewOut: { brut?: string[]; ecarts?: string[] } = {};
        const brut = this.serializeView(t, view, 'brut');
        if (brut !== undefined) viewOut.brut = brut;
        // La vue « import » n'a pas de version « écarts » (colonnes calculées, jamais importées).
        if (view !== 'import' && t.hasEcarts) {
          const ecarts = this.serializeView(t, view, 'ecarts');
          if (ecarts !== undefined) viewOut.ecarts = ecarts;
        }
        if (Object.keys(viewOut).length) entry[view] = viewOut;
      }
      if (Object.keys(entry).length) config[t.code] = entry;
    }
    this.subscriptions.add(
      this.fieldsConfigService.save(config).subscribe({
        next: () => {
          this.saving = false; this.savedFlash = true;
          setTimeout(() => { this.savedFlash = false; }, 2500);
        },
        error: () => { this.saving = false; this.toastr.error('Enregistrement des colonnes impossible', 'Erreur'); },
      })
    );
  }
}
