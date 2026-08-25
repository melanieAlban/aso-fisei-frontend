import { Injectable, signal } from '@angular/core';

export interface TemporizadorBillar {
  id: string;
  nombre: string;
  horaInicioTexto: string;
  horaFinTexto: string;
  finTimestamp: number;
}

const CLAVE_STORAGE = 'billar_temporizadores_activos';

@Injectable({ providedIn: 'root' })
export class BillarTimerService {
  private readonly _temporizadores = signal<TemporizadorBillar[]>(this.leerDeStorage());
  readonly temporizadores = this._temporizadores.asReadonly();

  private leerDeStorage(): TemporizadorBillar[] {
    try {
      const raw = localStorage.getItem(CLAVE_STORAGE);
      return raw ? (JSON.parse(raw) as TemporizadorBillar[]) : [];
    } catch {
      return [];
    }
  }

  private guardar(lista: TemporizadorBillar[]): void {
    try {
      localStorage.setItem(CLAVE_STORAGE, JSON.stringify(lista));
    } catch {
      // localStorage no disponible (modo privado, cuota llena, etc.) — el
      // temporizador sigue funcionando en memoria para esta pestaña.
    }
  }

  agregar(nombre: string, horaInicioTexto: string, horaFinTexto: string, finTimestamp: number): void {
    const nuevo: TemporizadorBillar = {
      id: crypto.randomUUID(),
      nombre,
      horaInicioTexto,
      horaFinTexto,
      finTimestamp,
    };
    this._temporizadores.update((lista) => {
      const actualizada = [...lista, nuevo];
      this.guardar(actualizada);
      return actualizada;
    });
  }

  quitar(id: string): void {
    this._temporizadores.update((lista) => {
      const actualizada = lista.filter((t) => t.id !== id);
      this.guardar(actualizada);
      return actualizada;
    });
  }
}
