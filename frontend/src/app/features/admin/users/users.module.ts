import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { UserListComponent } from './user-list/user-list.component';
import { UserDetailComponent } from './user-detail/user-detail.component';
import { RolesPermissionsComponent } from './roles-permissions/roles-permissions.component';

@NgModule({
  declarations: [
    UserListComponent,
    UserDetailComponent,
    RolesPermissionsComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    MatSlideToggleModule,
  ],
  exports: [
    UserListComponent,
    UserDetailComponent,
    RolesPermissionsComponent,
  ],
})
export class UsersModule { }
