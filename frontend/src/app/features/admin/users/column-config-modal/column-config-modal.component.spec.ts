import { ColumnConfigModalComponent, ColumnConfig } from './column-config-modal.component';

describe('ColumnConfigModalComponent', () => {
  let cmp: ColumnConfigModalComponent;

  function cols(): ColumnConfig[] {
    return [
      { field: 'a', label: 'A', visible: true },
      { field: 'b', label: 'B', visible: false },
      { field: 'c', label: 'C', visible: true },
    ];
  }

  beforeEach(() => {
    cmp = new ColumnConfigModalComponent();
    cmp.columns = cols();
  });

  it('getVisibleCount compte les colonnes visibles', () => {
    expect(cmp.getVisibleCount()).toBe(2);
  });

  it('getConfigColumns filtre selon columnFilter', () => {
    expect(cmp.getConfigColumns().length).toBe(3);
    cmp.setColumnFilter('visible');
    expect(cmp.getConfigColumns().length).toBe(2);
    expect(cmp.getColumnFilterLabel()).toBe('Colonnes visibles');
  });

  it('open sauvegarde un backup et émet show=true', () => {
    const showSpy = spyOn(cmp.showChange, 'emit');
    cmp.open();
    expect(cmp.show).toBeTrue();
    expect(showSpy).toHaveBeenCalledWith(true);
  });

  it('close restaure le backup et émet les changements', () => {
    cmp.open();
    cmp.columns[0].visible = false; // modification
    const colsSpy = spyOn(cmp.columnsChange, 'emit');
    cmp.close();
    expect(cmp.show).toBeFalse();
    expect(cmp.columns[0].visible).toBeTrue(); // restauré depuis le backup
    expect(colsSpy).toHaveBeenCalled();
  });

  it('confirm émet les colonnes et réinitialise le filtre', () => {
    cmp.setColumnFilter('visible');
    const colsSpy = spyOn(cmp.columnsChange, 'emit');
    cmp.confirm();
    expect(cmp.show).toBeFalse();
    expect(cmp.columnFilter).toBe('all');
    expect(colsSpy).toHaveBeenCalledWith(cmp.columns);
  });

  it('toggleColumnVisibility garde au moins une colonne visible', () => {
    cmp.columns = [{ field: 'a', label: 'A', visible: true }];
    cmp.toggleColumnVisibility(cmp.columns[0]);
    // Dernière colonne : re-forcée visible
    expect(cmp.columns[0].visible).toBeTrue();
  });

  it('hideAllColumns laisse la première visible', () => {
    cmp.hideAllColumns();
    expect(cmp.columns[0].visible).toBeTrue();
    expect(cmp.columns.slice(1).every(c => !c.visible)).toBeTrue();
  });

  it('showAllColumns rend tout visible', () => {
    cmp.showAllColumns();
    expect(cmp.columns.every(c => c.visible)).toBeTrue();
  });

  it('invertColumnVisibility inverse en gardant une visible', () => {
    cmp.columns = [{ field: 'a', label: 'A', visible: true }];
    cmp.invertColumnVisibility();
    expect(cmp.columns[0].visible).toBeTrue(); // sinon aucune → première forcée
  });

  describe('réordonnancement', () => {
    it('moveColumnUp / moveColumnDown', () => {
      cmp.moveColumnDown(0);
      expect(cmp.columns.map(c => c.field)).toEqual(['b', 'a', 'c']);
      cmp.moveColumnUp(1);
      expect(cmp.columns.map(c => c.field)).toEqual(['a', 'b', 'c']);
    });
    it('moveColumnTop / moveColumnBottom', () => {
      cmp.moveColumnTop(2);
      expect(cmp.columns.map(c => c.field)).toEqual(['c', 'a', 'b']);
      cmp.moveColumnBottom(0);
      expect(cmp.columns.map(c => c.field)).toEqual(['a', 'b', 'c']);
    });
    it('onColumnDrop réinsère à la bonne position', () => {
      cmp.onColumnDragStart(0);
      cmp.onColumnDrop(2);
      expect(cmp.columns.map(c => c.field)).toEqual(['b', 'a', 'c']);
      expect(cmp.draggedColumnIndex).toBeNull();
    });
    it('isLastColumn', () => {
      expect(cmp.isLastColumn(2)).toBeTrue();
      expect(cmp.isLastColumn(0)).toBeFalse();
    });
  });

  it('getFieldDescription mappe les champs connus', () => {
    expect(cmp.getFieldDescription('email')).toContain('email');
    expect(cmp.getFieldDescription('inconnu')).toBeNull();
  });
});
