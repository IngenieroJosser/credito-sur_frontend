export interface LoginData {
  nombres: string;
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

export interface UserProfile {
  id: string;
  nombres: string;
  apellidos: string;
  rol: RolUsuario;
  correo?: string;
  telefono?: string;
  estado?: string;
  permisos?: string[];
}

export type RolUsuario = string;