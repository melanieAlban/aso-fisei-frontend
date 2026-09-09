export type EstadoEvento = 'ACTIVO' | 'CERRADO' | 'ANULADO';
export type MetodoPagoEvento = 'EFECTIVO' | 'TRANSFERENCIA';

export const CARRERAS_FISEI = ['TI', 'Software', 'Industrial', 'Robótica', 'Telecomunicaciones'] as const;

export interface Evento {
  id: string;
  nombre: string;
  presupuesto: number | null;
  estado: EstadoEvento;
  fechaInicio: string;
  fechaFin: string | null;
  fechaCierre: string | null;
  motivoAnulacion: string | null;
  usuarioAnulacionId: string | null;
}

export interface TipoEntrada {
  id: string;
  eventoId: string;
  nombre: string;
  precio: number;
  cantidadTotal: number;
  // Precio especial por combo (ej. 3 entradas por $10.50). Ambos vienen
  // juntos o ninguno de los dos.
  precioCombo: number | null;
  cantidadCombo: number | null;
}

export interface AsignacionEntradas {
  id: string;
  tipoEntradaId: string;
  usuarioRegistroId: string;
  nombreReferencia: string;
  telefono: string | null;
  semestre: string | null;
  carrera: string | null;
  cantidadAsignada: number;
  cantidadVendida: number;
  // Cuantas de las vendidas se vendieron al precio de combo.
  cantidadVendidaCombo: number;
  cantidadDevuelta: number;
  dineroRecibido: number;
  metodoPago: MetodoPagoEvento | null;
  fecha: string;
}

export interface VentaEntrada {
  id: string;
  tipoEntradaId: string;
  usuarioId: string;
  cantidad: number;
  cantidadCombo: number;
  monto: number;
  metodoPago: MetodoPagoEvento;
  fecha: string;
}

export interface DisponibilidadTipoEntrada {
  tipoEntrada: TipoEntrada;
  cantidadDisponible: number;
}

export interface IngresoEvento {
  id: string;
  eventoId: string;
  usuarioId: string;
  descripcion: string;
  monto: number;
  metodoPago: MetodoPagoEvento;
  fecha: string;
}

export interface GastoEvento {
  id: string;
  eventoId: string;
  usuarioId: string;
  descripcion: string;
  monto: number;
  metodoPago: MetodoPagoEvento;
  fecha: string;
}

export interface ResumenEvento {
  evento: Evento;
  ingresosManuales: number;
  ingresosAsignaciones: number;
  ingresosVentaDirecta: number;
  ingresosEntradas: number;
  totalIngresos: number;
  totalGastos: number;
  utilidad: number;
}

export interface ResumenCierreEvento {
  ingresosEfectivo: number;
  ingresosTransferencia: number;
  gastosEfectivo: number;
  gastosTransferencia: number;
  utilidadEfectivo: number;
  utilidadTransferencia: number;
  saldoResultanteEfectivo: number;
  saldoResultanteTransferencia: number;
}

export interface ResultadoCierreEvento {
  evento: Evento;
  resumen: ResumenCierreEvento;
}
