import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MenuModule, Menu } from 'primeng/menu';
import { PopoverModule, Popover } from 'primeng/popover';
import { ToastModule } from 'primeng/toast';
import { MessageService, MenuItem } from 'primeng/api';
import { Rol } from '../../../shared/models/rol.model';
import { Usuario } from '../../../shared/models/usuario.model';
import { UsuariosService } from '../services/usuarios.service';
import { UsuarioFormDialogComponent } from '../components/usuario-form-dialog.component';
import { CambiarPasswordDialogComponent } from '../components/cambiar-password-dialog.component';

@Component({
  selector: 'app-usuarios-lista',
  standalone: true,
  imports: [
    DatePipe,
    TableModule,
    TagModule,
    ButtonModule,
    InputTextModule,
    MenuModule,
    PopoverModule,
    ToastModule,
    UsuarioFormDialogComponent,
    CambiarPasswordDialogComponent,
  ],
  providers: [MessageService],
  templateUrl: './usuarios-lista.component.html',
  styleUrl: './usuarios-lista.component.scss',
})
export class UsuariosListaComponent implements OnInit {
  private usuariosService = inject(UsuariosService);
  private messageService = inject(MessageService);

  readonly usuarios = this.usuariosService.usuarios;
  readonly roles = this.usuariosService.roles;
  readonly cargando = this.usuariosService.cargando;

  readonly query = signal('');
  readonly dialogVisible = signal(false);
  readonly usuarioEnEdicion = signal<Usuario | null>(null);
  readonly usuarioSeleccionado = signal<Usuario | null>(null);
  readonly usuarioParaRoles = signal<Usuario | null>(null);
  readonly passwordDialogVisible = signal(false);
  readonly usuarioParaPassword = signal<Usuario | null>(null);

  readonly filas = computed(() => {
    const q = this.query().trim().toLowerCase();
    const lista = this.usuarios();
    if (!q) return lista;
    return lista.filter(
      (u) => u.nombre.toLowerCase().includes(q) || u.usuario.toLowerCase().includes(q),
    );
  });

  readonly totalUsuarios = computed(() => this.usuarios().length);
  readonly activos = computed(() => this.usuarios().filter((u) => u.activo).length);
  readonly inactivos = computed(() => this.usuarios().filter((u) => !u.activo).length);

  readonly accionesMenu = computed<MenuItem[]>(() => {
    const usuario = this.usuarioSeleccionado();
    if (!usuario) return [];
    return [
      { label: 'Editar datos', icon: 'pi pi-pencil', command: () => this.abrirEditar(usuario) },
      {
        label: usuario.activo ? 'Desactivar usuario' : 'Activar usuario',
        icon: usuario.activo ? 'pi pi-ban' : 'pi pi-check',
        command: () => this.alternarEstado(usuario),
      },
      {
        label: 'Cambiar contraseña',
        icon: 'pi pi-key',
        command: () => this.abrirCambiarPassword(usuario),
      },
    ];
  });

  ngOnInit(): void {
    this.usuariosService.cargarUsuarios();
    this.usuariosService.cargarRoles();
  }

  onBuscar(valor: string): void {
    this.query.set(valor);
  }

  abrirCrear(): void {
    this.usuarioEnEdicion.set(null);
    this.dialogVisible.set(true);
  }

  abrirEditar(usuario: Usuario): void {
    this.usuarioEnEdicion.set(usuario);
    this.dialogVisible.set(true);
  }

  abrirCambiarPassword(usuario: Usuario): void {
    this.usuarioParaPassword.set(usuario);
    this.passwordDialogVisible.set(true);
  }

  seleccionarYAbrirMenu(usuario: Usuario, menu: Menu, evento: Event): void {
    this.usuarioSeleccionado.set(usuario);
    menu.toggle(evento);
  }

  abrirRolesPopover(evento: Event, usuario: Usuario, popover: Popover): void {
    this.usuarioParaRoles.set(usuario);
    popover.toggle(evento);
  }

  tieneRol(usuario: Usuario, rol: Rol): boolean {
    return usuario.roles.includes(rol.nombre);
  }

  alternarEstado(usuario: Usuario): void {
    const accion = usuario.activo
      ? this.usuariosService.desactivar(usuario.id)
      : this.usuariosService.activar(usuario.id);

    accion.subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: usuario.activo ? 'Usuario desactivado' : 'Usuario activado',
        });
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'No se pudo actualizar el estado' });
      },
    });
  }

  alternarRol(usuario: Usuario, rol: Rol, marcado: boolean): void {
    const accion = marcado
      ? this.usuariosService.asignarRol(usuario.id, rol.id)
      : this.usuariosService.quitarRol(usuario.id, rol.id);

    accion.subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: `Rol ${rol.nombre} actualizado` });
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'No se pudo actualizar el rol' });
      },
    });
  }
}
