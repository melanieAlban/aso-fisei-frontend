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
import { BillarTimerService } from '../services/billar-timer.service';
import { aCentavosDinero, redondearDinero } from '../../../shared/utils/dinero.util';

type ModoPago = 'EFECTIVO' | 'TRANSFERENCIA' | 'MIXTO';

interface LineaCarrito {
  producto: Producto;
  cantidad: number;
  esAlquiler: boolean;
  duracionMinutos?: number;
  horaInicio?: string;
  horaFin?: string;
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
  private billarTimerService = inject(BillarTimerService);

  readonly productos = this.inventarioService.productos;
  readonly cajaActual = this.cajaService.cajaActual;
  readonly verificandoCaja = this.cajaService.verificando;
  readonly currentUser = this.authService.currentUser;

  readonly esAdmin = computed(() => this.authService.tieneRol('Admin'));

  readonly query = signal('');
  readonly carrito = signal<
    Record<
      string,
      { cantidad: number; esAlquiler: boolean; duracionMinutos?: number; horaInicio?: string; horaFin?: string }
    >
  >({});
  readonly modoPago = signal<ModoPago>('EFECTIVO');
  readonly montoRecibido = signal('');
  readonly montoEfectivoMixto = signal('');
  readonly montoTransferenciaMixto = signal('');
  readonly registrando = signal(false);
  readonly ventaExitosa = signal<{ total: number; metodoPago: MetodoPago | null } | null>(null);

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
        horaInicio: item.horaInicio,
        horaFin: item.horaFin,
        lineTotal: redondearDinero(precioUnitario * item.cantidad),
      });
    }
    return lineas;
  });

  // Cálculo solo para mostrar en vivo en el carrito — el precio real y definitivo
  // lo calcula el backend al confirmar la venta.
  calcularPrecioPorTiempo(tarifaPorHora: number, minutos: number): number {
    return redondearDinero(tarifaPorHora * (minutos / 60));
  }

  readonly totalCarrito = computed(() =>
    redondearDinero(this.lineasCarrito().reduce((acc, l) => acc + l.lineTotal, 0)),
  );
  readonly cantidadItems = computed(() =>
    Object.values(this.carrito()).reduce((acc, i) => acc + i.cantidad, 0),
  );

  readonly cambio = computed(() => {
    const recibido = parseFloat(this.montoRecibido()) || 0;
    return (aCentavosDinero(recibido) - aCentavosDinero(this.totalCarrito())) / 100;
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
        const ahora = new Date();
        const horaInicio = this.formatearHora(ahora);
        const horaFin = this.formatearHora(new Date(ahora.getTime() + 60 * 60000));
        return {
          ...c,
          [producto.id]: { cantidad: 1, esAlquiler: false, duracionMinutos: 60, horaInicio, horaFin },
        };
      });
      return;
    }

    this.carrito.update((c) => {
      const actual = c[producto.id]?.cantidad ?? 0;
      if (actual >= producto.stockActual) return c;
      return { ...c, [producto.id]: { cantidad: actual + 1, esAlquiler: c[producto.id]?.esAlquiler ?? false } };
    });
  }

  // Al editar minutos, la hora de inicio se mantiene fija y la hora fin se
  // recalcula sola (si todavía no hay hora de inicio, se usa la hora actual).
  actualizarMinutos(productoId: string, minutos: number): void {
    this.carrito.update((c) => {
      const item = c[productoId];
      if (!item) return c;
      const duracionMinutos = Math.max(0, minutos || 0);
      const horaInicio = item.horaInicio ?? this.formatearHora(new Date());
      const horaFin = this.formatearHora(this.sumarMinutos(horaInicio, duracionMinutos));
      return { ...c, [productoId]: { ...item, duracionMinutos, horaInicio, horaFin } };
    });
  }

  private formatearHora(fecha: Date): string {
    return `${fecha.getHours().toString().padStart(2, '0')}:${fecha.getMinutes().toString().padStart(2, '0')}`;
  }

  private sumarMinutos(hora: string, minutos: number): Date {
    const [h, m] = hora.split(':').map(Number);
    const base = new Date();
    base.setHours(h, m, 0, 0);
    return new Date(base.getTime() + minutos * 60000);
  }

  // Minutos entre dos horas "HH:mm" del mismo día — si la hora fin es menor o
  // igual a la de inicio, se asume que cruza la medianoche (alquiler nocturno).
  private calcularMinutosEntreHoras(horaInicio: string, horaFin: string): number {
    const [hI, mI] = horaInicio.split(':').map(Number);
    const [hF, mF] = horaFin.split(':').map(Number);
    let minutos = hF * 60 + mF - (hI * 60 + mI);
    if (minutos <= 0) minutos += 24 * 60;
    return minutos;
  }

  actualizarHoraInicio(productoId: string, hora: string): void {
    this.carrito.update((c) => {
      const item = c[productoId];
      if (!item || !hora) return c;
      const horaFin = item.horaFin ?? hora;
      return {
        ...c,
        [productoId]: { ...item, horaInicio: hora, duracionMinutos: this.calcularMinutosEntreHoras(hora, horaFin) },
      };
    });
  }

  actualizarHoraFin(productoId: string, hora: string): void {
    this.carrito.update((c) => {
      const item = c[productoId];
      if (!item || !hora) return c;
      const horaInicio = item.horaInicio ?? hora;
      return {
        ...c,
        [productoId]: { ...item, horaFin: hora, duracionMinutos: this.calcularMinutosEntreHoras(horaInicio, hora) },
      };
    });
  }

  // Fecha real (hoy) en la que arranca el alquiler.
  private calcularFechaInicio(horaInicio: string): Date {
    const [hI, mI] = horaInicio.split(':').map(Number);
    const ahora = new Date();
    return new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), hI, mI, 0, 0);
  }

  // Fecha real (hoy o mañana si cruza medianoche) en la que vence el alquiler.
  private calcularFechaFin(horaInicio: string, horaFin: string): Date {
    const [hI, mI] = horaInicio.split(':').map(Number);
    const [hF, mF] = horaFin.split(':').map(Number);
    const ahora = new Date();
    const fin = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), hF, mF, 0, 0);
    if (hF * 60 + mF <= hI * 60 + mI) {
      fin.setDate(fin.getDate() + 1);
    }
    return fin;
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
    this.modoPago.set('EFECTIVO');
  }

  elegirTransferencia(): void {
    this.modoPago.set('TRANSFERENCIA');
    this.montoRecibido.set('');
  }

  elegirMixto(): void {
    this.modoPago.set('MIXTO');
    this.montoRecibido.set('');
  }

  // Montos que realmente se registrarán, según el modo de pago elegido.
  private montosPago(): { montoEfectivo: number; montoTransferencia: number } {
    const total = this.totalCarrito();
    switch (this.modoPago()) {
      case 'EFECTIVO':
        return { montoEfectivo: total, montoTransferencia: 0 };
      case 'TRANSFERENCIA':
        return { montoEfectivo: 0, montoTransferencia: total };
      case 'MIXTO':
        return {
          montoEfectivo: parseFloat(this.montoEfectivoMixto()) || 0,
          montoTransferencia: parseFloat(this.montoTransferenciaMixto()) || 0,
        };
    }
  }

  registrarBloqueado(): boolean {
    const hasItems = this.lineasCarrito().length > 0;
    const duracionInvalida = this.lineasCarrito().some(
      (l) => l.producto.cobraPorTiempo && (!l.duracionMinutos || l.duracionMinutos <= 0),
    );
    const total = this.totalCarrito();

    if (this.modoPago() === 'MIXTO') {
      const { montoEfectivo, montoTransferencia } = this.montosPago();
      const sumaNoCoincide =
        aCentavosDinero(montoEfectivo) + aCentavosDinero(montoTransferencia) !== aCentavosDinero(total);
      return !hasItems || duracionInvalida || sumaNoCoincide || this.registrando();
    }

    const esEfectivo = this.modoPago() === 'EFECTIVO';
    const recibido = parseFloat(this.montoRecibido()) || 0;
    const montoInsuficiente = esEfectivo && recibido > 0 && aCentavosDinero(recibido) < aCentavosDinero(total);
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
    this.ventasService.registrarVenta({ ...this.montosPago(), lineas }).subscribe({
      next: (respuesta) => {
        this.registrando.set(false);
        this.ventaExitosa.set({
          total: respuesta.data.venta.total,
          metodoPago: respuesta.data.venta.metodoPago,
        });
        this.inventarioService.cargarProductos();

        for (const l of this.lineasCarrito()) {
          if (l.producto.cobraPorTiempo && l.horaInicio && l.horaFin) {
            const fechaInicio = this.calcularFechaInicio(l.horaInicio);
            const fechaFin = this.calcularFechaFin(l.horaInicio, l.horaFin);
            this.billarTimerService.agregar(l.producto.nombre, fechaInicio, fechaFin);
          }
        }
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
    this.montoEfectivoMixto.set('');
    this.montoTransferenciaMixto.set('');
    this.modoPago.set('EFECTIVO');
    this.query.set('');
    this.ventaExitosa.set(null);
  }
}
