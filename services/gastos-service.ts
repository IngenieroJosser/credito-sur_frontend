import { apiRequest } from '@/lib/api/api';
import { conRespaldoOffline } from '@/lib/offline/conRespaldoOffline';
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
    const tempId = `temp-${Date.now()}`;
    return conRespaldoOffline(
      () => apiRequest<Gasto>('POST', '/accounting', data),
      { type: 'gasto_crear', endpoint: '/accounting', method: 'POST', data, description: `Crear gasto: $${data.monto}`, tempId },
      { id: tempId, ...(data as any), aprobadoPorId: null, numComprobante: data.numComprobante ?? null, estadoAprobacion: 'PENDIENTE', creadoEn: new Date().toISOString(), actualizadoEn: new Date().toISOString() } as Gasto,
    );
  },

  /**
   * Actualizar un gasto
   */
  async actualizarGasto(id: string, data: ActualizarGastoDto): Promise<Gasto> {
    return conRespaldoOffline(
      () => apiRequest<Gasto>('PATCH', `/accounting/${id}`, data),
      { type: 'gasto_actualizar', endpoint: `/accounting/${id}`, method: 'PATCH', data, description: `Actualizar gasto ${id}` },
      { id, ...(data as any) } as Gasto,
    );
  },

  /**
   * Eliminar un gasto
   */
  async eliminarGasto(id: string): Promise<void> {
    return conRespaldoOffline(
      () => apiRequest<void>('DELETE', `/accounting/${id}`),
      { type: 'gasto_eliminar', endpoint: `/accounting/${id}`, method: 'DELETE', description: `Eliminar gasto ${id}` },
      undefined,
    );
  }
};

