import { Component, Input, Output, EventEmitter } from '@angular/core';

export interface ColumnConfig {
  field: string;
  label: string;
  visible: boolean;
  width?: string;
  type?: 'text' | 'email' | 'date' | 'boolean' | 'role' | 'status' | 'actions';
}

@Component({
  selector: 'app-column-config-modal',
  templateUrl: './column-config-modal.component.html',
  styleUrls: ['./column-config-modal.component.scss'],
})
export class ColumnConfigModalComponent {
  @Input() columns: ColumnConfig[] = [];
  @Input() show = false;
  @Output() showChange = new EventEmitter<boolean>();
  @Output() columnsChange = new EventEmitter<ColumnConfig[]>();

  private columnsBackup: ColumnConfig[] = [];

  showColumnFilterMenu = false;
  columnFilter: 'all' | 'visible' = 'all';
  draggedColumnIndex: number | null = null;
  dragOverIndex: number | null = null;

  getVisibleCount(): number {
    return this.columns.filter(c => c.visible).length;
  }

  getConfigColumns(): ColumnConfig[] {
    if (this.columnFilter === 'visible') {
      return this.columns.filter(c => c.visible);
    }
    return this.columns;
  }

  getColumnFilterLabel(): string {
    return this.columnFilter === 'visible' ? 'Colonnes visibles' : 'Toutes les colonnes';
  }

  toggleColumnFilterMenu(): void {
    this.showColumnFilterMenu = !this.showColumnFilterMenu;
  }

  setColumnFilter(filter: 'all' | 'visible'): void {
    this.columnFilter = filter;
    this.showColumnFilterMenu = false;
  }

  open(): void {
    this.columnsBackup = JSON.parse(JSON.stringify(this.columns));
    this.show = true;
    this.showChange.emit(true);
  }

  close(): void {
    this.columns = JSON.parse(JSON.stringify(this.columnsBackup));
    this.show = false;
    this.showChange.emit(false);
    this.columnsChange.emit(this.columns);
  }

  confirm(): void {
    this.show = false;
    this.showChange.emit(false);
    this.columnsChange.emit(this.columns);
    this.columnFilter = 'all';
  }

  toggleColumnVisibility(col: ColumnConfig): void {
    col.visible = !col.visible;
    const hasVisible = this.columns.some(c => c.visible);
    if (!hasVisible && this.columns.length > 0) {
      this.columns[0].visible = true;
    }
  }

  showAllColumns(): void {
    this.columns.forEach(col => { col.visible = true; });
  }

  hideAllColumns(): void {
    this.columns.forEach(col => { col.visible = false; });
    if (this.columns.length > 0) {
      this.columns[0].visible = true;
    }
  }

  invertColumnVisibility(): void {
    this.columns.forEach(col => { col.visible = !col.visible; });
    const hasVisible = this.columns.some(c => c.visible);
    if (!hasVisible && this.columns.length > 0) {
      this.columns[0].visible = true;
    }
  }

  onColumnDragStart(index: number): void {
    this.draggedColumnIndex = index;
  }

  onColumnDragOver(index: number): void {
    if (this.draggedColumnIndex !== index) {
      this.dragOverIndex = index;
    }
  }

  onColumnDrop(index: number): void {
    if (this.draggedColumnIndex !== null && this.draggedColumnIndex !== index) {
      const [dragged] = this.columns.splice(this.draggedColumnIndex, 1);
      const adjustedIndex = index > this.draggedColumnIndex ? index - 1 : index;
      this.columns.splice(adjustedIndex, 0, dragged);
    }
    this.draggedColumnIndex = null;
    this.dragOverIndex = null;
  }

  onColumnDragEnd(): void {
    this.draggedColumnIndex = null;
    this.dragOverIndex = null;
  }

  moveColumnUp(index: number): void {
    if (index > 0) {
      [this.columns[index], this.columns[index - 1]] = [this.columns[index - 1], this.columns[index]];
    }
  }

  moveColumnDown(index: number): void {
    if (index < this.columns.length - 1) {
      [this.columns[index], this.columns[index + 1]] = [this.columns[index + 1], this.columns[index]];
    }
  }

  moveColumnTop(index: number): void {
    const [col] = this.columns.splice(index, 1);
    this.columns.unshift(col);
  }

  moveColumnBottom(index: number): void {
    if (index >= this.columns.length - 1) return;
    const [col] = this.columns.splice(index, 1);
    this.columns.push(col);
  }

  isLastColumn(index: number): boolean {
    return index === this.columns.length - 1;
  }

  getFieldDescription(field: string): string | null {
    const descriptions: Record<string, string> = {
      'first_name': 'Prénom et nom de l\'utilisateur',
      'email': 'Adresse email de connexion',
      'role': 'Rôle déterminant les permissions',
      'organization_name': 'Organisation de rattachement principale',
      'is_active': 'Compte actif ou inactif',
      'last_connection_at': 'Date et heure de la dernière connexion',
      'must_change_password': 'L\'utilisateur doit changer son mot de passe',
      'date_joined': 'Date de création du compte',
      'password_changed_at': 'Date du dernier changement de mot de passe',
      'is_deleted': 'Compte supprimé (soft-delete)',
      'is_superuser': 'Superutilisateur avec tous les droits',
    };
    return descriptions[field] || null;
  }
}
