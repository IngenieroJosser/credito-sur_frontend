export interface LoginData {
  nombres: string;
  contrasena: string;
}

export interface AuthResponse {
  access_token: string;
  usuario: {
    id: string;
    correo: string;
    nombres: string;
    apellidos: string;
    rol: string;
    estado: string;
    debeCambiarContrasena?: boolean;
    ultimoIngreso: string | null;
  };
}

export type RolUsuario =
  | 'SUPER_ADMINISTRADOR'
  | 'COORDINADOR'
  | 'SUPERVISOR'
  | 'COBRADOR'
  | 'CONTADOR';
