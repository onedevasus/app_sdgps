import { Injectable } from '@angular/core';
import { FormGroup, FormControl, Validators, AbstractControl } from '@angular/forms';
import { OrganizationMetadataService, FieldMetadata } from '../../core/services/organization-metadata.service';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Service utilitaire pour créer et gérer des formulaires basés sur les métadonnées
 * 
 * Usage dans un composant:
 * constructor(private formHelper: OrganizationFormHelperService) {}
 * 
 * ngOnInit(): void {
 *   this.formHelper.createOrganizationForm().subscribe(form => {
 *     this.organizationForm = form;
 *   });
 * }
 */
@Injectable({
  providedIn: 'root'
})
export class OrganizationFormHelperService {

  constructor(private metadataService: OrganizationMetadataService) {}

  /**
   * Crée un FormGroup automatiquement basé sur les métadonnées du modèle
   * Applique les validateurs (required) selon les métadonnées
   */
  createOrganizationForm(): Observable<FormGroup> {
    return this.metadataService.getMetadata().pipe(
      map(metadata => {
        const formConfig: any = {};

        // Champs requis obligatoires
        formConfig['code'] = new FormControl('', [
          Validators.required,
          Validators.maxLength(50)
        ]);

        formConfig['name'] = new FormControl('', [
          Validators.required,
          Validators.maxLength(255)
        ]);

        formConfig['type'] = new FormControl('PRIVATE', [
          Validators.required
        ]);

        // Champs optionnels avec validation conditionnelle
        formConfig['legal_id'] = new FormControl('');
        formConfig['address'] = new FormControl('');
        
        formConfig['phone'] = new FormControl('', [
          this.phoneValidator()
        ]);

        formConfig['email'] = new FormControl('', [
          Validators.email
        ]);

        formConfig['website'] = new FormControl('', [
          this.urlValidator()
        ]);

        formConfig['is_active'] = new FormControl(true);
        formConfig['parent'] = new FormControl(null);

        return new FormGroup(formConfig);
      })
    );
  }

  /**
   * Récupère la description d'un champ pour l'afficher dans un formulaire
   */
  getFieldHelpText(fieldName: string): Observable<string> {
    return this.metadataService.getFieldDescription(fieldName);
  }

  /**
   * Récupère le label d'un champ
   */
  getFieldLabel(fieldName: string): Observable<string> {
    return this.metadataService.getFieldLabel(fieldName);
  }

  /**
   * Vérifie si un champ est requis
   */
  isFieldRequired(fieldName: string): Observable<boolean> {
    return this.metadataService.getMetadata().pipe(
      map(metadata => {
        const field = metadata[fieldName];
        return field ? field.required : false;
      })
    );
  }

  /**
   * Récupère les choices pour un champ (ex: type d'organisation)
   */
  getFieldChoices(fieldName: string): Observable<Array<{ value: string; label: string }>> {
    return this.metadataService.getMetadata().pipe(
      map(metadata => {
        const field = metadata[fieldName];
        return field?.choices || [];
      })
    );
  }

  /**
   * Valide un numéro de téléphone (format marocain/international)
   */
  private phoneValidator() {
    return (control: AbstractControl): { [key: string]: any } | null => {
      if (!control.value) return null; // Optionnel
      
      const phoneRegex = /^(\+212|0)[5-7]\d{8}$/;
      const valid = phoneRegex.test(control.value.replace(/\s/g, ''));
      
      return valid ? null : { invalidPhone: true };
    };
  }

  /**
   * Valide une URL
   */
  private urlValidator() {
    return (control: AbstractControl): { [key: string]: any } | null => {
      if (!control.value) return null; // Optionnel
      
      try {
        new URL(control.value);
        return null;
      } catch {
        return { invalidUrl: true };
      }
    };
  }

  /**
   * Pré-remplit le formulaire avec les données d'une organisation existante
   */
  populateForm(form: FormGroup, organization: any): void {
    if (!organization) return;

    form.patchValue({
      code: organization.code || '',
      name: organization.name || '',
      type: organization.type || 'PRIVATE',
      legal_id: organization.legal_id || '',
      address: organization.address || '',
      phone: organization.phone || '',
      email: organization.email || '',
      website: organization.website || '',
      is_active: organization.is_active ?? true,
      parent: organization.parent || null
    });
  }
}
