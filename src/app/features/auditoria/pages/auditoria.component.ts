import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { UsuariosService } from '../../usuarios/services/usuarios.service';
import { AuditLog } from '../models/auditoria.model';
import { AuditoriaService } from '../services/auditoria.service';

interface AvatarColores {
  bg: string;
  color: string;
}

interface TipoAccion {
  label: string;
  color: string;
}

const PALETA_AVATARES: [string, string][] = [
  ['#0E9E70', 'rgba(18,216,151,.14)'],
  ['#2A6FDB', 'rgba(42,111,219,.12)'],
  ['#6C5CE7', 'rgba(108,92,231,.12)'],
  ['#E0655B', 'rgba(224,101,91,.12)'],
];

@Component({
  selector: 'app-auditoria',
  standalone: true,
  imports: [DatePipe, TableModule, DialogModule, ButtonModule],
  templateUrl: './auditoria.component.html',
  styleUrl: './auditoria.component.scss',
})
export class AuditoriaComponent implements OnInit {
  private auditoriaService = inject(AuditoriaService);
  private usuariosService = inject(UsuariosService);

  readonly registros = this.auditoriaService.registros;
  readonly total = this.auditoriaService.total;
  readonly cargando = this.auditoriaService.cargando;
  readonly usuarios = this.usuariosService.usuarios;

  readonly fUsuarioId = signal('');
  readonly fModulo = signal('');
  readonly fAccion = signal('');
  readonly fDesde = signal('');
  readonly fHasta = signal('');

  readonly detalleVisible = signal(false);
  readonly detalleRegistro = signal<AuditLog | null>(null);

  readonly hasActiveFilters = computed(
    () => !!(this.fUsuarioId() || this.fModulo() || this.fAccion() || this.fDesde() || this.fHasta()),
  );

  ngOnInit(): void {
    this.usuariosService.cargarUsuarios();
    this.buscar();
  }

  onFUsuarioId(valor: string): void {
    this.fUsuarioId.set(valor);
    this.buscar();
  }

  onFModulo(valor: string): void {
    this.fModulo.set(valor);
    this.buscar();
  }

  onFAccion(valor: string): void {
    this.fAccion.set(valor);
    this.buscar();
  }

  onFDesde(valor: string): void {
    this.fDesde.set(valor);
    this.buscar();
  }

  onFHasta(valor: string): void {
    this.fHasta.set(valor);
    this.buscar();
  }

  limpiarFiltros(): void {
    this.fUsuarioId.set('');
    this.fModulo.set('');
    this.fAccion.set('');
    this.fDesde.set('');
    this.fHasta.set('');
    this.buscar();
  }

  abrirDetalle(registro: AuditLog): void {
    this.detalleRegistro.set(registro);
    this.detalleVisible.set(true);
  }

  initials(nombre: string | null): string {
    if (!nombre) return '?';
    return nombre
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((parte) => parte[0]?.toUpperCase())
      .join('');
  }

  avatarColores(nombre: string | null): AvatarColores {
    const texto = nombre ?? '—';
    let hash = 0;
    for (let i = 0; i < texto.length; i++) {
      hash = (hash * 31 + texto.charCodeAt(i)) >>> 0;
    }
    const [color, bg] = PALETA_AVATARES[hash % PALETA_AVATARES.length];
    return { bg, color };
  }

  tipoAccion(accion: string): TipoAccion {
    const metodo = accion.split(' ')[0];
    switch (metodo) {
      case 'POST':
        return { label: 'Creación', color: '#0E9E70' };
      case 'PATCH':
      case 'PUT':
        return { label: 'Edición', color: '#2A6FDB' };
      case 'DELETE':
        return { label: 'Eliminación', color: '#C0392B' };
      default:
        return { label: metodo, color: '#8A93A5' };
    }
  }

  formatoJson(valor: unknown): string {
    if (valor === null || valor === undefined) return '—';
    return JSON.stringify(valor, null, 2);
  }

  private buscar(): void {
    this.auditoriaService.cargar({
      usuarioId: this.fUsuarioId() || undefined,
      modulo: this.fModulo() || undefined,
      accion: this.fAccion() || undefined,
      desde: this.fDesde() || undefined,
      hasta: this.fHasta() || undefined,
    });
  }
}
