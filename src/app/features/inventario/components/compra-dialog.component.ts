import { Component, computed, effect, inject, input, model, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { MessageService } from 'primeng/api';
import { FuentePago, MetodoPago } from '../models/movimiento-inventario.model';
import { Producto } from '../models/producto.model';
import { InventarioService } from '../services/inventario.service';

@Component({
  selector: 'app-compra-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, DialogModule, ButtonModule],
  templateUrl: './compra-dialog.component.html',
  styleUrl: './compra-dialog.component.scss',
})
export class CompraDialogComponent {
  private fb = inject(FormBuilder);
  private inventarioService = inject(InventarioService);
  private messageService = inject(MessageService);

  readonly visible = model(false);
  readonly productos = input<Producto[]>([]);
  readonly productoFijo = input<Producto | null>(null);

  readonly cargando = signal(false);
  readonly errorMensaje = signal('');
  readonly fuentePago = signal<FuentePago>('EFECTIVO_CAJA');
  readonly moneda = signal<MetodoPago | null>(null);

  readonly requiereMoneda = computed(() => this.fuentePago() === 'FONDO_GENERAL');

  readonly form = this.fb.nonNullable.group({
    productoId: ['', Validators.required],
    cantidad: ['', [Validators.required, Validators.pattern(/^[1-9]\d*$/)]],
    costoUnitario: ['', [Validators.required, Validators.pattern(/^\d+(\.\d{1,2})?$/)]],
  });

  constructor() {
    effect(() => {
      if (!this.visible()) {
        return;
      }
      this.errorMensaje.set('');
      this.fuentePago.set('EFECTIVO_CAJA');
      this.moneda.set(null);
      const fijo = this.productoFijo();
      this.form.reset({
        productoId: fijo?.id ?? '',
        cantidad: '',
        costoUnitario: '',
      });
    });
  }

  elegirCaja(): void {
    this.fuentePago.set('EFECTIVO_CAJA');
    this.moneda.set(null);
  }

  elegirFondo(): void {
    this.fuentePago.set('FONDO_GENERAL');
  }

  elegirEfectivo(): void {
    this.moneda.set('EFECTIVO');
  }

  elegirTransferencia(): void {
    this.moneda.set('TRANSFERENCIA');
  }

  // Plain method (not computed()) so it re-evaluates on every change-detection
  // cycle — needed because it mixes reactive-forms validity (not signal-based)
  // with signals, and computed() would cache a stale value across that mix.
  bloqueado(): boolean {
    return this.form.invalid || (this.requiereMoneda() && this.moneda() === null);
  }

  cerrar(): void {
    this.visible.set(false);
  }

  guardar(): void {
    if (this.bloqueado()) {
      this.form.markAllAsTouched();
      return;
    }

    this.cargando.set(true);
    this.errorMensaje.set('');
    const { productoId, cantidad, costoUnitario } = this.form.getRawValue();

    this.inventarioService
      .registrarCompra({
        productoId,
        cantidad: Number(cantidad),
        costoUnitario: Number(costoUnitario),
        fuentePago: this.fuentePago(),
        ...(this.requiereMoneda() ? { moneda: this.moneda()! } : {}),
      })
      .subscribe({
        next: () => {
          this.cargando.set(false);
          this.messageService.add({ severity: 'success', summary: 'Compra registrada' });
          this.visible.set(false);
        },
        error: (err: HttpErrorResponse) => {
          this.cargando.set(false);
          this.errorMensaje.set(
            err.status === 409
              ? 'No hay una caja abierta para registrar esta compra.'
              : 'No se pudo registrar la compra. Intenta de nuevo.',
          );
        },
      });
  }
}
