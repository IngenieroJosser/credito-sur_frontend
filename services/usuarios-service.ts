import { apiRequest } from '@/lib/api/api';
import { RolUsuario, EstadoUsuario } from '@/types/enums';

export type { RolUsuario, EstadoUsuario };

export interface Usuario {
  id: string;
  correo: string;
  nombres: string;
  apellidos: string;
  telefono: string | null;
  rol: RolUsuario;
  estado: EstadoUsuario;
  ultimoIngreso: string | null;
  intentosFallidos: number;
  debeCambiarContrasena: boolean;
  creadoEn: string;
  actualizadoEn: string;
  eliminadoEn: string | null;
  permisos?: string[];
}

export interface CreateUsuarioDto {
  correo: string;
  password: string;
  nombres: string;
  apellidos: string;
  telefono?: string;
  rol: RolUsuario;
  estado?: EstadoUsuario;
  creadoPorId?: string;
}

export interface UpdateUsuarioDto {
  correo?: string;
  nombres?: string;
  apellidos?: string;
  telefono?: string;
  rol?: RolUsuario;
  estado?: EstadoUsuario;
  debeCambiarContrasena?: boolean;
}

export interface ChangePasswordDto {
  contrasenaActual?: string;
  contrasenaNueva: string;
}

export const usuariosService = {
  /**
   * Obtener todos los usuarios
   */
  async obtenerTodos(): Promise<Usuario[]> {
    return apiRequest<Usuario[]>('GET', '/usuarios');
  },

  /**
   * Obtener un usuario por ID
   */
  async obtenerPorId(id: string): Promise<Usuario> {
    return apiRequest<Usuario>('GET', `/usuarios/${id}`);
  },

  /**
   * Crear un nuevo usuario
   */
  async crear(data: CreateUsuarioDto): Promise<Usuario> {
    return apiRequest<Usuario>('POST', '/usuarios', data);
  },

  /**
   * Actualizar un usuario existente
   */
  async actualizar(id: string, data: UpdateUsuarioDto): Promise<Usuario> {
    return apiRequest<Usuario>('PATCH', `/usuarios/${id}`, data);
  },

  /**
   * Eliminar un usuario (soft delete)
   */
  async eliminar(id: string): Promise<void> {
    return apiRequest<void>('DELETE', `/usuarios/${id}`);
  },

  /**
   * Cambiar contrasena de un usuario
   */
  async cambiarContrasena(id: string, data: ChangePasswordDto): Promise<void> {
    return apiRequest<void>('PATCH', `/usuarios/${id}/password`, data);
  },

  /**
   * Resetear contrasena de un usuario
   */
  async resetearContrasena(id: string): Promise<{ contrasenaTemporal: string }> {
    return apiRequest<{ contrasenaTemporal: string }>('POST', `/usuarios/${id}/reset-password`);
  },

  /**
   * Bloquear/desbloquear usuario
   */
  async toggleEstado(id: string, estado: EstadoUsuario): Promise<Usuario> {
    return apiRequest<Usuario>('PATCH', `/usuarios/${id}`, { estado });
  },

  /**
   * Asignar permisos específicos a un usuario
   */
  async asignarPermisos(id: string, permisos: string[]): Promise<void> {
    return apiRequest<void>('POST', `/usuarios/${id}/permisos`, { permisos });
  }
};
