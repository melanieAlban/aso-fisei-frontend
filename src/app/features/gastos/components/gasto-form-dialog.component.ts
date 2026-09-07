import { Component, computed, effect, inject, input, model, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { MessageService } from 'primeng/api';
import { FuentePago } from '../models/gasto.model';
import { GastosService } from '../services/gastos.service';
import { aCentavosDinero } from '../../../shared/utils/dinero.util';

type ModoMoneda = 'EFECTIVO' | 'TRANSFERENCIA' | 'MIXTO';

@Component({
  selector: 'app-gasto-form-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, DialogModule, ButtonModule],
  templateUrl: './gasto-form-dialog.component.html',
  styleUrl: './gasto-form-dialog.component.scss',
})
export class GastoFormDialogComponent {
  private fb = inject(FormBuilder);
  private gastosService = inject(GastosService);
  private messageService = inject(MessageService);

  readonly visible = model(false);
  readonly categoriasDisponibles = input<string[]>([]);

  readonly cargando = signal(false);
  readonly errorMensaje = signal('');
  readonly fuentePago = signal<FuentePago>('EFECTIVO_CAJA');
  readonly modoMoneda = signal<ModoMoneda | null>(null);
  readonly sugerenciasVisibles = signal(false);

  readonly requiereMoneda = computed(() => this.fuentePago() === 'FONDO_GENERAL');

  readonly form = this.fb.nonNullable.group({
    descripcion: ['', Validators.required],
    monto: ['', [Validators.required, Validators.pattern(/^\d+(\.\d{1,2})?$/)]],
    categoria: ['', Validators.required],
    montoEfectivoFondo: ['', [Validators.pattern(/^\d+(\.\d{1,2})?$/)]],
    montoTransferenciaFondo: ['', [Validators.pattern(/^\d+(\.\d{1,2})?$/)]],
  });

  readonly sugerencias = computed(() => {
    const q = this.form.controls.categoria.value.trim().toLowerCase();
    const disponibles = this.categoriasDisponibles();
    if (!q) return disponibles.slice(0, 6);
    return disponibles.filter((c) => c.toLowerCase().includes(q)).slice(0, 6);
  });

  constructor() {
    effect(() => {
      if (!this.visible()) {
        return;
      }
      this.errorMensaje.set('');
      this.fuentePago.set('EFECTIVO_CAJA');
      this.modoMoneda.set(null);
      this.form.reset({
        descripcion: '',
        monto: '',
        categoria: '',
        montoEfectivoFondo: '',
        montoTransferenciaFondo: '',
      });
    });
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

  seleccionarCategoria(categoria: string): void {
    this.form.controls.categoria.setValue(categoria);
    this.sugerenciasVisibles.set(false);
  }


  // Montos que realmente se enviarán, según el modo de moneda elegido.
  private montosFondo(): { montoEfectivoFondo: number; montoTransferenciaFondo: number } {
    const monto = Number(this.form.controls.monto.value) || 0;
    switch (this.modoMoneda()) {
      case 'EFECTIVO':
        return { montoEfectivoFondo: monto, montoTransferenciaFondo: 0 };
      case 'TRANSFERENCIA':
        return { montoEfectivoFondo: 0, montoTransferenciaFondo: monto };
      case 'MIXTO':
        return {
          montoEfectivoFondo: Number(this.form.controls.montoEfectivoFondo.value) || 0,
          montoTransferenciaFondo: Number(this.form.controls.montoTransferenciaFondo.value) || 0,
        };
      default:
        return { montoEfectivoFondo: 0, montoTransferenciaFondo: 0 };
    }
  }

  // Plain method (not computed()) so it re-evaluates on every change-detection
  // cycle — mixes reactive-forms validity (not signal-based) with signals.
  bloqueado(): boolean {
    if (this.form.invalid) return true;
    if (!this.requiereMoneda()) return false;
    if (this.modoMoneda() === null) return true;
    if (this.modoMoneda() === 'MIXTO') {
      const monto = Number(this.form.controls.monto.value) || 0;
      const { montoEfectivoFondo, montoTransferenciaFondo } = this.montosFondo();
      return aCentavosDinero(montoEfectivoFondo) + aCentavosDinero(montoTransferenciaFondo) !== aCentavosDinero(monto);
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
    const { descripcion, monto, categoria } = this.form.getRawValue();

    this.gastosService
      .registrarGasto({
        descripcion,
        monto: Number(monto),
        categoria,
        fuentePago: this.fuentePago(),
        ...(this.requiereMoneda() ? this.montosFondo() : {}),
      })
      .subscribe({
        next: () => {
          this.cargando.set(false);
          this.messageService.add({ severity: 'success', summary: 'Gasto registrado' });
          this.visible.set(false);
        },
        error: (err: HttpErrorResponse) => {
          this.cargando.set(false);
          this.errorMensaje.set(
            err.error?.error?.message ?? 'No se pudo registrar el gasto. Intenta de nuevo.',
          );
        },
      });
  }
}
