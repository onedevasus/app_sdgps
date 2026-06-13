import {Component} from '@angular/core';

/**
 * @component AppComponent
 * @description Composant racine de l'application SDGPS.
 *              Ce composant sert de point d'entrée principal et contient le router-outlet
 *              pour afficher les différents composants selon les routes.
 */
@Component({
    selector: 'app-root',
    template: '<router-outlet></router-outlet>',
    styles: []
})
export class AppComponent {
    title = 'SDGPS - Système de Génération de Documents';
}
