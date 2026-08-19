import { Routes } from '@angular/router';

export const CAJA_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/caja.component').then((m) => m.CajaComponent),
  },
];
