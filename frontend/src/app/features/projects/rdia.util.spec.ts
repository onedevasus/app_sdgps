import {
  fixesLabel,
  sortDeterminationItems,
  relabelDeterminationItems,
  assembleDeterminationRows,
  DeterminationFileItem,
} from './rdia.util';

function makeItem(over: Partial<DeterminationFileItem>): DeterminationFileItem {
  return {
    label: '',
    rows: [],
    filename: 'f',
    count: 0,
    hasFixe: false,
    fixes: [],
    lastModified: 0,
    ...over,
  };
}

describe('rdia.util', () => {
  describe('fixesLabel', () => {
    it('joint les points fixes', () => {
      expect(fixesLabel({ fixes: ['P1', 'P2'] })).toBe('P1, P2');
    });
    it('renvoie « Libre » sans point fixe', () => {
      expect(fixesLabel({ fixes: [] })).toBe('Libre');
    });
  });

  describe('sortDeterminationItems', () => {
    it('place la détermination libre en premier', () => {
      const items = [
        makeItem({ filename: 'b', hasFixe: true, fixes: ['P1'] }),
        makeItem({ filename: 'a', hasFixe: false }),
      ];
      sortDeterminationItems(items, 'name', 1);
      expect(items[0].hasFixe).toBeFalse();
    });
    it('trie par nom (collation numérique)', () => {
      const items = [
        makeItem({ filename: 'det10', hasFixe: true, fixes: ['x'] }),
        makeItem({ filename: 'det2', hasFixe: true, fixes: ['x'] }),
      ];
      sortDeterminationItems(items, 'name', 1);
      expect(items.map(i => i.filename)).toEqual(['det2', 'det10']);
    });
    it('trie par date de modification et respecte la direction', () => {
      const items = [
        makeItem({ filename: 'a', hasFixe: true, fixes: ['x'], lastModified: 100 }),
        makeItem({ filename: 'b', hasFixe: true, fixes: ['x'], lastModified: 50 }),
      ];
      sortDeterminationItems(items, 'modified', -1);
      expect(items.map(i => i.lastModified)).toEqual([100, 50]);
    });
  });

  describe('relabelDeterminationItems', () => {
    it('étiquette « Libre » puis N°1, N°2 selon la position', () => {
      const items = [
        makeItem({ hasFixe: false }),
        makeItem({ hasFixe: true, fixes: ['P1'] }),
        makeItem({ hasFixe: true, fixes: ['P2'] }),
      ];
      relabelDeterminationItems(items);
      expect(items.map(i => i.label)).toEqual(['Libre', 'N°1', 'N°2']);
    });
  });

  describe('assembleDeterminationRows', () => {
    it('empile les blocs, re-séquence les id et ajoute la colonne determination', () => {
      const out = assembleDeterminationRows([
        { label: 'Libre', rows: [{ nom_point: 'A', x_m: '1', y_m: '2' }] },
        { label: 'N°1', rows: [{ nom_point: 'B' }] },
      ]);
      expect(out.length).toBe(2);
      expect(out[0]).toEqual({
        id: '1',
        determination: 'Libre',
        nom_point: 'A',
        x_m: '1',
        sigma_x_m: '',
        y_m: '2',
        sigma_y_m: '',
      });
      expect(out[1].id).toBe('2');
      expect(out[1].determination).toBe('N°1');
      expect(out[1].nom_point).toBe('B');
      expect(out[1].x_m).toBe('');
    });
    it('gère un bloc sans lignes', () => {
      expect(assembleDeterminationRows([{ label: 'Libre', rows: [] }])).toEqual([]);
    });
  });
});
