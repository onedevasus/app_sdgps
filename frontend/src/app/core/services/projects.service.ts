import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Projet, Propriete, Affaire, Ssdgps, Session } from '../models/project.model';

/**
 * Service CRUD du domaine métier (projets, propriétés, affaires, ssdgps, sessions).
 * Calqué sur OrganizationService. Le scoping RBAC est appliqué côté backend.
 */
@Injectable({ providedIn: 'root' })
export class ProjectsService {
  private base = `${environment.apiUrl}/v1/`;

  constructor(private http: HttpClient) {}

  private list<T>(resource: string, params?: Record<string, any>): Observable<T[]> {
    let httpParams = new HttpParams().set('page_size', '1000');
    if (params) {
      Object.keys(params).forEach(k => {
        if (params[k] !== null && params[k] !== undefined && params[k] !== '') {
          httpParams = httpParams.set(k, params[k]);
        }
      });
    }
    return this.http.get<any>(`${this.base}${resource}/`, { params: httpParams }).pipe(
      map(res => Array.isArray(res) ? res : (res?.results ?? []))
    );
  }

  private restore<T>(resource: string, id: string): Observable<T> {
    return this.http.post<T>(`${this.base}${resource}/${id}/restore/`, {});
  }

  private bulkRestore(resource: string, ids: string[]): Observable<{ restored_count: number }> {
    return this.http.post<{ restored_count: number }>(`${this.base}${resource}/bulk-restore/`, { ids });
  }

  // --- Projets ---
  getProjets(params?: Record<string, any>): Observable<Projet[]> { return this.list('projets', params); }
  getProjet(id: string): Observable<Projet> { return this.http.get<Projet>(`${this.base}projets/${id}/`); }
  createProjet(p: Partial<Projet>): Observable<Projet> { return this.http.post<Projet>(`${this.base}projets/`, p); }
  updateProjet(id: string, p: Partial<Projet>): Observable<Projet> { return this.http.patch<Projet>(`${this.base}projets/${id}/`, p); }
  deleteProjet(id: string): Observable<void> { return this.http.delete<void>(`${this.base}projets/${id}/`); }
  restoreProjet(id: string): Observable<Projet> { return this.restore('projets', id); }
  bulkRestoreProjets(ids: string[]): Observable<{ restored_count: number }> { return this.bulkRestore('projets', ids); }

  // --- Propriétés ---
  getProprietes(projetId: string, params?: Record<string, any>): Observable<Propriete[]> { return this.list('proprietes', { projet: projetId, ...params }); }
  createPropriete(p: Partial<Propriete>): Observable<Propriete> { return this.http.post<Propriete>(`${this.base}proprietes/`, p); }
  updatePropriete(id: string, p: Partial<Propriete>): Observable<Propriete> { return this.http.patch<Propriete>(`${this.base}proprietes/${id}/`, p); }
  deletePropriete(id: string): Observable<void> { return this.http.delete<void>(`${this.base}proprietes/${id}/`); }
  restorePropriete(id: string): Observable<Propriete> { return this.restore('proprietes', id); }
  bulkRestoreProprietes(ids: string[]): Observable<{ restored_count: number }> { return this.bulkRestore('proprietes', ids); }

  // --- Affaires ---
  getAffaires(proprieteId: string, params?: Record<string, any>): Observable<Affaire[]> { return this.list('affaires', { propriete: proprieteId, ...params }); }
  createAffaire(a: Partial<Affaire>): Observable<Affaire> { return this.http.post<Affaire>(`${this.base}affaires/`, a); }
  updateAffaire(id: string, a: Partial<Affaire>): Observable<Affaire> { return this.http.patch<Affaire>(`${this.base}affaires/${id}/`, a); }
  deleteAffaire(id: string): Observable<void> { return this.http.delete<void>(`${this.base}affaires/${id}/`); }
  restoreAffaire(id: string): Observable<Affaire> { return this.restore('affaires', id); }
  bulkRestoreAffaires(ids: string[]): Observable<{ restored_count: number }> { return this.bulkRestore('affaires', ids); }

  // --- SSDGPS ---
  getSsdgps(affaireId: string, params?: Record<string, any>): Observable<Ssdgps[]> { return this.list('ssdgps', { affaire: affaireId, ...params }); }
  getSsdgpsById(id: string): Observable<Ssdgps> { return this.http.get<Ssdgps>(`${this.base}ssdgps/${id}/`); }
  createSsdgps(s: Partial<Ssdgps>): Observable<Ssdgps> { return this.http.post<Ssdgps>(`${this.base}ssdgps/`, s); }
  updateSsdgps(id: string, s: Partial<Ssdgps>): Observable<Ssdgps> { return this.http.patch<Ssdgps>(`${this.base}ssdgps/${id}/`, s); }
  deleteSsdgps(id: string): Observable<void> { return this.http.delete<void>(`${this.base}ssdgps/${id}/`); }
  restoreSsdgps(id: string): Observable<Ssdgps> { return this.restore('ssdgps', id); }
  bulkRestoreSsdgps(ids: string[]): Observable<{ restored_count: number }> { return this.bulkRestore('ssdgps', ids); }

  // --- Sessions ---
  getSessions(ssdgpsId: string, params?: Record<string, any>): Observable<Session[]> { return this.list('sessions', { ssdgps: ssdgpsId, ...params }); }
  createSession(s: Partial<Session>): Observable<Session> { return this.http.post<Session>(`${this.base}sessions/`, s); }
  updateSession(id: string, s: Partial<Session>): Observable<Session> { return this.http.patch<Session>(`${this.base}sessions/${id}/`, s); }
  deleteSession(id: string): Observable<void> { return this.http.delete<void>(`${this.base}sessions/${id}/`); }
  restoreSession(id: string): Observable<Session> { return this.restore('sessions', id); }
  bulkRestoreSessions(ids: string[]): Observable<{ restored_count: number }> { return this.bulkRestore('sessions', ids); }
}
