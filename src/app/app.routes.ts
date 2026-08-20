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
        loadChildren: () =>
          import('./features/inventario/inventario.routes').then((m) => m.INVENTARIO_ROUTES),
      },
      {
        path: 'ventas',
        loadChildren: () => import('./features/ventas/ventas.routes').then((m) => m.VENTAS_ROUTES),
      },
      {
        path: 'caja',
        loadChildren: () => import('./features/caja/caja.routes').then((m) => m.CAJA_ROUTES),
        canActivate: [permisoGuard(['Admin'])],
      },
      {
        path: 'gastos',
        loadChildren: () => import('./features/gastos/gastos.routes').then((m) => m.GASTOS_ROUTES),
        canActivate: [permisoGuard(['Admin'])],
      },
      {
        path: 'deudas',
        loadChildren: () => import('./features/deudas/deudas.routes').then((m) => m.DEUDAS_ROUTES),
        canActivate: [permisoGuard(['Admin'])],
      },
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
