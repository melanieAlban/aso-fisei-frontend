import { Component, effect, inject, input, model, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { MessageService } from 'primeng/api';
import { AsignacionEntradas, MetodoPagoEvento } from '../models/evento.model';
import { EventosService } from '../services/eventos.service';

@Component({
  selector: 'app-actualizar-asignacion-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, DialogModule, ButtonModule],
  templateUrl: './actualizar-asignacion-dialog.component.html',
  styleUrl: './actualizar-asignacion-dialog.component.scss',
})
export class ActualizarAsignacionDialogComponent {
  private fb = inject(FormBuilder);
  private eventosService = inject(EventosService);
  private messageService = inject(MessageService);

  readonly visible = model(false);
  readonly asignacion = input<AsignacionEntradas | null>(null);

  readonly cargando = signal(false);
  readonly errorMensaje = signal('');
  readonly metodoPago = signal<MetodoPagoEvento>('EFECTIVO');

  readonly form = this.fb.nonNullable.group({
    cantidadVendida: ['0', [Validators.required, Validators.pattern(/^\d+$/)]],
    cantidadDevuelta: ['0', [Validators.required, Validators.pattern(/^\d+$/)]],
    dineroRecibido: ['0', [Validators.required, Validators.pattern(/^\d+(\.\d{1,2})?$/)]],
  });

  constructor() {
    effect(() => {
      if (!this.visible()) {
        return;
      }
      this.errorMensaje.set('');
      const a = this.asignacion();
      this.metodoPago.set(a?.metodoPago ?? 'EFECTIVO');
      this.form.reset({
        cantidadVendida: String(a?.cantidadVendida ?? 0),
        cantidadDevuelta: String(a?.cantidadDevuelta ?? 0),
        dineroRecibido: a?.dineroRecibido ? String(a.dineroRecibido) : '0',
      });
    });
  }

  elegirEfectivo(): void {
    this.metodoPago.set('EFECTIVO');
  }

  elegirTransferencia(): void {
    this.metodoPago.set('TRANSFERENCIA');
  }

  cerrar(): void {
    this.visible.set(false);
  }

  guardar(): void {
    const a = this.asignacion();
    if (this.form.invalid || !a) {
      this.form.markAllAsTouched();
      return;
    }

    this.cargando.set(true);
    this.errorMensaje.set('');
    const { cantidadVendida, cantidadDevuelta, dineroRecibido } = this.form.getRawValue();
    const dinero = Number(dineroRecibido);

    this.eventosService
      .actualizarAsignacion(a.id, {
        cantidadVendida: Number(cantidadVendida),
        cantidadDevuelta: Number(cantidadDevuelta),
        dineroRecibido: dinero,
        ...(dinero > 0 ? { metodoPago: this.metodoPago() } : {}),
      })
      .subscribe({
        next: () => {
          this.cargando.set(false);
          this.messageService.add({ severity: 'success', summary: 'Asignación actualizada' });
          this.visible.set(false);
        },
        error: (err: HttpErrorResponse) => {
          this.cargando.set(false);
          this.errorMensaje.set(
            err.error?.error?.message ?? 'No se pudo actualizar la asignación. Intenta de nuevo.',
          );
        },
      });
  }
}
