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

    const recHoyBackend = Number(
      (v as any)?.recaudadoDelDia ??
      (v as any)?.recaudadoHoy ??
      0
    )

    const recHoyMap = v?.prestamoId
      ? Number(recaudosHoyMap[v.prestamoId] || 0)
      : 0

    // Con prestamoId, el recaudo de HOY sale del mapa por préstamo: los
    // recaudos agrupados por cliente no se preservan, porque le atribuirían a
    // una obligación lo que se cobró de otra.
    //
    // Pero el valor que la propia visita ya trae en `recaudadoDelDia` sí es de
    // esta obligación y es autoritativo: descartarlo ponía en cero un recaudo
    // real cada vez que el mapa llegaba vacío, y el cobrador veía como no
    // cobrado a un cliente al que acababa de cobrarle. Se toma el mayor de los
    // dos, y nunca el `recaudadoHoy` agrupado.
    const recHoyPropio = Number((v as any)?.recaudadoDelDia || 0)
    const recHoy = v?.prestamoId
      ? Math.max(recHoyMap, recHoyPropio)
      : recHoyBackend

    const estadoFinal = shouldMarkVisitaAsPagado({
      saldoTotal: v?.saldoTotal,
      recaudadoHoy: recHoy,
      montoCuotaExigible: v?.montoCuota,
      estadoActual: v?.estado,
    })
      ? 'pagado'
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

export const computeMontoCuotaPendienteDespuesDeRecaudo = (
  visita: Record<string, any>,
  recaudadoDelDia: unknown,
): number => {
  const cuotaPendienteActualRaw = (visita as any)?.montoCuotaPendiente
  const tieneCuotaPendiente = cuotaPendienteActualRaw !== undefined && cuotaPendienteActualRaw !== null
  const cuotaNominal = Number((visita as any)?.montoCuota || 0)
  const recaudadoPrev = Number((visita as any)?.recaudadoDelDia || 0)
  const recaudadoNext = Number(recaudadoDelDia || 0)
  const deltaRecaudo = Math.max(0, recaudadoNext - recaudadoPrev)

  if (tieneCuotaPendiente) {
    return Math.max(0, Number(cuotaPendienteActualRaw || 0) - deltaRecaudo)
  }

  return Math.max(0, cuotaNominal - recaudadoNext)
}

export const resolveObligacionKey = (v: any): string => {
  const prestamoId = String(v?.prestamoId || '')
  const cuotaId = String(
    v?.cuotaId ||
    v?.cuotaObjetivoId ||
    v?.cuotaObjetivo?.id ||
    v?.proximaCuota?.id ||
    v?.cuotaObjetivoPrestamoId ||
    '',
  )

  if (prestamoId && cuotaId) return `loan:${prestamoId}:cuota:${cuotaId}`
  if (prestamoId) return `loan:${prestamoId}`
  return `visita:${v?.id || ''}`
}

export const mergeVisitasPreservingLocalRecaudo = <T extends Record<string, any>>(
  prev: T[],
  fresh: T[],
): T[] => {
  const prevByKey = new Map(
    (Array.isArray(prev) ? prev : []).map((v) => [resolveObligacionKey(v), v]),
  )

  return (Array.isArray(fresh) ? fresh : []).map((freshItem) => {
    const key = resolveObligacionKey(freshItem)
    const prevItem = prevByKey.get(key)

    if (!prevItem) return freshItem

    const recaudadoDelDia = Math.max(
      Number(freshItem?.recaudadoDelDia || 0),
      Number(prevItem?.recaudadoDelDia || 0),
    )

    const fechaUltimoPago = Math.max(
      Number(freshItem?.fechaUltimoPago || 0),
      Number(prevItem?.fechaUltimoPago || 0),
    )

    // Conservar el recaudo sin recalcular el estado no servía de nada.
    //
    // Cuando el cobrador le cobra a alguien que estaba marcado como ausente y
    // el refresco del backend llega antes de que el pago se refleje, el
    // recaudo se conservaba pero la visita volvía a aparecer como "ausente",
    // con su cuota otra vez pendiente. El cobrador veía sin cobrar a alguien a
    // quien acababa de cobrarle.
    //
    // El estado se recalcula con la misma regla que usa el resto de la ruta, y
    // el "ausente" se levanta en cuanto hay un pago de hoy.
    const tienePagoHoy = recaudadoDelDia > 0
    const estadoBase = freshItem?.estado ?? prevItem?.estado

    const estado = shouldMarkVisitaAsPagado({
      saldoTotal: freshItem?.saldoTotal,
      recaudadoHoy: recaudadoDelDia,
      montoCuotaExigible:
        freshItem?.montoCuotaPendiente ?? freshItem?.montoCuota,
      estadoActual: estadoBase,
    })
      ? 'pagado'
      : estadoBase

    const estadoVisitaBase = freshItem?.estadoVisita ?? prevItem?.estadoVisita
    const estadoVisita =
      tienePagoHoy &&
      String(estadoVisitaBase || '').toLowerCase() === 'ausente'
        ? undefined
        : estadoVisitaBase

    return {
      ...freshItem,

      // Solo campos volátiles/locales permitidos:
      recaudadoDelDia,
      fechaUltimoPago,
      estado,
      estadoVisita,
      notasVisita: freshItem?.notasVisita ?? prevItem?.notasVisita,
    }
  })
}

