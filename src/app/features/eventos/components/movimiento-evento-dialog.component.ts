import { Component, effect, inject, input, model, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { MessageService } from 'primeng/api';
import { MetodoPagoEvento } from '../models/evento.model';
import { EventosService } from '../services/eventos.service';

export type TipoMovimientoEvento = 'ingreso' | 'gasto';

@Component({
  selector: 'app-movimiento-evento-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, DialogModule, ButtonModule],
  templateUrl: './movimiento-evento-dialog.component.html',
  styleUrl: './movimiento-evento-dialog.component.scss',
})
export class MovimientoEventoDialogComponent {
  private fb = inject(FormBuilder);
  private eventosService = inject(EventosService);
  private messageService = inject(MessageService);

  readonly visible = model(false);
  readonly eventoId = input<string>('');
  readonly tipo = input<TipoMovimientoEvento>('ingreso');

  readonly cargando = signal(false);
  readonly errorMensaje = signal('');
  readonly metodoPago = signal<MetodoPagoEvento>('EFECTIVO');

  readonly titulo = () => (this.tipo() === 'ingreso' ? 'Registrar ingreso' : 'Registrar gasto');

  readonly form = this.fb.nonNullable.group({
    descripcion: ['', Validators.required],
    monto: ['', [Validators.required, Validators.pattern(/^\d+(\.\d{1,2})?$/)]],
  });

  constructor() {
    effect(() => {
      if (!this.visible()) {
        return;
      }
      this.errorMensaje.set('');
      this.metodoPago.set('EFECTIVO');
      this.form.reset({ descripcion: '', monto: '' });
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
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.cargando.set(true);
    this.errorMensaje.set('');
    const { descripcion, monto } = this.form.getRawValue();
    const datos = { descripcion, monto: Number(monto), metodoPago: this.metodoPago() };

    const operacion =
      this.tipo() === 'ingreso'
        ? this.eventosService.registrarIngreso(this.eventoId(), datos)
        : this.eventosService.registrarGasto(this.eventoId(), datos);

    operacion.subscribe({
      next: () => {
        this.cargando.set(false);
        this.messageService.add({ severity: 'success', summary: `${this.titulo()} registrado` });
        this.eventosService.cargarResumen(this.eventoId());
        this.visible.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.cargando.set(false);
        this.errorMensaje.set(
          err.error?.error?.message ?? 'No se pudo registrar el movimiento. Intenta de nuevo.',
        );
      },
    });
  }
}
