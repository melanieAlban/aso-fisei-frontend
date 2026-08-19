import { Component, computed, effect, inject, input, model, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { MessageService } from 'primeng/api';
import { Producto } from '../models/producto.model';
import { InventarioService } from '../services/inventario.service';

@Component({
  selector: 'app-producto-form-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, DialogModule, InputTextModule, ButtonModule],
  templateUrl: './producto-form-dialog.component.html',
  styleUrl: './producto-form-dialog.component.scss',
})
export class ProductoFormDialogComponent {
  private fb = inject(FormBuilder);
  private inventarioService = inject(InventarioService);
  private messageService = inject(MessageService);

  readonly visible = model(false);
  readonly producto = input<Producto | null>(null);

  readonly cargando = signal(false);
  readonly errorMensaje = signal('');

  readonly esEdicion = computed(() => this.producto() !== null);

  readonly form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    precioVenta: ['', [Validators.required, Validators.pattern(/^\d+(\.\d{1,2})?$/)]],
  });

  constructor() {
    effect(() => {
      if (!this.visible()) {
        return;
      }
      const actual = this.producto();
      this.errorMensaje.set('');
      this.form.reset({
        nombre: actual?.nombre ?? '',
        precioVenta: actual ? String(actual.precioVenta) : '',
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
    const { nombre, precioVenta } = this.form.getRawValue();
    const actual = this.producto();

    const peticion = actual
      ? this.inventarioService.editarProducto(actual.id, { nombre, precioVenta: Number(precioVenta) })
      : this.inventarioService.crearProducto({ nombre, precioVenta: Number(precioVenta) });

    peticion.subscribe({
      next: () => {
        this.cargando.set(false);
        this.messageService.add({
          severity: 'success',
          summary: actual ? 'Producto actualizado' : 'Producto creado con stock 0',
        });
        this.visible.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.cargando.set(false);
        this.errorMensaje.set('No se pudo guardar el producto. Intenta de nuevo.');
      },
    });
  }
}
