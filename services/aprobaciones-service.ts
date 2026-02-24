import { apiRequest } from '@/lib/api/api';
import { TipoAprobacion, EstadoAprobacion } from '@/types/enums';

export interface Aprobacion {
  id: string;
  tipo: TipoAprobacion;
  entidadId: string;
  solicitadoPorId: string;
  revisadoPorId: string | null;
  estado: EstadoAprobacion;
  motivoRechazo: string | null;
  notas: string | null;
  creadoEn: string;
  actualizadoEn: string;
}

export interface AprobarDto {
  type: TipoAprobacion;
  aprobadoPorId?: string;
  notas?: string;
}

export interface RechazarDto {
  type: TipoAprobacion;
  rechazadoPorId?: string;
  motivoRechazo: string;
  notas?: string;
}

export const aprobacionesService = {
  /**
   * Aprobar un item pendiente
   */
  async aprobar(id: string, data: AprobarDto): Promise<Aprobacion> {
    return apiRequest<Aprobacion>('POST', `/approvals/${id}/approve`, data);
  },

  /**
   * Rechazar un item pendiente
   */
  async rechazar(id: string, data: RechazarDto): Promise<Aprobacion> {
    return apiRequest<Aprobacion>('POST', `/approvals/${id}/reject`, data);
  },

  /**
   * Obtener historial de aprobaciones de una entidad
   */
  async getHistorial(entidadId: string, tabla: string): Promise<Aprobacion[]> {
    return apiRequest<Aprobacion[]>('POST', '/approvals/history', { entidadId, tabla });
  }
};
