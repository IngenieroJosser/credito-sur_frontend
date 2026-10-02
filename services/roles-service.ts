import { apiRequest } from '@/lib/api/api';
import { conRespaldoOffline } from '@/lib/offline/conRespaldoOffline';

export interface Rol {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  creadoEn: string;
  actualizadoEn: string;
}

/**
 * OJO: este servicio no tiene NINGUN consumidor, y dos de estos campos no existen
 * en el backend.
 *
 * Se comprobo con una sonda que compara los DTOs de los dos lados: `CreateRoleDto`
 * declara solo `nombre`, `descripcion` y `esSistema`, y el modelo `Rol` del schema
 * no tiene columnas `activo` ni `codigo`. Como el ValidationPipe global va con
 * `whitelist: true` sin `forbidNonWhitelisted`, si alguna pantalla llegara a usar
 * esto, esos dos campos se descartarian EN SILENCIO.
 *
 * Antes de conectar este servicio a una pantalla: declarar en el backend lo que se
 * necesite, o quitar de aqui lo que no existe.
 */
export interface CrearRolDto {
  /** No existe en el backend. */
  codigo: string;
  nombre: string;
  descripcion?: string;
  /** No existe en el backend. */
  activo?: boolean;
}

export interface ActualizarRolDto {
  nombre?: string;
  descripcion?: string;
  /** No existe en el backend. Ver la nota de `CrearRolDto`. */
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
    const tempId = `temp-${Date.now()}`;
    return conRespaldoOffline(
      () => apiRequest<Rol>('POST', '/roles', data),
      { type: 'rol_crear', endpoint: '/roles', method: 'POST', data, description: `Crear rol: ${data.nombre}`, tempId },
      { id: tempId, codigo: data.codigo, nombre: data.nombre, descripcion: data.descripcion ?? null, activo: data.activo ?? true, creadoEn: new Date().toISOString(), actualizadoEn: new Date().toISOString() },
    );
  },

  /**
   * Actualizar un rol
   */
  async actualizar(id: string, data: ActualizarRolDto): Promise<Rol> {
    return conRespaldoOffline(
      () => apiRequest<Rol>('PATCH', `/roles/${id}`, data),
      { type: 'rol_actualizar', endpoint: `/roles/${id}`, method: 'PATCH', data, description: `Actualizar rol ${id}` },
      { id, codigo: '', nombre: data.nombre ?? '', descripcion: data.descripcion ?? null, activo: data.activo ?? true, creadoEn: '', actualizadoEn: new Date().toISOString() },
    );
  },

  /**
   * Eliminar un rol
   */
  async eliminar(id: string): Promise<void> {
    return conRespaldoOffline(
      () => apiRequest<void>('DELETE', `/roles/${id}`),
      { type: 'rol_eliminar', endpoint: `/roles/${id}`, method: 'DELETE', description: `Eliminar rol ${id}` },
      undefined,
    );
  },

  /**
   * Asignar permisos a un rol
   */
  async asignarPermisos(id: string, permisosIds: string[]): Promise<Rol> {
    return conRespaldoOffline(
      () => apiRequest<Rol>('POST', `/roles/${id}/permisos`, { permisosIds }),
      { type: 'rol_asignar_permisos', endpoint: `/roles/${id}/permisos`, method: 'POST', data: { permisosIds }, description: `Asignar permisos a rol ${id}` },
      { id, codigo: '', nombre: '', descripcion: null, activo: true, creadoEn: '', actualizadoEn: new Date().toISOString() },
    );
  }
};

