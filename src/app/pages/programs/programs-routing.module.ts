import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ProgramsPage } from './programs.page';
import { ProgramFormPage } from './program-form.page';
import { ProgramFormGuard } from './program-form.guard';

const routes: Routes = [
  {
    path: '',
    children: [
      {
        path: '',
        component: ProgramsPage
      },
      {
        path: 'proponer',
        component: ProgramFormPage,
        canActivate: [ProgramFormGuard]
      },
      {
        path: ':programID',
        component: ProgramsPage
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ProgramsPageRoutingModule {}
