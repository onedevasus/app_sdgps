import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap, shareReplay } from 'rxjs/operators';

export interface FieldMetadata {
  name: string;
  label: string;
  description: string;
  type: string;
  required: boolean;
  choices?: Array<{ value: string; label: string }>;
}

export interface OrganizationMetadata {
  [fieldName: string]: FieldMetadata;
}

@Injectable({
  providedIn: 'root'
})
export class OrganizationMetadataService {
  private apiUrl = 'http://localhost:8000/api/v1/organizations/metadata/';
  private metadataCache: OrganizationMetadata | null = null;
  private metadata$!: Observable<OrganizationMetadata>;

  constructor(private http: HttpClient) {}

  /**
   * Récupère les métadonnées des champs d'organisation
   * Utilise un cache pour éviter les appels API répétés
   */
  getMetadata(): Observable<OrganizationMetadata> {
    // Si déjà en cours de chargement, retourner l'observable existant
    if (this.metadata$) {
      return this.metadata$;
    }

    // Si déjà en cache, retourner immédiatement
    if (this.metadataCache) {
      return of(this.metadataCache);
    }

    // Charger depuis l'API avec mise en cache
    this.metadata$ = this.http.get<OrganizationMetadata>(this.apiUrl).pipe(
      tap(data => {
        this.metadataCache = data;
        console.log('✅ Métadonnées des organisations chargées:', Object.keys(data).length, 'champs');
      }),
      shareReplay(1) // Partage le résultat entre plusieurs subscribers
    );

    return this.metadata$;
  }

  /**
   * Récupère la description d'un champ spécifique
   */
  getFieldDescription(fieldName: string): Observable<string> {
    return new Observable(observer => {
      this.getMetadata().subscribe(metadata => {
        const field = metadata[fieldName];
        observer.next(field?.description || '');
        observer.complete();
      });
    });
  }

  /**
   * Récupère le label d'un champ spécifique
   */
  getFieldLabel(fieldName: string): Observable<string> {
    return new Observable(observer => {
      this.getMetadata().subscribe(metadata => {
        const field = metadata[fieldName];
        observer.next(field?.label || fieldName);
        observer.complete();
      });
    });
  }

  /**
   * Récupère toutes les descriptions sous forme de map
   * Pratique pour afficher des infobulles
   */
  getAllDescriptions(): Observable<{ [fieldName: string]: string }> {
    return new Observable(observer => {
      this.getMetadata().subscribe(metadata => {
        const descriptions: { [fieldName: string]: string } = {};
        Object.keys(metadata).forEach(key => {
          descriptions[key] = metadata[key].description;
        });
        observer.next(descriptions);
        observer.complete();
      });
    });
  }

  /**
   * Invalide le cache (à utiliser après une mise à jour du modèle)
   */
  invalidateCache(): void {
    this.metadataCache = null;
    this.metadata$ = undefined as any;
  }
}
