import { apiRequest } from '@/lib/api/api';

export interface Permiso {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  modulo: string;
  activo: boolean;
  creadoEn: string;
  actualizadoEn: string;
}

export interface CrearPermisoDto {
  codigo: string;
  nombre: string;
  descripcion?: string;
  modulo: string;
  activo?: boolean;
}

export interface ActualizarPermisoDto {
  nombre?: string;
  descripcion?: string;
  modulo?: string;
  activo?: boolean;
}

export const permisosService = {
  /**
   * Obtener todos los permisos
   */
  async obtenerTodos(): Promise<Permiso[]> {
    return apiRequest<Permiso[]>('GET', '/permissions');
  },

  /**
   * Obtener un permiso por ID
   */
  async obtenerPorId(id: string): Promise<Permiso> {
    return apiRequest<Permiso>('GET', `/permissions/${id}`);
  },

  /**
   * Crear un nuevo permiso
   */
  async crear(data: CrearPermisoDto): Promise<Permiso> {
    return apiRequest<Permiso>('POST', '/permissions', data);
  },

  /**
   * Actualizar un permiso
   */
  async actualizar(id: string, data: ActualizarPermisoDto): Promise<Permiso> {
    return apiRequest<Permiso>('PATCH', `/permissions/${id}`, data);
  },

  /**
   * Eliminar un permiso
   */
  async eliminar(id: string): Promise<void> {
    return apiRequest<void>('DELETE', `/permissions/${id}`);
  }
};
