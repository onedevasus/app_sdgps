import { Component, OnInit } from '@angular/core';
import { LayoutService } from '../../services/layout.service';
import { UserProfile, BreadcrumbItem, ThemeMode, SidebarState } from '../../interfaces/menu.interface';
import { Observable } from 'rxjs';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-topbar',
  templateUrl: './topbar.component.html',
  styleUrls: ['./topbar.component.scss']
})
export class TopBarComponent implements OnInit {
  
  userProfile$: Observable<UserProfile | null>;
  theme$: Observable<ThemeMode>;
  sidebarState$: Observable<SidebarState>;  // ← AJOUT: État sidebar pour icône dynamique
  breadcrumbs: BreadcrumbItem[] = [];
  showUserMenu = false;

  constructor(
    private layoutService: LayoutService,
    private router: Router
  ) {
    this.userProfile$ = this.layoutService.userProfile$;
    this.theme$ = this.layoutService.theme$;
    this.sidebarState$ = this.layoutService.sidebarState$;  // ← AJOUT
  }

  ngOnInit(): void {
    // Mettre à jour le breadcrumb à chaque navigation
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.updateBreadcrumb();
    });
  }

  /**
   * Basculer la visibilité de la sidebar
   */
  toggleSidebarVisibility(): void {
    this.layoutService.toggleSidebarVisibility();
  }

  /**
   * Basculer le thème
   */
  toggleTheme(): void {
    this.layoutService.toggleTheme();
  }

  /**
   * Basculer le menu utilisateur
   */
  toggleUserMenu(): void {
    this.showUserMenu = !this.showUserMenu;
  }

  /**
   * Fermer le menu utilisateur
   */
  closeUserMenu(): void {
    this.showUserMenu = false;
  }

  /**
   * Naviguer vers le profil
   */
  goToProfile(): void {
    console.log('👤 Navigation vers profil');
    this.closeUserMenu();
    // `/admin/profile` est protégé par l'AdminGuard (Super Admin / Admin Système / Admin
    // Org). Un opérateur (agent) y est refusé → renvoyé vers /dashboard/home. On route donc
    // les non-admins vers `/dashboard/profile` (même page, hors AdminGuard).
    const path = this.isAdminUser() ? '/admin/profile' : '/dashboard/profile';
    setTimeout(() => { this.router.navigate([path]); }, 100);
  }

  /** Rôles autorisés par l'AdminGuard (peuvent accéder à /admin/**). */
  private isAdminUser(): boolean {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return false;
      const payload = JSON.parse(atob(token.split('.')[1]));
      const role = payload.platform_role || payload.role || 'ROLE_ORGANISATION_AGENT';
      return ['ROLE_SUPER_ADMIN', 'ROLE_ADMIN_SYSTEME', 'ROLE_ORGANISATION_ADMIN'].includes(role);
    } catch {
      return false;
    }
  }

  /**
   * Déconnexion
   */
  logout(): void {
    this.closeUserMenu();
    console.log('🚪 Déconnexion utilisateur');
    
    // Appeler le service de déconnexion
    this.layoutService.logout();
    
    // Redirection vers la page de login
    setTimeout(() => {
      this.router.navigate(['/auth/login']);
      console.log('➡️ Redirection vers /auth/login');
    }, 100);
  }

  /**
   * Mettre à jour le fil d'Ariane selon l'URL courante
   */
  private updateBreadcrumb(): void {
    const url = this.router.url;
    const segments = url.split('/').filter(segment => segment);
    
    this.breadcrumbs = [
      { label: 'Accueil', route: '/dashboard', isActive: segments.length === 0 }
    ];

    let currentPath = '';
    segments.forEach((segment, index) => {
      currentPath += '/' + segment;
      
      // Mapper les segments d'URL vers des labels lisibles
      const labelMap: { [key: string]: string } = {
        'dashboard': 'Tableau de bord',
        'admin': 'Administration',
        'organisations': 'Organisations',
        'utilisateurs': 'Utilisateurs',
        'logs-audit': 'Logs',
        'supervision': 'Supervision',
        'quotas': 'Quotas',
        'maintenance': 'Maintenance',
        'mes-projets': 'Mes Projets'
      };

      const label = labelMap[segment] || segment;
      
      this.breadcrumbs.push({
        label: label,
        route: currentPath,
        isActive: index === segments.length - 1
      });
    });
  }

  /**
   * Obtenir les initiales de l'utilisateur pour l'avatar
   */
  getUserInitials(user: UserProfile | null): string {
    if (!user) return 'U';
    const first = user.first_name?.charAt(0) || '';
    const last = user.last_name?.charAt(0) || '';
    return (first + last).toUpperCase();
  }

  /**
   * Gérer l'erreur de chargement d'image - Fallback sur avatar
   */
  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img) {
      // Cacher l'image
      img.style.display = 'none';
      // Afficher l'élément suivant (avatar circle)
      const nextSibling = img.nextElementSibling as HTMLElement;
      if (nextSibling) {
        nextSibling.style.display = 'flex';
      }
    }
  }
}
