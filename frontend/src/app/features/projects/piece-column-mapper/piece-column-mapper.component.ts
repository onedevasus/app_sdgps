import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { PieceChampDef, PieceImportPreview } from '../../../core/models/piece.model';

const IGNORE = '';

/**
 * UI de mapping flexible colonnes (fichier importé) → champs cibles (catalogue de la pièce).
 * Un menu déroulant par champ cible, avec auto-suggestion initiale par correspondance de nom.
 */
@Component({
  selector: 'app-piece-column-mapper',
  templateUrl: './piece-column-mapper.component.html',
  styleUrls: ['./piece-column-mapper.component.scss'],
})
export class PieceColumnMapperComponent implements OnChanges {
  @Input() champs: PieceChampDef[] = [];
  @Input() preview!: PieceImportPreview;
  @Output() mappingChange = new EventEmitter<Record<string, string>>();

  readonly ignoreValue = IGNORE;
  form: FormGroup;
  private originalSuggestions: Record<string, string> = {};

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({});
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['champs'] || changes['preview']) {
      this.buildForm();
    }
  }

  private normalize(s: string): string {
    return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
  }

  private suggestColumn(champ: PieceChampDef): string {
    if (!this.preview?.columns?.length) return IGNORE;
    const targetLabel = this.normalize(champ.label);
    const targetName = this.normalize(champ.name);
    const found = this.preview.columns.find(col => {
      const c = this.normalize(col);
      return c === targetLabel || c === targetName || c.includes(targetName) || targetLabel.includes(c);
    });
    return found ?? IGNORE;
  }

  private buildForm(): void {
    const group: Record<string, any> = {};
    this.originalSuggestions = {};
    for (const champ of this.champs) {
      const suggestion = this.suggestColumn(champ);
      group[champ.name] = [suggestion];
      this.originalSuggestions[champ.name] = suggestion;
    }
    this.form = this.fb.group(group);
    this.form.valueChanges.subscribe(() => this.emitMapping());
    this.emitMapping();
  }

  /** Le champ a-t-il été modifié par rapport à la suggestion automatique initiale ? */
  isModified(champName: string): boolean {
    return this.form.value[champName] !== this.originalSuggestions[champName];
  }

  resetField(champName: string): void {
    this.form.get(champName)?.setValue(this.originalSuggestions[champName]);
  }

  resetAllToSuggestions(): void {
    this.form.patchValue(this.originalSuggestions);
  }

  private emitMapping(): void {
    const mapping: Record<string, string> = {};
    Object.entries(this.form.value).forEach(([champ, col]) => {
      if (col) mapping[champ] = col as string;
    });
    this.mappingChange.emit(mapping);
  }

  get previewColumns(): PieceChampDef[] {
    return this.champs.filter(c => this.form.value[c.name]);
  }

  previewValue(row: string[], champ: PieceChampDef): string {
    const col = this.form.value[champ.name];
    if (!col) return '';
    const idx = this.preview.columns.indexOf(col);
    return idx >= 0 ? (row[idx] ?? '') : '';
  }

  get previewSampleRows(): string[][] {
    return (this.preview?.preview_rows || []).slice(0, 5);
  }

  get mappedCount(): number {
    return this.champs.filter(c => !!this.form.value[c.name]).length;
  }
  get totalChamps(): number { return this.champs.length; }

  get unmappedSourceColumns(): string[] {
    if (!this.preview?.columns) return [];
    const used = new Set(Object.values(this.form.value).filter(Boolean) as string[]);
    return this.preview.columns.filter(col => !used.has(col));
  }
}
