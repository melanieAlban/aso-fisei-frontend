import { Component, effect, inject, input, model, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { MessageService } from 'primeng/api';
import { TipoEntrada } from '../models/evento.model';
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
  readonly tipoEntrada = input<TipoEntrada | null>(null);

  readonly cargando = signal(false);
  readonly errorMensaje = signal('');
  readonly conCombo = signal(false);

  readonly modoEdicion = () => this.tipoEntrada() !== null;

  readonly form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    precio: ['', [Validators.required, Validators.pattern(/^\d+(\.\d{1,2})?$/)]],
    cantidadTotal: ['', [Validators.required, Validators.pattern(/^[1-9]\d*$/)]],
    precioCombo: ['', [Validators.pattern(/^\d+(\.\d{1,2})?$/)]],
    cantidadCombo: ['', [Validators.pattern(/^[1-9]\d*$/)]],
  });

  constructor() {
    effect(() => {
      if (!this.visible()) {
        return;
      }
      this.errorMensaje.set('');
      const t = this.tipoEntrada();
      this.conCombo.set(!!(t?.precioCombo && t?.cantidadCombo));
      this.form.reset({
        nombre: t?.nombre ?? '',
        precio: t ? String(t.precio) : '',
        cantidadTotal: t ? String(t.cantidadTotal) : '',
        precioCombo: t?.precioCombo ? String(t.precioCombo) : '',
        cantidadCombo: t?.cantidadCombo ? String(t.cantidadCombo) : '',
      });
    });
  }

  toggleCombo(): void {
    this.conCombo.update((v) => !v);
    if (!this.conCombo()) {
      this.form.patchValue({ precioCombo: '', cantidadCombo: '' });
    }
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
    const { nombre, precio, cantidadTotal, precioCombo, cantidadCombo } = this.form.getRawValue();
    const datosCombo = this.conCombo()
      ? { precioCombo: Number(precioCombo) || undefined, cantidadCombo: Number(cantidadCombo) || undefined }
      : { precioCombo: null, cantidadCombo: null };

    const tipoActual = this.tipoEntrada();
    const operacion = tipoActual
      ? this.eventosService.editarTipoEntrada(this.eventoId(), tipoActual.id, {
          nombre,
          precio: Number(precio),
          cantidadTotal: Number(cantidadTotal),
          ...datosCombo,
        })
      : this.eventosService.crearTipoEntrada(this.eventoId(), {
          nombre,
          precio: Number(precio),
          cantidadTotal: Number(cantidadTotal),
          ...(this.conCombo() ? { precioCombo: Number(precioCombo), cantidadCombo: Number(cantidadCombo) } : {}),
        });

    operacion.subscribe({
      next: () => {
        this.cargando.set(false);
        this.messageService.add({
          severity: 'success',
          summary: tipoActual ? 'Tipo de entrada actualizado' : 'Tipo de entrada creado',
        });
        this.visible.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.cargando.set(false);
        this.errorMensaje.set(
          err.error?.error?.message ?? 'No se pudo guardar el tipo de entrada. Intenta de nuevo.',
        );
      },
    });
  }
}
