import { Component, effect, inject, input, model, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { MessageService } from 'primeng/api';
import { Evento } from '../models/evento.model';
import { EventosService } from '../services/eventos.service';

@Component({
  selector: 'app-evento-form-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, DialogModule, ButtonModule],
  templateUrl: './evento-form-dialog.component.html',
  styleUrl: './evento-form-dialog.component.scss',
})
export class EventoFormDialogComponent {
  private fb = inject(FormBuilder);
  private eventosService = inject(EventosService);
  private messageService = inject(MessageService);

  readonly visible = model(false);
  readonly evento = input<Evento | null>(null);

  readonly cargando = signal(false);
  readonly errorMensaje = signal('');

  readonly modoEdicion = () => this.evento() !== null;

  readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required]],
    presupuesto: ['', [Validators.pattern(/^\d+(\.\d{1,2})?$/)]],
    fechaInicio: ['', [Validators.required]],
    fechaFin: [''],
  });

  constructor() {
    effect(() => {
      if (!this.visible()) {
        return;
      }
      this.errorMensaje.set('');
      const e = this.evento();
      this.form.reset({
        nombre: e?.nombre ?? '',
        presupuesto: e?.presupuesto ? String(e.presupuesto) : '',
        fechaInicio: e ? e.fechaInicio.slice(0, 10) : '',
        fechaFin: e?.fechaFin ? e.fechaFin.slice(0, 10) : '',
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
    const { nombre, presupuesto, fechaInicio, fechaFin } = this.form.getRawValue();
    const datos = {
      nombre,
      ...(presupuesto.trim() !== '' ? { presupuesto: Number(presupuesto) } : {}),
      fechaInicio,
      ...(fechaFin.trim() !== '' ? { fechaFin } : {}),
    };

    const eventoActual = this.evento();
    const operacion = eventoActual
      ? this.eventosService.editarEvento(eventoActual.id, datos)
      : this.eventosService.crearEvento(datos);

    operacion.subscribe({
      next: () => {
        this.cargando.set(false);
        this.messageService.add({
          severity: 'success',
          summary: eventoActual ? 'Evento actualizado' : 'Evento creado',
        });
        this.visible.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.cargando.set(false);
        this.errorMensaje.set(
          err.error?.error?.message ?? 'No se pudo guardar el evento. Intenta de nuevo.',
        );
      },
    });
  }
}
