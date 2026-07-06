import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ProjectsRoutingModule } from './projects-routing.module';
import { ProjectListComponent } from './project-list/project-list.component';
import { ProjectExplorerComponent } from './project-explorer/project-explorer.component';

@NgModule({
  declarations: [ProjectListComponent, ProjectExplorerComponent],
  imports: [CommonModule, FormsModule, ReactiveFormsModule, ProjectsRoutingModule],
})
export class ProjectsModule {}
