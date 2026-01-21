export interface LoginData {
  nombres: string;
  contrasena: string;
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
}

export type RolUsuario = 
  | 'SUPER_ADMINISTRADOR' 
  | 'COORDINADOR' 
  | 'SUPERVISOR' 
  | 'COBRADOR' 
  | 'CONTADOR';