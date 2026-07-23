import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { SsdgpsSortConfigService } from './ssdgps-sort-config.service';
import { environment } from '../../../environments/environment';

const URL = `${environment.apiUrl}/auth/me/ssdgps-sort-config/`;

describe('SsdgpsSortConfigService', () => {
  let service: SsdgpsSortConfigService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [SsdgpsSortConfigService],
    });
    service = TestBed.inject(SsdgpsSortConfigService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('get() met en cache', () => {
    service.get().subscribe();
    service.get().subscribe();
    httpMock.expectOne(URL).flush([]);
  });

  it('save() PUT', () => {
    service.save([]).subscribe();
    const req = httpMock.expectOne(URL);
    expect(req.request.method).toBe('PUT');
    req.flush([]);
  });

  it('resetToSource() POST reset/', () => {
    service.resetToSource().subscribe();
    const req = httpMock.expectOne(`${URL}reset/`);
    expect(req.request.method).toBe('POST');
    req.flush([]);
  });
});
