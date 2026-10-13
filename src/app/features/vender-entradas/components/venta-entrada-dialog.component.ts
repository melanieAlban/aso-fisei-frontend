import { Component, computed, effect, inject, input, model, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { MessageService } from 'primeng/api';
import { DisponibilidadTipoEntrada } from '../../eventos/models/evento.model';
import { EventosService } from '../../eventos/services/eventos.service';
import { aCentavosDinero, redondearDinero } from '../../../shared/utils/dinero.util';

type ModoPago = 'EFECTIVO' | 'TRANSFERENCIA' | 'MIXTO';

@Component({
  selector: 'app-venta-entrada-dialog',
  standalone: true,
  imports: [DecimalPipe, ReactiveFormsModule, DialogModule, ButtonModule],
  templateUrl: './venta-entrada-dialog.component.html',
  styleUrl: './venta-entrada-dialog.component.scss',
})
export class VentaEntradaDialogComponent {
  private fb = inject(FormBuilder);
  private eventosService = inject(EventosService);
  private messageService = inject(MessageService);

  readonly visible = model(false);
  readonly eventoId = input<string>('');
  readonly item = input<DisponibilidadTipoEntrada | null>(null);

  readonly cargando = signal(false);
  readonly errorMensaje = signal('');
  readonly esCombo = signal(false);
  readonly modoPago = signal<ModoPago>('EFECTIVO');
  readonly montoEfectivoMixto = signal('');
  readonly montoTransferenciaMixto = signal('');

  readonly tieneCombo = computed(() => {
    const t = this.item()?.tipoEntrada;
    return !!(t?.precioCombo && t?.cantidadCombo);
  });

  readonly form = this.fb.nonNullable.group({
    cantidad: ['1', [Validators.required, Validators.pattern(/^[1-9]\d*$/)]],
  });

  // Metodos planos (no computed()) — leen form.controls.cantidad.value, que no
  // es una signal, asi que un computed() no se vuelve a evaluar al escribir.
  montoSugerido(): number {
    const t = this.item()?.tipoEntrada;
    if (!t) return 0;
    const cantidad = Number(this.form.controls.cantidad.value) || 0;
    const precio = this.esCombo() ? (t.precioCombo ?? 0) : t.precio;
    return redondearDinero(cantidad * precio);
  }

  entradasResultantes(): number {
    const t = this.item()?.tipoEntrada;
    if (!t) return 0;
    const cantidad = Number(this.form.controls.cantidad.value) || 0;
    return this.esCombo() ? cantidad * (t.cantidadCombo ?? 0) : cantidad;
  }

  // Montos que realmente se registrarán, según el modo de pago elegido.
  montosPago(): { montoEfectivo: number; montoTransferencia: number } {
    const total = this.montoSugerido();
    switch (this.modoPago()) {
      case 'EFECTIVO':
        return { montoEfectivo: total, montoTransferencia: 0 };
      case 'TRANSFERENCIA':
        return { montoEfectivo: 0, montoTransferencia: total };
      case 'MIXTO':
        return {
          montoEfectivo: parseFloat(this.montoEfectivoMixto()) || 0,
          montoTransferencia: parseFloat(this.montoTransferenciaMixto()) || 0,
        };
    }
  }

  bloqueado(): boolean {
    if (this.form.invalid || this.cargando()) return true;
    if (this.modoPago() !== 'MIXTO') return false;
    const { montoEfectivo, montoTransferencia } = this.montosPago();
    return aCentavosDinero(montoEfectivo) + aCentavosDinero(montoTransferencia) !== aCentavosDinero(this.montoSugerido());
  }

  constructor() {
    effect(() => {
      if (!this.visible()) {
        return;
      }
      this.errorMensaje.set('');
      this.esCombo.set(false);
      this.modoPago.set('EFECTIVO');
      this.montoEfectivoMixto.set('');
      this.montoTransferenciaMixto.set('');
      this.form.reset({ cantidad: '1' });
    });
  }

  elegirIndividual(): void {
    this.esCombo.set(false);
  }

  elegirCombo(): void {
    this.esCombo.set(true);
  }

  elegirEfectivo(): void {
    this.modoPago.set('EFECTIVO');
  }

  elegirTransferencia(): void {
    this.modoPago.set('TRANSFERENCIA');
  }

  elegirMixto(): void {
    this.modoPago.set('MIXTO');
  }

  cerrar(): void {
    this.visible.set(false);
  }

  guardar(): void {
    const item = this.item();
    if (this.bloqueado() || !item) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.entradasResultantes() > item.cantidadDisponible) {
      this.errorMensaje.set(`Solo quedan ${item.cantidadDisponible} entrada(s) disponible(s).`);
      return;
    }

    this.cargando.set(true);
    this.errorMensaje.set('');
    const { cantidad } = this.form.getRawValue();

    this.eventosService
      .registrarVentaEntrada(this.eventoId(), item.tipoEntrada.id, {
        cantidad: Number(cantidad),
        esCombo: this.esCombo(),
        ...this.montosPago(),
      })
      .subscribe({
        next: () => {
          this.cargando.set(false);
          this.messageService.add({ severity: 'success', summary: 'Venta registrada' });
          this.visible.set(false);
        },
        error: (err: HttpErrorResponse) => {
          this.cargando.set(false);
          this.errorMensaje.set(
            err.error?.error?.message ?? 'No se pudo registrar la venta. Intenta de nuevo.',
          );
        },
      });
  }
}
