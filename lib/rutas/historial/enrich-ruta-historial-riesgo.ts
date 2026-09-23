import { prestamosService } from '@/services/prestamos-service'
import type { VisitaRuta } from '@/lib/types/cobranza'
import { resolveFechaEfectivaCuota, normalizeDateKey, isCuotaNoPagada, computeMontoExigibleHastaHoyFromCuotas, computeDiasMoraFromCuotas } from '@/lib/rutas-core'
import { resolveRiesgoObligacion, resolveNivelRiesgoUi } from '@/lib/rutas/riesgo-obligacion'
import { mapWithConcurrency, memoizePromiseByKey } from '@/lib/async-utils'

interface EnrichRutaHistorialRiesgoOptions {
  visitas: VisitaRuta[]
  fechaClave: string
  hoyBogotaKey?: string
  visitasHoy?: VisitaRuta[]
}

/**
 * Enriquece las visitas del historial con el cálculo de riesgo histórico
 * basado en las cuotas del préstamo en esa fecha específica.
 *
 * Regla: Historial de riesgo = riesgo de la obligación en esa fecha, no riesgo plano del cliente.
 */
export async function enrichRutaHistorialRiesgo({
  visitas,
  fechaClave,
  hoyBogotaKey,
  visitasHoy,
}: EnrichRutaHistorialRiesgoOptions): Promise<VisitaRuta[]> {
  const visitasConPrestamo = visitas.filter((v: any) => !!String(v?.prestamoId || ''))
  const esHistorialDeHoy = fechaClave === hoyBogotaKey
  const expectedSource = esHistorialDeHoy ? 'ruta-hoy-v1' : 'cuotas-historicas-v2'
  const yaEnriquecido = visitasConPrestamo.length > 0
    && visitasConPrestamo.every((v: any) =>
      (v)?.riesgoHistoricoUiCalculado === true &&
      (v)?.riesgoHistoricoUiSource === expectedSource
    )
  
  if (yaEnriquecido) return visitas

  // Para el día actual, usar los mismos datos de la ruta actual
  if (esHistorialDeHoy && Array.isArray(visitasHoy) && visitasHoy.length > 0) {
    const liveByPrestamoId = new Map(
      visitasHoy
        .filter((v: any) => String(v?.prestamoId || '').trim())
        .map((v: any) => [String(v.prestamoId).trim(), v]),
    )

    const nextVisitas = visitas.map((v: any) => {
      const pid = String(v?.prestamoId || '').trim()
      const live = liveByPrestamoId.get(pid)

      if (!live) {
        return {
          ...v,
          nivelRiesgo: v?.nivelRiesgo || v?.nivelRiesgoObligacion || 'minimo',
          riesgoHistoricoUiCalculado: true,
          riesgoHistoricoUiSource: 'ruta-hoy-v1-fallback',
        }
      }

      return {
        ...v,
        estado: live.estado,
        nivelRiesgo: live.nivelRiesgo,
        nivelRiesgoObligacion: (live).nivelRiesgoObligacion,
        montoCuota: live.montoCuota,
        montoCuotaNormal: (live).montoCuotaNormal ?? live.montoCuota,
        montoCuotaPendiente: (live).montoCuotaPendiente,
        montoVencidoAcumulado: (live).montoVencidoAcumulado,
        saldoVencidoAcumulado: (live).saldoVencidoAcumulado,
        montoMoraAcumulada: (live).montoMoraAcumulada,
        cuotasVencidas: (live).cuotasVencidas,
        diasMora: (live).diasMora,
        cuotaActual: (live).cuotaActual,
        cuotasTotales: (live).cuotasTotales,
        cuotaId: (live).cuotaId,
        cuotaObjetivoId: (live).cuotaObjetivoId,
        cuotaObjetivoPrestamoId: (live).cuotaObjetivoPrestamoId,
        cuotaObjetivo: (live).cuotaObjetivo,
        proximaCuota: (live).proximaCuota,
        enMoraHistorico:
          live.estado === 'en_mora' ||
          Number((live).montoVencidoAcumulado || 0) > 0 ||
          Number((live).diasMora || 0) > 0,
        riesgoHistoricoUiCalculado: true,
        riesgoHistoricoUiSource: 'ruta-hoy-v1',
      }
    })

    return nextVisitas.map((v: any) => ({
      ...v,
      riesgoHistoricoUiCalculado: true,
      riesgoHistoricoUiSource: 'ruta-hoy-v1',
    }))
  }

  const prestamoIds = Array.from(new Set(visitasConPrestamo.map((v: any) => String(v?.prestamoId || '')).filter(Boolean)))
  if (prestamoIds.length === 0) return visitas

  const cuotasHistorialCacheRef = { current: new Map<string, any[]>() }

  const getCuotasByPrestamoId = memoizePromiseByKey(
    async (prestamoId: string) => {
      const cache = cuotasHistorialCacheRef.current
      if (cache.has(prestamoId)) return cache.get(prestamoId) || []
      const cuotas = await prestamosService.obtenerCuotas(prestamoId).catch(() => [])
      cache.set(prestamoId, cuotas as any[])
      return cuotas as any[]
    },
    () => [],
  )

  const nextVisitas = await mapWithConcurrency(
    visitas,
    async (v: any) => {
      const pid = String(v?.prestamoId || '')
      if (!pid) return v
      const cuotas = await getCuotasByPrestamoId(pid)
      const cuotasArray = Array.isArray(cuotas) ? cuotas : []

      // Calcular cuotas vencidas históricas
      const cuotasVencidasHistoricas = cuotasArray.filter((c: any) => {
        if (!c || !isCuotaNoPagada(c)) return false
        const vtoRaw = resolveFechaEfectivaCuota(c) || String(c?.fechaVencimiento || '')
        const vtoKey = normalizeDateKey(vtoRaw)
        return !!vtoKey && vtoKey < fechaClave
      })

      const cuotasVencidasFinal = cuotasVencidasHistoricas.length

      // Calcular monto vencido bruto
      const montoVencidoBruto = computeMontoExigibleHastaHoyFromCuotas(
        cuotasArray as any,
        fechaClave,
      )

      const montoVencidoFinal = montoVencidoBruto

      // Calcular días de mora final
      const diasMoraFinal = computeDiasMoraFromCuotas(
        cuotasArray as any,
        fechaClave,
        (v)?.frecuenciaPago || (v)?.periodoRuta || 'DIARIO',
      )

      // Determinar si tiene mora histórica
      const tieneMoraHistorica =
        Number(diasMoraFinal || 0) > 0 ||
        Number(cuotasVencidasFinal || 0) > 0 ||
        Number(montoVencidoFinal || 0) > 0

      // Calcular cuota normal y recaudo del día
      const cuotaNormal = Number((v)?.montoCuotaNormal ?? (v)?.montoCuota ?? 0)
      const recaudadoDelDia = Number((v)?.recaudadoDelDia || 0)

      // Determinar si pagó la cuota completa
      const pagoCompletaCuota =
        recaudadoDelDia > 0 &&
        cuotaNormal > 0 &&
        recaudadoDelDia >= cuotaNormal

      // Determinar estado histórico
      const estadoHistorico =
        pagoCompletaCuota
          ? 'pagado'
          : tieneMoraHistorica
            ? 'en_mora'
            : 'pendiente'

      // Calcular en prorroga histórico
      const enProrrogaHistorico = cuotasArray.some((c: any) => {
        if (!c || !isCuotaNoPagada(c)) return false
        const prRaw = String(c?.fechaVencimientoProrroga || '')
        if (!prRaw) return false
        const prKey = normalizeDateKey(prRaw)
        if (!prKey) return false
        const vtoKey = normalizeDateKey(resolveFechaEfectivaCuota(c) || String(c?.fechaVencimiento || ''))

        // Considerar en prórroga si:
        // - existe fecha de prórroga
        // - la fecha del historial está antes o en la prórroga
        // - y el vencimiento original ya era previo/igual a la fecha del historial (se activó la prórroga)
        if (prKey < fechaClave) return false
        if (vtoKey && vtoKey > fechaClave) return false
        return true
      })

      // Calcular riesgo con datos históricos
      const rowRiesgo = {
        ...v,
        estado: estadoHistorico,
        montoVencidoAcumulado: montoVencidoFinal,
        saldoVencidoAcumulado: montoVencidoFinal,
        montoMoraAcumulada: montoVencidoFinal,
        cuotasVencidas: cuotasVencidasFinal,
        diasMora: diasMoraFinal,
        enMoraHistorico: tieneMoraHistorica,
      }

      const nivelRiesgoRaw = resolveRiesgoObligacion({
        row: rowRiesgo,
        prestamo: (v)?.prestamo || {},
        cuotaObjetivo: (v)?.cuotaObjetivo || (v)?.proximaCuota || {},
        estadoCalculado: estadoHistorico,
        diasMora: diasMoraFinal,
        cuotasVencidas: cuotasVencidasFinal,
        esProvisional: Boolean((v)?.esProvisional),
      })

      const nivelRiesgo = resolveNivelRiesgoUi(nivelRiesgoRaw)

      return {
        ...v,
        estado: estadoHistorico,
        montoCuotaPendiente: montoVencidoFinal > 0 ? montoVencidoFinal : (v)?.montoCuotaPendiente,
        montoVencidoAcumulado: montoVencidoFinal,
        saldoVencidoAcumulado: montoVencidoFinal,
        montoMoraAcumulada: montoVencidoFinal,
        cuotasVencidas: cuotasVencidasFinal,
        diasMora: diasMoraFinal,
        enMoraHistorico: tieneMoraHistorica,
        enProrrogaHistorico,
        nivelRiesgo,
        nivelRiesgoObligacion: nivelRiesgoRaw,
        riesgoHistoricoUiCalculado: true,
        riesgoHistoricoUiSource: 'cuotas-historicas-v2',
      }
    },
    6,
  )

  // Logs de validación para riesgo histórico UI
  if (process.env.NODE_ENV !== 'production') {
    console.table(nextVisitas.map((v: any) => ({
      tipo: 'RIESGO_HISTORIAL_UI',
      cliente: v.cliente,
      prestamoId: v.prestamoId,
      estado: v.estado,
      montoCuotaNormal: v.montoCuotaNormal,
      recaudadoDelDia: v.recaudadoDelDia,
      montoVencidoAcumulado: v.montoVencidoAcumulado,
      cuotasVencidas: v.cuotasVencidas,
      diasMora: v.diasMora,
      enMoraHistorico: v.enMoraHistorico,
      nivelRiesgo: v.nivelRiesgo,
      nivelRiesgoObligacion: v.nivelRiesgoObligacion,
    })))
  }

  return nextVisitas.map((v: any) => ({
    ...v,
    riesgoHistoricoUiCalculado: true,
    riesgoHistoricoUiSource: v?.riesgoHistoricoUiSource || 'cuotas-historicas-v2',
  }))
}
