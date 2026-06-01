import { getPagoBogotaDateKey, shouldMarkVisitaAsPagado } from '@/lib/rutas-core'

// ============================================================================
// Helpers compartidos de recaudo (pagos) para vistas de Ruta.
//
// Objetivo:
// - Evitar duplicación de lógica entre Cobrador / Supervisor / Admin.
// - Unificar el criterio de "qué significa HOY" usando la llave Bogotá
//   (YYYY-MM-DD) por medio de getPagoBogotaDateKey / getBogotaDateKey.
//
// Importante:
// - Estos helpers NO hacen peticiones ni mutan estado: solo agregan/transforman.
// - La data de pagos puede venir en diferentes formas (fechaPago/creadoEn,
//   arrays vacíos, etc.), por eso se normaliza defensivamente.
// ============================================================================

type PagoFilterOptions = {
  includeCierrePendiente?: boolean
}

export const isPagoCierrePendiente = (pago: any): boolean => {
  return String(pago?.origenGestion || '').toUpperCase() === 'CIERRE_PENDIENTE'
}

const shouldIncludePagoForOperationalToday = (
  pago: any,
  options?: PagoFilterOptions,
): boolean => {
  if (options?.includeCierrePendiente) return true
  return !isPagoCierrePendiente(pago)
}

export const buildRecaudosHoyMapByPrestamoId = (
  pagosRecientes: any[],
  hoyBogotaKey: string,
  options?: PagoFilterOptions,
): Record<string, number> => {
  // Construye un diccionario { [prestamoId]: totalRecaudadoHoy }.
  //
  // Regla:
  // - Se suma p.montoTotal solo si la fecha del pago (Bogotá) coincide con hoyBogotaKey.
  // - El pago se asocia por p.prestamoId.
  const recaudosHoyMap: Record<string, number> = {}

  ;(Array.isArray(pagosRecientes) ? pagosRecientes : []).forEach((p: any) => {
    if (!shouldIncludePagoForOperationalToday(p, options)) return

    const rawDate = p?.fechaPago || p?.creadoEn
    if (!rawDate) return

    const pDateStr = getPagoBogotaDateKey(rawDate)
    const prestamoId = p?.prestamoId
    if (!prestamoId) return

    if (pDateStr === hoyBogotaKey) {
      const monto = Number(p?.montoTotal ?? p?.monto ?? p?.valor ?? 0)
      recaudosHoyMap[prestamoId] = (recaudosHoyMap[prestamoId] || 0) + monto
    }
  })

  return recaudosHoyMap
}

export const sumMontoTotalPagosByBogotaDateKey = (
  pagos: any[],
  targetBogotaKey: string,
  options?: PagoFilterOptions,
): number => {
  // Suma el montoTotal de una lista de pagos que pertenezcan a un día específico
  // (comparación por llave Bogotá YYYY-MM-DD).
  return (Array.isArray(pagos) ? pagos : []).reduce((sum: number, p: any) => {
    if (options && !shouldIncludePagoForOperationalToday(p, options)) return sum

    const rawDate = p?.fechaPago || p?.creadoEn
    if (!rawDate) return sum

    const pDateStr = getPagoBogotaDateKey(rawDate)
    if (pDateStr !== targetBogotaKey) return sum

    return sum + Number(p?.montoTotal ?? p?.monto ?? p?.valor ?? 0)
  }, 0)
}

export const sumMontoTotalPagosHistorico = (pagos: any[]): number => {
  // Suma total histórica de una lista de pagos (sin filtro por fecha).
  return (Array.isArray(pagos) ? pagos : []).reduce((sum: number, p: any) => {
    return sum + Number(p?.montoTotal ?? p?.monto ?? p?.valor ?? 0)
  }, 0)
}

export const indexPagosByPrestamoId = (pagos: any[]) => {
  // Construye índices en memoria para evitar filtros O(N) por cada visita.
  //
  // Retorna:
  // - pagosByPrestamoId: { [prestamoId]: pagos[] }
  // - totalHistoricoByPrestamoId: { [prestamoId]: sum(montoTotal) }
  // - ultimoPagoDateByPrestamoId: { [prestamoId]: timestampMax(fechaPago/creadoEn) }
  const pagosByPrestamoId: Record<string, any[]> = {}
  const totalHistoricoByPrestamoId: Record<string, number> = {}
  const ultimoPagoDateByPrestamoId: Record<string, number> = {}

  ;(Array.isArray(pagos) ? pagos : []).forEach((p: any) => {
    const pid = p?.prestamoId
    if (!pid) return

    if (!pagosByPrestamoId[pid]) pagosByPrestamoId[pid] = []
    pagosByPrestamoId[pid].push(p)

    totalHistoricoByPrestamoId[pid] = (totalHistoricoByPrestamoId[pid] || 0) + Number(p?.montoTotal || 0)

    const d = new Date(p?.fechaPago || p?.creadoEn).getTime()
    if (!isNaN(d) && d > (ultimoPagoDateByPrestamoId[pid] || 0)) ultimoPagoDateByPrestamoId[pid] = d
  })

  return {
    pagosByPrestamoId,
    totalHistoricoByPrestamoId,
    ultimoPagoDateByPrestamoId,
  }
}

export const applyRecaudoHoyToVisitas = <T extends Record<string, any>>(
  visitas: T[],
  params: {
    hoyBogotaKey: string
    recaudosHoyMap: Record<string, number>
  },
): T[] => {
  // Aplica recaudadoDelDia + estado(pagado) a una lista de visitas.
  //
  // - recaudadoDelDia se toma desde el mapa por prestamoId.
  // - estado se recalcula con shouldMarkVisitaAsPagado (regla compartida).
  // - Si la visita no tiene clienteId, se pone recaudo en 0 como fallback.
  const { recaudosHoyMap } = params

  return (Array.isArray(visitas) ? visitas : []).map((v: any) => {
    if (!v?.clienteId) {
      return {
        ...v,
        recaudadoDelDia: 0,
        recaudadoTotalClient: 0,
        recaudadoPeriodo: 0,
      }
    }

    const recHoy = v?.prestamoId ? Number(recaudosHoyMap[v.prestamoId] || 0) : 0

    const estadoRaw = String(v?.estado || '').toLowerCase().replace(/\s+/g, '_')
    const esMora = estadoRaw === 'en_mora' || estadoRaw.includes('mora')

    const estadoFinal = shouldMarkVisitaAsPagado({
      saldoTotal: v?.saldoTotal,
      recaudadoHoy: recHoy,
      montoCuotaExigible: v?.montoCuota,
      estadoActual: v?.estado,
    })
      ? (esMora ? v?.estado : 'pagado')
      : v?.estado

    return {
      ...v,
      recaudadoDelDia: recHoy,
      recaudadoTotalClient: recHoy,
      recaudadoPeriodo: recHoy,
      estado: estadoFinal,
    }
  })
}
