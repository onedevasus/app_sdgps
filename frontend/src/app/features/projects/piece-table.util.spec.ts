import {
  isEmptyCell,
  parseNumericTolerant,
  parseBooleanTolerant,
  parseDateTolerant,
  detectColumnType,
  makeRowComparator,
  sortIcon,
  cellTypeLabel,
  resolveViewChamps,
} from './piece-table.util';

describe('piece-table.util', () => {
  describe('isEmptyCell', () => {
    it('considère null/undefined comme vides', () => {
      expect(isEmptyCell(null)).toBeTrue();
      expect(isEmptyCell(undefined)).toBeTrue();
    });
    it('reconnaît les jetons vides métier', () => {
      expect(isEmptyCell('')).toBeTrue();
      expect(isEmptyCell('  --  ')).toBeTrue();
      expect(isEmptyCell('?')).toBeTrue();
      expect(isEmptyCell('—')).toBeTrue();
    });
    it('ne considère pas 0 ni du texte comme vides', () => {
      expect(isEmptyCell(0)).toBeFalse();
      expect(isEmptyCell('abc')).toBeFalse();
    });
  });

  describe('parseNumericTolerant', () => {
    it('gère les espaces séparateurs de milliers', () => {
      expect(parseNumericTolerant('353 108.16')).toBe(353108.16);
      expect(parseNumericTolerant('353 108.16')).toBe(353108.16);
    });
    it('gère la virgule décimale française', () => {
      expect(parseNumericTolerant('353108,16')).toBe(353108.16);
    });
    it('traite la virgule comme séparateur de milliers si un point est présent', () => {
      expect(parseNumericTolerant('1,234.56')).toBe(1234.56);
    });
    it('renvoie null pour vide ou non numérique', () => {
      expect(parseNumericTolerant('--')).toBeNull();
      expect(parseNumericTolerant('abc')).toBeNull();
      expect(parseNumericTolerant(null)).toBeNull();
    });
  });

  describe('parseBooleanTolerant', () => {
    it('reconnaît les valeurs vraies', () => {
      ['true', 'Vrai', 'OUI', 'yes', 'x'].forEach(v =>
        expect(parseBooleanTolerant(v)).toBeTrue()
      );
    });
    it('reconnaît les valeurs fausses', () => {
      ['false', 'Faux', 'NON', 'no'].forEach(v =>
        expect(parseBooleanTolerant(v)).toBeFalse()
      );
    });
    it('renvoie null pour le reste', () => {
      expect(parseBooleanTolerant('peut-être')).toBeNull();
      expect(parseBooleanTolerant(null)).toBeNull();
    });
  });

  describe('parseDateTolerant', () => {
    it('parse une date française jj/mm/aaaa', () => {
      expect(parseDateTolerant('15/03/2026')).toBe(new Date(2026, 2, 15).getTime());
    });
    it('parse une année sur 2 chiffres (20xx)', () => {
      expect(parseDateTolerant('01-01-26')).toBe(new Date(2026, 0, 1).getTime());
    });
    it('parse une date ISO', () => {
      expect(parseDateTolerant('2026-03-15')).toBe(new Date('2026-03-15').getTime());
    });
    it('rejette un simple nombre (pas de new Date laxiste)', () => {
      expect(parseDateTolerant('353108')).toBeNull();
      expect(parseDateTolerant('abc')).toBeNull();
      expect(parseDateTolerant('--')).toBeNull();
    });
  });

  describe('detectColumnType', () => {
    it('respecte le type catalogue number/date', () => {
      expect(detectColumnType('number', ['abc'])).toBe('number');
      expect(detectColumnType('date', ['abc'])).toBe('date');
    });
    it('infère number quand toutes les valeurs sont numériques', () => {
      expect(detectColumnType('text', ['353 108.16', '12,5', '--'])).toBe('number');
    });
    it('infère date quand toutes les valeurs sont des dates', () => {
      expect(detectColumnType(undefined, ['15/03/2026', '2026-01-01'])).toBe('date');
    });
    it('infère boolean quand toutes les valeurs sont booléennes', () => {
      expect(detectColumnType('text', ['oui', 'non', 'x'])).toBe('boolean');
    });
    it('retombe sur string pour un mélange ou une colonne vide', () => {
      expect(detectColumnType('text', ['abc', '12'])).toBe('string');
      expect(detectColumnType('text', ['', '--'])).toBe('string');
    });
  });

  describe('makeRowComparator', () => {
    it('trie numériquement en ascendant', () => {
      const cmp = makeRowComparator('v', 'number', 'asc');
      const rows = [{ v: '353 108.16' }, { v: '12' }, { v: '1 000' }];
      rows.sort(cmp);
      expect(rows.map(r => r.v)).toEqual(['12', '1 000', '353 108.16']);
    });
    it('inverse en descendant', () => {
      const cmp = makeRowComparator('v', 'number', 'desc');
      const rows = [{ v: '1' }, { v: '3' }, { v: '2' }];
      rows.sort(cmp);
      expect(rows.map(r => r.v)).toEqual(['3', '2', '1']);
    });
    it('place toujours les cellules vides en fin, même en descendant', () => {
      const cmp = makeRowComparator('v', 'number', 'desc');
      const rows = [{ v: null }, { v: '2' }, { v: '--' }, { v: '5' }];
      rows.sort(cmp);
      expect(rows.map(r => r.v).slice(0, 2)).toEqual(['5', '2']);
      expect(rows.slice(2).every(r => isEmptyCell(r.v))).toBeTrue();
    });
    it('trie les chaînes avec collation française numérique', () => {
      const cmp = makeRowComparator('v', 'string', 'asc');
      const rows = [{ v: 'item10' }, { v: 'item2' }];
      rows.sort(cmp);
      expect(rows.map(r => r.v)).toEqual(['item2', 'item10']);
    });
    it('trie les dates', () => {
      const cmp = makeRowComparator('v', 'date', 'asc');
      const rows = [{ v: '2026-05-01' }, { v: '2026-01-01' }];
      rows.sort(cmp);
      expect(rows.map(r => r.v)).toEqual(['2026-01-01', '2026-05-01']);
    });
  });

  describe('sortIcon', () => {
    it('renvoie l’icône neutre si inactif', () => {
      expect(sortIcon(false, 'asc')).toBe('fas fa-sort');
    });
    it('renvoie l’icône selon la direction si actif', () => {
      expect(sortIcon(true, 'asc')).toBe('fas fa-sort-up');
      expect(sortIcon(true, 'desc')).toBe('fas fa-sort-down');
    });
  });

  describe('cellTypeLabel', () => {
    it('mappe les libellés français', () => {
      expect(cellTypeLabel('number')).toBe('Nombre');
      expect(cellTypeLabel('date')).toBe('Date');
      expect(cellTypeLabel('boolean')).toBe('Booléen');
      expect(cellTypeLabel('string')).toBe('Texte');
    });
  });

  describe('resolveViewChamps', () => {
    const champs = [{ name: 'a' }, { name: 'b' }, { name: 'c' }];
    it('renvoie tout le catalogue quand visibleNames est absent', () => {
      expect(resolveViewChamps(champs, null)).toBe(champs);
      expect(resolveViewChamps(champs, undefined)).toBe(champs);
    });
    it('renvoie aucune colonne pour une liste vide', () => {
      expect(resolveViewChamps(champs, [])).toEqual([]);
    });
    it('filtre et réordonne selon visibleNames', () => {
      expect(resolveViewChamps(champs, ['c', 'a']).map(c => c.name)).toEqual(['c', 'a']);
    });
    it('ignore les noms inconnus', () => {
      expect(resolveViewChamps(champs, ['a', 'zzz']).map(c => c.name)).toEqual(['a']);
    });
  });
});
