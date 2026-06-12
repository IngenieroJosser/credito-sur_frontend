import { toBogotaDateTimeOffsetIso } from '@/lib/rutas-core'
import type { CrearPrestamoDto } from '@/services/prestamos-service'
import { FrecuenciaPago, TipoAmortizacion } from '@/types/enums'

export type CrearCreditoModalData = {
  creditType: 'prestamo' | 'articulo'
  clienteCreditoId: string
  monto: number
  tipoInteres?: TipoAmortizacion
  tasaInteres?: number
  cuotasTotales?: number
  cantidadCuotas?: number
  cuotas?: number
  frecuenciaPago?: string
  fechaInicio?: string
  fechaPrimerCobro?: string
  articuloId?: string
  precioProductoId?: string
  plazoMeses?: number
  numCuotas?: number
  cuotaInicialArticulo?: number
  notas?: string
  ventaContado?: boolean
  articuloNombre?: string
}

export type CrearPrestamoPayload = CrearPrestamoDto & {
  cuotas?: number
  esContado?: boolean
}

export function resolveCurrentUserId() {
  if (typeof window === 'undefined') return ''

  const token = window.localStorage.getItem('token')
  if (token) {
    try {
      const base64Url = token.split('.')[1]
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
      const padding = '='.repeat((4 - (base64.length % 4)) % 4)
      const payload = JSON.parse(window.atob(base64 + padding))
      const id = payload?.sub || payload?.id
      if (id) return String(id)
    } catch {
      // Continuamos con el respaldo en localStorage user.
    }
  }

  try {
    const user = JSON.parse(window.localStorage.getItem('user') || '{}')
    return String(user?.id || '')
  } catch {
    return ''
  }
}

function inferPlazoMeses(data: CrearCreditoModalData, frecuenciaPago: string, esArticulo: boolean, esContado: boolean) {
  if (data.plazoMeses && data.plazoMeses > 0) return data.plazoMeses
  if (esArticulo || esContado) return 1

  const totalCuotas = data.cuotasTotales || data.cuotas || data.cantidadCuotas || data.numCuotas || 1
  switch (frecuenciaPago) {
    case FrecuenciaPago.DIARIO:
      return Math.max(1, Math.ceil(totalCuotas / 30))
    case FrecuenciaPago.SEMANAL:
      return Math.max(1, Math.ceil(totalCuotas / 4))
    case FrecuenciaPago.QUINCENAL:
      return Math.max(1, Math.ceil(totalCuotas / 2))
    case FrecuenciaPago.MENSUAL:
      return Math.max(1, totalCuotas)
    default:
      return 1
  }
}

export function buildCrearPrestamoPayload(
  data: CrearCreditoModalData,
  creadoPorId: string = resolveCurrentUserId(),
): CrearPrestamoPayload {
  const esArticulo = data.creditType === 'articulo'
  const esContado = esArticulo && Boolean(data.ventaContado)
  const frecuenciaPago = esContado ? FrecuenciaPago.MENSUAL : (data.frecuenciaPago || FrecuenciaPago.DIARIO)
  const totalCuotas = data.cuotas || data.cantidadCuotas || data.cuotasTotales || data.numCuotas || 0

  const payload: CrearPrestamoPayload = {
    clienteId: data.clienteCreditoId,
    tipoPrestamo: esArticulo ? 'ARTICULO' : 'EFECTIVO',
    monto: Number(data.monto || 0),
    tasaInteres: esContado ? 0 : Number(data.tasaInteres || 0),
    tasaInteresMora: 2,
    plazoMeses: inferPlazoMeses(data, frecuenciaPago, esArticulo, esContado),
    cantidadCuotas: totalCuotas,
    cuotas: totalCuotas,
    frecuenciaPago: frecuenciaPago as FrecuenciaPago,
    tipoAmortizacion: data.tipoInteres || TipoAmortizacion.INTERES_SIMPLE,
    fechaInicio: data.fechaInicio || toBogotaDateTimeOffsetIso(new Date()),
    creadoPorId,
    cuotaInicial: Number(data.cuotaInicialArticulo || 0),
    notas: esArticulo
      ? `${esContado ? 'Venta de contado' : 'Crédito de artículo'}${data.articuloNombre ? `: ${data.articuloNombre}` : ''}`
      : (data.notas || ''),
    esContado,
  }

  if (!esContado && data.fechaPrimerCobro) {
    payload.fechaPrimerCobro = data.fechaPrimerCobro
  }

  if (esArticulo) {
    payload.productoId = data.articuloId
    if (!esContado) payload.precioProductoId = data.precioProductoId
    if (esContado) payload.notas = 'Venta de artículo de contado'
  }

  return payload
}
