import { FormBuilder } from '@angular/forms';
import { fakeAsync, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { VerifyCodeComponent } from './verify-code.component';

function makeCmp(queryParams: any, authService: any, router: any) {
  const route = { queryParams: of(queryParams) };
  const cmp = new VerifyCodeComponent(new FormBuilder(), authService, router, route as any);
  cmp.ngOnInit();
  return cmp;
}

describe('VerifyCodeComponent (logique)', () => {
  let authService: jasmine.SpyObj<{ verifyResetCode: any; forgotPassword: any }>;
  let router: jasmine.SpyObj<{ navigate: any }>;

  beforeEach(() => {
    authService = jasmine.createSpyObj('AuthService', ['verifyResetCode', 'forgotPassword']);
    router = jasmine.createSpyObj('Router', ['navigate']);
  });

  it('récupère l’email depuis les query params', () => {
    const cmp = makeCmp({ email: 'user@example.com' }, authService, router);
    expect(cmp.email).toBe('user@example.com');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('redirige vers forgot-password si aucun email', () => {
    makeCmp({}, authService, router);
    expect(router.navigate).toHaveBeenCalledWith(['/auth/forgot-password']);
  });

  it('refuse un code incomplet sans appeler le service', () => {
    const cmp = makeCmp({ email: 'u@e.com' }, authService, router);
    cmp.verifyForm.setValue({ code: '123' });
    cmp.onSubmit();
    expect(authService.verifyResetCode).not.toHaveBeenCalled();
    expect(cmp.errorMessage).toContain('6 chiffres');
  });

  it('vérifie le code puis redirige vers reset-password avec le token', fakeAsync(() => {
    authService.verifyResetCode.and.returnValue(of({ token: 'tok-123' }));
    const cmp = makeCmp({ email: 'u@e.com' }, authService, router);
    cmp.verifyForm.setValue({ code: '123456' });
    cmp.onSubmit();

    expect(authService.verifyResetCode).toHaveBeenCalledWith('u@e.com', '123456');
    expect(cmp.successMessage).toContain('vérifié');

    tick(1000);
    expect(router.navigate).toHaveBeenCalledWith(['/auth/reset-password'], {
      queryParams: { email: 'u@e.com', token: 'tok-123' },
    });
  }));

  it('affiche l’erreur backend en cas de code invalide', () => {
    authService.verifyResetCode.and.returnValue(
      throwError(() => ({ error: { detail: 'Code expiré' } }))
    );
    const cmp = makeCmp({ email: 'u@e.com' }, authService, router);
    cmp.verifyForm.setValue({ code: '000000' });
    cmp.onSubmit();
    expect(cmp.errorMessage).toBe('Code expiré');
    expect(cmp.isLoading).toBeFalse();
  });

  it('resendCode déclenche un renvoi et démarre le compte à rebours', () => {
    authService.forgotPassword.and.returnValue(of({}));
    const cmp = makeCmp({ email: 'u@e.com' }, authService, router);
    cmp.resendCode();
    expect(authService.forgotPassword).toHaveBeenCalledWith('u@e.com');
    expect(cmp.successMessage).toContain('Nouveau code');
    expect(cmp.resendDisabled).toBeTrue();
    expect(cmp.countdown).toBe(60);
  });

  it('resendCode ne fait rien si déjà désactivé', () => {
    const cmp = makeCmp({ email: 'u@e.com' }, authService, router);
    cmp.resendDisabled = true;
    cmp.resendCode();
    expect(authService.forgotPassword).not.toHaveBeenCalled();
  });

  it('startCountdown décrémente puis réactive le renvoi', fakeAsync(() => {
    const cmp = makeCmp({ email: 'u@e.com' }, authService, router);
    cmp.startCountdown();
    expect(cmp.countdown).toBe(60);
    tick(60000);
    expect(cmp.resendDisabled).toBeFalse();
    expect(cmp.countdown).toBe(0);
  }));
});
