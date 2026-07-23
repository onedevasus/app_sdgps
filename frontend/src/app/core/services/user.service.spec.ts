import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { UserService } from './user.service';
import { environment } from '../../../environments/environment';

const API = `${environment.apiUrl}/v1/users/`;

describe('UserService', () => {
  let service: UserService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [UserService],
    });
    service = TestBed.inject(UserService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getUsers() GET liste', () => {
    service.getUsers().subscribe();
    const req = httpMock.expectOne(r => r.url === API);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('createUser() POST', () => {
    service.createUser({ email: 'a@b.ma' } as any).subscribe();
    const req = httpMock.expectOne(API);
    expect(req.request.method).toBe('POST');
    req.flush({ id: '1' });
  });

  it('updateUser() PATCH', () => {
    service.updateUser('9', { role: 'X' } as any).subscribe();
    const req = httpMock.expectOne(`${API}9/`);
    expect(req.request.method).toBe('PATCH');
    req.flush({ id: '9' });
  });

  it('deleteUser() DELETE', () => {
    service.deleteUser('9').subscribe();
    const req = httpMock.expectOne(`${API}9/`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('toggleActive() POST toggle-active/', () => {
    service.toggleActive('9').subscribe();
    const req = httpMock.expectOne(`${API}9/toggle-active/`);
    expect(req.request.method).toBe('POST');
    req.flush({ is_active: false });
  });

  it('bulkRestoreUsers() POST bulk-restore/ avec user_ids', () => {
    service.bulkRestoreUsers(['a', 'b']).subscribe();
    const req = httpMock.expectOne(`${API}bulk-restore/`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ user_ids: ['a', 'b'] });
    req.flush({ restored_count: 2, errors: [] });
  });

  it('permanentDeleteUser() DELETE {id}/permanent/', () => {
    service.permanentDeleteUser('9').subscribe();
    const req = httpMock.expectOne(`${API}9/permanent/`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('bulkPermanentDeleteUsers() POST permanent-delete/ avec user_ids', () => {
    service.bulkPermanentDeleteUsers(['a', 'b']).subscribe();
    const req = httpMock.expectOne(`${API}permanent-delete/`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ user_ids: ['a', 'b'] });
    req.flush({ deleted_count: 2, errors: [] });
  });
});
