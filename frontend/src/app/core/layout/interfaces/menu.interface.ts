/**
 * Interface pour la structure d'un élément de menu
 */
export interface MenuItem {
  id: string;
  title: string;
  icon?: string;
  route?: string;
  type: 'link' | 'submenu';
  description?: string;
  children?: MenuItem[];
  badge?: {
    text: string;
    color: string;
  };
}

/**
 * Interface pour le fil d'Ariane (breadcrumb)
 */
export interface BreadcrumbItem {
  label: string;
  route?: string;
  isActive?: boolean;
}

/**
 * Interface pour l'utilisateur connecté
 */
export interface UserProfile {
  id: number;
  email: string;
  first_name: string;   // Prénom (champ Django standard)
  last_name: string;    // Nom (champ Django standard)
  role: string;
  avatar?: string;
  last_connection_at?: string;  // ← AJOUT: Date dernière connexion (ISO format)
}

/**
 * État du thème (clair/sombre)
 */
export type ThemeMode = 'light' | 'dark';

/**
 * État de la sidebar
 */
export interface SidebarState {
  isCollapsed: boolean;
  isVisible: boolean;
}
