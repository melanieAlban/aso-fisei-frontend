export type TipoDeuda = 'POR_COBRAR' | 'POR_PAGAR';
export type EstadoDeuda = 'PENDIENTE' | 'PARCIAL' | 'CANCELADA';
export type MetodoPago = 'EFECTIVO' | 'TRANSFERENCIA';

export interface Deuda {
  id: string;
  usuarioId: string;
  gastoId: string | null;
  tipo: TipoDeuda;
  contraparte: string;
  montoTotal: number;
  montoAbonado: number;
  estado: EstadoDeuda;
  fechaRegistro: string;
}

export interface AbonoDeuda {
  id: string;
  deudaId: string;
  usuarioId: string;
  monto: number;
  metodoPago: MetodoPago;
  fecha: string;
}

export interface DeudaConAbonos {
  deuda: Deuda;
  abonos: AbonoDeuda[];
}
