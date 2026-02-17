import { apiRequest } from '@/lib/api/api';
import { syncService } from '@/lib/offline/syncService';
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
   * Registrar un nuevo pago (con soporte Offline)
   * Retorna el pago creado + descomposición capital/interés
   */
  async registrarPago(data: CrearPagoDto): Promise<ResultadoPago> {
    try {
       return await apiRequest<ResultadoPago>('POST', '/payments', data);
    } catch (error: any) {
       if (
        (typeof navigator !== 'undefined' && !navigator.onLine) ||
        error?.statusCode === 0 || 
        error?.message?.includes('network') ||
        error?.code === 'ERR_NETWORK'
      ) {
         console.log('🌐 [Offline Mode] Guardando pago en cola...');
         const tempId = `temp-pay-${Date.now()}`;
         
         await syncService.enqueueOperation(
           'pago',
           '/payments',
           'POST',
           data,
           `Pago Offline $${data.montoTotal}`
         );

         // Retornar objeto temporal con estimaciones
         return {
            pago: {
                id: tempId,
                numeroPago: 'OFFLINE',
                clienteId: data.clienteId,
                prestamoId: data.prestamoId,
                cobradorId: data.cobradorId,
                fechaPago: new Date().toISOString(),
                montoTotal: data.montoTotal,
                metodoPago: data.metodoPago || MetodoPago.EFECTIVO,
                numeroReferencia: data.numeroReferencia || null,
                notas: data.notas || 'Pago registrado offline',
                creadoEn: new Date().toISOString(),
                actualizadoEn: new Date().toISOString(),
            } as any,
            descomposicion: {
                montoTotal: data.montoTotal,
                capitalRecuperado: 0, // No se puede calcular offline
                interesRecuperado: 0,
                saldoAnterior: 0,
                saldoNuevo: 0,
                cuotasAfectadas: 0,
                prestamoQuedaPagado: false
            }
         };
      }
      throw error;
    }
  },
};
