import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Organization } from '../models/organization.model';

@Injectable({
  providedIn: 'root'
})
export class OrganizationService {
  private apiUrl = 'http://localhost:8000/api/v1/organizations/'; // À adapter selon votre config

  constructor(private http: HttpClient) { }

  getOrganizations(params?: any): Observable<Organization[]> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined) {
          httpParams = httpParams.set(key, params[key]);
        }
      });
    }
    
    // Ajouter page_size pour éviter la pagination
    httpParams = httpParams.set('page_size', '1000');
    
    return this.http.get<any>(this.apiUrl, { params: httpParams }).pipe(
      map(response => {
        // DRF retourne soit un tableau direct, soit un objet paginé { results: [...] }
        if (Array.isArray(response)) {
          return response;
        } else if (response.results && Array.isArray(response.results)) {
          return response.results;
        }
        return [];
      })
    );
  }

  getOrganization(id: string): Observable<Organization> {
    return this.http.get<Organization>(`${this.apiUrl}${id}/`);
  }

  createOrganization(organization: Partial<Organization>): Observable<Organization> {
    return this.http.post<Organization>(this.apiUrl, organization);
  }

  updateOrganization(id: string, organization: Partial<Organization>): Observable<Organization> {
    return this.http.put<Organization>(`${this.apiUrl}${id}/`, organization);
  }

  deleteOrganization(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}${id}/`);
  }

  bulkDeleteOrganizations(organizationIds: string[]): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}bulk-delete/`, {
      organization_ids: organizationIds
    });
  }
}
