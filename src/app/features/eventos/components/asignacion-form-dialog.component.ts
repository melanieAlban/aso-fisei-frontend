import { Component, effect, inject, input, model, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { MessageService } from 'primeng/api';
import { CARRERAS_FISEI, TipoEntrada } from '../models/evento.model';
import { EventosService } from '../services/eventos.service';

@Component({
  selector: 'app-asignacion-form-dialog',
  standalone: true,
  imports: [DecimalPipe, ReactiveFormsModule, DialogModule, ButtonModule],
  templateUrl: './asignacion-form-dialog.component.html',
  styleUrl: './asignacion-form-dialog.component.scss',
})
export class AsignacionFormDialogComponent {
  private fb = inject(FormBuilder);
  private eventosService = inject(EventosService);
  private messageService = inject(MessageService);

  readonly visible = model(false);
  readonly eventoId = input<string>('');
  readonly tiposEntrada = input<TipoEntrada[]>([]);
  readonly carreras = CARRERAS_FISEI;

  readonly cargando = signal(false);
  readonly errorMensaje = signal('');

  readonly form = this.fb.nonNullable.group({
    tipoEntradaId: ['', Validators.required],
    nombreReferencia: ['', Validators.required],
    cantidadAsignada: ['', [Validators.required, Validators.pattern(/^[1-9]\d*$/)]],
    telefono: [''],
    semestre: [''],
    carrera: [''],
  });

  constructor() {
    effect(() => {
      if (!this.visible()) {
        return;
      }
      this.errorMensaje.set('');
      const tipos = this.tiposEntrada();
      this.form.reset({
        tipoEntradaId: tipos.length === 1 ? tipos[0].id : '',
        nombreReferencia: '',
        cantidadAsignada: '',
        telefono: '',
        semestre: '',
        carrera: '',
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
    const { tipoEntradaId, nombreReferencia, cantidadAsignada, telefono, semestre, carrera } =
      this.form.getRawValue();

    this.eventosService
      .crearAsignacion(this.eventoId(), {
        tipoEntradaId,
        nombreReferencia,
        cantidadAsignada: Number(cantidadAsignada),
        ...(telefono.trim() ? { telefono: telefono.trim() } : {}),
        ...(semestre.trim() ? { semestre: semestre.trim() } : {}),
        ...(carrera.trim() ? { carrera: carrera.trim() } : {}),
      })
      .subscribe({
        next: () => {
          this.cargando.set(false);
          this.messageService.add({ severity: 'success', summary: 'Entradas asignadas' });
          this.visible.set(false);
        },
        error: (err: HttpErrorResponse) => {
          this.cargando.set(false);
          this.errorMensaje.set(
            err.error?.error?.message ?? 'No se pudo asignar las entradas. Intenta de nuevo.',
          );
        },
      });
  }
}
