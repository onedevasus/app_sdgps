import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { PieceSortConfigService } from './piece-sort-config.service';
import { environment } from '../../../environments/environment';

const URL = `${environment.apiUrl}/auth/me/piece-sort-config/`;

describe('PieceSortConfigService', () => {
  let service: PieceSortConfigService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [PieceSortConfigService],
    });
    service = TestBed.inject(PieceSortConfigService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('get() met en cache (un seul appel HTTP pour deux souscriptions)', () => {
    service.get().subscribe();
    service.get().subscribe();
    const req = httpMock.expectOne(URL); // un seul, sinon expectOne échoue
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('clearCache() force un nouvel appel', () => {
    service.get().subscribe();
    httpMock.expectOne(URL).flush({});
    service.clearCache();
    service.get().subscribe();
    httpMock.expectOne(URL).flush({});
  });

  it('save() PUT', () => {
    service.save({}).subscribe();
    const req = httpMock.expectOne(URL);
    expect(req.request.method).toBe('PUT');
    req.flush({});
  });

  it('resetToSource() POST reset/', () => {
    service.resetToSource().subscribe();
    const req = httpMock.expectOne(`${URL}reset/`);
    expect(req.request.method).toBe('POST');
    req.flush({});
  });
});
