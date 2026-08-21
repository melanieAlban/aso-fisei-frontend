import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';
import { RespuestaEstandar } from '../../../shared/models/usuario.model';
import { AuditLog } from '../models/auditoria.model';

interface ListarAuditLogsData {
  registros: AuditLog[];
  total: number;
  page: number;
  limit: number;
}

export interface FiltrosAuditLog {
  usuarioId?: string;
  modulo?: string;
  accion?: string;
  desde?: string;
  hasta?: string;
}

@Injectable({ providedIn: 'root' })
export class AuditoriaService {
  private api = inject(ApiService);

  private readonly _registros = signal<AuditLog[]>([]);
  readonly registros = this._registros.asReadonly();

  private readonly _total = signal(0);
  readonly total = this._total.asReadonly();

  private readonly _cargando = signal(false);
  readonly cargando = this._cargando.asReadonly();

  cargar(filtros: FiltrosAuditLog = {}): void {
    this._cargando.set(true);
    const params = new URLSearchParams();
    if (filtros.usuarioId) params.set('usuarioId', filtros.usuarioId);
    if (filtros.modulo) params.set('modulo', filtros.modulo);
    if (filtros.accion) params.set('accion', filtros.accion);
    if (filtros.desde) params.set('desde', filtros.desde);
    if (filtros.hasta) params.set('hasta', filtros.hasta);
    params.set('limit', '100');
    const qs = params.toString();

    this.api.get<RespuestaEstandar<ListarAuditLogsData>>(`/audit-logs?${qs}`).subscribe({
      next: (respuesta) => {
        this._registros.set(respuesta.data.registros);
        this._total.set(respuesta.data.total);
        this._cargando.set(false);
      },
      error: () => this._cargando.set(false),
    });
  }
}
