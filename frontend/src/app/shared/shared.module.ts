import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FieldInfoComponent } from './components/field-info/field-info.component';

@NgModule({
  declarations: [
    FieldInfoComponent
  ],
  imports: [
    CommonModule
  ],
  exports: [
    FieldInfoComponent
  ]
})
export class SharedModule { }
