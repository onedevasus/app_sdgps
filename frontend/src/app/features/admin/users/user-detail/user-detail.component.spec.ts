import { FormBuilder } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { UserDetailComponent } from './user-detail.component';
import { User } from '../../../../core/models/user.model';

describe('UserDetailComponent (logique)', () => {
  let cmp: UserDetailComponent;
  let userService: jasmine.SpyObj<{ getUser: any; updateUser: any; resetPassword: any; toggleActive: any }>;
  let toast: jasmine.SpyObj<{ success: any; error: any }>;
  let router: jasmine.SpyObj<{ navigate: any }>;

  const user: User = {
    id: 'u1', first_name: 'Ali', last_name: 'Ben', email: 'ali@x.ma',
    nom_societe: 'ACME', is_active: true, role: 'ROLE_ORGANISATION_AGENT',
    organization_id: 'org1',
  } as any;

  beforeEach(() => {
    userService = jasmine.createSpyObj('UserService', ['getUser', 'updateUser', 'resetPassword', 'toggleActive']);
    toast = jasmine.createSpyObj('ToastService', ['success', 'error']);
    router = jasmine.createSpyObj('Router', ['navigate']);
    cmp = new UserDetailComponent(
      { snapshot: { paramMap: { get: () => 'u1' } } } as any,
      router as any, userService as any, {} as any, toast as any, new FormBuilder(),
    );
    cmp.user = { ...user };
    cmp.editForm.patchValue({ ...user, organization_id: user.organization_id });
  });

  it('getRoleBadgeClass mappe les rôles', () => {
    expect(cmp.getRoleBadgeClass('ROLE_SUPER_ADMIN')).toBe('badge-super-admin');
    expect(cmp.getRoleBadgeClass('INCONNU')).toBe('badge-default');
  });

  it('toggleEdit restaure le formulaire à l’annulation', () => {
    cmp.isEditing = true;
    cmp.editForm.patchValue({ first_name: 'Modifié' });
    cmp.toggleEdit(); // ferme l'édition → restaure
    expect(cmp.isEditing).toBeFalse();
    expect(cmp.editForm.value.first_name).toBe('Ali');
  });

  it('onCheckboxChange met à jour is_active', () => {
    cmp.onCheckboxChange({ target: { checked: false } } as any);
    expect(cmp.editForm.value.is_active).toBeFalse();
  });

  it('save n’envoie que les champs modifiés', () => {
    userService.updateUser.and.returnValue(of({ ...user, first_name: 'Nouveau' }));
    cmp.editForm.patchValue({ first_name: 'Nouveau' });
    cmp.save();
    expect(userService.updateUser).toHaveBeenCalledWith('u1', { first_name: 'Nouveau' });
    expect(cmp.isEditing).toBeFalse();
    expect(toast.success).toHaveBeenCalled();
  });

  it('save ignoré si formulaire vide de changement mais invalide', () => {
    cmp.editForm.setErrors({ invalid: true });
    cmp.save();
    expect(userService.updateUser).not.toHaveBeenCalled();
  });

  it('confirmResetPassword expose le nouveau mot de passe', () => {
    userService.resetPassword.and.returnValue(of({ new_password: 'Temp1234!' }));
    cmp.confirmResetPassword();
    expect(cmp.newPassword).toBe('Temp1234!');
    expect(cmp.showResetPassword).toBeTrue();
  });

  it('toggleActive recharge l’utilisateur après succès', () => {
    userService.toggleActive.and.returnValue(of({}));
    userService.getUser.and.returnValue(of({ ...user, is_active: false }));
    cmp.toggleActive();
    expect(userService.toggleActive).toHaveBeenCalledWith('u1');
    expect(toast.success).toHaveBeenCalled();
  });

  it('goBack navigue vers la liste', () => {
    cmp.goBack();
    expect(router.navigate).toHaveBeenCalledWith(['/admin/utilisateurs']);
  });

  it('loadUser gère l’erreur et redirige', () => {
    userService.getUser.and.returnValue(throwError(() => new Error('x')));
    cmp.loadUser('u1');
    expect(toast.error).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/admin/utilisateurs']);
  });
});
