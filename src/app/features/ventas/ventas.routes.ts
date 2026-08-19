import { Routes } from '@angular/router';

export const VENTAS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/nueva-venta.component').then((m) => m.NuevaVentaComponent),
  },
  {
    path: 'historial',
    loadComponent: () =>
      import('./pages/historial-ventas.component').then((m) => m.HistorialVentasComponent),
  },
];
