import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { OrganizationService } from './organization.service';
import { environment } from '../../../environments/environment';

const API = `${environment.apiUrl}/v1/organizations/`;

describe('OrganizationService', () => {
  let service: OrganizationService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [OrganizationService],
    });
    service = TestBed.inject(OrganizationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getOrganizations() gère une réponse tableau (+ page_size)', () => {
    let got: any[] | undefined;
    service.getOrganizations().subscribe(o => (got = o));
    const req = httpMock.expectOne(r => r.url === API);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('page_size')).toBe('1000');
    req.flush([{ id: '1' }]);
    expect(got?.length).toBe(1);
  });

  it('getOrganizations() gère une réponse paginée { results }', () => {
    let got: any[] | undefined;
    service.getOrganizations().subscribe(o => (got = o));
    httpMock.expectOne(r => r.url === API).flush({ results: [{ id: '1' }, { id: '2' }] });
    expect(got?.length).toBe(2);
  });

  it('getOrganization(id) GET détail', () => {
    service.getOrganization('42').subscribe();
    const req = httpMock.expectOne(`${API}42/`);
    expect(req.request.method).toBe('GET');
    req.flush({ id: '42' });
  });

  it('createOrganization() POST', () => {
    service.createOrganization({ name: 'X' } as any).subscribe();
    const req = httpMock.expectOne(API);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ name: 'X' });
    req.flush({ id: '1' });
  });

  it('updateOrganization() PUT', () => {
    service.updateOrganization('7', { name: 'Y' } as any).subscribe();
    const req = httpMock.expectOne(`${API}7/`);
    expect(req.request.method).toBe('PUT');
    req.flush({ id: '7' });
  });

  it('deleteOrganization() DELETE', () => {
    service.deleteOrganization('7').subscribe();
    const req = httpMock.expectOne(`${API}7/`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('bulkDeleteOrganizations() POST bulk-delete/', () => {
    service.bulkDeleteOrganizations(['a', 'b']).subscribe();
    const req = httpMock.expectOne(`${API}bulk-delete/`);
    expect(req.request.method).toBe('POST');
    req.flush({ deleted_count: 2 });
  });

  it('getOrganizations({show_deleted}) transmet le paramètre', () => {
    service.getOrganizations({ show_deleted: 'true' }).subscribe();
    const req = httpMock.expectOne(r => r.url === API);
    expect(req.request.params.get('show_deleted')).toBe('true');
    req.flush([]);
  });

  it('restoreOrganization() POST {id}/restore/', () => {
    service.restoreOrganization('7').subscribe();
    const req = httpMock.expectOne(`${API}7/restore/`);
    expect(req.request.method).toBe('POST');
    req.flush({ id: '7' });
  });

  it('bulkRestoreOrganizations() POST bulk-restore/ {organization_ids}', () => {
    service.bulkRestoreOrganizations(['a', 'b']).subscribe();
    const req = httpMock.expectOne(`${API}bulk-restore/`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ organization_ids: ['a', 'b'] });
    req.flush({ restored_count: 2 });
  });

  it('permanentDeleteOrganization() DELETE {id}/permanent/', () => {
    service.permanentDeleteOrganization('7').subscribe();
    const req = httpMock.expectOne(`${API}7/permanent/`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('bulkPermanentDeleteOrganizations() POST permanent-delete/ {organization_ids}', () => {
    service.bulkPermanentDeleteOrganizations(['a', 'b']).subscribe();
    const req = httpMock.expectOne(`${API}permanent-delete/`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ organization_ids: ['a', 'b'] });
    req.flush({ deleted_count: 2, errors: [] });
  });
});
