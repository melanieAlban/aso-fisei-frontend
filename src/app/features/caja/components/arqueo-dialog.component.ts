import { Component, effect, inject, input, model, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { MessageService } from 'primeng/api';
import { ArqueoCaja, Caja, ClasificacionDiferencia } from '../models/caja.model';
import { CajaService } from '../services/caja.service';
import { redondearDinero } from '../../../shared/utils/dinero.util';

const NUM_PATTERN = /^\d+(\.\d{1,2})?$/;

@Component({
  selector: 'app-arqueo-dialog',
  standalone: true,
  imports: [DecimalPipe, ReactiveFormsModule, DialogModule, ButtonModule],
  templateUrl: './arqueo-dialog.component.html',
  styleUrl: './arqueo-dialog.component.scss',
})
export class ArqueoDialogComponent {
  private fb = inject(FormBuilder);
  private cajaService = inject(CajaService);
  private messageService = inject(MessageService);

  readonly visible = model(false);
  readonly caja = input<Caja | null>(null);

  readonly cargando = signal(false);
  readonly errorMensaje = signal('');
  readonly resultado = signal<ArqueoCaja | null>(null);
  readonly clasificando = signal(false);

  readonly form = this.fb.nonNullable.group({
    efectivoContado: ['', [Validators.required, Validators.pattern(NUM_PATTERN)]],
    transferenciaContado: ['', [Validators.required, Validators.pattern(NUM_PATTERN)]],
    montoRetiradoEfectivo: ['0', [Validators.required, Validators.pattern(NUM_PATTERN)]],
    montoRetiradoTransferencia: ['0', [Validators.required, Validators.pattern(NUM_PATTERN)]],
  });

  constructor() {
    effect(() => {
      if (!this.visible()) {
        return;
      }
      this.errorMensaje.set('');
      this.resultado.set(null);
      this.form.reset({
        efectivoContado: '',
        transferenciaContado: '',
        montoRetiradoEfectivo: '0',
        montoRetiradoTransferencia: '0',
      });
    });
  }

  // Plain methods (not computed()) so they re-evaluate on every change-detection
  // cycle — needed because they read reactive-forms values (not signal-based).
  fondoCambio(): number {
    const { efectivoContado, montoRetiradoEfectivo } = this.form.getRawValue();
    const ec = parseFloat(efectivoContado) || 0;
    const re = parseFloat(montoRetiradoEfectivo) || 0;
    return Math.max(0, redondearDinero(ec - re));
  }

  retiroExcedeEfectivo(): boolean {
    const { efectivoContado, montoRetiradoEfectivo } = this.form.getRawValue();
    const ec = parseFloat(efectivoContado) || 0;
    const re = parseFloat(montoRetiradoEfectivo) || 0;
    return re > ec + 0.005;
  }

  bloqueado(): boolean {
    return this.form.invalid || this.retiroExcedeEfectivo();
  }

  diferenciaEfectivo(): number {
    const r = this.resultado();
    return r ? redondearDinero(r.efectivoEsperado - r.efectivoContado) : 0;
  }

  diferenciaTransferencia(): number {
    const r = this.resultado();
    return r ? redondearDinero(r.transferenciaEsperado - r.transferenciaContado) : 0;
  }

  cerrar(): void {
    this.visible.set(false);
  }

  guardar(): void {
    const caja = this.caja();
    if (this.bloqueado() || !caja) {
      this.form.markAllAsTouched();
      return;
    }

    this.cargando.set(true);
    this.errorMensaje.set('');
    const { efectivoContado, transferenciaContado, montoRetiradoEfectivo, montoRetiradoTransferencia } =
      this.form.getRawValue();

    this.cajaService
      .realizarArqueo(caja.id, {
        efectivoContado: Number(efectivoContado),
        transferenciaContado: Number(transferenciaContado),
        montoRetiradoEfectivo: Number(montoRetiradoEfectivo),
        montoRetiradoTransferencia: Number(montoRetiradoTransferencia),
        montoDejadoFondoCambio: this.fondoCambio(),
      })
      .subscribe({
        next: (respuesta) => {
          this.cargando.set(false);
          this.resultado.set(respuesta.data);
          this.messageService.add({ severity: 'success', summary: 'Arqueo cerrado' });
        },
        error: (err: HttpErrorResponse) => {
          this.cargando.set(false);
          this.errorMensaje.set(
            err.status === 409
              ? 'La caja ya se encuentra cerrada.'
              : 'No se pudo cerrar el arqueo. Intenta de nuevo.',
          );
        },
      });
  }

  clasificar(clasificacion: ClasificacionDiferencia): void {
    const r = this.resultado();
    if (!r) return;
    this.clasificando.set(true);
    this.cajaService.clasificarDiferencia(r.id, clasificacion).subscribe({
      next: (respuesta) => {
        this.clasificando.set(false);
        this.resultado.set(respuesta.data);
      },
      error: () => {
        this.clasificando.set(false);
        this.messageService.add({ severity: 'error', summary: 'No se pudo clasificar la diferencia' });
      },
    });
  }
}
