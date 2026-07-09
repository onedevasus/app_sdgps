import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormArray, FormBuilder, FormGroup } from '@angular/forms';
import { PiecesService } from '../../../core/services/pieces.service';
import { ToastService } from '../../../core/services/toast.service';
import { Piece, PieceImportPreview, PieceTypeDef } from '../../../core/models/piece.model';
import { Ssdgps, Session } from '../../../core/models/project.model';

const STATUT_OPTIONS: { value: Piece['statut']; label: string }[] = [
  { value: 'brouillon', label: 'Brouillon' },
  { value: 'valide', label: 'Validée' },
  { value: 'rejete', label: 'Rejetée' },
];

/**
 * Modale de consultation/modification d'une pièce existante : statut, commentaire,
 * portée (niveau SSDGPS commun / session spécifique) et données propres à la source
 * de saisie (image, import CSV/Excel, saisie manuelle). Le type et la source de la
 * pièce ne sont pas modifiables — changer de type revient à créer une autre pièce.
 */
@Component({
  selector: 'app-piece-detail-modal',
  templateUrl: './piece-detail-modal.component.html',
  styleUrls: ['./piece-detail-modal.component.scss'],
})
export class PieceDetailModalComponent implements OnInit {
  @Input() piece!: Piece;
  @Input() ssdgps!: Ssdgps;
  @Input() sessions: Session[] = [];
  @Input() catalog: PieceTypeDef[] = [];
  /** Mode d'ouverture imposé par le parent : chaque action (Voir / Modifier) a sa
   * propre modale à usage unique, sans bascule interne view↔edit. */
  @Input() initialMode: 'view' | 'edit' = 'view';
  /** Rendu inline (page dédiée) plutôt qu'en modale superposée. */
  @Input() embedded = false;
  @Output() saved = new EventEmitter<Piece>();
  @Output() closed = new EventEmitter<void>();
  /** Demande de bascule vers l'édition (page dédiée) depuis la modale de consultation. */
  @Output() editRequested = new EventEmitter<void>();

  readonly statutOptions = STATUT_OPTIONS;

  /** Vue = lecture seule ; Édition = formulaires modifiables. Fixé à l'ouverture. */
  mode: 'view' | 'edit' = 'view';

  statutLabel(v: string): string { return this.statutOptions.find(o => o.value === v)?.label || v; }
  statutBadgeClass(v: string): string {
    return { brouillon: 'badge-warning', valide: 'badge-success', rejete: 'badge-secondary' }[v] || 'badge-secondary';
  }
  get isImageFile(): boolean {
    return !!this.piece.fichier_url && /\.(png|jpe?g|gif|webp|bmp)$/i.test(this.piece.fichier_url);
  }

  metaForm!: FormGroup;
  savingMeta = false;

  changingScope = false;

  manualForm: FormGroup | null = null;
  savingManual = false;

  replacingFile = false;

  reimportOpen = false;
  reimportFile: File | null = null;
  reimportPreview: PieceImportPreview | null = null;
  reimportMapping: Record<string, string> = {};
  reimporting = false;

  constructor(
    private piecesService: PiecesService,
    private toast: ToastService,
    private fb: FormBuilder,
  ) {}

  ordreInput = 1;
  movingOrdre = false;

  ngOnInit(): void {
    this.mode = this.initialMode;
    this.metaForm = this.fb.group({
      statut: [this.piece.statut],
      commentaire: [this.piece.commentaire || ''],
    });
    this.ordreInput = this.piece.ordre + 1;
    if (this.isTabularData) this.initManualForm();
  }

  moveToPosition(): void {
    const target = Math.max(1, Math.round(this.ordreInput)) - 1;
    if (this.movingOrdre || target === this.piece.ordre) return;
    this.movingOrdre = true;
    this.piecesService.moveToPosition(this.piece.id, target).subscribe({
      next: (updated) => {
        this.movingOrdre = false; this.piece = updated; this.ordreInput = updated.ordre + 1;
        this.toast.success('Succès', 'Position mise à jour'); this.saved.emit(updated);
      },
      error: (e) => { this.movingOrdre = false; this.toast.error('Échec', e?.error?.detail || 'Déplacement impossible'); },
    });
  }

  get catalogDef(): PieceTypeDef | undefined {
    return this.catalog.find(d => d.code === this.piece.type_piece);
  }

  /** Données tabulaires éditables à la main : pièces saisies manuellement ou importées
   * (par opposition aux pièces image, gérées par la galerie). */
  get isTabularData(): boolean {
    return this.piece.source_saisie === 'manuel' || this.piece.source_saisie === 'import';
  }
  /** Le type accepte aussi l'import CSV/Excel (remplacement des données par un fichier). */
  get supportsImport(): boolean {
    const s = this.catalogDef?.source;
    return s === 'csv_manuel' || s === 'image_csv_manuel';
  }

  /** Le niveau est toujours un choix libre de l'utilisateur (§ validators.py),
   * indépendant du niveau par défaut suggéré par le catalogue pour ce type. */
  get showScopeSelector(): boolean { return true; }
  get niveauLabel(): string {
    return this.piece.session
      ? `Niveau Session — Session n°${this.piece.session_numero ?? '?'}`
      : 'Niveau SSDGPS — commune à toutes les sessions';
  }

  changeScope(sessionId: string): void {
    if (this.changingScope) return;
    this.changingScope = true;
    this.piecesService.setScope(this.piece.id, sessionId || null).subscribe({
      next: (updated) => { this.changingScope = false; this.piece = updated; this.toast.success('Succès', 'Portée mise à jour'); this.saved.emit(updated); },
      error: (e) => { this.changingScope = false; this.toast.error('Échec', e?.error?.session?.[0] || 'Changement de portée impossible'); },
    });
  }

  saveMeta(): void {
    if (this.savingMeta) return;
    this.savingMeta = true;
    this.piecesService.update(this.piece.id, this.metaForm.value).subscribe({
      next: (updated) => { this.savingMeta = false; this.piece = updated; this.toast.success('Succès', 'Pièce mise à jour'); this.saved.emit(updated); },
      error: (e) => { this.savingMeta = false; this.toast.error('Échec', e?.error?.detail || 'Enregistrement impossible'); },
    });
  }

  // --- Saisie manuelle ---
  private initManualForm(): void {
    const rows = this.piece.payload?.rows?.length ? this.piece.payload.rows : [{}];
    this.manualForm = this.fb.group({ rows: this.fb.array(rows.map((r: any) => this.buildManualRow(r))) });
  }
  private buildManualRow(row: any = {}): FormGroup {
    const group: Record<string, any> = {};
    (this.catalogDef?.champs || []).forEach(c => { group[c.name] = [row[c.name] ?? '']; });
    return this.fb.group(group);
  }
  get manualRows(): FormArray { return this.manualForm!.get('rows') as FormArray; }
  addManualRow(): void { this.manualRows.push(this.buildManualRow()); }
  removeManualRow(i: number): void { if (this.manualRows.length > 1) this.manualRows.removeAt(i); }

  saveManual(): void {
    if (!this.manualForm || this.savingManual) return;
    this.savingManual = true;
    this.piecesService.update(this.piece.id, { payload: { rows: this.manualRows.value } }).subscribe({
      next: (updated) => { this.savingManual = false; this.piece = updated; this.toast.success('Succès', 'Données enregistrées'); this.saved.emit(updated); },
      error: (e) => { this.savingManual = false; this.toast.error('Échec', e?.error?.detail || 'Enregistrement impossible'); },
    });
  }

  // --- Galerie d'images (multi) ---
  imagesBusy = false;

  onAddImages(files: File[]): void {
    if (!files.length || this.imagesBusy) return;
    this.imagesBusy = true;
    this.piecesService.addImages(this.piece.id, files).subscribe({
      next: (updated) => {
        this.imagesBusy = false; this.piece = updated;
        this.toast.success('Succès', 'Image(s) ajoutée(s)'); this.saved.emit(updated);
      },
      error: (e) => { this.imagesBusy = false; this.toast.error('Échec', e?.error?.detail || 'Ajout impossible'); },
    });
  }

  onRemoveImage(imageId: number): void {
    if (this.imagesBusy) return;
    this.imagesBusy = true;
    this.piecesService.deleteImage(this.piece.id, imageId).subscribe({
      next: (updated) => {
        this.imagesBusy = false; this.piece = updated;
        this.toast.success('Succès', 'Image supprimée'); this.saved.emit(updated);
      },
      error: (e) => { this.imagesBusy = false; this.toast.error('Échec', e?.error?.detail || 'Suppression impossible'); },
    });
  }

  onReorderImages(orderedIds: number[]): void {
    if (this.imagesBusy) return;
    this.imagesBusy = true;
    this.piecesService.reorderImages(this.piece.id, orderedIds).subscribe({
      next: (updated) => { this.imagesBusy = false; this.piece = updated; this.saved.emit(updated); },
      error: () => { this.imagesBusy = false; this.toast.error('Échec', 'Réordonnancement impossible'); },
    });
  }

  // --- Image (fichier unique — legacy, autres sources) ---
  onReplaceImage(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      this.toast.error('Fichier invalide', 'Sélectionnez une image (jpg/png) ou un PDF.');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      this.toast.error('Fichier trop volumineux', 'Taille maximale : 20 Mo.');
      return;
    }
    this.replacingFile = true;
    this.piecesService.replaceFile(this.piece.id, file).subscribe({
      next: (updated) => { this.replacingFile = false; this.piece = updated; this.toast.success('Succès', 'Fichier remplacé'); this.saved.emit(updated); },
      error: (e) => { this.replacingFile = false; this.toast.error('Échec', e?.error?.detail || 'Remplacement impossible'); },
    });
  }

  // --- Réimport CSV/Excel ---
  openReimport(): void { this.reimportOpen = true; }
  cancelReimport(): void {
    this.reimportOpen = false; this.reimportFile = null; this.reimportPreview = null; this.reimportMapping = {};
  }
  onReimportFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.reimportFile = file;
    this.reimportPreview = null;
    this.piecesService.previewImport(file, this.piece.type_piece).subscribe({
      next: (preview) => { this.reimportPreview = preview; },
      error: (e) => this.toast.error('Échec', e?.error?.detail || 'Lecture du fichier impossible'),
    });
  }
  onReimportMappingChange(mapping: Record<string, string>): void { this.reimportMapping = mapping; }
  confirmReimport(): void {
    if (!this.reimportFile || this.reimporting) return;
    this.reimporting = true;
    this.piecesService.reimport(this.piece.id, this.reimportFile, this.piece.type_piece, this.reimportMapping).subscribe({
      next: (updated) => {
        this.reimporting = false; this.piece = updated; this.cancelReimport();
        this.initManualForm();  // la grille éditable reflète les données réimportées
        this.toast.success('Succès', 'Données réimportées'); this.saved.emit(updated);
      },
      error: (e) => { this.reimporting = false; this.toast.error('Échec', e?.error?.detail || 'Réimport impossible'); },
    });
  }

  get previewRows(): any[] { return this.piece.payload?.rows || []; }

  close(): void { this.closed.emit(); }
}
