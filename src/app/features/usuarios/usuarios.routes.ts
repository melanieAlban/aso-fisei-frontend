import { Routes } from '@angular/router';

export const USUARIOS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/usuarios-lista.component').then((m) => m.UsuariosListaComponent),
  },
];
