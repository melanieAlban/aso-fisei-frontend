import { Component, computed, effect, inject, input, model, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { MessageService } from 'primeng/api';
import { TipoDeuda } from '../models/deuda.model';
import { DeudasService } from '../services/deudas.service';

@Component({
  selector: 'app-deuda-form-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, DialogModule, ButtonModule],
  templateUrl: './deuda-form-dialog.component.html',
  styleUrl: './deuda-form-dialog.component.scss',
})
export class DeudaFormDialogComponent {
  private fb = inject(FormBuilder);
  private deudasService = inject(DeudasService);
  private messageService = inject(MessageService);

  readonly visible = model(false);
  readonly tipoInicial = input<TipoDeuda>('POR_COBRAR');

  readonly cargando = signal(false);
  readonly errorMensaje = signal('');
  readonly tipo = signal<TipoDeuda>('POR_COBRAR');

  readonly form = this.fb.nonNullable.group({
    contraparte: ['', Validators.required],
    montoTotal: ['', [Validators.required, Validators.pattern(/^\d+(\.\d{1,2})?$/)]],
  });

  readonly etiquetaContraparte = computed(() =>
    this.tipo() === 'POR_COBRAR' ? 'Deudor' : 'Acreedor',
  );

  constructor() {
    effect(() => {
      if (!this.visible()) {
        return;
      }
      this.errorMensaje.set('');
      this.tipo.set(this.tipoInicial());
      this.form.reset({ contraparte: '', montoTotal: '' });
    });
  }

  elegirCobrar(): void {
    this.tipo.set('POR_COBRAR');
  }

  elegirPagar(): void {
    this.tipo.set('POR_PAGAR');
  }

  cerrar(): void {
    this.visible.set(false);
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.cargando.set(true);
    this.errorMensaje.set('');
    const { contraparte, montoTotal } = this.form.getRawValue();

    this.deudasService
      .crearDeuda({ tipo: this.tipo(), contraparte, montoTotal: Number(montoTotal) })
      .subscribe({
        next: () => {
          this.cargando.set(false);
          this.messageService.add({ severity: 'success', summary: 'Deuda registrada' });
          this.visible.set(false);
        },
        error: (err: HttpErrorResponse) => {
          this.cargando.set(false);
          this.errorMensaje.set(
            err.error?.error?.message ?? 'No se pudo registrar la deuda. Intenta de nuevo.',
          );
        },
      });
  }
}
