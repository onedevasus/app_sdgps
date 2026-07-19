import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { PieceFieldDescriptionsComponent } from './piece-field-descriptions.component';

/** Écran d'administration (App Admin) des descriptions/infobulles des champs de pièces. */
@NgModule({
  declarations: [PieceFieldDescriptionsComponent],
  imports: [CommonModule, FormsModule, RouterModule],
  exports: [PieceFieldDescriptionsComponent],
})
export class PieceFieldDescriptionsModule {}
