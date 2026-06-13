import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {DashboardComponent} from './dashboard.component';
import {AuthGuard} from '../../core/auth/auth.guard'; // Importe le AuthGuard

const routes: Routes = [
    {
        path: '', // Route par défaut pour le module Dashboard (ex: /dashboard)
        component: DashboardComponent,
        canActivate: [AuthGuard] // Protège cette route avec le AuthGuard
    }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class DashboardRoutingModule {
}
