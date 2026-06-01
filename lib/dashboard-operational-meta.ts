import { apiRequest } from '@/lib/api/api'
import {
  computeMontoExigibleHastaHoyFromCuotas,
  getBogotaDateKey,
  isCuotaNoPagada,
  isVisitaExigibleHoy,
  normalizeDateKey,
  getBogotaRangeByPeriod,
} from '@/lib/rutas-core'
import { mapAsignacionesToVisitasLite } from '@/lib/ruta-visitas-mapper'
import { buildRecaudosHoyMapByPrestamoId } from '@/lib/ruta-recaudos'
import { routesService } from '@/services/routes-service'
import { rutasService } from '@/services/rutas-service'
import { prestamosService } from '@/services/prestamos-service'

export type OperationalMetaTimeFilter = 'today' | 'week' | 'month' | 'year'

const metaByRouteCache = new Map<string, Record<string, number>>()

const toBackendRangePeriod = (timeFilter: OperationalMetaTimeFilter): 'HOY' | 'SEM' | 'MES' | 'AÑO' => {
  if (timeFilter === 'week') return 'SEM'
  if (timeFilter === 'month') return 'MES'
  if (timeFilter === 'year') return 'AÑO'
  return 'HOY'
}

const subtractOneDayBogotaKey = (dateKey: string): string => {
  const base = new Date(`${dateKey}T12:00:00-05:00`)
  base.setDate(base.getDate() - 1)
  return getBogotaDateKey(base) || dateKey
}

const getBeforeStartKey = (timeFilter: OperationalMetaTimeFilter, startKey: string): string => {
  if (timeFilter === 'today') return '2000-01-01'
  return subtractOneDayBogotaKey(startKey)
}

export const computeOperationalMetaTotalForTimeFilter = async (
  timeFilter: OperationalMetaTimeFilter,
): Promise<number> => {
  const range = getBogotaRangeByPeriod(toBackendRangePeriod(timeFilter))
  const startKey = normalizeDateKey(range.inicio)
  const endKey = normalizeDateKey(range.fin)
  if (!startKey || !endKey) return 0

  const beforeStartKey = getBeforeStartKey(timeFilter, startKey)

  let recaudosHoyMap: Record<string, number> = {}
  if (timeFilter === 'today') {
    try {
      const pagosResp: any = await apiRequest<any>('GET', '/payments?limit=5000', undefined, { cacheTTL: 0 } as any)
      const pagosData = (pagosResp as any)?.pagos || (pagosResp as any)?.data?.pagos || pagosResp || []
      recaudosHoyMap = buildRecaudosHoyMapByPrestamoId(
        (Array.isArray(pagosData) ? pagosData : []) as any,
        endKey,
        { includeCierrePendiente: false },
      )
    } catch {
      recaudosHoyMap = {}
    }
  }

  const rutasResp: any = await routesService.getAll({ limit: 500 } as any)
  const rutasPayload = (rutasResp as any)?.data ?? rutasResp
  const rutasArr: any[] = Array.isArray(rutasPayload)
    ? rutasPayload
    : (Array.isArray((rutasPayload as any)?.data) ? (rutasPayload as any).data : [])

  const rutasActivas = rutasArr.filter((r: any) => r && r.estado === 'ACTIVA' && r.id)
  if (rutasActivas.length === 0) return 0

  const metas = await Promise.all(
    rutasActivas.map(async (r: any) => {
      try {
        const rutaCompleta: any = await rutasService.obtenerRutaPorId(String(r.id))
        const asignaciones = Array.isArray(rutaCompleta?.asignaciones) ? rutaCompleta.asignaciones : []

        const asigsConCuotas = await Promise.all(
          asignaciones.map(async (asig: any) => {
            const cliente = asig?.cliente || null
            if (!cliente) return asig
            const prestamosRaw = Array.isArray(cliente?.prestamos) ? cliente.prestamos : []
            const prestamosValidos = prestamosRaw.filter((p: any) => p && (p.estado === 'ACTIVO' || p.estado === 'EN_MORA'))
            const prestamos = await Promise.all(
              prestamosValidos.map(async (p: any) => {
                if (!p?.id) return p
                const cuotasEmbebidas = Array.isArray(p?.cuotas) ? p.cuotas : []
                const cuotas = await prestamosService.obtenerCuotas(p.id).catch(() => cuotasEmbebidas)
                return { ...p, cuotas }
              }),
            )
            return { ...asig, cliente: { ...cliente, prestamos } }
          }),
        )

        const visitasLite = mapAsignacionesToVisitasLite({
          asignaciones: asigsConCuotas as any,
          hoyKey: endKey,
          cobradorId: String(rutaCompleta?.cobradorId || r?.cobradorId || ''),
        }) as any[]

        const idsProcesados = new Set<string>()
        const firstPass = (Array.isArray(visitasLite) ? visitasLite : []).flatMap((v: any) => {
          const uniqueKey = v?.prestamoId ? `loan-${v.prestamoId}` : `client-${v.clienteId}`
          if (idsProcesados.has(uniqueKey)) return []
          idsProcesados.add(uniqueKey)
          return [v]
        })
        const clientesConPrestamo = new Set(firstPass.filter((v: any) => v?.prestamoId).map((v: any) => v?.clienteId))
        const visitasDedupe = firstPass.filter((v: any) => {
          if (!v?.prestamoId && clientesConPrestamo.has(v?.clienteId)) return false
          return true
        })

        const cuotasMap = new Map<string, any[]>()
        for (const asig of asigsConCuotas as any[]) {
          for (const p of asig?.cliente?.prestamos || []) {
            if (p?.id && Array.isArray(p?.cuotas)) cuotasMap.set(String(p.id), p.cuotas)
          }
        }

        const metaRuta = visitasDedupe.reduce((sum: number, v: any) => {
          const pid = String(v?.prestamoId || '')
          if (!pid) return sum
          const cuotas = cuotasMap.get(pid)
          if (!cuotas || cuotas.length === 0) return sum

          const tieneCuotaPendiente = cuotas.some((c: any) => c && isCuotaNoPagada(c))
          if (!tieneCuotaPendiente) return sum

          // Excluir clientes marcados como ausente
          const estadoVisita = String(v?.estadoVisita || '').toLowerCase()
          const estado = String(v?.estado || '').toLowerCase()
          if (estadoVisita === 'ausente' || estado === 'ausente') return sum

          if (timeFilter === 'today' && !isVisitaExigibleHoy(v as any, endKey)) return sum

          const esArticulo = String((v as any)?.tipoPrestamo || '').toUpperCase() === 'ARTICULO'
          const untilEnd = esArticulo
            ? computeMontoExigibleHastaHoyFromCuotas(cuotas, endKey)
            : computeMontoExigibleHastaHoyFromCuotas(cuotas, endKey)
          const untilBeforeStart = timeFilter === 'today'
            ? 0
            : (esArticulo
              ? computeMontoExigibleHastaHoyFromCuotas(cuotas, beforeStartKey)
              : computeMontoExigibleHastaHoyFromCuotas(cuotas, beforeStartKey))

          let dueInPeriod = Math.max(0, Number(untilEnd || 0) - Number(untilBeforeStart || 0))

          if (timeFilter === 'today') {
            const saldoRealDesdeCuotas = (Array.isArray(cuotas) ? cuotas : []).reduce((s: number, c: any) => {
              if (!c || !isCuotaNoPagada(c)) return s
              const monto = Number((c as any)?.montoNominal ?? (c as any)?.monto ?? 0)
              const pagado = Number((c as any)?.montoPagado ?? 0)
              return s + Math.max(0, monto - pagado)
            }, 0)

            const saldoTotal = Number((v as any)?.saldoTotal || 0)
            const saldoParaTope = saldoRealDesdeCuotas > 0 ? saldoRealDesdeCuotas : saldoTotal
            if (Number.isFinite(saldoParaTope) && saldoParaTope > 0) {
              dueInPeriod = Math.min(dueInPeriod, saldoParaTope)
            }

            const recHoy = Number((recaudosHoyMap as any)?.[pid] || 0)
            if (Number.isFinite(recHoy) && recHoy > 0) {
              dueInPeriod = Math.max(0, dueInPeriod - recHoy)
            }
          }

          return sum + dueInPeriod
        }, 0)

        return Number(metaRuta || 0)
      } catch {
        return 0
      }
    }),
  )

  return metas.reduce((a, b) => a + Number(b || 0), 0)
}

export const computeOperationalMetaByRouteIdsForTimeFilter = async (
  timeFilter: OperationalMetaTimeFilter,
  routeIds: string[],
): Promise<Record<string, number>> => {
  const ids = (Array.isArray(routeIds) ? routeIds : []).map((x) => String(x || '').trim()).filter(Boolean)
  if (ids.length === 0) return {}

  const range = getBogotaRangeByPeriod(toBackendRangePeriod(timeFilter))
  const startKey = normalizeDateKey(range.inicio)
  const endKey = normalizeDateKey(range.fin)
  if (!startKey || !endKey) return {}

  const idsSorted = [...ids].sort()
  const cacheKey = `${timeFilter}:${startKey}:${endKey}::${idsSorted.join(',')}`
  const cached = metaByRouteCache.get(cacheKey)
  if (cached) return cached

  const beforeStartKey = getBeforeStartKey(timeFilter, startKey)

  let recaudosHoyMap: Record<string, number> = {}
  if (timeFilter === 'today') {
    try {
      const pagosResp: any = await apiRequest<any>('GET', '/payments?limit=5000', undefined, { cacheTTL: 0 } as any)
      const pagosData = (pagosResp as any)?.pagos || (pagosResp as any)?.data?.pagos || pagosResp || []
      recaudosHoyMap = buildRecaudosHoyMapByPrestamoId(
        (Array.isArray(pagosData) ? pagosData : []) as any,
        endKey,
        { includeCierrePendiente: false },
      )
    } catch {
      recaudosHoyMap = {}
    }
  }

  const out: Record<string, number> = {}
  await Promise.all(
    idsSorted.map(async (routeId) => {
      try {
        const rutaCompleta: any = await rutasService.obtenerRutaPorId(String(routeId))
        const asignaciones = Array.isArray(rutaCompleta?.asignaciones) ? rutaCompleta.asignaciones : []

        const asigsConCuotas = await Promise.all(
          asignaciones.map(async (asig: any) => {
            const cliente = asig?.cliente || null
            if (!cliente) return asig
            const prestamosRaw = Array.isArray(cliente?.prestamos) ? cliente.prestamos : []
            const prestamosValidos = prestamosRaw.filter((p: any) => p && (p.estado === 'ACTIVO' || p.estado === 'EN_MORA'))
            const prestamos = await Promise.all(
              prestamosValidos.map(async (p: any) => {
                if (!p?.id) return p
                const cuotasEmbebidas = Array.isArray(p?.cuotas) ? p.cuotas : []
                const cuotas = await prestamosService.obtenerCuotas(p.id).catch(() => cuotasEmbebidas)
                return { ...p, cuotas }
              }),
            )
            return { ...asig, cliente: { ...cliente, prestamos } }
          }),
        )

        const visitasLite = mapAsignacionesToVisitasLite({
          asignaciones: asigsConCuotas as any,
          hoyKey: endKey,
          cobradorId: String(rutaCompleta?.cobradorId || ''),
        }) as any[]

        const idsProcesados = new Set<string>()
        const firstPass = (Array.isArray(visitasLite) ? visitasLite : []).flatMap((v: any) => {
          const uniqueKey = v?.prestamoId ? `loan-${v.prestamoId}` : `client-${v.clienteId}`
          if (idsProcesados.has(uniqueKey)) return []
          idsProcesados.add(uniqueKey)
          return [v]
        })
        const clientesConPrestamo = new Set(firstPass.filter((v: any) => v?.prestamoId).map((v: any) => v?.clienteId))
        const visitasDedupe = firstPass.filter((v: any) => {
          if (!v?.prestamoId && clientesConPrestamo.has(v?.clienteId)) return false
          return true
        })

        const cuotasMap = new Map<string, any[]>()
        for (const asig of asigsConCuotas as any[]) {
          for (const p of asig?.cliente?.prestamos || []) {
            if (p?.id && Array.isArray(p?.cuotas)) cuotasMap.set(String(p.id), p.cuotas)
          }
        }

        const metaRuta = visitasDedupe.reduce((sum: number, v: any) => {
          const pid = String(v?.prestamoId || '')
          if (!pid) return sum
          const cuotas = cuotasMap.get(pid)
          if (!cuotas || cuotas.length === 0) return sum

          const tieneCuotaPendiente = cuotas.some((c: any) => c && isCuotaNoPagada(c))
          if (!tieneCuotaPendiente) return sum

          // Excluir clientes marcados como ausente
          const estadoVisita = String(v?.estadoVisita || '').toLowerCase()
          const estado = String(v?.estado || '').toLowerCase()
          if (estadoVisita === 'ausente' || estado === 'ausente') return sum

          if (timeFilter === 'today' && !isVisitaExigibleHoy(v as any, endKey)) return sum

          const esArticulo = String((v as any)?.tipoPrestamo || '').toUpperCase() === 'ARTICULO'
          const untilEnd = esArticulo
            ? computeMontoExigibleHastaHoyFromCuotas(cuotas, endKey)
            : computeMontoExigibleHastaHoyFromCuotas(cuotas, endKey)
          const untilBeforeStart = timeFilter === 'today'
            ? 0
            : (esArticulo
              ? computeMontoExigibleHastaHoyFromCuotas(cuotas, beforeStartKey)
              : computeMontoExigibleHastaHoyFromCuotas(cuotas, beforeStartKey))

          let dueInPeriod = Math.max(0, Number(untilEnd || 0) - Number(untilBeforeStart || 0))

          if (timeFilter === 'today') {
            const saldoRealDesdeCuotas = (Array.isArray(cuotas) ? cuotas : []).reduce((s: number, c: any) => {
              if (!c || !isCuotaNoPagada(c)) return s
              const monto = Number((c as any)?.montoNominal ?? (c as any)?.monto ?? 0)
              const pagado = Number((c as any)?.montoPagado ?? 0)
              return s + Math.max(0, monto - pagado)
            }, 0)

            const saldoTotal = Number((v as any)?.saldoTotal || 0)
            const saldoParaTope = saldoRealDesdeCuotas > 0 ? saldoRealDesdeCuotas : saldoTotal
            if (Number.isFinite(saldoParaTope) && saldoParaTope > 0) {
              dueInPeriod = Math.min(dueInPeriod, saldoParaTope)
            }

            const recHoy = Number((recaudosHoyMap as any)?.[pid] || 0)
            if (Number.isFinite(recHoy) && recHoy > 0) {
              dueInPeriod = Math.max(0, dueInPeriod - recHoy)
            }
          }

          return sum + dueInPeriod
        }, 0)

        out[routeId] = Number(metaRuta || 0)
      } catch {
        out[routeId] = 0
      }
    }),
  )

  metaByRouteCache.set(cacheKey, out)
  return out
}
