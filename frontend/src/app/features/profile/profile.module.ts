import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { ProfileSettingsComponent } from './components/profile-settings/profile-settings.component';
import { HttpClientModule } from '@angular/common/http';

const routes: Routes = [
  {
    path: '',
    component: ProfileSettingsComponent
  }
];

@NgModule({
  declarations: [
    ProfileSettingsComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    HttpClientModule,
    RouterModule.forChild(routes)
  ]
})
export class ProfileModule { }
