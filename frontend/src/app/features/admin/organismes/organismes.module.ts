import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { OrganismeListComponent } from './organisme-list/organisme-list.component';

@NgModule({
  declarations: [OrganismeListComponent],
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  exports: [OrganismeListComponent],
})
export class OrganismesModule {}
