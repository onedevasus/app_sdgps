import { FormBuilder } from '@angular/forms';
import { ChangePasswordComponent } from './change-password.component';

describe('ChangePasswordComponent (logique)', () => {
  let cmp: ChangePasswordComponent;
  const fb = new FormBuilder();

  beforeEach(() => {
    cmp = new ChangePasswordComponent({} as any, {} as any, {} as any, {} as any);
  });

  it('passwordMatchValidator pose/retire l’erreur mismatch sur confirm_password', () => {
    const form = fb.group({
      current_password: 'x',
      new_password: 'Abcd1234!',
      confirm_password: 'different',
    });
    cmp.passwordMatchValidator(form);
    expect(form.get('confirm_password')?.hasError('mismatch')).toBeTrue();

    form.get('confirm_password')?.setValue('Abcd1234!');
    cmp.passwordMatchValidator(form);
    expect(form.get('confirm_password')?.hasError('mismatch')).toBeFalse();
  });

  it('getTitle / getInstructionMessage dépendent de la raison', () => {
    cmp.reason = 'first_login';
    expect(cmp.getTitle()).toContain('Première connexion');
    expect(cmp.getInstructionMessage()).toContain('sécurité');

    cmp.reason = '';
    expect(cmp.getTitle()).toBe('Changer votre mot de passe');
  });
});
