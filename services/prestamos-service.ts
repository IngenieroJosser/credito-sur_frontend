import { apiRequest } from '@/lib/api/api';
import { syncService } from '@/lib/offline/syncService';
import { EstadoPrestamo, FrecuenciaPago, EstadoCuota } from '@/types/enums';

export type { EstadoPrestamo, FrecuenciaPago, EstadoCuota };

export interface Cuota {
  id: string;
  prestamoId: string;
  numeroCuota: number;
  fechaVencimiento: string;
  monto: number;
  montoCapital: number;
  montoInteres: number;
  montoInteresMora: number;
  estado: EstadoCuota;
  montoPagado: number;
  fechaPago: string | null;
  fechaVencimientoProrroga: string | null;
  creadoEn: string;
  actualizadoEn: string;
}

export interface CrearPrestamoDto {
  clienteId: string;
  productoId?: string;
  precioProductoId?: string;
  tipoPrestamo: string;
  monto: number;
  tasaInteres: number;
  tasaInteresMora: number;
  plazoMeses: number;
  frecuenciaPago: FrecuenciaPago;
  fechaInicio: string;
  creadoPorId: string;
}

export interface FiltrosPrestamos {
  estado?: string;
  ruta?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface EstadisticasPrestamos {
  total: number;
  activos: number;
  atrasados: number;
  morosos: number;
  pagados: number;
  cancelados: number;
  montoTotal: number;
  montoPendiente: number;
  moraTotal: number;
}

export interface RespuestaPrestamos {
  prestamos: any[];
  estadisticas: EstadisticasPrestamos;
  paginacion: {
    total: number;
    pagina: number;
    limite: number;
    totalPaginas: number;
  };
}

export const prestamosService = {
  /**
   * Obtener todos los préstamos con filtros
   */
  async obtenerPrestamos(filtros?: FiltrosPrestamos): Promise<RespuestaPrestamos> {
    const params = new URLSearchParams();
    
    if (filtros?.estado) params.append('estado', filtros.estado);
    if (filtros?.ruta) params.append('ruta', filtros.ruta);
    if (filtros?.search) params.append('search', filtros.search);
    if (filtros?.page) params.append('page', filtros.page.toString());
    if (filtros?.limit) params.append('limit', filtros.limit.toString());
    
    const query = params.toString();
    const endpoint = query ? `/loans?${query}` : '/loans';
    
    return apiRequest<RespuestaPrestamos>('GET', endpoint);
  },

  /**
   * Obtener un préstamo por ID
   */
  async obtenerPrestamoPorId(id: string): Promise<any> {
    return apiRequest('GET', `/loans/${id}`);
  },

  /**
   * Archivar préstamo como pérdida y agregar cliente a blacklist
   */
  async archivarPrestamo(prestamoId: string, data: { motivo: string; notas?: string }) {
    return apiRequest('POST', `/loans/${prestamoId}/archive`, data);
  },

  /**
   * Crear un nuevo préstamo
   */
  /**
   * Crear un nuevo préstamo (con soporte Offline)
   */
  async crearPrestamo(data: CrearPrestamoDto): Promise<any> {
    try {
      return await apiRequest('POST', '/loans', data);
    } catch (error: any) {
      if (
        (typeof navigator !== 'undefined' && !navigator.onLine) ||
        error?.statusCode === 0 || 
        error?.message?.includes('network') ||
        error?.code === 'ERR_NETWORK'
      ) {
         console.log('🌐 [Offline Mode] Guardando creación de préstamo en cola...');
         const tempId = `temp-loan-${Date.now()}`;
         
         await syncService.enqueueOperation(
           'prestamo_create',
           '/loans',
           'POST',
           data,
           `Nuevo Préstamo (Offline): $${data.monto}`
         );

         // Retornar objeto temporal
         return {
           id: tempId,
           numeroPrestamo: 'OFFLINE',
           clienteId: data.clienteId,
           monto: data.monto,
           tasaInteres: data.tasaInteres,
           plazoMeses: data.plazoMeses,
           fechaInicio: data.fechaInicio,
           estado: 'PENDIENTE', // Siempre inicia en PENDIENTE o EN_REVISION
           esOffline: true
         };
      }
      throw error;
    }
  },

  /**
   * Eliminar un préstamo
   */
  async eliminarPrestamo(id: string, userId: string): Promise<void> {
    return apiRequest<void>('DELETE', `/loans/${id}`, { userId });
  },

  /**
   * Obtener cuotas de un préstamo
   */
  async obtenerCuotas(prestamoId: string): Promise<Cuota[]> {
    return apiRequest<Cuota[]>('GET', `/loans/${prestamoId}/cuotas`);
  },

  /**
   * Aprobar un préstamo
   */
  async aprobarPrestamo(id: string, aprobadoPorId: string): Promise<any> {
    return apiRequest('POST', `/loans/${id}/approve`, { aprobadoPorId });
  },

  /**
   * Rechazar un préstamo
   */
  async rechazarPrestamo(id: string, rechazadoPorId: string, motivo?: string): Promise<any> {
    return apiRequest('POST', `/loans/${id}/reject`, { 
      rechazadoPorId, 
      motivo 
    });
  },

  /**
   * Actualizar un préstamo existente
   */
  async actualizarPrestamo(id: string, data: {
    monto?: number;
    tasaInteres?: number;
    plazoMeses?: number;
    frecuenciaPago?: string;
    estado?: string;
    notas?: string;
  }): Promise<any> {
    return apiRequest('PATCH', `/loans/${id}`, data);
  }
};
