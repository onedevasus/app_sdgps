import { of, throwError } from 'rxjs';
import { DashboardLayoutComponent } from './dashboard-layout.component';

describe('DashboardLayoutComponent', () => {
  let cmp: DashboardLayoutComponent;
  let layoutService: jasmine.SpyObj<{ sidebarState$: any; setUserProfile: any }>;
  let profileService: jasmine.SpyObj<{ getCurrentUser: any }>;

  beforeEach(() => {
    layoutService = jasmine.createSpyObj('LayoutService', ['setUserProfile']);
    (layoutService as any).sidebarState$ = of({ isCollapsed: true, isVisible: true });
    profileService = jasmine.createSpyObj('ProfileService', ['getCurrentUser']);
    cmp = new DashboardLayoutComponent(layoutService as any, profileService as any);
  });

  afterEach(() => localStorage.clear());

  it('charge le profil et le publie dans le LayoutService quand un token est présent', () => {
    localStorage.setItem('authToken', 'tok');
    profileService.getCurrentUser.and.returnValue(of({
      id: 1, email: 'u@x.ma', first_name: 'U', last_name: 'X',
      role: 'ROLE_ORGANISATION_AGENT', organization_name: 'Cadastre Haouz',
      profile_picture_url: 'http://img',
    }));
    cmp.ngOnInit();
    expect(profileService.getCurrentUser).toHaveBeenCalled();
    expect(layoutService.setUserProfile).toHaveBeenCalledWith(jasmine.objectContaining({
      id: 1, email: 'u@x.ma', role: 'ROLE_ORGANISATION_AGENT', avatar: 'http://img',
      organization_name: 'Cadastre Haouz',
    }));
  });

  it('ne charge pas de profil sans token', () => {
    localStorage.clear();
    cmp.ngOnInit();
    expect(profileService.getCurrentUser).not.toHaveBeenCalled();
  });

  it('ne publie aucun profil en cas d’erreur API', () => {
    localStorage.setItem('authToken', 'tok');
    profileService.getCurrentUser.and.returnValue(throwError(() => new Error('x')));
    cmp.ngOnInit();
    expect(layoutService.setUserProfile).not.toHaveBeenCalled();
  });
});
