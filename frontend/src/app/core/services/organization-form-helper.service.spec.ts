import { TestBed } from '@angular/core/testing';
import { FormGroup } from '@angular/forms';
import { of } from 'rxjs';

import { OrganizationFormHelperService } from './organization-form-helper.service';
import { OrganizationMetadataService } from './organization-metadata.service';

const META = {
  type: {
    name: 'type', label: 'Type', description: '', type: 'choice', required: true,
    choices: [{ value: 'PRIVATE', label: 'Privé' }, { value: 'PUBLIC', label: 'Public' }],
  },
};

describe('OrganizationFormHelperService', () => {
  let service: OrganizationFormHelperService;
  let meta: jasmine.SpyObj<OrganizationMetadataService>;

  beforeEach(() => {
    meta = jasmine.createSpyObj('OrganizationMetadataService',
      ['getMetadata', 'getFieldDescription', 'getFieldLabel']);
    meta.getMetadata.and.returnValue(of(META as any));
    TestBed.configureTestingModule({
      providers: [
        OrganizationFormHelperService,
        { provide: OrganizationMetadataService, useValue: meta },
      ],
    });
    service = TestBed.inject(OrganizationFormHelperService);
  });

  it('createOrganizationForm() bâtit un FormGroup avec les validateurs attendus', (done) => {
    service.createOrganizationForm().subscribe((form: FormGroup) => {
      expect(form.get('code')).toBeTruthy();
      expect(form.get('type')?.value).toBe('PRIVATE');
      // code requis → invalide à vide.
      expect(form.get('code')?.valid).toBeFalse();
      // email : format contrôlé.
      form.get('email')?.setValue('pas-un-email');
      expect(form.get('email')?.hasError('email')).toBeTrue();
      // téléphone : validateur marocain.
      form.get('phone')?.setValue('123');
      expect(form.get('phone')?.hasError('invalidPhone')).toBeTrue();
      form.get('phone')?.setValue('0612345678');
      expect(form.get('phone')?.valid).toBeTrue();
      done();
    });
  });

  it('isFieldRequired() lit les métadonnées', (done) => {
    service.isFieldRequired('type').subscribe(req => {
      expect(req).toBeTrue();
      service.isFieldRequired('inconnu').subscribe(r2 => {
        expect(r2).toBeFalse();
        done();
      });
    });
  });

  it('getFieldChoices() renvoie les choix du champ', (done) => {
    service.getFieldChoices('type').subscribe(choices => {
      expect(choices.length).toBe(2);
      expect(choices[0].value).toBe('PRIVATE');
      done();
    });
  });

  it('populateForm() pré-remplit les valeurs', (done) => {
    service.createOrganizationForm().subscribe((form: FormGroup) => {
      service.populateForm(form, { code: 'C1', name: 'Org', email: 'a@b.ma' });
      expect(form.get('code')?.value).toBe('C1');
      expect(form.get('name')?.value).toBe('Org');
      expect(form.get('email')?.value).toBe('a@b.ma');
      done();
    });
  });
});
