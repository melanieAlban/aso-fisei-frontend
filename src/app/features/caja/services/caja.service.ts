import { Injectable, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { RespuestaEstandar } from '../../../shared/models/usuario.model';
import { ArqueoCaja, Caja, ClasificacionDiferencia, ResumenDiario } from '../models/caja.model';

@Injectable({ providedIn: 'root' })
export class CajaService {
  private api = inject(ApiService);

  private readonly _cajaActual = signal<Caja | null>(null);
  readonly cajaActual = this._cajaActual.asReadonly();

  private readonly _verificando = signal(true);
  readonly verificando = this._verificando.asReadonly();

  private readonly _resumenDiario = signal<ResumenDiario[]>([]);
  readonly resumenDiario = this._resumenDiario.asReadonly();

  verificarCajaActual(): void {
    this._verificando.set(true);
    this.api.get<RespuestaEstandar<Caja>>('/cash-sessions/current').subscribe({
      next: (respuesta) => {
        this._cajaActual.set(respuesta.data);
        this._verificando.set(false);
        this.cargarResumenDiario(respuesta.data.id);
      },
      error: (err: HttpErrorResponse) => {
        if (err.status === 404) {
          this._cajaActual.set(null);
          this._resumenDiario.set([]);
        }
        this._verificando.set(false);
      },
    });
  }

  cargarResumenDiario(cajaId: string): void {
    this.api.get<RespuestaEstandar<ResumenDiario[]>>(`/cash-sessions/${cajaId}/daily-summary`).subscribe({
      next: (respuesta) => this._resumenDiario.set(respuesta.data),
    });
  }

  abrirCaja(fondoInicialEfectivo: number): Observable<RespuestaEstandar<Caja>> {
    return this.api.post<RespuestaEstandar<Caja>>('/cash-sessions/open', { fondoInicialEfectivo }).pipe(
      tap((respuesta) => {
        this._cajaActual.set(respuesta.data);
        this.cargarResumenDiario(respuesta.data.id);
      }),
    );
  }

  realizarArqueo(
    cajaId: string,
    datos: {
      efectivoContado: number;
      transferenciaContado: number;
      montoRetiradoEfectivo: number;
      montoRetiradoTransferencia: number;
      montoDejadoFondoCambio: number;
    },
  ): Observable<RespuestaEstandar<ArqueoCaja>> {
    return this.api
      .post<RespuestaEstandar<ArqueoCaja>>(`/cash-sessions/${cajaId}/reconciliation`, datos)
      .pipe(
        tap(() => {
          this._cajaActual.set(null);
        }),
      );
  }

  clasificarDiferencia(
    arqueoId: string,
    clasificacion: ClasificacionDiferencia,
  ): Observable<RespuestaEstandar<ArqueoCaja>> {
    return this.api.patch<RespuestaEstandar<ArqueoCaja>>(
      `/cash-sessions/reconciliations/${arqueoId}/classify-difference`,
      { clasificacion },
    );
  }
}
