import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';
import { RespuestaEstandar } from '../../../shared/models/usuario.model';

export interface TemporizadorBillar {
  id: string;
  nombre: string;
  horaInicioTexto: string;
  horaFinTexto: string;
  finTimestamp: number;
}

interface TemporizadorApi {
  id: string;
  nombre: string;
  horaInicio: string;
  horaFin: string;
  usuarioId: string;
  fecha: string;
}

function formatearHora(iso: string): string {
  const fecha = new Date(iso);
  return `${fecha.getHours().toString().padStart(2, '0')}:${fecha.getMinutes().toString().padStart(2, '0')}`;
}

@Injectable({ providedIn: 'root' })
export class BillarTimerService {
  private api = inject(ApiService);

  private readonly _temporizadores = signal<TemporizadorBillar[]>([]);
  readonly temporizadores = this._temporizadores.asReadonly();

  private aVista(t: TemporizadorApi): TemporizadorBillar {
    return {
      id: t.id,
      nombre: t.nombre,
      horaInicioTexto: formatearHora(t.horaInicio),
      horaFinTexto: formatearHora(t.horaFin),
      finTimestamp: new Date(t.horaFin).getTime(),
    };
  }

  cargar(): void {
    this.api.get<RespuestaEstandar<TemporizadorApi[]>>('/timers').subscribe({
      next: (respuesta) => this._temporizadores.set(respuesta.data.map((t) => this.aVista(t))),
    });
  }

  agregar(nombre: string, horaInicio: Date, horaFin: Date): void {
    this.api
      .post<RespuestaEstandar<TemporizadorApi>>('/timers', {
        nombre,
        horaInicio: horaInicio.toISOString(),
        horaFin: horaFin.toISOString(),
      })
      .subscribe({
        next: (respuesta) =>
          this._temporizadores.update((lista) => [...lista, this.aVista(respuesta.data)]),
      });
  }

  quitar(id: string): void {
    this.api.delete<RespuestaEstandar<null>>(`/timers/${id}`).subscribe({
      next: () => this._temporizadores.update((lista) => lista.filter((t) => t.id !== id)),
    });
  }
}
