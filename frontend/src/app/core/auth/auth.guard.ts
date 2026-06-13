import {Injectable} from '@angular/core';
import {ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree} from '@angular/router';
import {Observable} from 'rxjs';
import {AuthService} from './auth.service'; // Importe le service d'authentification

@Injectable({
    providedIn: 'root' // Le guard est disponible à la racine de l'application
})
export class AuthGuard implements CanActivate {

    constructor(
        private authService: AuthService, // Injecte le service d'authentification
        private router: Router // Injecte le routeur pour les redirections
    ) {
    }

    /**
     * @description Détermine si une route peut être activée.
     * Vérifie si l'utilisateur est connecté via AuthService.
     * Si l'utilisateur n'est pas connecté, il est redirigé vers la page de connexion.
     * @param route L'instantané de la route activée.
     * @param state L'état du routeur.
     * @returns Un Observable, Promise ou boolean indiquant si la route peut être activée.
     */
    canActivate(
        route: ActivatedRouteSnapshot,
        state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {

        // Vérifie si l'utilisateur est connecté
        if (this.authService.isLoggedIn()) {
            return true; // L'utilisateur est connecté, la navigation est autorisée
        } else {
            // L'utilisateur n'est pas connecté, redirige vers la page de connexion
            console.warn('Accès non autorisé. Redirection vers la page de connexion.');
            return this.router.createUrlTree(['/auth/login']); // Crée une UrlTree pour la redirection
        }
    }
}
