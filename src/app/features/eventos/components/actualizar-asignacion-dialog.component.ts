import { Component, effect, inject, input, model, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { MessageService } from 'primeng/api';
import { AsignacionEntradas, MetodoPagoEvento, TipoEntrada } from '../models/evento.model';
import { EventosService } from '../services/eventos.service';
import { redondearDinero } from '../../../shared/utils/dinero.util';

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

  readonly cargando = signal(false);
  readonly errorMensaje = signal('');
  readonly metodoPago = signal<MetodoPagoEvento>('EFECTIVO');

  readonly tieneCombo = () => !!(this.tipoEntrada()?.precioCombo && this.tipoEntrada()?.cantidadCombo);

  readonly form = this.fb.nonNullable.group({
    nombreReferencia: ['', Validators.required],
    telefono: [''],
    semestre: [''],
    carrera: [''],
    cantidadAsignada: ['0', [Validators.required, Validators.pattern(/^[1-9]\d*$/)]],
    cantidadVendidaIndividual: ['0', [Validators.required, Validators.pattern(/^\d+$/)]],
    cantidadVendidaCombo: ['0', [Validators.pattern(/^\d+$/)]],
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
      const vendidaCombo = a?.cantidadVendidaCombo ?? 0;
      const vendidaIndividual = (a?.cantidadVendida ?? 0) - vendidaCombo;
      this.form.reset({
        nombreReferencia: a?.nombreReferencia ?? '',
        telefono: a?.telefono ?? '',
        semestre: a?.semestre ?? '',
        carrera: a?.carrera ?? '',
        cantidadAsignada: String(a?.cantidadAsignada ?? 0),
        cantidadVendidaIndividual: String(vendidaIndividual),
        cantidadVendidaCombo: String(vendidaCombo),
        cantidadDevuelta: String(a?.cantidadDevuelta ?? 0),
        dineroRecibido: a?.dineroRecibido ? String(a.dineroRecibido) : '0',
      });
    });
  }

  // Plain method (no computed()) — lee valores de reactive-forms, que no son
  // signals, junto con el signal tipoEntrada().
  dineroSugerido(): number {
    const tipo = this.tipoEntrada();
    if (!tipo) return 0;
    const { cantidadVendidaIndividual, cantidadVendidaCombo } = this.form.getRawValue();
    const individual = Number(cantidadVendidaIndividual) || 0;
    const combo = Number(cantidadVendidaCombo) || 0;
    const totalIndividual = individual * tipo.precio;
    const totalCombo = tipo.precioCombo && tipo.cantidadCombo ? (combo / tipo.cantidadCombo) * tipo.precioCombo : 0;
    return redondearDinero(totalIndividual + totalCombo);
  }

  usarSugerido(): void {
    this.form.controls.dineroRecibido.setValue(this.dineroSugerido().toFixed(2));
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
    const {
      nombreReferencia,
      telefono,
      semestre,
      carrera,
      cantidadAsignada,
      cantidadVendidaIndividual,
      cantidadVendidaCombo,
      cantidadDevuelta,
      dineroRecibido,
    } = this.form.getRawValue();
    const dinero = Number(dineroRecibido);
    const vendidaCombo = Number(cantidadVendidaCombo) || 0;
    const cantidadVendida = (Number(cantidadVendidaIndividual) || 0) + vendidaCombo;

    this.eventosService
      .actualizarAsignacion(a.id, {
        nombreReferencia,
        telefono: telefono.trim() || null,
        semestre: semestre.trim() || null,
        carrera: carrera.trim() || null,
        cantidadAsignada: Number(cantidadAsignada),
        cantidadVendida,
        cantidadVendidaCombo: vendidaCombo,
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
