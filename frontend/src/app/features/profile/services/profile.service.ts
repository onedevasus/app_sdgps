import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

export interface UserProfile {
  id: number;
  email: string;
  first_name: string;    // Backend field (standard Django)
  last_name: string;     // Backend field (standard Django)
  full_name: string;     // Calculated by backend
  nom_societe?: string;  // Nom de société (remplace phone)
  role: string;
  role_display: string;
  organization_id?: string | null;   // ← Org principale (renvoyée par /auth/me/)
  organization_name?: string | null;
  date_joined: string;
  last_login?: string;
  last_connection_at?: string;  // ← AJOUT: Dernière connexion personnalisée
  password_changed_at?: string; // ← AJOUT: Date dernière modification MDP
  profile_picture?: string;     // ← AJOUT: Fichier photo (upload)
  profile_picture_url?: string; // ← AJOUT: URL complète photo
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

export interface ApiResponse {
  message: string;
  data?: any;
  require_relogin?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  
  private baseUrl = `${environment.apiUrl}/v1/platform-admin/me`;
  
  // Subject pour notifier les changements de profil
  private profileUpdated$ = new BehaviorSubject<UserProfile | null>(null);
  
  constructor(private http: HttpClient) { }

  /**
   * Récupère le profil de l'utilisateur RÉELLEMENT connecté, quel que soit son rôle.
   *
   * Contrairement à getProfile() (réservé aux Super Admins / Admins Système via
   * /platform-admin/me/profile/), cet endpoint /auth/me/ renvoie toujours request.user
   * et fonctionne pour tous les rôles, y compris ROLE_ORGANISATION_ADMIN.
   */
  getCurrentUser(): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${environment.apiUrl}/auth/me/`);
  }

  /**
   * Récupère le profil de l'utilisateur connecté
   */
  getProfile(): Observable<UserProfile> {
    console.log('🔍 getProfile() appelé');
    const token = localStorage.getItem('authToken');
    console.log('🔑 Token:', token ? 'PRÉSENT' : 'ABSENT');
    
    return this.http.get<UserProfile>(`${this.baseUrl}/profile/`).pipe(
      tap(profile => {
        console.log('✅ Profil chargé avec succès:', profile);
        // Notifier les subscribers
        this.profileUpdated$.next(profile);
      }),
      catchError(error => {
        console.error('❌ Erreur chargement profil:', error);
        console.error('Status:', error.status);
        console.error('Message:', error.message);
        console.error('Error details:', error.error);
        throw error;
      })
    );
  }
  
  /**
   * Met à jour le profil utilisateur
   */
  updateProfile(profileData: Partial<UserProfile>): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.baseUrl}/profile/`, profileData).pipe(
      tap(response => {
        console.log('✅ Profil mis à jour:', response);
        // Recharger le profil pour mettre à jour l'affichage
        if (response.data) {
          this.profileUpdated$.next(response.data);
        }
      }),
      catchError(error => {
        console.error('❌ Erreur mise à jour profil:', error);
        throw error;
      })
    );
  }
  
  /**
   * Change le mot de passe
   */
  changePassword(passwordData: ChangePasswordRequest): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(
      `${this.baseUrl}/change-password/`,
      passwordData
    ).pipe(
      tap(response => {
        console.log('✅ Mot de passe changé:', response);
      }),
      catchError(error => {
        console.error('❌ Erreur changement mot de passe:', error);
        throw error;
      })
    );
  }
  
  /**
   * Upload une photo de profil
   */
  uploadProfilePicture(file: File): Observable<UserProfile> {
    const formData = new FormData();
    formData.append('profile_picture', file, file.name);
    
    return this.http.put<any>(`${this.baseUrl}/profile/`, formData).pipe(
      tap(response => {
        console.log('✅ Réponse backend upload photo:', response);
      }),
      map(response => {
        // Extraire le profil depuis response.data
        const profile = response.data || response;
        console.log('✅ Photo de profil uploadée:', profile);
        // Notifier les subscribers
        this.profileUpdated$.next(profile);
        return profile;
      }),
      catchError(error => {
        console.error('❌ Erreur upload photo:', error);
        return throwError(() => error);
      })
    );
  }
  
  /**
   * Supprime la photo de profil
   */
  deleteProfilePicture(): Observable<ApiResponse> {
    return this.http.patch<ApiResponse>(`${this.baseUrl}/profile/`, {
      profile_picture: null
    }).pipe(
      tap(response => {
        console.log('✅ Photo de profil supprimée:', response);
        // Recharger le profil pour mettre à jour l'affichage
        this.getProfile().subscribe();
      }),
      catchError(error => {
        console.error('❌ Erreur suppression photo:', error);
        throw error;
      })
    );
  }
  
  /**
   * Observable pour écouter les mises à jour du profil
   */
  onProfileUpdated(): Observable<UserProfile | null> {
    return this.profileUpdated$.asObservable();
  }
  
  /**
   * Notifie manuellement une mise à jour du profil
   * (utile après modification depuis un autre composant)
   */
  notifyProfileUpdate(profile: UserProfile): void {
    this.profileUpdated$.next(profile);
  }
}
