import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { HttpErrorResponse } from '@angular/common/http';
import { DisponibilidadTipoEntrada, VentaEntrada } from '../../eventos/models/evento.model';
import { EventosService } from '../../eventos/services/eventos.service';
import { VentaEntradaDialogComponent } from '../components/venta-entrada-dialog.component';

@Component({
  selector: 'app-vender-entradas',
  standalone: true,
  imports: [DatePipe, DecimalPipe, ToastModule, VentaEntradaDialogComponent],
  providers: [MessageService],
  templateUrl: './vender-entradas.component.html',
  styleUrl: './vender-entradas.component.scss',
})
export class VenderEntradasComponent implements OnInit {
  private eventosService = inject(EventosService);
  private messageService = inject(MessageService);

  readonly eventos = this.eventosService.eventos;
  readonly disponibilidad = this.eventosService.disponibilidad;
  readonly ventasEntrada = this.eventosService.ventasEntrada;
  readonly cargando = this.eventosService.cargando;

  readonly eventosActivos = computed(() => this.eventos().filter((e) => e.estado === 'ACTIVO'));

  readonly eventoSeleccionadoId = signal<string | null>(null);
  readonly eventoSeleccionado = computed(
    () => this.eventosActivos().find((e) => e.id === this.eventoSeleccionadoId()) ?? null,
  );

  readonly dialogVisible = signal(false);
  readonly itemSeleccionado = signal<DisponibilidadTipoEntrada | null>(null);

  ngOnInit(): void {
    this.eventosService.cargarEventos();
  }

  seleccionarEvento(eventoId: string): void {
    this.eventoSeleccionadoId.set(eventoId);
    this.eventosService.cargarDisponibilidad(eventoId);
    this.eventosService.cargarVentasEntrada(eventoId);
  }

  abrirVenta(item: DisponibilidadTipoEntrada): void {
    if (item.cantidadDisponible <= 0) return;
    this.itemSeleccionado.set(item);
    this.dialogVisible.set(true);
  }

  borrarVenta(venta: VentaEntrada): void {
    const eventoId = this.eventoSeleccionadoId();
    if (!eventoId) return;
    if (!confirm('¿Anular esta venta?')) return;

    this.eventosService.eliminarVentaEntrada(eventoId, venta.id).subscribe({
      next: () => this.messageService.add({ severity: 'success', summary: 'Venta anulada' }),
      error: (err: HttpErrorResponse) =>
        this.messageService.add({
          severity: 'error',
          summary: err.error?.error?.message ?? 'No se pudo anular la venta.',
        }),
    });
  }
}
