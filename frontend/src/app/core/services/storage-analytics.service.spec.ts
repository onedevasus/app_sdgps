import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { StorageAnalyticsService, StorageOverview } from './storage-analytics.service';
import { environment } from '../../../environments/environment';

describe('StorageAnalyticsService', () => {
  let service: StorageAnalyticsService;
  let httpMock: HttpTestingController;
  const base = `${environment.apiUrl}/v1/analytics/storage`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [StorageAnalyticsService],
    });
    service = TestBed.inject(StorageAnalyticsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getOverview() appelle overview/ sans paramètre par défaut', () => {
    const fake: StorageOverview = {
      total_bytes: 10, total_files: 1, by_type: [], by_organization: [],
      by_project: [], by_user: [],
    };
    let received: StorageOverview | undefined;
    service.getOverview().subscribe(d => (received = d));

    const req = httpMock.expectOne(`${base}/overview/`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.has('organization')).toBeFalse();
    req.flush(fake);
    expect(received?.total_bytes).toBe(10);
  });

  it('getOverview(orgId) transmet le filtre organisation', () => {
    service.getOverview('org-123').subscribe();
    const req = httpMock.expectOne(r => r.url === `${base}/overview/`);
    expect(req.request.params.get('organization')).toBe('org-123');
    req.flush({});
  });

  it('getEvolution(limit) transmet le paramètre limit', () => {
    service.getEvolution(50).subscribe();
    const req = httpMock.expectOne(r => r.url === `${base}/evolution/`);
    expect(req.request.params.get('limit')).toBe('50');
    req.flush({ points: [] });
  });
});
