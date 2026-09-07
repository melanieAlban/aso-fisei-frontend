import { Component, effect, inject, input, model, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { MessageService } from 'primeng/api';
import { EventosService } from '../services/eventos.service';

@Component({
  selector: 'app-tipo-entrada-form-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, DialogModule, ButtonModule],
  templateUrl: './tipo-entrada-form-dialog.component.html',
  styleUrl: './tipo-entrada-form-dialog.component.scss',
})
export class TipoEntradaFormDialogComponent {
  private fb = inject(FormBuilder);
  private eventosService = inject(EventosService);
  private messageService = inject(MessageService);

  readonly visible = model(false);
  readonly eventoId = input<string>('');

  readonly cargando = signal(false);
  readonly errorMensaje = signal('');

  readonly form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    precio: ['', [Validators.required, Validators.pattern(/^\d+(\.\d{1,2})?$/)]],
    cantidadTotal: ['', [Validators.required, Validators.pattern(/^[1-9]\d*$/)]],
  });

  constructor() {
    effect(() => {
      if (!this.visible()) {
        return;
      }
      this.errorMensaje.set('');
      this.form.reset({ nombre: '', precio: '', cantidadTotal: '' });
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
    const { nombre, precio, cantidadTotal } = this.form.getRawValue();

    this.eventosService
      .crearTipoEntrada(this.eventoId(), {
        nombre,
        precio: Number(precio),
        cantidadTotal: Number(cantidadTotal),
      })
      .subscribe({
        next: () => {
          this.cargando.set(false);
          this.messageService.add({ severity: 'success', summary: 'Tipo de entrada creado' });
          this.visible.set(false);
        },
        error: (err: HttpErrorResponse) => {
          this.cargando.set(false);
          this.errorMensaje.set(
            err.error?.error?.message ?? 'No se pudo crear el tipo de entrada. Intenta de nuevo.',
          );
        },
      });
  }
}
