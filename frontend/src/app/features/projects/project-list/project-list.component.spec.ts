import { FormBuilder } from '@angular/forms';
import { ProjectListComponent } from './project-list.component';

/**
 * Helpers purs de la liste des projets (getters, pagination). Instanciation directe : seul
 * `FormBuilder` est réel (utilisé dans le constructeur pour bâtir le formulaire) ; les autres
 * dépendances ne sont sollicitées qu'en ngOnInit, non appelé ici.
 */
describe('ProjectListComponent (getters & pagination)', () => {
  let cmp: ProjectListComponent;

  beforeEach(() => {
    cmp = new ProjectListComponent(
      {} as any, {} as any, {} as any, {} as any,
      new FormBuilder(), {} as any, {} as any, {} as any,
    );
  });

  it('projets suit l’onglet actif/supprimés + compteurs', () => {
    cmp.activeProjets = [{ id: 'a' }, { id: 'b' }] as any;
    cmp.deletedProjets = [{ id: 'c' }] as any;
    expect(cmp.activeCount).toBe(2);
    expect(cmp.deletedCount).toBe(1);

    cmp.showDeleted = false;
    expect(cmp.projets.length).toBe(2);
    cmp.showDeleted = true;
    expect(cmp.projets.length).toBe(1);
  });

  it('isAdmin vrai sans organisation courante', () => {
    cmp.currentOrgId = null;
    expect(cmp.isAdmin).toBeTrue();
    cmp.currentOrgId = 'org-1';
    expect(cmp.isAdmin).toBeFalse();
  });

  it('totalPages calcule le nombre de pages (min 1)', () => {
    cmp.pageSize = 10;
    cmp.filteredProjets = new Array(25).fill({}) as any;
    expect(cmp.totalPages).toBe(3);
    cmp.filteredProjets = [];
    expect(cmp.totalPages).toBe(1);
  });

  it('pageNumbers fournit une fenêtre autour de la page courante', () => {
    cmp.pageSize = 10;
    cmp.filteredProjets = new Array(100).fill({}) as any; // 10 pages
    cmp.currentPage = 5;
    expect(cmp.pageNumbers).toEqual([3, 4, 5, 6, 7]);
  });

  it('goToPage ignore les valeurs hors bornes', () => {
    cmp.pageSize = 10;
    cmp.filteredProjets = new Array(20).fill({}) as any; // 2 pages
    cmp.currentPage = 1;
    cmp.goToPage(99);
    expect(cmp.currentPage).toBe(1);
    cmp.goToPage(0);
    expect(cmp.currentPage).toBe(1);
  });
});
