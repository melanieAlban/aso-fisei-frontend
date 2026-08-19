import { Component, effect, inject, input, model, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { MessageService } from 'primeng/api';
import { VentasService } from '../services/ventas.service';

@Component({
  selector: 'app-anular-item-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, DialogModule, InputTextModule, ButtonModule],
  templateUrl: './anular-item-dialog.component.html',
  styleUrl: './anular-item-dialog.component.scss',
})
export class AnularItemDialogComponent {
  private fb = inject(FormBuilder);
  private ventasService = inject(VentasService);
  private messageService = inject(MessageService);

  readonly visible = model(false);
  readonly ventaId = input<string>('');
  readonly itemId = input<string>('');
  readonly nombreProducto = input<string>('');

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

    this.ventasService.anularItem(this.ventaId(), this.itemId(), motivo).subscribe({
      next: () => {
        this.cargando.set(false);
        this.messageService.add({ severity: 'success', summary: 'Ítem anulado' });
        this.visible.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.errorMensaje.set('No se pudo anular el ítem. Intenta de nuevo.');
      },
    });
  }
}
