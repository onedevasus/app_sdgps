import { TestBed } from '@angular/core/testing';
import { HttpClient, HTTP_INTERCEPTORS } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';

import { AuthInterceptor } from './auth.interceptor';
import { AuthService } from '../auth/auth.service';

describe('AuthInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    localStorage.clear();
    router = jasmine.createSpyObj('Router', ['navigate']);
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AuthService,
        { provide: Router, useValue: router },
        { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('ajoute l’en-tête Authorization quand un token est présent', () => {
    localStorage.setItem('authToken', 'abc');
    http.get('/api/x').subscribe();
    const req = httpMock.expectOne('/api/x');
    expect(req.request.headers.get('Authorization')).toBe('Bearer abc');
    req.flush({});
  });

  it('n’ajoute pas d’en-tête sans token', () => {
    http.get('/api/x').subscribe();
    const req = httpMock.expectOne('/api/x');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({});
  });

  it('sur 401 sans refresh token → logout et redirection vers /auth/login', () => {
    localStorage.setItem('authToken', 'abc'); // pas de refreshToken
    http.get('/api/x').subscribe({ next: () => fail('doit échouer'), error: () => {} });
    const req = httpMock.expectOne('/api/x');
    req.flush('unauth', { status: 401, statusText: 'Unauthorized' });

    expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
    expect(localStorage.getItem('authToken')).toBeNull(); // logout() a purgé
  });
});
