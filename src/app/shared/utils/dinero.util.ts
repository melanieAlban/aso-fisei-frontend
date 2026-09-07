// Evita errores de precisión de punto flotante de JS (ej. 29.9 - 17 da
// 12.899999999999999, no 12.9) en cualquier monto calculado en el frontend
// por suma/resta antes de mostrarlo o enviarlo al backend.
export function redondearDinero(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

// Convierte a centavos enteros para comparar/sumar montos sin arrastrar el
// mismo problema de precisión (ej. al validar que dos montos parciales sumen
// exactamente el total de un pago mixto).
export function aCentavosDinero(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100);
}
