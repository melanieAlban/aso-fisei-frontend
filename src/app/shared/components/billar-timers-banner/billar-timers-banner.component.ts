import { Component, DestroyRef, inject, signal } from '@angular/core';
import { MessageService } from 'primeng/api';
import { BillarTimerService } from '../../../features/ventas/services/billar-timer.service';

interface TemporizadorVista {
  id: string;
  nombre: string;
  horaInicioTexto: string;
  horaFinTexto: string;
  vencido: boolean;
  restanteTexto: string;
}

@Component({
  selector: 'app-billar-timers-banner',
  standalone: true,
  imports: [],
  templateUrl: './billar-timers-banner.component.html',
  styleUrl: './billar-timers-banner.component.scss',
})
export class BillarTimersBannerComponent {
  private billarTimerService = inject(BillarTimerService);
  private messageService = inject(MessageService);
  private destroyRef = inject(DestroyRef);

  private readonly ahora = signal(Date.now());
  private readonly notificados = new Set<string>();

  constructor() {
    const intervalId = setInterval(() => this.ahora.set(Date.now()), 1000);
    this.destroyRef.onDestroy(() => clearInterval(intervalId));
  }

  // Plain method (no computed()) porque lee this.ahora() junto con el efecto
  // secundario de disparar el toast — un computed() no debe tener side effects.
  temporizadoresVista(): TemporizadorVista[] {
    const ahora = this.ahora();
    return this.billarTimerService.temporizadores().map((t) => {
      const restanteMs = t.finTimestamp - ahora;
      const vencido = restanteMs <= 0;

      if (vencido && !this.notificados.has(t.id)) {
        this.notificados.add(t.id);
        this.messageService.add({
          severity: 'warn',
          summary: `¡Se acabó el tiempo de ${t.nombre}!`,
          detail: `Debía terminar a las ${t.horaFinTexto}`,
          life: 15000,
        });
      }

      return {
        id: t.id,
        nombre: t.nombre,
        horaInicioTexto: t.horaInicioTexto,
        horaFinTexto: t.horaFinTexto,
        vencido,
        restanteTexto: vencido ? 'Tiempo terminado' : this.formatearRestante(restanteMs),
      };
    });
  }

  private formatearRestante(ms: number): string {
    const totalMin = Math.floor(ms / 60000);
    const horas = Math.floor(totalMin / 60);
    const minutos = totalMin % 60;
    if (horas > 0) return `Faltan ${horas}h ${minutos}min`;
    return `Faltan ${minutos} min`;
  }

  quitar(id: string): void {
    this.notificados.delete(id);
    this.billarTimerService.quitar(id);
  }
}
