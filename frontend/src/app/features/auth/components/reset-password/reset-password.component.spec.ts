import { FormBuilder } from '@angular/forms';
import { ResetPasswordComponent } from './reset-password.component';

describe('ResetPasswordComponent (logique)', () => {
  let cmp: ResetPasswordComponent;
  const fb = new FormBuilder();

  beforeEach(() => {
    cmp = new ResetPasswordComponent({} as any, {} as any, {} as any, {} as any);
  });

  it('passwordMatchValidator compare newPassword et confirmPassword', () => {
    const mismatch = fb.group({ newPassword: 'a', confirmPassword: 'b' });
    expect(cmp.passwordMatchValidator(mismatch)).toEqual({ mismatch: true });

    const ok = fb.group({ newPassword: 'abc', confirmPassword: 'abc' });
    expect(cmp.passwordMatchValidator(ok)).toBeNull();
  });
});
