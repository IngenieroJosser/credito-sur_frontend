import { apiRequest } from '@/lib/api/api';
import { conRespaldoOffline } from '@/lib/offline/conRespaldoOffline';

export interface RegistroAuditoria {
  id: string;
  usuarioId: string;
  usuario?: {
    nombres: string;
    apellidos: string;
    correo: string;
    rol: string;
  };
  accion: string;
  entidad: string;
  entidadId: string;
  valoresAnteriores?: any;
  valoresNuevos?: any;
  cambios?: any;
  direccionIP?: string | null;
  agenteUsuario?: string | null;
  endpoint?: string | null;
  creadoEn: string;
}

export interface CrearAuditoriaDto {
  usuarioId: string;
  accion: string;
  entidad: string;
  entidadId: string;
  datosAnteriores?: any;
  datosNuevos?: any;
  metadata?: any;
}

export interface RegistroAuditoriaPaginado {
  registros: RegistroAuditoria[];
  total: number;
  pagina: number;
  limite: number;
  totalPaginas: number;
}

export interface ArchivadoOcultoKey {
  entidad: string;
  entidadId: string;
}

export const auditoriaService = {
  /**
   * Obtener todos los registros de auditoria (hasta 100, sin paginar)
   */
  async obtenerRegistros(): Promise<RegistroAuditoria[]> {
    return apiRequest<RegistroAuditoria[]>('GET', '/audit');
  },

  /**
   * Obtener registros de auditoría con paginación real del backend
   */
  async obtenerRegistrosPaginados(pagina: number = 1, limite: number = 50): Promise<RegistroAuditoriaPaginado> {
    return apiRequest<RegistroAuditoriaPaginado>('GET', `/audit?pagina=${pagina}&limite=${limite}`);
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
    const tempId = `temp-${Date.now()}`;
    return conRespaldoOffline(
      () => apiRequest<RegistroAuditoria>('POST', '/audit', data),
      { type: 'auditoria_crear', endpoint: '/audit', method: 'POST', data, description: `Registro de auditoría`, tempId },
      { id: tempId, ...(data as any) } as RegistroAuditoria,
    );
  },

  async obtenerOcultosArchivados(): Promise<ArchivadoOcultoKey[]> {
    return apiRequest<ArchivadoOcultoKey[]>('GET', '/audit/hidden-archived');
  },

  async ocultarArchivado(entidad: string, entidadId: string) {
    return conRespaldoOffline(
      () => apiRequest('POST', '/audit/hide-archived', { entidad, entidadId }),
      { type: 'auditoria_ocultar_archivado', endpoint: '/audit/hide-archived', method: 'POST', data: { entidad, entidadId }, description: `Ocultar archivado ${entidad}` },
      { esOffline: true },
    );
  },
};

