import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { RespuestaEstandar } from '../../../shared/models/usuario.model';
import { MetodoPago, VentaConDetalle } from '../models/venta.model';

interface ListarVentasData {
  ventas: VentaConDetalle[];
  total: number;
  page: number;
  limit: number;
}

interface LineaVentaInput {
  productoId: string;
  cantidad: number;
  esAlquiler?: boolean;
}

@Injectable({ providedIn: 'root' })
export class VentasService {
  private api = inject(ApiService);

  private readonly _ventas = signal<VentaConDetalle[]>([]);
  readonly ventas = this._ventas.asReadonly();

  private readonly _cargando = signal(false);
  readonly cargando = this._cargando.asReadonly();

  cargarVentas(filtros: { metodoPago?: MetodoPago; from?: string; to?: string } = {}): void {
    this._cargando.set(true);
    const params = new URLSearchParams();
    if (filtros.from) params.set('from', filtros.from);
    if (filtros.to) params.set('to', filtros.to);
    const qs = params.toString();
    this.api.get<RespuestaEstandar<ListarVentasData>>(`/sales${qs ? '?' + qs : ''}`).subscribe({
      next: (respuesta) => {
        let ventas = respuesta.data.ventas;
        if (filtros.metodoPago) {
          ventas = ventas.filter((v) => v.venta.metodoPago === filtros.metodoPago);
        }
        this._ventas.set(ventas);
        this._cargando.set(false);
      },
      error: () => this._cargando.set(false),
    });
  }

  registrarVenta(datos: {
    metodoPago: MetodoPago;
    lineas: LineaVentaInput[];
  }): Observable<RespuestaEstandar<VentaConDetalle>> {
    return this.api.post<RespuestaEstandar<VentaConDetalle>>('/sales', datos).pipe(
      tap((respuesta) => {
        this._ventas.update((ventas) => [respuesta.data, ...ventas]);
      }),
    );
  }

  anularItem(
    ventaId: string,
    itemId: string,
    motivo: string,
  ): Observable<RespuestaEstandar<unknown>> {
    return this.api
      .patch<RespuestaEstandar<unknown>>(`/sales/${ventaId}/items/${itemId}/void`, { motivo })
      .pipe(
        tap(() => {
          this._ventas.update((ventas) =>
            ventas.map((v) =>
              v.venta.id === ventaId
                ? {
                    ...v,
                    detalles: v.detalles.map((d) =>
                      d.id === itemId ? { ...d, estado: 'ANULADO' as const, motivoAnulacion: motivo } : d,
                    ),
                  }
                : v,
            ),
          );
        }),
      );
  }

  devolverAlquiler(ventaId: string, itemId: string): Observable<RespuestaEstandar<unknown>> {
    return this.api
      .patch<RespuestaEstandar<unknown>>(`/sales/${ventaId}/items/${itemId}/return`, {})
      .pipe(
        tap(() => {
          this._ventas.update((ventas) =>
            ventas.map((v) =>
              v.venta.id === ventaId
                ? {
                    ...v,
                    detalles: v.detalles.map((d) =>
                      d.id === itemId ? { ...d, estadoAlquiler: 'DEVUELTO' as const } : d,
                    ),
                  }
                : v,
            ),
          );
        }),
      );
  }
}
