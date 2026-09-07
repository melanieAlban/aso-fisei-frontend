import { Routes } from '@angular/router';

export const EVENTOS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/eventos-lista.component').then((m) => m.EventosListaComponent),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/evento-detalle.component').then((m) => m.EventoDetalleComponent),
  },
];
