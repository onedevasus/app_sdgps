# 📚 Guide d'Utilisation des Métadonnées d'Organisation

## 🎯 Vue d'Ensemble

Ce guide explique comment utiliser les métadonnées du modèle `Organization` dans toute l'application Angular. Les descriptions des champs sont centralisées dans le backend Django et exposées via une API REST.

---

## 🏗️ Architecture

```
Backend Django (Source de vérité)
    ↓ help_text sur les modèles
API REST (/api/v1/organizations/metadata/)
    ↓ HTTP GET
Service Angular (OrganizationMetadataService)
    ↓ Cache + Observable
Composants Angular (réutilisation partout)
```

---

## 📦 Services Disponibles

### **1. OrganizationMetadataService**

Service principal pour accéder aux métadonnées.

#### **Méthodes**

```typescript
// Récupérer TOUTES les métadonnées
getMetadata(): Observable<OrganizationMetadata>

// Récupérer la description d'un champ
getFieldDescription(fieldName: string): Observable<string>

// Récupère le label d'un champ
getFieldLabel(fieldName: string): Observable<string>

// Récupère toutes les descriptions en une fois
getAllDescriptions(): Observable<{[fieldName: string]: string}>
```

#### **Exemple d'Usage**

```typescript
import { OrganizationMetadataService } from '../../core/services/organization-metadata.service';

@Component({...})
export class MonComponent implements OnInit {
  fieldDescriptions: {[key: string]: string} = {};

  constructor(private metadataService: OrganizationMetadataService) {}

  ngOnInit(): void {
    // Charger toutes les descriptions
    this.metadataService.getAllDescriptions().subscribe(descriptions => {
      this.fieldDescriptions = descriptions;
    });

    // Ou charger une description spécifique
    this.metadataService.getFieldDescription('email').subscribe(desc => {
      console.log('Description email:', desc);
    });
  }
}
```

---

### **2. OrganizationFormHelperService**

Service utilitaire pour créer des formulaires basés sur les métadonnées.

#### **Méthodes**

```typescript
// Créer un formulaire automatiquement
createOrganizationForm(): Observable<FormGroup>

// Obtenir le texte d'aide d'un champ
getFieldHelpText(fieldName: string): Observable<string>

// Vérifier si un champ est requis
isFieldRequired(fieldName: string): Observable<boolean>

// Récupérer les choices (ex: type d'org)
getFieldChoices(fieldName: string): Observable<Array<{value, label}>>

// Pré-remplir un formulaire
populateForm(form: FormGroup, organization: any): void
```

#### **Exemple d'Usage**

```typescript
import { OrganizationFormHelperService } from '../../core/services/organization-form-helper.service';

@Component({...})
export class FormulaireComponent implements OnInit {
  form!: FormGroup;

  constructor(private formHelper: OrganizationFormHelperService) {}

  ngOnInit(): void {
    // Créer le formulaire avec validation automatique
    this.formHelper.createOrganizationForm().subscribe(form => {
      this.form = form;
    });
  }

  onSubmit(): void {
    if (this.form.valid) {
      console.log('Données:', this.form.value);
    }
  }
}
```

---

## 🧩 Composants Réutilisables

### **1. `<app-field-info>` - Infobulle de Champ**

Affiche une icône d'information avec la description du champ.

#### **Props**

| Prop | Type | Description |
|------|------|-------------|
| `field` | `string` | Nom du champ (ex: "email") |
| `showIcon` | `boolean` | Afficher l'icône (défaut: true) |
| `showText` | `boolean` | Afficher le texte directement (défaut: false) |

#### **Usage**

```html
<!-- Mode infobulle (tooltip) -->
<label>
  Email
  <app-field-info field="email"></app-field-info>
</label>

<!-- Mode texte affiché -->
<label>Email</label>
<app-field-info field="email" [showText]="true"></app-field-info>
```

---

### **2. `<app-organization-form>` - Formulaire Complet**

Formulaire réutilisable pour création/modification d'organisations.

#### **Props**

| Prop | Type | Description |
|------|------|-------------|
| `organization` | `any` | Organisation existante (null = mode création) |

#### **Events**

| Event | Payload | Description |
|-------|---------|-------------|
| `save` | `FormData` | Émis lors de la soumission |
| `cancel` | `void` | Émis lors de l'annulation |

#### **Usage**

```html
<!-- Mode Création -->
<app-organization-form 
  (save)="onCreate($event)"
  (cancel)="onCancel()">
</app-organization-form>

<!-- Mode Modification -->
<app-organization-form 
  [organization]="selectedOrg"
  (save)="onUpdate($event)"
  (cancel)="onCancel()">
</app-organization-form>
```

```typescript
onCreate(formData: any): void {
  this.organizationService.create(formData).subscribe(() => {
    console.log('Organisation créée!');
  });
}

onUpdate(formData: any): void {
  this.organizationService.update(this.selectedOrg.id, formData).subscribe(() => {
    console.log('Organisation mise à jour!');
  });
}
```

---

## 💡 Exemples Concrets

### **Exemple 1 : Infobulles dans un Tableau**

```html
<table>
  <thead>
    <tr>
      <th *ngFor="let col of columns">
        {{ col.label }}
        <app-field-info [field]="col.field"></app-field-info>
      </th>
    </tr>
  </thead>
  <tbody>
    <!-- données -->
  </tbody>
</table>
```

---

### **Exemple 2 : Formulaire de Création**

```typescript
@Component({
  selector: 'app-create-org',
  template: `
    <form [formGroup]="form" (ngSubmit)="onSubmit()">
      
      <div class="form-group">
        <label>
          Code <span class="required">*</span>
          <app-field-info field="code"></app-field-info>
        </label>
        <input formControlName="code" type="text">
        <small class="help-text">{{ descriptions.code }}</small>
      </div>

      <div class="form-group">
        <label>
          Email
          <app-field-info field="email"></app-field-info>
        </label>
        <input formControlName="email" type="email">
        <small class="help-text">{{ descriptions.email }}</small>
      </div>

      <button type="submit" [disabled]="form.invalid">Créer</button>
    </form>
  `
})
export class CreateOrgComponent implements OnInit {
  form!: FormGroup;
  descriptions: {[key: string]: string} = {};

  constructor(
    private formHelper: OrganizationFormHelperService,
    private metadataService: OrganizationMetadataService
  ) {}

  ngOnInit(): void {
    // Créer le formulaire
    this.formHelper.createOrganizationForm().subscribe(form => {
      this.form = form;
    });

    // Charger les descriptions
    this.metadataService.getAllDescriptions().subscribe(desc => {
      this.descriptions = desc;
    });
  }

  onSubmit(): void {
    if (this.form.valid) {
      console.log('Données:', this.form.value);
    }
  }
}
```

---

### **Exemple 3 : Tooltip Personnalisé**

```html
<div class="field-wrapper">
  <label for="phone">Téléphone</label>
  <input id="phone" type="tel" [placeholder]="phonePlaceholder">
  
  <!-- Infobulle au survol -->
  <div class="tooltip" [title]="phoneDescription">
    <i class="fas fa-question-circle"></i>
  </div>
</div>
```

```typescript
export class PhoneFieldComponent implements OnInit {
  phoneDescription: string = '';
  phonePlaceholder: string = '';

  constructor(private metadataService: OrganizationMetadataService) {}

  ngOnInit(): void {
    this.metadataService.getFieldDescription('phone').subscribe(desc => {
      this.phoneDescription = desc;
      this.phonePlaceholder = desc.substring(0, 30) + '...';
    });
  }
}
```

---

### **Exemple 4 : Validation Dynamique**

```typescript
ngOnInit(): void {
  this.formHelper.isFieldRequired('email').subscribe(required => {
    if (required) {
      this.form.get('email')?.setValidators([Validators.required, Validators.email]);
    } else {
      this.form.get('email')?.clearValidators();
    }
    this.form.get('email')?.updateValueAndValidity();
  });
}
```

---

## 🎨 Styles CSS Recommandés

```scss
// Infobulles
.field-info-icon {
  color: var(--accent-color);
  cursor: help;
  opacity: 0.6;
  transition: all 0.2s;

  &:hover {
    opacity: 1;
    transform: scale(1.1);
  }
}

// Textes d'aide
.help-text {
  font-size: 12px;
  color: var(--text-muted);
  font-style: italic;
  margin-top: 4px;
  display: block;
}

// Champs requis
.required {
  color: var(--accent-color);
  font-weight: bold;
}

// Messages d'erreur
.error-message {
  font-size: 12px;
  color: #e74c3c;
  margin-top: 4px;
}
```

---

## 📋 Liste des Champs et Descriptions

| Champ | Label | Description | Requis |
|-------|-------|-------------|--------|
| `code` | Code Organisation | Code unique d'identification (ex: CAB-001, DIR-FIN) | ✅ |
| `name` | Nom de l'organisation | Nom officiel ou raison sociale | ✅ |
| `type` | Type d'organisation | Catégorie : Cabinet privé ou entité publique | ✅ |
| `legal_id` | Identifiant légal | RC pour privés, décret pour publics | ❌ |
| `address` | Adresse physique | Adresse postale complète | ❌ |
| `phone` | Téléphone | Numéro de téléphone principal | ❌ |
| `email` | Email officiel | Email pour communications officielles | ❌ |
| `website` | Site web | URL du site internet | ❌ |
| `logo` | Logo | Image du logo (PNG, JPG) | ❌ |
| `parent` | Organisation parente | Org de niveau supérieur (hiérarchie) | ❌ |
| `is_active` | Active | Organisation accessible dans le système | ❌ |
| `created_at` | Date création | Date de création dans le système | Auto |
| `updated_at` | Date modification | Dernière modification des infos | Auto |
| `created_by` | Créé par | Utilisateur ayant créé l'organisation | Auto |

---

## 🔧 Configuration Backend

### **Endpoint API**

```
GET /api/v1/organizations/metadata/
Headers: Authorization: Bearer <token>
```

### **Réponse JSON**

```json
{
  "code": {
    "name": "code",
    "label": "Code Organisation",
    "description": "Code unique d'identification...",
    "type": "CharField",
    "required": true
  },
  "email": {
    "name": "email",
    "label": "Email officiel",
    "description": "Adresse email principale...",
    "type": "EmailField",
    "required": false
  }
}
```

---

## ⚠️ Bonnes Pratiques

### ✅ **À FAIRE**

1. **Toujours utiliser le service** - Ne jamais hardcoder les descriptions
2. **Mettre en cache** - Le service fait déjà du cache, profitez-en
3. **S'abonner correctement** - Toujours se désabonner dans `ngOnDestroy`
4. **Utiliser les composants réutilisables** - DRY principle
5. **Garder les help_text à jour** - Source de vérité dans Django

### ❌ **À ÉVITER**

1. ~~Dupliquer les descriptions dans le frontend~~
2. ~~Hardcoder les labels~~
3. ~~Ignorer le cache du service~~
4. ~~Oublier de gérer les erreurs API~~
5. ~~Modifier les métadonnées côté client~~

---

## 🚀 Futurs Usages Possibles

- ✅ Génération automatique de documentation
- ✅ Tooltips dans tous les formulaires
- ✅ Validation dynamique basée sur les métadonnées
- ✅ Support multilingue (i18n des help_text)
- ✅ Export de schéma de base de données
- ✅ Interface d'administration personnalisée

---

## 📞 Support

Pour toute question ou amélioration :
1. Vérifier les métadonnées dans `backend/accounts/models.py`
2. Consulter l'endpoint `/api/v1/organizations/metadata/`
3. Examiner `OrganizationMetadataService` pour le caching

---

**Dernière mise à jour :** Mai 2026  
**Version :** 1.0
