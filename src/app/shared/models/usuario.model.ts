export interface Usuario {
  id: string;
  nombre: string;
  usuario: string;
  roles: string[];
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
