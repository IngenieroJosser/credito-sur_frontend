import { apiRequest } from '@/lib/api/api';
import { conRespaldoOffline, esErrorDeRed } from '@/lib/offline/conRespaldoOffline';
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

export interface ApprovalMultimedia {
  id: string;
  url?: string | null;
  ruta?: string | null;
  rutaArchivo?: string | null;
  nombreOriginal?: string | null;
  nombreArchivo?: string | null;
  tipoContenido?: string | null;
  tipoArchivo?: string | null;
  formato?: string | null;
  entidad?: string | null;
  descripcion?: string | null;
  creadoEn?: string;
  clienteId?: string | null;
  prestamoId?: string | null;
  pagoId?: string | null;
}

export interface ApprovalContext {
  approval: Aprobacion;
  cliente: any | null;
  creditoSolicitud: any | null;
  creditosCliente: any[];
  referencias: Array<{
    tipo: string;
    nombre?: string | null;
    telefono?: string | null;
  }>;
  multimedia: ApprovalMultimedia[];
  pagosUltimos30Dias: any[];
  metricas: {
    saldoTotalPendiente: number;
    creditosActivos: number;
    cuotasVencidas: number;
    cuotasPagadas: number;
    reprogramacionesPrevias: number;
    pagosUltimos30Dias: number;
    montoPagadoUltimos30Dias: number;
    candidatoReprogramacion: boolean;
    alertas: string[];
  };
}

export interface AprobarDto {
  type: TipoAprobacion;
  aprobadoPorId?: string;
  notas?: string;
  resultadoRevision?: 'RECHAZADO_CON_DEUDA' | 'RECHAZADO_CON_REINTEGRO';
  editedData?: any;
}

export interface RechazarDto {
  type: TipoAprobacion;
  rechazadoPorId?: string;
  motivoRechazo?: string;
  notas?: string;
  resultadoRevision?: 'RECHAZADO_CON_DEUDA' | 'RECHAZADO_CON_REINTEGRO';
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

  async obtenerMisSolicitudes(): Promise<Aprobacion[]> {
    return apiRequest<Aprobacion[]>('GET', '/approvals/my-requests');
  },

  async obtenerContexto(id: string): Promise<ApprovalContext> {
    return apiRequest<ApprovalContext>('GET', `/approvals/${id}/context`);
  },

  /**
   * Aprobar un item pendiente
   */
  async aprobar(id: string, data: AprobarDto): Promise<any> {
    // La validación cuatro-ojos y de estado la hace el SERVIDOR al reproducir;
    // encolar offline no la salta. Si al sincronizar ya no procede, va a conflictos.
    return conRespaldoOffline(
      () => apiRequest('POST', `/approvals/${id}/approve`, data),
      { type: 'aprobacion_aprobar', endpoint: `/approvals/${id}/approve`, method: 'POST', data, description: `Aprobar solicitud ${id}` },
      { esOffline: true },
    );
  },

  /**
   * Rechazar un item pendiente
   */
  async rechazar(id: string, data: RechazarDto): Promise<any> {
    return conRespaldoOffline(
      () => apiRequest('POST', `/approvals/${id}/reject`, data),
      { type: 'aprobacion_rechazar', endpoint: `/approvals/${id}/reject`, method: 'POST', data, description: `Rechazar solicitud ${id}` },
      { esOffline: true },
    );
  },

  /**
   * Confirmar o revertir un rechazo (solo SuperAdmin)
   */
  async confirmarAccionSuperadmin(id: string, accion: 'CONFIRMAR' | 'REVERTIR', notas?: string): Promise<any> {
    return conRespaldoOffline(
      () => apiRequest('POST', `/approvals/${id}/confirm-deletion`, { accion, notas }),
      { type: 'aprobacion_confirmar_superadmin', endpoint: `/approvals/${id}/confirm-deletion`, method: 'POST', data: { accion, notas }, description: `Confirmar acción superadmin ${id}` },
      { esOffline: true },
    );
  },

  /**
   * Obtener historial de aprobaciones de una entidad
   */
  async getHistorial(entidadId: string, tabla: string): Promise<Aprobacion[]> {
    // Es una LECTURA (aunque use POST): offline no se encola (no hay nada que
    // sincronizar); devolvemos vacío para no romper la vista.
    try {
      return await apiRequest<Aprobacion[]>('POST', '/approvals/history', { entidadId, tabla });
    } catch (error: any) {
      if (esErrorDeRed(error)) return [];
      throw error;
    }
  }
};


