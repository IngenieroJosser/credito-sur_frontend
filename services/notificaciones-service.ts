import type { TipoAprobacion } from '@/types/enums'
import { logger } from '@/lib/logger'
import { apiRequest } from '@/lib/api/api';
import { syncService } from '@/lib/offline/syncService';
import { esErrorDeRed } from '@/lib/offline/conRespaldoOffline';

export interface Notificacion {
  id: string;
  titulo: string;
  mensaje: string;
  tipo: 'PAGO' | 'CLIENTE' | 'MORA' | 'SISTEMA' | 'PRESTAMO' | 'GASTO' | 'SOLICITUD_DINERO' | 'SOLICITUD' | 'APROBACION' | 'ALERTA_CLIENTE_NO_UBICADO';
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

/**
 * Lo que recibe `NotificacionDetalleModal`, que es MAS que una `Notificacion`.
 *
 * Tres campos vienen del backend y no estaban declarados (comprobado en
 * `notificaciones.service.ts`, `enrichNotificationForUi`):
 *
 *  - `entidad`, que SI es columna del modelo `Notificacion`.
 *  - `datosSolicitud` y `aprobacion`, que el enriquecimiento agrega al nivel superior
 *    cuando la notificacion apunta a una aprobacion (`notif.entidadId`).
 *
 * `approvalType` lo agregan las dos pantallas que alimentan el modal.
 *
 * `detalles` y `metadata` se quedan como bolsas: son el JSON de la solicitud, cuya forma
 * CAMBIA segun `tipoAprobacion` (nuevo prestamo, gasto, prorroga, reprogramacion...). El
 * modal lee unos setenta nombres distintos de ahi, muchos alias de otros. Declararlos todos
 * como opcionales no comprobaria nada y daria una falsa sensacion de contrato; lo honesto es
 * decir que es un JSON y que quien lo lee se defiende.
 *
 * NO se declaran `revisadoEn` ni `actualizadoEn`: se comprobo que no son columnas del modelo
 * y que el enriquecimiento no los agrega.
 */
export interface NotificacionParaDetalle
  extends Omit<Notificacion, 'fecha' | 'detalles'> {
  /** Opcional aqui: el puente `aprobacionToNotificacion` de revisiones no la pone. */
  fecha?: string
  entidad?: string | null
  detalles?: Record<string, unknown>
  datosSolicitud?: Record<string, unknown>
  aprobacion?: Record<string, unknown> | null
  approvalType?: TipoAprobacion
  revisadoPor?: string | null
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
  async marcarComoLeida(id: string): Promise<Notificacion | null> {
    try {
      return await apiRequest<Notificacion>('PATCH', `/notificaciones/${id}/read`);
    } catch (error) {
      if (esErrorDeRed(error)) {
        logger.log('[Offline Mode] Guardando marcar notificacion como leida en cola...');
        await syncService.enqueueOperation(
          'notificacion_leer',
          `/notificaciones/${id}/read`,
          'PATCH',
          null,
          'Marcar notificación como leída ID: ' + id
        );
        // Los tres sitios que llaman descartan el resultado; `{ id, leida: true }`
        // no era una Notificacion (sin titulo, mensaje, tipo ni fecha).
        return null;
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


