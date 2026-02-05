import { apiRequest } from '@/lib/api/api';
import { TipoGasto } from '@/types/enums';

export interface Gasto {
  id: string;
  reportadoPorId: string;
  aprobadoPorId: string | null;
  tipo: TipoGasto;
  monto: number;
  descripcion: string;
  fecha: string;
  numComprobante: string | null;
  estadoAprobacion: string;
  creadoEn: string;
  actualizadoEn: string;
}

export interface CrearGastoDto {
  reportadoPorId: string;
  tipo: TipoGasto;
  monto: number;
  descripcion: string;
  fecha?: string;
  numComprobante?: string;
}

export interface ActualizarGastoDto {
  tipo?: TipoGasto;
 monto?: number;
  descripcion?: string;
  fecha?: string;
  numComprobante?: string;
}

export const gastosService = {
  /**
   * Obtener todos los gastos
   */
  async obtenerGastos(): Promise<Gasto[]> {
    return apiRequest<Gasto[]>('GET', '/accounting');
  },

  /**
   * Obtener un gasto por ID
   */
  async obtenerGastoPorId(id: string): Promise<Gasto> {
    return apiRequest<Gasto>('GET', `/accounting/${id}`);
  },

  /**
   * Crear un nuevo gasto
   */
  async crearGasto(data: CrearGastoDto): Promise<Gasto> {
    return apiRequest<Gasto>('POST', '/accounting', data);
  },

  /**
   * Actualizar un gasto
   */
  async actualizarGasto(id: string, data: ActualizarGastoDto): Promise<Gasto> {
    return apiRequest<Gasto>('PATCH', `/accounting/${id}`, data);
  },

  /**
   * Eliminar un gasto
   */
  async eliminarGasto(id: string): Promise<void> {
    return apiRequest<void>('DELETE', `/accounting/${id}`);
  }
};
