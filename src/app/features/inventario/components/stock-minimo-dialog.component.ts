import { Component, effect, inject, model, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { MessageService } from 'primeng/api';
import { InventarioService } from '../services/inventario.service';

@Component({
  selector: 'app-stock-minimo-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, DialogModule, ButtonModule],
  templateUrl: './stock-minimo-dialog.component.html',
  styleUrl: './stock-minimo-dialog.component.scss',
})
export class StockMinimoDialogComponent {
  private fb = inject(FormBuilder);
  private inventarioService = inject(InventarioService);
  private messageService = inject(MessageService);

  readonly visible = model(false);

  readonly cargando = signal(false);
  readonly errorMensaje = signal('');

  readonly form = this.fb.nonNullable.group({
    valorMinimo: ['', [Validators.required, Validators.pattern(/^\d+$/)]],
  });

  constructor() {
    effect(() => {
      if (!this.visible()) {
        return;
      }
      this.errorMensaje.set('');
      this.form.reset({ valorMinimo: String(this.inventarioService.stockMinimo()) });
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
    const { valorMinimo } = this.form.getRawValue();

    this.inventarioService.actualizarStockMinimo(Number(valorMinimo)).subscribe({
      next: () => {
        this.cargando.set(false);
        this.messageService.add({ severity: 'success', summary: 'Umbral de stock mínimo actualizado' });
        this.visible.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.errorMensaje.set('No se pudo actualizar el umbral. Intenta de nuevo.');
      },
    });
  }
}
