import { TestBed } from '@angular/core/testing';
import { PasswordValidationService } from './password-validation.service';

describe('PasswordValidationService', () => {
  let service: PasswordValidationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PasswordValidationService);
  });

  it('accepte un mot de passe conforme', () => {
    expect(service.isPasswordValid('Passw0rd!')).toBeTrue();
  });

  it('rejette un mot de passe trop faible', () => {
    expect(service.isPasswordValid('weak')).toBeFalse();
  });

  it('compte les critères satisfaits', () => {
    // "abc" ne satisfait que « minuscule ».
    expect(service.getValidCriteriaCount('abc')).toBe(1);
    expect(service.getValidCriteriaCount('Passw0rd!')).toBe(5);
  });

  it('getCriteria() renvoie une copie non mutable', () => {
    const c = service.getCriteria();
    expect(c.length).toBe(5);
    c[0].valid = true; // mutation locale
    expect(service.getCriteria()[0].valid).toBeFalse(); // état interne intact
  });

  it('getPasswordPattern() correspond aux mots de passe conformes uniquement', () => {
    const re = service.getPasswordPattern();
    expect(re.test('Passw0rd!')).toBeTrue();
    expect(re.test('weak')).toBeFalse();
  });
});
