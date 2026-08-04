import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { ApiService } from '../services/api.service';
import {
  LoginResponseData,
  RefreshResponseData,
  RespuestaEstandar,
  Usuario,
} from '../../shared/models/usuario.model';

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const USUARIO_KEY = 'usuario';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private api = inject(ApiService);
  private router = inject(Router);

  private readonly _currentUser = signal<Usuario | null>(null);
  readonly currentUser = this._currentUser.asReadonly();
  readonly isAuthenticated = computed(() => this._currentUser() !== null);

  constructor() {
    this.restaurarSesion();
  }

  login(usuario: string, password: string): Observable<RespuestaEstandar<LoginResponseData>> {
    return this.api
      .post<RespuestaEstandar<LoginResponseData>>('/auth/login', { usuario, password })
      .pipe(
        tap((respuesta) => {
          const { accessToken, refreshToken, usuario } = respuesta.data;
          localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
          localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
          localStorage.setItem(USUARIO_KEY, JSON.stringify(usuario));
          this._currentUser.set(usuario);
        }),
      );
  }

  logout(): void {
    this.api.post('/auth/logout', {}).subscribe({
      complete: () => this.limpiarSesion(),
      error: () => this.limpiarSesion(),
    });
  }

  /** Limpia la sesión localmente sin llamar al backend (usado por el interceptor cuando el refresh falla). */
  forzarLogout(): void {
    this.limpiarSesion();
  }

  restaurarSesion(): void {
    const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
    const usuarioGuardado = localStorage.getItem(USUARIO_KEY);

    if (accessToken && usuarioGuardado) {
      this._currentUser.set(JSON.parse(usuarioGuardado) as Usuario);
    }
  }

  tieneRol(rol: string): boolean {
    return this._currentUser()?.roles.includes(rol) ?? false;
  }

  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  actualizarAccessToken(accessToken: string): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  }

  refrescarToken(): Observable<RespuestaEstandar<RefreshResponseData>> {
    const refreshToken = this.getRefreshToken();
    return this.api.post<RespuestaEstandar<RefreshResponseData>>('/auth/refresh', {
      refreshToken,
    });
  }

  private limpiarSesion(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USUARIO_KEY);
    this._currentUser.set(null);
    this.router.navigate(['/login']);
  }
}
