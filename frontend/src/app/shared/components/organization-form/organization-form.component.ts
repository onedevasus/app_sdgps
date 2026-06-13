import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { OrganizationFormHelperService } from '../../../core/services/organization-form-helper.service';

/**
 * Composant de formulaire d'organisation réutilisable
 * Peut être utilisé pour la création et la modification
 * 
 * Usage:
 * <app-organization-form 
 *   [organization]="selectedOrg"
 *   (save)="onSave($event)"
 *   (cancel)="onCancel()">
 * </app-organization-form>
 */
@Component({
  selector: 'app-organization-form',
  template: `
    <form [formGroup]="form" (ngSubmit)="onSubmit()" class="organization-form">
      
      <!-- Code -->
      <div class="form-group">
        <label for="code">
          Code <span class="required">*</span>
          <app-field-info field="code"></app-field-info>
        </label>
        <input 
          type="text" 
          id="code" 
          formControlName="code"
          class="form-control"
          [class.is-invalid]="form.get('code')?.invalid && form.get('code')?.touched"
        >
        <small class="help-text" *ngIf="getCodeDescription()">{{ getCodeDescription() }}</small>
        <div class="error-message" *ngIf="form.get('code')?.errors?.['required'] && form.get('code')?.touched">
          Le code est requis
        </div>
      </div>

      <!-- Nom -->
      <div class="form-group">
        <label for="name">
          Nom <span class="required">*</span>
          <app-field-info field="name"></app-field-info>
        </label>
        <input 
          type="text" 
          id="name" 
          formControlName="name"
          class="form-control"
          [class.is-invalid]="form.get('name')?.invalid && form.get('name')?.touched"
        >
        <small class="help-text" *ngIf="getNameDescription()">{{ getNameDescription() }}</small>
      </div>

      <!-- Type -->
      <div class="form-group">
        <label for="type">
          Type <span class="required">*</span>
          <app-field-info field="type"></app-field-info>
        </label>
        <select 
          id="type" 
          formControlName="type"
          class="form-control"
        >
          <option value="PRIVATE">Cabinet Privé / Entreprise</option>
          <option value="PUBLIC">Entité Publique / Administration</option>
        </select>
      </div>

      <!-- Email -->
      <div class="form-group">
        <label for="email">
          Email
          <app-field-info field="email"></app-field-info>
        </label>
        <input 
          type="email" 
          id="email" 
          formControlName="email"
          class="form-control"
          [class.is-invalid]="form.get('email')?.invalid && form.get('email')?.touched"
        >
        <div class="error-message" *ngIf="form.get('email')?.errors?.['email'] && form.get('email')?.touched">
          Email invalide
        </div>
      </div>

      <!-- Téléphone -->
      <div class="form-group">
        <label for="phone">
          Téléphone
          <app-field-info field="phone"></app-field-info>
        </label>
        <input 
          type="tel" 
          id="phone" 
          formControlName="phone"
          class="form-control"
          placeholder="+212 5XX XX XX XX"
          [class.is-invalid]="form.get('phone')?.invalid && form.get('phone')?.touched"
        >
        <div class="error-message" *ngIf="form.get('phone')?.errors?.['invalidPhone'] && form.get('phone')?.touched">
          Numéro de téléphone invalide
        </div>
      </div>

      <!-- Boutons d'action -->
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" (click)="onCancelClick()">
          Annuler
        </button>
        <button 
          type="submit" 
          class="btn btn-primary"
          [disabled]="form.invalid || form.pristine"
        >
          {{ organization ? 'Mettre à jour' : 'Créer' }}
        </button>
      </div>
    </form>
  `,
  styles: [`
    .organization-form {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    label {
      font-weight: 600;
      color: var(--text-color);
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .required {
      color: var(--accent-color);
      font-weight: bold;
    }

    .form-control {
      padding: 10px 12px;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      font-size: 14px;
      transition: all 0.2s;

      &:focus {
        outline: none;
        border-color: var(--accent-color);
        box-shadow: 0 0 0 3px rgba(204, 88, 88, 0.1);
      }

      &.is-invalid {
        border-color: #e74c3c;

        &:focus {
          box-shadow: 0 0 0 3px rgba(231, 76, 60, 0.1);
        }
      }
    }

    .help-text {
      font-size: 12px;
      color: var(--text-muted);
      font-style: italic;
      margin-top: 4px;
    }

    .error-message {
      font-size: 12px;
      color: #e74c3c;
      margin-top: 4px;
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid var(--border-color);
    }

    .btn {
      padding: 10px 20px;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;

      &.btn-secondary {
        background: var(--secondary-color);
        color: var(--text-color);
        border: 1px solid var(--border-color);

        &:hover {
          background: var(--hover-bg);
        }
      }

      &.btn-primary {
        background: linear-gradient(135deg, var(--accent-color), #b84949);
        color: white;

        &:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(204, 88, 88, 0.3);
        }

        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      }
    }
  `]
})
export class OrganizationFormComponent implements OnInit {
  @Input() organization: any = null; // Si null = mode création, sinon mode édition
  @Output() save = new EventEmitter<any>();
  @Output() cancel = new EventEmitter<void>();

  form!: FormGroup;

  // Descriptions en cache
  private descriptions: { [key: string]: string } = {};

  constructor(private formHelper: OrganizationFormHelperService) {}

  ngOnInit(): void {
    this.formHelper.createOrganizationForm().subscribe((form: FormGroup) => {
      this.form = form;

      // Si mode édition, pré-remplir le formulaire
      if (this.organization) {
        this.formHelper.populateForm(this.form, this.organization);
      }
    });

    // Charger les descriptions
    this.loadDescriptions();
  }

  private loadDescriptions(): void {
    ['code', 'name', 'email', 'phone'].forEach(field => {
      this.formHelper.getFieldHelpText(field).subscribe((desc: string) => {
        this.descriptions[field] = desc;
      });
    });
  }

  getCodeDescription(): string {
    return this.descriptions['code'];
  }

  getNameDescription(): string {
    return this.descriptions['name'];
  }

  onSubmit(): void {
    if (this.form.valid) {
      this.save.emit(this.form.value);
    }
  }

  onCancelClick(): void {
    this.cancel.emit();
  }
}
