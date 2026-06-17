/**
 * Helper compartido para enriquecer visitas con cuotas vivas y recalcular riesgo final.
 * Centraliza la lógica de enriquecimiento para todas las vistas:
 * - Vista Cobrador
 * - Admin Ruta Actual
 * - Supervisor
 * - Coordinador
 *
 * Esto asegura que todas las vistas usen la misma pasada de datos para calcular riesgo.
 *
 * CORRECCIÓN CONCEPTUAL:
 * - montoCuotaPendiente / meta operativa → puede incluir cuota de hoy (<= hoyBogotaKey)
 * - montoVencidoAcumulado / mora acumulada → solo cuotas con vencimiento anterior a hoy (< hoyBogotaKey)
 * - cuotasVencidas → solo cuotas con vencimiento anterior a hoy (< hoyBogotaKey)
 */

import { resolveNivelRiesgoVisita } from './resolve-riesgo-visita'
import {
  normalizeDateKey,
  resolveFechaEfectivaCuota,
  isCuotaNoPagada,
  computeDiasMoraFromCuotas,
  computeMontoExigibleHastaHoyFromCuotas,
} from '@/lib/rutas-core'
import { mapWithConcurrency } from '@/lib/async-utils'

// Helpers internos para mora estricta (solo cuotas vencidas antes de hoy)
const getCuotaVtoKey = (cuota: any): string => {
  return normalizeDateKey(
    resolveFechaEfectivaCuota(cuota) || String(cuota?.fechaVencimiento || '')
  )
}

const isCuotaVencidaAntesDeHoy = (cuota: any, hoyBogotaKey: string): boolean => {
  if (!cuota || !isCuotaNoPagada(cuota)) return false

  const vtoKey = getCuotaVtoKey(cuota)

  return !!vtoKey && !!hoyBogotaKey && vtoKey < hoyBogotaKey
}

const getMontoPendienteCuota = (cuota: any): number => {
  const nominal = Number(
    cuota?.montoNominal ??
    cuota?.montoCuota ??
    cuota?.monto ??
    0
  )

  const pagado = Number(cuota?.montoPagado ?? 0)

  return Math.max(0, nominal - pagado)
}

const computeMontoVencidoAntesDeHoyFromCuotas = (
  cuotas: any[],
  hoyBogotaKey: string
): number => {
  return (Array.isArray(cuotas) ? cuotas : [])
    .filter((cuota) => isCuotaVencidaAntesDeHoy(cuota, hoyBogotaKey))
    .reduce((sum, cuota) => sum + getMontoPendienteCuota(cuota), 0)
}

const computeCuotasVencidasAntesDeHoyFromCuotas = (
  cuotas: any[],
  hoyBogotaKey: string
): number => {
  return (Array.isArray(cuotas) ? cuotas : [])
    .filter((cuota) => isCuotaVencidaAntesDeHoy(cuota, hoyBogotaKey))
    .length
}

// Helpers para calcular fechaOrdenRuta
const parseBogotaKeyToTs = (key?: string | null): number => {
  if (!key) return 0
  const normalized = normalizeDateKey(String(key))
  if (!normalized) return 0
  const ts = new Date(`${normalized}T00:00:00-05:00`).getTime()
  return Number.isFinite(ts) ? ts : 0
}

const resolvePrimeraCuotaPendienteKey = (cuotas: any[]): string => {
  const pendientes = (Array.isArray(cuotas) ? cuotas : [])
    .filter((c) => c && isCuotaNoPagada(c))
    .map((c) => normalizeDateKey(resolveFechaEfectivaCuota(c) || String(c?.fechaVencimiento || '')))
    .filter(Boolean)
    .sort()

  return pendientes[0] || ''
}

export async function enrichVisitasConCuotasYRiesgo(params: {
  visitas: any[]
  hoyBogotaKey: string
  getCuotasByPrestamoId: (prestamoId: string) => Promise<any[]>
  getPrestamoById?: (prestamoId: string) => Promise<any>
  concurrency?: number
}): Promise<any[]> {
  const { visitas, hoyBogotaKey, getCuotasByPrestamoId, getPrestamoById, concurrency = 6 } = params

  const visitasFinales = await mapWithConcurrency(
    visitas,
    async (visita: any) => {
      if (!visita?.prestamoId) return visita

      const cuotas = await getCuotasByPrestamoId(String(visita.prestamoId))
      const pendiente = (Array.isArray(cuotas) ? cuotas : []).find((c: any) =>
        isCuotaNoPagada(c),
      )

      if (!pendiente) {
        return {
          ...visita,
          estado: 'pagado',
          saldoTotal: 0,
          nivelRiesgo: 'minimo',
        }
      }

      // Cálculo de mora estricta: solo cuotas vencidas antes de hoy (< hoyBogotaKey)
      const cuotasVencidasCalculadas = computeCuotasVencidasAntesDeHoyFromCuotas(
        cuotas,
        hoyBogotaKey
      )

      const montoVencidoAcumuladoFinal = computeMontoVencidoAntesDeHoyFromCuotas(
        cuotas,
        hoyBogotaKey
      )

      // Cálculo de días de mora con mora estricta (solo cuotas vencidas antes de hoy)
      const diasMoraRaw = computeDiasMoraFromCuotas(
        cuotas,
        hoyBogotaKey,
        visita?.frecuenciaPago || visita?.prestamoRaw?.frecuenciaPago || visita?.periodoRuta || 'DIARIO'
      )

      // La mora solo existe si hay cuotas vencidas estrictamente antes de hoy.
      // Si la cuota vence hoy, no debe generar mora ni riesgo.
      const diasMoraFinal =
        cuotasVencidasCalculadas > 0
          ? Math.max(1, Number(diasMoraRaw || 0))
          : 0

      // Monto operativo exigible de hoy (puede incluir cuota de hoy para meta/cobro)
      const montoOperativoExigibleFinal = computeMontoExigibleHastaHoyFromCuotas(
        cuotas,
        hoyBogotaKey
      )

      // Tiene mora solo si hay cuotas vencidas antes de hoy
      const tieneMora = cuotasVencidasCalculadas > 0

      const cuotasVencidasFinal = tieneMora
        ? Math.max(Number(cuotasVencidasCalculadas || 0), 1)
        : 0

      const fechaReal =
        resolveFechaEfectivaCuota(pendiente) ||
        pendiente?.fechaVencimiento ||
        visita?.proximaVisita

      const montoCuotaNormal = Number(
        pendiente?.montoNominal ??
        pendiente?.montoCuota ??
        pendiente?.monto ??
        visita?.montoCuotaNormal ??
        visita?.montoCuota ??
        0
      )

      // Calcular fechaOrdenRuta para ordenamiento de ruta
      const primeraCuotaPendienteKey = resolvePrimeraCuotaPendienteKey(cuotas)
      const primeraCuotaPendienteTs = parseBogotaKeyToTs(primeraCuotaPendienteKey)

      const fechaUltimoPagoTs = Number(
        visita?.fechaUltimoPago ??
        visita?.ultimoPagoAt ??
        visita?.ultimoPagoEn ??
        visita?.ultimaFechaPago ??
        0
      )

      const fechaOrdenRuta = fechaUltimoPagoTs > 0
        ? fechaUltimoPagoTs
        : primeraCuotaPendienteTs

      const visitaFinal = {
        ...visita,

        estado: tieneMora ? 'en_mora' : 'pendiente',

        cuotaObjetivo: pendiente,
        proximaCuota: pendiente,

        cuotaActual: pendiente?.numeroCuota ?? visita?.cuotaActual,
        cuotasTotales: cuotas.length || visita?.cuotasTotales,

        montoCuota: montoCuotaNormal,
        montoCuotaNormal: montoCuotaNormal,
        // Monto operativo exigible de hoy (puede incluir cuota de hoy para meta/cobro)
        montoCuotaPendiente: montoOperativoExigibleFinal,

        // Mora acumulada: solo cuotas vencidas antes de hoy
        montoMoraAcumulada: montoVencidoAcumuladoFinal,
        montoVencidoAcumulado: montoVencidoAcumuladoFinal,
        saldoVencidoAcumulado: montoVencidoAcumuladoFinal,

        cuotasVencidas: cuotasVencidasFinal,
        diasMora: diasMoraFinal,

        proximaVisita: fechaReal,

        prestamoRaw: visita?.prestamoRaw || visita?.prestamo || undefined,

        // Fechas para ordenamiento de ruta
        fechaPrimeraCuotaPendiente: primeraCuotaPendienteKey,
        fechaPrimeraCuotaPendienteTs: primeraCuotaPendienteTs,
        fechaUltimoPago: fechaUltimoPagoTs,
        fechaOrdenRuta,
      }

      const prestamoRiesgo =
        visitaFinal?.prestamoRaw ||
        visitaFinal?.prestamoAutoritativo ||
        visitaFinal?.prestamo ||
        {}

      return {
        ...visitaFinal,
        nivelRiesgo: resolveNivelRiesgoVisita(
          visitaFinal,
          prestamoRiesgo,
          pendiente
        ),
      }
    },
    concurrency,
  )

  // Log temporal en desarrollo
  if (process.env.NODE_ENV !== 'production') {
    console.table(visitasFinales.map((v: any) => ({
      cliente: v.cliente,
      prestamoId: v.prestamoId,
      cuotaActual: v.cuotaActual,
      estado: v.estado,
      nivelRiesgo: v.nivelRiesgo,
      fechaUltimoPago: v.fechaUltimoPago,
      fechaPrimeraCuotaPendiente: v.fechaPrimeraCuotaPendiente,
      fechaPrimeraCuotaPendienteTs: v.fechaPrimeraCuotaPendienteTs,
      fechaOrdenRuta: v.fechaOrdenRuta,
      montoVencidoAcumulado: v.montoVencidoAcumulado,
      cuotasVencidas: v.cuotasVencidas,
      diasMora: v.diasMora,
    })))
  }

  return visitasFinales
}
