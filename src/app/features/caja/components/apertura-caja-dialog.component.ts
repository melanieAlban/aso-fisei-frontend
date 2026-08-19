import { Component, effect, inject, model, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { MessageService } from 'primeng/api';
import { CajaService } from '../services/caja.service';

@Component({
  selector: 'app-apertura-caja-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, DialogModule, ButtonModule],
  templateUrl: './apertura-caja-dialog.component.html',
  styleUrl: './apertura-caja-dialog.component.scss',
})
export class AperturaCajaDialogComponent {
  private fb = inject(FormBuilder);
  private cajaService = inject(CajaService);
  private messageService = inject(MessageService);

  readonly visible = model(false);

  readonly cargando = signal(false);
  readonly errorMensaje = signal('');

  readonly montosRapidos = [40, 50, 80, 100];

  readonly form = this.fb.nonNullable.group({
    fondoInicialEfectivo: ['', [Validators.required, Validators.pattern(/^\d+(\.\d{1,2})?$/)]],
  });

  constructor() {
    effect(() => {
      if (!this.visible()) {
        return;
      }
      this.errorMensaje.set('');
      this.form.reset({ fondoInicialEfectivo: '' });
    });
  }

  elegirMonto(valor: number): void {
    this.form.patchValue({ fondoInicialEfectivo: String(valor) });
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
    const { fondoInicialEfectivo } = this.form.getRawValue();

    this.cajaService.abrirCaja(Number(fondoInicialEfectivo)).subscribe({
      next: () => {
        this.cargando.set(false);
        this.messageService.add({ severity: 'success', summary: 'Caja abierta' });
        this.visible.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.cargando.set(false);
        this.errorMensaje.set(
          err.status === 409
            ? 'Ya existe una caja abierta.'
            : 'No se pudo abrir la caja. Intenta de nuevo.',
        );
      },
    });
  }
}
