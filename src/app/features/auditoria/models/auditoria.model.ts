export interface AuditLog {
  id: string;
  usuarioId: string | null;
  usuarioNombre: string | null;
  modulo: string;
  accion: string;
  registroAfectado: string | null;
  valorAnterior: unknown;
  valorNuevo: unknown;
  fecha: string;
}
