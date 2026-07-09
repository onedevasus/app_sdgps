import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormArray, FormBuilder, FormGroup } from '@angular/forms';
import { PiecesService } from '../../../core/services/pieces.service';
import { ToastService } from '../../../core/services/toast.service';
import { Piece, PieceImportPreview, PieceTypeDef } from '../../../core/models/piece.model';
import { Ssdgps, Session } from '../../../core/models/project.model';

type Step = 'type' | 'scope' | 'source';
type Source = 'image' | 'csv' | 'manuel';

/**
 * Assistant d'ajout d'une pièce, en modal : choix du type applicable, puis du
 * niveau (SSDGPS commun à toutes les sessions, ou Session spécifique — un choix
 * toujours proposé, indépendant du niveau par défaut suggéré par le catalogue
 * pour ce type), puis de la source de données parmi celles disponibles pour ce
 * type — chaque source ouvre le formulaire adapté.
 */
@Component({
  selector: 'app-piece-add-wizard',
  templateUrl: './piece-add-wizard.component.html',
  styleUrls: ['./piece-add-wizard.component.scss'],
})
export class PieceAddWizardComponent implements OnInit {
  @Input() ssdgps!: Ssdgps;
  @Input() sessions: Session[] = [];
  @Input() catalog: PieceTypeDef[] = [];
  @Input() existingPieces: Piece[] = [];
  /** Session pré-sélectionnée à l'ajout depuis une vue session (null = niveau libre). */
  @Input() defaultSessionId: string | null = null;
  /** Rendu inline (page dédiée) plutôt qu'en modale superposée. */
  @Input() embedded = false;
  @Output() created = new EventEmitter<Piece>();
  @Output() cancelled = new EventEmitter<void>();

  step: Step = 'type';
  selectedType: PieceTypeDef | null = null;
  selectedNiveau: 'ssdgps' | 'session' | null = null;
  selectedSessionId: string | null = null;
  selectedSource: Source | null = null;

  // --- Import CSV/Excel ---
  selectedFile: File | null = null;
  importPreview: PieceImportPreview | null = null;
  currentMapping: Record<string, string> = {};
  importing = false;

  // --- Saisie manuelle ---
  manualForm: FormGroup | null = null;
  submittingManual = false;

  // --- Images (multi) ---
  selectedImages: File[] = [];
  selectedImagePreviews: string[] = [];
  submittingImages = false;

  // --- Position dans le rapport ---
  insertAtEnd = true;
  customPosition = 1;
  get maxPosition(): number { return this.existingPieces.filter(p => !p.is_deleted).length + 1; }

  constructor(
    private piecesService: PiecesService,
    private toast: ToastService,
    private fb: FormBuilder,
  ) {}

  ngOnInit(): void {}

  /** Un SSDGPS multi-session rattache ses pièces à une session précise ; un
   * mono-session les rattache directement au SSDGPS (aucun choix de niveau). */
  get isMulti(): boolean { return this.ssdgps.type_ssdgps === 'multi-session'; }

  get applicableTypes(): PieceTypeDef[] {
    return this.catalog.filter(def =>
      def.source !== 'ui' &&
      (def.natures === 'toutes' || (def.natures as string[]).includes(this.ssdgps.nature_ssdgps)),
    );
  }

  /** Le niveau du catalogue n'est qu'une suggestion par défaut, jamais bloquante :
   * n'importe quel type peut être ajouté plusieurs fois tant que la combinaison
   * (type, session, numéro) diffère — vérifié côté serveur à la confirmation. */
  isTypeDisabled(_def: PieceTypeDef): boolean { return false; }

  selectType(def: PieceTypeDef): void {
    this.selectedType = def;
    if (this.isMulti) {
      // Multi-session : la pièce appartient à une session ; pré-sélectionner celle
      // consultée, l'étape « Session » permet d'en changer.
      this.selectedNiveau = null;
      this.selectedSessionId = this.defaultSessionId;
      this.step = 'scope';
    } else {
      // Mono-session : aucun choix de niveau — pièce rattachée au SSDGPS directement.
      this.selectedNiveau = 'ssdgps';
      this.selectedSessionId = null;
      this.step = 'source';
    }
  }

  chooseNiveauSession(sessionId: string): void { this.selectedNiveau = 'session'; this.selectedSessionId = sessionId; this.step = 'source'; }

  get selectedSessionNumero(): number | undefined {
    return this.sessions.find(s => s.id === this.selectedSessionId)?.numero_session;
  }

  backToType(): void { this.step = 'type'; this.selectedType = null; this.resetSourceState(); }
  /** Depuis l'étape Source : retour au choix de session (multi) ou au type (mono). */
  backToNiveau(): void { this.step = this.isMulti ? 'scope' : 'type'; this.resetSourceState(); }

  sourceAllows(kind: Source): boolean {
    const def = this.selectedType;
    if (!def) return false;
    if (kind === 'image') return def.source === 'image' || def.source === 'image_csv_manuel';
    if (kind === 'csv') return def.source === 'csv_manuel' || def.source === 'image_csv_manuel';
    return def.source === 'manuel' || def.source === 'csv_manuel' || def.source === 'image_csv_manuel';
  }

  private parentRef(): { ssdgps: string; session?: string } {
    return { ssdgps: this.ssdgps.id, session: this.selectedSessionId || undefined };
  }

  private nextNumero(): number | undefined {
    if (!this.selectedType?.repeatable) return undefined;
    const scoped = this.existingPieces.filter(p =>
      p.type_piece === this.selectedType!.code && !p.is_deleted &&
      (p.session || null) === (this.selectedSessionId || null),
    );
    const existing = scoped.map(p => p.numero || 0);
    return existing.length ? Math.max(...existing) + 1 : 1;
  }

  selectSource(kind: Source): void {
    this.selectedSource = kind;
    if (kind === 'manuel') this.initManualForm();
  }

  /** Applique la position choisie (si différente de la fin) puis notifie la création. */
  private finishCreate(p: Piece, successMessage: string): void {
    const target = this.insertAtEnd ? null : Math.max(1, Math.min(this.customPosition, this.maxPosition)) - 1;
    if (target === null || target === p.ordre) {
      this.toast.success('Succès', successMessage);
      this.created.emit(p);
      return;
    }
    this.piecesService.moveToPosition(p.id, target).subscribe({
      next: (updated) => { this.toast.success('Succès', successMessage); this.created.emit(updated); },
      error: () => { this.toast.success('Succès', successMessage); this.created.emit(p); },
    });
  }

  // --- Upload d'images (multi) ---
  onImagesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    const valid = files.filter(f => /\.(png|jpe?g|tiff?|webp)$/i.test(f.name) && f.size <= 20 * 1024 * 1024);
    if (valid.length < files.length) {
      this.toast.error('Fichier(s) ignoré(s)', 'Formats acceptés : png/jpg/jpeg/tiff/webp, taille max 20 Mo.');
    }
    valid.forEach(f => {
      this.selectedImages.push(f);
      this.selectedImagePreviews.push(URL.createObjectURL(f));
    });
  }

  removeLocalImage(i: number): void {
    URL.revokeObjectURL(this.selectedImagePreviews[i]);
    this.selectedImages.splice(i, 1);
    this.selectedImagePreviews.splice(i, 1);
  }

  moveLocalImage(i: number, dir: -1 | 1): void {
    const j = i + dir;
    if (j < 0 || j >= this.selectedImages.length) return;
    [this.selectedImages[i], this.selectedImages[j]] = [this.selectedImages[j], this.selectedImages[i]];
    [this.selectedImagePreviews[i], this.selectedImagePreviews[j]] =
      [this.selectedImagePreviews[j], this.selectedImagePreviews[i]];
  }

  /** TIFF n'a pas d'aperçu natif dans un <img>. */
  isPreviewable(f: File): boolean { return !/\.tiff?$/i.test(f.name); }

  private clearLocalImages(): void {
    this.selectedImagePreviews.forEach(u => URL.revokeObjectURL(u));
    this.selectedImages = [];
    this.selectedImagePreviews = [];
  }

  submitImages(): void {
    if (!this.selectedType || !this.selectedImages.length || this.submittingImages) return;
    this.submittingImages = true;
    const files = this.selectedImages;
    this.piecesService.createImagePiece(this.selectedType.code, this.parentRef(), this.nextNumero()).subscribe({
      next: (piece) => {
        this.piecesService.addImages(piece.id, files).subscribe({
          next: (withImages) => {
            this.submittingImages = false; this.clearLocalImages();
            this.finishCreate(withImages, `${files.length} image(s) ajoutée(s)`);
          },
          error: (e) => { this.submittingImages = false; this.toast.error('Échec', e?.error?.detail || 'Ajout des images impossible'); },
        });
      },
      error: (e) => { this.submittingImages = false; this.toast.error('Échec', e?.error?.detail || 'Création de la pièce impossible'); },
    });
  }

  // --- Import CSV/Excel ---
  onImportFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || !this.selectedType) return;
    this.selectedFile = file;
    this.importPreview = null;
    this.piecesService.previewImport(file, this.selectedType.code).subscribe({
      next: (preview) => { this.importPreview = preview; },
      error: (e) => this.toast.error('Échec', e?.error?.detail || 'Lecture du fichier impossible'),
    });
  }

  onMappingChange(mapping: Record<string, string>): void { this.currentMapping = mapping; }

  confirmImport(): void {
    if (!this.selectedFile || !this.selectedType || this.importing) return;
    this.importing = true;
    this.piecesService.confirmImport(this.selectedFile, this.selectedType.code, this.parentRef(), this.currentMapping, this.nextNumero())
      .subscribe({
        next: (p) => { this.importing = false; this.finishCreate(p, 'Import confirmé'); },
        error: (e) => { this.importing = false; this.toast.error('Échec', e?.error?.detail || 'Import impossible'); },
      });
  }

  // --- Saisie manuelle ---
  private initManualForm(): void {
    this.manualForm = this.fb.group({ rows: this.fb.array([this.buildManualRow()]) });
  }
  private buildManualRow(): FormGroup {
    const group: Record<string, any> = {};
    (this.selectedType?.champs || []).forEach(c => { group[c.name] = ['']; });
    return this.fb.group(group);
  }
  get manualRows(): FormArray { return this.manualForm!.get('rows') as FormArray; }
  addManualRow(): void { this.manualRows.push(this.buildManualRow()); }
  removeManualRow(i: number): void { if (this.manualRows.length > 1) this.manualRows.removeAt(i); }

  submitManual(): void {
    if (!this.manualForm || !this.selectedType || this.submittingManual) return;
    this.submittingManual = true;
    this.piecesService.createManual({
      type_piece: this.selectedType.code, parent: this.parentRef(), numero: this.nextNumero(),
      data: { rows: this.manualRows.value },
    }).subscribe({
      next: (p) => { this.submittingManual = false; this.finishCreate(p, 'Pièce enregistrée'); },
      error: (e) => { this.submittingManual = false; this.toast.error('Échec', e?.error?.detail || 'Enregistrement impossible'); },
    });
  }

  cancelSourceForm(): void {
    this.selectedSource = null;
    this.selectedFile = null;
    this.importPreview = null;
    this.currentMapping = {};
    this.manualForm = null;
    this.clearLocalImages();
  }

  private resetSourceState(): void { this.cancelSourceForm(); }

  close(): void { this.cancelled.emit(); }
}
