import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export function permisoGuard(rolesPermitidos: string[]): CanActivateFn {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (!authService.isAuthenticated()) {
      return router.createUrlTree(['/login']);
    }

    const tienePermiso = rolesPermitidos.some((rol) => authService.tieneRol(rol));

    if (!tienePermiso) {
      return router.createUrlTree(['/no-autorizado']);
    }

    return true;
  };
}
