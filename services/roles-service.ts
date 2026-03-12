import { apiRequest } from '@/lib/api/api';

export interface Rol {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  creadoEn: string;
  actualizadoEn: string;
}

export interface CrearRolDto {
  codigo: string;
  nombre: string;
  descripcion?: string;
  activo?: boolean;
}

export interface ActualizarRolDto {
  nombre?: string;
  descripcion?: string;
  activo?: boolean;
}

export const rolesService = {
  /**
   * Obtener todos los roles
   */
  async obtenerTodos(): Promise<Rol[]> {
    return apiRequest<Rol[]>('GET', '/roles');
  },

  /**
   * Obtener un rol por ID
   */
  async obtenerPorId(id: string): Promise<Rol> {
    return apiRequest<Rol>('GET', `/roles/${id}`);
  },

  /**
   * Crear un nuevo rol
   */
  async crear(data: CrearRolDto): Promise<Rol> {
    return apiRequest<Rol>('POST', '/roles', data);
  },

  /**
   * Actualizar un rol
   */
  async actualizar(id: string, data: ActualizarRolDto): Promise<Rol> {
    return apiRequest<Rol>('PATCH', `/roles/${id}`, data);
  },

  /**
   * Eliminar un rol
   */
  async eliminar(id: string): Promise<void> {
    return apiRequest<void>('DELETE', `/roles/${id}`);
  },

  /**
   * Asignar permisos a un rol
   */
  async asignarPermisos(id: string, permisosIds: string[]): Promise<Rol> {
    return apiRequest<Rol>('POST', `/roles/${id}/permisos`, { permisosIds });
  }
};

