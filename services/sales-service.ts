import { apiRequest } from '@/lib/api/api'
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
  async registrarVentaContado(data: VentaContadoPayload): Promise<VentaContadoResponse> {
    return apiRequest<VentaContadoResponse>('POST', '/sales/cash', data)
  },

  async obtenerVentasContado() {
    return apiRequest<any[]>('GET', '/sales/cash')
  },
}
