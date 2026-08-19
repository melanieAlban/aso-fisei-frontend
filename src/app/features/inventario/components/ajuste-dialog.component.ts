import { Component, effect, inject, input, model, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { MessageService } from 'primeng/api';
import { DireccionAjuste } from '../models/movimiento-inventario.model';
import { Producto } from '../models/producto.model';
import { InventarioService } from '../services/inventario.service';

@Component({
  selector: 'app-ajuste-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, DialogModule, InputTextModule, ButtonModule],
  templateUrl: './ajuste-dialog.component.html',
  styleUrl: './ajuste-dialog.component.scss',
})
export class AjusteDialogComponent {
  private fb = inject(FormBuilder);
  private inventarioService = inject(InventarioService);
  private messageService = inject(MessageService);

  readonly visible = model(false);
  readonly productos = input<Producto[]>([]);
  readonly productoFijo = input<Producto | null>(null);

  readonly cargando = signal(false);
  readonly errorMensaje = signal('');
  readonly direccion = signal<DireccionAjuste>('INCREMENTO');

  readonly form = this.fb.nonNullable.group({
    productoId: ['', Validators.required],
    cantidad: ['', [Validators.required, Validators.pattern(/^[1-9]\d*$/)]],
    motivo: [''],
  });

  constructor() {
    effect(() => {
      if (!this.visible()) {
        return;
      }
      this.errorMensaje.set('');
      this.direccion.set('INCREMENTO');
      const fijo = this.productoFijo();
      this.form.reset({
        productoId: fijo?.id ?? '',
        cantidad: '',
        motivo: '',
      });
    });
  }

  elegirIncremento(): void {
    this.direccion.set('INCREMENTO');
  }

  elegirDecremento(): void {
    this.direccion.set('DECREMENTO');
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
      .registrarAjuste({
        productoId,
        cantidad: Number(cantidad),
        direccion: this.direccion(),
        ...(motivo.trim() ? { motivo: motivo.trim() } : {}),
      })
      .subscribe({
        next: () => {
          this.cargando.set(false);
          this.messageService.add({ severity: 'success', summary: 'Ajuste guardado' });
          this.visible.set(false);
        },
        error: (err: HttpErrorResponse) => {
          this.cargando.set(false);
          this.errorMensaje.set(
            err.status === 409
              ? 'Stock insuficiente para registrar este ajuste.'
              : 'No se pudo registrar el ajuste. Intenta de nuevo.',
          );
        },
      });
  }
}
