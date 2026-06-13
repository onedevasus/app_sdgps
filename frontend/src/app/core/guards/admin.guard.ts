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
    
    if (userRole !== 'superadmin' && userRole !== 'admin') {
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
   * TODO: Implémenter avec jwt-decode
   */
  private getUserRoleFromToken(token: string): string {
    try {
      // Simulation - à remplacer par décodage réel du JWT
      // const decoded: any = jwt_decode(token);
      // return decoded.role;
      
      // Pour l'instant, retournons superadmin pour test
      return 'superadmin';
    } catch (error) {
      console.error('Erreur décodage token:', error);
      return 'user';
    }
  }
}
