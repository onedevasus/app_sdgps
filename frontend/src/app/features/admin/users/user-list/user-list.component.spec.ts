import { FormBuilder } from '@angular/forms';
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
