import { FormBuilder } from '@angular/forms';
import { fakeAsync, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { ForgotPasswordComponent } from './forgot-password.component';

describe('ForgotPasswordComponent (logique)', () => {
  let cmp: ForgotPasswordComponent;
  let authService: jasmine.SpyObj<{ forgotPassword: any }>;
  let router: jasmine.SpyObj<{ navigate: any }>;

  beforeEach(() => {
    authService = jasmine.createSpyObj('AuthService', ['forgotPassword']);
    router = jasmine.createSpyObj('Router', ['navigate']);
    cmp = new ForgotPasswordComponent(
      new FormBuilder(),
      authService as any,
      router as any,
      {} as any
    );
    cmp.ngOnInit();
  });

  it('construit un formulaire invalide au départ', () => {
    expect(cmp.forgotPasswordForm.valid).toBeFalse();
  });

  it('refuse un email invalide sans appeler le service', () => {
    cmp.forgotPasswordForm.setValue({ email: 'pas-un-email' });
    cmp.onSubmit();
    expect(authService.forgotPassword).not.toHaveBeenCalled();
    expect(cmp.errorMessage).toContain('email valide');
    expect(cmp.isLoading).toBeFalse();
  });

  it('envoie la demande puis redirige vers verify-code', fakeAsync(() => {
    authService.forgotPassword.and.returnValue(of({}));
    cmp.forgotPasswordForm.setValue({ email: 'user@example.com' });
    cmp.onSubmit();

    expect(authService.forgotPassword).toHaveBeenCalledWith('user@example.com');
    expect(cmp.successMessage).toContain('code de vérification');
    expect(cmp.isLoading).toBeFalse();

    tick(2000);
    expect(router.navigate).toHaveBeenCalledWith(['/auth/verify-code'], {
      queryParams: { email: 'user@example.com' },
    });
  }));

  it('affiche le message d’erreur backend', () => {
    authService.forgotPassword.and.returnValue(
      throwError(() => ({ error: { message: 'Compte introuvable' } }))
    );
    cmp.forgotPasswordForm.setValue({ email: 'user@example.com' });
    cmp.onSubmit();
    expect(cmp.errorMessage).toBe('Compte introuvable');
    expect(cmp.isLoading).toBeFalse();
  });

  it('shouldShowError ne s’active qu’après interaction', () => {
    const ctrl = cmp.forgotPasswordForm.get('email')!;
    expect(cmp.shouldShowError('email')).toBeFalse();
    ctrl.markAsTouched();
    expect(cmp.shouldShowError('email')).toBeTrue();
  });
});
