import { Routes } from '@angular/router';

export const AUDITORIA_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/auditoria.component').then((m) => m.AuditoriaComponent),
  },
];
