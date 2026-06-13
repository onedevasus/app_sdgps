import { NgModule, Component } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardLayoutComponent } from './core/layout/components/dashboard-layout/dashboard-layout.component';
import { AdminGuard } from './core/guards/admin.guard';
import { TestProfileRouteComponent } from './features/test-profile-route.component';
import { OrganizationListComponent } from './features/dashboard/organization-list/organization-list.component';

// Composant placeholder temporaire (à remplacer par vos vrais composants)
@Component({
  template: '<div style="padding: 20px;"><h2>{{ title }}</h2><p>Ce module est en cours de développement.</p></div>'
})
export class PlaceholderComponent {
  title = '';
}

const routes: Routes = [
  {
    path: '',
    redirectTo: '/auth/login',
    pathMatch: 'full'
  },
  
  // Routes Authentification (DOIVENT être avant le catch-all)
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.module').then(m => m.AuthModule)
  },
  
  // Routes Dashboard Utilisateur Normal
  {
    path: 'dashboard',
    component: DashboardLayoutComponent,
    children: [
      {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full'
      },
      {
        path: 'home',
        component: PlaceholderComponent,
        data: { title: 'Tableau de bord' }
      },
      {
        path: 'mes-projets',
        component: PlaceholderComponent,
        data: { title: 'Mes Projets' }
      }
    ]
  },

  // Routes Admin (protégées par guard)
  {
    path: 'admin',
    component: DashboardLayoutComponent,
    canActivate: [AdminGuard],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        component: PlaceholderComponent,
        data: { title: 'Dashboard Admin' }
      },
      {
        path: 'organisations',
        component: PlaceholderComponent,
        data: { title: 'Gestion des Organisations' }
      },
      {
        path: 'organisations/liste',
        component: OrganizationListComponent,
        data: { title: 'Liste des Organisations' }
      },
      {
        path: 'utilisateurs',
        component: PlaceholderComponent,
        data: { title: 'Gestion des Utilisateurs' }
      },
      {
        path: 'logs-audit',
        component: PlaceholderComponent,
        data: { title: 'Logs d\'Audit' }
      },
      {
        path: 'supervision',
        component: PlaceholderComponent,
        data: { title: 'Supervision Système' }
      },
      {
        path: 'quotas',
        component: PlaceholderComponent,
        data: { title: 'Gestion des Quotas' }
      },
      {
        path: 'maintenance',
        component: PlaceholderComponent,
        data: { title: 'Mode Maintenance' }
      },
      {
        path: 'profile',
        loadChildren: () => import('./features/profile/profile.module').then(m => m.ProfileModule),
        data: { title: 'Mon Profil' }
      },
      {
        path: 'test-profile',
        component: TestProfileRouteComponent,
        data: { title: 'Test Route Profile' }
      }
    ]
  },

  // Route pour page non trouvée
  {
    path: '**',
    redirectTo: '/dashboard'
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
