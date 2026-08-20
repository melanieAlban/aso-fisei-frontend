import { Routes } from '@angular/router';

export const DEUDAS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/deudas-lista.component').then((m) => m.DeudasListaComponent),
  },
];
