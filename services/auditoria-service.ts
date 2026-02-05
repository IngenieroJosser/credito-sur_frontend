import { apiRequest } from '@/lib/api/api';

export interface RegistroAuditoria {
  id: string;
  usuarioId: string;
  accion: string;
  entidad: string;
  entidadId: string;
  datosAnteriores: any;
  datosNuevos: any;
  direccionIP: string | null;
  creadoEn: string;
}

export interface CrearAuditoriaDto {
  usuarioId: string;
  accion: string;
  entidad: string;
  entidadId: string;
  datosAnteriores?: any;
  datosNuevos?: any;
  direccionIP?: string;
}

export const auditoriaService = {
  /**
   * Obtener todos los registros de auditoria
   */
  async obtenerRegistros(): Promise<RegistroAuditoria[]> {
    return apiRequest<RegistroAuditoria[]>('GET', '/audit');
  },

  /**
   * Obtener un registro por ID
   */
  async obtenerPorId(id: string): Promise<RegistroAuditoria> {
    return apiRequest<RegistroAuditoria>('GET', `/audit/${id}`);
  },

  /**
   * Crear un registro de auditoria
   */
  async crear(data: CrearAuditoriaDto): Promise<RegistroAuditoria> {
    return apiRequest<RegistroAuditoria>('POST', '/audit', data);
  }
};
