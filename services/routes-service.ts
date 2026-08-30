import { apiRequest } from '@/lib/api/api';
import { syncService } from '@/lib/offline/syncService';
import { conRespaldoOffline } from '@/lib/offline/conRespaldoOffline';
import { logger } from '@/lib/logger';

export interface Route {
  id: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  zona: string;
  activa: boolean;
  cobradorId: string;
  supervisorId?: string;
  creadoEn: string;
  actualizadoEn: string;
  eliminadoEn?: string;
  
  // Relaciones
  cobrador_: {
    id: string;
    nombres: string;
    apellidos: string;
    correo: string;
    telefono?: string;
    rol: string;
  };
  supervisor?: {
    id: string;
    nombres: string;
    apellidos: string;
    correo: string;
    telefono?: string;
    rol: string;
  };
  asignaciones?: Array<{
    id: string;
    clienteId: string; // Added clienteId based on the instruction's implied structure
    cliente: {
      id: string;
      nombres: string;
      apellidos: string;
      dni: string;
      telefono?: string;
    };
  }>;
  
  // Estadísticas calculadas
  _count?: {
    asignaciones: number;
    gastos: number;
  };
  
  // Propiedades para compatibilidad con el frontend existente
  estado: 'ACTIVA' | 'INACTIVA' | 'PENDIENTE_ACTIVACION';
  cobrador: string; // Nombre completo
  clientesAsignados: number;
  clientesNuevos: number;
  cobranzaDelDia: number;
  metaDelDia: number;
  frecuenciaVisita: string;
}

export interface CreateRouteDto {
  codigo: string;
  nombre: string;
  descripcion?: string;
  zona: string;
  cobradorId: string;
  supervisorId?: string;
}

export interface UpdateRouteDto {
  codigo?: string;
  nombre?: string;
  descripcion?: string;
  zona?: string;
  cobradorId?: string;
  supervisorId?: string;
  activa?: boolean;
}

export interface RouteStatistics {
  totalRutas: number;
  rutasActivas: number;
  rutasInactivas: number;
  totalClientesAsignados: number;
  cobranzaHoy: number;
  metaHoy: number;
  porcentajeAvance: number;
  totalSupervisores: number;
}

export interface Cobrador {
  id: string;
  nombre: string;
  correo: string;
  telefono?: string;
}

export interface Supervisor {
  id: string;
  nombre: string;
  correo: string;
  telefono?: string;
  rol: string;
}

export interface PaginatedRoutes {
  data: Route[];
  meta: {
    total: number;
    skip: number;
    take: number;
  };
}

export const routesService = {
  // Obtener todas las rutas
  async getAll(options?: {
    page?: number;
    limit?: number;
    search?: string;
    activa?: boolean;
    cobradorId?: string;
    supervisorId?: string;
  }) {
    const params = new URLSearchParams();
    
    if (options?.page) params.append('page', options.page.toString());
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.search) params.append('search', options.search);
    if (options?.activa !== undefined) params.append('activa', options.activa.toString());
    if (options?.cobradorId) params.append('cobradorId', options.cobradorId);
    if (options?.supervisorId) params.append('supervisorId', options.supervisorId);
    
    const queryString = params.toString();
    const endpoint = queryString ? `/routes?${queryString}` : '/routes';
    
    return apiRequest<PaginatedRoutes>('GET', endpoint, undefined, { cacheTTL: 5000 }); // Reducir a 5 segundos para que los totales se vean frescos
  },

  // Obtener una ruta por ID
  async getById(id: string) {
    return apiRequest<Route>('GET', `/routes/${id}`, undefined, { cacheTTL: 0 });
  },

  // Crear una nueva ruta
  async create(data: CreateRouteDto) {
    const tempId = `temp-${Date.now()}`;
    return conRespaldoOffline(
      () => apiRequest<Route>('POST', '/routes', data),
      { type: 'ruta_crear', endpoint: '/routes', method: 'POST', data, description: `Crear ruta`, tempId },
      { id: tempId, ...(data as any) } as Route,
    );
  },

  // Actualizar una ruta
  async update(id: string, data: UpdateRouteDto) {
    return conRespaldoOffline(
      () => apiRequest<Route>('PATCH', `/routes/${id}`, data),
      { type: 'ruta_actualizar', endpoint: `/routes/${id}`, method: 'PATCH', data, description: `Actualizar ruta ${id}` },
      { id, ...(data as any) } as Route,
    );
  },

  // Eliminar una ruta (soft delete)
  async delete(id: string) {
    return conRespaldoOffline(
      () => apiRequest<void>('DELETE', `/routes/${id}`),
      { type: 'ruta_eliminar', endpoint: `/routes/${id}`, method: 'DELETE', description: `Eliminar ruta ${id}` },
      undefined,
    );
  },

  // Activar/desactivar una ruta
  async toggleActive(id: string) {
    return conRespaldoOffline(
      () => apiRequest<Route>('PATCH', `/routes/${id}/toggle-active`),
      { type: 'ruta_toggle_activa', endpoint: `/routes/${id}/toggle-active`, method: 'PATCH', description: `Cambiar estado de ruta ${id}` },
      { id } as Route,
    );
  },

  async getActivacionHoy(id: string) {
    return apiRequest<{ rutaId: string; activadaHoy: boolean; operableHoy?: boolean; diaNoLaboral?: boolean; activacionId: string | null; fechaActivacion: string | null; activadaPorId: string | null }>(
      'GET',
      `/routes/${id}/activacion-hoy`,
      undefined,
      { cacheTTL: 0 }
    );
  },

  async activarHoy(id: string) {
    return conRespaldoOffline(
      () => apiRequest<{ rutaId: string; activadaHoy: boolean; operableHoy?: boolean; diaNoLaboral?: boolean; message?: string }>(
        'POST',
        `/routes/${id}/activar-hoy`,
        undefined,
        { cacheTTL: 0 }
      ),
      { type: 'ruta_activar_hoy', endpoint: `/routes/${id}/activar-hoy`, method: 'POST', description: `Activar ruta hoy ${id}` },
      { rutaId: id, activadaHoy: true, operableHoy: true },
    );
  },

  // Obtener estadísticas
  async getStatistics() {
    return apiRequest<RouteStatistics>('GET', '/routes/statistics', undefined, { cacheTTL: 30000 });
  },

  // Obtener cobradores
  async getCobradores() {
    const users = await apiRequest<any[]>('GET', '/routes/cobradores', undefined, { cacheTTL: 120000 });
    return users.map(u => ({
      ...u,
      nombre: u.nombre || `${u.nombres} ${u.apellidos}`.trim()
    })) as Cobrador[];
  },

  // Obtener supervisores
  async getSupervisores() {
    const users = await apiRequest<any[]>('GET', '/routes/supervisores', undefined, { cacheTTL: 120000 });
    return users.map(u => ({
      ...u,
      nombre: u.nombre || `${u.nombres} ${u.apellidos}`.trim()
    })) as Supervisor[];
  },

  // Asignar cliente a ruta
  async assignClient(rutaId: string, clienteId: string, cobradorId: string) {
    return conRespaldoOffline(
      () => apiRequest<any>('POST', `/routes/${rutaId}/assign-client`, { clienteId, cobradorId }),
      { type: 'ruta_asignar_cliente', endpoint: `/routes/${rutaId}/assign-client`, method: 'POST', data: { clienteId, cobradorId }, description: `Asignar cliente a ruta ${rutaId}` },
      { esOffline: true },
    );
  },

  // Remover cliente de ruta
  async removeClient(rutaId: string, clienteId: string) {
    return conRespaldoOffline(
      () => apiRequest<void>('DELETE', `/routes/${rutaId}/remove-client/${clienteId}`),
      { type: 'ruta_remover_cliente', endpoint: `/routes/${rutaId}/remove-client/${clienteId}`, method: 'DELETE', description: `Remover cliente de ruta ${rutaId}` },
      undefined,
    );
  },

  // Mover cliente entre rutas
  async moveClient(clienteId: string, fromRutaId: string, toRutaId: string) {
    return conRespaldoOffline(
      () => apiRequest<any>('POST', '/routes/move-client', { clienteId, fromRutaId, toRutaId }),
      { type: 'ruta_mover_cliente', endpoint: '/routes/move-client', method: 'POST', data: { clienteId, fromRutaId, toRutaId }, description: `Mover cliente entre rutas` },
      { esOffline: true },
    );
  },

  // Asignar un crédito específico a otra ruta (agrega el cliente a la ruta destino)
  async moveLoan(prestamoId: string, toRutaId: string) {
    return conRespaldoOffline(
      () => apiRequest<any>('POST', '/routes/move-loan', { prestamoId, toRutaId }),
      { type: 'ruta_mover_credito', endpoint: '/routes/move-loan', method: 'POST', data: { prestamoId, toRutaId }, description: `Mover crédito a otra ruta` },
      { esOffline: true },
    );
  },

  // Cerrar una jornada regularizada (cierre pendiente)
  async cerrarJornadaRegularizada(
    rutaId: string,
    fechaOperativa: string,
    observaciones?: string,
  ) {
    const endpoint = `/routes/${rutaId}/cierre-pendiente/${fechaOperativa}/cerrar`;
    try {
      return await apiRequest<any>('POST', endpoint, { observaciones });
    } catch (error: any) {
      if (
        (typeof navigator !== 'undefined' && !navigator.onLine) ||
        error?.statusCode === 0 ||
        error?.message?.includes('network') ||
        error?.code === 'ERR_NETWORK'
      ) {
        // Seguro offline: la cola es cronológica, así que este cierre se
        // sincroniza DESPUÉS de los pagos/gastos del día → el servidor
        // reconcilia con el panorama completo.
        logger.log('[Offline Mode] Guardando cierre de jornada de ruta en cola...');
        await syncService.enqueueOperation(
          'cierre_jornada_ruta',
          endpoint,
          'POST',
          { observaciones },
          `Cierre de jornada de ruta (${fechaOperativa})`,
        );
        return { esOffline: true };
      }
      throw error;
    }
  },
};
