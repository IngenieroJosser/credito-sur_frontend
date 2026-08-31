import { apiRequest } from '@/lib/api/api';
import { conRespaldoOffline } from '@/lib/offline/conRespaldoOffline';

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
    const tempId = `temp-${Date.now()}`;
    return conRespaldoOffline(
      () => apiRequest<Permiso>('POST', '/permissions', data),
      { type: 'permiso_crear', endpoint: '/permissions', method: 'POST', data, description: `Crear permiso: ${data.nombre}`, tempId },
      { id: tempId, codigo: data.codigo, nombre: data.nombre, descripcion: data.descripcion ?? null, modulo: data.modulo, activo: data.activo ?? true, creadoEn: new Date().toISOString(), actualizadoEn: new Date().toISOString() },
    );
  },

  /**
   * Actualizar un permiso
   */
  async actualizar(id: string, data: ActualizarPermisoDto): Promise<Permiso> {
    return conRespaldoOffline(
      () => apiRequest<Permiso>('PATCH', `/permissions/${id}`, data),
      { type: 'permiso_actualizar', endpoint: `/permissions/${id}`, method: 'PATCH', data, description: `Actualizar permiso ${id}` },
      { id, codigo: '', nombre: data.nombre ?? '', descripcion: data.descripcion ?? null, modulo: data.modulo ?? '', activo: data.activo ?? true, creadoEn: '', actualizadoEn: new Date().toISOString() },
    );
  },

  /**
   * Eliminar un permiso
   */
  async eliminar(id: string): Promise<void> {
    return conRespaldoOffline(
      () => apiRequest<void>('DELETE', `/permissions/${id}`),
      { type: 'permiso_eliminar', endpoint: `/permissions/${id}`, method: 'DELETE', description: `Eliminar permiso ${id}` },
      undefined,
    );
  }
};

