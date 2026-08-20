export interface VentasResumen {
  total: number;
  cantidadTransacciones: number;
}

export interface CajaActual {
  abierta: boolean;
  fondoInicialEfectivo: number | null;
  ventasEfectivoHoy: number | null;
  ventasTransferenciaHoy: number | null;
}

export interface FondoGeneralResumen {
  saldoEfectivo: number;
  saldoTransferencia: number;
}

export interface ProductoPocoStock {
  id: string;
  nombre: string;
  stockActual: number;
}

export interface ProductosPocoStock {
  cantidad: number;
  productos: ProductoPocoStock[];
}

export interface ProductoMasVendido {
  productoId: string;
  nombre: string;
  cantidadVendida: number;
}

export interface GastosDelMes {
  total: number;
  cantidad: number;
}

export interface DeudaResumenTipo {
  cantidad: number;
  montoTotal: number;
}

export interface DeudasPendientes {
  porCobrar: DeudaResumenTipo;
  porPagar: DeudaResumenTipo;
}

export interface VentaPorDia {
  fecha: string;
  total: number;
}

export interface Dashboard {
  ventasHoy: VentasResumen;
  productosPocoStock: ProductosPocoStock;
  cajaActual?: CajaActual;
  fondoGeneral?: FondoGeneralResumen;
  productosMasVendidos?: ProductoMasVendido[];
  gastosDelMes?: GastosDelMes;
  deudasPendientes?: DeudasPendientes;
  ventasUltimos7Dias?: VentaPorDia[];
  eventosActivos?: null;
  entradasVendidas?: null;
}
