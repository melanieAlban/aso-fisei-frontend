export interface Usuario {
  id: string;
  nombre: string;
  usuario: string;
  roles: string[];
  activo?: boolean;
  fechaUltimoAcceso?: string | null;
}

export interface LoginResponseData {
  accessToken: string;
  refreshToken: string;
  usuario: Usuario;
}

export interface RefreshResponseData {
  accessToken: string;
}

export interface RespuestaEstandar<T> {
  success: boolean;
  data: T;
  meta: { timestamp: string };
}
