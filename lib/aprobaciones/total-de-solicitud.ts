import { TipoAmortizacion } from '@/types/enums'
import { calcularPrestamoPreview, derivarPlazoMeses } from '@/lib/creditos/preview-credito'

/**
 * El total de un crédito que está esperando aprobación.
 *
 * Lo mira quien aprueba, así que tiene que ser el mismo número que el crédito va
 * a cobrar. Vivía dentro de `NotificacionDetalleModal`, donde no había forma de
 * probarlo, y tenía dos errores:
 *
 *  1. Usaba el `plazoMeses` que viene con la solicitud, que es la columna de la
 *     base y es ENTERA. El interés se calcula con el plazo fraccionario que sale
 *     de las cuotas y la frecuencia: 45 cuotas diarias son 1,5 meses, no 2.
 *     Medido con $1.000.000 al 10% mensual, eso mostraba $200.000 de interés
 *     donde el crédito cobra $150.000 — un 33% más.
 *  2. Sumaba el interés sin truncar, y trataba FRANCESA con una fórmula propia
 *     redondeada. El sistema trunca.
 *
 * El orden de preferencia se conserva tal cual estaba: lo que la solicitud ya
 * trae calculado manda sobre cualquier cuenta local.
 */

export interface DatosParaTotal {
  /** Total ya calculado por el backend. Si viene, es el que manda. */
  montoTotal?: unknown
  totalPagar?: unknown
  totalAPagar?: unknown
  /** Interés ya calculado. Con esto no hay que deducir el plazo. */
  interesTotal?: unknown
  /** Capital financiado. */
  monto?: unknown
  /** Precio del artículo, que en un crédito de artículo ES el total. */
  valorArticulo?: unknown
  cantidadCuotas?: unknown
  cuotas?: unknown
  tasaInteres?: unknown
  porcentaje?: unknown
  plazoMeses?: unknown
  frecuenciaPago?: unknown
  frecuencia?: unknown
  tipoAmortizacion?: unknown
}

/** Primer valor numérico positivo, como lo hacía el `pickNumber` del modal. */
const primeroPositivo = (...valores: unknown[]): number => {
  for (const valor of valores) {
    const n = Number(valor)
    if (Number.isFinite(n) && n > 0) return n
  }
  return 0
}

export const tipoAmortizacionDeSolicitud = (valor: unknown): TipoAmortizacion => {
  const texto = String(valor ?? '').toUpperCase()
  if (texto === 'FRANCESA') return TipoAmortizacion.FRANCESA
  if (texto === 'INTERES_PLANO') return TipoAmortizacion.INTERES_PLANO
  return TipoAmortizacion.INTERES_SIMPLE
}

/**
 * Plazo en meses para el cálculo del interés.
 *
 * Se deduce de las cuotas y la frecuencia, que es lo que hace el backend. El
 * `plazoMeses` de la solicitud solo se usa si no se puede deducir, porque viene
 * redondeado a entero.
 */
export const plazoParaInteres = (datos: DatosParaTotal): number => {
  const cuotas = primeroPositivo(datos.cantidadCuotas, datos.cuotas)
  const frecuencia = String(datos.frecuenciaPago || datos.frecuencia || 'DIARIO')
  const derivado = derivarPlazoMeses(cuotas, frecuencia)
  if (derivado > 0) return derivado
  return Math.max(1, Number(datos.plazoMeses) || 0)
}

/**
 * Total del crédito de la solicitud.
 *
 * @param esArticulo si la solicitud es de un crédito de artículo, donde el total
 *   es el precio del artículo y no hay interés que calcular.
 */
export function totalDeSolicitud(datos: DatosParaTotal, esArticulo: boolean): number {
  const yaCalculado = primeroPositivo(datos.montoTotal, datos.totalPagar, datos.totalAPagar)
  if (yaCalculado > 0) return yaCalculado

  const capital = primeroPositivo(datos.monto)

  if (esArticulo) {
    return primeroPositivo(datos.valorArticulo) || capital
  }

  const interes = primeroPositivo(datos.interesTotal)
  if (interes > 0) return capital + interes

  const preview = calcularPrestamoPreview({
    monto: capital,
    cuotas: primeroPositivo(datos.cantidadCuotas, datos.cuotas),
    tasa: primeroPositivo(datos.tasaInteres, datos.porcentaje),
    meses: plazoParaInteres(datos),
    tipoInteres: tipoAmortizacionDeSolicitud(datos.tipoAmortizacion),
  })

  return preview ? preview.total : capital
}
