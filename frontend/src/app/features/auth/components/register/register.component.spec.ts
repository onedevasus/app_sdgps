import { FormBuilder } from '@angular/forms';
import { RegisterComponent } from './register.component';

describe('RegisterComponent (logique)', () => {
  let cmp: RegisterComponent;
  const fb = new FormBuilder();

  beforeEach(() => {
    cmp = new RegisterComponent({} as any, {} as any, {} as any, {} as any);
  });

  it('togglePasswordVisibility() bascule', () => {
    expect(cmp.showPassword).toBeFalse();
    cmp.togglePasswordVisibility();
    expect(cmp.showPassword).toBeTrue();
  });

  it('passwordMatchValidator détecte la non-correspondance', () => {
    const g1 = fb.group({ password: 'a', confirmPassword: 'b' });
    expect(cmp.passwordMatchValidator(g1)).toEqual({ mismatch: true });

    const g2 = fb.group({ password: 'abc', confirmPassword: 'abc' });
    expect(cmp.passwordMatchValidator(g2)).toBeNull();
  });

  it('validatePasswordCriteria + areAllPasswordCriteriaValid', () => {
    cmp.validatePasswordCriteria('Passw0rd!');
    expect(cmp.areAllPasswordCriteriaValid()).toBeTrue();

    cmp.validatePasswordCriteria('faible');
    expect(cmp.areAllPasswordCriteriaValid()).toBeFalse();
  });
});
