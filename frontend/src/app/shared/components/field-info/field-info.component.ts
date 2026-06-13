import { Component, Input, OnInit } from '@angular/core';
import { OrganizationMetadataService } from '../../../core/services/organization-metadata.service';

/**
 * Composant réutilisable pour afficher une infobulle avec description de champ
 * 
 * Usage:
 * <app-field-info field="email"></app-field-info>
 * <app-field-info field="name" position="right"></app-field-info>
 */
@Component({
  selector: 'app-field-info',
  template: `
    <div class="field-info-container" [class.has-description]="description">
      <i 
        class="fas fa-info-circle field-info-icon" 
        [title]="description || 'Aucune description disponible'"
        *ngIf="showIcon">
      </i>
      <span class="field-info-text" *ngIf="showText && description">
        {{ description }}
      </span>
    </div>
  `,
  styles: [`
    .field-info-container {
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }

    .field-info-icon {
      color: var(--accent-color, #cc5858);
      font-size: 14px;
      cursor: help;
      opacity: 0.6;
      transition: all 0.2s ease;

      &:hover {
        opacity: 1;
        transform: scale(1.1);
      }
    }

    .field-info-text {
      font-size: 12px;
      color: var(--text-muted, #6c757d);
      font-style: italic;
      line-height: 1.4;
    }

    // Mode tooltip (par défaut)
    :host {
      display: inline-block;
    }
  `]
})
export class FieldInfoComponent implements OnInit {
  @Input() field: string = '';
  @Input() showIcon: boolean = true;
  @Input() showText: boolean = false;
  
  description: string = '';

  constructor(private metadataService: OrganizationMetadataService) {}

  ngOnInit(): void {
    if (this.field) {
      this.metadataService.getFieldDescription(this.field).subscribe((desc: string) => {
        this.description = desc;
      });
    }
  }
}
