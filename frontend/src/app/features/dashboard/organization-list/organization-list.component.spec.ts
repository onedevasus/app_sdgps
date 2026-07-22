import { of } from 'rxjs';
import { OrganizationListComponent } from './organization-list.component';

/**
 * Helpers purs de la liste des organisations (filtres, tri, sélection, pagination, badges).
 * Instanciation directe : les dépendances ne sont sollicitées qu'en ngOnInit / appels API.
 */
describe('OrganizationListComponent (logique)', () => {
  let cmp: OrganizationListComponent;

  const orgs = [
    { id: '1', code: 'ORG-A', name: 'Alpha', type: 'PUBLIC', email: 'a@x.ma', member_count: 3, is_active: true },
    { id: '2', code: 'ORG-B', name: 'Beta', type: 'PRIVATE', email: 'b@x.ma', member_count: 1, is_active: false },
    { id: '3', code: 'ORG-C', name: 'Gamma', type: 'PUBLIC', email: 'c@x.ma', member_count: 7, is_active: true },
  ] as any[];

  beforeEach(() => {
    cmp = new OrganizationListComponent(
      {} as any, {} as any, {} as any,
      { markForCheck: () => {} } as any,
      {} as any, {} as any,
    );
    cmp.organizations = [...orgs];
    cmp.filteredOrganizations = [...orgs];
  });

  describe('recherche & tri', () => {
    it('filtre par requête (nom/code/email)', () => {
      cmp.searchQuery = 'beta';
      (cmp as any).applyFiltersAndSort();
      expect(cmp.filteredOrganizations.map(o => o.id)).toEqual(['2']);
    });
    it('trie par colonne et bascule la direction', () => {
      cmp.sort('member_count');
      expect(cmp.filteredOrganizations.map(o => o.member_count)).toEqual([1, 3, 7]);
      cmp.sort('member_count'); // re-clic → desc
      expect(cmp.filteredOrganizations.map(o => o.member_count)).toEqual([7, 3, 1]);
    });
    it('getSortIcon reflète l’état', () => {
      expect(cmp.getSortIcon('name')).toBe('fas fa-sort');
      cmp.sort('name');
      expect(cmp.getSortIcon('name')).toBe('fas fa-sort-up');
    });
  });

  describe('sélection', () => {
    it('toggleSelection ajoute puis retire', () => {
      cmp.toggleSelection('1');
      expect(cmp.selectedOrganizations.has('1')).toBeTrue();
      cmp.toggleSelection('1');
      expect(cmp.selectedOrganizations.has('1')).toBeFalse();
    });
    it('selectAll / isAllSelected / deselectAll', () => {
      cmp.selectAll();
      expect(cmp.isAllSelected()).toBeTrue();
      cmp.deselectAll();
      expect(cmp.selectedOrganizations.size).toBe(0);
    });
    it('invertSelection inverse la sélection', () => {
      cmp.selectedOrganizations.add('1');
      cmp.invertSelection();
      expect(Array.from(cmp.selectedOrganizations).sort()).toEqual(['2', '3']);
    });
    it('toggleSelectAll bascule tout', () => {
      cmp.toggleSelectAll();
      expect(cmp.isAllSelected()).toBeTrue();
      cmp.toggleSelectAll();
      expect(cmp.selectedOrganizations.size).toBe(0);
    });
  });

  describe('colonnes', () => {
    it('toggleColumnVisibility inverse la visibilité', () => {
      const before = cmp.columns[0].visible;
      cmp.toggleColumnVisibility(cmp.columns[0].field);
      expect(cmp.columns[0].visible).toBe(!before);
    });
    it('getColumnStats', () => {
      const stats = cmp.getColumnStats();
      expect(stats.total).toBe(cmp.columns.length);
      expect(stats.visible + stats.hidden).toBe(stats.total);
    });
    it('moveColumnUp / moveColumnToTop', () => {
      const second = cmp.columns[1].field;
      cmp.moveColumnToTop(1);
      expect(cmp.columns[0].field).toBe(second);
    });
    it('getFilteredColumns selon columnFilter', () => {
      cmp.columnFilter = 'visible';
      expect(cmp.getFilteredColumns().every(c => c.visible)).toBeTrue();
    });
  });

  describe('pagination', () => {
    beforeEach(() => {
      cmp.filteredOrganizations = new Array(23).fill(null).map((_, i) => ({ id: String(i) })) as any;
      cmp.pageSize = 5;
    });
    it('totalPages arrondit vers le haut', () => {
      expect(cmp.totalPages).toBe(5);
    });
    it('paginatedOrganizations découpe la page courante', () => {
      cmp.currentPage = 2;
      expect(cmp.paginatedOrganizations.length).toBe(5);
      expect(cmp.paginatedOrganizations[0].id).toBe('5');
    });
    it('nextPage / prevPage bornent', () => {
      cmp.currentPage = 5;
      cmp.nextPage();
      expect(cmp.currentPage).toBe(5);
      cmp.currentPage = 1;
      cmp.prevPage();
      expect(cmp.currentPage).toBe(1);
    });
    it('setPageSize revient page 1', () => {
      cmp.currentPage = 3;
      cmp.setPageSize(10);
      expect(cmp.pageSize).toBe(10);
      expect(cmp.currentPage).toBe(1);
    });
    it('getPageNumbers limite la fenêtre à 5', () => {
      cmp.currentPage = 3;
      expect(cmp.getPageNumbers().length).toBeLessThanOrEqual(5);
    });
  });

  describe('badges & formatage', () => {
    it('getStatusText / getStatusBadgeClass', () => {
      expect(cmp.getStatusText(true)).toBe('Active');
      expect(cmp.getStatusBadgeClass(false)).toContain('danger');
    });
    it('getTypeBadgeClass', () => {
      expect(cmp.getTypeBadgeClass('PRIVATE')).toContain('primary');
      expect(cmp.getTypeBadgeClass('PUBLIC')).toContain('info');
    });
    it('formatTypeDisplay mappe public/privé', () => {
      expect(cmp.formatTypeDisplay('PUBLIC', 'x')).toBe('Administration');
      expect(cmp.formatTypeDisplay('PRIVATE', 'x')).toBe('Entreprise');
      expect(cmp.formatTypeDisplay('AUTRE', 'Libellé')).toBe('Libellé');
    });
    it('getTestDataText', () => {
      expect(cmp.getTestDataText(true)).toBe('TEST');
      expect(cmp.getTestDataText(false)).toBe('RÉEL');
    });
    it('formatDate renvoie un tiret si vide', () => {
      expect(cmp.formatDate('')).toBe('-');
      expect(cmp.formatDate('2026-07-21T10:00:00Z')).toContain('2026');
    });
    it('getTypeLabel mappe les types de colonne', () => {
      expect(cmp.getTypeLabel('number')).toBe('Nombre');
      expect(cmp.getTypeLabel(undefined)).toBe('Texte');
    });
  });

  describe('canCreateOrganization (rôle JWT)', () => {
    afterEach(() => localStorage.clear());
    function jwt(payload: object): string { return `x.${btoa(JSON.stringify(payload))}.y`; }

    it('vrai pour un Admin Système', () => {
      localStorage.setItem('authToken', jwt({ platform_role: 'ROLE_ADMIN_SYSTEME' }));
      expect(cmp.canCreateOrganization).toBeTrue();
    });
    it('faux pour un agent', () => {
      localStorage.setItem('authToken', jwt({ role: 'ROLE_ORGANISATION_AGENT' }));
      expect(cmp.canCreateOrganization).toBeFalse();
    });
    it('faux sans token (repli agent)', () => {
      localStorage.clear();
      expect(cmp.canCreateOrganization).toBeFalse();
    });
  });

  describe('onglets Actifs / Corbeille & suppression définitive', () => {
    let orgService: jasmine.SpyObj<any>;
    let toast: jasmine.SpyObj<any>;

    beforeEach(() => {
      orgService = jasmine.createSpyObj('OrganizationService', [
        'getOrganizations', 'restoreOrganization', 'bulkRestoreOrganizations',
        'permanentDeleteOrganization', 'bulkPermanentDeleteOrganizations',
      ]);
      toast = jasmine.createSpyObj('ToastService', ['success', 'error']);
      cmp = new OrganizationListComponent(
        orgService, {} as any, {} as any, { markForCheck: () => {} } as any, {} as any, toast,
      );
      cmp.activeOrganizations = [{ id: '1', name: 'Active' }] as any;
      cmp.deletedOrganizations = [{ id: '2', name: 'Deleted' }] as any;
      cmp.organizations = cmp.activeOrganizations;
    });

    it('compteurs actifs/supprimés', () => {
      expect(cmp.activeCount).toBe(1);
      expect(cmp.deletedCount).toBe(1);
    });

    it('setTab bascule vers la corbeille', () => {
      cmp.setTab(true);
      expect(cmp.showDeleted).toBeTrue();
      expect(cmp.organizations).toBe(cmp.deletedOrganizations);
    });

    it('openBulkRestore refuse sans sélection', () => {
      cmp.selectedOrganizations.clear();
      cmp.openBulkRestore();
      expect(cmp.showRestoreModal).toBeFalse();
    });

    it('confirmRestore (unitaire) appelle le service', () => {
      orgService.restoreOrganization.and.returnValue(of({}));
      orgService.getOrganizations.and.returnValue(of([]));
      cmp.openRestore({ id: '2', name: 'X' } as any);
      cmp.confirmRestore();
      expect(orgService.restoreOrganization).toHaveBeenCalledWith('2');
    });

    it('confirmPermanentDelete (masse) appelle bulkPermanentDelete', () => {
      orgService.bulkPermanentDeleteOrganizations.and.returnValue(of({ deleted_count: 2, errors: [] }));
      orgService.getOrganizations.and.returnValue(of([]));
      cmp.selectedOrganizations.add('a');
      cmp.selectedOrganizations.add('b');
      cmp.openBulkPermanentDelete();
      cmp.confirmPermanentDelete();
      expect(orgService.bulkPermanentDeleteOrganizations).toHaveBeenCalled();
    });

    it('openPermanentDelete arme la cible unitaire', () => {
      cmp.openPermanentDelete({ id: '2', name: 'X' } as any);
      expect(cmp.showPermanentDeleteModal).toBeTrue();
      expect(cmp.isBulkPermanent).toBeFalse();
    });
  });
});
