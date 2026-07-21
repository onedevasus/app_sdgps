import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { AdminGuard } from './admin.guard';

function makeJwt(payload: object): string {
  return `x.${btoa(JSON.stringify(payload))}.y`;
}

describe('AdminGuard', () => {
  let guard: AdminGuard;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    localStorage.clear();
    router = jasmine.createSpyObj('Router', ['navigate']);
    TestBed.configureTestingModule({
      providers: [AdminGuard, { provide: Router, useValue: router }],
    });
    guard = TestBed.inject(AdminGuard);
  });

  afterEach(() => localStorage.clear());

  const canActivate = () => guard.canActivate({} as any, {} as any);

  it('refuse et redirige vers login sans token', () => {
    expect(canActivate()).toBeFalse();
    expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
  });

  it('refuse et redirige vers /home pour un rôle insuffisant (agent)', () => {
    localStorage.setItem('authToken', makeJwt({ role: 'ROLE_ORGANISATION_AGENT' }));
    expect(canActivate()).toBeFalse();
    expect(router.navigate).toHaveBeenCalledWith(['/home']);
  });

  it('autorise un Admin Système', () => {
    localStorage.setItem('authToken', makeJwt({ platform_role: 'ROLE_ADMIN_SYSTEME' }));
    expect(canActivate()).toBeTrue();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('autorise un Admin d’organisation', () => {
    localStorage.setItem('authToken', makeJwt({ role: 'ROLE_ORGANISATION_ADMIN' }));
    expect(canActivate()).toBeTrue();
  });
});
