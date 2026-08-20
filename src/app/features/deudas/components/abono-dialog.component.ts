import { Component, computed, effect, inject, input, model, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { MessageService } from 'primeng/api';
import { DeudaConAbonos, MetodoPago } from '../models/deuda.model';
import { DeudasService } from '../services/deudas.service';

@Component({
  selector: 'app-abono-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, DialogModule, ButtonModule],
  templateUrl: './abono-dialog.component.html',
  styleUrl: './abono-dialog.component.scss',
})
export class AbonoDialogComponent {
  private fb = inject(FormBuilder);
  private deudasService = inject(DeudasService);
  private messageService = inject(MessageService);

  readonly visible = model(false);
  readonly deuda = input<DeudaConAbonos | null>(null);

  readonly cargando = signal(false);
  readonly errorMensaje = signal('');
  readonly metodoPago = signal<MetodoPago>('EFECTIVO');

  readonly form = this.fb.nonNullable.group({
    monto: ['', [Validators.required, Validators.pattern(/^\d+(\.\d{1,2})?$/)]],
  });

  readonly esCobrar = computed(() => this.deuda()?.deuda.tipo === 'POR_COBRAR');
  readonly saldoPendiente = computed(() => {
    const d = this.deuda();
    return d ? d.deuda.montoTotal - d.deuda.montoAbonado : 0;
  });
  readonly tituloAccion = computed(() => (this.esCobrar() ? 'Registrar abono' : 'Registrar pago'));

  constructor() {
    effect(() => {
      if (!this.visible()) {
        return;
      }
      this.errorMensaje.set('');
      this.metodoPago.set('EFECTIVO');
      this.form.reset({ monto: '' });
    });
  }

  elegirEfectivo(): void {
    this.metodoPago.set('EFECTIVO');
  }

  elegirTransferencia(): void {
    this.metodoPago.set('TRANSFERENCIA');
  }

  aplicarMitad(): void {
    this.form.controls.monto.setValue((this.saldoPendiente() / 2).toFixed(2));
  }

  aplicarTotal(): void {
    this.form.controls.monto.setValue(this.saldoPendiente().toFixed(2));
  }

  cerrar(): void {
    this.visible.set(false);
  }

  guardar(): void {
    const d = this.deuda();
    if (!d || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.cargando.set(true);
    this.errorMensaje.set('');
    const { monto } = this.form.getRawValue();

    this.deudasService
      .registrarAbono(d.deuda.id, { monto: Number(monto), metodoPago: this.metodoPago() })
      .subscribe({
        next: () => {
          this.cargando.set(false);
          this.messageService.add({ severity: 'success', summary: this.tituloAccion() + ' registrado' });
          this.visible.set(false);
        },
        error: (err: HttpErrorResponse) => {
          this.cargando.set(false);
          this.errorMensaje.set(
            err.error?.error?.message ?? 'No se pudo registrar. Intenta de nuevo.',
          );
        },
      });
  }
}
