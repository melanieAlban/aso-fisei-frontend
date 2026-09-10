import { Component, effect, inject, input, model, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { MessageService } from 'primeng/api';
import { CompromisoPagoEvento, MetodoPagoEvento } from '../models/evento.model';
import { EventosService } from '../services/eventos.service';

@Component({
  selector: 'app-abonar-compromiso-dialog',
  standalone: true,
  imports: [DecimalPipe, ReactiveFormsModule, DialogModule, ButtonModule],
  templateUrl: './abonar-compromiso-dialog.component.html',
  styleUrl: './abonar-compromiso-dialog.component.scss',
})
export class AbonarCompromisoDialogComponent {
  private fb = inject(FormBuilder);
  private eventosService = inject(EventosService);
  private messageService = inject(MessageService);

  readonly visible = model(false);
  readonly eventoId = input<string>('');
  readonly compromiso = input<CompromisoPagoEvento | null>(null);

  readonly cargando = signal(false);
  readonly errorMensaje = signal('');
  readonly metodoPago = signal<MetodoPagoEvento>('EFECTIVO');

  readonly pendiente = () => {
    const c = this.compromiso();
    if (!c) return 0;
    return Math.round((c.montoTotal - c.montoPagado) * 100) / 100;
  };

  readonly form = this.fb.nonNullable.group({
    monto: ['', [Validators.required, Validators.pattern(/^\d+(\.\d{1,2})?$/)]],
  });

  constructor() {
    effect(() => {
      if (!this.visible()) {
        return;
      }
      this.errorMensaje.set('');
      this.metodoPago.set('EFECTIVO');
      this.form.reset({ monto: this.pendiente() > 0 ? String(this.pendiente()) : '' });
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
    const c = this.compromiso();
    if (this.form.invalid || !c) {
      this.form.markAllAsTouched();
      return;
    }

    const { monto } = this.form.getRawValue();
    if (Number(monto) > this.pendiente() + 0.005) {
      this.errorMensaje.set(`El abono no puede superar lo pendiente (${this.pendiente().toFixed(2)}).`);
      return;
    }

    this.cargando.set(true);
    this.errorMensaje.set('');

    this.eventosService
      .abonarCompromisoPago(this.eventoId(), c.id, { monto: Number(monto), metodoPago: this.metodoPago() })
      .subscribe({
        next: () => {
          this.cargando.set(false);
          this.messageService.add({ severity: 'success', summary: 'Abono registrado' });
          this.visible.set(false);
        },
        error: (err: HttpErrorResponse) => {
          this.cargando.set(false);
          this.errorMensaje.set(
            err.error?.error?.message ?? 'No se pudo registrar el abono. Intenta de nuevo.',
          );
        },
      });
  }
}
