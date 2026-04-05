import { logger } from '@/lib/logger'
import { apiRequest } from '@/lib/api/api';
import { syncService } from '@/lib/offline/syncService';
import { MetodoPago } from '@/types/enums';
import { toBogotaDateTimeOffsetIso } from '@/lib/rutas-core'

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

export interface ArchivoMultimediaPago {
  id: string;
  tipoContenido: string;        // 'COMPROBANTE_TRANSFERENCIA' | 'RECIBO_PAGO' | etc.
  tipoArchivo: string;          // mimetype
  nombreOriginal: string | null;
  url: string | null;
  ruta: string | null;
  formato: string | null;
  tamanoBytes: number;
  creadoEn: string;
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
  archivos?: ArchivoMultimediaPago[];  // Comprobantes de transferencia, etc.
  cliente?: { id: string; nombres: string; apellidos: string; dni?: string };
  cobrador?: { id: string; nombres: string; apellidos: string };
  prestamo?: { id: string; numeroPrestamo: string; saldoPendiente: number };
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
  comprobante?: File | null;
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
      // Si hay un comprobante, debemos usar FormData para el envío de archivos
      if (data.comprobante || data.metodoPago === MetodoPago.TRANSFERENCIA) {
        const formData = new FormData();
        formData.append('prestamoId', data.prestamoId);
        formData.append('clienteId', data.clienteId);
        formData.append('cobradorId', data.cobradorId);
        formData.append('montoTotal', data.montoTotal.toString());
        formData.append('metodoPago', data.metodoPago || '');
        if (data.numeroReferencia) formData.append('numeroReferencia', data.numeroReferencia);
        if (data.notas) formData.append('notas', data.notas);
        if (data.fechaPago) formData.append('fechaPago', data.fechaPago);
        
        if (data.comprobante) {
          formData.append('comprobante', data.comprobante);
        }
        
        console.log('[pagosService.registrarPago] FormData keys:', Array.from((formData as any).keys()));
        console.log('[pagosService.registrarPago] Comprobante:', data.comprobante ? {
          name: data.comprobante.name,
          size: data.comprobante.size,
          type: data.comprobante.type
        } : 'No hay comprobante');

        return await apiRequest<ResultadoPago>('POST', '/payments', formData);
      }

      // Si es efectivo sin archivos, envío JSON normal
      return await apiRequest<ResultadoPago>('POST', '/payments', data);
    } catch (error: any) {
       if (
        (typeof navigator !== 'undefined' && !navigator.onLine) ||
        error?.statusCode === 0 || 
        error?.message?.includes('network') ||
        error?.code === 'ERR_NETWORK'
      ) {
         logger.log('[Offline Mode] Guardando pago en cola...');
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
                fechaPago: toBogotaDateTimeOffsetIso(new Date()),
                montoTotal: data.montoTotal,
                metodoPago: data.metodoPago || MetodoPago.EFECTIVO,
                numeroReferencia: data.numeroReferencia || null,
                notas: data.notas || 'Pago registrado offline',
                creadoEn: toBogotaDateTimeOffsetIso(new Date()),
                actualizadoEn: toBogotaDateTimeOffsetIso(new Date()),
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


