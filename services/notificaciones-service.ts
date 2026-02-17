import { apiRequest } from '@/lib/api/api';

export interface Notificacion {
  id: string;
  titulo: string;
  mensaje: string;
  tipo: 'PAGO' | 'CLIENTE' | 'MORA' | 'SISTEMA' | 'PRESTAMO' | 'GASTO' | 'SOLICITUD_DINERO' | 'SOLICITUD';
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
    frecuenciaPago?: 'DIARIO' | 'SEMANAL' | 'QUINCENAL' | 'MENSUAL';
    motivo?: string;
  };
  motivoRechazo?: string;
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
    return apiRequest<Notificacion>('PATCH', `/notificaciones/${id}/read`);
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
