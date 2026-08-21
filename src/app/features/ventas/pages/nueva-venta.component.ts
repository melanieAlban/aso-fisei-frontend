import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { AuthService } from '../../../core/auth/auth.service';
import { InventarioService } from '../../inventario/services/inventario.service';
import { Producto } from '../../inventario/models/producto.model';
import { MetodoPago } from '../models/venta.model';
import { VentasService } from '../services/ventas.service';
import { CajaService } from '../../caja/services/caja.service';

interface LineaCarrito {
  producto: Producto;
  cantidad: number;
  esAlquiler: boolean;
  duracionMinutos?: number;
  lineTotal: number;
}

interface ErrorBody {
  error?: { message?: string };
}

@Component({
  selector: 'app-nueva-venta',
  standalone: true,
  imports: [DecimalPipe, RouterLink, ButtonModule, ToastModule],
  providers: [MessageService],
  templateUrl: './nueva-venta.component.html',
  styleUrl: './nueva-venta.component.scss',
})
export class NuevaVentaComponent implements OnInit {
  private inventarioService = inject(InventarioService);
  private cajaService = inject(CajaService);
  private ventasService = inject(VentasService);
  private authService = inject(AuthService);
  private messageService = inject(MessageService);

  readonly productos = this.inventarioService.productos;
  readonly cajaActual = this.cajaService.cajaActual;
  readonly verificandoCaja = this.cajaService.verificando;
  readonly currentUser = this.authService.currentUser;

  readonly esAdmin = computed(() => this.authService.tieneRol('Admin'));

  readonly query = signal('');
  readonly carrito = signal<
    Record<string, { cantidad: number; esAlquiler: boolean; duracionMinutos?: number }>
  >({});
  readonly metodoPago = signal<MetodoPago>('EFECTIVO');
  readonly montoRecibido = signal('');
  readonly registrando = signal(false);
  readonly ventaExitosa = signal<{ total: number; metodoPago: MetodoPago } | null>(null);

  readonly productosFiltrados = computed(() => {
    const q = this.query().trim().toLowerCase();
    const lista = this.productos();
    if (!q) return lista;
    return lista.filter((p) => p.nombre.toLowerCase().includes(q));
  });

  readonly lineasCarrito = computed<LineaCarrito[]>(() => {
    const carrito = this.carrito();
    const productos = this.productos();
    const lineas: LineaCarrito[] = [];
    for (const [productoId, item] of Object.entries(carrito)) {
      const producto = productos.find((p) => p.id === productoId);
      if (!producto) continue;
      const precioUnitario = producto.cobraPorTiempo
        ? this.calcularPrecioPorTiempo(producto.tarifaPorHora ?? 0, item.duracionMinutos ?? 0)
        : producto.precioVenta;
      lineas.push({
        producto,
        cantidad: item.cantidad,
        esAlquiler: item.esAlquiler,
        duracionMinutos: item.duracionMinutos,
        lineTotal: precioUnitario * item.cantidad,
      });
    }
    return lineas;
  });

  // Cálculo solo para mostrar en vivo en el carrito — el precio real y definitivo
  // lo calcula el backend al confirmar la venta.
  calcularPrecioPorTiempo(tarifaPorHora: number, minutos: number): number {
    return Math.round((tarifaPorHora * (minutos / 60) + Number.EPSILON) * 100) / 100;
  }

  readonly totalCarrito = computed(() => this.lineasCarrito().reduce((acc, l) => acc + l.lineTotal, 0));
  readonly cantidadItems = computed(() =>
    Object.values(this.carrito()).reduce((acc, i) => acc + i.cantidad, 0),
  );

  readonly cambio = computed(() => {
    const recibido = parseFloat(this.montoRecibido()) || 0;
    return recibido - this.totalCarrito();
  });

  ngOnInit(): void {
    this.cajaService.verificarCajaActual();
    this.inventarioService.cargarProductos();
  }

  cantidadEnCarrito(productoId: string): number {
    return this.carrito()[productoId]?.cantidad ?? 0;
  }

  agregarProducto(producto: Producto): void {
    if (producto.stockActual <= 0) return;

    if (producto.cobraPorTiempo) {
      this.carrito.update((c) => {
        if (c[producto.id]) return c;
        return { ...c, [producto.id]: { cantidad: 1, esAlquiler: false, duracionMinutos: 60 } };
      });
      return;
    }

    this.carrito.update((c) => {
      const actual = c[producto.id]?.cantidad ?? 0;
      if (actual >= producto.stockActual) return c;
      return { ...c, [producto.id]: { cantidad: actual + 1, esAlquiler: c[producto.id]?.esAlquiler ?? false } };
    });
  }

  actualizarMinutos(productoId: string, minutos: number): void {
    this.carrito.update((c) => ({
      ...c,
      [productoId]: { ...c[productoId], duracionMinutos: Math.max(0, minutos || 0) },
    }));
  }

  incrementar(productoId: string, stockActual: number): void {
    this.carrito.update((c) => {
      const actual = c[productoId]?.cantidad ?? 0;
      if (actual >= stockActual) return c;
      return { ...c, [productoId]: { ...c[productoId], cantidad: actual + 1 } };
    });
  }

  decrementar(productoId: string): void {
    this.carrito.update((c) => {
      const actual = c[productoId]?.cantidad ?? 0;
      if (actual <= 1) return c;
      return { ...c, [productoId]: { ...c[productoId], cantidad: actual - 1 } };
    });
  }

  toggleAlquiler(productoId: string): void {
    this.carrito.update((c) => ({
      ...c,
      [productoId]: { ...c[productoId], esAlquiler: !c[productoId].esAlquiler },
    }));
  }

  quitarDelCarrito(productoId: string): void {
    this.carrito.update((c) => {
      const copia = { ...c };
      delete copia[productoId];
      return copia;
    });
  }

  elegirEfectivo(): void {
    this.metodoPago.set('EFECTIVO');
  }

  elegirTransferencia(): void {
    this.metodoPago.set('TRANSFERENCIA');
    this.montoRecibido.set('');
  }

  registrarBloqueado(): boolean {
    const hasItems = this.lineasCarrito().length > 0;
    const duracionInvalida = this.lineasCarrito().some(
      (l) => l.producto.cobraPorTiempo && (!l.duracionMinutos || l.duracionMinutos <= 0),
    );
    const esEfectivo = this.metodoPago() === 'EFECTIVO';
    const recibido = parseFloat(this.montoRecibido()) || 0;
    const total = this.totalCarrito();
    const montoInsuficiente = esEfectivo && recibido > 0 && recibido < total;
    return !hasItems || duracionInvalida || montoInsuficiente || this.registrando();
  }

  registrar(): void {
    if (this.registrarBloqueado()) return;

    const lineas = this.lineasCarrito().map((l) => ({
      productoId: l.producto.id,
      cantidad: l.cantidad,
      esAlquiler: l.esAlquiler || undefined,
      duracionMinutos: l.producto.cobraPorTiempo ? l.duracionMinutos : undefined,
    }));

    this.registrando.set(true);
    this.ventasService.registrarVenta({ metodoPago: this.metodoPago(), lineas }).subscribe({
      next: (respuesta) => {
        this.registrando.set(false);
        this.ventaExitosa.set({
          total: respuesta.data.venta.total,
          metodoPago: respuesta.data.venta.metodoPago,
        });
        this.inventarioService.cargarProductos();
      },
      error: (err: HttpErrorResponse) => {
        this.registrando.set(false);
        const body = err.error as ErrorBody;
        this.messageService.add({
          severity: 'error',
          summary: body?.error?.message ?? 'No se pudo registrar la venta.',
        });
      },
    });
  }

  registrarOtra(): void {
    this.carrito.set({});
    this.montoRecibido.set('');
    this.metodoPago.set('EFECTIVO');
    this.query.set('');
    this.ventaExitosa.set(null);
  }
}
