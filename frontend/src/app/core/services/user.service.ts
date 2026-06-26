import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { User, CreateUserPayload, UpdateUserPayload, ResetPasswordPayload, RoleInfo } from '../models/user.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class UserService {
  private apiUrl = `${environment.apiUrl}/v1/users/`;

  constructor(private http: HttpClient) { }

  getUsers(params?: any): Observable<User[]> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
          httpParams = httpParams.set(key, params[key]);
        }
      });
    }
    return this.http.get<User[]>(this.apiUrl, { params: httpParams });
  }

  getUser(id: string): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}${id}/`);
  }

  createUser(payload: CreateUserPayload): Observable<User> {
    return this.http.post<User>(this.apiUrl, payload);
  }

  updateUser(id: string, payload: UpdateUserPayload): Observable<User> {
    return this.http.patch<User>(`${this.apiUrl}${id}/`, payload);
  }

  deleteUser(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}${id}/`);
  }

  resetPassword(id: string, payload: ResetPasswordPayload): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}${id}/reset-password/`, payload);
  }

  toggleActive(id: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}${id}/toggle-active/`, {});
  }

  getRoles(): Observable<RoleInfo[]> {
    return this.http.get<RoleInfo[]>(`${this.apiUrl}roles/`);
  }
}
