import { Component, effect, inject, input, model, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { MessageService } from 'primeng/api';
import { EventosService } from '../services/eventos.service';

@Component({
  selector: 'app-compromiso-pago-form-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, DialogModule, ButtonModule],
  templateUrl: './compromiso-pago-form-dialog.component.html',
  styleUrl: './compromiso-pago-form-dialog.component.scss',
})
export class CompromisoPagoFormDialogComponent {
  private fb = inject(FormBuilder);
  private eventosService = inject(EventosService);
  private messageService = inject(MessageService);

  readonly visible = model(false);
  readonly eventoId = input<string>('');

  readonly cargando = signal(false);
  readonly errorMensaje = signal('');

  readonly form = this.fb.nonNullable.group({
    descripcion: ['', Validators.required],
    montoTotal: ['', [Validators.required, Validators.pattern(/^\d+(\.\d{1,2})?$/)]],
    montoPagadoInicial: ['0', [Validators.pattern(/^\d+(\.\d{1,2})?$/)]],
  });

  constructor() {
    effect(() => {
      if (!this.visible()) {
        return;
      }
      this.errorMensaje.set('');
      this.form.reset({ descripcion: '', montoTotal: '', montoPagadoInicial: '0' });
    });
  }

  cerrar(): void {
    this.visible.set(false);
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { descripcion, montoTotal, montoPagadoInicial } = this.form.getRawValue();
    const pagadoInicial = Number(montoPagadoInicial) || 0;

    if (pagadoInicial > Number(montoTotal)) {
      this.errorMensaje.set('Lo ya pagado no puede ser mayor al total.');
      return;
    }

    this.cargando.set(true);
    this.errorMensaje.set('');

    this.eventosService
      .crearCompromisoPago(this.eventoId(), {
        descripcion,
        montoTotal: Number(montoTotal),
        montoPagadoInicial: pagadoInicial,
      })
      .subscribe({
        next: () => {
          this.cargando.set(false);
          this.messageService.add({ severity: 'success', summary: 'Compromiso de pago creado' });
          this.visible.set(false);
        },
        error: (err: HttpErrorResponse) => {
          this.cargando.set(false);
          this.errorMensaje.set(
            err.error?.error?.message ?? 'No se pudo crear el compromiso. Intenta de nuevo.',
          );
        },
      });
  }
}
