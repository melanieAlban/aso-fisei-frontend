export type TipoMovimiento = 'COMPRA' | 'VENTA' | 'PERDIDA' | 'AJUSTE';
export type FuentePago = 'EFECTIVO_CAJA' | 'FONDO_GENERAL';
export type MetodoPago = 'EFECTIVO' | 'TRANSFERENCIA';
export type DireccionAjuste = 'INCREMENTO' | 'DECREMENTO';

export interface MovimientoInventario {
  id: string;
  productoId: string;
  usuarioId: string;
  tipo: TipoMovimiento;
  cantidad: number;
  motivo: string | null;
  gastoId: string | null;
  fecha: string;
}
