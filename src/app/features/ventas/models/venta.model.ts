export type MetodoPago = 'EFECTIVO' | 'TRANSFERENCIA';
export type EstadoAlquiler = 'PENDIENTE' | 'DEVUELTO';
export type EstadoDetalleVenta = 'ACTIVO' | 'ANULADO';

export interface DetalleVenta {
  id: string;
  ventaId: string;
  productoId: string;
  cantidad: number;
  precioUnitario: number;
  esAlquiler: boolean;
  estadoAlquiler: EstadoAlquiler | null;
  estado: EstadoDetalleVenta;
  motivoAnulacion: string | null;
  usuarioAnulacionId: string | null;
}

export interface Venta {
  id: string;
  usuarioId: string;
  cajaId: string;
  metodoPago: MetodoPago;
  total: number;
  fecha: string;
}

export interface VentaConDetalle {
  venta: Venta;
  detalles: DetalleVenta[];
}
