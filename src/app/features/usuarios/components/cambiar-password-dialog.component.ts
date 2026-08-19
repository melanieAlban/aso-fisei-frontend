import { Component, computed, effect, inject, input, model, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { DialogModule } from 'primeng/dialog';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { MessageService } from 'primeng/api';
import { Usuario } from '../../../shared/models/usuario.model';
import { UsuariosService } from '../services/usuarios.service';

@Component({
  selector: 'app-cambiar-password-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, DialogModule, PasswordModule, ButtonModule],
  templateUrl: './cambiar-password-dialog.component.html',
  styleUrl: './cambiar-password-dialog.component.scss',
})
export class CambiarPasswordDialogComponent {
  private fb = inject(FormBuilder);
  private usuariosService = inject(UsuariosService);
  private messageService = inject(MessageService);

  readonly visible = model(false);
  readonly usuario = input<Usuario | null>(null);

  readonly cargando = signal(false);
  readonly errorMensaje = signal('');

  readonly form = this.fb.nonNullable.group({
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  readonly subtitulo = computed(() => {
    const actual = this.usuario();
    return actual ? `Nueva contraseña para ${actual.nombre}` : '';
  });

  constructor() {
    effect(() => {
      if (this.visible()) {
        this.errorMensaje.set('');
        this.form.reset({ password: '' });
      }
    });
  }

  cerrar(): void {
    this.visible.set(false);
  }

  guardar(): void {
    const actual = this.usuario();
    if (this.form.invalid || !actual) {
      this.form.markAllAsTouched();
      return;
    }

    this.cargando.set(true);
    this.errorMensaje.set('');
    const { password } = this.form.getRawValue();

    this.usuariosService.cambiarPassword(actual.id, password).subscribe({
      next: () => {
        this.cargando.set(false);
        this.messageService.add({
          severity: 'success',
          summary: `Contraseña actualizada para ${actual.nombre}`,
        });
        this.visible.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.cargando.set(false);
        this.errorMensaje.set(
          err.status === 403
            ? 'No tienes permiso para cambiar esta contraseña.'
            : 'No se pudo actualizar la contraseña. Intenta de nuevo.',
        );
      },
    });
  }
}
