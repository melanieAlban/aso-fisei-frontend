import { Component, effect, inject, input, model, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { MessageService } from 'primeng/api';
import { FuentePago } from '../models/movimiento-inventario.model';
import { Producto } from '../models/producto.model';
import { InventarioService } from '../services/inventario.service';

type ModoMoneda = 'EFECTIVO' | 'TRANSFERENCIA' | 'MIXTO';

@Component({
  selector: 'app-compra-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, DialogModule, ButtonModule, DecimalPipe],
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
  readonly modoMoneda = signal<ModoMoneda | null>(null);

  readonly form = this.fb.nonNullable.group({
    productoId: ['', Validators.required],
    cantidad: ['', [Validators.required, Validators.pattern(/^[1-9]\d*$/)]],
    // Opcional: se puede dejar en blanco para productos sin costo de adquisición real.
    costoUnitario: ['', [Validators.pattern(/^\d+(\.\d{1,2})?$/)]],
    montoEfectivoFondo: ['', [Validators.pattern(/^\d+(\.\d{1,2})?$/)]],
    montoTransferenciaFondo: ['', [Validators.pattern(/^\d+(\.\d{1,2})?$/)]],
  });

  constructor() {
    effect(() => {
      if (!this.visible()) {
        return;
      }
      this.errorMensaje.set('');
      this.fuentePago.set('EFECTIVO_CAJA');
      this.modoMoneda.set(null);
      const fijo = this.productoFijo();
      this.form.reset({
        productoId: fijo?.id ?? '',
        cantidad: '',
        costoUnitario: '',
        montoEfectivoFondo: '',
        montoTransferenciaFondo: '',
      });
    });
  }

  // Plain methods (not computed()) — leen form.controls.*.value, que no es un
  // signal, así que computed() los cachearía sin reevaluar en cada cambio.
  costoTotal(): number {
    const costoUnitario = Number(this.form.controls.costoUnitario.value) || 0;
    const cantidad = Number(this.form.controls.cantidad.value) || 0;
    return Math.round(costoUnitario * cantidad * 100) / 100;
  }

  requiereMoneda(): boolean {
    return this.fuentePago() === 'FONDO_GENERAL' && this.costoTotal() > 0;
  }

  elegirCaja(): void {
    this.fuentePago.set('EFECTIVO_CAJA');
    this.modoMoneda.set(null);
  }

  elegirFondo(): void {
    this.fuentePago.set('FONDO_GENERAL');
  }

  elegirEfectivo(): void {
    this.modoMoneda.set('EFECTIVO');
  }

  elegirTransferencia(): void {
    this.modoMoneda.set('TRANSFERENCIA');
  }

  elegirMixto(): void {
    this.modoMoneda.set('MIXTO');
  }

  private aCentavos(valor: number): number {
    return Math.round(valor * 100);
  }

  // Montos que realmente se enviarán, según el modo de moneda elegido.
  private montosFondo(): { montoEfectivoFondo: number; montoTransferenciaFondo: number } {
    const total = this.costoTotal();
    switch (this.modoMoneda()) {
      case 'EFECTIVO':
        return { montoEfectivoFondo: total, montoTransferenciaFondo: 0 };
      case 'TRANSFERENCIA':
        return { montoEfectivoFondo: 0, montoTransferenciaFondo: total };
      case 'MIXTO':
        return {
          montoEfectivoFondo: Number(this.form.controls.montoEfectivoFondo.value) || 0,
          montoTransferenciaFondo: Number(this.form.controls.montoTransferenciaFondo.value) || 0,
        };
      default:
        return { montoEfectivoFondo: 0, montoTransferenciaFondo: 0 };
    }
  }

  bloqueado(): boolean {
    if (this.form.invalid) return true;
    if (!this.requiereMoneda()) return false;
    if (this.modoMoneda() === null) return true;
    if (this.modoMoneda() === 'MIXTO') {
      const { montoEfectivoFondo, montoTransferenciaFondo } = this.montosFondo();
      return this.aCentavos(montoEfectivoFondo) + this.aCentavos(montoTransferenciaFondo) !== this.aCentavos(this.costoTotal());
    }
    return false;
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
        ...(costoUnitario.trim() !== '' ? { costoUnitario: Number(costoUnitario) } : {}),
        fuentePago: this.fuentePago(),
        ...(this.requiereMoneda() ? this.montosFondo() : {}),
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
