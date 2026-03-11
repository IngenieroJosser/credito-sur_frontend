import { apiRequest } from '@/lib/api/api';

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
    return apiRequest<RegistroAuditoria>('POST', '/audit', data);
  }
};

