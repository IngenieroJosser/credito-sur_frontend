import { apiRequest } from '@/lib/api/api';

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
    return apiRequest<Route>('GET', `/routes/${id}`, undefined, { cacheTTL: 30000 });
  },

  // Crear una nueva ruta
  async create(data: CreateRouteDto) {
    return apiRequest<Route>('POST', '/routes', data);
  },

  // Actualizar una ruta
  async update(id: string, data: UpdateRouteDto) {
    return apiRequest<Route>('PATCH', `/routes/${id}`, data);
  },

  // Eliminar una ruta (soft delete)
  async delete(id: string) {
    return apiRequest<void>('DELETE', `/routes/${id}`);
  },

  // Activar/desactivar una ruta
  async toggleActive(id: string) {
    return apiRequest<Route>('PATCH', `/routes/${id}/toggle-active`);
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
    return apiRequest<any>('POST', `/routes/${rutaId}/assign-client`, { clienteId, cobradorId });
  },

  // Remover cliente de ruta
  async removeClient(rutaId: string, clienteId: string) {
    return apiRequest<void>('DELETE', `/routes/${rutaId}/remove-client/${clienteId}`);
  },

  // Mover cliente entre rutas
  async moveClient(clienteId: string, fromRutaId: string, toRutaId: string) {
    return apiRequest<any>('POST', '/routes/move-client', { clienteId, fromRutaId, toRutaId });
  },

  // Asignar un crédito específico a otra ruta (agrega el cliente a la ruta destino)
  async moveLoan(prestamoId: string, toRutaId: string) {
    return apiRequest<any>('POST', '/routes/move-loan', { prestamoId, toRutaId });
  },
};
