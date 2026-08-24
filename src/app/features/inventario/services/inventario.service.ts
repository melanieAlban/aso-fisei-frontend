import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { RespuestaEstandar } from '../../../shared/models/usuario.model';
import {
  DireccionAjuste,
  FuentePago,
  MetodoPago,
  MovimientoInventario,
} from '../models/movimiento-inventario.model';
import { Producto } from '../models/producto.model';

interface ListarProductosData {
  productos: Producto[];
  total: number;
  page: number;
  limit: number;
}

interface ResultadoMovimiento {
  movimiento: MovimientoInventario;
  producto: Producto;
}

const STOCK_MINIMO_POR_DEFECTO = 10;

@Injectable({ providedIn: 'root' })
export class InventarioService {
  private api = inject(ApiService);

  private readonly _productos = signal<Producto[]>([]);
  readonly productos = this._productos.asReadonly();

  private readonly _cargando = signal(false);
  readonly cargando = this._cargando.asReadonly();

  private readonly _stockMinimo = signal<number>(STOCK_MINIMO_POR_DEFECTO);
  readonly stockMinimo = this._stockMinimo.asReadonly();

  readonly productosConPocoStock = computed(() =>
    this._productos().filter((p) => p.stockActual <= this._stockMinimo()),
  );

  cargarProductos(): void {
    this._cargando.set(true);
    this.api.get<RespuestaEstandar<ListarProductosData>>('/products').subscribe({
      next: (respuesta) => {
        this._productos.set(respuesta.data.productos);
        this._cargando.set(false);
      },
      error: () => this._cargando.set(false),
    });
  }

  cargarStockMinimo(): void {
    this.api
      .get<RespuestaEstandar<{ valorMinimo: number }>>('/inventory/config/stock-minimo')
      .subscribe({
        next: (respuesta) => this._stockMinimo.set(respuesta.data.valorMinimo),
      });
  }

  crearProducto(datos: {
    nombre: string;
    precioVenta?: number;
    cobraPorTiempo?: boolean;
    tarifaPorHora?: number;
  }): Observable<RespuestaEstandar<Producto>> {
    return this.api.post<RespuestaEstandar<Producto>>('/products', datos).pipe(
      tap((respuesta) => {
        this._productos.update((productos) => [respuesta.data, ...productos]);
      }),
    );
  }

  editarProducto(
    id: string,
    datos: { nombre?: string; precioVenta?: number; cobraPorTiempo?: boolean; tarifaPorHora?: number },
  ): Observable<RespuestaEstandar<Producto>> {
    return this.api
      .patch<RespuestaEstandar<Producto>>(`/products/${id}`, datos)
      .pipe(tap((respuesta) => this.actualizarProducto(respuesta.data)));
  }

  registrarCompra(datos: {
    productoId: string;
    cantidad: number;
    costoUnitario?: number;
    fuentePago: FuentePago;
    moneda?: MetodoPago;
  }): Observable<RespuestaEstandar<ResultadoMovimiento>> {
    return this.api
      .post<RespuestaEstandar<ResultadoMovimiento>>('/inventory/purchases', datos)
      .pipe(tap((respuesta) => this.actualizarProducto(respuesta.data.producto)));
  }

  registrarPerdida(datos: {
    productoId: string;
    cantidad: number;
    motivo: string;
  }): Observable<RespuestaEstandar<ResultadoMovimiento>> {
    return this.api
      .post<RespuestaEstandar<ResultadoMovimiento>>('/inventory/losses', datos)
      .pipe(tap((respuesta) => this.actualizarProducto(respuesta.data.producto)));
  }

  registrarAjuste(datos: {
    productoId: string;
    cantidad: number;
    direccion: DireccionAjuste;
    motivo?: string;
  }): Observable<RespuestaEstandar<ResultadoMovimiento>> {
    return this.api
      .post<RespuestaEstandar<ResultadoMovimiento>>('/inventory/adjustments', datos)
      .pipe(tap((respuesta) => this.actualizarProducto(respuesta.data.producto)));
  }

  actualizarStockMinimo(valorMinimo: number): Observable<RespuestaEstandar<{ valorMinimo: number }>> {
    return this.api
      .patch<RespuestaEstandar<{ valorMinimo: number }>>('/inventory/config/stock-minimo', {
        valorMinimo,
      })
      .pipe(tap((respuesta) => this._stockMinimo.set(respuesta.data.valorMinimo)));
  }

  cargarMovimientos(filtros: {
    tipo?: string;
    desde?: string;
    hasta?: string;
  }): Observable<RespuestaEstandar<MovimientoInventario[]>> {
    const params = new URLSearchParams();
    if (filtros.tipo) params.set('tipo', filtros.tipo);
    if (filtros.desde) params.set('desde', filtros.desde);
    if (filtros.hasta) params.set('hasta', filtros.hasta);
    const qs = params.toString();
    return this.api.get<RespuestaEstandar<MovimientoInventario[]>>(
      `/inventory/movements${qs ? '?' + qs : ''}`,
    );
  }

  private actualizarProducto(producto: Producto): void {
    this._productos.update((productos) =>
      productos.map((p) => (p.id === producto.id ? producto : p)),
    );
  }
}
