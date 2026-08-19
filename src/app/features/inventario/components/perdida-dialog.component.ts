import { Component, effect, inject, input, model, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { MessageService } from 'primeng/api';
import { Producto } from '../models/producto.model';
import { InventarioService } from '../services/inventario.service';

@Component({
  selector: 'app-perdida-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, DialogModule, InputTextModule, ButtonModule],
  templateUrl: './perdida-dialog.component.html',
  styleUrl: './perdida-dialog.component.scss',
})
export class PerdidaDialogComponent {
  private fb = inject(FormBuilder);
  private inventarioService = inject(InventarioService);
  private messageService = inject(MessageService);

  readonly visible = model(false);
  readonly productos = input<Producto[]>([]);
  readonly productoFijo = input<Producto | null>(null);

  readonly cargando = signal(false);
  readonly errorMensaje = signal('');

  readonly form = this.fb.nonNullable.group({
    productoId: ['', Validators.required],
    cantidad: ['', [Validators.required, Validators.pattern(/^[1-9]\d*$/)]],
    motivo: ['', Validators.required],
  });

  constructor() {
    effect(() => {
      if (!this.visible()) {
        return;
      }
      this.errorMensaje.set('');
      const fijo = this.productoFijo();
      this.form.reset({
        productoId: fijo?.id ?? '',
        cantidad: '',
        motivo: '',
      });
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
    const { productoId, cantidad, motivo } = this.form.getRawValue();

    this.inventarioService
      .registrarPerdida({ productoId, cantidad: Number(cantidad), motivo })
      .subscribe({
        next: () => {
          this.cargando.set(false);
          this.messageService.add({ severity: 'success', summary: 'Pérdida registrada' });
          this.visible.set(false);
        },
        error: (err: HttpErrorResponse) => {
          this.cargando.set(false);
          this.errorMensaje.set(
            err.status === 409
              ? 'Stock insuficiente para registrar esta pérdida.'
              : 'No se pudo registrar la pérdida. Intenta de nuevo.',
          );
        },
      });
  }
}
