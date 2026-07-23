import { Component, OnDestroy, OnInit } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { PiecesService } from '../../../core/services/pieces.service';
import { PieceTypeDef } from '../../../core/models/piece.model';

/** Champ du CATALOGUE (statique) : nom/libellé figés, description/infobulle éditables. */
interface CatalogFieldRow {
  name: string;
  label: string;
  origin: string;       // 'brut' | 'ecarts' (indicatif)
  description: string;
  tooltip: string;
}
/** Champ PERSONNALISÉ (ajouté par l'admin) : tout est éditable, supprimable. */
interface CustomFieldRow {
  name: string;
  label: string;
  type: string;
  description: string;
  tooltip: string;
}
/** Bloc d'un type de pièce. */
interface TypeBlock {
  code: string;
  nom: string;
  collapsed: boolean;
  catalogFields: CatalogFieldRow[];
  customFields: CustomFieldRow[];
}

/**
 * Écran d'ADMINISTRATION (App Admin) d'édition des descriptions détaillées et infobulles des
 * champs des types de pièces, ET d'AJOUT de champs personnalisés (vraies colonnes) à n'importe
 * quel type. Tous les types de pièces sont listés. Ces métadonnées/colonnes sont communes à
 * tous les opérateurs (affichage app, rapport PDF, import, « Champs par défaut »).
 * Route : /admin/parametres/descriptions-champs (sous AdminGuard).
 */
@Component({
  selector: 'app-piece-field-descriptions',
  templateUrl: './piece-field-descriptions.component.html',
  styleUrls: ['./piece-field-descriptions.component.scss'],
})
export class PieceFieldDescriptionsComponent implements OnInit, OnDestroy {
  types: TypeBlock[] = [];
  loading = false;
  saving = false;
  loadError = false;
  /** Section maître repliable — dépliée par défaut. */
  masterCollapsed = false;

  // --- Enregistrement automatique (anti-rebond, plus de bouton « Enregistrer ») ---
  /** Affiche brièvement « Modifications enregistrées » après un enregistrement auto réussi. */
  savedFlash = false;
  /** Message expliquant pourquoi l'enregistrement auto est en attente (validation cliente). */
  saveBlockedMsg = '';
  private saveTimer: any;
  private flashTimer: any;

  readonly fieldTypes = [
    { value: 'text', label: 'Texte' },
    { value: 'number', label: 'Nombre' },
    { value: 'date', label: 'Date' },
    { value: 'textarea', label: 'Texte long' },
  ];

  constructor(private piecesService: PiecesService, private toastr: ToastrService) {}

  ngOnInit(): void { this.load(); }

  ngOnDestroy(): void { clearTimeout(this.saveTimer); clearTimeout(this.flashTimer); }

  private load(): void {
    this.loading = true; this.loadError = false;
    this.piecesService.getFieldDescriptions().subscribe({
      next: (catalog) => { this.types = this.build(catalog); this.loading = false; },
      error: (e) => {
        this.loading = false; this.loadError = true;
        this.toastr.error(e?.status === 403
          ? "Accès réservé à l'administrateur de l'application."
          : 'Chargement des descriptions impossible', 'Erreur');
      },
    });
  }

  /** Construit les blocs éditables : TOUS les types, avec champs catalogue (statiques,
   * bruts + écarts dédupliqués) et champs personnalisés (custom=true). */
  private build(catalog: PieceTypeDef[]): TypeBlock[] {
    return (catalog || []).map(d => {
      const byName = new Map<string, CatalogFieldRow>();
      const custom: CustomFieldRow[] = [];
      const addCatalog = (c: any, origin: string) => {
        if (byName.has(c.name)) return;
        byName.set(c.name, { name: c.name, label: c.label, origin,
          description: c.description || '', tooltip: c.tooltip || '' });
      };
      (d.champs || []).forEach(c => {
        if ((c as any).custom) {
          custom.push({ name: c.name, label: c.label, type: (c as any).type || 'text',
            description: (c as any).description || '', tooltip: (c as any).tooltip || '' });
        } else {
          addCatalog(c, 'brut');
        }
      });
      (d.ecarts_champs || []).forEach(c => addCatalog(c, 'ecarts'));
      return { code: d.code, nom: d.nom, collapsed: false,
        catalogFields: Array.from(byName.values()), customFields: custom };
    });
  }

  // --- Accordéons ---
  toggleMaster(): void { this.masterCollapsed = !this.masterCollapsed; }
  toggleType(t: TypeBlock): void { t.collapsed = !t.collapsed; }
  expandAll(): void { this.masterCollapsed = false; this.types.forEach(t => t.collapsed = false); }
  collapseAll(): void { this.types.forEach(t => t.collapsed = true); }

  /** Nombre de champs documentés (description OU infobulle non vide) d'un type. */
  documentedCount(t: TypeBlock): number {
    return [...t.catalogFields, ...t.customFields]
      .filter(f => f.description.trim() || f.tooltip.trim()).length;
  }
  fieldCount(t: TypeBlock): number { return t.catalogFields.length + t.customFields.length; }

  // --- Champs personnalisés ---
  addCustomField(t: TypeBlock): void {
    t.customFields.push({ name: '', label: '', type: 'text', description: '', tooltip: '' });
    t.collapsed = false;
    // Le nouveau champ est incomplet : l'enregistrement auto restera en attente jusqu'à
    // ce que son nom/libellé soient renseignés (message d'aide affiché).
    this.queueAutoSave();
  }
  removeCustomField(t: TypeBlock, i: number): void { t.customFields.splice(i, 1); this.queueAutoSave(); }

  /** Programme un enregistrement automatique (anti-rebond) après une modification. */
  queueAutoSave(): void {
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.autoSave(), 800);
  }

  /** Validation cliente légère des champs personnalisés : renvoie un message si l'état n'est
   * pas enregistrable (nom manquant/invalide, libellé manquant, doublon), sinon `null`. */
  private validate(): string | null {
    const nameRe = /^[a-z][a-z0-9_]*$/;
    for (const t of this.types) {
      const seen = new Set<string>();
      for (const cf of t.customFields) {
        const nm = (cf.name || '').trim();
        if (!nm) return `Renseignez le nom technique du champ personnalisé de ${t.code} pour enregistrer.`;
        if (!nameRe.test(nm)) return `Nom de champ « ${nm} » invalide dans ${t.code} `
          + `(minuscules, chiffres, _ ; commence par une lettre).`;
        if (!cf.label.trim()) return `Le libellé du champ « ${nm} » de ${t.code} est requis.`;
        if (seen.has(nm)) return `Nom de champ en double dans ${t.code} : « ${nm} ».`;
        seen.add(nm);
      }
    }
    return null;
  }

  /** Enregistrement automatique : valide puis persiste (descriptions catalogue + champs
   * personnalisés). En cas d'état invalide, reste en attente sans erreur bloquante. */
  private autoSave(): void {
    if (this.loading || this.loadError) return;
    const err = this.validate();
    if (err) { this.saveBlockedMsg = err; return; }
    this.saveBlockedMsg = '';
    // Une sauvegarde est déjà en cours : on reprogramme pour envoyer l'état le plus récent.
    if (this.saving) { this.queueAutoSave(); return; }
    this.persist();
  }

  /** Construit la charge utile à envoyer (par type : descriptions catalogue + champs custom). */
  private buildPayload(): Record<string, any> {
    const payload: Record<string, any> = {};
    for (const t of this.types) {
      const fields: Record<string, { description: string; tooltip: string }> = {};
      for (const f of t.catalogFields) {
        fields[f.name] = { description: f.description.trim(), tooltip: f.tooltip.trim() };
      }
      const custom = t.customFields.map(cf => ({
        name: cf.name.trim(), label: cf.label.trim(), type: cf.type,
        description: cf.description.trim(), tooltip: cf.tooltip.trim(),
      }));
      payload[t.code] = { fields, custom };
    }
    return payload;
  }

  /** Persiste l'état courant (sans reconstruire `types` pour ne pas perturber la saisie). */
  private persist(): void {
    this.saving = true;
    this.piecesService.saveFieldDescriptions(this.buildPayload()).subscribe({
      next: () => {
        this.saving = false;
        this.savedFlash = true;
        clearTimeout(this.flashTimer);
        this.flashTimer = setTimeout(() => { this.savedFlash = false; }, 2500);
      },
      error: (e) => {
        this.saving = false;
        this.toastr.error(e?.error?.detail || 'Enregistrement automatique impossible', 'Erreur');
      },
    });
  }
}
