import { Routes } from '@angular/router';

export const VENDER_ENTRADAS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/vender-entradas.component').then((m) => m.VenderEntradasComponent),
  },
];
