import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { RespuestaEstandar } from '../../../shared/models/usuario.model';
import { MovimientoFondoGeneral, SaldoFondoGeneral } from '../models/movimiento-fondo.model';

interface ListarLedgerData {
  movimientos: MovimientoFondoGeneral[];
  total: number;
  page: number;
  limit: number;
}

interface AjusteFondoResultado {
  movimientos: MovimientoFondoGeneral[];
  saldoEfectivo: number;
  saldoTransferencia: number;
}

@Injectable({ providedIn: 'root' })
export class FondoGeneralService {
  private api = inject(ApiService);

  private readonly _saldo = signal<SaldoFondoGeneral | null>(null);
  readonly saldo = this._saldo.asReadonly();

  private readonly _movimientos = signal<MovimientoFondoGeneral[]>([]);
  readonly movimientos = this._movimientos.asReadonly();

  cargarSaldo(): void {
    this.api.get<RespuestaEstandar<SaldoFondoGeneral>>('/general-fund/balance').subscribe({
      next: (respuesta) => this._saldo.set(respuesta.data),
    });
  }

  cargarLedger(): void {
    this.api.get<RespuestaEstandar<ListarLedgerData>>('/general-fund/ledger').subscribe({
      next: (respuesta) => this._movimientos.set(respuesta.data.movimientos),
    });
  }

  ajustarSaldoInicial(datos: {
    montoEfectivo: number;
    montoTransferencia: number;
    justificacion: string;
  }): Observable<RespuestaEstandar<AjusteFondoResultado>> {
    return this.api
      .post<RespuestaEstandar<AjusteFondoResultado>>('/general-fund/initial-balance-adjustment', datos)
      .pipe(
        tap((respuesta) => {
          this._saldo.set({
            saldoEfectivo: respuesta.data.saldoEfectivo,
            saldoTransferencia: respuesta.data.saldoTransferencia,
          });
        }),
      );
  }
}
