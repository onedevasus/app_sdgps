import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ProjectListComponent } from './project-list/project-list.component';
import { ProjectExplorerComponent } from './project-explorer/project-explorer.component';

const routes: Routes = [
  { path: '', component: ProjectListComponent, data: { title: 'Projets' } },
  { path: ':id', component: ProjectExplorerComponent, data: { title: 'Explorateur de projet' } },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ProjectsRoutingModule {}
