import { apiRequest } from '@/lib/api/api'
import type { CuotaOperativa } from '@/lib/types/cobranza'
import type { Pago, PrestamoParcial } from '@/types/domain'
import { logger } from '@/lib/logger'
import {
  computeMontoExigibleHastaHoyFromCuotas,
  getBogotaDateKey,
  isCuotaNoPagada,
  isVisitaExigibleHoy,
  normalizeDateKey,
  shouldExcludeVisitaFromOperationalMeta,
  getBogotaRangeByPeriod,
  resolveRutaDailySummary,
} from '@/lib/rutas-core'
import { mapAsignacionesToVisitasLite } from '@/lib/ruta-visitas-mapper'
import { buildRecaudosHoyMapByPrestamoId } from '@/lib/ruta-recaudos'
import { rutasService } from '@/services/rutas-service'
import { prestamosService } from '@/services/prestamos-service'

export type OperationalMetaTimeFilter = 'today' | 'week' | 'month' | 'year'

/**
 * Meta por ruta ya calculada, para no repetir el calculo al alternar filtros.
 *
 * Caduca a los 60 segundos. El autor ya habia visto el problema -por eso
 * "hoy" no se cachea, "ya que cambian constantemente"- pero los rangos de
 * semana, mes y año TAMBIEN terminan hoy: son lunes-a-hoy, dia-1-a-hoy y
 * enero-a-hoy. Y lo que se guarda aqui no es un objetivo fijo, es lo que
 * queda por cobrar: descuenta las cuotas pagadas y los recaudos del dia.
 *
 * Sin caducidad, quien dejaba el reporte operativo abierto con "Sem" o "Mes"
 * veia la misma cifra el resto de la jornada por mucho que se cobrara.
 */
const VIGENCIA_CACHE_MS = 60_000

const metaByRouteCache = new Map<string, { calculadaEn: number; metas: Record<string, number> }>()

const toBackendRangePeriod = (
  timeFilter: OperationalMetaTimeFilter,
): 'HOY' | 'SEM' | 'MES' | 'AÑO' => {
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

/*
 * Aqui vivia `computeOperationalMetaTotalForTimeFilter`: una sola cifra con lo
 * que quedaba por cobrar en todo el periodo, para todas las rutas.
 *
 * Se usaba para pisar el `target` de cada punto del grafico de tendencia, y
 * eso estaba mal: `Sem` y `Mes` agrupan POR DIA, asi que cada barra necesita
 * su propia meta. Con una cifra unica, la eficiencia de cada dia salia
 * dividida entre el numero de barras.
 *
 * La decision se tomo en 247aec2 ("usar target especifico por punto del
 * backend en lugar de meta global"), pero solo llego al panel del
 * administrador y a VistaCoordinador, un componente que no renderiza nadie.
 * El coordinador y el supervisor siguieron con la cifra global hasta que se
 * termino de aplicar.
 *
 * El backend ya manda el target por punto en `trend[].target` ("meta nominal
 * diaria", DashboardService.getTrendData). Esa es la cifra buena: usala.
 *
 * Para la meta POR RUTA -que es otra cosa y si se sigue necesitando- esta
 * `computeOperationalMetaByRouteIdsForTimeFilter`, justo debajo.
 */

/**
 * Lo que esta funcion lee de una ruta para calcular su meta operativa.
 *
 * `PrestamoParcial` y `CuotaOperativa` ya existen y son lo que
 * `mapAsignacionesToVisitasLite` recibe despues: se reutilizan. Lo unico propio es que
 * aqui el prestamo se REARMA con las cuotas traidas por separado
 * (`prestamosService.obtenerCuotas`), y eso es lo que el `any` dejaba sin comprobar.
 */
type CuotaDeMeta = CuotaOperativa

type PrestamoConCuotas = PrestamoParcial & {
  cuotas?: CuotaDeMeta[] | null
}

type AsignacionConCuotas = {
  cliente?: { prestamos?: PrestamoConCuotas[] | null } | null
}

export const computeOperationalMetaByRouteIdsForTimeFilter = async (
  timeFilter: OperationalMetaTimeFilter,
  routeIds: string[],
): Promise<Record<string, number>> => {
  const ids = (Array.isArray(routeIds) ? routeIds : [])
    .map((x) => String(x || '').trim())
    .filter(Boolean)
  if (ids.length === 0) return {}

  const range = getBogotaRangeByPeriod(toBackendRangePeriod(timeFilter))
  const startKey = normalizeDateKey(range.inicio)
  const endKey = normalizeDateKey(range.fin)
  if (!startKey || !endKey) return {}

  const idsSorted = [...ids].sort()
  const cacheKey = `${timeFilter}:${startKey}:${endKey}::${idsSorted.join(',')}`

  // No cachear datos de hoy, ya que cambian constantemente
  if (timeFilter !== 'today') {
    const cached = metaByRouteCache.get(cacheKey)
    if (cached && Date.now() - cached.calculadaEn < VIGENCIA_CACHE_MS) {
      return cached.metas
    }
    if (cached) metaByRouteCache.delete(cacheKey)
  }

  const beforeStartKey = getBeforeStartKey(timeFilter, startKey)

  let recaudosHoyMap: Record<string, number> = {}
  if (timeFilter === 'today') {
    try {
      // Tres formas para la misma respuesta, y por eso la cascada: el endpoint devuelve
      // `{pagos}`, `{data:{pagos}}` o el arreglo suelto segun la version. Declarado en vez
      // de `any` para que la cascada se vea, que es lo que el `any` escondia.
      const pagosResp = await apiRequest<{
        pagos?: Partial<Pago>[]
        data?: { pagos?: Partial<Pago>[] }
      }>('GET', '/payments?limit=5000', undefined, {
        cacheTTL: 0,
      })
      const pagosData = pagosResp?.pagos || pagosResp?.data?.pagos || pagosResp || []
      recaudosHoyMap = buildRecaudosHoyMapByPrestamoId(
        Array.isArray(pagosData) ? pagosData : [],
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
        // Sin anotacion: el servicio ya declara lo que devuelve, y el `any` solo tapaba eso.
        const rutaCompleta = await rutasService.obtenerRutaPorId(String(routeId))
        // Declarado, no inferido: `let x = null` sin anotacion es un `any` EVOLUTIVO que
        // `noImplicitAny` no marca.
        let dailyVisits: Awaited<ReturnType<typeof rutasService.obtenerVisitasDelDia>> | null = null
        if (timeFilter === 'today') {
          try {
            dailyVisits = await rutasService.obtenerVisitasDelDia(String(routeId), endKey)
          } catch {
            dailyVisits = null
          }
        }

        // Si hay dailyVisits, usar resolveRutaDailySummary
        if (timeFilter === 'today' && dailyVisits) {
          const summary = resolveRutaDailySummary(rutaCompleta, dailyVisits)
          out[routeId] = Number(summary.meta || 0)
          return
        }

        // Si no, usar la logica original
        const asignaciones = Array.isArray(rutaCompleta?.asignaciones)
          ? rutaCompleta.asignaciones
          : []

        // Primero se juntan TODOS los préstamos de la ruta, y después se piden sus cuotas
        // de una sola vez.
        //
        // Antes esto eran tres bucles metidos uno dentro de otro —ruta, asignaciones,
        // préstamos— con una petición por préstamo en el nivel más hondo: una ruta con
        // cien créditos activos disparaba cien peticiones, y eso por cada ruta del
        // tablero. Era el patrón más caro de la app.
        const esActivo = (p: PrestamoConCuotas) =>
          p && (p.estado === 'ACTIVO' || p.estado === 'EN_MORA')

        const idsDeLaRuta = asignaciones.flatMap((asig: AsignacionConCuotas) => {
          const prestamos = Array.isArray(asig?.cliente?.prestamos) ? asig.cliente.prestamos : []
          return prestamos.filter(esActivo).map((p: PrestamoConCuotas) => String(p?.id || ''))
        })

        const cuotasPorPrestamo = await prestamosService.obtenerCuotasDeVarios(
          idsDeLaRuta.filter(Boolean),
        )

        const asigsConCuotas = asignaciones.map((asig: AsignacionConCuotas) => {
          const cliente = asig?.cliente || null
          if (!cliente) return asig
          const prestamosRaw = Array.isArray(cliente?.prestamos) ? cliente.prestamos : []
          const prestamos = prestamosRaw.filter(esActivo).map((p: PrestamoConCuotas) => {
            if (!p?.id) return p
            // Si el lote no trajo ese préstamo —sin permiso, o la petición fallo— se
            // conserva lo que ya venía embebido en vez de dejar la fila sin cuotas.
            const cuotasEmbebidas = Array.isArray(p?.cuotas) ? p.cuotas : []
            const delLote = cuotasPorPrestamo[String(p.id)]
            return { ...p, cuotas: Array.isArray(delLote) ? delLote : cuotasEmbebidas }
          })
          return { ...asig, cliente: { ...cliente, prestamos } }
        })

        const visitasLite = mapAsignacionesToVisitasLite({
          asignaciones: asigsConCuotas,
          hoyKey: endKey,
          cobradorId: String(rutaCompleta?.cobradorId || ''),
        })

        const idsProcesados = new Set<string>()
        const firstPass = (Array.isArray(visitasLite) ? visitasLite : []).flatMap((v) => {
          const uniqueKey = v?.prestamoId ? `loan-${v.prestamoId}` : `client-${v.clienteId}`
          if (idsProcesados.has(uniqueKey)) return []
          idsProcesados.add(uniqueKey)
          return [v]
        })
        const clientesConPrestamo = new Set(
          firstPass.filter((v) => v?.prestamoId).map((v) => v?.clienteId),
        )
        const visitasDedupe = firstPass.filter((v) => {
          if (!v?.prestamoId && clientesConPrestamo.has(v?.clienteId)) return false
          return true
        })

        const cuotasMap = new Map<string, CuotaDeMeta[]>()
        for (const asig of asigsConCuotas) {
          for (const p of asig?.cliente?.prestamos || []) {
            if (p?.id && Array.isArray(p?.cuotas)) cuotasMap.set(String(p.id), p.cuotas)
          }
        }

        const metaRuta = visitasDedupe.reduce((sum: number, v) => {
          const pid = String(v?.prestamoId || '')
          if (!pid) return sum
          const cuotas = cuotasMap.get(pid)
          if (!cuotas || cuotas.length === 0) return sum

          const tieneCuotaPendiente = cuotas.some((c) => c && isCuotaNoPagada(c))
          if (!tieneCuotaPendiente) return sum
          const recHoy = timeFilter === 'today' ? Number(recaudosHoyMap?.[pid] || 0) : 0
          if (shouldExcludeVisitaFromOperationalMeta(v, recHoy)) return sum

          if (timeFilter === 'today' && !isVisitaExigibleHoy(v, endKey)) return sum

          const esArticulo = String(v?.tipoPrestamo || '').toUpperCase() === 'ARTICULO'
          const untilEnd = esArticulo
            ? computeMontoExigibleHastaHoyFromCuotas(cuotas, endKey)
            : computeMontoExigibleHastaHoyFromCuotas(cuotas, endKey)
          const untilBeforeStart =
            timeFilter === 'today'
              ? 0
              : esArticulo
                ? computeMontoExigibleHastaHoyFromCuotas(cuotas, beforeStartKey)
                : computeMontoExigibleHastaHoyFromCuotas(cuotas, beforeStartKey)

          let dueInPeriod = Math.max(0, Number(untilEnd || 0) - Number(untilBeforeStart || 0))

          if (timeFilter === 'today') {
            const saldoRealDesdeCuotas = (Array.isArray(cuotas) ? cuotas : []).reduce(
              (s: number, c) => {
                if (!c || !isCuotaNoPagada(c)) return s
                const monto = Number(c?.montoNominal ?? c?.monto ?? 0)
                const pagado = Number(c?.montoPagado ?? 0)
                return s + Math.max(0, monto - pagado)
              },
              0,
            )

            const saldoTotal = Number(v?.saldoTotal || 0)
            const saldoParaTope = saldoRealDesdeCuotas > 0 ? saldoRealDesdeCuotas : saldoTotal
            if (Number.isFinite(saldoParaTope) && saldoParaTope > 0) {
              dueInPeriod = Math.min(dueInPeriod, saldoParaTope)
            }

            if (Number.isFinite(recHoy) && recHoy > 0) {
              dueInPeriod = Math.max(0, dueInPeriod - recHoy)
            }
          }

          return sum + dueInPeriod
        }, 0)

        out[routeId] = Number(metaRuta || 0)
      } catch (error) {
        // Se deja en 0 para no romper el reporte entero por una ruta, pero un
        // 0 aqui se lee igual que "esta ruta no tiene nada que cobrar hoy",
        // que es justo lo contrario de lo que paso.
        logger.warn(`No se pudo calcular la meta de la ruta ${routeId}`, error)
        out[routeId] = 0
      }
    }),
  )

  // No guardar en cache datos de hoy
  if (timeFilter !== 'today') {
    metaByRouteCache.set(cacheKey, { calculadaEn: Date.now(), metas: out })
  }
  return out
}
