import { apiRequest } from '@/lib/api/api';
import { TipoAprobacion, EstadoAprobacion } from '@/types/enums';

export interface Aprobacion {
  id: string;
  tipoAprobacion: TipoAprobacion;
  referenciaId: string;
  tablaReferencia: string;
  solicitadoPorId: string;
  aprobadoPorId: string | null;
  estado: EstadoAprobacion;
  comentarios: string | null;
  datosSolicitud: any;
  datosAprobados: any;
  montoSolicitud: number | null;
  creadoEn: string;
  actualizadoEn: string;
  revisadoEn: string | null;
  // Campos enriquecidos del backend
  solicitante?: string;
  rolSolicitante?: string;
  rechazadoPor?: string;
  rolRechazador?: string;
  solicitadoPor?: {
    id: string;
    nombres: string;
    apellidos: string;
    rol: string;
  };
}

export interface PendingResponse {
  total: number;
  conteo: Record<string, number>;
  items: Record<string, Aprobacion[]>;
}

export interface SuperadminReviewResponse {
  total: number;
  items: Aprobacion[];
}

export interface AprobarDto {
  type: TipoAprobacion;
  aprobadoPorId?: string;
  notas?: string;
  editedData?: any;
}

export interface RechazarDto {
  type: TipoAprobacion;
  rechazadoPorId?: string;
  motivoRechazo?: string;
  notas?: string;
}

export const aprobacionesService = {
  /**
   * Obtener todas las aprobaciones pendientes agrupadas por tipo
   */
  async obtenerPendientes(tipo?: TipoAprobacion): Promise<PendingResponse> {
    const params = tipo ? `?tipo=${tipo}` : '';
    return apiRequest<PendingResponse>('GET', `/approvals/pending${params}`);
  },

  /**
   * Obtener items para revisión del SuperAdmin (rechazados/eliminados)
   */
  async obtenerRevisionSuperadmin(): Promise<SuperadminReviewResponse> {
    return apiRequest<SuperadminReviewResponse>('GET', '/approvals/superadmin-review');
  },

  /**
   * Aprobar un item pendiente
   */
  async aprobar(id: string, data: AprobarDto): Promise<any> {
    return apiRequest('POST', `/approvals/${id}/approve`, data);
  },

  /**
   * Rechazar un item pendiente
   */
  async rechazar(id: string, data: RechazarDto): Promise<any> {
    return apiRequest('POST', `/approvals/${id}/reject`, data);
  },

  /**
   * Confirmar o revertir un rechazo (solo SuperAdmin)
   */
  async confirmarAccionSuperadmin(id: string, accion: 'CONFIRMAR' | 'REVERTIR', notas?: string): Promise<any> {
    return apiRequest('POST', `/approvals/${id}/confirm-deletion`, { accion, notas });
  },

  /**
   * Obtener historial de aprobaciones de una entidad
   */
  async getHistorial(entidadId: string, tabla: string): Promise<Aprobacion[]> {
    return apiRequest<Aprobacion[]>('POST', '/approvals/history', { entidadId, tabla });
  }
};
