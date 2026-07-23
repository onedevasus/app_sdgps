import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { OrganizationMetadataService } from './organization-metadata.service';
import { environment } from '../../../environments/environment';

const URL = `${environment.apiUrl}/v1/organizations/metadata/`;
const META = {
  name: { name: 'name', label: 'Nom', description: 'Le nom', type: 'string', required: true },
};

describe('OrganizationMetadataService', () => {
  let service: OrganizationMetadataService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [OrganizationMetadataService],
    });
    service = TestBed.inject(OrganizationMetadataService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getMetadata() GET et met en cache', () => {
    service.getMetadata().subscribe();
    service.getMetadata().subscribe();
    const req = httpMock.expectOne(URL); // un seul appel
    expect(req.request.method).toBe('GET');
    req.flush(META);
  });

  it('getFieldLabel() renvoie le label, sinon le nom du champ', () => {
    let label: string | undefined;
    service.getFieldLabel('name').subscribe(l => (label = l));
    httpMock.expectOne(URL).flush(META);
    expect(label).toBe('Nom');

    let fallback: string | undefined;
    service.getFieldLabel('inconnu').subscribe(l => (fallback = l)); // cache → pas de requête
    expect(fallback).toBe('inconnu');
  });

  it('invalidateCache() force un nouvel appel', () => {
    service.getMetadata().subscribe();
    httpMock.expectOne(URL).flush(META);
    service.invalidateCache();
    service.getMetadata().subscribe();
    httpMock.expectOne(URL).flush(META);
  });
});
