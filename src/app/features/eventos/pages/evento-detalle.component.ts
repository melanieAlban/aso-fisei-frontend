import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import {
  AsignacionEntradas,
  CompromisoPagoEvento,
  GastoEvento,
  IngresoEvento,
  TipoEntrada,
  VentaEntrada,
} from '../models/evento.model';
import { EventosService } from '../services/eventos.service';
import { EventoFormDialogComponent } from '../components/evento-form-dialog.component';
import { AnularEventoDialogComponent } from '../components/anular-evento-dialog.component';
import { CerrarEventoDialogComponent } from '../components/cerrar-evento-dialog.component';
import { TipoEntradaFormDialogComponent } from '../components/tipo-entrada-form-dialog.component';
import { AsignacionFormDialogComponent } from '../components/asignacion-form-dialog.component';
import { ActualizarAsignacionDialogComponent } from '../components/actualizar-asignacion-dialog.component';
import { CompromisoPagoFormDialogComponent } from '../components/compromiso-pago-form-dialog.component';
import { AbonarCompromisoDialogComponent } from '../components/abonar-compromiso-dialog.component';
import {
  MovimientoEventoDialogComponent,
  MovimientoEventoEditable,
  TipoMovimientoEvento,
} from '../components/movimiento-evento-dialog.component';
import { redondearDinero } from '../../../shared/utils/dinero.util';

type FiltroMetodoVentas = '' | 'EFECTIVO' | 'TRANSFERENCIA' | 'MIXTO';

interface FilaVentaResumen {
  origen: 'Directa' | 'Asignación';
  tipoEntradaId: string;
  descripcion: string;
  monto: number;
  montoEfectivo: number;
  montoTransferencia: number;
  metodoPago: 'EFECTIVO' | 'TRANSFERENCIA' | null;
  fecha: string;
}

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
    CompromisoPagoFormDialogComponent,
    AbonarCompromisoDialogComponent,
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
  private messageService = inject(MessageService);

  readonly eventoId = this.route.snapshot.paramMap.get('id') ?? '';

  readonly evento = this.eventosService.eventoActual;
  readonly resumen = this.eventosService.resumenActual;
  readonly tiposEntrada = this.eventosService.tiposEntrada;
  readonly asignaciones = this.eventosService.asignaciones;
  readonly ingresos = this.eventosService.ingresos;
  readonly gastos = this.eventosService.gastos;
  readonly ventasEntrada = this.eventosService.ventasEntrada;
  readonly compromisosPago = this.eventosService.compromisosPago;
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

  // Checklist "¿ya me entregó?" por asignación — solo a nivel de frontend
  // (localStorage), no viaja al backend ni a otros dispositivos/usuarios.
  private readonly claveEntregados = `asignaciones-entregadas-${this.eventoId}`;
  readonly entregados = signal<Set<string>>(this.leerEntregadosGuardados());

  private leerEntregadosGuardados(): Set<string> {
    try {
      const guardado = localStorage.getItem(this.claveEntregados);
      return guardado ? new Set(JSON.parse(guardado)) : new Set();
    } catch {
      return new Set();
    }
  }

  estaEntregado(asignacionId: string): boolean {
    return this.entregados().has(asignacionId);
  }

  toggleEntregado(asignacionId: string): void {
    const actual = new Set(this.entregados());
    if (actual.has(asignacionId)) {
      actual.delete(asignacionId);
    } else {
      actual.add(asignacionId);
    }
    this.entregados.set(actual);
    try {
      localStorage.setItem(this.claveEntregados, JSON.stringify([...actual]));
    } catch {
      // localStorage no disponible (modo privado, etc.) — el checklist
      // igual funciona durante la sesión, solo no persiste.
    }
  }

  readonly movimientoVisible = signal(false);
  readonly movimientoTipo = signal<TipoMovimientoEvento>('ingreso');
  readonly movimientoSeleccionado = signal<MovimientoEventoEditable | null>(null);

  readonly compromisoVisible = signal(false);
  readonly abonarCompromisoVisible = signal(false);
  readonly compromisoSeleccionado = signal<CompromisoPagoEvento | null>(null);

  readonly filtroMetodoVentas = signal<FiltroMetodoVentas>('');
  readonly filtroTipoVentas = signal<string>('');

  // Junta ventas directas de entradas + dinero reportado por vendedores en
  // asignaciones, para tener un resumen combinado de todo lo vendido.
  readonly todasLasVentas = computed<FilaVentaResumen[]>(() => {
    const directas: FilaVentaResumen[] = this.ventasEntrada().map((v) => ({
      origen: 'Directa',
      tipoEntradaId: v.tipoEntradaId,
      descripcion: `${this.nombreTipoEntrada(v.tipoEntradaId)} x${v.cantidad}${v.cantidadCombo > 0 ? ' (combo)' : ''}`,
      monto: v.monto,
      montoEfectivo: v.montoEfectivo,
      montoTransferencia: v.montoTransferencia,
      metodoPago: v.metodoPago,
      fecha: v.fecha,
    }));
    const deAsignaciones: FilaVentaResumen[] = this.asignaciones()
      .filter((a) => a.dineroRecibido > 0)
      .map((a) => ({
        origen: 'Asignación',
        tipoEntradaId: a.tipoEntradaId,
        descripcion: a.nombreReferencia,
        monto: a.dineroRecibido,
        montoEfectivo: a.montoEfectivo,
        montoTransferencia: a.montoTransferencia,
        metodoPago: a.metodoPago,
        fecha: a.fecha,
      }));
    return [...directas, ...deAsignaciones].sort(
      (x, y) => new Date(y.fecha).getTime() - new Date(x.fecha).getTime(),
    );
  });

  readonly ventasFiltradas = computed<FilaVentaResumen[]>(() => {
    const filtroMetodo = this.filtroMetodoVentas();
    const filtroTipo = this.filtroTipoVentas();
    let resultado = this.todasLasVentas();
    if (filtroMetodo === 'MIXTO') {
      resultado = resultado.filter((v) => v.metodoPago === null);
    } else if (filtroMetodo) {
      resultado = resultado.filter((v) => v.metodoPago === filtroMetodo);
    }
    if (filtroTipo) {
      resultado = resultado.filter((v) => v.tipoEntradaId === filtroTipo);
    }
    return resultado;
  });

  readonly totalVentasFiltradas = computed(() =>
    redondearDinero(this.ventasFiltradas().reduce((acc, v) => acc + v.monto, 0)),
  );
  readonly totalEfectivoFiltrado = computed(() =>
    redondearDinero(this.ventasFiltradas().reduce((acc, v) => acc + v.montoEfectivo, 0)),
  );
  readonly totalTransferenciaFiltrado = computed(() =>
    redondearDinero(this.ventasFiltradas().reduce((acc, v) => acc + v.montoTransferencia, 0)),
  );

  onFiltroMetodoVentas(valor: string): void {
    this.filtroMetodoVentas.set(valor as FiltroMetodoVentas);
  }

  onFiltroTipoVentas(valor: string): void {
    this.filtroTipoVentas.set(valor);
  }

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
    this.eventosService.cargarVentasEntrada(this.eventoId);
    this.eventosService.cargarCompromisosPago(this.eventoId);
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

  abrirNuevoCompromiso(): void {
    this.compromisoVisible.set(true);
  }

  abrirAbonarCompromiso(compromiso: CompromisoPagoEvento): void {
    this.compromisoSeleccionado.set(compromiso);
    this.abonarCompromisoVisible.set(true);
  }

  pendienteCompromiso(c: CompromisoPagoEvento): number {
    return Math.round((c.montoTotal - c.montoPagado) * 100) / 100;
  }

  porcentajePagado(c: CompromisoPagoEvento): number {
    if (c.montoTotal <= 0) return 0;
    return Math.min(100, Math.round((c.montoPagado / c.montoTotal) * 100));
  }

  borrarCompromisoPago(compromiso: CompromisoPagoEvento): void {
    if (!confirm(`¿Borrar el compromiso "${compromiso.descripcion}"? Esto no borra los abonos ya registrados como gasto.`)) return;
    this.eventosService.eliminarCompromisoPago(compromiso.id).subscribe({
      next: () => this.messageService.add({ severity: 'success', summary: 'Compromiso borrado' }),
      error: (err: HttpErrorResponse) =>
        this.messageService.add({
          severity: 'error',
          summary: this.mensajeError(err, 'No se pudo borrar el compromiso.'),
        }),
    });
  }

  private mensajeError(err: HttpErrorResponse, fallback: string): string {
    return err.error?.error?.message ?? fallback;
  }

  borrarTipoEntrada(tipo: TipoEntrada): void {
    if (!confirm(`¿Borrar el tipo de entrada "${tipo.nombre}"?`)) return;
    this.eventosService.eliminarTipoEntrada(this.eventoId, tipo.id).subscribe({
      next: () => this.messageService.add({ severity: 'success', summary: 'Tipo de entrada borrado' }),
      error: (err: HttpErrorResponse) =>
        this.messageService.add({
          severity: 'error',
          summary: this.mensajeError(err, 'No se pudo borrar el tipo de entrada.'),
        }),
    });
  }

  borrarAsignacion(asignacion: AsignacionEntradas): void {
    if (!confirm(`¿Borrar la asignación de "${asignacion.nombreReferencia}"?`)) return;
    this.eventosService.eliminarAsignacion(asignacion.id).subscribe({
      next: () => this.messageService.add({ severity: 'success', summary: 'Asignación borrada' }),
      error: (err: HttpErrorResponse) =>
        this.messageService.add({
          severity: 'error',
          summary: this.mensajeError(err, 'No se pudo borrar la asignación.'),
        }),
    });
  }

  borrarIngreso(ingreso: IngresoEvento): void {
    if (!confirm(`¿Borrar el ingreso "${ingreso.descripcion}"?`)) return;
    this.eventosService.eliminarIngreso(this.eventoId, ingreso.id).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Ingreso borrado' });
        this.eventosService.cargarResumen(this.eventoId);
      },
      error: (err: HttpErrorResponse) =>
        this.messageService.add({
          severity: 'error',
          summary: this.mensajeError(err, 'No se pudo borrar el ingreso.'),
        }),
    });
  }

  borrarGasto(gasto: GastoEvento): void {
    if (!confirm(`¿Borrar el gasto "${gasto.descripcion}"?`)) return;
    this.eventosService.eliminarGasto(this.eventoId, gasto.id).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Gasto borrado' });
        this.eventosService.cargarResumen(this.eventoId);
      },
      error: (err: HttpErrorResponse) =>
        this.messageService.add({
          severity: 'error',
          summary: this.mensajeError(err, 'No se pudo borrar el gasto.'),
        }),
    });
  }

  borrarVentaEntrada(venta: VentaEntrada): void {
    if (!confirm('¿Anular esta venta de entrada?')) return;
    this.eventosService.eliminarVentaEntrada(this.eventoId, venta.id).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Venta anulada' });
        this.eventosService.cargarResumen(this.eventoId);
      },
      error: (err: HttpErrorResponse) =>
        this.messageService.add({
          severity: 'error',
          summary: this.mensajeError(err, 'No se pudo anular la venta.'),
        }),
    });
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
        a.metodoPago === 'EFECTIVO'
          ? 'Efectivo'
          : a.metodoPago === 'TRANSFERENCIA'
            ? 'Transferencia'
            : a.dineroRecibido > 0
              ? 'Mixto'
              : '',
      ]
        .map(escaparCsv)
        .join(';');
    });

    // BOM + "sep=;" para que Excel abra en español separando bien las columnas
    // (en configuración regional ES/EC, Excel usa coma como decimal y espera ; como separador de columnas).
    const contenido =
      '﻿sep=;\r\n' + [encabezados.map(escaparCsv).join(';'), ...lineas].join('\r\n');
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
