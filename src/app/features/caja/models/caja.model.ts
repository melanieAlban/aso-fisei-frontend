export type EstadoCaja = 'ABIERTA' | 'CERRADA';
export type ClasificacionDiferencia = 'GANANCIA' | 'PERDIDA' | 'PENDIENTE';

export interface Caja {
  id: string;
  usuarioAperturaId: string;
  usuarioCierreId: string | null;
  fondoInicialEfectivo: number;
  estado: EstadoCaja;
  fechaApertura: string;
  fechaCierre: string | null;
}

export interface ResumenDiario {
  fecha: string;
  totalEfectivo: number;
  totalTransferencia: number;
  cantidadVentas: number;
}

export interface ArqueoCaja {
  id: string;
  cajaId: string;
  usuarioId: string;
  efectivoEsperado: number;
  efectivoContado: number;
  transferenciaEsperado: number;
  transferenciaContado: number;
  montoRetiradoEfectivo: number;
  montoRetiradoTransferencia: number;
  montoDejadoFondoCambio: number;
  clasificacionDiferencia: ClasificacionDiferencia | null;
  fecha: string;
}
