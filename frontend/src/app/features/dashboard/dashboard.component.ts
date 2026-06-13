import {Component, OnInit} from '@angular/core';
import {AuthService} from '../../core/auth/auth.service'; // Importe AuthService
import {Router} from '@angular/router'; // Importe Router

@Component({
    selector: 'app-dashboard',
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {

    constructor(
        private authService: AuthService, // Injecte AuthService
        private router: Router // Injecte Router
    ) {
    }

    ngOnInit(): void {
        // Logique d'initialisation du tableau de bord
    }

    /**
     * @description Gère la déconnexion de l'utilisateur.
     * Appelle le service d'authentification pour déconnecter et redirige vers la page de connexion.
     */
    logout(): void {
        this.authService.logout(); // Appelle la méthode de déconnexion du service
        this.router.navigate(['/auth/login']); // Redirige vers la page de connexion
    }
}
