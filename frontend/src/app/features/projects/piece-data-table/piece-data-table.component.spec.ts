import { Component } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { PieceDataTableComponent } from './piece-data-table.component';

/**
 * Hôte reproduisant les conditions de la régression « page blanche + spinner » :
 * - le tableau éditable est placé DANS un <form> (le ngModel des cellules doit être `standalone`
 *   sinon Angular lève une erreur au rendu) ;
 * - `champs` est un GETTER qui renvoie un nouveau tableau à chaque cycle de détection (comme
 *   `visibleChamps` avant mémoïsation) → doit rester supporté sans ExpressionChanged / boucle.
 */
@Component({
  template: `
    <form>
      <app-piece-data-table [editable]="true" [champs]="unstableChamps" [rows]="rows"
                            (rowsChange)="rows = $event"></app-piece-data-table>
    </form>
  `,
})
class HostComponent {
  rows: any[] = [{ x_m: '10', nom: 'B' }, { x_m: '9', nom: 'A' }];
  // Nouvelle référence à chaque accès (piège de détection de changement).
  get unstableChamps() {
    return [
      { name: 'x_m', label: 'X(m)', type: 'number' },
      { name: 'nom', label: 'Nom', type: 'text' },
    ];
  }
}

describe('PieceDataTableComponent (régression modifier)', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PieceDataTableComponent, HostComponent],
      imports: [CommonModule, FormsModule],
    }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
  });

  it('se rend en mode édition dans un <form> avec un @Input `champs` instable, sans erreur', () => {
    // detectChanges lève ExpressionChangedAfterItHasBeenChecked / l'erreur ngModel-in-form si la
    // régression était présente. Plusieurs passes simulent les cycles répétés.
    expect(() => {
      fixture.detectChanges();
      fixture.detectChanges();
      fixture.detectChanges();
    }).not.toThrow();

    const table = fixture.nativeElement.querySelector('.pdt-table');
    expect(table).withContext('le tableau doit être rendu (pas de page blanche)').toBeTruthy();
    const inputs = fixture.nativeElement.querySelectorAll('.pdt-table td input');
    expect(inputs.length).withContext('cellules éditables présentes').toBeGreaterThan(0);
  });

  it('trie la colonne numérique selon la valeur (9 avant 10), pas alphabétiquement', () => {
    fixture.detectChanges();
    const cmp: PieceDataTableComponent =
      fixture.debugElement.children[0].children[0].componentInstance;
    cmp.sortBy('x_m');
    fixture.detectChanges();
    expect(cmp.paginated.map((r: any) => r.x_m)).toEqual(['9', '10']);
  });
});

describe('PieceDataTableComponent — gestion des colonnes', () => {
  let cmp: PieceDataTableComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PieceDataTableComponent],
      imports: [CommonModule, FormsModule],
    }).compileComponents();
    const fixture = TestBed.createComponent(PieceDataTableComponent);
    cmp = fixture.componentInstance;
    cmp.champs = [
      { name: 'a', label: 'A', type: 'text' },
      { name: 'b', label: 'B', type: 'number' },
      { name: 'c', label: 'C', type: 'text' },
    ];
    cmp.rows = [{ a: '1', b: '2', c: '3' }];
    cmp.ngOnChanges({ champs: {} as any, rows: {} as any });
  });

  const names = () => cmp.columns.map(c => c.name);

  it('4 boutons de réordonnancement déplacent la colonne', () => {
    cmp.moveColumnToBottom(cmp.columns[0]);          // A en dernier
    expect(names()).toEqual(['b', 'c', 'a']);
    cmp.moveColumnToTop(cmp.columns[2]);             // A revient en tête
    expect(names()).toEqual(['a', 'b', 'c']);
    cmp.moveColumnDown(cmp.columns[0]);              // A descend d'un cran
    expect(names()).toEqual(['b', 'a', 'c']);
    cmp.moveColumnUp(cmp.columns[1]);                // A remonte
    expect(names()).toEqual(['a', 'b', 'c']);
  });

  it('bornes de réordonnancement (premier/dernier)', () => {
    expect(cmp.isFirstColumn(cmp.columns[0])).toBeTrue();
    expect(cmp.isLastColumn(cmp.columns[2])).toBeTrue();
    cmp.moveColumnUp(cmp.columns[0]);                // no-op sur le premier
    expect(names()).toEqual(['a', 'b', 'c']);
  });

  it('émet sortChange [{field,dir}] sur un tri manuel (pour persistance PDF)', () => {
    const events: any[] = [];
    cmp.sortChange.subscribe((e: any) => events.push(e));
    cmp.sortBy('b');            // 1er clic → asc
    cmp.sortBy('b');            // 2e clic → desc
    cmp.sortBy('a');            // autre colonne → asc (remplace le niveau de tri)
    expect(events).toEqual([
      [{ field: 'b', dir: 'asc' }],
      [{ field: 'b', dir: 'desc' }],
      [{ field: 'a', dir: 'asc' }],
    ]);
  });

  it('stats et description de colonne', () => {
    expect(cmp.getColumnStats()).toEqual({ total: 3, visible: 3, hidden: 0 });
    cmp.toggleColumnVisibility('a');
    expect(cmp.getColumnStats()).toEqual({ total: 3, visible: 2, hidden: 1 });
    expect(cmp.columnDescription(cmp.columns[1])).toContain('« b »');   // nom technique
    expect(cmp.columnDescription(cmp.columns[1]).toLowerCase()).toContain('nombre'); // type détecté
  });
});

describe('PieceDataTableComponent — pagination', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PieceDataTableComponent],
      imports: [CommonModule, FormsModule],
    }).compileComponents();
  });

  function make(rowsCount: number) {
    const fixture = TestBed.createComponent(PieceDataTableComponent);
    const cmp = fixture.componentInstance;
    cmp.champs = [{ name: 'n', label: 'N', type: 'number' }];
    cmp.rows = Array.from({ length: rowsCount }, (_, i) => ({ n: String(i) }));
    cmp.ngOnChanges({ champs: {} as any, rows: {} as any });
    fixture.detectChanges();
    return { fixture, cmp };
  }
  const bodyRows = (fixture: any) =>
    fixture.nativeElement.querySelectorAll('.pdt-table tbody tr').length;

  it('n\'affiche que `pageSize` lignes et le select « Lignes / page » gouverne le nombre affiché', fakeAsync(() => {
    const { fixture, cmp } = make(30);
    flushMicrotasks();            // ngModel écrit la sélection initiale du <select> de façon asynchrone
    fixture.detectChanges();

    // défaut 10 → 10 lignes affichées sur 30, 3 pages
    expect(cmp.pageSize).toBe(10);
    expect(bodyRows(fixture)).toBe(10);
    expect(cmp.totalPages).toBe(3);

    // le select reflète bien la valeur courante (ngModel)
    const select: HTMLSelectElement = fixture.nativeElement.querySelector('.pdt-page-size select');
    expect(select).withContext('le select de pagination existe').toBeTruthy();
    expect(select.options[select.selectedIndex].text).toBe('10');

    // changer le select → 25 : le tableau affiche 25 lignes
    select.selectedIndex = 1; // option « 25 »
    select.dispatchEvent(new Event('change'));
    flushMicrotasks();
    fixture.detectChanges();

    expect(cmp.pageSize).toBe(25);
    expect(cmp.totalPages).toBe(2);
    expect(bodyRows(fixture)).withContext('le tableau doit afficher 25 lignes').toBe(25);
  }));

  it('petit jeu de données : toutes les lignes tiennent sur une page', () => {
    const { fixture, cmp } = make(6);
    expect(cmp.totalPages).toBe(1);
    expect(bodyRows(fixture)).toBe(6);
  });
});

describe('PieceDataTableComponent — statistiques (statsChange / showStats)', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PieceDataTableComponent],
      imports: [CommonModule, FormsModule],
    }).compileComponents();
  });

  it('émet les stats (différé) et masque le compteur intégré quand showStats=false', fakeAsync(() => {
    const fixture = TestBed.createComponent(PieceDataTableComponent);
    const cmp = fixture.componentInstance;
    let stats: any = null;
    cmp.statsChange.subscribe((s: any) => (stats = s));
    cmp.showStats = false;
    cmp.champs = [{ name: 'a', label: 'A', type: 'text' }];
    cmp.rows = [{ a: '1' }, { a: '2' }, { a: '3' }];
    cmp.ngOnChanges({ champs: {} as any, rows: {} as any });
    fixture.detectChanges();
    flushMicrotasks(); // l'émission est différée (microtâche)

    expect(stats).toEqual({ total: 3, filtered: 3, selected: 0 });
    expect(fixture.nativeElement.querySelector('.pdt-counts'))
      .withContext('le compteur intégré doit être masqué').toBeNull();
  }));
});
