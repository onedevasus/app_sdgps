import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/** Un poste de ventilation (organisation / projet / utilisateur). */
export interface StorageRankItem {
  label: string;
  bytes: number;
}

/** Répartition par nature de fichier. */
export interface StorageTypeItem {
  key: string;
  label: string;
  bytes: number;
}

export interface StorageOverview {
  total_bytes: number;
  total_files: number;
  by_type: StorageTypeItem[];
  by_organization: StorageRankItem[];
  by_project: StorageRankItem[];
  by_user: StorageRankItem[];
}

export interface StorageEvolutionPoint {
  taken_at: string;
  total_bytes: number;
  total_files: number;
  by_type: Record<string, number>;
  by_organization: Record<string, number>;
  by_project: Record<string, number>;
  by_role: Record<string, number>;
  by_user: Record<string, number>;
  is_backfill: boolean;
}

/**
 * Analytique de l'espace de stockage (réservé App Admin). Alimente le dashboard
 * `/admin/quotas/stockage`.
 */
@Injectable({ providedIn: 'root' })
export class StorageAnalyticsService {
  private base = `${environment.apiUrl}/v1/analytics/storage`;

  constructor(private http: HttpClient) {}

  /** Ventilation courante ; `organizationId` restreint à une organisation. */
  getOverview(organizationId?: string | null): Observable<StorageOverview> {
    let params = new HttpParams();
    if (organizationId) params = params.set('organization', organizationId);
    return this.http.get<StorageOverview>(`${this.base}/overview/`, { params });
  }

  /** Série temporelle des instantanés (courbe d'évolution). */
  getEvolution(limit = 200): Observable<{ points: StorageEvolutionPoint[] }> {
    const params = new HttpParams().set('limit', String(limit));
    return this.http.get<{ points: StorageEvolutionPoint[] }>(`${this.base}/evolution/`, { params });
  }
}
