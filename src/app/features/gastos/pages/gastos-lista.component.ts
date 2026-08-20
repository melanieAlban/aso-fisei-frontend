import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { Gasto } from '../models/gasto.model';
import { GastosService } from '../services/gastos.service';
import { GastoFormDialogComponent } from '../components/gasto-form-dialog.component';
import { AnularGastoDialogComponent } from '../components/anular-gasto-dialog.component';

@Component({
  selector: 'app-gastos-lista',
  standalone: true,
  imports: [
    DatePipe,
    DecimalPipe,
    TableModule,
    TagModule,
    ButtonModule,
    InputTextModule,
    ToastModule,
    GastoFormDialogComponent,
    AnularGastoDialogComponent,
  ],
  providers: [MessageService],
  templateUrl: './gastos-lista.component.html',
  styleUrl: './gastos-lista.component.scss',
})
export class GastosListaComponent implements OnInit {
  private gastosService = inject(GastosService);

  readonly gastos = this.gastosService.gastos;
  readonly categorias = this.gastosService.categorias;
  readonly cargando = this.gastosService.cargando;

  readonly query = signal('');

  readonly gastoDialogVisible = signal(false);
  readonly anularVisible = signal(false);
  readonly anularGastoId = signal('');
  readonly anularDescripcion = signal('');

  readonly filas = computed(() => {
    const q = this.query().trim().toLowerCase();
    let lista = this.gastos();
    if (q) {
      lista = lista.filter(
        (g) => g.descripcion.toLowerCase().includes(q) || g.categoria.toLowerCase().includes(q),
      );
    }
    return lista;
  });

  readonly totalActivos = computed(() =>
    this.gastos()
      .filter((g) => g.estado === 'ACTIVO')
      .reduce((acc, g) => acc + g.monto, 0),
  );
  readonly cantidadActivos = computed(
    () => this.gastos().filter((g) => g.estado === 'ACTIVO').length,
  );
  readonly cantidadAnulados = computed(
    () => this.gastos().filter((g) => g.estado === 'ANULADO').length,
  );

  ngOnInit(): void {
    this.gastosService.cargarGastos();
    this.gastosService.cargarCategorias();
  }

  onBuscar(valor: string): void {
    this.query.set(valor);
  }

  fuenteLabel(gasto: Gasto): string {
    return gasto.fuentePago === 'EFECTIVO_CAJA' ? 'Efectivo de caja' : `Fondo General (${gasto.moneda === 'EFECTIVO' ? 'efectivo' : 'transferencia'})`;
  }

  abrirCrear(): void {
    this.gastoDialogVisible.set(true);
  }

  abrirAnular(gasto: Gasto): void {
    this.anularGastoId.set(gasto.id);
    this.anularDescripcion.set(`${gasto.descripcion} · ${gasto.monto.toFixed(2)}`);
    this.anularVisible.set(true);
  }
}
