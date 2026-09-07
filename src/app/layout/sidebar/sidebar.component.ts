import { Component, computed, inject, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

interface NavItem {
  label: string;
  route: string;
  icon: string;
  soloAdmin?: boolean;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent {
  private authService = inject(AuthService);

  readonly open = input(false);
  readonly cerrar = output<void>();

  readonly currentUser = this.authService.currentUser;

  readonly iniciales = computed(() => {
    const nombre = this.currentUser()?.nombre ?? '';
    return nombre
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((parte) => parte[0]?.toUpperCase())
      .join('');
  });

  readonly rolPrincipal = computed(() => this.currentUser()?.roles[0] ?? 'Usuario');

  readonly navItems: NavItem[] = [
    { label: 'Usuarios y Roles', route: '/usuarios', icon: 'usuarios', soloAdmin: true },
    { label: 'Inventario', route: '/inventario', icon: 'inventario' },
    { label: 'Ventas', route: '/ventas', icon: 'ventas' },
    { label: 'Caja / Fondo', route: '/caja', icon: 'caja', soloAdmin: true },
    { label: 'Gastos', route: '/gastos', icon: 'gastos', soloAdmin: true },
    { label: 'Deudas', route: '/deudas', icon: 'deudas', soloAdmin: true },
    { label: 'Eventos', route: '/eventos', icon: 'eventos', soloAdmin: true },
    { label: 'Auditoría', route: '/auditoria', icon: 'auditoria', soloAdmin: true },
  ];

  visible(item: NavItem): boolean {
    return !item.soloAdmin || this.authService.tieneRol('Admin');
  }

  cerrarSesion(): void {
    this.authService.logout();
  }
}
