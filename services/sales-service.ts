import { apiRequest } from '@/lib/api/api'
import { syncService } from '@/lib/offline/syncService'
import { logger } from '@/lib/logger'
import type { VentaContadoPayload } from '@/lib/creditos/crear-prestamo-payload'
import { esErrorDeRed } from '@/lib/offline/conRespaldoOffline'

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

/**
 * Una venta de contado, tal como la devuelve `GET /sales/cash`.
 *
 * Vive aqui y no en la pantalla porque el servicio es el dueno del contrato: la barra del
 * punto de venta tenia este mismo tipo declarado para su `map`, y el servicio devolvia
 * `any[]`, asi que lo que se declaraba alla no comprobaba nada de lo que llega aca.
 */
export interface VentaDeContado {
  id: string
  articulo?: string | null
  descripcion?: string | null
  monto?: number | string | null
  fecha?: string | null
  vendedor?: string | null
  cliente?: string | null
}

export const salesService = {
  async registrarVentaContado(dataEntrada: VentaContadoPayload): Promise<VentaContadoResponse> {
    // Clave de idempotencia: misma clave online y offline, para que un reintento
    // (tras sincronizar) no duplique el movimiento de dinero.
    const data = {
      ...dataEntrada,
      idempotencyKey:
        (dataEntrada).idempotencyKey ||
        `venta-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    }
    try {
      return await apiRequest<VentaContadoResponse>('POST', '/sales/cash', data)
    } catch (error) {
      if (esErrorDeRed(error)) {
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
          clienteId: (data)?.clienteId ?? '',
          productoId: (data)?.productoId ?? '',
          precioVenta: (data)?.precioVenta ?? 0,
          metodoPago: (data)?.metodoPago ?? 'EFECTIVO',
          transaccionId: '',
          numeroTransaccion: 'OFFLINE',
          journalEntryId: null,
        }
      }
      throw error
    }
  },

  async obtenerVentasContado() {
    return apiRequest<VentaDeContado[]>('GET', '/sales/cash')
  },
}
