import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { DeudaConAbonos, TipoDeuda } from '../models/deuda.model';
import { DeudasService } from '../services/deudas.service';
import { DeudaFormDialogComponent } from '../components/deuda-form-dialog.component';
import { AbonoDialogComponent } from '../components/abono-dialog.component';

interface EstadoBadge {
  label: string;
  bg: string;
  color: string;
}

@Component({
  selector: 'app-deudas-lista',
  standalone: true,
  imports: [
    DecimalPipe,
    TableModule,
    TagModule,
    ButtonModule,
    InputTextModule,
    ToastModule,
    DeudaFormDialogComponent,
    AbonoDialogComponent,
  ],
  providers: [MessageService],
  templateUrl: './deudas-lista.component.html',
  styleUrl: './deudas-lista.component.scss',
})
export class DeudasListaComponent implements OnInit {
  private deudasService = inject(DeudasService);

  readonly deudas = this.deudasService.deudas;
  readonly cargando = this.deudasService.cargando;

  readonly query = signal('');
  readonly tab = signal<TipoDeuda>('POR_COBRAR');

  readonly deudaDialogVisible = signal(false);
  readonly abonoVisible = signal(false);
  readonly deudaSeleccionada = signal<DeudaConAbonos | null>(null);

  readonly esCobrar = computed(() => this.tab() === 'POR_COBRAR');
  readonly colContraparte = computed(() => (this.esCobrar() ? 'Deudor' : 'Acreedor'));
  readonly accionLabel = computed(() => (this.esCobrar() ? 'Abonar' : 'Pagar'));

  readonly filas = computed(() => {
    const q = this.query().trim().toLowerCase();
    let lista = this.deudas().filter((d) => d.deuda.tipo === this.tab());
    if (q) {
      lista = lista.filter((d) => d.deuda.contraparte.toLowerCase().includes(q));
    }
    return lista;
  });

  readonly totalGeneral = computed(() =>
    this.deudas()
      .filter((d) => d.deuda.tipo === this.tab())
      .reduce((acc, d) => acc + d.deuda.montoTotal, 0),
  );
  readonly totalAbonado = computed(() =>
    this.deudas()
      .filter((d) => d.deuda.tipo === this.tab())
      .reduce((acc, d) => acc + d.deuda.montoAbonado, 0),
  );
  readonly totalPendiente = computed(() => this.totalGeneral() - this.totalAbonado());

  ngOnInit(): void {
    this.deudasService.cargarDeudas();
  }

  onBuscar(valor: string): void {
    this.query.set(valor);
  }

  cambiarTab(tipo: TipoDeuda): void {
    this.tab.set(tipo);
    this.query.set('');
  }

  saldoPendiente(d: DeudaConAbonos): number {
    return d.deuda.montoTotal - d.deuda.montoAbonado;
  }

  progreso(d: DeudaConAbonos): number {
    return d.deuda.montoTotal > 0 ? Math.round((d.deuda.montoAbonado / d.deuda.montoTotal) * 100) : 0;
  }

  estado(d: DeudaConAbonos): EstadoBadge {
    switch (d.deuda.estado) {
      case 'CANCELADA':
        return { label: 'Cancelada', bg: 'rgba(18,216,151,.14)', color: '#0A7D58' };
      case 'PARCIAL':
        return { label: 'Parcial', bg: 'rgba(232,167,60,.16)', color: '#B8791C' };
      default:
        return { label: 'Pendiente', bg: 'rgba(224,79,79,.1)', color: '#C0392B' };
    }
  }

  abrirCrear(): void {
    this.deudaDialogVisible.set(true);
  }

  abrirAbono(d: DeudaConAbonos): void {
    this.deudaSeleccionada.set(d);
    this.abonoVisible.set(true);
  }
}
