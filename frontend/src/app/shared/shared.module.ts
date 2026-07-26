import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FieldInfoComponent } from './components/field-info/field-info.component';
import { MultiLevelSortComponent } from './components/multi-level-sort/multi-level-sort.component';
import { ColumnConfigComponent } from './components/column-config/column-config.component';

@NgModule({
  declarations: [
    FieldInfoComponent,
    MultiLevelSortComponent,
    ColumnConfigComponent
  ],
  imports: [
    CommonModule,
    FormsModule
  ],
  exports: [
    FieldInfoComponent,
    MultiLevelSortComponent,
    ColumnConfigComponent
  ]
})
export class SharedModule { }
