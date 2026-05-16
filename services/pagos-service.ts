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
  idempotencyKey?: string | null;
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
  idempotencyKey?: string;
}

export const pagosService = {
  generarIdempotencyKey(prefix = 'pay') {
    const random =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2, 12);
    return `${prefix}-${Date.now()}-${random}`;
  },

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
    const payload: CrearPagoDto = {
      ...data,
      idempotencyKey: data.idempotencyKey || this.generarIdempotencyKey(),
    };

    try {
      // Si hay un comprobante, debemos usar FormData para el envío de archivos
      if (payload.comprobante || payload.metodoPago === MetodoPago.TRANSFERENCIA) {
        const formData = new FormData();
        formData.append('prestamoId', payload.prestamoId);
        formData.append('clienteId', payload.clienteId);
        formData.append('cobradorId', payload.cobradorId);
        formData.append('montoTotal', payload.montoTotal.toString());
        formData.append('metodoPago', payload.metodoPago || '');
        formData.append('idempotencyKey', payload.idempotencyKey!);
        if (payload.numeroReferencia) formData.append('numeroReferencia', payload.numeroReferencia);
        if (payload.notas) formData.append('notas', payload.notas);
        if (payload.fechaPago) formData.append('fechaPago', payload.fechaPago);
        
        if (payload.comprobante) {
          formData.append('comprobante', payload.comprobante);
        }
        
        console.log('[pagosService.registrarPago] FormData keys:', Array.from((formData as any).keys()));
        console.log('[pagosService.registrarPago] Comprobante:', payload.comprobante ? {
          name: payload.comprobante.name,
          size: payload.comprobante.size,
          type: payload.comprobante.type
        } : 'No hay comprobante');

        return await apiRequest<ResultadoPago>('POST', '/payments', formData);
      }

      // Si es efectivo sin archivos, envío JSON normal
      return await apiRequest<ResultadoPago>('POST', '/payments', payload);
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
           payload,
           `Pago Offline $${payload.montoTotal}`
         );

         // Retornar objeto temporal con estimaciones
         return {
            pago: {
                id: tempId,
                numeroPago: 'OFFLINE',
                clienteId: payload.clienteId,
                prestamoId: payload.prestamoId,
                cobradorId: payload.cobradorId,
                fechaPago: toBogotaDateTimeOffsetIso(new Date()),
                montoTotal: payload.montoTotal,
                metodoPago: payload.metodoPago || MetodoPago.EFECTIVO,
                numeroReferencia: payload.numeroReferencia || null,
                notas: payload.notas || 'Pago registrado offline',
                idempotencyKey: payload.idempotencyKey,
                creadoEn: toBogotaDateTimeOffsetIso(new Date()),
                actualizadoEn: toBogotaDateTimeOffsetIso(new Date()),
            } as any,
            descomposicion: {
                montoTotal: payload.montoTotal,
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


