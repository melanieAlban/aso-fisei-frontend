import { Component, effect, inject, model, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { MessageService } from 'primeng/api';
import { FondoGeneralService } from '../services/fondo-general.service';

const NUM_PATTERN = /^-?\d+(\.\d{1,2})?$/;

@Component({
  selector: 'app-ajuste-saldo-inicial-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, DialogModule, InputTextModule, ButtonModule],
  templateUrl: './ajuste-saldo-inicial-dialog.component.html',
  styleUrl: './ajuste-saldo-inicial-dialog.component.scss',
})
export class AjusteSaldoInicialDialogComponent {
  private fb = inject(FormBuilder);
  private fondoGeneralService = inject(FondoGeneralService);
  private messageService = inject(MessageService);

  readonly visible = model(false);

  readonly cargando = signal(false);
  readonly errorMensaje = signal('');

  readonly form = this.fb.nonNullable.group({
    montoEfectivo: ['0', [Validators.required, Validators.pattern(NUM_PATTERN)]],
    montoTransferencia: ['0', [Validators.required, Validators.pattern(NUM_PATTERN)]],
    justificacion: ['', Validators.required],
  });

  constructor() {
    effect(() => {
      if (!this.visible()) {
        return;
      }
      this.errorMensaje.set('');
      this.form.reset({ montoEfectivo: '0', montoTransferencia: '0', justificacion: '' });
    });
  }

  bloqueado(): boolean {
    const { montoEfectivo, montoTransferencia } = this.form.getRawValue();
    const ambosCero = (parseFloat(montoEfectivo) || 0) === 0 && (parseFloat(montoTransferencia) || 0) === 0;
    return this.form.invalid || ambosCero;
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
    const { montoEfectivo, montoTransferencia, justificacion } = this.form.getRawValue();

    this.fondoGeneralService
      .ajustarSaldoInicial({
        montoEfectivo: Number(montoEfectivo),
        montoTransferencia: Number(montoTransferencia),
        justificacion,
      })
      .subscribe({
        next: () => {
          this.cargando.set(false);
          this.messageService.add({ severity: 'success', summary: 'Ajuste guardado' });
          this.visible.set(false);
        },
        error: () => {
          this.cargando.set(false);
          this.errorMensaje.set('No se pudo guardar el ajuste. Intenta de nuevo.');
        },
      });
  }
}
