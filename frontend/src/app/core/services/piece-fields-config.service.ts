import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, shareReplay, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

/** Vue configurable des colonnes d'un type de pièce. `import` (version brute uniquement) est
 * le FILTRE-MAÎTRE : un champ non importé ne peut apparaître ni dans `app` ni dans `pdf`. */
export type PieceFieldsView = 'import' | 'app' | 'pdf';
/** Version d'un tableau : brute des données ou écarts (RDL/RDN/RDIA). */
export type PieceFieldsVersion = 'brut' | 'ecarts';

/** Colonnes visibles (ordonnées) d'une vue, par version. Version absente = toutes. */
export interface PieceFieldsViewConfig {
  brut?: string[];
  ecarts?: string[];
}

/** Config d'un type : une entrée par vue (import / app / pdf). */
export interface PieceFieldsTypeConfig {
  import?: PieceFieldsViewConfig;
  app?: PieceFieldsViewConfig;
  pdf?: PieceFieldsViewConfig;
}

/**
 * `{ '<TYPE_PIECE>': { app: { brut, ecarts }, pdf: { brut, ecarts } } }`.
 * Une liste = colonnes VISIBLES dans cet ORDRE pour la vue/version. Type / vue /
 * version absent = tous les champs du catalogue (ordre catalogue).
 */
export type PieceFieldsConfig = { [type: string]: PieceFieldsTypeConfig };

/**
 * Préférences de COLONNES par défaut des tableaux de pièces de l'opérateur connecté.
 * Endpoint : GET/PUT /api/auth/me/piece-fields-config/. Utilisé (1) pour l'affichage des
 * données dans l'app (vue 'app', lecture seule), (2) côté serveur pour filtrer/ordonner les
 * colonnes des tableaux du rapport PDF (vue 'pdf'). Calqué sur PieceSortConfigService.
 */
@Injectable({ providedIn: 'root' })
export class PieceFieldsConfigService {
  private url = `${environment.apiUrl}/auth/me/piece-fields-config/`;
  private cache$?: Observable<PieceFieldsConfig>;

  constructor(private http: HttpClient) {}

  /** Ne garde que des listes de chaînes non vides (défensif). */
  private normalizeList(raw: any): string[] | undefined {
    if (!Array.isArray(raw)) return undefined;
    const out = raw.filter(v => typeof v === 'string' && v.trim()).map(v => v.trim());
    return out;
  }

  private normalizeView(raw: any): PieceFieldsViewConfig | undefined {
    if (!raw || typeof raw !== 'object') return undefined;
    const view: PieceFieldsViewConfig = {};
    const brut = this.normalizeList(raw.brut);
    const ecarts = this.normalizeList(raw.ecarts);
    if (brut !== undefined) view.brut = brut;
    if (ecarts !== undefined) view.ecarts = ecarts;
    return Object.keys(view).length ? view : undefined;
  }

  private normalize(raw: any): PieceFieldsConfig {
    const out: PieceFieldsConfig = {};
    Object.keys(raw || {}).forEach(type => {
      const entry = raw[type] || {};
      const t: PieceFieldsTypeConfig = {};
      const imp = this.normalizeView(entry.import);
      const app = this.normalizeView(entry.app);
      const pdf = this.normalizeView(entry.pdf);
      if (imp) t.import = imp;
      if (app) t.app = app;
      if (pdf) t.pdf = pdf;
      if (t.import || t.app || t.pdf) out[type] = t;
    });
    return out;
  }

  /** Config (mise en cache ; renvoie {} en cas d'erreur pour ne pas bloquer l'affichage). */
  get(): Observable<PieceFieldsConfig> {
    if (!this.cache$) {
      this.cache$ = this.http.get<any>(this.url).pipe(
        map(raw => this.normalize(raw)),
        catchError(() => of({} as PieceFieldsConfig)),
        shareReplay(1),
      );
    }
    return this.cache$;
  }

  save(config: PieceFieldsConfig): Observable<PieceFieldsConfig> {
    return this.http.put<any>(this.url, config).pipe(
      map(raw => this.normalize(raw)),
      tap(saved => { this.cache$ = of(saved); }),
    );
  }

  /** Réinitialise la config de colonnes de l'opérateur avec la configuration SOURCE (compte
   * administrateur) et renvoie la config appliquée. Met le cache à jour. Endpoint : POST .../reset/. */
  resetToSource(): Observable<PieceFieldsConfig> {
    return this.http.post<any>(`${this.url}reset/`, {}).pipe(
      map(raw => this.normalize(raw)),
      tap(saved => { this.cache$ = of(saved); }),
    );
  }

  clearCache(): void { this.cache$ = undefined; }
}
