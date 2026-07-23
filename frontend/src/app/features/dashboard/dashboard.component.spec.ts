import { DashboardComponent } from './dashboard.component';

describe('DashboardComponent', () => {
  let authService: jasmine.SpyObj<{ logout: any }>;
  let router: jasmine.SpyObj<{ navigate: any }>;
  let cmp: DashboardComponent;

  beforeEach(() => {
    authService = jasmine.createSpyObj('AuthService', ['logout']);
    router = jasmine.createSpyObj('Router', ['navigate']);
    cmp = new DashboardComponent(authService as any, router as any);
  });

  it('logout() déconnecte puis redirige vers login', () => {
    cmp.logout();
    expect(authService.logout).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
  });
});
