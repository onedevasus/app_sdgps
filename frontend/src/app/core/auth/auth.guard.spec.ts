import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';

import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;
  const fakeUrlTree = {} as UrlTree;

  beforeEach(() => {
    authService = jasmine.createSpyObj('AuthService', ['isLoggedIn']);
    router = jasmine.createSpyObj('Router', ['createUrlTree']);
    router.createUrlTree.and.returnValue(fakeUrlTree);

    TestBed.configureTestingModule({
      providers: [
        AuthGuard,
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
      ],
    });
    guard = TestBed.inject(AuthGuard);
  });

  const canActivate = () => guard.canActivate({} as any, {} as any);

  it('autorise la navigation quand l’utilisateur est connecté', () => {
    authService.isLoggedIn.and.returnValue(true);
    expect(canActivate()).toBeTrue();
    expect(router.createUrlTree).not.toHaveBeenCalled();
  });

  it('redirige vers /auth/login quand l’utilisateur n’est pas connecté', () => {
    authService.isLoggedIn.and.returnValue(false);
    expect(canActivate()).toBe(fakeUrlTree);
    expect(router.createUrlTree).toHaveBeenCalledWith(['/auth/login']);
  });
});
