import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { EventosService } from '../services/eventos.service';
import { EventoFormDialogComponent } from '../components/evento-form-dialog.component';

@Component({
  selector: 'app-eventos-lista',
  standalone: true,
  imports: [
    DatePipe,
    DecimalPipe,
    RouterLink,
    TableModule,
    TagModule,
    ButtonModule,
    InputTextModule,
    ToastModule,
    EventoFormDialogComponent,
  ],
  providers: [MessageService],
  templateUrl: './eventos-lista.component.html',
  styleUrl: './eventos-lista.component.scss',
})
export class EventosListaComponent implements OnInit {
  private eventosService = inject(EventosService);

  readonly eventos = this.eventosService.eventos;
  readonly cargando = this.eventosService.cargando;

  readonly query = signal('');
  readonly dialogVisible = signal(false);

  readonly filas = computed(() => {
    const q = this.query().trim().toLowerCase();
    let lista = this.eventos();
    if (q) {
      lista = lista.filter((e) => e.nombre.toLowerCase().includes(q));
    }
    return lista;
  });

  readonly cantidadActivos = computed(
    () => this.eventos().filter((e) => e.estado === 'ACTIVO').length,
  );
  readonly cantidadCerrados = computed(
    () => this.eventos().filter((e) => e.estado === 'CERRADO').length,
  );
  readonly cantidadAnulados = computed(
    () => this.eventos().filter((e) => e.estado === 'ANULADO').length,
  );

  ngOnInit(): void {
    this.eventosService.cargarEventos();
  }

  onBuscar(valor: string): void {
    this.query.set(valor);
  }

  abrirCrear(): void {
    this.dialogVisible.set(true);
  }

  colorEstado(estado: string): { background: string; color: string } {
    if (estado === 'ACTIVO') return { background: 'rgba(18,216,151,.14)', color: '#0A7D58' };
    if (estado === 'CERRADO') return { background: 'rgba(10,22,56,.08)', color: '#0A1638' };
    return { background: 'rgba(224,79,79,.1)', color: '#C0392B' };
  }
}
