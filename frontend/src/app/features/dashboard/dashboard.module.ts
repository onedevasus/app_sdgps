import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';

import {DashboardRoutingModule} from './dashboard-routing.module';
import {DashboardComponent} from './dashboard.component';
import {OrganizationListComponent} from './organization-list/organization-list.component';
import {SharedModule} from '../../shared/shared.module';


@NgModule({
    declarations: [
        DashboardComponent,
        OrganizationListComponent
    ],
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        DashboardRoutingModule,
        SharedModule // Import du module shared pour les composants réutilisables
    ]
})
export class DashboardModule {
}
