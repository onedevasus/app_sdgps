import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, shareReplay, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

/** Un niveau de tri (champ + sens). */
export interface PieceSortEntry { field: string; dir: 'asc' | 'desc'; }
/** Tri à deux versions (pièces RDL/RDN/RDIA) : version brute + version des écarts. */
export interface PieceSortVersions { brut: PieceSortEntry[]; ecarts: PieceSortEntry[]; }
/**
 * `{ '<TYPE_PIECE>': <entrée> }` où `<entrée>` est soit une liste de niveaux (version brute
 * uniquement), soit un objet `{ brut, ecarts }` pour les types à deux versions.
 */
export type PieceSortConfig = { [type: string]: PieceSortEntry[] | PieceSortVersions };

/** Normalise une entrée (ancienne forme objet unique OU liste) en liste de niveaux valides. */
export function normalizeSortLevels(entry: any): PieceSortEntry[] {
  if (!entry) return [];
  const list = Array.isArray(entry) ? entry : [entry];
  return list
    .filter(e => e && e.field)
    .map(e => ({ field: e.field, dir: e.dir === 'desc' ? 'desc' : 'asc' } as PieceSortEntry));
}

/** Vrai si l'entrée est la forme à deux versions `{ brut, ecarts }` (et non une liste). */
function isVersionsEntry(entry: any): boolean {
  return !!entry && typeof entry === 'object' && !Array.isArray(entry)
    && ('brut' in entry || 'ecarts' in entry);
}

/** Éclate une entrée de config/tri en ses deux versions normalisées `{ brut, ecarts }`. */
export function sortVersions(entry: any): PieceSortVersions {
  if (isVersionsEntry(entry)) {
    return { brut: normalizeSortLevels(entry.brut), ecarts: normalizeSortLevels(entry.ecarts) };
  }
  return { brut: normalizeSortLevels(entry), ecarts: [] };
}

/** Niveaux de tri de la version brute d'une entrée (liste ou objet à deux versions). */
export function brutSortLevels(entry: any): PieceSortEntry[] { return sortVersions(entry).brut; }
/** Niveaux de tri de la version écarts d'une entrée (vide si pas de version écarts). */
export function ecartsSortLevels(entry: any): PieceSortEntry[] { return sortVersions(entry).ecarts; }

/**
 * Préférences de tri par défaut des tableaux de pièces de l'opérateur connecté.
 * Endpoint : GET/PUT /api/auth/me/piece-sort-config/. Utilisé (1) comme tri initial des
 * tableaux interactifs, (2) côté serveur pour ordonner les tableaux du rapport PDF.
 */
@Injectable({ providedIn: 'root' })
export class PieceSortConfigService {
  private url = `${environment.apiUrl}/auth/me/piece-sort-config/`;
  private cache$?: Observable<PieceSortConfig>;

  constructor(private http: HttpClient) {}

  /** Convertit la réponse brute en config normalisée. Préserve la forme à deux versions
   * ({ brut, ecarts }) quand une version écarts est présente ; sinon liste (version brute). */
  private normalize(raw: any): PieceSortConfig {
    const out: PieceSortConfig = {};
    Object.keys(raw || {}).forEach(type => {
      const { brut, ecarts } = sortVersions(raw[type]);
      if (ecarts.length) out[type] = { brut, ecarts };
      else if (brut.length) out[type] = brut;
    });
    return out;
  }

  /** Config (mise en cache ; renvoie {} en cas d'erreur pour ne pas bloquer l'affichage). */
  get(): Observable<PieceSortConfig> {
    if (!this.cache$) {
      this.cache$ = this.http.get<any>(this.url).pipe(
        map(raw => this.normalize(raw)),
        catchError(() => of({} as PieceSortConfig)),
        shareReplay(1),
      );
    }
    return this.cache$;
  }

  save(config: PieceSortConfig): Observable<PieceSortConfig> {
    return this.http.put<any>(this.url, config).pipe(
      map(raw => this.normalize(raw)),
      tap(saved => { this.cache$ = of(saved); }),
    );
  }

  /** Réinitialise la config de l'opérateur avec la configuration SOURCE (compte administrateur)
   * et renvoie la config appliquée. Met le cache à jour. Endpoint : POST .../reset/. */
  resetToSource(): Observable<PieceSortConfig> {
    return this.http.post<any>(`${this.url}reset/`, {}).pipe(
      map(raw => this.normalize(raw)),
      tap(saved => { this.cache$ = of(saved); }),
    );
  }

  clearCache(): void { this.cache$ = undefined; }
}
