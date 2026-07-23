import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { OrganismeService } from './organisme.service';
import { environment } from '../../../environments/environment';

const N1 = `${environment.apiUrl}/v1/organismes-niveau1/`;

describe('OrganismeService', () => {
  let service: OrganismeService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [OrganismeService],
    });
    service = TestBed.inject(OrganismeService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getNiveau1() GET', () => {
    service.getNiveau1().subscribe();
    const req = httpMock.expectOne(r => r.url === N1);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('createNiveau1() POST', () => {
    service.createNiveau1({ nom: 'X', code: 'C' } as any).subscribe();
    const req = httpMock.expectOne(N1);
    expect(req.request.method).toBe('POST');
    req.flush({ id: '1' });
  });

  it('updateNiveau1() PATCH', () => {
    service.updateNiveau1('7', { nom: 'Y' } as any).subscribe();
    const req = httpMock.expectOne(`${N1}7/`);
    expect(req.request.method).toBe('PATCH');
    req.flush({ id: '7' });
  });

  it('deleteNiveau1() DELETE', () => {
    service.deleteNiveau1('7').subscribe();
    const req = httpMock.expectOne(`${N1}7/`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('bulkDeleteNiveau1() POST bulk-delete/ avec ids', () => {
    service.bulkDeleteNiveau1(['a', 'b']).subscribe();
    const req = httpMock.expectOne(`${N1}bulk-delete/`);
    expect(req.request.body).toEqual({ ids: ['a', 'b'] });
    req.flush({});
  });
});
