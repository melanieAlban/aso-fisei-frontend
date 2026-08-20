import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { AuthService } from '../../../core/auth/auth.service';
import { CajaService } from '../services/caja.service';
import { FondoGeneralService } from '../services/fondo-general.service';
import { AperturaCajaDialogComponent } from '../components/apertura-caja-dialog.component';
import { ArqueoDialogComponent } from '../components/arqueo-dialog.component';
import { AjusteSaldoInicialDialogComponent } from '../components/ajuste-saldo-inicial-dialog.component';

@Component({
  selector: 'app-caja',
  standalone: true,
  imports: [
    DecimalPipe,
    ButtonModule,
    ToastModule,
    AperturaCajaDialogComponent,
    ArqueoDialogComponent,
    AjusteSaldoInicialDialogComponent,
  ],
  providers: [MessageService],
  templateUrl: './caja.component.html',
  styleUrl: './caja.component.scss',
})
export class CajaComponent implements OnInit {
  private cajaService = inject(CajaService);
  private fondoGeneralService = inject(FondoGeneralService);
  private authService = inject(AuthService);

  readonly cajaActual = this.cajaService.cajaActual;
  readonly verificando = this.cajaService.verificando;
  readonly resumenDiario = this.cajaService.resumenDiario;
  readonly saldoFondo = this.fondoGeneralService.saldo;

  readonly aperturaVisible = signal(false);
  readonly arqueoVisible = signal(false);
  readonly ajusteVisible = signal(false);

  readonly esAdmin = computed(() => this.authService.tieneRol('Admin'));

  readonly totalVentasEfectivoHoy = computed(() =>
    this.resumenDiario().reduce((acc, r) => acc + r.totalEfectivo, 0),
  );
  readonly totalVentasTransferenciaHoy = computed(() =>
    this.resumenDiario().reduce((acc, r) => acc + r.totalTransferencia, 0),
  );
  readonly totalCantidadVentasHoy = computed(() =>
    this.resumenDiario().reduce((acc, r) => acc + r.cantidadVentas, 0),
  );

  ngOnInit(): void {
    this.cajaService.verificarCajaActual();
    this.fondoGeneralService.cargarSaldo();
  }

  abrirApertura(): void {
    this.aperturaVisible.set(true);
  }

  abrirArqueo(): void {
    this.arqueoVisible.set(true);
  }

  abrirAjuste(): void {
    this.ajusteVisible.set(true);
  }
}
