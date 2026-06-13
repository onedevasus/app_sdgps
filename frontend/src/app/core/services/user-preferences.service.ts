import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap, shareReplay, map } from 'rxjs/operators';

export interface ColumnMetadata {
  field: string;
  label: string;
  description: string;
  type: string;
  required: boolean;
  visible_by_default: boolean;
  choices?: Array<{ value: any; label: string }>;
}

export interface TablePreferences {
  id?: number;
  column_config: any[];
  active_filters: any;
  sort_config: any;
  display_mode: string;
  page_size: number;
  updated_at?: string;
}

/**
 * Service de gestion des préférences utilisateur et des métadonnées
 * 
 * Fonctionnalités :
 * - Chargement des métadonnées des colonnes depuis le backend
 * - Sauvegarde/restauration des préférences d'affichage
 * - Cache local pour performance optimale
 */
@Injectable({
  providedIn: 'root'
})
export class UserPreferencesService {
  
  private preferencesApiUrl = '/api/v1/users/table-preferences/';
  private metadataApiUrl = '/api/v1/organizations/metadata/';
  
  // Cache des métadonnées (évite les appels API répétés)
  private metadataCache: Map<string, ColumnMetadata> | null = null;
  private metadataLoaded$!: Observable<Map<string, ColumnMetadata>>;
  
  constructor(private http: HttpClient) {}

  /**
   * Récupérer les métadonnées des colonnes (avec cache)
   * @returns Observable contenant un Map field -> metadata
   */
  getColumnMetadata(): Observable<Map<string, ColumnMetadata>> {
    // Si déjà en cours de chargement, retourner l'observable existant
    if (this.metadataLoaded$) {
      return this.metadataLoaded$;
    }

    // Si cache disponible, retourner immédiatement
    if (this.metadataCache) {
      return new BehaviorSubject<Map<string, ColumnMetadata>>(this.metadataCache);
    }

    // Sinon, charger depuis le backend
    this.metadataLoaded$ = this.http.get<{ [key: string]: ColumnMetadata }>(this.metadataApiUrl).pipe(
      tap(response => {
        // Convertir l'objet en Map pour accès rapide
        this.metadataCache = new Map(Object.entries(response));
        console.log('✅ Métadonnées chargées:', this.metadataCache.size, 'colonnes');
        
        // Sauvegarder dans localStorage pour fallback offline
        try {
          localStorage.setItem('org_metadata_cache', JSON.stringify(response));
          localStorage.setItem('org_metadata_timestamp', Date.now().toString());
        } catch (e) {
          console.warn('⚠️ Impossible de sauvegarder le cache localStorage:', e);
        }
      }),
      map(response => new Map(Object.entries(response))),
      shareReplay(1) // Partager le résultat avec tous les subscribers
    );

    return this.metadataLoaded$;
  }

  /**
   * Charger les métadonnées depuis le cache local (fallback offline)
   */
  loadMetadataFromCache(): Map<string, ColumnMetadata> | null {
    try {
      const cached = localStorage.getItem('org_metadata_cache');
      const timestamp = localStorage.getItem('org_metadata_timestamp');
      
      if (!cached || !timestamp) {
        return null;
      }

      // Vérifier si le cache a moins de 24 heures
      const age = Date.now() - parseInt(timestamp);
      if (age > 24 * 60 * 60 * 1000) { // 24h
        console.log('🗑️ Cache métadonnées expiré');
        return null;
      }

      const parsed = JSON.parse(cached);
      console.log('📦 Métadonnées chargées depuis le cache');
      return new Map(Object.entries(parsed));
    } catch (e) {
      console.error('❌ Erreur lecture cache:', e);
      return null;
    }
  }

  /**
   * Récupérer les préférences utilisateur depuis le backend
   */
  getTablePreferences(): Observable<TablePreferences> {
    return this.http.get<TablePreferences>(this.preferencesApiUrl);
  }

  /**
   * Sauvegarder les préférences utilisateur
   */
  saveTablePreferences(preferences: Partial<TablePreferences>): Observable<TablePreferences> {
    return this.http.put<TablePreferences>(this.preferencesApiUrl, preferences).pipe(
      tap(() => console.log('✅ Préférences sauvegardées'))
    );
  }

  /**
   * Sauvegarder uniquement la configuration des colonnes
   */
  saveColumnConfig(columns: any[]): Observable<TablePreferences> {
    return this.saveTablePreferences({ column_config: columns });
  }

  /**
   * Sauvegarder le tri
   */
  saveSortConfig(sortColumn: string, sortDirection: string): Observable<TablePreferences> {
    return this.saveTablePreferences({ 
      sort_config: { column: sortColumn, direction: sortDirection } 
    });
  }

  /**
   * Sauvegarder les filtres
   */
  saveFilters(filters: any): Observable<TablePreferences> {
    return this.saveTablePreferences({ active_filters: filters });
  }

  /**
   * Sauvegarder le mode d'affichage
   */
  saveDisplayMode(mode: string): Observable<TablePreferences> {
    return this.saveTablePreferences({ display_mode: mode });
  }

  /**
   * Vider le cache des métadonnées (force reload)
   */
  clearMetadataCache(): void {
    this.metadataCache = null;
    this.metadataLoaded$ = null as any;
    localStorage.removeItem('org_metadata_cache');
    localStorage.removeItem('org_metadata_timestamp');
  }
}
