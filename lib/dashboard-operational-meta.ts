import { apiRequest } from '@/lib/api/api'
import {
  computeMontoExigibleHastaHoyFromCuotas,
  computeMontoNominalHastaHoyFromCuotas,
  getBogotaDateKey,
  normalizeDateKey,
  getBogotaRangeByPeriod,
} from '@/lib/rutas-core'
import { mapAsignacionesToVisitasLite } from '@/lib/ruta-visitas-mapper'
import { buildRecaudosHoyMapByPrestamoId } from '@/lib/ruta-recaudos'
import { routesService } from '@/services/routes-service'
import { rutasService } from '@/services/rutas-service'
import { prestamosService } from '@/services/prestamos-service'

export type OperationalMetaTimeFilter = 'today' | 'week' | 'month' | 'year'

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

export const computeOperationalMetaTotalForTimeFilter = async (
  timeFilter: OperationalMetaTimeFilter,
): Promise<number> => {
  const range = getBogotaRangeByPeriod(toBackendRangePeriod(timeFilter))
  const startKey = normalizeDateKey(range.inicio)
  const endKey = normalizeDateKey(range.fin)
  if (!startKey || !endKey) return 0

  const beforeStartKey = subtractOneDayBogotaKey(startKey)

  let recaudosHoyMap: Record<string, number> = {}
  if (timeFilter === 'today') {
    try {
      const pagosResp: any = await apiRequest<any>('GET', '/payments?limit=5000', undefined, { cacheTTL: 0 } as any)
      const pagosData = (pagosResp as any)?.pagos || (pagosResp as any)?.data?.pagos || pagosResp || []
      recaudosHoyMap = buildRecaudosHoyMapByPrestamoId((Array.isArray(pagosData) ? pagosData : []) as any, endKey)
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

          const esArticulo = String((v as any)?.tipoPrestamo || '').toUpperCase() === 'ARTICULO'
          const untilEnd = esArticulo
            ? computeMontoNominalHastaHoyFromCuotas(cuotas, endKey)
            : computeMontoExigibleHastaHoyFromCuotas(cuotas, endKey)
          const untilBeforeStart = esArticulo
            ? computeMontoNominalHastaHoyFromCuotas(cuotas, beforeStartKey)
            : computeMontoExigibleHastaHoyFromCuotas(cuotas, beforeStartKey)

          let dueInPeriod = Math.max(0, Number(untilEnd || 0) - Number(untilBeforeStart || 0))

          if (timeFilter === 'today') {
            const recHoy = Number((recaudosHoyMap as any)?.[pid] || 0)
            if (recHoy > 0) dueInPeriod = Math.max(0, dueInPeriod - recHoy)
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
