import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MenuModule, Menu } from 'primeng/menu';
import { ToastModule } from 'primeng/toast';
import { MessageService, MenuItem } from 'primeng/api';
import { AuthService } from '../../../core/auth/auth.service';
import { Producto } from '../models/producto.model';
import { InventarioService } from '../services/inventario.service';
import { ProductoFormDialogComponent } from '../components/producto-form-dialog.component';
import { CompraDialogComponent } from '../components/compra-dialog.component';
import { PerdidaDialogComponent } from '../components/perdida-dialog.component';
import { AjusteDialogComponent } from '../components/ajuste-dialog.component';
import { StockMinimoDialogComponent } from '../components/stock-minimo-dialog.component';

interface EstadoStock {
  label: string;
  bg: string;
  color: string;
}

@Component({
  selector: 'app-inventario-lista',
  standalone: true,
  imports: [
    DecimalPipe,
    RouterLink,
    TableModule,
    TagModule,
    ButtonModule,
    InputTextModule,
    MenuModule,
    ToastModule,
    ProductoFormDialogComponent,
    CompraDialogComponent,
    PerdidaDialogComponent,
    AjusteDialogComponent,
    StockMinimoDialogComponent,
  ],
  providers: [MessageService],
  templateUrl: './inventario-lista.component.html',
  styleUrl: './inventario-lista.component.scss',
})
export class InventarioListaComponent implements OnInit {
  private inventarioService = inject(InventarioService);
  private authService = inject(AuthService);
  private messageService = inject(MessageService);

  readonly productos = this.inventarioService.productos;
  readonly cargando = this.inventarioService.cargando;
  readonly stockMinimo = this.inventarioService.stockMinimo;

  readonly query = signal('');
  readonly soloPocoStock = signal(false);

  readonly productoDialogVisible = signal(false);
  readonly productoEnEdicion = signal<Producto | null>(null);

  readonly compraVisible = signal(false);
  readonly perdidaVisible = signal(false);
  readonly ajusteVisible = signal(false);
  readonly stockMinVisible = signal(false);
  readonly productoFijo = signal<Producto | null>(null);

  readonly usuarioMenuSeleccionado = signal<Producto | null>(null);

  readonly esAdmin = computed(() => this.authService.tieneRol('Admin'));
  readonly puedeRegistrarCompra = computed(
    () => this.authService.tieneRol('Admin') || this.authService.tieneRol('Compras'),
  );

  readonly filas = computed(() => {
    const q = this.query().trim().toLowerCase();
    const min = this.stockMinimo();
    let lista = this.productos();
    if (this.soloPocoStock()) {
      lista = lista.filter((p) => p.stockActual <= min);
    }
    if (q) {
      lista = lista.filter((p) => p.nombre.toLowerCase().includes(q));
    }
    return lista;
  });

  readonly totalProductos = computed(() => this.productos().length);
  readonly valorInventario = computed(() =>
    this.productos().reduce((acc, p) => acc + p.stockActual * p.costoUnitario, 0),
  );
  readonly alertasStockBajo = computed(
    () => this.productos().filter((p) => p.stockActual <= this.stockMinimo()).length,
  );

  readonly accionesMenu = computed<MenuItem[]>(() => {
    const producto = this.usuarioMenuSeleccionado();
    if (!producto) return [];
    const items: MenuItem[] = [];
    if (this.esAdmin()) {
      items.push({ label: 'Editar producto', icon: 'pi pi-pencil', command: () => this.abrirEditar(producto) });
    }
    if (this.puedeRegistrarCompra()) {
      items.push({ label: 'Registrar compra', icon: 'pi pi-arrow-up', command: () => this.abrirCompra(producto) });
    }
    if (this.esAdmin()) {
      items.push({ label: 'Registrar pérdida', icon: 'pi pi-arrow-down', command: () => this.abrirPerdida(producto) });
      items.push({ label: 'Registrar ajuste', icon: 'pi pi-sliders-h', command: () => this.abrirAjuste(producto) });
    }
    return items;
  });

  ngOnInit(): void {
    this.inventarioService.cargarProductos();
    this.inventarioService.cargarStockMinimo();
  }

  onBuscar(valor: string): void {
    this.query.set(valor);
  }

  toggleSoloPocoStock(): void {
    this.soloPocoStock.update((v) => !v);
  }

  estado(producto: Producto): EstadoStock {
    const min = this.stockMinimo();
    if (producto.stockActual <= 0) {
      return { label: 'Agotado', bg: 'rgba(224,79,79,.12)', color: '#C0392B' };
    }
    if (producto.stockActual <= min) {
      return { label: 'Bajo stock', bg: 'rgba(224,79,79,.1)', color: '#C0392B' };
    }
    if (producto.stockActual < min * 1.5) {
      return { label: 'Suficiente', bg: 'rgba(232,167,60,.16)', color: '#B8791C' };
    }
    return { label: 'Disponible', bg: 'rgba(18,216,151,.14)', color: '#0A7D58' };
  }

  abrirCrear(): void {
    this.productoEnEdicion.set(null);
    this.productoDialogVisible.set(true);
  }

  abrirEditar(producto: Producto): void {
    this.productoEnEdicion.set(producto);
    this.productoDialogVisible.set(true);
  }

  abrirCompra(producto: Producto | null): void {
    this.productoFijo.set(producto);
    this.compraVisible.set(true);
  }

  abrirPerdida(producto: Producto | null): void {
    this.productoFijo.set(producto);
    this.perdidaVisible.set(true);
  }

  abrirAjuste(producto: Producto | null): void {
    this.productoFijo.set(producto);
    this.ajusteVisible.set(true);
  }

  seleccionarYAbrirMenu(producto: Producto, menu: Menu, evento: Event): void {
    this.usuarioMenuSeleccionado.set(producto);
    menu.toggle(evento);
  }
}
