import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { RespuestaEstandar } from '../../../shared/models/usuario.model';
import { Deuda, DeudaConAbonos, EstadoDeuda, MetodoPago, TipoDeuda } from '../models/deuda.model';

interface ListarDeudasData {
  deudas: DeudaConAbonos[];
  total: number;
  page: number;
  limit: number;
}

interface ResultadoAbono {
  deuda: Deuda;
  abono: DeudaConAbonos['abonos'][number];
}

@Injectable({ providedIn: 'root' })
export class DeudasService {
  private api = inject(ApiService);

  private readonly _deudas = signal<DeudaConAbonos[]>([]);
  readonly deudas = this._deudas.asReadonly();

  private readonly _cargando = signal(false);
  readonly cargando = this._cargando.asReadonly();

  cargarDeudas(filtros: { type?: TipoDeuda; status?: EstadoDeuda } = {}): void {
    this._cargando.set(true);
    const params = new URLSearchParams();
    if (filtros.type) params.set('type', filtros.type);
    if (filtros.status) params.set('status', filtros.status);
    const qs = params.toString();
    this.api.get<RespuestaEstandar<ListarDeudasData>>(`/debts${qs ? '?' + qs : ''}`).subscribe({
      next: (respuesta) => {
        this._deudas.set(respuesta.data.deudas);
        this._cargando.set(false);
      },
      error: () => this._cargando.set(false),
    });
  }

  crearDeuda(datos: {
    tipo: TipoDeuda;
    contraparte: string;
    montoTotal: number;
  }): Observable<RespuestaEstandar<Deuda>> {
    return this.api.post<RespuestaEstandar<Deuda>>('/debts', datos).pipe(
      tap((respuesta) => {
        this._deudas.update((deudas) => [{ deuda: respuesta.data, abonos: [] }, ...deudas]);
      }),
    );
  }

  registrarAbono(
    id: string,
    datos: { monto: number; metodoPago: MetodoPago },
  ): Observable<RespuestaEstandar<ResultadoAbono>> {
    return this.api.post<RespuestaEstandar<ResultadoAbono>>(`/debts/${id}/payments`, datos).pipe(
      tap((respuesta) => {
        this._deudas.update((deudas) =>
          deudas.map((d) =>
            d.deuda.id === id
              ? { deuda: respuesta.data.deuda, abonos: [...d.abonos, respuesta.data.abono] }
              : d,
          ),
        );
      }),
    );
  }
}
