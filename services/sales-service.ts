import { apiRequest } from '@/lib/api/api'
import { syncService } from '@/lib/offline/syncService'
import { logger } from '@/lib/logger'
import type { VentaContadoPayload } from '@/lib/creditos/crear-prestamo-payload'

export type VentaContadoResponse = {
  success: boolean
  ventaId: string
  clienteId: string
  productoId: string
  precioVenta: number
  metodoPago: 'EFECTIVO' | 'TRANSFERENCIA'
  transaccionId: string
  numeroTransaccion: string
  journalEntryId: string | null
}

export const salesService = {
  async registrarVentaContado(dataEntrada: VentaContadoPayload): Promise<VentaContadoResponse> {
    // Clave de idempotencia: misma clave online y offline, para que un reintento
    // (tras sincronizar) no duplique el movimiento de dinero.
    const data = {
      ...dataEntrada,
      idempotencyKey:
        (dataEntrada as any).idempotencyKey ||
        `venta-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    }
    try {
      return await apiRequest<VentaContadoResponse>('POST', '/sales/cash', data)
    } catch (error: any) {
      if (
        (typeof navigator !== 'undefined' && !navigator.onLine) ||
        error?.statusCode === 0 ||
        error?.message?.includes('network') ||
        error?.code === 'ERR_NETWORK'
      ) {
        logger.log('[Offline Mode] Guardando venta de contado en cola...')
        await syncService.enqueueOperation(
          'venta_contado',
          '/sales/cash',
          'POST',
          data,
          `Venta de contado (offline)`,
        )
        // Respuesta optimista: la venta se confirmará al sincronizar.
        return {
          success: true,
          ventaId: `temp-venta-${Date.now()}`,
          clienteId: (data as any)?.clienteId ?? '',
          productoId: (data as any)?.productoId ?? '',
          precioVenta: (data as any)?.precioVenta ?? 0,
          metodoPago: (data as any)?.metodoPago ?? 'EFECTIVO',
          transaccionId: '',
          numeroTransaccion: 'OFFLINE',
          journalEntryId: null,
        }
      }
      throw error
    }
  },

  async obtenerVentasContado() {
    return apiRequest<any[]>('GET', '/sales/cash')
  },
}
