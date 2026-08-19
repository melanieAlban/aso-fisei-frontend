export type TipoMovimientoFondo =
  | 'RETIRO_CAJA'
  | 'GASTO'
  | 'AJUSTE_INICIAL'
  | 'UTILIDAD_EVENTO'
  | 'ABONO_DEUDA_RECIBIDO'
  | 'ABONO_DEUDA_PAGADO';

export interface MovimientoFondoGeneral {
  id: string;
  usuarioId: string;
  tipo: TipoMovimientoFondo;
  monto: number;
  metodoPago: 'EFECTIVO' | 'TRANSFERENCIA';
  saldoResultanteEfectivo: number;
  saldoResultanteTransferencia: number;
  referenciaId: string | null;
  descripcion: string | null;
  fecha: string;
}

export interface SaldoFondoGeneral {
  saldoEfectivo: number;
  saldoTransferencia: number;
}
