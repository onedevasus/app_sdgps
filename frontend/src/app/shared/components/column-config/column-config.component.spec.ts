import { ColumnConfigComponent } from './column-config.component';
import { ManagedColumn } from './column-config.util';

function make(): { cmp: ColumnConfigComponent; last: () => ManagedColumn[] } {
  const cmp = new ColumnConfigComponent();
  cmp.columns = [
    { field: 'a', label: 'A', visible: true, type: 'text' },
    { field: 'b', label: 'B', visible: true, type: 'number' },
    { field: 'c', label: 'C', visible: false, type: 'date' },
  ];
  let last: ManagedColumn[] = [];
  cmp.columnsChange.subscribe(c => (last = c));
  return { cmp, last: () => last };
}

describe('ColumnConfigComponent (logique)', () => {
  it('open/close pilotent la modale', () => {
    const { cmp } = make();
    cmp.open(); expect(cmp.showColumnConfig).toBeTrue();
    cmp.close(); expect(cmp.showColumnConfig).toBeFalse();
  });

  it('stats total/visibles/masquées', () => {
    const { cmp } = make();
    expect(cmp.total).toBe(3);
    expect(cmp.visibleCount).toBe(2);
    expect(cmp.hiddenCount).toBe(1);
  });

  it('toggleVisibility émet une nouvelle liste avec la visibilité inversée (sans muter l\'entrée)', () => {
    const { cmp, last } = make();
    cmp.toggleVisibility('a');
    expect(last().find(c => c.field === 'a')!.visible).toBeFalse();
    expect(cmp.columns[0].visible).toBeTrue(); // pas de mutation de la source
  });

  it('selectAll / deselectAll / invertSelection', () => {
    const { cmp, last } = make();
    cmp.selectAll(); expect(last().every(c => c.visible)).toBeTrue();
    cmp.deselectAll(); expect(last().every(c => !c.visible)).toBeTrue();
    cmp.invertSelection(); expect(last().map(c => c.visible)).toEqual([false, false, true]);
  });

  it('moveUp / moveDown / moveToTop / moveToBottom réordonnent', () => {
    const { cmp, last } = make();
    cmp.moveDown(0); expect(last().map(c => c.field)).toEqual(['b', 'a', 'c']);
    cmp.moveUp(2); expect(last().map(c => c.field)).toEqual(['a', 'c', 'b']);
    cmp.moveToBottom(0); expect(last().map(c => c.field)).toEqual(['b', 'c', 'a']);
    cmp.moveToTop(2); expect(last().map(c => c.field)).toEqual(['c', 'a', 'b']);
  });

  it('drag & drop réordonne à la dépose', () => {
    const { cmp, last } = make();
    cmp.onDragStart(0);
    cmp.onDrop(2);
    expect(last().map(c => c.field)).toEqual(['b', 'c', 'a']);
    expect(cmp.draggedIndex).toBeNull();
  });

  it('filtre « visibles » ne montre que les colonnes visibles', () => {
    const { cmp } = make();
    cmp.applyFilter('visible');
    expect(cmp.filteredColumns.map(c => c.field)).toEqual(['a', 'b']);
    expect(cmp.filterLabel).toBe('Colonnes visibles');
  });

  it('askReset ouvre la confirmation, confirmReset émet resetToSource', () => {
    const { cmp } = make();
    const spy = jasmine.createSpy('reset');
    cmp.resetToSource.subscribe(spy);
    cmp.askReset(); expect(cmp.showResetConfirm).toBeTrue();
    cmp.confirmReset();
    expect(cmp.showResetConfirm).toBeFalse();
    expect(spy).toHaveBeenCalled();
  });

  it('askReset ne fait rien pendant une réinitialisation en cours', () => {
    const { cmp } = make();
    cmp.resetting = true;
    cmp.askReset();
    expect(cmp.showResetConfirm).toBeFalse();
  });
});
