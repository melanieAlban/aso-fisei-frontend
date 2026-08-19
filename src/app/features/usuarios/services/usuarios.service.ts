import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { Rol } from '../../../shared/models/rol.model';
import { RespuestaEstandar, Usuario } from '../../../shared/models/usuario.model';

type UsuarioSinRoles = Omit<Usuario, 'roles'>;

interface ListarUsuariosData {
  usuarios: Usuario[];
  total: number;
  page: number;
  limit: number;
}


@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private api = inject(ApiService);

  private readonly _usuarios = signal<Usuario[]>([]);
  readonly usuarios = this._usuarios.asReadonly();

  private readonly _roles = signal<Rol[]>([]);
  readonly roles = this._roles.asReadonly();

  private readonly _cargando = signal(false);
  readonly cargando = this._cargando.asReadonly();

  cargarUsuarios(): void {
    this._cargando.set(true);
    this.api.get<RespuestaEstandar<ListarUsuariosData>>('/users').subscribe({
      next: (respuesta) => {
        this._usuarios.set(respuesta.data.usuarios);
        this._cargando.set(false);
      },
      error: () => this._cargando.set(false),
    });
  }

  cargarRoles(): void {
    this.api.get<RespuestaEstandar<Rol[]>>('/roles').subscribe({
      next: (respuesta) => this._roles.set(respuesta.data),
    });
  }

  crearUsuario(datos: {
    nombre: string;
    usuario: string;
    password: string;
  }): Observable<RespuestaEstandar<UsuarioSinRoles>> {
    return this.api.post<RespuestaEstandar<UsuarioSinRoles>>('/users', datos).pipe(
      tap((respuesta) => {
        const nuevo: Usuario = { ...respuesta.data, roles: [] };
        this._usuarios.update((usuarios) => [nuevo, ...usuarios]);
      }),
    );
  }

  editarUsuario(
    id: string,
    datos: { nombre?: string; usuario?: string },
  ): Observable<RespuestaEstandar<UsuarioSinRoles>> {
    return this.api
      .patch<RespuestaEstandar<UsuarioSinRoles>>(`/users/${id}`, datos)
      .pipe(tap((respuesta) => this.actualizarUsuario(id, respuesta.data)));
  }

  desactivar(id: string): Observable<RespuestaEstandar<UsuarioSinRoles>> {
    return this.api
      .patch<RespuestaEstandar<UsuarioSinRoles>>(`/users/${id}/deactivate`, {})
      .pipe(tap((respuesta) => this.actualizarUsuario(id, respuesta.data)));
  }

  activar(id: string): Observable<RespuestaEstandar<UsuarioSinRoles>> {
    return this.api
      .patch<RespuestaEstandar<UsuarioSinRoles>>(`/users/${id}/activate`, {})
      .pipe(tap((respuesta) => this.actualizarUsuario(id, respuesta.data)));
  }

  cambiarPassword(id: string, nuevoPassword: string): Observable<RespuestaEstandar<UsuarioSinRoles>> {
    return this.api.patch<RespuestaEstandar<UsuarioSinRoles>>(`/users/${id}/password`, {
      nuevoPassword,
    });
  }

  asignarRol(usuarioId: string, rolId: string): Observable<RespuestaEstandar<void>> {
    return this.api.patch<RespuestaEstandar<void>>(`/users/${usuarioId}/roles`, { rolId }).pipe(
      tap(() => {
        const rol = this._roles().find((r) => r.id === rolId);
        if (!rol) return;
        this._usuarios.update((usuarios) =>
          usuarios.map((u) =>
            u.id === usuarioId && !u.roles.includes(rol.nombre)
              ? { ...u, roles: [...u.roles, rol.nombre] }
              : u,
          ),
        );
      }),
    );
  }

  quitarRol(usuarioId: string, rolId: string): Observable<RespuestaEstandar<void>> {
    return this.api.delete<RespuestaEstandar<void>>(`/users/${usuarioId}/roles/${rolId}`).pipe(
      tap(() => {
        const rol = this._roles().find((r) => r.id === rolId);
        if (!rol) return;
        this._usuarios.update((usuarios) =>
          usuarios.map((u) =>
            u.id === usuarioId
              ? { ...u, roles: u.roles.filter((nombre) => nombre !== rol.nombre) }
              : u,
          ),
        );
      }),
    );
  }

  private actualizarUsuario(id: string, datos: UsuarioSinRoles): void {
    this._usuarios.update((usuarios) =>
      usuarios.map((u) => (u.id === id ? { ...u, ...datos, roles: u.roles } : u)),
    );
  }
}
