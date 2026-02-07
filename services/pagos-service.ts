import { apiRequest } from '@/lib/api/api';
import { MetodoPago } from '@/types/enums';

export type { MetodoPago };

export interface Pago {
  id: string;
  numeroPago: string;
  clienteId: string;
  prestamoId: string;
  cobradorId: string;
  fechaPago: string;
  montoTotal: number;
  metodoPago: MetodoPago;
  numeroReferencia: string | null;
  notas: string | null;
  creadoEn: string;
  actualizadoEn: string;
}

export interface CrearPagoDto {
  clienteId: string;
  prestamoId: string;
  cobradorId: string;
  fechaPago?: string;
  montoTotal: number;
  metodoPago: MetodoPago;
  numeroReferencia?: string;
  notas?: string;
}

export interface ActualizarPagoDto {
  metodoPago?: MetodoPago;
  numeroReferencia?: string;
  notas?: string;
}

export const pagosService = {
  /**
   * Obtener todos los pagos
   */
  async obtenerPagos(): Promise<Pago[]> {
    return apiRequest<Pago[]>('GET', '/payments');
  },

  /**
   * Obtener un pago por ID
   */
  async obtenerPagoPorId(id: string): Promise<Pago> {
    return apiRequest<Pago>('GET', `/payments/${id}`);
  },

  /**
   * Registrar un nuevo pago
   */
  async registrarPago(data: CrearPagoDto): Promise<Pago> {
    return apiRequest<Pago>('POST', '/payments', data);
  },

  /**
   * Actualizar un pago
   */
  async actualizarPago(id: string, data: ActualizarPagoDto): Promise<Pago> {
    return apiRequest<Pago>('PATCH', `/payments/${id}`, data);
  },

  /**
   * Eliminar un pago
   */
  async eliminarPago(id: string): Promise<void> {
    return apiRequest<void>('DELETE', `/payments/${id}`);
  }
};
