import { Routes } from '@angular/router';

export const INVENTARIO_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/inventario-lista.component').then((m) => m.InventarioListaComponent),
  },
  {
    path: 'movimientos',
    loadComponent: () =>
      import('./pages/movimientos.component').then((m) => m.MovimientosComponent),
  },
];
