import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { RespuestaEstandar } from '../../../shared/models/usuario.model';
import { FuentePago, Gasto } from '../models/gasto.model';

interface ListarGastosData {
  gastos: Gasto[];
  total: number;
  page: number;
  limit: number;
}

@Injectable({ providedIn: 'root' })
export class GastosService {
  private api = inject(ApiService);

  private readonly _gastos = signal<Gasto[]>([]);
  readonly gastos = this._gastos.asReadonly();

  private readonly _categorias = signal<string[]>([]);
  readonly categorias = this._categorias.asReadonly();

  private readonly _cargando = signal(false);
  readonly cargando = this._cargando.asReadonly();

  cargarGastos(filtros: { category?: string; from?: string; to?: string } = {}): void {
    this._cargando.set(true);
    const params = new URLSearchParams();
    if (filtros.category) params.set('category', filtros.category);
    if (filtros.from) params.set('from', filtros.from);
    if (filtros.to) params.set('to', filtros.to);
    const qs = params.toString();
    this.api.get<RespuestaEstandar<ListarGastosData>>(`/expenses${qs ? '?' + qs : ''}`).subscribe({
      next: (respuesta) => {
        this._gastos.set(respuesta.data.gastos);
        this._cargando.set(false);
      },
      error: () => this._cargando.set(false),
    });
  }

  cargarCategorias(): void {
    this.api.get<RespuestaEstandar<string[]>>('/expense-categories').subscribe({
      next: (respuesta) => this._categorias.set(respuesta.data),
    });
  }

  registrarGasto(datos: {
    descripcion: string;
    monto: number;
    categoria: string;
    fuentePago: FuentePago;
    montoEfectivoFondo?: number;
    montoTransferenciaFondo?: number;
  }): Observable<RespuestaEstandar<Gasto>> {
    return this.api.post<RespuestaEstandar<Gasto>>('/expenses', datos).pipe(
      tap((respuesta) => {
        this._gastos.update((gastos) => [respuesta.data, ...gastos]);
        this._categorias.update((categorias) =>
          categorias.includes(respuesta.data.categoria)
            ? categorias
            : [...categorias, respuesta.data.categoria],
        );
      }),
    );
  }

  anularGasto(id: string, motivo: string): Observable<RespuestaEstandar<Gasto>> {
    return this.api.patch<RespuestaEstandar<Gasto>>(`/expenses/${id}/void`, { motivo }).pipe(
      tap((respuesta) => {
        this._gastos.update((gastos) =>
          gastos.map((g) => (g.id === respuesta.data.id ? respuesta.data : g)),
        );
      }),
    );
  }
}
