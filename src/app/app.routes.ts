import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { permisoGuard } from './core/auth/permiso.guard';
import { MainLayoutComponent } from './layout/main-layout.component';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'no-autorizado',
    loadComponent: () =>
      import('./features/no-autorizado/no-autorizado.component').then(
        (m) => m.NoAutorizadoComponent,
      ),
  },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'usuarios',
        loadChildren: () =>
          import('./features/usuarios/usuarios.routes').then((m) => m.USUARIOS_ROUTES),
        canActivate: [permisoGuard(['Admin'])],
      },
      {
        path: 'inventario',
        loadComponent: () =>
          import('./features/inventario/inventario.component').then(
            (m) => m.InventarioComponent,
          ),
      },
      {
        path: 'ventas',
        loadComponent: () =>
          import('./features/ventas/ventas.component').then((m) => m.VentasComponent),
      },
      {
        path: 'caja',
        loadComponent: () =>
          import('./features/caja/caja.component').then((m) => m.CajaComponent),
        canActivate: [permisoGuard(['Admin'])],
      },
      {
        path: 'gastos',
        loadComponent: () =>
          import('./features/gastos/gastos.component').then((m) => m.GastosComponent),
      },
      {
        path: 'deudas',
        loadComponent: () =>
          import('./features/deudas/deudas.component').then((m) => m.DeudasComponent),
        canActivate: [permisoGuard(['Admin'])],
      },
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
