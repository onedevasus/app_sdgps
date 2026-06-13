import { MenuItem } from '../interfaces/menu.interface';

/**
 * Configuration du menu pour les utilisateurs normaux
 */
export const USER_MENU: MenuItem[] = [
  {
    id: 'dashboard',
    title: 'Tableau de bord',
    icon: 'fas fa-tachometer-alt',
    route: '/dashboard',
    type: 'link',
    description: 'Vue d\'ensemble de vos projets et activités'
  },
  {
    id: 'mes-projets',
    title: 'Mes Projets',
    icon: 'fas fa-project-diagram',
    route: '/dashboard/mes-projets',
    type: 'link',
    description: 'Gestion de vos projets personnels'
  }
];

/**
 * Configuration du menu pour le Super Admin
 */
export const ADMIN_MENU: MenuItem[] = [
  {
    id: 'dashboard',
    title: 'Tableau de bord',
    icon: 'fas fa-tachometer-alt',
    route: '/admin/dashboard',
    type: 'link',
    description: 'Vue d\'ensemble système'
  },
  {
    id: 'organisations',
    title: 'Gestion des Organisations',
    icon: 'fas fa-building',
    route: '/admin/organisations',
    type: 'link',
    description: 'CRUD des organisations',
    children: [
      {
        id: 'liste-organisations',
        title: 'Liste des organisations',
        icon: 'fas fa-list',
        route: '/admin/organisations/liste',
        type: 'link',
        description: 'Voir toutes les organisations'
      },
      {
        id: 'ajouter-organisation',
        title: 'Ajouter une organisation',
        icon: 'fas fa-plus-circle',
        route: '/admin/organisations/ajouter',
        type: 'link',
        description: 'Créer une nouvelle organisation'
      }
    ]
  },
  {
    id: 'utilisateurs',
    title: 'Utilisateurs & Rôles',
    icon: 'fas fa-users-cog',
    route: '/admin/utilisateurs',
    type: 'link',
    description: 'Gestion des utilisateurs et permissions',
    children: [
      {
        id: 'liste-utilisateurs',
        title: 'Liste des utilisateurs',
        icon: 'fas fa-users',
        route: '/admin/utilisateurs/liste',
        type: 'link',
        description: 'Tous les utilisateurs'
      },
      {
        id: 'invitations',
        title: 'Invitations',
        icon: 'fas fa-envelope-open-text',
        route: '/admin/utilisateurs/invitations',
        type: 'link',
        description: 'Inviter Admins/Managers/Utilisateurs'
      },
      {
        id: 'roles-permissions',
        title: 'Rôles & Permissions',
        icon: 'fas fa-user-shield',
        route: '/admin/utilisateurs/roles',
        type: 'link',
        description: 'Configuration RBAC'
      }
    ]
  },
  {
    id: 'logs-audit',
    title: 'Logs d\'Audit',
    icon: 'fas fa-history',
    route: '/admin/logs-audit',
    type: 'link',
    description: 'Traçabilité des actions utilisateurs'
  },
  {
    id: 'supervision',
    title: 'Supervision Système',
    icon: 'fas fa-chart-line',
    route: '/admin/supervision',
    type: 'link',
    description: 'Health Check & Stats globales',
    children: [
      {
        id: 'health-check',
        title: 'Health Check',
        icon: 'fas fa-heartbeat',
        route: '/admin/supervision/health',
        type: 'link',
        description: 'État des services'
      },
      {
        id: 'stats-globales',
        title: 'Statistiques',
        icon: 'fas fa-chart-bar',
        route: '/admin/supervision/stats',
        type: 'link',
        description: 'Métriques système'
      }
    ]
  },
  {
    id: 'quotas',
    title: 'Gestion des Quotas',
    icon: 'fas fa-database',
    route: '/admin/quotas',
    type: 'link',
    description: 'Stockage & Limites projets',
    children: [
      {
        id: 'stockage',
        title: 'Espace de stockage',
        icon: 'fas fa-hdd',
        route: '/admin/quotas/stockage',
        type: 'link',
        description: 'Gestion du stockage'
      },
      {
        id: 'limites-projets',
        title: 'Limites projets',
        icon: 'fas fa-sliders-h',
        route: '/admin/quotas/limites',
        type: 'link',
        description: 'Configuration des quotas'
      }
    ]
  },
  {
    id: 'maintenance',
    title: 'Mode Maintenance',
    icon: 'fas fa-tools',
    route: '/admin/maintenance',
    type: 'link',
    description: 'Switch global maintenance'
  }
];
