import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { RespuestaEstandar } from '../../../shared/models/usuario.model';
import {
  AsignacionEntradas,
  DisponibilidadTipoEntrada,
  Evento,
  GastoEvento,
  IngresoEvento,
  MetodoPagoEvento,
  ResultadoCierreEvento,
  ResumenEvento,
  TipoEntrada,
  VentaEntrada,
} from '../models/evento.model';

interface ListarEventosData {
  eventos: Evento[];
  total: number;
  page: number;
  limit: number;
}

@Injectable({ providedIn: 'root' })
export class EventosService {
  private api = inject(ApiService);

  private readonly _eventos = signal<Evento[]>([]);
  readonly eventos = this._eventos.asReadonly();

  private readonly _cargando = signal(false);
  readonly cargando = this._cargando.asReadonly();

  private readonly _eventoActual = signal<Evento | null>(null);
  readonly eventoActual = this._eventoActual.asReadonly();

  private readonly _resumenActual = signal<ResumenEvento | null>(null);
  readonly resumenActual = this._resumenActual.asReadonly();

  private readonly _tiposEntrada = signal<TipoEntrada[]>([]);
  readonly tiposEntrada = this._tiposEntrada.asReadonly();

  private readonly _asignaciones = signal<AsignacionEntradas[]>([]);
  readonly asignaciones = this._asignaciones.asReadonly();

  private readonly _ingresos = signal<IngresoEvento[]>([]);
  readonly ingresos = this._ingresos.asReadonly();

  private readonly _gastos = signal<GastoEvento[]>([]);
  readonly gastos = this._gastos.asReadonly();

  private readonly _ventasEntrada = signal<VentaEntrada[]>([]);
  readonly ventasEntrada = this._ventasEntrada.asReadonly();

  private readonly _disponibilidad = signal<DisponibilidadTipoEntrada[]>([]);
  readonly disponibilidad = this._disponibilidad.asReadonly();

  cargarEventos(): void {
    this._cargando.set(true);
    this.api.get<RespuestaEstandar<ListarEventosData>>('/events?limit=100').subscribe({
      next: (respuesta) => {
        this._eventos.set(respuesta.data.eventos);
        this._cargando.set(false);
      },
      error: () => this._cargando.set(false),
    });
  }

  crearEvento(datos: {
    nombre: string;
    presupuesto?: number;
    fechaInicio: string;
    fechaFin?: string;
  }): Observable<RespuestaEstandar<Evento>> {
    return this.api.post<RespuestaEstandar<Evento>>('/events', datos).pipe(
      tap((respuesta) => {
        this._eventos.update((eventos) => [respuesta.data, ...eventos]);
      }),
    );
  }

  editarEvento(
    id: string,
    datos: { nombre?: string; presupuesto?: number; fechaInicio?: string; fechaFin?: string },
  ): Observable<RespuestaEstandar<Evento>> {
    return this.api.patch<RespuestaEstandar<Evento>>(`/events/${id}`, datos).pipe(
      tap((respuesta) => this.actualizarEventoEnListas(respuesta.data)),
    );
  }

  anularEvento(id: string, motivo: string): Observable<RespuestaEstandar<Evento>> {
    return this.api.patch<RespuestaEstandar<Evento>>(`/events/${id}/cancel`, { motivo }).pipe(
      tap((respuesta) => this.actualizarEventoEnListas(respuesta.data)),
    );
  }

  cerrarEvento(id: string): Observable<RespuestaEstandar<ResultadoCierreEvento>> {
    return this.api.patch<RespuestaEstandar<ResultadoCierreEvento>>(`/events/${id}/close`, {}).pipe(
      tap((respuesta) => this.actualizarEventoEnListas(respuesta.data.evento)),
    );
  }

  private actualizarEventoEnListas(evento: Evento): void {
    this._eventos.update((eventos) => eventos.map((e) => (e.id === evento.id ? evento : e)));
    if (this._eventoActual()?.id === evento.id) {
      this._eventoActual.set(evento);
    }
  }

  cargarEvento(id: string): void {
    this._cargando.set(true);
    this.api.get<RespuestaEstandar<Evento>>(`/events/${id}`).subscribe({
      next: (respuesta) => {
        this._eventoActual.set(respuesta.data);
        this._cargando.set(false);
      },
      error: () => this._cargando.set(false),
    });
  }

  cargarResumen(id: string): void {
    this.api.get<RespuestaEstandar<ResumenEvento>>(`/events/${id}/summary`).subscribe({
      next: (respuesta) => this._resumenActual.set(respuesta.data),
    });
  }

  cargarTiposEntrada(id: string): void {
    this.api.get<RespuestaEstandar<TipoEntrada[]>>(`/events/${id}/ticket-types`).subscribe({
      next: (respuesta) => this._tiposEntrada.set(respuesta.data),
    });
  }

  crearTipoEntrada(
    eventoId: string,
    datos: { nombre: string; precio: number; cantidadTotal: number; precioCombo?: number; cantidadCombo?: number },
  ): Observable<RespuestaEstandar<TipoEntrada>> {
    return this.api
      .post<RespuestaEstandar<TipoEntrada>>(`/events/${eventoId}/ticket-types`, datos)
      .pipe(tap((respuesta) => this._tiposEntrada.update((tipos) => [...tipos, respuesta.data])));
  }

  editarTipoEntrada(
    eventoId: string,
    tipoId: string,
    datos: {
      nombre?: string;
      precio?: number;
      cantidadTotal?: number;
      precioCombo?: number | null;
      cantidadCombo?: number | null;
    },
  ): Observable<RespuestaEstandar<TipoEntrada>> {
    return this.api
      .patch<RespuestaEstandar<TipoEntrada>>(`/events/${eventoId}/ticket-types/${tipoId}`, datos)
      .pipe(
        tap((respuesta) =>
          this._tiposEntrada.update((tipos) =>
            tipos.map((t) => (t.id === respuesta.data.id ? respuesta.data : t)),
          ),
        ),
      );
  }

  eliminarTipoEntrada(eventoId: string, tipoId: string): Observable<RespuestaEstandar<null>> {
    return this.api.delete<RespuestaEstandar<null>>(`/events/${eventoId}/ticket-types/${tipoId}`).pipe(
      tap(() => this._tiposEntrada.update((tipos) => tipos.filter((t) => t.id !== tipoId))),
    );
  }

  cargarAsignaciones(id: string): void {
    this.api.get<RespuestaEstandar<AsignacionEntradas[]>>(`/events/${id}/ticket-assignments`).subscribe({
      next: (respuesta) => this._asignaciones.set(respuesta.data),
    });
  }

  crearAsignacion(
    eventoId: string,
    datos: {
      tipoEntradaId: string;
      nombreReferencia: string;
      cantidadAsignada: number;
      telefono?: string;
      semestre?: string;
      carrera?: string;
    },
  ): Observable<RespuestaEstandar<AsignacionEntradas>> {
    return this.api
      .post<RespuestaEstandar<AsignacionEntradas>>(`/events/${eventoId}/ticket-assignments`, datos)
      .pipe(tap((respuesta) => this._asignaciones.update((lista) => [...lista, respuesta.data])));
  }

  actualizarAsignacion(
    id: string,
    datos: {
      nombreReferencia?: string;
      telefono?: string | null;
      semestre?: string | null;
      carrera?: string | null;
      cantidadAsignada?: number;
      cantidadVendida?: number;
      cantidadVendidaCombo?: number;
      cantidadDevuelta?: number;
      dineroRecibido?: number;
      metodoPago?: MetodoPagoEvento;
    },
  ): Observable<RespuestaEstandar<AsignacionEntradas>> {
    return this.api.patch<RespuestaEstandar<AsignacionEntradas>>(`/ticket-assignments/${id}`, datos).pipe(
      tap((respuesta) =>
        this._asignaciones.update((lista) =>
          lista.map((a) => (a.id === respuesta.data.id ? respuesta.data : a)),
        ),
      ),
    );
  }

  eliminarAsignacion(id: string): Observable<RespuestaEstandar<null>> {
    return this.api.delete<RespuestaEstandar<null>>(`/ticket-assignments/${id}`).pipe(
      tap(() => this._asignaciones.update((lista) => lista.filter((a) => a.id !== id))),
    );
  }

  cargarDisponibilidad(eventoId: string): void {
    this.api
      .get<RespuestaEstandar<DisponibilidadTipoEntrada[]>>(`/events/${eventoId}/ticket-availability`)
      .subscribe({
        next: (respuesta) => this._disponibilidad.set(respuesta.data),
      });
  }

  cargarVentasEntrada(eventoId: string): void {
    this.api.get<RespuestaEstandar<VentaEntrada[]>>(`/events/${eventoId}/ticket-sales`).subscribe({
      next: (respuesta) => this._ventasEntrada.set(respuesta.data),
    });
  }

  registrarVentaEntrada(
    eventoId: string,
    tipoId: string,
    datos: { cantidad: number; esCombo: boolean; metodoPago: MetodoPagoEvento },
  ): Observable<RespuestaEstandar<VentaEntrada>> {
    return this.api
      .post<RespuestaEstandar<VentaEntrada>>(`/events/${eventoId}/ticket-types/${tipoId}/sales`, datos)
      .pipe(
        tap((respuesta) => {
          this._ventasEntrada.update((lista) => [respuesta.data, ...lista]);
          this.cargarDisponibilidad(eventoId);
        }),
      );
  }

  eliminarVentaEntrada(eventoId: string, ventaId: string): Observable<RespuestaEstandar<null>> {
    return this.api.delete<RespuestaEstandar<null>>(`/events/${eventoId}/ticket-sales/${ventaId}`).pipe(
      tap(() => {
        this._ventasEntrada.update((lista) => lista.filter((v) => v.id !== ventaId));
        this.cargarDisponibilidad(eventoId);
      }),
    );
  }

  cargarIngresos(id: string): void {
    this.api.get<RespuestaEstandar<IngresoEvento[]>>(`/events/${id}/income`).subscribe({
      next: (respuesta) => this._ingresos.set(respuesta.data),
    });
  }

  cargarGastos(id: string): void {
    this.api.get<RespuestaEstandar<GastoEvento[]>>(`/events/${id}/expenses`).subscribe({
      next: (respuesta) => this._gastos.set(respuesta.data),
    });
  }

  registrarIngreso(
    eventoId: string,
    datos: { descripcion: string; monto: number; metodoPago: MetodoPagoEvento },
  ): Observable<RespuestaEstandar<IngresoEvento>> {
    return this.api.post<RespuestaEstandar<IngresoEvento>>(`/events/${eventoId}/income`, datos).pipe(
      tap((respuesta) => this._ingresos.update((lista) => [respuesta.data, ...lista])),
    );
  }

  editarIngreso(
    eventoId: string,
    incomeId: string,
    datos: { descripcion?: string; monto?: number; metodoPago?: MetodoPagoEvento },
  ): Observable<RespuestaEstandar<IngresoEvento>> {
    return this.api
      .patch<RespuestaEstandar<IngresoEvento>>(`/events/${eventoId}/income/${incomeId}`, datos)
      .pipe(
        tap((respuesta) =>
          this._ingresos.update((lista) =>
            lista.map((i) => (i.id === respuesta.data.id ? respuesta.data : i)),
          ),
        ),
      );
  }

  eliminarIngreso(eventoId: string, incomeId: string): Observable<RespuestaEstandar<null>> {
    return this.api.delete<RespuestaEstandar<null>>(`/events/${eventoId}/income/${incomeId}`).pipe(
      tap(() => this._ingresos.update((lista) => lista.filter((i) => i.id !== incomeId))),
    );
  }

  registrarGasto(
    eventoId: string,
    datos: { descripcion: string; monto: number; metodoPago: MetodoPagoEvento },
  ): Observable<RespuestaEstandar<GastoEvento>> {
    return this.api.post<RespuestaEstandar<GastoEvento>>(`/events/${eventoId}/expenses`, datos).pipe(
      tap((respuesta) => this._gastos.update((lista) => [respuesta.data, ...lista])),
    );
  }

  editarGasto(
    eventoId: string,
    expenseId: string,
    datos: { descripcion?: string; monto?: number; metodoPago?: MetodoPagoEvento },
  ): Observable<RespuestaEstandar<GastoEvento>> {
    return this.api
      .patch<RespuestaEstandar<GastoEvento>>(`/events/${eventoId}/expenses/${expenseId}`, datos)
      .pipe(
        tap((respuesta) =>
          this._gastos.update((lista) =>
            lista.map((g) => (g.id === respuesta.data.id ? respuesta.data : g)),
          ),
        ),
      );
  }

  eliminarGasto(eventoId: string, expenseId: string): Observable<RespuestaEstandar<null>> {
    return this.api.delete<RespuestaEstandar<null>>(`/events/${eventoId}/expenses/${expenseId}`).pipe(
      tap(() => this._gastos.update((lista) => lista.filter((g) => g.id !== expenseId))),
    );
  }

  limpiarActual(): void {
    this._eventoActual.set(null);
    this._resumenActual.set(null);
    this._tiposEntrada.set([]);
    this._asignaciones.set([]);
    this._ingresos.set([]);
    this._gastos.set([]);
    this._ventasEntrada.set([]);
    this._disponibilidad.set([]);
  }
}
