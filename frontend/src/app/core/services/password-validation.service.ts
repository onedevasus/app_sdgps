/**
 * Service générique pour la validation des mots de passe
 * Centralise les critères de validation pour toute l'application
 * 
 * @Injectable({ providedIn: 'root' }) - Disponible globalement dans toute l'app
 */
import { Injectable } from '@angular/core';

export interface PasswordCriterion {
  id: string;
  label: string;
  valid: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class PasswordValidationService {
  
  /**
   * Critères de validation du mot de passe (configurables)
   * Ajoutez/supprimez des critères ici - ils seront appliqués partout
   */
  private criteria: PasswordCriterion[] = [
    { id: 'length', label: 'Au moins 8 caractères', valid: false },
    { id: 'uppercase', label: 'Au moins une majuscule (A-Z)', valid: false },
    { id: 'lowercase', label: 'Au moins une minuscule (a-z)', valid: false },
    { id: 'number', label: 'Au moins un chiffre (0-9)', valid: false },
    { id: 'special', label: 'Au moins un caractère spécial (@$!%*?&)', valid: false }
  ];

  /**
   * Retourne une COPIE des critères (pour éviter la mutation directe)
   */
  getCriteria(): PasswordCriterion[] {
    return this.criteria.map(c => ({ ...c }));
  }

  /**
   * Valide tous les critères et retourne leur état
   * @param password Le mot de passe à valider
   */
  validatePassword(password: string): PasswordCriterion[] {
    // Met à jour chaque critère
    this.criteria[0].valid = password.length >= 8;
    this.criteria[1].valid = /[A-Z]/.test(password);
    this.criteria[2].valid = /[a-z]/.test(password);
    this.criteria[3].valid = /[0-9]/.test(password);
    this.criteria[4].valid = /[@$!%*?&]/.test(password);

    // Retourne une copie pour affichage
    return this.getCriteria();
  }

  /**
   * Vérifie si TOUS les critères sont valides
   * @param password Le mot de passe à vérifier
   */
  isPasswordValid(password: string): boolean {
    const validated = this.validatePassword(password);
    return validated.every(criterion => criterion.valid);
  }

  /**
   * Retourne le nombre de critères valides
   * @param password Le mot de passe à évaluer
   */
  getValidCriteriaCount(password: string): number {
    const validated = this.validatePassword(password);
    return validated.filter(c => c.valid).length;
  }

  /**
   * Pattern regex pour validation Angular (réutilisable)
   */
  getPasswordPattern(): RegExp {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  }

  /**
   * Message d'aide pour les utilisateurs
   */
  getHelpMessage(): string {
    return 'Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule, un chiffre et un caractère spécial.';
  }
}
