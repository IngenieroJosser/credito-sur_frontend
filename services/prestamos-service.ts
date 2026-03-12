import { logger } from '@/lib/logger'
import { apiRequest } from '@/lib/api/api';
import { syncService } from '@/lib/offline/syncService';
import { EstadoPrestamo, FrecuenciaPago, EstadoCuota } from '@/types/enums';
import type { Prestamo } from '@/types/domain';

export type { EstadoPrestamo, FrecuenciaPago, EstadoCuota, Prestamo };

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
  cantidadCuotas?: number;
  frecuenciaPago: FrecuenciaPago;
  tipoAmortizacion?: 'INTERES_SIMPLE' | 'FRANCESA';
  fechaInicio: string;
  fechaPrimerCobro?: string;
  creadoPorId: string;
  cuotaInicial?: number;
  notas?: string;
  garantia?: string;
}

export interface FiltrosPrestamos {
  estado?: string;
  ruta?: string;
  search?: string;
  tipo?: string;
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
  prestamos: Prestamo[];
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
    if (filtros?.tipo) params.append('tipo', filtros.tipo);
    if (filtros?.page) params.append('page', filtros.page.toString());
    if (filtros?.limit) params.append('limit', filtros.limit.toString());
    
    const query = params.toString();
    const endpoint = query ? `/loans?${query}` : '/loans';
    
    return apiRequest<RespuestaPrestamos>('GET', endpoint);
  },

  /**
   * Obtener un préstamo por ID
   */
  async obtenerPrestamoPorId(id: string): Promise<Prestamo> {
    return apiRequest<Prestamo>('GET', `/loans/${id}`);
  },

  /**
   * Restaurar un préstamo eliminado
   */
  async restaurarPrestamo(id: string): Promise<Prestamo> {
    return apiRequest<Prestamo>('PATCH', `/loans/${id}/restore`, {});
  },

  /**
   * Archivar préstamo como pérdida y agregar cliente a blacklist
   */
  async archivarPrestamo(prestamoId: string, data: { motivo: string; notas?: string }) {
    try {
      return await apiRequest('POST', `/loans/${prestamoId}/archive`, data);
    } catch (error: any) {
      if (
        (typeof navigator !== 'undefined' && !navigator.onLine) ||
        error?.statusCode === 0 || 
        error?.message?.includes('network') ||
        error?.code === 'ERR_NETWORK'
      ) {
        logger.log('[Offline Mode] Guardando archivado de prestamo en cola...');
        await syncService.enqueueOperation(
          'prestamo_archivar',
          `/loans/${prestamoId}/archive`,
          'POST',
          { prestamoId, nuevaFecha: data.fecha, motivo: data.motivo, solicitadoPorId: data.cobradorId },
          `Archivar préstamo ID: ${prestamoId}`
        );
        return { esOffline: true };
      }
      throw error;
    }
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
         logger.log('[Offline Mode] Guardando creacion de préstamo en cola...');
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
    try {
      return await apiRequest<void>('DELETE', `/loans/${id}`, { userId });
    } catch (error: any) {
      if (
        (typeof navigator !== 'undefined' && !navigator.onLine) ||
        error?.statusCode === 0 || 
        error?.message?.includes('network') ||
        error?.code === 'ERR_NETWORK'
      ) {
        logger.log('[Offline Mode] Guardando eliminacion de prestamo en cola...');
        await syncService.enqueueOperation(
          'prestamo_eliminar',
          `/loans/${id}`,
          'DELETE',
          { userId },
          `Eliminar préstamo ID: ${id}`
        );
        return;
      }
      throw error;
    }
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
    try {
      return await apiRequest('POST', `/loans/${id}/approve`, { aprobadoPorId });
    } catch (error: any) {
      if (
        (typeof navigator !== 'undefined' && !navigator.onLine) ||
        error?.statusCode === 0 || 
        error?.message?.includes('network') ||
        error?.code === 'ERR_NETWORK'
      ) {
        logger.log('[Offline Mode] Guardando aprobacion de prestamo en cola...');
        await syncService.enqueueOperation(
          'prestamo_aprobar',
          `/loans/${id}/approve`,
          'POST',
          { aprobadoPorId },
          `Aprobar préstamo ID: ${id}`
        );
        return { esOffline: true };
      }
      throw error;
    }
  },

  /**
   * Rechazar un préstamo
   */
  async rechazarPrestamo(id: string, rechazadoPorId: string, motivo?: string): Promise<any> {
    try {
      return await apiRequest('POST', `/loans/${id}/reject`, { 
        rechazadoPorId, 
        motivo 
      });
    } catch (error: any) {
      if (
        (typeof navigator !== 'undefined' && !navigator.onLine) ||
        error?.statusCode === 0 || 
        error?.message?.includes('network') ||
        error?.code === 'ERR_NETWORK'
      ) {
        logger.log('[Offline Mode] Guardando rechazo de prestamo en cola...');
        await syncService.enqueueOperation(
          'prestamo_rechazar',
          `/loans/${id}/reject`,
          'POST',
          { rechazadoPorId, motivo },
          `Rechazar préstamo ID: ${id}`
        );
        return { esOffline: true };
      }
      throw error;
    }
  },

  /**
   * Registrar un pago o abono
   */
  async registrarPago(data: {
    prestamoId: string;
    clienteId?: string;
    monto: number;
    metodoPago: 'EFECTIVO' | 'TRANSFERENCIA';
    comprobante?: File | null;
    esAbono?: boolean;
    cobradorId?: string;
    fecha?: string;
  }): Promise<any> {
    try {
      const formData = new FormData();
      formData.append('prestamoId', data.prestamoId);
      if (data.clienteId) formData.append('clienteId', data.clienteId);
      formData.append('montoTotal', data.monto.toString());
      formData.append('metodoPago', data.metodoPago);
      
      if (data.esAbono) formData.append('tipo', 'ABONO');
      else formData.append('tipo', 'PAGO');

      if (data.cobradorId) formData.append('cobradorId', data.cobradorId);
      if (data.fecha) formData.append('fechaPago', data.fecha);
      
      if (data.comprobante) {
        formData.append('comprobante', data.comprobante);
      }
      
      return await apiRequest('POST', '/payments', formData);
    } catch (error: any) {
      if (
        (typeof navigator !== 'undefined' && !navigator.onLine) ||
        error?.statusCode === 0 || 
        error?.message?.includes('network') ||
        error?.code === 'ERR_NETWORK'
      ) {
        logger.log('[Offline Mode] Guardando pago en cola...');
        
        // El payload para la cola no debe ser FormData, sino el objeto plano
        // El syncManager se encargará de convertirlo si hay file
        const payload = {
          prestamoId: data.prestamoId,
          clienteId: data.clienteId,
          montoTotal: data.monto,
          metodoPago: data.metodoPago,
          tipo: data.esAbono ? 'ABONO' : 'PAGO',
          cobradorId: data.cobradorId,
          fechaPago: data.fecha || new Date().toISOString()
        };

        await syncService.enqueueOperation(
          'pago',
          '/payments',
          'POST',
          payload,
          `Pago $${data.monto.toLocaleString()} - ${data.prestamoId}`,
          data.comprobante || undefined
        );

        return {
          id: `temp-pago-${Date.now()}`,
          estado: 'PENDIENTE',
          montoTotal: data.monto,
          esOffline: true,
          mensaje: 'Almacenado localmente para sincronizar'
        };
      }
      throw error;
    }
  },

  /**
   * Reprogramar la próxima cuota de un préstamo
   */
  async reprogramarPrestamo(prestamoId: string, data: { fecha: string; motivo: string; cobradorId: string }): Promise<any> {
    try {
      const payload = { prestamoId, nuevaFecha: data.fecha, motivo: data.motivo, solicitadoPorId: data.cobradorId };
      return await apiRequest('POST', `/loans/solicitar-reprogramacion`, payload);
    } catch (error: any) {
      if (
        (typeof navigator !== 'undefined' && !navigator.onLine) ||
        error?.statusCode === 0 || 
        error?.message?.includes('network') ||
        error?.code === 'ERR_NETWORK'
      ) {
        logger.log('[Offline Mode] Guardando reprogramacion de prestamo en cola...');
        await syncService.enqueueOperation(
          'prestamo_reprograr',
          `/loans/solicitar-reprogramacion`,
          'POST',
          payload,
          `Reprogramar préstamo ID: ${prestamoId}`
        );
        return { esOffline: true };
      }
      throw error;
    }
  },
  
  /**
   * Actualizar un préstamo existente
   */
  async actualizarPrestamo(id: string, data: {
    monto?: number;
    tasaInteres?: number;
    plazoMeses?: number;
    cantidadCuotas?: number;
    frecuenciaPago?: string;
    estado?: string;
    notas?: string;
    tasaInteresMora?: number;
    cuotaInicial?: number;
    fechaInicio?: string;
    garantia?: string;
    tipoAmortizacion?: string;
    archivos?: any[];
  }): Promise<any> {
    try {
      return await apiRequest('PATCH', `/loans/${id}`, data);
    } catch (error: any) {
      if (
        (typeof navigator !== 'undefined' && !navigator.onLine) ||
        error?.statusCode === 0 || 
        error?.message?.includes('network') ||
        error?.code === 'ERR_NETWORK'
      ) {
        logger.log('[Offline Mode] Guardando actualizacion de prestamo en cola...');
        await syncService.enqueueOperation(
          'prestamo_actualizar',
          `/loans/${id}`,
          'PATCH',
          data,
          `Actualizar préstamo ID: ${id}`
        );
        return { id, ...data };
      }
      throw error;
    }
  },

  /**
   * Solicitar reprogramación de cuota al supervisor/admin para aprobación.
   * Valida límites de días: semanal ≤6 días, quincenal ≤14 días.
   */
  async solicitarReprogramacionCuota(data: {
    prestamoId: string;
    cuotaId: string;
    nuevaFecha: string;
    motivo: string;
  }): Promise<any> {
    return apiRequest('POST', '/loans/solicitar-reprogramacion', data);
  },

  /**
   * Listar solicitudes de reprogramación (módulo de revisiones para admin/supervisor).
   */
  async listarReprogramacionesPendientes(estado?: string): Promise<any[]> {
    const endpoint = estado
      ? `/loans/reprogramaciones-pendientes?estado=${estado}`
      : '/loans/reprogramaciones-pendientes';
    return apiRequest('GET', endpoint);
  },

  /**
   * Aprobar una solicitud de reprogramación.
   */
  async aprobarReprogramacion(aprobacionId: string): Promise<any> {
    return apiRequest('PATCH', `/loans/reprogramaciones/${aprobacionId}/aprobar`, {});
  },

  /**
   * Rechazar una solicitud de reprogramación.
   */
  async rechazarReprogramacion(aprobacionId: string, comentarios?: string): Promise<any> {
    return apiRequest('PATCH', `/loans/reprogramaciones/${aprobacionId}/rechazar`, { comentarios });
  },
};



