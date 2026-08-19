import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { AuthService } from '../../../core/auth/auth.service';
import { MovimientoInventario, TipoMovimiento } from '../models/movimiento-inventario.model';
import { InventarioService } from '../services/inventario.service';

interface FilaMovimiento {
  producto: string;
  tipoLabel: string;
  bg: string;
  color: string;
  cantidadSigno: string;
  colorCantidad: string;
  motivo: string;
  usuario: string;
  fecha: string;
}

const TIPO_ESTILO: Record<TipoMovimiento, { label: string; bg: string; color: string; signo: 1 | -1 }> = {
  COMPRA: { label: 'Compra', bg: 'rgba(18,216,151,.14)', color: '#0A7D58', signo: 1 },
  VENTA: { label: 'Venta', bg: 'rgba(42,111,219,.12)', color: '#2A6FDB', signo: -1 },
  PERDIDA: { label: 'Pérdida', bg: 'rgba(224,79,79,.1)', color: '#C0392B', signo: -1 },
  AJUSTE: { label: 'Ajuste', bg: 'rgba(232,167,60,.16)', color: '#B8791C', signo: 1 },
};

@Component({
  selector: 'app-movimientos',
  standalone: true,
  imports: [DatePipe, RouterLink, TableModule, TagModule],
  templateUrl: './movimientos.component.html',
  styleUrl: './movimientos.component.scss',
})
export class MovimientosComponent implements OnInit {
  private inventarioService = inject(InventarioService);
  private authService = inject(AuthService);

  readonly productos = this.inventarioService.productos;

  readonly cargando = signal(false);
  readonly movimientos = signal<MovimientoInventario[]>([]);

  readonly fTipo = signal('');
  readonly fProductoId = signal('');
  readonly fDesde = signal('');
  readonly fHasta = signal('');

  readonly filas = computed<FilaMovimiento[]>(() => {
    const productos = this.productos();
    const currentUserId = this.authService.currentUser()?.id;
    const productoId = this.fProductoId();

    return this.movimientos()
      .filter((m) => !productoId || m.productoId === productoId)
      .map((m) => {
        const estilo = TIPO_ESTILO[m.tipo];
        const producto = productos.find((p) => p.id === m.productoId);
        return {
          producto: producto?.nombre ?? m.productoId,
          tipoLabel: estilo.label,
          bg: estilo.bg,
          color: estilo.color,
          cantidadSigno: (estilo.signo > 0 ? '+' : '-') + m.cantidad,
          colorCantidad: estilo.signo > 0 ? '#0A7D58' : '#C0392B',
          motivo: m.motivo ?? '—',
          usuario: m.usuarioId === currentUserId ? 'Tú' : m.usuarioId.slice(0, 8),
          fecha: m.fecha,
        };
      });
  });

  ngOnInit(): void {
    this.inventarioService.cargarProductos();
    this.buscar();
  }

  onFTipo(valor: string): void {
    this.fTipo.set(valor);
    this.buscar();
  }

  onFProducto(valor: string): void {
    this.fProductoId.set(valor);
  }

  onFDesde(valor: string): void {
    this.fDesde.set(valor);
    this.buscar();
  }

  onFHasta(valor: string): void {
    this.fHasta.set(valor);
    this.buscar();
  }

  limpiarFiltros(): void {
    this.fTipo.set('');
    this.fProductoId.set('');
    this.fDesde.set('');
    this.fHasta.set('');
    this.buscar();
  }

  private buscar(): void {
    this.cargando.set(true);
    this.inventarioService
      .cargarMovimientos({
        tipo: this.fTipo() || undefined,
        desde: this.fDesde() || undefined,
        hasta: this.fHasta() || undefined,
      })
      .subscribe({
        next: (respuesta) => {
          this.movimientos.set(respuesta.data);
          this.cargando.set(false);
        },
        error: () => this.cargando.set(false),
      });
  }
}
