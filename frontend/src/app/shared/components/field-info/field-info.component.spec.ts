import { of } from 'rxjs';
import { FieldInfoComponent } from './field-info.component';

describe('FieldInfoComponent', () => {
  let metadataService: jasmine.SpyObj<{ getFieldDescription: any }>;

  beforeEach(() => {
    metadataService = jasmine.createSpyObj('OrganizationMetadataService', ['getFieldDescription']);
  });

  it('charge la description du champ en ngOnInit', () => {
    metadataService.getFieldDescription.and.returnValue(of('Adresse e-mail de connexion'));
    const cmp = new FieldInfoComponent(metadataService as any);
    cmp.field = 'email';
    cmp.ngOnInit();
    expect(metadataService.getFieldDescription).toHaveBeenCalledWith('email');
    expect(cmp.description).toBe('Adresse e-mail de connexion');
  });

  it('n’appelle pas le service si aucun champ n’est fourni', () => {
    const cmp = new FieldInfoComponent(metadataService as any);
    cmp.ngOnInit();
    expect(metadataService.getFieldDescription).not.toHaveBeenCalled();
    expect(cmp.description).toBe('');
  });
});
