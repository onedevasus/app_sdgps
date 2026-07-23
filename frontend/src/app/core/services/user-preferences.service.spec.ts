import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { UserPreferencesService } from './user-preferences.service';

const PREFS = '/api/v1/users/table-preferences/';

describe('UserPreferencesService', () => {
  let service: UserPreferencesService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [UserPreferencesService],
    });
    service = TestBed.inject(UserPreferencesService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('getTablePreferences() GET', () => {
    service.getTablePreferences().subscribe();
    const req = httpMock.expectOne(PREFS);
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('saveSortConfig() PUT avec sort_config', () => {
    service.saveSortConfig('nom', 'asc').subscribe();
    const req = httpMock.expectOne(PREFS);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ sort_config: { column: 'nom', direction: 'asc' } });
    req.flush({});
  });

  it('saveColumnConfig() PUT avec column_config', () => {
    service.saveColumnConfig([{ field: 'a' }]).subscribe();
    const req = httpMock.expectOne(PREFS);
    expect(req.request.body).toEqual({ column_config: [{ field: 'a' }] });
    req.flush({});
  });

  it('loadMetadataFromCache() lit un cache localStorage frais', () => {
    localStorage.setItem('org_metadata_cache', JSON.stringify({ nom: { label: 'Nom' } }));
    localStorage.setItem('org_metadata_timestamp', Date.now().toString());
    const map = service.loadMetadataFromCache();
    expect(map).not.toBeNull();
    expect(map!.get('nom')?.label).toBe('Nom');
  });

  it('loadMetadataFromCache() renvoie null sans cache', () => {
    expect(service.loadMetadataFromCache()).toBeNull();
  });
});
