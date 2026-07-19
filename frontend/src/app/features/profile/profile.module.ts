import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { ProfileSettingsComponent } from './components/profile-settings/profile-settings.component';
import { PieceSortSettingsComponent } from './components/piece-sort-settings/piece-sort-settings.component';
import { PieceFieldsSettingsComponent } from './components/piece-fields-settings/piece-fields-settings.component';
import { HttpClientModule } from '@angular/common/http';

const routes: Routes = [
  {
    path: '',
    component: ProfileSettingsComponent
  },
  {
    // Regroupement « Paramètres » : tri par défaut + champs par défaut des tableaux de pièces.
    // Ancien chemin `tri-pieces` déplacé sous `parametres/` (réorganisation du sidebar).
    path: 'parametres/tri-pieces',
    component: PieceSortSettingsComponent
  },
  {
    // Page dédiée : colonnes par défaut de chaque type de pièce (vues app + rapport PDF).
    path: 'parametres/champs-pieces',
    component: PieceFieldsSettingsComponent
  },
  {
    // Redirection de compatibilité vers le nouveau chemin (anciens liens/marque-pages).
    path: 'tri-pieces',
    redirectTo: 'parametres/tri-pieces'
  }
];

@NgModule({
  declarations: [
    ProfileSettingsComponent,
    PieceSortSettingsComponent,
    PieceFieldsSettingsComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    RouterModule.forChild(routes)
  ]
})
export class ProfileModule { }
