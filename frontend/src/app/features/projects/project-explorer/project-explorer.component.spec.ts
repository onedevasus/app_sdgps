import { FormBuilder } from '@angular/forms';
import { of } from 'rxjs';
import { ProjectExplorerComponent } from './project-explorer.component';

describe('ProjectExplorerComponent (logique)', () => {
  let cmp: ProjectExplorerComponent;

  beforeEach(() => {
    cmp = new ProjectExplorerComponent(
      {} as any, {} as any, {} as any, {} as any, {} as any, new FormBuilder(), {} as any,
    );
  });

  afterEach(() => localStorage.clear());

  describe('libellés & icônes de niveau', () => {
    it('levelTitle / childLabel / levelIcon', () => {
      cmp.level = 'ssdgps';
      expect(cmp.levelTitle).toBe('SSDGPS');
      expect(cmp.childLabel()).toBe('SSDGPS');
      expect(cmp.levelIcon('session')).toBe('fa-clock');
    });
    it('isLeaf uniquement au niveau session', () => {
      cmp.level = 'session';
      expect(cmp.isLeaf()).toBeTrue();
      cmp.level = 'propriete';
      expect(cmp.isLeaf()).toBeFalse();
    });
  });

  describe('itemLabel', () => {
    it('propriété : nom + identifiant (titre prioritaire)', () => {
      expect(cmp.itemLabel({ nom_propriete: 'Villa', id_titre: 'TF-1', id_requisition: 'R-9' }, 'propriete'))
        .toBe('Villa (TF-1)');
      expect(cmp.itemLabel({ nom_propriete: 'Villa', id_requisition: 'R-9' }, 'propriete'))
        .toBe('Villa (R-9)');
    });
    it('affaire / ssdgps / session', () => {
      expect(cmp.itemLabel({ numero_sd_affaire: 3, nature_affaire: 'IF' }, 'affaire')).toBe('SD 3 — IF');
      expect(cmp.itemLabel({ numero_ssdgps: 2, nature_ssdgps: 'rattachement' }, 'ssdgps'))
        .toBe('SSDGPS 2 (rattachement)');
      expect(cmp.itemLabel({ numero_session: 4 }, 'session')).toBe('Session 4');
    });
  });

  describe('proprieteBreadcrumbLabel', () => {
    it('identifiant seul (titre, sinon réquisition, sinon nom)', () => {
      expect(cmp.proprieteBreadcrumbLabel({ id_titre: 'TF-1' })).toBe('TF-1');
      expect(cmp.proprieteBreadcrumbLabel({ id_requisition: 'R-9' })).toBe('R-9');
      expect(cmp.proprieteBreadcrumbLabel({ nom_propriete: 'Villa' })).toBe('Villa');
      expect(cmp.proprieteBreadcrumbLabel({})).toBe('');
    });
  });

  describe('formatDate & getCellValue', () => {
    it('formatDate', () => {
      expect(cmp.formatDate(null)).toBe('—');
      expect(cmp.formatDate('2026-07-21T10:00:00Z')).toContain('2026');
    });
    it('getCellValue formate les champs spéciaux', () => {
      expect(cmp.getCellValue({ is_deleted: true }, 'is_deleted')).toBe('Oui');
      expect(cmp.getCellValue({ created_at: '2026-01-01T00:00:00Z' }, 'created_at')).toContain('2026');
      expect(cmp.getCellValue({ numero_ssdgps: 7 }, 'numero_ssdgps')).toBe('7');
      expect(cmp.getCellValue({}, 'numero_ssdgps')).toBe('—');
    });
    it('getTypeLabel / getFieldDescription', () => {
      expect(cmp.getTypeLabel('number')).toBe('NOMBRE');
      expect(cmp.getFieldDescription('numero_ssdgps')).toContain('SSDGPS');
      expect(cmp.getFieldDescription('inconnu')).toBe('');
    });
  });

  describe('filteredItems (recherche, filtre, tri)', () => {
    beforeEach(() => {
      cmp.level = 'session';
      cmp.activeItems = [
        { id: 'a', numero_session: 2 },
        { id: 'b', numero_session: 1 },
        { id: 'c', numero_session: 3 },
      ];
      cmp.sortColumn = 'numero_session';
    });
    it('trie selon la colonne', () => {
      cmp.sortDirection = 'asc';
      expect(cmp.filteredItems.map(i => i.id)).toEqual(['b', 'a', 'c']);
      cmp.sortDirection = 'desc';
      expect(cmp.filteredItems.map(i => i.id)).toEqual(['c', 'a', 'b']);
    });
    it('recherche sur le libellé', () => {
      cmp.searchText = 'session 3';
      expect(cmp.filteredItems.map(i => i.id)).toEqual(['c']);
    });
    it('filtre par champ', () => {
      cmp.activeFieldFilter = 'numero_session';
      cmp.fieldFilterValue = '1';
      expect(cmp.filteredItems.map(i => i.id)).toEqual(['b']);
    });
  });

  describe('pagination', () => {
    beforeEach(() => {
      cmp.level = 'session';
      cmp.activeItems = new Array(23).fill(null).map((_, i) => ({ id: String(i), numero_session: i }));
      cmp.pageSize = 10;
    });
    it('totalPages / paginatedItems', () => {
      expect(cmp.totalPages).toBe(3);
      cmp.currentPage = 2;
      expect(cmp.paginatedItems.length).toBe(10);
    });
    it('nextPage / prevPage bornent', () => {
      cmp.currentPage = 3;
      cmp.nextPage();
      expect(cmp.currentPage).toBe(3);
      cmp.currentPage = 1;
      cmp.prevPage();
      expect(cmp.currentPage).toBe(1);
    });
    it('setPageSize revient page 1', () => {
      cmp.currentPage = 2;
      cmp.setPageSize(5);
      expect(cmp.currentPage).toBe(1);
    });
  });

  describe('sélection', () => {
    beforeEach(() => {
      cmp.level = 'session';
      cmp.activeItems = [{ id: 'a' }, { id: 'b' }];
    });
    it('toggleSelect / isSelected / selectedCount', () => {
      cmp.toggleSelect({ id: 'a' }, new Event('c'));
      expect(cmp.isSelected({ id: 'a' })).toBeTrue();
      expect(cmp.selectedCount).toBe(1);
    });
    it('selectAll / isAllSelected / deselectAll', () => {
      cmp.selectAll();
      expect(cmp.isAllSelected).toBeTrue();
      cmp.deselectAll();
      expect(cmp.selectedCount).toBe(0);
    });
    it('invertSelection', () => {
      cmp.selectedIds.add('a');
      cmp.invertSelection();
      expect(Array.from(cmp.selectedIds)).toEqual(['b']);
    });
  });

  describe('tri & vue', () => {
    it('sortBy bascule la direction', () => {
      cmp.sortColumn = 'x'; cmp.sortDirection = 'asc';
      cmp.sortBy('x');
      expect(cmp.sortDirection).toBe('desc');
      cmp.sortBy('y');
      expect(cmp.sortColumn).toBe('y');
      expect(cmp.sortDirection).toBe('asc');
    });
    it('getSortIcon', () => {
      cmp.sortColumn = 'x'; cmp.sortDirection = 'asc';
      expect(cmp.getSortIcon('x')).toBe('fas fa-sort-up');
      expect(cmp.getSortIcon('z')).toBe('fas fa-sort');
    });
    it('toggleViewMode persiste', () => {
      cmp.toggleViewMode('table');
      expect(cmp.viewMode).toBe('table');
      expect(localStorage.getItem('sdgps_explorer_view_mode')).toBe('table');
    });
    it('setTab bascule la corbeille et réinitialise', () => {
      cmp.searchText = 'x';
      cmp.setTab(true);
      expect(cmp.showDeleted).toBeTrue();
      expect(cmp.searchText).toBe('');
    });
  });

  describe('colonnes', () => {
    beforeEach(() => {
      cmp.columns = [
        { field: 'a', label: 'A', visible: true },
        { field: 'b', label: 'B', visible: false },
      ];
    });
    it('getVisibleColumns / getColumnStats', () => {
      expect(cmp.getVisibleColumns().length).toBe(1);
      const s = cmp.getColumnStats();
      expect(s).toEqual({ total: 2, visible: 1, hidden: 1 });
    });
    it('toggleColumnVisibility', () => {
      cmp.toggleColumnVisibility('b');
      expect(cmp.columns[1].visible).toBeTrue();
    });
    it('moveColumnToTop', () => {
      cmp.moveColumnToTop(1);
      expect(cmp.columns[0].field).toBe('b');
    });
    it('getColumnFilterLabel', () => {
      expect(cmp.getColumnFilterLabel()).toBe('Toutes les colonnes');
      cmp.applyColumnFilter('visible');
      expect(cmp.getColumnFilterLabel()).toBe('Colonnes visibles');
    });
  });
});

describe('ProjectExplorerComponent (suppression définitive par niveau)', () => {
  let cmp: ProjectExplorerComponent;
  let service: jasmine.SpyObj<any>;
  let toast: jasmine.SpyObj<any>;

  beforeEach(() => {
    service = jasmine.createSpyObj('ProjectsService', [
      'permanentDeleteSsdgps', 'bulkPermanentDeleteSsdgps',
    ]);
    toast = jasmine.createSpyObj('ToastService', ['success', 'error', 'warning']);
    cmp = new ProjectExplorerComponent(
      service, {} as any, {} as any, {} as any, toast, new FormBuilder(), {} as any,
    );
    spyOn(cmp, 'loadLevel');
    cmp.level = 'ssdgps';
  });

  it('confirmPermanentDelete (unitaire) dispatche vers le service du niveau courant', () => {
    service.permanentDeleteSsdgps.and.returnValue(of(null));
    cmp.openPermanentDeleteModal({ id: '9' } as any);
    cmp.confirmPermanentDelete();
    expect(service.permanentDeleteSsdgps).toHaveBeenCalledWith('9');
    expect(toast.success).toHaveBeenCalled();
  });

  it('confirmPermanentDelete (masse) : partiel → toast warning', () => {
    service.bulkPermanentDeleteSsdgps.and.returnValue(of({ deleted_count: 1, errors: [{ id: 'b' }] }));
    cmp.selectedIds.add('a');
    cmp.selectedIds.add('b');
    cmp.openBulkPermanentDeleteModal();
    cmp.confirmPermanentDelete();
    expect(service.bulkPermanentDeleteSsdgps).toHaveBeenCalled();
    expect(toast.warning).toHaveBeenCalled();
  });
});
