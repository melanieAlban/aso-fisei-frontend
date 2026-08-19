import { Component, computed, effect, inject, input, model, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { MessageService } from 'primeng/api';
import { Usuario } from '../../../shared/models/usuario.model';
import { UsuariosService } from '../services/usuarios.service';

@Component({
  selector: 'app-usuario-form-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, DialogModule, InputTextModule, PasswordModule, ButtonModule],
  templateUrl: './usuario-form-dialog.component.html',
  styleUrl: './usuario-form-dialog.component.scss',
})
export class UsuarioFormDialogComponent {
  private fb = inject(FormBuilder);
  private usuariosService = inject(UsuariosService);
  private messageService = inject(MessageService);

  readonly visible = model(false);
  readonly usuario = input<Usuario | null>(null);

  readonly cargando = signal(false);
  readonly errorMensaje = signal('');

  readonly esEdicion = computed(() => this.usuario() !== null);

  readonly form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    usuario: ['', Validators.required],
    password: [''],
  });

  constructor() {
    effect(() => {
      if (!this.visible()) {
        return;
      }
      const actual = this.usuario();
      this.errorMensaje.set('');
      this.form.reset({
        nombre: actual?.nombre ?? '',
        usuario: actual?.usuario ?? '',
        password: '',
      });
      const passwordControl = this.form.controls.password;
      if (actual) {
        passwordControl.clearValidators();
      } else {
        passwordControl.setValidators([Validators.required, Validators.minLength(8)]);
      }
      passwordControl.updateValueAndValidity();
    });
  }

  cerrar(): void {
    this.visible.set(false);
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.cargando.set(true);
    this.errorMensaje.set('');
    const { nombre, usuario, password } = this.form.getRawValue();
    const actual = this.usuario();

    const peticion = actual
      ? this.usuariosService.editarUsuario(actual.id, { nombre, usuario })
      : this.usuariosService.crearUsuario({ nombre, usuario, password });

    peticion.subscribe({
      next: () => {
        this.cargando.set(false);
        this.messageService.add({
          severity: 'success',
          summary: actual ? 'Usuario actualizado' : 'Usuario creado',
        });
        this.visible.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.cargando.set(false);
        this.errorMensaje.set(
          err.status === 409
            ? 'Ese nombre de usuario ya está en uso.'
            : 'No se pudo guardar el usuario. Intenta de nuevo.',
        );
      },
    });
  }
}
