# 🏗️ Architecture Dashboard Unifié - SDGPS

## 📋 Table des Matières

1. [Vue d'ensemble](#vue-densemble)
2. [Structure des Fichiers](#structure-des-fichiers)
3. [Design System](#design-system)
4. [Composants Principaux](#composants-principaux)
5. [Services](#services)
6. [Configuration du Menu](#configuration-du-menu)
7. [Routing & Guards](#routing--guards)
8. [Thèmes Clair/Sombre](#thèmes-clairsombre)
9. [Utilisation](#utilisation)
10. [Personnalisation](#personnalisation)

---

## 🎯 Vue d'ensemble

Le **Dashboard Unifié** est une architecture Angular moderne qui gère deux types d'utilisateurs via une interface unique :

- **Utilisateurs métier** : Accès simplifié (Tableau de bord + Mes Projets)
- **Super Admin** : Accès complet avec supervision système et gestion RBAC

### ✨ Caractéristiques Clés

- ✅ **Menu dynamique JSON** : Configuration centralisée et maintenable
- ✅ **Sidebar réductible/extensible** : Animation fluide 0.3s
- ✅ **Breadcrumb dynamique** : Fil d'Ariane automatique selon la route
- ✅ **Toggle thème clair/sombre** : Persistance localStorage
- ✅ **Avatar utilisateur** : Initiales générées automatiquement
- ✅ **Dropdown menu** : Profil + Déconnexion
- ✅ **Guards de route** : Protection routes admin par rôle
- ✅ **Responsive design** : Adapté mobile/tablette/desktop
- ✅ **Inspiration template** : Palette couleurs + ombres + typographie

---

## 📁 Structure des Fichiers

```
frontend/src/app/core/layout/
├── config/
│   └── menu.config.ts              # Configuration JSON des menus
├── interfaces/
│   └── menu.interface.ts           # Interfaces TypeScript
├── services/
│   └── layout.service.ts           # Service gestion état (menu, thème, sidebar)
├── components/
│   ├── dashboard-layout/
│   │   ├── dashboard-layout.component.ts
│   │   ├── dashboard-layout.component.html
│   │   └── dashboard-layout.component.scss
│   ├── sidebar/
│   │   ├── sidebar.component.ts
│   │   ├── sidebar.component.html
│   │   └── sidebar.component.scss
│   └── topbar/
│       ├── topbar.component.ts
│       ├── topbar.component.html
│       └── topbar.component.scss
├── guards/
│   └── admin.guard.ts              # Guard protection routes admin
└── layout.module.ts                # Module principal Layout
```

---

## 🎨 Design System

Inspiré du template `geoportail_app_v3`, adapté en SCSS moderne.

### Palette de Couleurs

```scss
:root {
  --primary-color: #0056b3;          // Bleu principal
  --primary-color-dark: #004494;     // Bleu foncé (hover)
  --secondary-color: #6c757d;        // Gris secondaire
  --background-color: #f4f6f9;       // Fond clair
  --sidebar-background: #ffffff;     // Fond sidebar
  --text-color: #333;                // Texte principal
  --text-color-light: #f8f9fa;       // Texte sur fond sombre
  --border-color: #dee2e6;           // Bordures
  --shadow-color: rgba(0, 0, 0, 0.1);// Ombres
  --hover-background: #e9ecef;       // Hover gris clair
}
```

### Dimensions

```scss
--sidebar-width-expanded: 260px;     // Sidebar déployée
--sidebar-width-collapsed: 80px;     // Sidebar réduite
--top-bar-height: 60px;              // Hauteur top bar
```

### Typographie

- **Font Family** : `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`
- **Titres** : Font-weight 600
- **Texte normal** : Font-weight 400-500

### Ombres

```scss
box-shadow: 2px 0 5px rgba(0, 0, 0, 0.1);         // Sidebar
box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);         // Top bar
box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);      // Dropdown
```

---

## 🧩 Composants Principaux

### 1. DashboardLayoutComponent

**Rôle** : Conteneur principal qui assemble Sidebar + TopBar + Router Outlet

```typescript
// Chargement profil utilisateur au ngOnInit
ngOnInit(): void {
  this.loadUserProfile();
}

private loadUserProfile(): void {
  const token = localStorage.getItem('authToken');
  if (token) {
    const profile = { /* décoder token */ };
    this.layoutService.setUserProfile(profile);
  }
}
```

**Template** :
```html
<div class="app-container">
  <app-sidebar></app-sidebar>
  <main class="main-content">
    <app-topbar></app-topbar>
    <div class="content-wrapper">
      <router-outlet></router-outlet>
    </div>
  </main>
</div>
```

---

### 2. SidebarComponent

**Rôle** : Menu latéral dynamique avec sous-menus expandables

**Fonctionnalités** :
- Génération menu depuis JSON
- Toggle expansion sous-menus
- États collapsed/hidden
- Icônes Font Awesome
- Badges optionnels
- Scrollbar personnalisée

**Gestion sous-menus** :
```typescript
expandedMenus: Set<string> = new Set();

toggleSubmenu(menuId: string): void {
  if (this.expandedMenus.has(menuId)) {
    this.expandedMenus.delete(menuId);
  } else {
    this.expandedMenus.add(menuId);
  }
}
```

---

### 3. TopBarComponent

**Rôle** : Barre supérieure avec breadcrumb, toggle thème, menu utilisateur

**Fonctionnalités** :
- Bouton hamburger (toggle sidebar visibility)
- Breadcrumb dynamique (mis à jour à chaque navigation)
- Toggle thème clair/sombre (🌙/☀️)
- Avatar utilisateur (initiales)
- Dropdown menu (Profil + Déconnexion)

**Breadcrumb auto** :
```typescript
private updateBreadcrumb(): void {
  const url = this.router.url;
  const segments = url.split('/').filter(s => s);
  
  this.breadcrumbs = [
    { label: 'Accueil', route: '/dashboard' }
  ];
  
  segments.forEach(segment => {
    const label = labelMap[segment] || segment;
    this.breadcrumbs.push({ label, route: currentPath });
  });
}
```

---

## 🔧 Services

### LayoutService

**Rôle** : Gestion centralisée de l'état global (menu, thème, sidebar, profil)

#### Observables publics

```typescript
menuItems$: Observable<MenuItem[]>      // Menu courant
theme$: Observable<ThemeMode>            // Thème actif
sidebarState$: Observable<SidebarState>  // État sidebar
userProfile$: Observable<UserProfile>    // Profil utilisateur
```

#### Méthodes clés

```typescript
// Définir menu selon rôle
setMenuByRole(role: string): void {
  const isAdmin = role === 'superadmin' || role === 'admin';
  const menu = isAdmin ? ADMIN_MENU : USER_MENU;
  this.menuItemsSubject.next(menu);
}

// Basculer thème
toggleTheme(): void {
  const newTheme = current === 'light' ? 'dark' : 'light';
  this.themeSubject.next(newTheme);
  this.saveTheme(newTheme);           // localStorage
  this.applyThemeToBody(newTheme);    // CSS classes
}

// Toggle sidebar
toggleSidebarCollapse(): void { ... }
toggleSidebarVisibility(): void { ... }

// Profil utilisateur
setUserProfile(profile: UserProfile): void {
  this.userProfileSubject.next(profile);
  this.setMenuByRole(profile.role);
}
```

---

## 📊 Configuration du Menu

### Structure JSON

Deux configurations définies dans `menu.config.ts` :

#### USER_MENU (Utilisateurs normaux)

```typescript
export const USER_MENU: MenuItem[] = [
  {
    id: 'dashboard',
    title: 'Tableau de bord',
    icon: 'fas fa-tachometer-alt',
    route: '/dashboard',
    type: 'link',
    description: 'Vue d\'ensemble'
  },
  {
    id: 'mes-projets',
    title: 'Mes Projets',
    icon: 'fas fa-project-diagram',
    route: '/dashboard/mes-projets',
    type: 'link'
  }
];
```

#### ADMIN_MENU (Super Admin)

```typescript
export const ADMIN_MENU: MenuItem[] = [
  {
    id: 'organisations',
    title: 'Gestion des Organisations',
    icon: 'fas fa-building',
    route: '/admin/organisations',
    type: 'link',
    children: [
      {
        id: 'liste-organisations',
        title: 'Liste',
        icon: 'fas fa-list',
        route: '/admin/organisations/liste',
        type: 'link'
      },
      {
        id: 'ajouter-organisation',
        title: 'Ajouter',
        icon: 'fas fa-plus-circle',
        route: '/admin/organisations/ajouter',
        type: 'link'
      }
    ]
  },
  // ... autres sections admin
];
```

### Interface MenuItem

```typescript
interface MenuItem {
  id: string;
  title: string;
  icon?: string;                    // Classe Font Awesome
  route?: string;                   // Route Angular
  type: 'link' | 'submenu';
  description?: string;             // Tooltip
  children?: MenuItem[];            // Sous-menus
  badge?: {                         // Badge optionnel
    text: string;
    color: string;
  };
}
```

---

## 🛡️ Routing & Guards

### App Routing Module

Structure avec lazy loading et guards :

```typescript
const routes: Routes = [
  // Routes utilisateur
  {
    path: 'dashboard',
    component: DashboardLayoutComponent,
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      { 
        path: 'home',
        loadChildren: () => import('./features/dashboard/home/home.module')
          .then(m => m.HomeModule)
      },
      {
        path: 'mes-projets',
        loadChildren: () => import('./features/projets/projets.module')
          .then(m => m.ProjetsModule)
      }
    ]
  },
  
  // Routes admin (protégées)
  {
    path: 'admin',
    component: DashboardLayoutComponent,
    canActivate: [AdminGuard],  // ← GUARD ICI
    children: [
      {
        path: 'organisations',
        loadChildren: () => import('./features/admin/organisations/organisations.module')
          .then(m => m.OrganisationsModule)
      },
      // ... autres routes admin
    ]
  }
];
```

### AdminGuard

Protection des routes admin par vérification de rôle :

```typescript
@Injectable({ providedIn: 'root' })
export class AdminGuard implements CanActivate {

  canActivate(route, state): boolean {
    const token = localStorage.getItem('authToken');
    
    if (!token) {
      this.router.navigate(['/auth/login']);
      return false;
    }

    const userRole = this.getUserRoleFromToken(token);
    
    if (userRole !== 'superadmin' && userRole !== 'admin') {
      this.router.navigate(['/dashboard']);
      return false;
    }

    return true;
  }

  private getUserRoleFromToken(token: string): string {
    // TODO: Utiliser jwt-decode pour décoder le JWT
    // const decoded: any = jwt_decode(token);
    // return decoded.role;
    return 'superadmin'; // Simulation
  }
}
```

---

## 🌓 Thèmes Clair/Sombre

### Implémentation

Le basculement se fait via classes CSS sur `<body>` :

```typescript
toggleTheme(): void {
  const newTheme = current === 'light' ? 'dark' : 'light';
  
  if (newTheme === 'dark') {
    document.body.classList.add('dark-theme');
    document.body.classList.remove('light-theme');
  } else {
    document.body.classList.add('light-theme');
    document.body.classList.remove('dark-theme');
  }
  
  localStorage.setItem('app-theme', newTheme);
}
```

### Variables CSS Dark Theme

```scss
.dark-theme {
  --sidebar-background: #1a1a2e;
  --text-color: #e0e0e0;
  --border-color: #2d2d44;
  --hover-background: #252542;
  --shadow-color: rgba(0, 0, 0, 0.3);
  --background-color: #0f0f1e;
}
```

### Persistance

- Sauvegarde dans `localStorage`
- Rechargement au démarrage de l'app
- Appliqué immédiatement via `applyThemeToBody()`

---

## 💻 Utilisation

### 1. Import du LayoutModule

Dans `app.module.ts` :

```typescript
import { LayoutModule } from './core/layout/layout.module';

@NgModule({
  imports: [
    BrowserModule,
    AppRoutingModule,
    LayoutModule,  // ← Ajouter ici
    // ... autres modules
  ]
})
export class AppModule { }
```

### 2. Charger le profil après login

Dans votre `LoginComponent` ou `AuthService` :

```typescript
// Après connexion réussie
onLoginSuccess(response: any): void {
  const userProfile = {
    id: response.user.id,
    email: response.user.email,
    nom: response.user.nom,
    prenom: response.user.prenom,
    role: response.user.role,  // 'superadmin', 'admin', 'user'
    avatar: undefined
  };
  
  this.layoutService.setUserProfile(userProfile);
  this.router.navigate(['/dashboard']);
}
```

### 3. Navigation dans le dashboard

Les liens du menu utilisent `routerLink` :

```html
<a [routerLink]="item.route" routerLinkActive="active">
  {{ item.title }}
</a>
```

---

## 🎨 Personnalisation

### Modifier les couleurs

Dans `sidebar.component.scss` ou `topbar.component.scss` :

```scss
:root {
  --primary-color: #VOTRE_COULEUR;
  --primary-color-dark: #VOTRE_COULEUR_FONCEE;
  // ... autres variables
}
```

### Ajouter un élément de menu

Dans `menu.config.ts` :

```typescript
export const ADMIN_MENU: MenuItem[] = [
  // ... menus existants
  {
    id: 'nouveau-module',
    title: 'Nouveau Module',
    icon: 'fas fa-star',
    route: '/admin/nouveau',
    type: 'link',
    description: 'Description du module'
  }
];
```

### Changer les icônes

Utiliser les classes Font Awesome :

```typescript
icon: 'fas fa-nom-icone'  // Ex: 'fas fa-users', 'fas fa-cog', etc.
```

Liste complète : https://fontawesome.com/icons

### Personnaliser l'avatar

Dans `topbar.component.ts` :

```typescript
getUserInitials(user: UserProfile): string {
  if (!user) return 'U';
  
  // Option 1: Initiales (défaut)
  const first = user.prenom?.charAt(0) || '';
  const last = user.nom?.charAt(0) || '';
  return (first + last).toUpperCase();
  
  // Option 2: Image (si avatar disponible)
  // return user.avatar || this.getDefaultAvatar();
}
```

---

## 🚀 Prochaines Étapes

### À implémenter

1. **Modules fonctionnels** : Créer les modules lazy-loaded référencés dans le routing
2. **Décodage JWT** : Installer `jwt-decode` pour extraire le rôle du token
3. **API profil** : Appel backend pour récupérer profil complet
4. **Composants dashboard** : Pages home, organisations, utilisateurs, etc.
5. **Tests unitaires** : Tests des composants et services
6. **Animations avancées** : Transitions entre pages, effets hover
7. **Notifications** : Système de toast/alertes
8. **WebSocket** : Notifications temps réel pour admin

### Installation jwt-decode

```bash
npm install jwt-decode
```

Utilisation :

```typescript
import jwt_decode from 'jwt-decode';

private getUserRoleFromToken(token: string): string {
  try {
    const decoded: any = jwt_decode(token);
    return decoded.role;  // ou decoded.user.role selon structure JWT
  } catch (error) {
    console.error('Erreur décodage:', error);
    return 'user';
  }
}
```

---

## 📝 Notes Techniques

### Performance

- **Lazy loading** : Modules chargés à la demande
- **OnPush change detection** : À ajouter pour optimiser
- **TrackBy** : Utiliser dans `*ngFor` pour listes longues
- **Async pipe** : Auto-unsubscribe des observables

### Sécurité

- **Guards** : Protection routes par rôle
- **Token expiration** : À gérer avec interceptor
- **CORS** : Configurer côté Django
- **XSS** : Angular sanitization automatique

### Accessibilité

- **ARIA labels** : Boutons icon-only
- **Keyboard navigation** : Tabindex, Enter/Space
- **Contraste** : Respect WCAG AA
- **Screen readers** : Labels descriptifs

---

## 🆘 Dépannage

### Menu ne s'affiche pas

1. Vérifier que `LayoutModule` est importé dans `AppModule`
2. Vérifier que `setUserProfile()` est appelé après login
3. Console logs : vérifier `menuItems$` observable

### Thème ne persiste pas

1. Vérifier `localStorage.getItem('app-theme')`
2. Vérifier que `saveTheme()` est appelé
3. Refresh page : vérifier classe sur `<body>`

### Guard bloque accès admin

1. Vérifier token dans localStorage
2. Décoder token : vérifier champ `role`
3. Console : message du guard

### Sidebar ne se réduit pas

1. Vérifier `sidebarState$` observable
2. Console : logs de `toggleSidebarCollapse()`
3. CSS : vérifier transitions

---

## 📞 Support

Pour questions ou problèmes :
- Vérifier la console navigateur (logs détaillés)
- Inspecter éléments DOM (classes CSS)
- Debugger services Angular (DevTools)

---

**✅ Architecture prête à l'emploi !**

Votre dashboard unifié est maintenant structuré, robuste et extensible. Il ne reste plus qu'à créer les modules fonctionnels référencés dans le routing.
