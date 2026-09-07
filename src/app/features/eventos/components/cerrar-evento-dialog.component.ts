import { Component, effect, inject, input, model, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { MessageService } from 'primeng/api';
import { ResultadoCierreEvento } from '../models/evento.model';
import { EventosService } from '../services/eventos.service';

@Component({
  selector: 'app-cerrar-evento-dialog',
  standalone: true,
  imports: [DialogModule, ButtonModule],
  templateUrl: './cerrar-evento-dialog.component.html',
  styleUrl: './cerrar-evento-dialog.component.scss',
})
export class CerrarEventoDialogComponent {
  private eventosService = inject(EventosService);
  private messageService = inject(MessageService);

  readonly visible = model(false);
  readonly eventoId = input<string>('');
  readonly nombreEvento = input<string>('');

  readonly cargando = signal(false);
  readonly errorMensaje = signal('');
  readonly resultado = signal<ResultadoCierreEvento | null>(null);

  constructor() {
    effect(() => {
      if (!this.visible()) {
        return;
      }
      this.errorMensaje.set('');
      this.resultado.set(null);
    });
  }

  cerrar(): void {
    this.visible.set(false);
  }

  confirmar(): void {
    this.cargando.set(true);
    this.errorMensaje.set('');

    this.eventosService.cerrarEvento(this.eventoId()).subscribe({
      next: (respuesta) => {
        this.cargando.set(false);
        this.resultado.set(respuesta.data);
        this.messageService.add({ severity: 'success', summary: 'Evento cerrado' });
      },
      error: (err: HttpErrorResponse) => {
        this.cargando.set(false);
        this.errorMensaje.set(
          err.status === 409
            ? 'El evento ya se encuentra cerrado o anulado.'
            : (err.error?.error?.message ?? 'No se pudo cerrar el evento. Intenta de nuevo.'),
        );
      },
    });
  }
}
