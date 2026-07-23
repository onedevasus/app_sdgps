import { PieceSortSettingsComponent } from './piece-sort-settings.component';

describe('PieceSortSettingsComponent (logique)', () => {
  let cmp: PieceSortSettingsComponent;
  let toastr: jasmine.SpyObj<{ info: any; success: any; error: any }>;

  function row(over: any = {}): any {
    return {
      code: 'RDL', nom: 'Rattachement',
      champs: [{ name: 'x', label: 'X' }, { name: 'y', label: 'Y' }],
      levels: [], hasEcarts: false, ecartsChamps: [], ecartsLevels: [],
      ...over,
    };
  }

  beforeEach(() => {
    toastr = jasmine.createSpyObj('ToastrService', ['info', 'success', 'error']);
    cmp = new PieceSortSettingsComponent({} as any, {} as any, toastr as any);
    spyOn<any>(cmp, 'queueAutoSave'); // neutralise l'enregistrement auto (setTimeout)
  });

  describe('accordéon & isSortable', () => {
    it('toggleType / isCollapsed', () => {
      cmp.toggleType('RDL');
      expect(cmp.isCollapsed('RDL')).toBeTrue();
      cmp.toggleType('RDL');
      expect(cmp.isCollapsed('RDL')).toBeFalse();
    });
    it('isSortable vrai si champs ou écarts', () => {
      expect(cmp.isSortable(row())).toBeTrue();
      expect(cmp.isSortable(row({ champs: [], hasEcarts: false }))).toBeFalse();
      expect(cmp.isSortable(row({ champs: [], hasEcarts: true }))).toBeTrue();
    });
  });

  describe('niveaux de tri', () => {
    it('addLevel ajoute un niveau vide', () => {
      const t = row();
      cmp.addLevel(t);
      expect(t.levels).toEqual([{ field: '', dir: 'asc' }]);
    });
    it('removeLevel retire par index', () => {
      const t = row({ levels: [{ field: 'x', dir: 'asc' }, { field: 'y', dir: 'asc' }] });
      cmp.removeLevel(t, 0);
      expect(t.levels).toEqual([{ field: 'y', dir: 'asc' }]);
    });
    it('moveLevelUp / moveLevelDown réordonnent', () => {
      const t = row({ levels: [{ field: 'x', dir: 'asc' }, { field: 'y', dir: 'asc' }] });
      cmp.moveLevelDown(t, 0);
      expect(t.levels.map((l: any) => l.field)).toEqual(['y', 'x']);
      cmp.moveLevelUp(t, 1);
      expect(t.levels.map((l: any) => l.field)).toEqual(['x', 'y']);
    });
    it('moveLevelUp ignore le premier / moveLevelDown le dernier', () => {
      const t = row({ levels: [{ field: 'x', dir: 'asc' }] });
      cmp.moveLevelUp(t, 0);
      cmp.moveLevelDown(t, 0);
      expect(t.levels).toEqual([{ field: 'x', dir: 'asc' }]);
    });
    it('hasSort vrai dès qu’un champ est choisi', () => {
      expect(cmp.hasSort(row({ levels: [{ field: '', dir: 'asc' }] }))).toBeFalse();
      expect(cmp.hasSort(row({ levels: [{ field: 'x', dir: 'asc' }] }))).toBeTrue();
    });
    it('levelsSummary résume les niveaux valides', () => {
      expect(cmp.levelsSummary(row())).toContain('Aucun tri');
      const s = cmp.levelsSummary(row({ levels: [{ field: 'x', dir: 'desc' }] }));
      expect(s).toContain('X');
      expect(s).toContain('↓');
    });
    it('fieldsFor exclut les champs pris par d’autres niveaux', () => {
      const l1 = { field: 'x', dir: 'asc' as const };
      const l2 = { field: '', dir: 'asc' as const };
      const t = row({ levels: [l1, l2] });
      const available = cmp.fieldsFor(t, l2).map((c: any) => c.name);
      expect(available).toEqual(['y']);
    });
  });

  describe('sélection de pièces', () => {
    beforeEach(() => {
      cmp.sortableGroups = [
        { ssdgpsId: 's1', ssdgpsLabel: 'S1', pieces: [{ id: 'a' }, { id: 'b' }] },
        { ssdgpsId: 's2', ssdgpsLabel: 'S2', pieces: [{ id: 'c' }] },
      ] as any;
    });

    it('sortableCount somme toutes les pièces', () => {
      expect(cmp.sortableCount).toBe(3);
    });
    it('togglePiece ajoute puis retire', () => {
      cmp.togglePiece('a');
      expect(cmp.isPieceSelected('a')).toBeTrue();
      cmp.togglePiece('a');
      expect(cmp.isPieceSelected('a')).toBeFalse();
    });
    it('toggleGroupSelection coche/décoche tout un groupe', () => {
      const g = cmp.sortableGroups[0];
      cmp.toggleGroupSelection(g);
      expect(cmp.isGroupSelected(g)).toBeTrue();
      cmp.toggleGroupSelection(g);
      expect(cmp.isGroupSelected(g)).toBeFalse();
    });
    it('toggleSelectAll / allSelected', () => {
      expect(cmp.allSelected).toBeFalse();
      cmp.toggleSelectAll();
      expect(cmp.allSelected).toBeTrue();
      cmp.toggleSelectAll();
      expect(cmp.selectedIds.size).toBe(0);
    });
    it('pieceLabel compose type + numéro + session', () => {
      const label = cmp.pieceLabel({
        type_nom: 'Rattachement', type_piece: 'RDL', numero: 2, session_numero: 1,
      } as any);
      expect(label).toBe('Rattachement (RDL) n°2 — session n°1');
    });
  });

  describe('confirmation d’application', () => {
    it('askApply(selected) refuse sans sélection', () => {
      cmp.askApply('selected');
      expect(toastr.info).toHaveBeenCalled();
      expect(cmp.confirmOpen).toBeFalse();
    });
    it('askApply(selected) ouvre la modale avec sélection', () => {
      cmp.selectedIds.add('a');
      cmp.askApply('selected');
      expect(cmp.confirmOpen).toBeTrue();
      expect(cmp.applyScope).toBe('selected');
    });
    it('applyCount suit le scope', () => {
      cmp.sortableGroups = [{ pieces: [{ id: 'a' }, { id: 'b' }] }] as any;
      cmp.selectedIds.add('a');
      cmp.applyScope = 'all';
      expect(cmp.applyCount).toBe(2);
      cmp.applyScope = 'selected';
      expect(cmp.applyCount).toBe(1);
    });
  });
});
