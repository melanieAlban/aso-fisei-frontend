import { Component, OnInit, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { ChartModule } from 'primeng/chart';
import { AuthService } from '../../../core/auth/auth.service';
import { DashboardService } from '../services/dashboard.service';
import { redondearDinero } from '../../../shared/utils/dinero.util';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [DecimalPipe, RouterLink, ChartModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  private dashboardService = inject(DashboardService);
  private authService = inject(AuthService);

  readonly dashboard = this.dashboardService.dashboard;
  readonly cargando = this.dashboardService.cargando;
  readonly nombreUsuario = computed(() => this.authService.currentUser()?.nombre?.split(' ')[0] ?? '');

  readonly esCompleto = computed(() => this.dashboard()?.fondoGeneral !== undefined);

  readonly hoyTexto = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  readonly saldoFondoTotal = computed(() => {
    const fondo = this.dashboard()?.fondoGeneral;
    return fondo ? redondearDinero(fondo.saldoEfectivo + fondo.saldoTransferencia) : 0;
  });

  readonly caja = computed(() => this.dashboard()?.cajaActual);
  readonly ventasCajaTotal = computed(() => {
    const c = this.caja();
    if (!c || !c.abierta) return 0;
    return (c.ventasEfectivoHoy ?? 0) + (c.ventasTransferenciaHoy ?? 0);
  });

  readonly maxVendido = computed(() => {
    const lista = this.dashboard()?.productosMasVendidos ?? [];
    return lista.length > 0 ? Math.max(...lista.map((p) => p.cantidadVendida)) : 1;
  });

  readonly chartData = computed(() => {
    const dias = this.dashboard()?.ventasUltimos7Dias ?? [];
    return {
      labels: dias.map((d) => this.formatoDiaCorto(d.fecha)),
      datasets: [
        {
          label: 'Ventas',
          data: dias.map((d) => d.total),
          backgroundColor: '#12D897',
          borderRadius: 6,
          maxBarThickness: 46,
        },
      ],
    };
  });

  readonly chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false } },
      y: { beginAtZero: true, grid: { color: '#EEF0F3' } },
    },
  };

  ngOnInit(): void {
    this.dashboardService.cargar();
  }

  formatoDiaCorto(fecha: string): string {
    const texto = new Date(fecha + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'short' });
    return texto.charAt(0).toUpperCase() + texto.slice(1, 3);
  }

  colorStock(qty: number): { bg: string; color: string } {
    return qty <= 3
      ? { bg: 'rgba(224,79,79,.1)', color: '#C0392B' }
      : { bg: 'rgba(232,167,60,.14)', color: '#B8791C' };
  }
}
