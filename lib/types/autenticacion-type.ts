export interface LoginData {
  nombres?: string;
  identificador?: string;
  correo?: string;
  email?: string;
  contrasena: string;
}

export interface SidebarItem {
  id: string;
  nombre: string;
  icono: string | null;
  ruta: string | null;
  orden: number;
}

export interface SidebarModulo {
  modulo: string;
  items: SidebarItem[];
}

export interface AuthResponse {
  access_token: string;
  usuario: {
    id: string;
    nombres: string;
    apellidos: string;
    rol: RolUsuario;
    correo?: string;
    telefono?: string;
    permisos?: string[];
    rutaDefault?: string;
    sidebar?: SidebarModulo[];
  };
}

/**
 * Lo que devuelve `GET /auth/perfil`.
 *
 * Ese endpoint devuelve `req.user`, que arma la estrategia JWT del backend
 * (`jwt.strategy.validate`). Los datos salen de la fila del usuario, no del token:
 * el token solo lleva `sub`, `nombres`, `rol` y `permisos`.
 *
 * Los opcionales son los que pueden ser NULL en la base (correo, apellidos y
 * telefono lo son), no campos que el endpoint se olvide de mandar. `apellidos`
 * figuraba aqui como OBLIGATORIO y ademas no venia del backend, y la pantalla de
 * perfil lo escribia en el cache de localStorage sin respaldo: cuando fallaba la
 * llamada del usuario completo, ese `undefined` borraba el apellido guardado (ver
 * `lib/auth/mezclar-perfil-en-cache.ts`).
 *
 * Para el usuario completo, con fechas y contadores, sigue estando
 * `usuariosService.obtenerPorId`.
 */
export interface UserProfile {
  id: string;
  nombres: string;
  rol: RolUsuario;
  permisos?: string[];
  /** Nullable en la base. */
  apellidos?: string;
  /** Nullable en la base. */
  correo?: string;
  /** Nullable en la base. */
  telefono?: string;
  estado?: string;
}

export type RolUsuario = string;
