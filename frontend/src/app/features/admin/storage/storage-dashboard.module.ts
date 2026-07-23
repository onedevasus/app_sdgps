import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { StorageDashboardComponent } from './storage-dashboard.component';

/** Dashboard d'administration (App Admin) : espace de stockage occupé par les fichiers. */
@NgModule({
  declarations: [StorageDashboardComponent],
  imports: [CommonModule, FormsModule, RouterModule],
  exports: [StorageDashboardComponent],
})
export class StorageDashboardModule {}
