export type FuentePago = 'EFECTIVO_CAJA' | 'FONDO_GENERAL';
export type MetodoPago = 'EFECTIVO' | 'TRANSFERENCIA';
export type EstadoGasto = 'ACTIVO' | 'ANULADO';

export interface Gasto {
  id: string;
  usuarioId: string;
  descripcion: string;
  monto: number;
  categoria: string;
  fuentePago: FuentePago;
  // Solo aplican cuando fuentePago es FONDO_GENERAL — pueden ser ambos > 0
  // para un pago mixto.
  montoEfectivoFondo: number;
  montoTransferenciaFondo: number;
  generadoAutomaticamente: boolean;
  estado: EstadoGasto;
  motivoAnulacion: string | null;
  usuarioAnulacionId: string | null;
  fecha: string;
}
