import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { AsignacionEntradas, GastoEvento, IngresoEvento, TipoEntrada } from '../models/evento.model';
import { EventosService } from '../services/eventos.service';
import { EventoFormDialogComponent } from '../components/evento-form-dialog.component';
import { AnularEventoDialogComponent } from '../components/anular-evento-dialog.component';
import { CerrarEventoDialogComponent } from '../components/cerrar-evento-dialog.component';
import { TipoEntradaFormDialogComponent } from '../components/tipo-entrada-form-dialog.component';
import { AsignacionFormDialogComponent } from '../components/asignacion-form-dialog.component';
import { ActualizarAsignacionDialogComponent } from '../components/actualizar-asignacion-dialog.component';
import {
  MovimientoEventoDialogComponent,
  MovimientoEventoEditable,
  TipoMovimientoEvento,
} from '../components/movimiento-evento-dialog.component';

@Component({
  selector: 'app-evento-detalle',
  standalone: true,
  imports: [
    DatePipe,
    DecimalPipe,
    RouterLink,
    ButtonModule,
    TagModule,
    TableModule,
    ToastModule,
    EventoFormDialogComponent,
    AnularEventoDialogComponent,
    CerrarEventoDialogComponent,
    TipoEntradaFormDialogComponent,
    AsignacionFormDialogComponent,
    ActualizarAsignacionDialogComponent,
    MovimientoEventoDialogComponent,
  ],
  providers: [MessageService],
  templateUrl: './evento-detalle.component.html',
  styleUrl: './evento-detalle.component.scss',
})
export class EventoDetalleComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private eventosService = inject(EventosService);
  private destroyRef = inject(DestroyRef);

  readonly eventoId = this.route.snapshot.paramMap.get('id') ?? '';

  readonly evento = this.eventosService.eventoActual;
  readonly resumen = this.eventosService.resumenActual;
  readonly tiposEntrada = this.eventosService.tiposEntrada;
  readonly asignaciones = this.eventosService.asignaciones;
  readonly ingresos = this.eventosService.ingresos;
  readonly gastos = this.eventosService.gastos;
  readonly cargando = this.eventosService.cargando;

  readonly esActivo = computed(() => this.evento()?.estado === 'ACTIVO');

  readonly editarVisible = signal(false);
  readonly anularVisible = signal(false);
  readonly cerrarVisible = signal(false);

  readonly tipoEntradaVisible = signal(false);
  readonly tipoEntradaSeleccionado = signal<TipoEntrada | null>(null);

  readonly asignacionVisible = signal(false);
  readonly actualizarAsignacionVisible = signal(false);
  readonly asignacionSeleccionada = signal<AsignacionEntradas | null>(null);
  readonly tipoEntradaDeAsignacion = computed(() => {
    const asignacion = this.asignacionSeleccionada();
    if (!asignacion) return null;
    return this.tiposEntrada().find((t) => t.id === asignacion.tipoEntradaId) ?? null;
  });

  readonly movimientoVisible = signal(false);
  readonly movimientoTipo = signal<TipoMovimientoEvento>('ingreso');
  readonly movimientoSeleccionado = signal<MovimientoEventoEditable | null>(null);

  ngOnInit(): void {
    this.cargarTodo();
    this.destroyRef.onDestroy(() => this.eventosService.limpiarActual());
  }

  private cargarTodo(): void {
    this.eventosService.cargarEvento(this.eventoId);
    this.eventosService.cargarResumen(this.eventoId);
    this.eventosService.cargarTiposEntrada(this.eventoId);
    this.eventosService.cargarAsignaciones(this.eventoId);
    this.eventosService.cargarIngresos(this.eventoId);
    this.eventosService.cargarGastos(this.eventoId);
  }

  colorEstado(estado: string): { background: string; color: string } {
    if (estado === 'ACTIVO') return { background: 'rgba(18,216,151,.14)', color: '#0A7D58' };
    if (estado === 'CERRADO') return { background: 'rgba(10,22,56,.08)', color: '#0A1638' };
    return { background: 'rgba(224,79,79,.1)', color: '#C0392B' };
  }

  nombreTipoEntrada(tipoEntradaId: string): string {
    return this.tiposEntrada().find((t) => t.id === tipoEntradaId)?.nombre ?? '—';
  }

  abrirEditar(): void {
    this.editarVisible.set(true);
  }

  abrirAnular(): void {
    this.anularVisible.set(true);
  }

  abrirCerrar(): void {
    this.cerrarVisible.set(true);
  }

  abrirNuevoTipoEntrada(): void {
    this.tipoEntradaSeleccionado.set(null);
    this.tipoEntradaVisible.set(true);
  }

  abrirEditarTipoEntrada(tipo: TipoEntrada): void {
    this.tipoEntradaSeleccionado.set(tipo);
    this.tipoEntradaVisible.set(true);
  }

  abrirNuevaAsignacion(): void {
    this.asignacionVisible.set(true);
  }

  abrirActualizarAsignacion(asignacion: AsignacionEntradas): void {
    this.asignacionSeleccionada.set(asignacion);
    this.actualizarAsignacionVisible.set(true);
  }

  abrirIngreso(): void {
    this.movimientoTipo.set('ingreso');
    this.movimientoSeleccionado.set(null);
    this.movimientoVisible.set(true);
  }

  abrirEditarIngreso(ingreso: IngresoEvento): void {
    this.movimientoTipo.set('ingreso');
    this.movimientoSeleccionado.set(ingreso);
    this.movimientoVisible.set(true);
  }

  abrirGasto(): void {
    this.movimientoTipo.set('gasto');
    this.movimientoSeleccionado.set(null);
    this.movimientoVisible.set(true);
  }

  abrirEditarGasto(gasto: GastoEvento): void {
    this.movimientoTipo.set('gasto');
    this.movimientoSeleccionado.set(gasto);
    this.movimientoVisible.set(true);
  }

  descargarAsignacionesExcel(): void {
    const filas = this.asignaciones();
    const encabezados = [
      'Nombre',
      'Teléfono',
      'Semestre',
      'Carrera',
      'Tipo de entrada',
      'Asignadas',
      'Vendidas individual',
      'Vendidas en combo',
      'Devueltas',
      'Dinero recibido',
      'Método de pago',
    ];

    const escaparCsv = (valor: string): string => `"${valor.replace(/"/g, '""')}"`;

    const lineas = filas.map((a) => {
      const vendidaIndividual = a.cantidadVendida - a.cantidadVendidaCombo;
      return [
        a.nombreReferencia,
        a.telefono ?? '',
        a.semestre ?? '',
        a.carrera ?? '',
        this.nombreTipoEntrada(a.tipoEntradaId),
        String(a.cantidadAsignada),
        String(vendidaIndividual),
        String(a.cantidadVendidaCombo),
        String(a.cantidadDevuelta),
        a.dineroRecibido.toFixed(2),
        a.metodoPago === 'EFECTIVO' ? 'Efectivo' : a.metodoPago === 'TRANSFERENCIA' ? 'Transferencia' : '',
      ]
        .map(escaparCsv)
        .join(',');
    });

    // BOM al inicio para que Excel detecte UTF-8 y no rompa las tildes/ñ.
    const contenido = '﻿' + [encabezados.map(escaparCsv).join(','), ...lineas].join('\r\n');
    const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    const nombreEvento = this.evento()?.nombre ?? 'evento';
    enlace.href = url;
    enlace.download = `asignaciones-${nombreEvento.trim().replace(/\s+/g, '_')}.csv`;
    enlace.click();
    URL.revokeObjectURL(url);
  }
}
