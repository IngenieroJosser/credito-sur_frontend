import { toBogotaDateTimeOffsetIso } from '@/lib/rutas-core'
import type { CrearPrestamoDto } from '@/services/prestamos-service'
import { FrecuenciaPago, TipoAmortizacion } from '@/types/enums'
import { derivarPlazoMeses } from '@/lib/creditos/preview-credito'

export type CrearCreditoModalData = {
  creditType: 'prestamo' | 'articulo'
  clienteCreditoId: string
  monto: number
  tipoInteres?: TipoAmortizacion
  tipoAmortizacion?: TipoAmortizacion
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
  metodoPago?: 'EFECTIVO' | 'TRANSFERENCIA'
}

export type CrearPrestamoPayload = CrearPrestamoDto & {
  cuotas?: number
  esContado?: boolean
}

export type VentaContadoPayload = {
  clienteId: string
  productoId: string
  precioVenta: number
  cajaId: string
  creadoPorId: string
  metodoPago: 'EFECTIVO' | 'TRANSFERENCIA'
  notas: string
  /**
   * Clave de idempotencia para el modo offline.
   *
   * `venta_contado` esta en la lista de tipos idempotentes de la cola, asi que esta
   * clave es lo que evita que una venta encolada se registre dos veces si el sync
   * reintenta. El servicio ya la ponia, y la leia con un `as any` porque el tipo no
   * la declaraba.
   */
  idempotencyKey?: string
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

/**
 * El plazo en meses que se manda al crear.
 *
 * Delega en `derivarPlazoMeses`, la misma funcion que usa la VISTA PREVIA del modal, en
 * vez de tener su propia copia: la que habia aqui redondeaba con `Math.ceil`, y eso es
 * justo lo que la nota de `derivarPlazoMeses` advierte que infla el interes (45 cuotas
 * diarias serian 2 meses en vez de 1,5, un 33% mas). El backend acepta el fraccionario:
 * lo usa tal cual para el interes simple y solo lo redondea para la columna, que es `Int`
 * (loans.service.ts:3568-3585).
 *
 * Medido: hoy esta rama NO se ejecuta nunca, porque `CrearCreditoModal` -el unico origen
 * de todos los llamadores- siempre manda `plazoMeses` ya fraccionario
 * (CrearCreditoModal.tsx:940 y :965) y la primera linea lo devuelve tal cual. Se cambia
 * para que la copia no pueda despertar: el limite de la medicion es que se leyeron los
 * llamadores de hoy, no los de manana.
 */
function inferPlazoMeses(
  data: CrearCreditoModalData,
  frecuenciaPago: string,
  esArticulo: boolean,
  esContado: boolean,
) {
  if (data.plazoMeses && data.plazoMeses > 0) return data.plazoMeses
  if (esArticulo || esContado) return 1

  const totalCuotas = data.cuotasTotales || data.cuotas || data.cantidadCuotas || data.numCuotas || 1
  return derivarPlazoMeses(totalCuotas, frecuenciaPago) || 1
}

export function buildCrearPrestamoPayload(
  data: CrearCreditoModalData,
  creadoPorId: string = resolveCurrentUserId(),
): CrearPrestamoPayload {
  const esArticulo = data.creditType === 'articulo'
  const esContado = esArticulo && Boolean(data.ventaContado)
  if (esContado) {
    throw new Error('La venta de contado debe registrarse por el flujo de ventas.')
  }
  const frecuenciaPago = esContado ? FrecuenciaPago.MENSUAL : (data.frecuenciaPago || FrecuenciaPago.DIARIO)
  const totalCuotas = data.cuotas || data.cantidadCuotas || data.cuotasTotales || data.numCuotas || 0
  const actorId = creadoPorId || resolveCurrentUserId()

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
    tipoAmortizacion: data.tipoAmortizacion || data.tipoInteres || TipoAmortizacion.INTERES_PLANO,
    fechaInicio: data.fechaInicio || toBogotaDateTimeOffsetIso(new Date()),
    creadoPorId: actorId,
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

export function buildVentaContadoPayload(
  data: CrearCreditoModalData,
  creadoPorId: string = resolveCurrentUserId(),
  cajaId = '',
): VentaContadoPayload {
  return {
    clienteId: data.clienteCreditoId,
    productoId: data.articuloId || '',
    precioVenta: Number(data.monto || 0),
    cajaId,
    creadoPorId: creadoPorId || resolveCurrentUserId(),
    metodoPago: (data.metodoPago || 'EFECTIVO') as 'EFECTIVO' | 'TRANSFERENCIA',
    notas: data.notas || 'Venta de artículo de contado',
  }
}
