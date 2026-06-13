import {NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {HTTP_INTERCEPTORS, HttpClientModule} from '@angular/common/http'; // Importe HttpClientModule pour les requêtes HTTP
import {AppRoutingModule} from './app-routing.module'; // Importe le module de routage principal
import {AppComponent} from './app.component'; // Importe le composant racine
import {LayoutModule} from './core/layout/layout.module'; // ← AJOUT: Module Layout (Sidebar, TopBar, etc.)
import {AuthModule} from './features/auth/auth.module'; // ← AJOUT: Module Auth (Login, Register, etc.)
import {DashboardModule} from './features/dashboard/dashboard.module'; // ← AJOUT: Module Dashboard
import {ToastrModule} from 'ngx-toastr';
import {AuthInterceptor} from './core/interceptors/auth.interceptor';

@NgModule({
    declarations: [
        AppComponent // Déclare le composant racine
    ],
    imports: [
        BrowserModule, // Module nécessaire pour faire fonctionner l'application Angular dans un navigateur
        BrowserAnimationsModule, // Requis pour les animations (ngx-toastr)
        AppRoutingModule, // Importe les routes principales de l'application
        HttpClientModule, // Permet d'utiliser le service HttpClient pour les appels API
        LayoutModule, // ← AJOUT: Dashboard layout components
        AuthModule, // ← AJOUT: Authentication components
        DashboardModule, // ← AJOUT: Dashboard components (OrganizationList, etc.)
        ToastrModule.forRoot({
          timeOut: 3000,
          positionClass: 'toast-bottom-right', // ← Position en bas à droite
          preventDuplicates: true,
          progressBar: true,
          progressAnimation: 'increasing',
          closeButton: true
        })
    ],
    providers: [
      // Enregistrer l'interceptor JWT
      {
        provide: HTTP_INTERCEPTORS,
        useClass: AuthInterceptor,
        multi: true
      }
    ], // Les services globaux peuvent être enregistrés ici
    bootstrap: [AppComponent] // Le composant racine à démarrer
})
export class AppModule {
}
