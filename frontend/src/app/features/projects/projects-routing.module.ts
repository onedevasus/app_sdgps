import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ProjectListComponent } from './project-list/project-list.component';
import { ProjectExplorerComponent } from './project-explorer/project-explorer.component';
import { ProjectSsdgpsListComponent } from './project-ssdgps-list/project-ssdgps-list.component';
import { PieceManagementPageComponent } from './piece-management-page/piece-management-page.component';
import { PieceAddPageComponent } from './piece-add-page/piece-add-page.component';
import { PieceDetailPageComponent } from './piece-detail-page/piece-detail-page.component';

const routes: Routes = [
  { path: '', component: ProjectListComponent, data: { title: 'Projets' } },
  { path: ':id', component: ProjectExplorerComponent, data: { title: 'Explorateur de projet' } },
  { path: ':id/ssdgps', component: ProjectSsdgpsListComponent, data: { title: 'Tous les SSDGPS du projet' } },
  { path: ':id/pieces/:ssdgpsId', component: PieceManagementPageComponent, data: { title: 'Pièces du rapport SSDGPS' } },
  { path: ':id/pieces/:ssdgpsId/ajouter', component: PieceAddPageComponent, data: { title: 'Ajouter une pièce' } },
  { path: ':id/pieces/:ssdgpsId/piece/:pieceId', component: PieceDetailPageComponent, data: { title: 'Consulter une pièce', mode: 'view' } },
  { path: ':id/pieces/:ssdgpsId/piece/:pieceId/modifier', component: PieceDetailPageComponent, data: { title: 'Modifier une pièce', mode: 'edit' } },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ProjectsRoutingModule {}
