import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { AuthService } from '../../../core/auth/auth.service';
import { InventarioService } from '../../inventario/services/inventario.service';
import { MetodoPago, VentaConDetalle } from '../models/venta.model';
import { VentasService } from '../services/ventas.service';
import { AnularItemDialogComponent } from '../components/anular-item-dialog.component';

interface FilaVenta {
  ventaId: string;
  itemId: string;
  vendedorNombre: string;
  producto: string;
  cantidad: number;
  precioUnit: number;
  total: number;
  metodo: MetodoPago | null;
  estado: string;
  anulado: boolean;
  fecha: string;
  puedeAnular: boolean;
}

@Component({
  selector: 'app-historial-ventas',
  standalone: true,
  imports: [DatePipe, DecimalPipe, TableModule, TagModule, ToastModule, AnularItemDialogComponent],
  providers: [MessageService],
  templateUrl: './historial-ventas.component.html',
  styleUrl: './historial-ventas.component.scss',
})
export class HistorialVentasComponent implements OnInit {
  private ventasService = inject(VentasService);
  private inventarioService = inject(InventarioService);
  private authService = inject(AuthService);

  readonly ventas = this.ventasService.ventas;
  readonly cargando = this.ventasService.cargando;
  readonly productos = this.inventarioService.productos;

  readonly esAdmin = computed(() => this.authService.tieneRol('Admin'));

  readonly fMetodo = signal<MetodoPago | 'MIXTO' | ''>('');
  readonly fDesde = signal('');
  readonly fHasta = signal('');

  readonly anularVisible = signal(false);
  readonly anularVentaId = signal('');
  readonly anularItemId = signal('');
  readonly anularNombreProducto = signal('');

  readonly filas = computed<FilaVenta[]>(() => {
    const ventas = this.ventas();
    const productos = this.productos();
    const filas: FilaVenta[] = [];
    for (const v of ventas) {
      for (const d of v.detalles) {
        const producto = productos.find((p) => p.id === d.productoId);
        filas.push({
          ventaId: v.venta.id,
          itemId: d.id,
          vendedorNombre: v.vendedorNombre,
          producto: producto?.nombre ?? d.productoId,
          cantidad: d.cantidad,
          precioUnit: d.precioUnitario,
          total: d.precioUnitario * d.cantidad,
          metodo: v.venta.metodoPago,
          estado: d.estado === 'ANULADO' ? 'Anulado' : 'Activo',
          anulado: d.estado === 'ANULADO',
          fecha: v.venta.fecha,
          puedeAnular: d.estado !== 'ANULADO' && this.esAdmin(),
        });
      }
    }
    return filas;
  });

  ngOnInit(): void {
    this.inventarioService.cargarProductos();
    this.buscar();
  }

  onFMetodo(valor: string): void {
    this.fMetodo.set(valor as MetodoPago | 'MIXTO' | '');
    this.buscar();
  }

  onFDesde(valor: string): void {
    this.fDesde.set(valor);
    this.buscar();
  }

  onFHasta(valor: string): void {
    this.fHasta.set(valor);
    this.buscar();
  }

  abrirAnular(fila: FilaVenta): void {
    this.anularVentaId.set(fila.ventaId);
    this.anularItemId.set(fila.itemId);
    this.anularNombreProducto.set(fila.producto);
    this.anularVisible.set(true);
  }

  private buscar(): void {
    this.ventasService.cargarVentas({
      metodoPago: this.fMetodo() || undefined,
      from: this.fDesde() || undefined,
      to: this.fHasta() || undefined,
    });
  }
}
