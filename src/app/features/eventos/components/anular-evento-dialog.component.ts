import { Component, effect, inject, input, model, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { MessageService } from 'primeng/api';
import { EventosService } from '../services/eventos.service';

@Component({
  selector: 'app-anular-evento-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, DialogModule, InputTextModule, ButtonModule],
  templateUrl: './anular-evento-dialog.component.html',
  styleUrl: './anular-evento-dialog.component.scss',
})
export class AnularEventoDialogComponent {
  private fb = inject(FormBuilder);
  private eventosService = inject(EventosService);
  private messageService = inject(MessageService);

  readonly visible = model(false);
  readonly eventoId = input<string>('');
  readonly nombreEvento = input<string>('');

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

    this.eventosService.anularEvento(this.eventoId(), motivo).subscribe({
      next: () => {
        this.cargando.set(false);
        this.messageService.add({ severity: 'success', summary: 'Evento anulado' });
        this.visible.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.errorMensaje.set('No se pudo anular el evento. Intenta de nuevo.');
      },
    });
  }
}
