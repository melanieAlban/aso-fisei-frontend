import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { environment } from '../../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const isApiRequest = req.url.startsWith(environment.apiUrl);
  const isAuthEndpoint = /\/auth\/(login|refresh|logout)$/.test(req.url);

  const token = authService.getAccessToken();
  const authReq =
    isApiRequest && token
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401 || !isApiRequest || isAuthEndpoint) {
        return throwError(() => error);
      }

      return authService.refrescarToken().pipe(
        switchMap((respuesta) => {
          authService.actualizarAccessToken(respuesta.data.accessToken);
          const retryReq = req.clone({
            setHeaders: { Authorization: `Bearer ${respuesta.data.accessToken}` },
          });
          return next(retryReq);
        }),
        catchError((refreshError) => {
          authService.forzarLogout();
          return throwError(() => refreshError);
        }),
      );
    }),
  );
};
