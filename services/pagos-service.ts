import { apiRequest } from '@/lib/api/api';
import { MetodoPago } from '@/types/enums';

export type { MetodoPago };

export interface DetallePago {
  id: string;
  pagoId: string;
  cuotaId: string;
  monto: number;
  montoCapital: number;
  montoInteres: number;
  montoInteresMora: number;
}

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
  detalles?: DetallePago[];
  cliente?: { id: string; nombres: string; apellidos: string; dni?: string };
  cobrador?: { id: string; nombres: string; apellidos: string };
  creadoEn: string;
  actualizadoEn: string;
}

export interface DescomposicionPago {
  montoTotal: number;
  capitalRecuperado: number;
  interesRecuperado: number;
  saldoAnterior: number;
  saldoNuevo: number;
  cuotasAfectadas: number;
  prestamoQuedaPagado: boolean;
}

export interface ResultadoPago {
  pago: Pago;
  descomposicion: DescomposicionPago;
}

export interface PagosResponse {
  pagos: Pago[];
  paginacion: {
    total: number;
    pagina: number;
    limite: number;
    totalPaginas: number;
  };
}

export interface CrearPagoDto {
  clienteId: string;
  prestamoId: string;
  cobradorId: string;
  fechaPago?: string;
  montoTotal: number;
  metodoPago?: MetodoPago;
  numeroReferencia?: string;
  notas?: string;
}

export const pagosService = {
  /**
   * Obtener todos los pagos (con paginación y filtros)
   */
  async obtenerPagos(filtros?: {
    prestamoId?: string;
    clienteId?: string;
    page?: number;
    limit?: number;
  }): Promise<PagosResponse> {
    const params = new URLSearchParams();
    if (filtros?.prestamoId) params.set('prestamoId', filtros.prestamoId);
    if (filtros?.clienteId) params.set('clienteId', filtros.clienteId);
    if (filtros?.page) params.set('page', String(filtros.page));
    if (filtros?.limit) params.set('limit', String(filtros.limit));
    const qs = params.toString();
    return apiRequest<PagosResponse>('GET', `/payments${qs ? `?${qs}` : ''}`);
  },

  /**
   * Obtener un pago por ID
   */
  async obtenerPagoPorId(id: string): Promise<Pago> {
    return apiRequest<Pago>('GET', `/payments/${id}`);
  },

  /**
   * Registrar un nuevo pago
   * Retorna el pago creado + descomposición capital/interés
   */
  async registrarPago(data: CrearPagoDto): Promise<ResultadoPago> {
    return apiRequest<ResultadoPago>('POST', '/payments', data);
  },
};
