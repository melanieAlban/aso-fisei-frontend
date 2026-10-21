import { Component, effect, inject, input, model, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { MessageService } from 'primeng/api';
import { AsignacionEntradas, CARRERAS_FISEI, TipoEntrada } from '../models/evento.model';
import { EventosService } from '../services/eventos.service';
import { aCentavosDinero, redondearDinero } from '../../../shared/utils/dinero.util';

type ModoPago = 'EFECTIVO' | 'TRANSFERENCIA' | 'MIXTO';

@Component({
  selector: 'app-actualizar-asignacion-dialog',
  standalone: true,
  imports: [DecimalPipe, ReactiveFormsModule, DialogModule, ButtonModule],
  templateUrl: './actualizar-asignacion-dialog.component.html',
  styleUrl: './actualizar-asignacion-dialog.component.scss',
})
export class ActualizarAsignacionDialogComponent {
  private fb = inject(FormBuilder);
  private eventosService = inject(EventosService);
  private messageService = inject(MessageService);

  readonly visible = model(false);
  readonly asignacion = input<AsignacionEntradas | null>(null);
  readonly tipoEntrada = input<TipoEntrada | null>(null);
  readonly carreras = CARRERAS_FISEI;

  readonly cargando = signal(false);
  readonly errorMensaje = signal('');
  readonly modoPago = signal<ModoPago>('EFECTIVO');
  readonly montoEfectivoMixto = signal('');
  readonly montoTransferenciaMixto = signal('');

  readonly tieneCombo = () => !!(this.tipoEntrada()?.precioCombo && this.tipoEntrada()?.cantidadCombo);

  readonly form = this.fb.nonNullable.group({
    nombreReferencia: ['', Validators.required],
    telefono: [''],
    semestre: [''],
    carrera: [''],
    cantidadAsignada: ['0', [Validators.required, Validators.pattern(/^[1-9]\d*$/)]],
    cantidadVendidaIndividual: ['0', [Validators.required, Validators.pattern(/^\d+$/)]],
    cantidadCombosVendidos: ['0', [Validators.pattern(/^\d+$/)]],
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
      const tipo = this.tipoEntrada();
      // metodoPago null + dinero recibido > 0 significa pago mixto (ver
      // montoEfectivo/montoTransferencia); si no hay nada recibido se deja
      // Efectivo por defecto.
      if (a && a.metodoPago === null && a.dineroRecibido > 0) {
        this.modoPago.set('MIXTO');
        this.montoEfectivoMixto.set(a.montoEfectivo ? String(a.montoEfectivo) : '');
        this.montoTransferenciaMixto.set(a.montoTransferencia ? String(a.montoTransferencia) : '');
      } else {
        this.modoPago.set(a?.metodoPago ?? 'EFECTIVO');
        this.montoEfectivoMixto.set('');
        this.montoTransferenciaMixto.set('');
      }
      // cantidadVendidaCombo viaja en entradas (consistente con cantidadAsignada/
      // cantidadVendida); acá se convierte a combos para que el campo sea lo que
      // el vendedor realmente contó.
      const vendidaComboEntradas = a?.cantidadVendidaCombo ?? 0;
      const combosVendidos = tipo?.cantidadCombo ? Math.round(vendidaComboEntradas / tipo.cantidadCombo) : 0;
      const vendidaIndividual = (a?.cantidadVendida ?? 0) - vendidaComboEntradas;
      this.form.reset({
        nombreReferencia: a?.nombreReferencia ?? '',
        telefono: a?.telefono ?? '',
        semestre: a?.semestre ?? '',
        carrera: a?.carrera ?? '',
        cantidadAsignada: String(a?.cantidadAsignada ?? 0),
        cantidadVendidaIndividual: String(vendidaIndividual),
        cantidadCombosVendidos: String(combosVendidos),
        cantidadDevuelta: String(a?.cantidadDevuelta ?? 0),
        dineroRecibido: a?.dineroRecibido ? String(a.dineroRecibido) : '0',
      });
    });
  }

  // Plain method (no computed()) — lee valores de reactive-forms, que no son
  // signals, junto con el signal tipoEntrada().
  entradasDeCombo(): number {
    const tipo = this.tipoEntrada();
    const combos = Number(this.form.getRawValue().cantidadCombosVendidos) || 0;
    return tipo?.cantidadCombo ? combos * tipo.cantidadCombo : 0;
  }

  dineroSugerido(): number {
    const tipo = this.tipoEntrada();
    if (!tipo) return 0;
    const { cantidadVendidaIndividual, cantidadCombosVendidos } = this.form.getRawValue();
    const individual = Number(cantidadVendidaIndividual) || 0;
    const combos = Number(cantidadCombosVendidos) || 0;
    const totalIndividual = individual * tipo.precio;
    const totalCombo = tipo.precioCombo ? combos * tipo.precioCombo : 0;
    return redondearDinero(totalIndividual + totalCombo);
  }

  usarSugerido(): void {
    this.form.controls.dineroRecibido.setValue(this.dineroSugerido().toFixed(2));
  }

  // Montos que realmente se registrarán, según el modo de pago elegido.
  montosPago(): { montoEfectivo: number; montoTransferencia: number } {
    const dinero = Number(this.form.controls.dineroRecibido.value) || 0;
    switch (this.modoPago()) {
      case 'EFECTIVO':
        return { montoEfectivo: dinero, montoTransferencia: 0 };
      case 'TRANSFERENCIA':
        return { montoEfectivo: 0, montoTransferencia: dinero };
      case 'MIXTO':
        return {
          montoEfectivo: Number(this.montoEfectivoMixto()) || 0,
          montoTransferencia: Number(this.montoTransferenciaMixto()) || 0,
        };
    }
  }

  bloqueado(): boolean {
    if (this.form.invalid || this.cargando()) return true;
    const dinero = Number(this.form.controls.dineroRecibido.value) || 0;
    if (dinero === 0 || this.modoPago() !== 'MIXTO') return false;
    const { montoEfectivo, montoTransferencia } = this.montosPago();
    return aCentavosDinero(montoEfectivo) + aCentavosDinero(montoTransferencia) !== aCentavosDinero(dinero);
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
    const a = this.asignacion();
    if (this.bloqueado() || !a) {
      this.form.markAllAsTouched();
      return;
    }

    this.cargando.set(true);
    this.errorMensaje.set('');
    const {
      nombreReferencia,
      telefono,
      semestre,
      carrera,
      cantidadAsignada,
      cantidadVendidaIndividual,
      cantidadCombosVendidos,
      cantidadDevuelta,
      dineroRecibido,
    } = this.form.getRawValue();
    const dinero = Number(dineroRecibido);
    const tipo = this.tipoEntrada();
    const combosVendidos = Number(cantidadCombosVendidos) || 0;
    const vendidaComboEntradas = tipo?.cantidadCombo ? combosVendidos * tipo.cantidadCombo : 0;
    const cantidadVendida = (Number(cantidadVendidaIndividual) || 0) + vendidaComboEntradas;

    this.eventosService
      .actualizarAsignacion(a.id, {
        nombreReferencia,
        telefono: telefono.trim() || null,
        semestre: semestre.trim() || null,
        carrera: carrera.trim() || null,
        cantidadAsignada: Number(cantidadAsignada),
        cantidadVendida,
        cantidadVendidaCombo: vendidaComboEntradas,
        cantidadDevuelta: Number(cantidadDevuelta),
        dineroRecibido: dinero,
        ...(dinero > 0 ? this.montosPago() : {}),
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
