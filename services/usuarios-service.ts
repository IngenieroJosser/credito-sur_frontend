import { logger } from '@/lib/logger'
import { apiRequest } from '@/lib/api/api';
import { syncService } from '@/lib/offline/syncService';
import { offlineStore } from '@/lib/offline/offlineDb';
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
    try {
      return await apiRequest<Usuario[]>('GET', '/usuarios');
    } catch (error) {
       if (typeof navigator !== 'undefined' && !navigator.onLine) {
        logger.log('[Offline Mode] Cargando usuarios desde cache local...');
        const cached = await offlineStore.getAll<Usuario>('usuarios');
        if (cached.length > 0) return cached;
      }
      throw error;
    }
  },

  /**
   * Obtener un usuario por ID
   */
  async obtenerPorId(id: string): Promise<Usuario> {
    try {
      return await apiRequest<Usuario>('GET', `/usuarios/${id}`);
    } catch (error) {
       if (typeof navigator !== 'undefined' && !navigator.onLine) {
        logger.log('[Offline Mode] Buscando usuario ID ' + id + ' en cache local...');
        const cached = await offlineStore.getById<Usuario>('usuarios', id);
        if (cached) return cached;
      }
      throw error;
    }
  },

  /**
   * Crear un nuevo usuario
   */
  async crear(data: CreateUsuarioDto): Promise<Usuario> {
    try {
      return await apiRequest<Usuario>('POST', '/usuarios', data);
    } catch (error: any) {
      if (
        (typeof navigator !== 'undefined' && !navigator.onLine) ||
        error?.statusCode === 0 || 
        error?.message?.includes('network') ||
        error?.code === 'ERR_NETWORK'
      ) {
        logger.log('[Offline Mode] Guardando creacion de usuario en cola...');
        return await syncService.enqueueOperation(
          'usuario_crear',
          '/usuarios',
          'POST',
          data,
          'Crear usuario: ' + data.nombres + ' ' + data.apellidos
        ) as unknown as Usuario;
      }
      throw error;
    }
  },

  /**
   * Actualizar un usuario existente
   */
  async actualizar(id: string, data: UpdateUsuarioDto): Promise<Usuario> {
    try {
      return await apiRequest<Usuario>('PATCH', `/usuarios/${id}`, data);
    } catch (error: any) {
      if (
        (typeof navigator !== 'undefined' && !navigator.onLine) ||
        error?.statusCode === 0 || 
        error?.message?.includes('network') ||
        error?.code === 'ERR_NETWORK'
      ) {
        logger.log('[Offline Mode] Guardando actualizacion de usuario en cola...');
        return await syncService.enqueueOperation(
          'usuario_actualizar',
          `/usuarios/${id}`,
          'PATCH',
          data,
          'Actualizar usuario ID: ' + id
        ) as unknown as Usuario;
      }
      throw error;
    }
  },

  /**
   * Eliminar un usuario (soft delete)
   */
  async eliminar(id: string): Promise<void> {
    try {
      return await apiRequest<void>('DELETE', `/usuarios/${id}`);
    } catch (error: any) {
      if (
        (typeof navigator !== 'undefined' && !navigator.onLine) ||
        error?.statusCode === 0 || 
        error?.message?.includes('network') ||
        error?.code === 'ERR_NETWORK'
      ) {
        logger.log('[Offline Mode] Guardando eliminacion de usuario en cola...');
        await syncService.enqueueOperation(
          'usuario_eliminar',
          `/usuarios/${id}`,
          'DELETE',
          null,
          'Eliminar usuario ID: ' + id
        );
        return;
      }
      throw error;
    }
  },

  /**
   * Cambiar contrasena de un usuario
   */
  async cambiarContrasena(id: string, data: ChangePasswordDto): Promise<void> {
    try {
      return await apiRequest<void>('PATCH', `/usuarios/${id}/password`, data);
    } catch (error: any) {
      if (
        (typeof navigator !== 'undefined' && !navigator.onLine) ||
        error?.statusCode === 0 || 
        error?.message?.includes('network') ||
        error?.code === 'ERR_NETWORK'
      ) {
        logger.log('[Offline Mode] Guardando cambio de contraseña en cola...');
        await syncService.enqueueOperation(
          'usuario_password',
          `/usuarios/${id}/password`,
          'PATCH',
          { contrasenaNueva: data.contrasenaNueva }, // Solo enviamos la nueva para sync posterior si la actual cambió
          'Cambiar contraseña usuario ID: ' + id
        );
        return;
      }
      throw error;
    }
  },

  /**
   * Resetear contrasena de un usuario
   */
  async resetearContrasena(id: string): Promise<{ contrasenaTemporal: string }> {
    try {
      return await apiRequest<{ contrasenaTemporal: string }>('POST', `/usuarios/${id}/reset-password`);
    } catch (error: any) {
      if (
        (typeof navigator !== 'undefined' && !navigator.onLine) ||
        error?.statusCode === 0 || 
        error?.message?.includes('network') ||
        error?.code === 'ERR_NETWORK'
      ) {
        logger.log('[Offline Mode] Guardando reset de contraseña en cola...');
        await syncService.enqueueOperation(
          'usuario_reset_password',
          `/usuarios/${id}/reset-password`,
          'POST',
          null,
          'Resetear contraseña usuario ID: ' + id
        );
        return { contrasenaTemporal: 'Pendiente de sincronizacion' };
      }
      throw error;
    }
  },

  /**
   * Bloquear/desbloquear usuario
   */
  async toggleEstado(id: string, estado: EstadoUsuario): Promise<Usuario> {
    try {
      return await apiRequest<Usuario>('PATCH', `/usuarios/${id}`, { estado });
    } catch (error: any) {
      if (
        (typeof navigator !== 'undefined' && !navigator.onLine) ||
        error?.statusCode === 0 || 
        error?.message?.includes('network') ||
        error?.code === 'ERR_NETWORK'
      ) {
        logger.log('[Offline Mode] Guardando cambio de estado de usuario en cola...');
        return await syncService.enqueueOperation(
          'usuario_toggle_estado',
          `/usuarios/${id}`,
          'PATCH',
          { estado },
          'Cambiar estado usuario ID: ' + id + ' a ' + estado
        ) as unknown as Usuario;
      }
      throw error;
    }
  },

  /**
   * Asignar permisos específicos a un usuario
   */
  async asignarPermisos(id: string, permisos: string[]): Promise<void> {
    try {
      return await apiRequest<void>('POST', `/usuarios/${id}/permisos`, { permisos });
    } catch (error: any) {
      if (
        (typeof navigator !== 'undefined' && !navigator.onLine) ||
        error?.statusCode === 0 || 
        error?.message?.includes('network') ||
        error?.code === 'ERR_NETWORK'
      ) {
        logger.log('[Offline Mode] Guardando asignacion de permisos en cola...');
        await syncService.enqueueOperation(
          'usuario_permisos',
          `/usuarios/${id}/permisos`,
          'POST',
          { permisos },
          'Asignar permisos usuario ID: ' + id
        );
        return;
      }
      throw error;
    }
  }
};


