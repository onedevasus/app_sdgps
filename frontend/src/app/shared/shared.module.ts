import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FieldInfoComponent } from './components/field-info/field-info.component';
import { MultiLevelSortComponent } from './components/multi-level-sort/multi-level-sort.component';

@NgModule({
  declarations: [
    FieldInfoComponent,
    MultiLevelSortComponent
  ],
  imports: [
    CommonModule,
    FormsModule
  ],
  exports: [
    FieldInfoComponent,
    MultiLevelSortComponent
  ]
})
export class SharedModule { }
