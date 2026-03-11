import { logger } from '@/lib/logger'
import { apiRequest } from '@/lib/api/api';
import { syncService } from '@/lib/offline/syncService';

export interface Notificacion {
  id: string;
  titulo: string;
  mensaje: string;
  tipo: 'PAGO' | 'CLIENTE' | 'MORA' | 'SISTEMA' | 'PRESTAMO' | 'GASTO' | 'SOLICITUD_DINERO' | 'SOLICITUD' | 'APROBACION';
  fecha: string;
  leida: boolean;
  link?: string;
  rutaId?: string;
  entidadId?: string;
  estado?: 'PENDIENTE' | 'APROBADA' | 'RECHAZADA';
  detalles?: {
    monto?: number;
    cuotas?: number;
    porcentaje?: number;
    cliente?: string;
    cedula?: string;
    telefono?: string;
    direccion?: string;
    ocupacion?: string;
    articulo?: string;
    valorArticulo?: number;
    cuotaInicial?: number;
    beneficiario?: string;
    categoria?: string;
    descripcion?: string;
    frecuenciaPago?: 'DIARIO' | 'SEMANAL' | 'QUINCENAL' | 'MENSUAL';
    motivo?: string;
  };
  motivoRechazo?: string;
  // Campos adicionales para aprobaciones y trazabilidad
  solicitante?: string;
  creadoEn?: string;
  metadata?: Record<string, any>;
}

export const notificacionesService = {
  /**
   * Obtener todas las notificaciones del usuario actual
   */
  async obtenerTodas(): Promise<Notificacion[]> {
    return apiRequest<Notificacion[]>('GET', '/notificaciones');
  },

  /**
   * Marcar una notificación como leída
   */
  async marcarComoLeida(id: string): Promise<Notificacion> {
    try {
      return await apiRequest<Notificacion>('PATCH', `/notificaciones/${id}/read`);
    } catch (error: any) {
      if (
        (typeof navigator !== 'undefined' && !navigator.onLine) ||
        error?.statusCode === 0 || 
        error?.message?.includes('network') ||
        error?.code === 'ERR_NETWORK'
      ) {
        logger.log('[Offline Mode] Guardando marcar notificacion como leida en cola...');
        await syncService.enqueueOperation(
          'notificacion_leer',
          `/notificaciones/${id}/read`,
          'PATCH',
          null,
          'Marcar notificación como leída ID: ' + id
        );
        return { id, leida: true } as any;
      }
      throw error;
    }
  },

  /**
   * Marcar todas las notificaciones como leídas
   */
  async marcarTodasComoLeidas(): Promise<void> {
    const notificaciones = await this.obtenerTodas();
    await Promise.all(
      notificaciones
        .filter(n => !n.leida)
        .map(n => this.marcarComoLeida(n.id))
    );
  }
};


