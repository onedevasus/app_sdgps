import { FormBuilder } from '@angular/forms';
import { of } from 'rxjs';
import { UserListComponent } from './user-list.component';

/**
 * Pagination de la liste des utilisateurs. Le constructeur utilise authService.getUserId()
 * et FormBuilder → on fournit un stub minimal + un vrai FormBuilder ; le reste est factice.
 */
describe('UserListComponent (pagination)', () => {
  let cmp: UserListComponent;

  beforeEach(() => {
    const authStub = { getUserId: () => null } as any;
    cmp = new UserListComponent(
      {} as any, {} as any, {} as any, {} as any,
      authStub, {} as any, new FormBuilder(), {} as any,
    );
  });

  it('totalPages (min 1)', () => {
    cmp.pageSize = 10;
    cmp.filteredUsers = new Array(23).fill({}) as any;
    expect(cmp.totalPages).toBe(3);
    cmp.filteredUsers = [];
    expect(cmp.totalPages).toBe(1);
  });

  it('pageNumbers = fenêtre autour de la page courante', () => {
    cmp.pageSize = 10;
    cmp.filteredUsers = new Array(100).fill({}) as any; // 10 pages
    cmp.currentPage = 6;
    expect(cmp.pageNumbers).toEqual([4, 5, 6, 7, 8]);
  });

  it('goToPage borne les valeurs', () => {
    cmp.pageSize = 10;
    cmp.filteredUsers = new Array(20).fill({}) as any; // 2 pages
    cmp.currentPage = 1;
    cmp.goToPage(99);
    expect(cmp.currentPage).toBe(1);
  });
});

describe('UserListComponent (onglets & suppression définitive)', () => {
  let cmp: UserListComponent;
  let userService: jasmine.SpyObj<any>;
  let toast: jasmine.SpyObj<any>;

  beforeEach(() => {
    userService = jasmine.createSpyObj('UserService', [
      'permanentDeleteUser', 'bulkPermanentDeleteUsers', 'getUsers',
    ]);
    toast = jasmine.createSpyObj('ToastService', ['success', 'error']);
    cmp = new UserListComponent(
      userService, {} as any, {} as any, toast,
      { getUserId: () => null } as any, {} as any, new FormBuilder(), {} as any,
    );
    spyOn<any>(cmp, 'savePreferences');
    spyOn(cmp, 'loadUsers');
    cmp.users = [
      { id: '1', is_deleted: false, is_active: true },
      { id: '2', is_deleted: true },
      { id: '3', is_deleted: true },
    ] as any;
  });

  it('compteurs actifs / supprimés', () => {
    expect(cmp.nonDeletedCount).toBe(1);
    expect(cmp.deletedUsersCount).toBe(2);
  });

  it('setTab(true) filtre la corbeille', () => {
    cmp.setTab(true);
    expect(cmp.showDeleted).toBeTrue();
    expect(cmp.filteredUsers.every(u => (u as any).is_deleted)).toBeTrue();
  });

  it('setTab(false) filtre les non supprimés', () => {
    cmp.setTab(true);
    cmp.setTab(false);
    expect(cmp.showDeleted).toBeFalse();
    expect(cmp.filteredUsers.every(u => !(u as any).is_deleted)).toBeTrue();
  });

  it('openBulkPermanentDeleteModal refuse sans sélection', () => {
    cmp.selectedIds.clear();
    cmp.openBulkPermanentDeleteModal();
    expect(cmp.showPermanentDeleteModal).toBeFalse();
  });

  it('confirmPermanentDelete (unitaire) appelle le service', () => {
    userService.permanentDeleteUser.and.returnValue(of(null));
    cmp.openPermanentDeleteModal({ id: '2' } as any);
    cmp.confirmPermanentDelete();
    expect(userService.permanentDeleteUser).toHaveBeenCalledWith('2');
    expect(toast.success).toHaveBeenCalled();
  });

  it('confirmPermanentDelete (masse) appelle bulkPermanentDeleteUsers', () => {
    userService.bulkPermanentDeleteUsers.and.returnValue(of({ deleted_count: 2, errors: [] }));
    cmp.selectedIds.add('2');
    cmp.selectedIds.add('3');
    cmp.openBulkPermanentDeleteModal();
    cmp.confirmPermanentDelete();
    expect(userService.bulkPermanentDeleteUsers).toHaveBeenCalled();
  });
});
