/**
 * Assemblage client-side des déterminations (RDL + RDNₖ) en tableau brut RDIA.
 * Partagé entre l'assistant d'ajout et la page de modification d'une pièce.
 */
export interface DeterminationItem {
  label: string;      // « Libre » / « N°1 » / « N°2 »…
  rows: any[];        // lignes brutes (nom_point, x_m, sigma_x_m, y_m, sigma_y_m)
}

/** Élément « fichier de détermination » listé dans la modale d'import & assemblage. */
export interface DeterminationFileItem extends DeterminationItem {
  filename: string;       // nom lisible (fichier CSV/Excel ou titre du rapport HTML)
  count: number;          // nombre de points
  hasFixe: boolean;
  fixes: string[];        // nom(s) du/des point(s) fixe(s) — vide = détermination libre
  lastModified: number;   // date de dernière modification du fichier (ms)
}

export type DetSortKey = 'name' | 'modified' | 'fixe';

/** Libellé du/des point(s) fixe(s) d'une détermination, « Libre » si aucun. */
export function fixesLabel(item: { fixes: string[] }): string {
  return item.fixes && item.fixes.length ? item.fixes.join(', ') : 'Libre';
}

/**
 * Tri en place des fichiers de déterminations. La détermination libre (sans point fixe)
 * est TOUJOURS placée en premier ; les autres sont triées selon le critère et le sens.
 */
export function sortDeterminationItems(items: DeterminationFileItem[], key: DetSortKey, dir: 1 | -1): void {
  const opts: Intl.CollatorOptions = { numeric: true, sensitivity: 'base' };
  items.sort((a, b) => {
    if (!a.hasFixe !== !b.hasFixe) return a.hasFixe ? 1 : -1;  // libre d'abord
    let c = 0;
    if (key === 'name') c = a.filename.localeCompare(b.filename, undefined, opts);
    else if (key === 'modified') c = a.lastModified - b.lastModified;
    else c = fixesLabel(a).localeCompare(fixesLabel(b), undefined, opts);
    return c * dir;
  });
}

/**
 * (Ré)affecte les étiquettes selon la POSITION : « Libre » suit son fichier (détermination
 * sans point fixe), les autres reçoivent « N°1 », « N°2 »… figées dans l'ordre de la liste.
 */
export function relabelDeterminationItems(items: DeterminationFileItem[]): void {
  let k = 0;
  for (const it of items) {
    if (!it.hasFixe) { it.label = 'Libre'; }
    else { k += 1; it.label = `N°${k}`; }
  }
}

/** Empile les blocs dans l'ordre : `id` global re-séquencé + colonne `determination`. */
export function assembleDeterminationRows(items: DeterminationItem[]): any[] {
  const out: any[] = [];
  let id = 1;
  for (const it of items) {
    for (const r of it.rows || []) {
      out.push({
        id: String(id++),
        determination: it.label,
        nom_point: r.nom_point ?? '',
        x_m: r.x_m ?? '',
        sigma_x_m: r.sigma_x_m ?? '',
        y_m: r.y_m ?? '',
        sigma_y_m: r.sigma_y_m ?? '',
      });
    }
  }
  return out;
}
