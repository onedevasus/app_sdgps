import { LoginComponent } from './login.component';

describe('LoginComponent (logique)', () => {
  let cmp: LoginComponent;

  beforeEach(() => {
    cmp = new LoginComponent({} as any, {} as any, {} as any, {} as any);
  });

  it('togglePasswordVisibility() bascule l’affichage du mot de passe', () => {
    expect(cmp.showPassword).toBeFalse();
    cmp.togglePasswordVisibility();
    expect(cmp.showPassword).toBeTrue();
    cmp.togglePasswordVisibility();
    expect(cmp.showPassword).toBeFalse();
  });
});
