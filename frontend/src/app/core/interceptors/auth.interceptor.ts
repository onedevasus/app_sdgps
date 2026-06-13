import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  
  constructor(private router: Router) {}
  
  intercept(
    request: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    
    // Récupérer le token JWT du localStorage
    const token = localStorage.getItem('authToken');
    
    // Si un token existe, l'ajouter aux headers
    if (token) {
      request = request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }
    
    // Gérer les erreurs HTTP
    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('❌ Erreur HTTP:', error);
        
        // Si 401 (Non autorisé), déconnecter l'utilisateur
        if (error.status === 401) {
          console.warn('⚠️ Token expiré ou invalide - Déconnexion');
          localStorage.removeItem('authToken');
          this.router.navigate(['/auth/login']);
        }
        
        // Si 403 (Interdit), afficher message d'erreur
        if (error.status === 403) {
          console.warn('⚠️ Accès refusé');
        }
        
        return throwError(() => error);
      })
    );
  }
}
