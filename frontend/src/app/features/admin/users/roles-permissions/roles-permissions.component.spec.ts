import { of, throwError } from 'rxjs';
import { RolesPermissionsComponent } from './roles-permissions.component';
import { RoleInfo } from '../../../../core/models/user.model';

describe('RolesPermissionsComponent', () => {
  let cmp: RolesPermissionsComponent;
  let userService: jasmine.SpyObj<{ getRoles: any }>;
  let toast: jasmine.SpyObj<{ error: any }>;

  const roles = [
    { id: 'ROLE_SUPER_ADMIN', name: 'Super' },
    { id: 'ROLE_ORGANISATION_AGENT', name: 'Agent' },
  ] as RoleInfo[];

  beforeEach(() => {
    userService = jasmine.createSpyObj('UserService', ['getRoles']);
    toast = jasmine.createSpyObj('ToastService', ['error']);
    cmp = new RolesPermissionsComponent(userService as any, toast as any);
  });

  it('loadRoles remplit les rôles', () => {
    userService.getRoles.and.returnValue(of(roles));
    cmp.loadRoles();
    expect(cmp.roles).toEqual(roles);
    expect(cmp.loading).toBeFalse();
  });

  it('loadRoles gère l’erreur', () => {
    userService.getRoles.and.returnValue(throwError(() => new Error('x')));
    cmp.loadRoles();
    expect(toast.error).toHaveBeenCalled();
    expect(cmp.loading).toBeFalse();
  });

  it('selectRole bascule la sélection', () => {
    cmp.selectRole(roles[0]);
    expect(cmp.selectedRole).toBe(roles[0]);
    cmp.selectRole(roles[0]); // re-clic → désélection
    expect(cmp.selectedRole).toBeNull();
    cmp.selectRole(roles[0]);
    cmp.selectRole(roles[1]); // autre rôle → remplace
    expect(cmp.selectedRole).toBe(roles[1]);
  });

  it('getRoleIcon a un repli', () => {
    expect(cmp.getRoleIcon('ROLE_SUPER_ADMIN')).toBe('fa-skull');
    expect(cmp.getRoleIcon('INCONNU')).toBe('fa-user-circle');
  });

  it('getRoleBadgeClass / getRoleCardClass mappent les rôles', () => {
    expect(cmp.getRoleBadgeClass('ROLE_ADMIN_SYSTEME')).toBe('badge-admin');
    expect(cmp.getRoleBadgeClass('INCONNU')).toBe('badge-default');
    expect(cmp.getRoleCardClass('ROLE_ORGANISATION_AGENT')).toBe('role-agent');
    expect(cmp.getRoleCardClass('INCONNU')).toBe('');
  });
});
