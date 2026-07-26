import { of } from 'rxjs';
import { OrganismeListComponent } from './organisme-list.component';

describe('OrganismeListComponent (helpers)', () => {
  let cmp: OrganismeListComponent;
  let sortSvc: any;
  let toast: any;

  beforeEach(() => {
    sortSvc = {
      get: jasmine.createSpy('get').and.returnValue(of([])),
      save: jasmine.createSpy('save').and.returnValue(of([])),
      resetToSource: jasmine.createSpy('resetToSource').and.returnValue(of([])),
    };
    toast = { success: jasmine.createSpy('success'), error: jasmine.createSpy('error') };
    const columnsStub = { get: () => of([]), save: () => of([]), resetToSource: () => of([]) } as any;
    cmp = new OrganismeListComponent({} as any, {} as any, toast, {} as any, sortSvc, columnsStub);
  });

  it('getTypeLabel mappe les types (repli « Texte »)', () => {
    expect(cmp.getTypeLabel('text')).toBe('Texte');
    expect(cmp.getTypeLabel('number')).toBe('Nombre');
    expect(cmp.getTypeLabel('boolean')).toBe('Booléen');
    expect(cmp.getTypeLabel('autre')).toBe('Texte');
  });

  it('isN2 selon le niveau', () => {
    cmp.niveau = 1;
    expect(cmp.isN2).toBeFalse();
    cmp.niveau = 2;
    expect(cmp.isN2).toBeTrue();
  });

  it('getVisibleColumns filtre les colonnes visibles', () => {
    cmp.columns = [
      { visible: true } as any,
      { visible: false } as any,
      { visible: true } as any,
    ];
    expect(cmp.getVisibleColumns().length).toBe(2);
  });

  it('getFieldDescription lit la table des descriptions', () => {
    (cmp as any).descriptions = { nom: 'Nom officiel' };
    expect(cmp.getFieldDescription('nom')).toBe('Nom officiel');
    expect(cmp.getFieldDescription('absent')).toBe('');
  });

  // ---------------------------------------------------------------- tri multi-niveaux
  it('sortableFields dépend du niveau (le niveau 2 propose « Premier niveau »)', () => {
    cmp.niveau = 1;
    expect(cmp.sortableFields.some(f => f.field === 'nbr_niveaux2')).toBeTrue();
    expect(cmp.sortableFields.some(f => f.field === 'niveau1_nom')).toBeFalse();
    cmp.niveau = 2;
    expect(cmp.sortableFields.some(f => f.field === 'niveau1_nom')).toBeTrue();
    expect(cmp.sortableFields.some(f => f.field === 'ville')).toBeTrue();
  });

  it('applyFilters applique le tri multi-niveaux (prioritaire sur le mono-colonne)', () => {
    cmp.niveau = 1;
    cmp.showDeleted = false;
    cmp.activeRows = [
      { id: 'a', nom: 'Alpha', code: 'Z' },
      { id: 'b', nom: 'Alpha', code: 'A' },
      { id: 'c', nom: 'Beta', code: 'M' },
    ];
    cmp.sortColumn = null;
    cmp.sortLevels = [{ field: 'nom', dir: 'asc' }, { field: 'code', dir: 'asc' }];
    cmp.applyFilters();
    expect(cmp.filtered.map(r => r.id)).toEqual(['b', 'a', 'c']);
  });

  // La modale (ajout/retrait/déplacement/effacement) est désormais dans le composant partagé
  // <app-multi-level-sort> (testé séparément). Ici : lecture d'état + branchements du parent.
  it('sortLevelOf / sortDirOf reflètent les niveaux', () => {
    cmp.niveau = 1;
    cmp.sortLevels = [{ field: 'nom', dir: 'asc' }, { field: 'code', dir: 'desc' }];
    expect(cmp.sortLevelOf('nom')).toBe(1);
    expect(cmp.sortLevelOf('code')).toBe(2);
    expect(cmp.sortLevelOf('sigle')).toBe(0);
    expect(cmp.sortDirOf('code')).toBe('desc');
    expect(cmp.sortDirOf('sigle')).toBe('');
  });

  it('onSortLevelsChange applique les niveaux reçus de la modale partagée', () => {
    cmp.niveau = 1;
    cmp.showDeleted = false;
    cmp.activeRows = [];
    cmp.onSortLevelsChange([{ field: 'nom', dir: 'asc' }]);
    expect(cmp.sortLevels).toEqual([{ field: 'nom', dir: 'asc' }]);
  });

  it('loadSortConfig lit le service pour le niveau courant', () => {
    cmp.niveau = 2;
    cmp.activeRows = [];
    (cmp as any).loadSortConfig();
    expect(sortSvc.get).toHaveBeenCalledWith(2);
  });

  it('onResetSort réinitialise via le service pour le niveau courant', () => {
    cmp.niveau = 1;
    cmp.showDeleted = false;
    cmp.activeRows = [];
    sortSvc.resetToSource.and.returnValue(of([{ field: 'code', dir: 'asc' }]));
    cmp.onResetSort();
    expect(sortSvc.resetToSource).toHaveBeenCalledWith(1);
    expect(cmp.sortLevels).toEqual([{ field: 'code', dir: 'asc' }]);
  });
});

describe('OrganismeListComponent (config colonnes)', () => {
  let cmp: OrganismeListComponent;
  let toast: any;
  let columnsSvc: any;

  beforeEach(() => {
    toast = { success: jasmine.createSpy('success'), error: jasmine.createSpy('error') };
    columnsSvc = {
      get: jasmine.createSpy('get').and.returnValue(of([])),
      save: jasmine.createSpy('save').and.returnValue(of([])),
      resetToSource: jasmine.createSpy('resetToSource').and.returnValue(of([])),
    };
    const sortStub = { get: () => of([]), save: () => of([]), resetToSource: () => of([]) } as any;
    cmp = new OrganismeListComponent({} as any, {} as any, toast, {} as any, sortStub, columnsSvc);
  });

  it('onColumnsChange enregistre sous la clé du niveau (n1 → organisme_niveau1)', (done) => {
    cmp.niveau = 1;
    const cols = [{ field: 'nom', label: 'Nom', visible: false }] as any;
    cmp.onColumnsChange(cols);
    expect(cmp.columns).toBe(cols);
    setTimeout(() => {
      expect(columnsSvc.save).toHaveBeenCalledWith('organisme_niveau1', [{ field: 'nom', visible: false }]);
      done();
    }, 600);
  });

  it('onResetColumns utilise la clé n2 (organisme_niveau2)', () => {
    cmp.niveau = 2;
    cmp.columns = [{ field: 'nom', label: 'Nom', visible: true } as any];
    columnsSvc.resetToSource.and.returnValue(of([{ field: 'nom', visible: false }]));
    cmp.onResetColumns();
    expect(columnsSvc.resetToSource).toHaveBeenCalledWith('organisme_niveau2');
    expect(cmp.columns[0].visible).toBeFalse();
    expect(toast.success).toHaveBeenCalled();
  });

  it('openColumnConfigFromContext ferme les menus et ouvre la modale de colonnes', () => {
    const open = jasmine.createSpy('open');
    (cmp as any).columnCfg = { open };
    cmp.showColumnContextMenu = true;
    cmp.openColumnConfigFromContext();
    expect(cmp.showColumnContextMenu).toBeFalse();
    expect(open).toHaveBeenCalled();
  });
});
