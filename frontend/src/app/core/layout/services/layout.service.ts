import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { MenuItem, ThemeMode, SidebarState, UserProfile } from '../interfaces/menu.interface';
import { USER_MENU, ADMIN_MENU } from '../config/menu.config';

@Injectable({
  providedIn: 'root'
})
export class LayoutService {
  
  // État du menu (Observable)
  private menuItemsSubject = new BehaviorSubject<MenuItem[]>([]);
  public menuItems$: Observable<MenuItem[]> = this.menuItemsSubject.asObservable();

  // État du thème
  private themeSubject = new BehaviorSubject<ThemeMode>('light');
  public theme$: Observable<ThemeMode> = this.themeSubject.asObservable();

  // État de la sidebar
  private sidebarStateSubject = new BehaviorSubject<SidebarState>({
    isCollapsed: false,
    isVisible: true
  });
  public sidebarState$: Observable<SidebarState> = this.sidebarStateSubject.asObservable();

  // Profil utilisateur courant
  private userProfileSubject = new BehaviorSubject<UserProfile | null>(null);
  public userProfile$: Observable<UserProfile | null> = this.userProfileSubject.asObservable();

  constructor(private router: Router) {
    // Charger le thème depuis localStorage au démarrage
    this.loadTheme();
  }

  /**
   * Définir le menu selon le rôle de l'utilisateur
   */
  setMenuByRole(role: string): void {
    const isAdmin = role === 'superadmin' || role === 'admin' || role === 'ROLE_APP_ADMIN';
    const menu = isAdmin ? ADMIN_MENU : USER_MENU;
    this.menuItemsSubject.next(menu);
    
    console.log(`📋 Menu chargé pour rôle: ${role} (${menu.length} éléments)`);
  }

  /**
   * Définir le profil utilisateur
   */
  setUserProfile(profile: UserProfile): void {
    this.userProfileSubject.next(profile);
    this.setMenuByRole(profile.role);
  }

  /**
   * Basculer le thème clair/sombre
   */
  toggleTheme(): void {
    const currentTheme = this.themeSubject.getValue();
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    this.themeSubject.next(newTheme);
    this.saveTheme(newTheme);
    this.applyThemeToBody(newTheme);
    
    console.log(`🎨 Thème changé: ${newTheme}`);
  }

  /**
   * Appliquer le thème au body
   */
  private applyThemeToBody(theme: ThemeMode): void {
    if (theme === 'dark') {
      // Thème sombre = pas d'attribut (défaut dans styles.scss)
      document.body.removeAttribute('data-theme');
    } else {
      // Thème clair = attribut data-theme="light"
      document.body.setAttribute('data-theme', 'light');
    }
  }

  /**
   * Sauvegarder le thème dans localStorage
   */
  private saveTheme(theme: ThemeMode): void {
    localStorage.setItem('app-theme', theme);
  }

  /**
   * Charger le thème depuis localStorage
   */
  private loadTheme(): void {
    const savedTheme = localStorage.getItem('app-theme') as ThemeMode | null;
    // Thème par défaut: sombre (comme geoportail v2.8)
    const theme = savedTheme || 'dark';
    
    this.themeSubject.next(theme);
    this.applyThemeToBody(theme);
  }

  /**
   * Basculer l'état collapsed de la sidebar
   */
  toggleSidebarCollapse(): void {
    const currentState = this.sidebarStateSubject.getValue();
    const newState = {
      ...currentState,
      isCollapsed: !currentState.isCollapsed
    };
    
    this.sidebarStateSubject.next(newState);
    console.log(`📐 Sidebar collapsed: ${newState.isCollapsed}`);
  }

  /**
   * Basculer la visibilité de la sidebar
   */
  toggleSidebarVisibility(): void {
    const currentState = this.sidebarStateSubject.getValue();
    const newState = {
      ...currentState,
      isVisible: !currentState.isVisible
    };
    
    this.sidebarStateSubject.next(newState);
    console.log(`👁️ Sidebar visible: ${newState.isVisible}`);
  }

  /**
   * Obtenir le thème actuel
   */
  getCurrentTheme(): ThemeMode {
    return this.themeSubject.getValue();
  }

  /**
   * Obtenir l'état actuel de la sidebar
   */
  getSidebarState(): SidebarState {
    return this.sidebarStateSubject.getValue();
  }

  /**
   * Déconnecter l'utilisateur (reset état + redirection)
   */
  logout(): void {
    console.log('🚪 LayoutService: Déconnexion utilisateur en cours...');
    
    // Supprimer le token JWT du localStorage (clé principale utilisée par AuthService)
    localStorage.removeItem('authToken');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    
    // Réinitialiser l'état utilisateur
    this.userProfileSubject.next(null);
    this.menuItemsSubject.next([]);
    
    // Conserver le thème (optionnel - supprimer si vous voulez reset aussi)
    // localStorage.removeItem('app-theme');
    
    console.log('✅ LayoutService: Tokens supprimés, état réinitialisé');
    
    // Rediriger vers la page de connexion
    this.router.navigate(['/auth/login']).then(() => {
      console.log('✅ LayoutService: Redirection vers /auth/login');
    });
  }
}
