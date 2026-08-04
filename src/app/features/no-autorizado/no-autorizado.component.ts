import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-no-autorizado',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="wrap">
      <h1>Acceso no autorizado</h1>
      <p>No tienes permisos para ver esta sección.</p>
      <a routerLink="/">Volver al dashboard</a>
    </div>
  `,
  styles: [
    `
      .wrap {
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 12px;
        text-align: center;
        font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
        color: #0a1638;
      }
      h1 {
        font-size: 24px;
        font-weight: 800;
        margin: 0;
      }
      p {
        color: #5b6478;
        margin: 0;
      }
    `,
  ],
})
export class NoAutorizadoComponent {}
