// Convierte una fecha de un <input type="date"> ("yyyy-MM-dd") al inicio o
// fin exacto de ese día en hora LOCAL del navegador, como ISO string.
//
// Sin esto, mandar la fecha "pelada" al backend hace que "hasta" se
// interprete como la medianoche de ese día (00:00:00), no el final — un
// filtro "desde X hasta X" (ej. "solo hoy") termina pidiendo un rango de
// duración casi cero y no encuentra nada, aunque sí haya datos ese día.
export function inicioDelDia(fechaStr: string): string {
  const [y, m, d] = fechaStr.split('-').map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0).toISOString();
}

export function finDelDia(fechaStr: string): string {
  const [y, m, d] = fechaStr.split('-').map(Number);
  return new Date(y, m - 1, d, 23, 59, 59, 999).toISOString();
}
