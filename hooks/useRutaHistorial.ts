import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { getBogotaDateKey, getPagoBogotaDateKey, getLocalDateKey } from '@/lib/rutas-core'
import { sumMontoTotalPagosByBogotaDateKey } from '@/lib/ruta-recaudos'
import { applyPagosDelDiaToHistorialVisitas } from '@/lib/ruta-historial'

import type { HistorialDia, VisitaRuta } from '@/lib/types/cobranza'

type ResumenBase = {
  recaudo: number
  gastos: number
  efectividad: number
  visitados: number
  total: number
}

export type UseRutaHistorialParams = {
  rutaId?: string | null
  cobradorId?: string | null

  getVisitasHoy?: () => VisitaRuta[]

  fetchPagos: () => Promise<any>

  loadDay: (fechaClave: string) => Promise<{
    resumen?: Partial<ResumenBase>
    visitas: VisitaRuta[]
  }>

  initialDays?: number
}

export const useRutaHistorial = (params: UseRutaHistorialParams) => {
  const {
    rutaId,
    cobradorId,
    getVisitasHoy,
    fetchPagos,
    loadDay,
    initialDays = 30,
  } = params

  const fetchPagosRef = useRef(fetchPagos)
  const cobradorIdRef = useRef(cobradorId)

  useEffect(() => {
    fetchPagosRef.current = fetchPagos
  }, [fetchPagos])

  useEffect(() => {
    cobradorIdRef.current = cobradorId
  }, [cobradorId])

  const [historialRutas, setHistorialRutas] = useState<Record<string, HistorialDia> | null>(null)

  const historyDates = useMemo(() => {
    if (!historialRutas) return []
    return Object.keys(historialRutas).sort((a, b) => b.localeCompare(a))
  }, [historialRutas])

  const ensurePrefillAndSummary = useCallback(async () => {
    if (!rutaId) return

    setHistorialRutas((prev) => {
      if (prev && Object.keys(prev).length > 0) return prev

      const hoy = new Date()
      const toKeyFromDate = (d: Date) => getBogotaDateKey(d) || getLocalDateKey(d)

      const prefill: Record<string, HistorialDia> = {}
      for (let i = 0; i < initialDays; i++) {
        const d = new Date(hoy)
        d.setDate(hoy.getDate() - i)
        prefill[toKeyFromDate(d)] = {
          resumen: { recaudo: 0, gastos: 0, efectividad: 0, visitados: 0, total: 0 },
          visitas: [],
          loaded: false,
        }
      }

      return prefill
    })

    try {
      const pagosResp = await fetchPagosRef.current()
      const pagosData = (pagosResp as any)?.pagos || pagosResp || []

      setHistorialRutas((prev) => {
        if (!prev) return prev

        const next = { ...prev }
        const keys = Object.keys(next)

        const cobradorIdActual = cobradorIdRef.current
        const pagosFiltrados = (Array.isArray(pagosData) ? pagosData : []).filter((p: any) => {
          const cobradorMatch = cobradorIdActual ? (p?.cobradorId === cobradorIdActual) : true
          return cobradorMatch
        })

        let changed = false

        for (const k of keys) {
          if (next[k]?.loaded) continue

          const recaudo = sumMontoTotalPagosByBogotaDateKey(pagosFiltrados as any, k)
          const visitadosKeys = new Set<string>()
          ;(Array.isArray(pagosFiltrados) ? pagosFiltrados : []).forEach((p: any) => {
            const raw = p?.fechaPago || p?.creadoEn
            if (!raw) return
            const pk = getPagoBogotaDateKey(raw)
            if (pk !== k) return
            const pid = String(p?.prestamoId || p?.prestamo?.id || '')
            const cid = String(p?.clienteId || p?.cliente?.id || '')
            const key = pid ? `loan-${pid}` : (cid ? `client-${cid}` : String(p?.id || ''))
            if (key) visitadosKeys.add(key)
          })
          const visitados = visitadosKeys.size

          if (next[k].resumen.recaudo !== recaudo || next[k].resumen.visitados !== visitados) {
            next[k].resumen.recaudo = recaudo
            next[k].resumen.visitados = visitados
            changed = true
          }
        }

        return changed ? next : prev
      })
    } catch {
      // ignore
    }
  }, [rutaId, initialDays])

  useEffect(() => {
    void ensurePrefillAndSummary()
  }, [ensurePrefillAndSummary])

  const deriveVisitadosFromVisitas = useCallback((visitas: VisitaRuta[]) => {
    if (!Array.isArray(visitas) || visitas.length === 0) return 0
    return visitas.reduce((count: number, v: any) => {
      const rec = Number(v?.recaudadoDelDia || 0)
      const estado = String(v?.estado || '')
      if (rec > 0 || estado === 'pagado') return count + 1
      return count
    }, 0)
  }, [])

  const deriveEfectividad = useCallback((visitados: number, total: number) => {
    if (!total || total <= 0) return 0
    return Math.round((visitados / total) * 100)
  }, [])

  const cargarHistorialFecha = useCallback(async (fechaClave: string) => {
    if (!rutaId) return

    const hoyKey = getBogotaDateKey(new Date())
      || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`

    if (fechaClave === hoyKey && typeof getVisitasHoy === 'function') {
      const visitasHoy = getVisitasHoy() || []
      if (Array.isArray(visitasHoy) && visitasHoy.length > 0) {
        let pagosDelDia: any[] = []
        try {
          const pagosResp = await fetchPagosRef.current()
          const pagosData = (pagosResp as any)?.pagos || pagosResp || []
          const cobradorIdActual = cobradorIdRef.current
          pagosDelDia = (Array.isArray(pagosData) ? pagosData : []).filter((p: any) => {
            const raw = p?.fechaPago || p?.creadoEn
            if (!raw) return false
            const pk = getPagoBogotaDateKey(raw)
            if (pk !== fechaClave) return false
            return cobradorIdActual ? p?.cobradorId === cobradorIdActual : true
          })
        } catch {
          pagosDelDia = []
        }

        const aplicado = applyPagosDelDiaToHistorialVisitas({
          fechaClave,
          visitas: visitasHoy,
          pagosDelDia,
        })

        setHistorialRutas((prev: any) => {
          const prevDia = (prev || {})[fechaClave] || {}
          const total = aplicado.visitas.length
          const visitados = Math.max(deriveVisitadosFromVisitas(aplicado.visitas), aplicado.visitados)
          const recaudo = Math.max(
            Number((prevDia.resumen || {})?.recaudo || 0),
            aplicado.recaudo,
          )
          return {
            ...(prev || {}),
            [fechaClave]: {
              resumen: {
                ...(prevDia.resumen || { recaudo: 0, gastos: 0, efectividad: 0, visitados: 0, total: 0 }),
                recaudo,
                total,
                visitados,
                efectividad: deriveEfectividad(visitados, total),
              },
              visitas: aplicado.visitas,
              loaded: true,
            },
          }
        })
        return
      }
    }

    try {
      const data = await loadDay(fechaClave)

      setHistorialRutas((prev: any) => {
        const prevDia = (prev || {})[fechaClave] || {}
        const baseResumen = prevDia.resumen || { recaudo: 0, gastos: 0, efectividad: 0, visitados: 0, total: 0 }

        const visitas = (data?.visitas || []) as VisitaRuta[]
        const total = Number(visitas.length)
        const visitados = deriveVisitadosFromVisitas(visitas)

        return {
          ...(prev || {}),
          [fechaClave]: {
            resumen: {
              ...baseResumen,
              ...(data?.resumen || {}),
              total,
              visitados: typeof (data as any)?.resumen?.visitados === 'number' ? (data as any).resumen.visitados : visitados,
              efectividad: typeof (data as any)?.resumen?.efectividad === 'number'
                ? (data as any).resumen.efectividad
                : deriveEfectividad(visitados, total),
            },
            visitas,
            loaded: true,
          },
        }
      })
    } catch {
      setHistorialRutas((prev: any) => {
        if ((prev || {})[fechaClave]?.loaded) return prev
        return {
          ...(prev || {}),
          [fechaClave]: {
            resumen: { recaudo: 0, gastos: 0, efectividad: 0, visitados: 0, total: 0 },
            visitas: [],
            loaded: true,
          },
        }
      })
    }
  }, [rutaId, getVisitasHoy, loadDay, deriveVisitadosFromVisitas, deriveEfectividad])

  return {
    historialRutas,
    setHistorialRutas,
    historyDates,
    cargarHistorialFecha,
    ensurePrefillAndSummary,
  }
}
