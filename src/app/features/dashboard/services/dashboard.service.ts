import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';
import { RespuestaEstandar } from '../../../shared/models/usuario.model';
import { Dashboard } from '../models/dashboard.model';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private api = inject(ApiService);

  private readonly _dashboard = signal<Dashboard | null>(null);
  readonly dashboard = this._dashboard.asReadonly();

  private readonly _cargando = signal(false);
  readonly cargando = this._cargando.asReadonly();

  cargar(): void {
    this._cargando.set(true);
    this.api.get<RespuestaEstandar<Dashboard>>('/dashboard').subscribe({
      next: (respuesta) => {
        this._dashboard.set(respuesta.data);
        this._cargando.set(false);
      },
      error: () => this._cargando.set(false),
    });
  }
}
