export interface Producto {
  id: string;
  nombre: string;
  costoUnitario: number;
  precioVenta: number;
  stockActual: number;
  activo: boolean;
  createdAt: string;
}
