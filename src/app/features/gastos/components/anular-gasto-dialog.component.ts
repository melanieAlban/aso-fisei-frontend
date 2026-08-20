import { Component, effect, inject, input, model, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { MessageService } from 'primeng/api';
import { GastosService } from '../services/gastos.service';

@Component({
  selector: 'app-anular-gasto-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, DialogModule, InputTextModule, ButtonModule],
  templateUrl: './anular-gasto-dialog.component.html',
  styleUrl: './anular-gasto-dialog.component.scss',
})
export class AnularGastoDialogComponent {
  private fb = inject(FormBuilder);
  private gastosService = inject(GastosService);
  private messageService = inject(MessageService);

  readonly visible = model(false);
  readonly gastoId = input<string>('');
  readonly descripcionGasto = input<string>('');

  readonly cargando = signal(false);
  readonly errorMensaje = signal('');

  readonly form = this.fb.nonNullable.group({
    motivo: ['', Validators.required],
  });

  constructor() {
    effect(() => {
      if (!this.visible()) {
        return;
      }
      this.errorMensaje.set('');
      this.form.reset({ motivo: '' });
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

    this.cargando.set(true);
    this.errorMensaje.set('');
    const { motivo } = this.form.getRawValue();

    this.gastosService.anularGasto(this.gastoId(), motivo).subscribe({
      next: () => {
        this.cargando.set(false);
        this.messageService.add({ severity: 'success', summary: 'Gasto anulado' });
        this.visible.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.errorMensaje.set('No se pudo anular el gasto. Intenta de nuevo.');
      },
    });
  }
}
