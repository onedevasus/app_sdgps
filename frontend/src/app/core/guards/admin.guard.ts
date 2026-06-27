import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {

  constructor(private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    
    // TODO: Remplacer par votre logique d'authentification réelle
    const token = localStorage.getItem('authToken');
    
    if (!token) {
      // Utilisateur non authentifié
      console.warn('⚠️ Utilisateur non authentifié - Redirection vers login');
      this.router.navigate(['/auth/login']);
      return false;
    }

    // Décoder le token pour vérifier le rôle (simulation)
    // Dans la réalité, utilisez jwt-decode ou appelez l'API
    const userRole = this.getUserRoleFromToken(token);
    
    if (userRole !== 'ROLE_SUPER_ADMIN' && userRole !== 'ROLE_ADMIN_SYSTEME' && userRole !== 'ROLE_ORGANISATION_ADMIN') {
      // Utilisateur non autorisé
      console.warn('⚠️ Accès refusé - Rôle insuffisant:', userRole);
      this.router.navigate(['/dashboard']);
      return false;
    }

    console.log('✅ Accès admin autorisé pour rôle:', userRole);
    return true;
  }

  /**
   * Extraire le rôle depuis le token JWT
   */
  private getUserRoleFromToken(token: string): string {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.platform_role || payload.role || 'ROLE_ORGANISATION_AGENT';
    } catch {
      return 'ROLE_ORGANISATION_AGENT';
    }
  }
}
