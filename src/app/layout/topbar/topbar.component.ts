import { Component, inject, output } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.scss',
})
export class TopbarComponent {
  private authService = inject(AuthService);

  readonly abrirMenu = output<void>();

  readonly currentUser = this.authService.currentUser;

  cerrarSesion(): void {
    this.authService.logout();
  }
}
