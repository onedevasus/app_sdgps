import { USER_MENU, ADMIN_MENU } from './menu.config';

/**
 * Épingle la cible du « Tableau de bord » par rôle :
 *  - Agent & Admin d'organisation → /dashboard
 *  - Super Admin & Admin Système  → /admin/dashboard
 */
describe('menu.config — Tableau de bord par rôle', () => {
  it('Agent d\'organisation (USER_MENU) → /dashboard', () => {
    const item = USER_MENU.find(i => i.id === 'dashboard');
    expect(item?.route).toBe('/dashboard');
  });

  it('Admin d\'organisation → /dashboard', () => {
    const item = ADMIN_MENU.find(i => i.route === '/dashboard' && i.roles?.includes('ROLE_ORGANISATION_ADMIN'));
    expect(item).withContext('entrée org-admin vers /dashboard attendue').toBeTruthy();
    expect(item?.title).toBe('Tableau de bord');
  });

  it('Super Admin & Admin Système → /admin/dashboard (jamais Admin d\'organisation)', () => {
    const item = ADMIN_MENU.find(i => i.route === '/admin/dashboard' && i.id === 'dashboard');
    expect(item?.roles).toEqual(['ROLE_SUPER_ADMIN', 'ROLE_ADMIN_SYSTEME']);
    expect(item?.roles).not.toContain('ROLE_ORGANISATION_ADMIN');
  });
});
