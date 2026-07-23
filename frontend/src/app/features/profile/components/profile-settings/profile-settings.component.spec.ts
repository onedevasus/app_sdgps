import { FormBuilder } from '@angular/forms';
import { ProfileSettingsComponent } from './profile-settings.component';

describe('ProfileSettingsComponent (logique)', () => {
  let cmp: ProfileSettingsComponent;
  let toastr: jasmine.SpyObj<{ error: any; success: any; warning: any; info: any }>;
  const fb = new FormBuilder();

  beforeEach(() => {
    toastr = jasmine.createSpyObj('ToastrService', ['error', 'success', 'warning', 'info']);
    cmp = new ProfileSettingsComponent(fb, {} as any, {} as any, {} as any, toastr as any);
  });

  describe('passwordMatchValidator', () => {
    it('renvoie une erreur si les mots de passe diffèrent', () => {
      const form = fb.group({ new_password: ['abc'], confirm_password: ['xyz'] });
      expect(cmp.passwordMatchValidator(form)).toEqual({ passwordMismatch: true });
    });
    it('renvoie null si identiques', () => {
      const form = fb.group({ new_password: ['abc'], confirm_password: ['abc'] });
      expect(cmp.passwordMatchValidator(form)).toBeNull();
    });
  });

  describe('getInitials', () => {
    it('U par défaut sans profil', () => {
      expect(cmp.getInitials()).toBe('U');
    });
    it('concatène les initiales en majuscules', () => {
      cmp.userProfile = { first_name: 'ali', last_name: 'ben' } as any;
      expect(cmp.getInitials()).toBe('AB');
    });
  });

  describe('roleLabel / roleIcon', () => {
    it('mappe les rôles connus', () => {
      expect(cmp.roleLabel('ROLE_SUPER_ADMIN')).toBe('Super administrateur');
      expect(cmp.roleLabel('ROLE_ORGANISATION_AGENT')).toBe('Opérateur');
      expect(cmp.roleIcon('ROLE_SUPER_ADMIN')).toBe('fa-crown');
    });
    it('a un repli pour un rôle inconnu', () => {
      expect(cmp.roleLabel(null)).toBe('Utilisateur');
      expect(cmp.roleIcon(undefined)).toBe('fa-user');
    });
  });

  describe('toggles de visibilité', () => {
    it('basculent indépendamment', () => {
      cmp.toggleCurrentPasswordVisibility();
      cmp.toggleNewPasswordVisibility();
      expect(cmp.showCurrentPassword).toBeTrue();
      expect(cmp.showNewPassword).toBeTrue();
      expect(cmp.showConfirmPassword).toBeFalse();
      cmp.toggleConfirmPasswordVisibility();
      expect(cmp.showConfirmPassword).toBeTrue();
    });
  });

  describe('areAllPasswordCriteriaValid', () => {
    it('vrai quand tous les critères sont valides', () => {
      cmp.passwordCriteria = [{ valid: true }, { valid: true }] as any;
      expect(cmp.areAllPasswordCriteriaValid()).toBeTrue();
    });
    it('faux si un critère échoue', () => {
      cmp.passwordCriteria = [{ valid: true }, { valid: false }] as any;
      expect(cmp.areAllPasswordCriteriaValid()).toBeFalse();
    });
  });

  describe('onFileSelected (validation)', () => {
    function fileEvent(file: File | null): Event {
      const input = document.createElement('input');
      if (file) {
        Object.defineProperty(input, 'files', { value: [file], configurable: true });
      } else {
        Object.defineProperty(input, 'files', { value: [], configurable: true });
      }
      return { target: input } as unknown as Event;
    }

    it('rejette une extension non supportée', () => {
      const spy = spyOn(cmp, 'uploadProfilePicture');
      cmp.onFileSelected(fileEvent(new File(['x'], 'doc.pdf')));
      expect(toastr.error).toHaveBeenCalled();
      expect(spy).not.toHaveBeenCalled();
    });

    it('rejette une image trop lourde (>5MB)', () => {
      const spy = spyOn(cmp, 'uploadProfilePicture');
      const big = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'photo.png');
      cmp.onFileSelected(fileEvent(big));
      expect(toastr.error).toHaveBeenCalled();
      expect(spy).not.toHaveBeenCalled();
    });

    it('accepte une image valide et lance l’upload', () => {
      const spy = spyOn(cmp, 'uploadProfilePicture');
      const ok = new File(['x'], 'photo.png');
      cmp.onFileSelected(fileEvent(ok));
      expect(spy).toHaveBeenCalledWith(ok);
    });

    it('ne fait rien sans fichier', () => {
      const spy = spyOn(cmp, 'uploadProfilePicture');
      cmp.onFileSelected(fileEvent(null));
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('openPasswordModal / closePasswordModal', () => {
    it('ouvre et réinitialise le formulaire', () => {
      (cmp as any).initForms();
      cmp.openPasswordModal();
      expect(cmp.showPasswordModal).toBeTrue();
      cmp.closePasswordModal();
      expect(cmp.showPasswordModal).toBeFalse();
    });
  });
});
