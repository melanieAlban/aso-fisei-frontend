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
  readonly cobraPorTiempo = signal(false);

  readonly form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    precioVenta: ['', [Validators.pattern(/^\d+(\.\d{1,2})?$/)]],
    tarifaPorHora: ['', [Validators.pattern(/^\d+(\.\d{1,2})?$/)]],
  });

  constructor() {
    effect(() => {
      if (!this.visible()) {
        return;
      }
      const actual = this.producto();
      this.errorMensaje.set('');
      this.cobraPorTiempo.set(actual?.cobraPorTiempo ?? false);
      this.form.reset({
        nombre: actual?.nombre ?? '',
        precioVenta: actual ? String(actual.precioVenta) : '',
        tarifaPorHora: actual?.tarifaPorHora ? String(actual.tarifaPorHora) : '',
      });
    });
  }

  toggleCobraPorTiempo(valor: boolean): void {
    this.cobraPorTiempo.set(valor);
  }

  cerrar(): void {
    this.visible.set(false);
  }

  // Plain method (not computed()) so it re-evaluates on every change-detection
  // cycle — mixes reactive-forms validity (not signal-based) with signals.
  bloqueado(): boolean {
    if (this.form.invalid) return true;
    if (this.cobraPorTiempo()) {
      return this.form.controls.tarifaPorHora.value.trim() === '';
    }
    return this.form.controls.precioVenta.value.trim() === '';
  }

  guardar(): void {
    if (this.bloqueado()) {
      this.form.markAllAsTouched();
      return;
    }

    this.cargando.set(true);
    this.errorMensaje.set('');
    const { nombre, precioVenta, tarifaPorHora } = this.form.getRawValue();
    const actual = this.producto();
    const cobraPorTiempo = this.cobraPorTiempo();

    const datos = {
      nombre,
      cobraPorTiempo,
      ...(cobraPorTiempo
        ? { tarifaPorHora: Number(tarifaPorHora) }
        : { precioVenta: Number(precioVenta) }),
    };

    const peticion = actual
      ? this.inventarioService.editarProducto(actual.id, datos)
      : this.inventarioService.crearProducto(datos);

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
