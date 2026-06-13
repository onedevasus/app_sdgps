import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

// Components
import { DashboardLayoutComponent } from './components/dashboard-layout/dashboard-layout.component';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { TopBarComponent } from './components/topbar/topbar.component';

// Services
import { LayoutService } from './services/layout.service';

@NgModule({
  declarations: [
    DashboardLayoutComponent,
    SidebarComponent,
    TopBarComponent
  ],
  imports: [
    CommonModule,    // ← Nécessaire pour *ngIf, *ngFor, async pipe
    RouterModule,    // ← Nécessaire pour routerLink, router-outlet
    FormsModule
  ],
  exports: [
    DashboardLayoutComponent,
    SidebarComponent,
    TopBarComponent
  ],
  providers: [
    LayoutService
  ]
})
export class LayoutModule { }
