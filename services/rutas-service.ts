import { apiRequest } from '@/lib/api/api';

export interface Ruta {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  zona: string;
  activa: boolean;
  cobradorId: string;
  supervisorId: string | null;
  creadoEn: string;
  actualizadoEn: string;
  eliminadoEn: string | null;
  asignaciones?: any[]; // Incluimos asignaciones para el detalle
}

export interface CrearRutaDto {
  codigo: string;
  nombre: string;
  descripcion?: string;
  zona: string;
  cobradorId: string;
  supervisorId?: string;
}

export interface ActualizarRutaDto {
  codigo?: string;
  nombre?: string;
  descripcion?: string;
  zona?: string;
  cobradorId?: string;
  supervisorId?: string;
  activa?: boolean;
}

export interface FiltrosRutas {
  page?: number;
  limit?: number;
  search?: string;
  activa?: boolean;
  cobradorId?: string;
  supervisorId?: string;
}

export interface EstadisticasRutas {
  totalRutas: number;
  rutasActivas: number;
  rutasInactivas: number;
  totalClientes: number;
  totalCobradores: number;
}

export interface Cobrador {
  id: string;
  nombres: string;
  apellidos: string;
  correo: string;
}

export const rutasService = {
  /**
   * Obtener todas las rutas con filtros
   */
  async obtenerRutas(filtros?: FiltrosRutas): Promise<Ruta[]> {
    const params = new URLSearchParams();
    
    if (filtros?.page) params.append('page', filtros.page.toString());
    if (filtros?.limit) params.append('limit', filtros.limit.toString());
    if (filtros?.search) params.append('search', filtros.search);
    if (filtros?.activa !== undefined) params.append('activa', filtros.activa.toString());
    if (filtros?.cobradorId) params.append('cobradorId', filtros.cobradorId);
    if (filtros?.supervisorId) params.append('supervisorId', filtros.supervisorId);
    
    const query = params.toString();
    const endpoint = query ? `/routes?${query}` : '/routes';
    
    return apiRequest<Ruta[]>('GET', endpoint);
  },

  /**
   * Obtener estadisticas de rutas
   */
  async obtenerEstadisticas(): Promise<EstadisticasRutas> {
    return apiRequest<EstadisticasRutas>('GET', '/routes/statistics');
  },

  /**
   * Obtener lista de cobradores
   */
  async obtenerCobradores(): Promise<Cobrador[]> {
    return apiRequest<Cobrador[]>('GET', '/routes/cobradores');
  },

  /**
   * Obtener lista de supervisores
   */
  async obtenerSupervisores(): Promise<Cobrador[]> {
    return apiRequest<Cobrador[]>('GET', '/routes/supervisores');
  },

  /**
   * Obtener una ruta por ID
   */
  async obtenerRutaPorId(id: string): Promise<Ruta> {
    return apiRequest<Ruta>('GET', `/routes/${id}`);
  },

  /**
   * Crear una nueva ruta
   */
  async crearRuta(data: CrearRutaDto): Promise<Ruta> {
    return apiRequest<Ruta>('POST', '/routes', data);
  },

  /**
   * Actualizar una ruta existente
   */
  async actualizarRuta(id: string, data: ActualizarRutaDto): Promise<Ruta> {
    return apiRequest<Ruta>('PATCH', `/routes/${id}`, data);
  },

  /**
   * Eliminar una ruta (soft delete)
   */
  async eliminarRuta(id: string): Promise<void> {
    return apiRequest<void>('DELETE', `/routes/${id}`);
  },

  /**
   * Activar o desactivar una ruta
   */
  async toggleActiva(id: string): Promise<Ruta> {
    return apiRequest<Ruta>('PATCH', `/routes/${id}/toggle-active`);
  },

  /**
   * Asignar cliente a una ruta
   */
  async asignarCliente(rutaId: string, clienteId: string, cobradorId: string): Promise<void> {
    return apiRequest<void>('POST', `/routes/${rutaId}/assign-client`, {
      clienteId,
      cobradorId
    });
  },

  /**
   * Remover cliente de una ruta
   */
  async removerCliente(rutaId: string, clienteId: string): Promise<void> {
    return apiRequest<void>('DELETE', `/routes/${rutaId}/remove-client/${clienteId}`);
  },

  /**
   * Mover cliente entre rutas
   */
  async moverCliente(clienteId: string, fromRutaId: string, toRutaId: string): Promise<void> {
    return apiRequest<void>('POST', '/routes/move-client', {
      clienteId,
      fromRutaId,
      toRutaId
    });
  }
};
