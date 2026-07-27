import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FieldInfoComponent } from './components/field-info/field-info.component';
import { MultiLevelSortComponent } from './components/multi-level-sort/multi-level-sort.component';
import { TableHeaderTooltipDirective } from './directives/table-header-tooltip.directive';
import { ColumnFilterComponent } from './components/column-filter/column-filter.component';
import { ColumnConfigComponent } from './components/column-config/column-config.component';

@NgModule({
  declarations: [
    FieldInfoComponent,
    MultiLevelSortComponent,
    ColumnConfigComponent,
    ColumnFilterComponent,
    TableHeaderTooltipDirective
  ],
  imports: [
    CommonModule,
    FormsModule
  ],
  exports: [
    FieldInfoComponent,
    MultiLevelSortComponent,
    ColumnConfigComponent,
    ColumnFilterComponent,
    TableHeaderTooltipDirective
  ]
})
export class SharedModule { }
