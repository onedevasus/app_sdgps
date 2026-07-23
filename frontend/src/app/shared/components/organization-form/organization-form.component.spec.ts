import { FormBuilder } from '@angular/forms';
import { OrganizationFormComponent } from './organization-form.component';

describe('OrganizationFormComponent', () => {
  let cmp: OrganizationFormComponent;
  const fb = new FormBuilder();

  beforeEach(() => {
    cmp = new OrganizationFormComponent({} as any);
    cmp.form = fb.group({ code: [''], name: [''] });
  });

  it('onSubmit émet la valeur du formulaire si valide', () => {
    const spy = spyOn(cmp.save, 'emit');
    cmp.form.setValue({ code: 'ORG-A', name: 'Alpha' });
    cmp.onSubmit();
    expect(spy).toHaveBeenCalledWith({ code: 'ORG-A', name: 'Alpha' });
  });

  it('onSubmit n’émet pas si le formulaire est invalide', () => {
    const spy = spyOn(cmp.save, 'emit');
    cmp.form.get('code')!.setErrors({ required: true });
    cmp.onSubmit();
    expect(spy).not.toHaveBeenCalled();
  });

  it('onCancelClick émet cancel', () => {
    const spy = spyOn(cmp.cancel, 'emit');
    cmp.onCancelClick();
    expect(spy).toHaveBeenCalled();
  });

  it('getCodeDescription / getNameDescription lisent le cache', () => {
    (cmp as any).descriptions = { code: 'Code unique', name: 'Nom légal' };
    expect(cmp.getCodeDescription()).toBe('Code unique');
    expect(cmp.getNameDescription()).toBe('Nom légal');
  });
});
