'use client'

import { useState, useMemo } from 'react'
import { ChevronDown, History } from 'lucide-react'

import { useRutaHistorialOperativo } from '@/hooks/useRutaHistorialOperativo'
import { normalizeVisitaHistorial, computeHistorialResumenCompartido, hasGestionHistorial } from '@/lib/ruta-historial'
import { formatMilesCOP } from '@/lib/utils'
import type { VisitaRuta, EstadoVisita } from '@/lib/types/cobranza'
import { StaticVisitaItem } from '@/components/dashboards/shared/CobradorElements'

type RutaHistorialOperativoProps = {
  rutaId?: string
  cobradorId?: string
  actorId?: string
  actorRol?: string
  getVisitasHoy: () => VisitaRuta[]
  onVerCliente: (visita: VisitaRuta) => void
  getEstadoClasses: (estado: EstadoVisita) => string
}

export default function RutaHistorialOperativo({
  rutaId,
  cobradorId,
  actorId,
  actorRol,
  getVisitasHoy,
  onVerCliente,
  getEstadoClasses,
}: RutaHistorialOperativoProps) {
  const [historyViewMode, setHistoryViewMode] = useState<'DAYS' | 'MONTHS'>('DAYS')
  const [selectedHistoryDate, setSelectedHistoryDate] = useState<string | null>(null)
  const [selectedHistoryMonth, setSelectedHistoryMonth] = useState<string | null>(null)

  const historial = useRutaHistorialOperativo({
    rutaId,
    cobradorId,
    actorId,
    actorRol,
    getVisitasHoy,
    initialDays: 30,
    preferLoadDayForToday: true,
  })

  const { historialRutas, cargarHistorialFecha } = historial

  const historyDates = useMemo(() => {
    return Object.keys(historialRutas || {}).sort((a, b) => b.localeCompare(a))
  }, [historialRutas])

  const historyByMonth = useMemo(() => {
    const byMonth: Record<string, string[]> = {}
    for (const date of historyDates) {
      const [y, m] = date.split('-')
      const monthKey = `${y}-${m}`
      if (!byMonth[monthKey]) byMonth[monthKey] = []
      byMonth[monthKey].push(date)
    }
    return byMonth
  }, [historyDates])

  const historyMonthKeys = useMemo(() => {
    return Object.keys(historyByMonth).sort((a, b) => b.localeCompare(a))
  }, [historyByMonth])

  const historyMonthSummaryByKey = useMemo(() => {
    const summary: Record<string, { monthRecaudo: number; monthPagados: number }> = {}
    for (const monthKey of historyMonthKeys) {
      let monthRecaudo = 0
      let monthPagados = 0
      const daysInMonth = historyByMonth[monthKey] || []
      for (const date of daysInMonth) {
        const data = (historialRutas as Record<string, any>)[date]
        const resumen = data?.resumen || {}
        monthRecaudo += Number(resumen.recaudo || 0)
        monthPagados += Number(resumen.visitados || 0)
      }
      summary[monthKey] = { monthRecaudo, monthPagados }
    }
    return summary
  }, [historyMonthKeys, historyByMonth, historialRutas])

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-1">VISTA:</span>
        <button
          onClick={() => setHistoryViewMode('DAYS')}
          className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${
            historyViewMode === 'DAYS'
              ? 'bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-900/20'
              : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700'
          }`}
        >
          Días
        </button>
        <button
          onClick={() => setHistoryViewMode('MONTHS')}
          className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${
            historyViewMode === 'MONTHS'
              ? 'bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-900/20'
              : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700'
          }`}
        >
          Meses
        </button>
      </div>

      {historyViewMode === 'DAYS' && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-500 uppercase px-1">Historial de Días</h3>
          {historyDates.map((date) => {
            const data = (historialRutas as Record<string, any>)[date]
            const isExpanded = selectedHistoryDate === date
            const [y, m, d] = date.split('-')
            const dateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d))
            const dayName = dateObj.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })
            const jornadaEtiqueta = (data.resumen as any).jornadaEtiqueta
            const jornadaEtiquetaColor = (data.resumen as any).jornadaEtiquetaColor || 'bg-slate-100 text-slate-700 border-slate-200'

            const visitasHistorial = (data.visitas || []).map(normalizeVisitaHistorial)
            const visitasHistorialFiltradas = visitasHistorial.filter((v: any) => {
              const isSaldado =
                String(v.estado || '').toLowerCase() === 'pagado' && Number(v.saldoTotal || 0) <= 0
              return !(isSaldado && !hasGestionHistorial(v))
            })
            const resumenHistorial = computeHistorialResumenCompartido(visitasHistorial, data.resumen)

            return (
              <div
                key={date}
                className={`rounded-2xl border transition-all overflow-hidden bg-white border-slate-200 ${
                  isExpanded ? 'ring-1 ring-slate-300 shadow-md' : 'shadow-sm'
                }`}
              >
                <div
                  className="px-5 py-3 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => {
                    setSelectedHistoryDate(isExpanded ? null : date)
                    if (!isExpanded && !data.loaded) {
                      void cargarHistorialFecha(date)
                    }
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shadow-sm ${
                        isExpanded ? 'bg-[#08557f] text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {d}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 capitalize flex items-center gap-2">
                        {dayName}
                        {jornadaEtiqueta && (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border ${jornadaEtiquetaColor}`}>
                            {jornadaEtiqueta}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500">Recaudo: <b>${formatMilesCOP(resumenHistorial.recaudo)}</b></div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                        resumenHistorial.efectividad >= 90 ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-700'
                      }`}
                    >
                      {resumenHistorial.efectividad}%
                    </div>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>
                </div>
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-white p-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
                    <div className="flex justify-between text-xs font-bold text-slate-500 uppercase px-1">
                      <span>Gestionados {resumenHistorial.visitados}/{resumenHistorial.total}</span>
                      <span>Estado</span>
                    </div>
                    <div>
                      {!data.loaded ? (
                        <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                          <div className="w-6 h-6 border-2 border-slate-300 border-t-[#08557f] rounded-full animate-spin mb-2" />
                          <span className="text-xs font-medium">Cargando detalles...</span>
                        </div>
                      ) : visitasHistorialFiltradas.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                          <History className="w-8 h-8 text-slate-300 mb-2 opacity-30" />
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center px-4">
                            No se registraron visitas ni pagos para este día
                          </span>
                        </div>
                      ) : (
                        visitasHistorialFiltradas.map((visita: VisitaRuta) => (
                          <StaticVisitaItem
                            key={visita.id}
                            visita={visita}
                            onSelect={() => {}}
                            onVerCliente={onVerCliente}
                            getEstadoClasses={getEstadoClasses}
                          />
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {historyViewMode === 'MONTHS' && (() => {
        if (historyMonthKeys.length === 0) {
          return (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <History className="h-12 w-12 mb-3 opacity-20" />
              <p className="text-sm font-bold">Sin historial disponible</p>
            </div>
          )
        }

        return (
          <div className="space-y-4">
            {historyMonthKeys.map((monthKey) => {
              const [my, mm] = monthKey.split('-')
              const monthObj = new Date(parseInt(my), parseInt(mm) - 1, 1)
              const monthName = monthObj.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })
              const daysInMonth = historyByMonth[monthKey] || []
              const isMonthExpanded = selectedHistoryMonth === monthKey
              const monthRecaudo = Number(historyMonthSummaryByKey[monthKey]?.monthRecaudo || 0)
              const monthPagados = Number(historyMonthSummaryByKey[monthKey]?.monthPagados || 0)

              return (
                <div
                  key={monthKey}
                  className={`rounded-2xl border transition-all overflow-hidden bg-white border-slate-200 ${
                    isMonthExpanded ? 'ring-1 ring-slate-300 shadow-md' : 'shadow-sm'
                  }`}
                >
                  <div
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => setSelectedHistoryMonth(isMonthExpanded ? null : monthKey)}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shadow-sm ${
                          isMonthExpanded ? 'bg-[#08557f] text-white' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {mm}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 capitalize">{monthName}</div>
                        <div className="text-xs text-slate-500">
                          <span>{daysInMonth.length} días · </span>
                          <span>Recaudo: <b>${formatMilesCOP(monthRecaudo)}</b></span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="px-2 py-1 rounded-lg text-[10px] font-bold bg-blue-50 text-blue-700">
                        {monthPagados} cobros
                      </div>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isMonthExpanded ? 'rotate-180' : ''}`} />
                    </div>
                  </div>
                  {isMonthExpanded && (
                    <div className="border-t border-slate-100">
                      {daysInMonth.map((date) => {
                        const dayData = (historialRutas as any)[date]
                        const visitasHistorial = (dayData?.visitas || []).map(normalizeVisitaHistorial)
                        const visitasHistorialFiltradas = visitasHistorial.filter((v: any) => {
                          const isSaldado =
                            String(v.estado || '').toLowerCase() === 'pagado' && Number(v.saldoTotal || 0) <= 0
                          return !(isSaldado && !hasGestionHistorial(v))
                        })
                        const resumenHistorial = computeHistorialResumenCompartido(visitasHistorial, dayData?.resumen)
                        const isDayExpanded = selectedHistoryDate === date
                        const [dy, dm, dd] = date.split('-')
                        const dateObj = new Date(parseInt(dy), parseInt(dm) - 1, parseInt(dd))
                        const dayName = dateObj.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric' })

                        return (
                          <div
                            key={date}
                            className={`border-b border-slate-50 last:border-0 transition-all ${isDayExpanded ? 'bg-slate-50/40' : ''}`}
                          >
                            <div
                              className="px-5 py-3 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                              onClick={async () => {
                                if (!isDayExpanded && !dayData.loaded) {
                                  await cargarHistorialFecha(date)
                                }
                                setSelectedHistoryDate(isDayExpanded ? null : date)
                              }}
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-[11px] ${
                                    isDayExpanded ? 'bg-[#08557f] text-white' : 'bg-white border border-slate-200 text-slate-600'
                                  }`}
                                >
                                  {dd}
                                </div>
                                <div>
                                  <div className="font-bold text-slate-900 capitalize">{dayName}</div>
                                  <div className="text-xs text-slate-500">
                                    Recaudo <b>${formatMilesCOP(resumenHistorial.recaudo)}</b> Gastos <b>${formatMilesCOP(resumenHistorial.gastos || 0)}</b>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <div
                                  className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                                    resumenHistorial.efectividad >= 90 ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-700'
                                  }`}
                                >
                                  {resumenHistorial.efectividad}%
                                </div>
                                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isDayExpanded ? 'rotate-180' : ''}`} />
                              </div>
                            </div>
                            {isDayExpanded && (
                              <div className="border-t border-slate-100 bg-white p-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
                                <div className="grid grid-cols-3 gap-2">
                                  <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 text-center">
                                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                                      Recaudo
                                    </div>
                                    <div className="text-xs font-black text-slate-700">
                                      ${formatMilesCOP(resumenHistorial.recaudo || 0)}
                                    </div>
                                  </div>

                                  <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 text-center">
                                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                                      Gastos
                                    </div>
                                    <div className="text-xs font-black text-rose-600">
                                      ${formatMilesCOP(resumenHistorial.gastos || 0)}
                                    </div>
                                  </div>

                                  <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 text-center">
                                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                                      Gestionados
                                    </div>
                                    <div className="text-xs font-black text-blue-600">
                                      {resumenHistorial.visitados || 0}/{resumenHistorial.total || 0}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase px-1">
                                  <span>Obligaciones gestionadas</span>
                                  <span>Estado</span>
                                </div>
                                <div>
                                  {!dayData.loaded ? (
                                    <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                                      <div className="w-6 h-6 border-2 border-slate-300 border-t-[#08557f] rounded-full animate-spin mb-2" />
                                      <span className="text-xs font-medium">Cargando detalles...</span>
                                    </div>
                                  ) : visitasHistorialFiltradas.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                      <History className="w-8 h-8 text-slate-300 mb-2 opacity-30" />
                                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center px-4">
                                        No se registraron visitas ni pagos para este día
                                      </span>
                                    </div>
                                  ) : (
                                    visitasHistorialFiltradas.map((visita: VisitaRuta) => (
                                      <StaticVisitaItem
                                        key={visita.id}
                                        visita={visita}
                                        onSelect={() => {}}
                                        onVerCliente={onVerCliente}
                                        getEstadoClasses={getEstadoClasses}
                                      />
                                    ))
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      })()}
    </div>
  )
}
