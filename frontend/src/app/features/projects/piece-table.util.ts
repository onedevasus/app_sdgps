/**
 * Utilitaires des tableaux de données des pièces : détection du TYPE réel d'une colonne
 * (à partir du type catalogue et, à défaut, des valeurs) et comparateurs de tri adaptés.
 *
 * Beaucoup de types de pièces déclarent toutes leurs colonnes en `text` (RC, RDIA…) : le tri
 * doit néanmoins respecter la nature des données (un « X(m) » = 353 108.16 se trie comme un
 * nombre, pas comme une chaîne). On infère donc le type depuis les valeurs quand le catalogue
 * ne le précise pas.
 */

export type CellType = 'number' | 'date' | 'boolean' | 'string';

// Espaces (normale, insécable, fine insécable, fine) servant de séparateur de milliers.
const SPACES = /[\s   ]/g;
const EMPTY_TOKENS = new Set(['', '--', '?', '—']);
const BOOL_TRUE = new Set(['true', 'vrai', 'oui', 'yes', 'x']);
const BOOL_FALSE = new Set(['false', 'faux', 'non', 'no']);

/** Vrai si la valeur est « vide » au sens métier (à trier toujours en fin). */
export function isEmptyCell(value: any): boolean {
  if (value === null || value === undefined) return true;
  return EMPTY_TOKENS.has(String(value).trim());
}

/** « 353 108.16 » / « 353 108,16 » → 353108.16 ; null si non numérique. */
export function parseNumericTolerant(value: any): number | null {
  if (value === null || value === undefined) return null;
  let t = String(value).trim();
  if (EMPTY_TOKENS.has(t)) return null;
  t = t.replace(SPACES, '');
  if (t.includes(',') && !t.includes('.')) {
    t = t.replace(',', '.');            // virgule décimale « à la française »
  } else {
    t = t.replace(/,/g, '');            // virgule = séparateur de milliers
  }
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** oui/non, vrai/faux, true/false → booléen ; null sinon. */
export function parseBooleanTolerant(value: any): boolean | null {
  if (value === null || value === undefined) return null;
  const t = String(value).trim().toLowerCase();
  if (BOOL_TRUE.has(t)) return true;
  if (BOOL_FALSE.has(t)) return false;
  return null;
}

// Formats de date reconnus : ISO (aaaa-mm-jj[…]) et jj/mm/aaaa (séparateurs / - .).
const ISO_DATE = /^\d{4}-\d{2}-\d{2}([ T]\d{2}:\d{2}(:\d{2})?)?/;
const FR_DATE = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/;

/** Date reconnue → timestamp (ms) ; null sinon. Détection STRICTE (pas de `new Date(x)` laxiste
 * qui accepterait n'importe quel nombre). */
export function parseDateTolerant(value: any): number | null {
  if (value === null || value === undefined) return null;
  const t = String(value).trim();
  if (EMPTY_TOKENS.has(t)) return null;
  const fr = t.match(FR_DATE);
  if (fr) {
    const d = +fr[1], mo = +fr[2];
    const y = fr[3].length === 2 ? 2000 + +fr[3] : +fr[3];
    const dt = new Date(y, mo - 1, d);
    return isNaN(dt.getTime()) ? null : dt.getTime();
  }
  if (ISO_DATE.test(t)) {
    const dt = new Date(t.replace(' ', 'T'));
    return isNaN(dt.getTime()) ? null : dt.getTime();
  }
  return null;
}

/**
 * Type effectif d'une colonne : d'abord le type catalogue (`number`/`date`), sinon inféré des
 * valeurs non vides (toutes numériques → number ; toutes des dates → date ; toutes booléennes →
 * boolean ; sinon string).
 */
export function detectColumnType(champType: string | undefined, values: any[]): CellType {
  if (champType === 'number') return 'number';
  if (champType === 'date') return 'date';

  const nonEmpty = values.filter(v => !isEmptyCell(v));
  if (nonEmpty.length === 0) return 'string';
  if (nonEmpty.every(v => parseNumericTolerant(v) !== null)) return 'number';
  if (nonEmpty.every(v => parseDateTolerant(v) !== null)) return 'date';
  if (nonEmpty.every(v => parseBooleanTolerant(v) !== null)) return 'boolean';
  return 'string';
}

/**
 * Comparateur de deux lignes sur `field`, selon le `type` détecté et la direction. Les cellules
 * vides sont toujours renvoyées en fin, quelle que soit la direction.
 */
export function makeRowComparator(field: string, type: CellType, dir: 'asc' | 'desc') {
  const sign = dir === 'asc' ? 1 : -1;
  return (ra: Record<string, any>, rb: Record<string, any>): number => {
    const a = ra?.[field];
    const b = rb?.[field];
    const ea = isEmptyCell(a);
    const eb = isEmptyCell(b);
    if (ea && eb) return 0;
    if (ea) return 1;
    if (eb) return -1;

    let cmp = 0;
    if (type === 'number') {
      cmp = (parseNumericTolerant(a) ?? 0) - (parseNumericTolerant(b) ?? 0);
    } else if (type === 'date') {
      cmp = (parseDateTolerant(a) ?? 0) - (parseDateTolerant(b) ?? 0);
    } else if (type === 'boolean') {
      cmp = (parseBooleanTolerant(a) ? 1 : 0) - (parseBooleanTolerant(b) ? 1 : 0);
    } else {
      cmp = String(a).localeCompare(String(b), 'fr', { numeric: true, sensitivity: 'base' });
    }
    return sign * cmp;
  };
}

/** Icône FontAwesome de tri pour une colonne selon l'état de tri courant. */
export function sortIcon(active: boolean, dir: 'asc' | 'desc'): string {
  if (!active) return 'fas fa-sort';
  return dir === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down';
}

/** Libellé court du type d'une colonne (info-bulle de l'entête de tri). */
export function cellTypeLabel(type: CellType): string {
  return { number: 'Nombre', date: 'Date', boolean: 'Booléen', string: 'Texte' }[type];
}

/**
 * Résout les colonnes EFFECTIVES d'une vue à partir des champs du catalogue et de la liste
 * (ordonnée) des noms visibles configurés par l'opérateur (`piece_fields_config`). Renvoie
 * les champs filtrés + réordonnés selon `visibleNames`. Distingue deux cas « vides » :
 * - `visibleNames` ABSENTE (`null`/`undefined`) = toutes les colonnes du catalogue (ordre d'origine) ;
 * - `visibleNames` liste VIDE `[]` = AUCUNE colonne (l'opérateur a tout désactivé).
 *
 * Générique sur `T extends { name: string }` : réutilisable pour l'affichage (data-table)
 * comme pour la page de configuration.
 */
export function resolveViewChamps<T extends { name: string }>(
  champs: T[], visibleNames?: string[] | null): T[] {
  if (visibleNames == null) return champs;
  const byName = new Map(champs.map(c => [c.name, c]));
  return visibleNames
    .map(n => byName.get(n))
    .filter((c): c is T => !!c);
}
