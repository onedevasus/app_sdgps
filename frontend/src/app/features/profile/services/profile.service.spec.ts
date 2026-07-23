import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { ProfileService, UserProfile, ChangePasswordRequest } from './profile.service';
import { environment } from '../../../../environments/environment';

describe('ProfileService', () => {
  let service: ProfileService;
  let httpMock: HttpTestingController;

  const baseUrl = `${environment.apiUrl}/v1/platform-admin/me`;

  const fakeProfile: UserProfile = {
    id: 1,
    email: 'admin@example.com',
    first_name: 'Admin',
    last_name: 'Test',
    full_name: 'Admin Test',
    role: 'ROLE_SUPER_ADMIN',
    role_display: 'Super Admin',
    date_joined: '2026-01-01T00:00:00Z',
  };

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ProfileService],
    });
    service = TestBed.inject(ProfileService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('devrait être créé', () => {
    expect(service).toBeTruthy();
  });

  it('getCurrentUser() appelle /auth/me/', () => {
    service.getCurrentUser().subscribe(p => expect(p).toEqual(fakeProfile));
    const req = httpMock.expectOne(`${environment.apiUrl}/auth/me/`);
    expect(req.request.method).toBe('GET');
    req.flush(fakeProfile);
  });

  it('getProfile() charge le profil et notifie les subscribers', () => {
    let notified: UserProfile | null | undefined;
    service.onProfileUpdated().subscribe(p => (notified = p));

    service.getProfile().subscribe(p => expect(p).toEqual(fakeProfile));
    const req = httpMock.expectOne(`${baseUrl}/profile/`);
    expect(req.request.method).toBe('GET');
    req.flush(fakeProfile);

    expect(notified).toEqual(fakeProfile);
  });

  it('getProfile() propage les erreurs', () => {
    let errored = false;
    service.getProfile().subscribe({ next: () => {}, error: () => (errored = true) });
    httpMock.expectOne(`${baseUrl}/profile/`).flush('boom', { status: 500, statusText: 'Server Error' });
    expect(errored).toBeTrue();
  });

  it('updateProfile() envoie un PUT et notifie avec response.data', () => {
    let notified: UserProfile | null | undefined;
    service.onProfileUpdated().subscribe(p => (notified = p));

    const patch: Partial<UserProfile> = { first_name: 'Nouveau' };
    service.updateProfile(patch).subscribe(r => expect(r.message).toBe('ok'));

    const req = httpMock.expectOne(`${baseUrl}/profile/`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(patch);
    req.flush({ message: 'ok', data: fakeProfile });

    expect(notified).toEqual(fakeProfile);
  });

  it('changePassword() envoie un POST vers change-password', () => {
    const payload: ChangePasswordRequest = {
      current_password: 'old',
      new_password: 'newpass',
      confirm_password: 'newpass',
    };
    service.changePassword(payload).subscribe(r => expect(r.message).toBe('changé'));

    const req = httpMock.expectOne(`${baseUrl}/change-password/`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ message: 'changé' });
  });

  it('uploadProfilePicture() envoie un FormData et extrait profile depuis response.data', () => {
    let notified: UserProfile | null | undefined;
    service.onProfileUpdated().subscribe(p => (notified = p));

    const file = new File(['x'], 'photo.png', { type: 'image/png' });
    service.uploadProfilePicture(file).subscribe(p => expect(p).toEqual(fakeProfile));

    const req = httpMock.expectOne(`${baseUrl}/profile/`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body instanceof FormData).toBeTrue();
    req.flush({ data: fakeProfile });

    expect(notified).toEqual(fakeProfile);
  });

  it('uploadProfilePicture() retourne response quand data est absent', () => {
    const file = new File(['x'], 'photo.png', { type: 'image/png' });
    service.uploadProfilePicture(file).subscribe(p => expect(p).toEqual(fakeProfile));
    httpMock.expectOne(`${baseUrl}/profile/`).flush(fakeProfile);
  });

  it('deleteProfilePicture() PATCH puis recharge le profil', () => {
    service.deleteProfilePicture().subscribe(r => expect(r.message).toBe('supprimée'));

    const patchReq = httpMock.expectOne(
      req => req.method === 'PATCH' && req.url === `${baseUrl}/profile/`
    );
    expect(patchReq.request.body).toEqual({ profile_picture: null });
    patchReq.flush({ message: 'supprimée' });

    // Le tap déclenche un getProfile() de rechargement
    httpMock.expectOne(`${baseUrl}/profile/`).flush(fakeProfile);
  });

  it('notifyProfileUpdate() pousse une valeur aux subscribers', () => {
    let notified: UserProfile | null | undefined;
    service.onProfileUpdated().subscribe(p => (notified = p));
    service.notifyProfileUpdate(fakeProfile);
    expect(notified).toEqual(fakeProfile);
  });
});
