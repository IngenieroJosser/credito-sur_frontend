'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRealtimeData } from '@/hooks/useRealtimeData'
import { usePathname, useRouter } from 'next/navigation'
import { 
  LineChart, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  PieChart, 
  ArrowUpRight, 
  Target,
  Eye
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { ExportButton } from '@/components/ui/ExportButton'
import { TransactionalHighDetailChart } from '@/components/ui/TransactionalHighDetailChart'
import DetalleReporteFinancieroModal from '@/components/reportes/DetalleReporteFinancieroModal'
import DetalleGastoModal from '../../../../components/reportes/DetalleGastoModal'
import AnimacionCarga from '@/components/ui/AnimacionCarga'
import { getFinancialSummary, getMonthlyEvolution, getExpenseDistribution, getFinancialTargets } from '@/services/reportes-service'
import { getTransacciones } from '@/services/contabilidad-service'
import { exportService } from '@/services/export-service'
import { toast } from 'sonner'
import {
  buildBogotaOffsetIsoFromKey,
  getBogotaDateKey,
  getBogotaRangeForFinancialPeriod,
  normalizeDateKey,
  toBogotaDateTimeOffsetIso,
} from '@/lib/rutas-core'

// Interfaces
interface FinancialSummary {
  ingresos: number;
  egresos: number;
  utilidad: number;
  margen: number;
}

interface MonthlyEvolution {
  mes: string;
  ingresos: number;
  egresos: number;
  utilidad: number;
  fecha?: string;
  yearMonth?: string;
}

interface ExpenseDistribution {
  categoria: string;
  monto: number;
}

type ExpenseWithPercentage = ExpenseDistribution & {
  porcentaje: number
}

const ReportesFinancierosPage = () => {
  const router = useRouter()
  const pathname = usePathname()
  const [periodo, setPeriodo] = useState('ANUAL')
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [reporteId, setReporteId] = useState<string | null>(null)
  
  const [summary, setSummary] = useState<FinancialSummary>({
    ingresos: 0,
    egresos: 0,
    utilidad: 0,
    margen: 0
  })
  
  const [monthlyData, setMonthlyData] = useState<MonthlyEvolution[]>([])
  const [expenseData, setExpenseData] = useState<ExpenseWithPercentage[]>([])
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<ExpenseWithPercentage | null>(null)
  const [trendIngresos, setTrendIngresos] = useState<number | null>(null)
  const [trendEgresos, setTrendEgresos] = useState<number | null>(null)
  const [metaMargen, setMetaMargen] = useState<number | null>(null)

  const basePath = pathname?.startsWith('/contador') ? '/contador' : '/admin'
  const yearLabel = new Date().getFullYear()

  const handleExportExcel = async () => {
    try {
      await exportService.exportFinancialReport('excel')
      toast.success('Reporte financiero Excel descargado')
    } catch (e) {
      toast.error('Error al exportar reporte financiero')
    }
  }

  const handleExportPDF = async () => {
    try {
      await exportService.exportFinancialReport('pdf')
      toast.success('Reporte financiero PDF descargado')
    } catch (e) {
      toast.error('Error al exportar reporte financiero')
    }
  }

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      try {
        const targets = await getFinancialTargets()
        if (targets && typeof (targets as any).metaMargen === 'number') {
          setMetaMargen((targets as any).metaMargen)
        } else {
          setMetaMargen(null)
        }
      } catch {}
      const ahora = new Date()
      const { inicio: startDate, fin: endDate } = getBogotaRangeForFinancialPeriod(
        periodo as any,
        ahora,
      )

      const [summaryResp, monthlyRespMaybe, expensesResp] = await Promise.all([
        getFinancialSummary(startDate, endDate),
        periodo === 'DIARIO' ? Promise.resolve(null) : getMonthlyEvolution(ahora.getFullYear()),
        getExpenseDistribution(startDate, endDate)
      ])

      const [ingSumRes, egreSumRes] = await Promise.all([
        getTransacciones({ tipo: 'INGRESO', fechaInicio: startDate, fechaFin: endDate, limit: 10000 }),
        getTransacciones({ tipo: 'EGRESO', fechaInicio: startDate, fechaFin: endDate, limit: 10000 })
      ])
      const totalIngresosPeriodo = ingSumRes.data
        .filter((t: any) => {
          const cat = String(t?.categoria || '').toUpperCase()
          return cat === 'PAGO' || cat === 'ABONO'
        })
        .reduce((acc, t) => acc + (t.monto || 0), 0)
      const totalEgresosPeriodo = egreSumRes.data
        .filter((t: any) => String(t?.categoria || '').toUpperCase() !== 'DEUDA_COBRADOR')
        .reduce((acc, t) => acc + (t.monto || 0), 0)
      const utilidadPeriodo = totalIngresosPeriodo - totalEgresosPeriodo
      const margenPeriodo = totalIngresosPeriodo > 0 ? (utilidadPeriodo / totalIngresosPeriodo) * 100 : 0
      setSummary({
        ingresos: totalIngresosPeriodo,
        egresos: totalEgresosPeriodo,
        utilidad: utilidadPeriodo,
        margen: Number(margenPeriodo.toFixed(1))
      })

      const nowKey = getBogotaDateKey(ahora)
      const baseNoon = new Date(`${nowKey}T12:00:00-05:00`)
      const y = baseNoon.getFullYear()
      const m = baseNoon.getMonth()
      const d = baseNoon.getDate()

      const getPrevRange = () => {
        if (periodo === 'DIARIO') {
          const prevNoon = new Date(y, m, d - 1, 12, 0, 0, 0)
          const prevKey = getBogotaDateKey(prevNoon)
          return {
            inicio: buildBogotaOffsetIsoFromKey(prevKey, { hh: 0, mm: 0, ss: 0, ms: 0 }),
            fin: buildBogotaOffsetIsoFromKey(prevKey, { hh: 23, mm: 59, ss: 59, ms: 999 }),
          }
        }

        if (periodo === 'MENSUAL') {
          const prevStartNoon = new Date(y, m - 1, 1, 12, 0, 0, 0)
          const prevEndNoon = new Date(y, m, 0, 12, 0, 0, 0)
          const sKey = getBogotaDateKey(prevStartNoon)
          const eKey = getBogotaDateKey(prevEndNoon)
          return {
            inicio: buildBogotaOffsetIsoFromKey(sKey, { hh: 0, mm: 0, ss: 0, ms: 0 }),
            fin: buildBogotaOffsetIsoFromKey(eKey, { hh: 23, mm: 59, ss: 59, ms: 999 }),
          }
        }

        if (periodo === 'TRIMESTRAL') {
          const prevStartNoon = new Date(y, m - 6, 1, 12, 0, 0, 0)
          const prevEndNoon = new Date(y, m - 3, 0, 12, 0, 0, 0)
          const sKey = getBogotaDateKey(prevStartNoon)
          const eKey = getBogotaDateKey(prevEndNoon)
          return {
            inicio: buildBogotaOffsetIsoFromKey(sKey, { hh: 0, mm: 0, ss: 0, ms: 0 }),
            fin: buildBogotaOffsetIsoFromKey(eKey, { hh: 23, mm: 59, ss: 59, ms: 999 }),
          }
        }

        const prevStartKey = `${y - 1}-01-01`
        const prevEndKey = `${y - 1}-12-31`
        return {
          inicio: buildBogotaOffsetIsoFromKey(prevStartKey, { hh: 0, mm: 0, ss: 0, ms: 0 }),
          fin: buildBogotaOffsetIsoFromKey(prevEndKey, { hh: 23, mm: 59, ss: 59, ms: 999 }),
        }
      }

      const prevRange = getPrevRange()
      try {
        const [prevIngRes, prevEgreRes] = await Promise.all([
          getTransacciones({ tipo: 'INGRESO', fechaInicio: prevRange.inicio, fechaFin: prevRange.fin, limit: 10000 }),
          getTransacciones({ tipo: 'EGRESO', fechaInicio: prevRange.inicio, fechaFin: prevRange.fin, limit: 10000 })
        ])
        const prevIng = prevIngRes.data
          .filter((t: any) => {
            const cat = String(t?.categoria || '').toUpperCase()
            return cat === 'PAGO' || cat === 'ABONO'
          })
          .reduce((acc, t) => acc + (t.monto || 0), 0)
        const prevEgr = prevEgreRes.data
          .filter((t: any) => String(t?.categoria || '').toUpperCase() !== 'DEUDA_COBRADOR')
          .reduce((acc, t) => acc + (t.monto || 0), 0)
        const ingresosPerc = prevIng > 0 ? ((totalIngresosPeriodo - prevIng) / prevIng) * 100 : (totalIngresosPeriodo > 0 ? 100 : 0)
        const egresosPerc = prevEgr > 0 ? ((totalEgresosPeriodo - prevEgr) / prevEgr) * 100 : (totalEgresosPeriodo > 0 ? 100 : 0)
        setTrendIngresos(Number(ingresosPerc.toFixed(1)))
        setTrendEgresos(Number(egresosPerc.toFixed(1)))
      } catch {
        setTrendIngresos(null)
        setTrendEgresos(null)
      }

      if (periodo === 'DIARIO') {
        const desde7Noon = new Date(y, m, d - 6, 12, 0, 0, 0)
        const desde7Key = getBogotaDateKey(desde7Noon)
        const fechaInicio = buildBogotaOffsetIsoFromKey(desde7Key, { hh: 0, mm: 0, ss: 0, ms: 0 })
        const fechaFin = toBogotaDateTimeOffsetIso(ahora)

        const [ingRes, egreRes] = await Promise.all([
          getTransacciones({ tipo: 'INGRESO', fechaInicio, fechaFin, limit: 1000 }),
          getTransacciones({ tipo: 'EGRESO', fechaInicio, fechaFin, limit: 1000 })
        ])

        const dias: { [key: string]: { ingresos: number; egresos: number } } = {}
        const range: Date[] = []
        for (let i = 0; i < 7; i++) {
          const dd = new Date(desde7Noon)
          dd.setDate(desde7Noon.getDate() + i)
          const key = getBogotaDateKey(dd)
          dias[key] = { ingresos: 0, egresos: 0 }
          range.push(dd)
        }
        ingRes.data.forEach(t => {
          const key = normalizeDateKey(t.fecha)
          if (dias[key]) dias[key].ingresos += t.monto || 0
        })
        egreRes.data.forEach(t => {
          const key = normalizeDateKey(t.fecha)
          if (dias[key]) dias[key].egresos += t.monto || 0
        })

        const labels = range.map(d => {
          try {
            const w = d.toLocaleDateString('es-CO', { weekday: 'short' })
            return w.replace('.', '').slice(0, 3).charAt(0).toUpperCase() + w.replace('.', '').slice(1, 3)
          } catch {
            const map = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
            return map[d.getDay()]
          }
        })
        const series: MonthlyEvolution[] = range.map((d, idx) => {
          const key = getBogotaDateKey(d)
          const v = dias[key]
          return {
            mes: labels[idx],
            ingresos: v.ingresos,
            egresos: v.egresos,
            utilidad: v.ingresos - v.egresos,
            fecha: toBogotaDateTimeOffsetIso(d)
          }
        })
        setMonthlyData(series)

        const totalIngresos7 = Object.values(dias).reduce((acc, v) => acc + v.ingresos, 0)
        const totalEgresos7 = Object.values(dias).reduce((acc, v) => acc + v.egresos, 0)
        const utilidad7 = totalIngresos7 - totalEgresos7
        const margen7 = totalIngresos7 > 0 ? (utilidad7 / totalIngresos7) * 100 : 0
        setSummary({
          ingresos: totalIngresos7,
          egresos: totalEgresos7,
          utilidad: utilidad7,
          margen: Number(margen7.toFixed(1))
        })

        const prevDesde7Noon = new Date(y, m, d - 13, 12, 0, 0, 0)
        const prevFin7Noon = new Date(y, m, d - 7, 12, 0, 0, 0)
        const prevDesde7Key = getBogotaDateKey(prevDesde7Noon)
        const prevFin7Key = getBogotaDateKey(prevFin7Noon)
        try {
          const [prevIng7Res, prevEgre7Res] = await Promise.all([
            getTransacciones({
              tipo: 'INGRESO',
              fechaInicio: buildBogotaOffsetIsoFromKey(prevDesde7Key, { hh: 0, mm: 0, ss: 0, ms: 0 }),
              fechaFin: buildBogotaOffsetIsoFromKey(prevFin7Key, { hh: 23, mm: 59, ss: 59, ms: 999 }),
              limit: 1000,
            }),
            getTransacciones({
              tipo: 'EGRESO',
              fechaInicio: buildBogotaOffsetIsoFromKey(prevDesde7Key, { hh: 0, mm: 0, ss: 0, ms: 0 }),
              fechaFin: buildBogotaOffsetIsoFromKey(prevFin7Key, { hh: 23, mm: 59, ss: 59, ms: 999 }),
              limit: 1000,
            })
          ])
          const prevIng7 = prevIng7Res.data.reduce((acc, t) => acc + (t.monto || 0), 0)
          const prevEgr7 = prevEgre7Res.data.reduce((acc, t) => acc + (t.monto || 0), 0)
          const ingresosPerc7 = prevIng7 > 0 ? ((totalIngresos7 - prevIng7) / prevIng7) * 100 : (totalIngresos7 > 0 ? 100 : 0)
          const egresosPerc7 = prevEgr7 > 0 ? ((totalEgresos7 - prevEgr7) / prevEgr7) * 100 : (totalEgresos7 > 0 ? 100 : 0)
          setTrendIngresos(Number(ingresosPerc7.toFixed(1)))
          setTrendEgresos(Number(egresosPerc7.toFixed(1)))
        } catch {
          setTrendIngresos(null)
          setTrendEgresos(null)
        }
      } else {
        const ingResAll = await getTransacciones({ tipo: 'INGRESO', fechaInicio: startDate, fechaFin: endDate, limit: 10000 })
        const egreResAll = await getTransacciones({ tipo: 'EGRESO', fechaInicio: startDate, fechaFin: endDate, limit: 10000 })
        
        if (periodo === 'MENSUAL') {
          const startKey = getBogotaDateKey(new Date(`${startDate}`))
          const endKey = getBogotaDateKey(ahora)
          const startD = new Date(`${startKey}T12:00:00-05:00`)
          const endD = new Date(`${endKey}T12:00:00-05:00`)
          const days: Date[] = []
          const dayMap: Record<string, { ingresos: number; egresos: number; fecha: string }> = {}
          const iter = new Date(startD)
          while (iter <= endD) {
            const key = getBogotaDateKey(iter)
            dayMap[key] = { ingresos: 0, egresos: 0, fecha: toBogotaDateTimeOffsetIso(iter) }
            days.push(new Date(iter))
            iter.setDate(iter.getDate() + 1)
          }
          ingResAll.data.forEach(t => {
            const key = normalizeDateKey(t.fecha)
            if (dayMap[key]) dayMap[key].ingresos += t.monto || 0
          })
          egreResAll.data.forEach(t => {
            const key = normalizeDateKey(t.fecha)
            if (dayMap[key]) dayMap[key].egresos += t.monto || 0
          })
          const series: MonthlyEvolution[] = days.map(d => {
            const key = getBogotaDateKey(d)
            const v = dayMap[key]
            const label = d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
            return {
              mes: label,
              ingresos: v?.ingresos || 0,
              egresos: v?.egresos || 0,
              utilidad: (v?.ingresos || 0) - (v?.egresos || 0),
              fecha: v?.fecha || toBogotaDateTimeOffsetIso(d)
            }
          })
          setMonthlyData(series)
        } else {
          const startKey = getBogotaDateKey(new Date(`${startDate}`))
          const startM = new Date(`${startKey}T12:00:00-05:00`)
          const endM = new Date(ahora)
          const monthMap: Record<string, { ingresos: number; egresos: number }> = {}
          const months: { key: string; label: string }[] = []
          const iter = new Date(startM.getFullYear(), startM.getMonth(), 1)
          while (iter <= endM) {
            const key = `${iter.getFullYear()}-${String(iter.getMonth()+1).padStart(2,'0')}`
            const label = iter.toLocaleString('es-CO', { month: 'short' })
            monthMap[key] = { ingresos: 0, egresos: 0 }
            months.push({ key, label })
            iter.setMonth(iter.getMonth() + 1, 1)
          }
          ingResAll.data.forEach(t => {
            const d = new Date(t.fecha)
            const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
            if (monthMap[key]) monthMap[key].ingresos += t.monto || 0
          })
          egreResAll.data.forEach(t => {
            const d = new Date(t.fecha)
            const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
            if (monthMap[key]) monthMap[key].egresos += t.monto || 0
          })
          const series: MonthlyEvolution[] = months.map(m => {
            const v = monthMap[m.key]
            return {
              mes: m.label,
              ingresos: v.ingresos,
              egresos: v.egresos,
              utilidad: v.ingresos - v.egresos,
              yearMonth: m.key
            }
          })
          setMonthlyData(series)
        }
      }

      if (expensesResp) {
        const e = expensesResp as ExpenseDistribution[]
        const total = e.reduce((acc, curr) => acc + (curr.monto || 0), 0)
        const withPct = e.map(item => ({
          categoria: item.categoria,
          monto: item.monto,
          porcentaje: total > 0 ? Math.round((item.monto / total) * 100) : 0
        })).sort((a, b) => b.monto - a.monto)
        setExpenseData(withPct)
      }

    } catch (error) {
      console.error('Error fetching financial reports:', error)
    } finally {
      setLoading(false)
    }
  }, [periodo])

  useEffect(() => {
    setMounted(true)
    fetchData()
  }, [fetchData])

  // Actualización en tiempo real cuando llegan pagos o transacciones
  useRealtimeData(
    ['pagos_actualizados', 'dashboards_actualizados', 'prestamos_actualizados'],
    fetchData,
  )

  if (!mounted) {
    return null;
  }

  if (loading) {
    return (
      <AnimacionCarga texto="Cargando reportes financieros..." />
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 relative">
      {/* Fondo arquitectónico standard */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-slate-400 opacity-20 blur-[100px]"></div>
      </div>

      <div className="relative z-10 w-full px-6 md:px-8 py-8 space-y-8">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 self-start rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600 tracking-wide font-bold border border-slate-200">
              <LineChart className="h-3.5 w-3.5" />
              <span>Reportes financieros</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              <span className="text-blue-600">Reportes </span><span className="text-orange-500">Financieros</span>
            </h1>
            <p className="text-sm text-slate-500 max-w-xl leading-relaxed font-medium">
              Análisis detallado del desempeño financiero. Visualice tendencias, controle gastos y monitoree la rentabilidad del negocio.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
              {['DIARIO','MENSUAL', 'TRIMESTRAL', 'ANUAL'].map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriodo(p)}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                    periodo === p 
                      ? 'bg-blue-600 text-white shadow-md' 
                      : 'text-slate-600 hover:text-blue-600 hover:bg-blue-50'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <ExportButton 
              label="Exportar " 
              onExportExcel={handleExportExcel} 
              onExportPDF={handleExportPDF} 
            />
          </div>
        </header>

        {/* KPI Cards - Estilo Ultra Clean */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ingresos Totales</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-2">{formatCurrency(summary.ingresos)}</h3>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
            {trendIngresos !== null && (
              <div className={`flex items-center text-xs font-bold w-fit px-2 py-1 rounded-full border ${trendIngresos >= 0 ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : 'text-rose-600 bg-rose-50 border-rose-100'}`}>
                <ArrowUpRight className="h-3 w-3 mr-1" />
                <span>{trendIngresos >= 0 ? `+${trendIngresos}%` : `${trendIngresos}%`} vs periodo anterior</span>
              </div>
            )}
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Egresos Totales</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-2">{formatCurrency(summary.egresos)}</h3>
              </div>
              <div className="p-3 bg-rose-50 rounded-xl border border-rose-100">
                <TrendingDown className="h-5 w-5 text-rose-600" />
              </div>
            </div>
            {trendEgresos !== null && (
              <div className={`flex items-center text-xs font-bold w-fit px-2 py-1 rounded-full border ${trendEgresos >= 0 ? 'text-rose-600 bg-rose-50 border-rose-100' : 'text-emerald-600 bg-emerald-50 border-emerald-100'}`}>
                <ArrowUpRight className="h-3 w-3 mr-1" />
                <span>{trendEgresos >= 0 ? `+${trendEgresos}%` : `${trendEgresos}%`} vs periodo anterior</span>
              </div>
            )}
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Utilidad Neta</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-2">{formatCurrency(summary.utilidad)}</h3>
              </div>
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                <DollarSign className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <div className={`flex items-center text-xs font-bold w-fit px-2 py-1 rounded-full border ${summary.utilidad >= 0 ? 'text-blue-600 bg-blue-50 border-blue-100' : 'text-rose-600 bg-rose-50 border-rose-100'}`}>
              <ArrowUpRight className="h-3 w-3 mr-1" />
              <span>{summary.utilidad >= 0 ? 'Rentable' : 'No rentable'}</span>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Margen Promedio</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-2">{summary.margen.toFixed(1)}%</h3>
              </div>
              <div className="p-3 bg-purple-50 rounded-xl border border-purple-100">
                <PieChart className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 gap-8">
          {/* Main Chart: Monthly Trends */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-4 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 md:mb-8">
              <div>
                <h3 className="text-base md:text-lg font-bold text-slate-900">Evolución Financiera</h3>
                <p className="text-xs md:text-sm text-slate-400 font-medium">Comportamiento por periodo seleccionado de ingresos y egresos</p>
              </div>
              <div className="flex items-center gap-3 md:gap-4 text-xs font-bold">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                  <span className="text-slate-600">Ingresos</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                  <span className="text-slate-600">Egresos</span>
                </div>
              </div>
            </div>
            
            <TransactionalHighDetailChart 
              type="double"
              data={monthlyData.map(d => ({
                label: d.mes,
                value: d.ingresos,
                secondaryValue: d.egresos
              }))}
            />
          </div>
        </div>

        {/* Distribución de Gastos (Full Width) */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-4">
          <h3 className="text-base font-bold text-slate-900 mb-3">Distribución de Gastos</h3>
          <div className="flex flex-wrap gap-1 max-h-40 overflow-y-auto">
            {expenseData.length > 0 ? (
              expenseData.map((cat) => (
                <button
                  key={cat.categoria}
                  onClick={() => setCategoriaSeleccionada(cat)}
                  title="Ver detalles del gasto"
                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-colors"
                >
                  <span>{cat.categoria}</span>
                  <Eye className="h-3 w-3" />
                </button>
              ))
            ) : (
              <p className="text-sm text-slate-500 text-center py-4">No hay gastos registrados en este periodo.</p>
            )}
          </div>
        </div>

        {/* Tabla Detalle Financiero - Desktop */}
        <div className="hidden md:block bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
          <div className="px-4 md:px-8 py-4 md:py-6 border-b border-slate-200 flex justify-between items-center bg-white/50">
            <div>
              <h3 className="text-base md:text-lg font-bold text-slate-900">Detalle Financiero</h3>
              <p className="text-xs md:text-sm text-slate-400 font-medium">Desglose por periodo contable</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/50 text-slate-400 font-bold uppercase tracking-wider text-xs">
                <tr>
                  <th className="px-8 py-4">Periodo</th>
                  <th className="px-8 py-4 text-right">Ingresos Operativos</th>
                  <th className="px-8 py-4 text-right">Gastos & Costos</th>
                  <th className="px-8 py-4 text-right">Utilidad Bruta</th>
                  <th className="px-8 py-4 text-right">Margen</th>
                  <th className="px-8 py-4 text-center">Estado</th>
                  <th className="px-8 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {monthlyData.map((row) => (
                  <tr key={row.mes} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-8 py-5 font-bold text-slate-800 group-hover:text-slate-900">
                      {row.fecha 
                        ? new Date(row.fecha).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
                        : `${row.mes} ${yearLabel}`}
                    </td>
                    <td className="px-8 py-5 text-right text-slate-600 font-medium">{formatCurrency(row.ingresos)}</td>
                    <td className="px-8 py-5 text-right text-rose-500 font-medium">-{formatCurrency(row.egresos)}</td>
                    <td className="px-8 py-5 text-right font-bold text-slate-900 bg-slate-50/30">{formatCurrency(row.utilidad)}</td>
                    <td className="px-8 py-5 text-right text-slate-600 font-medium">
                      {row.ingresos > 0 ? ((row.utilidad / row.ingresos) * 100).toFixed(1) : '0.0'}%
                    </td>
                    <td className="px-8 py-5 text-center">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                        Cerrado
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <button 
                        onClick={() => {
                          if (row.fecha && periodo === 'DIARIO') {
                            setReporteId(`DIARIO:${row.fecha}`)
                          } else if (row.yearMonth) {
                            setReporteId(`MES:${row.yearMonth}`)
                          } else {
                            setReporteId(`${row.mes}-${yearLabel}`)
                          }
                        }}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Ver Detalles"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Vista de Cards - Móvil */}
        <div className="md:hidden space-y-4">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-4">
            <h3 className="text-base font-bold text-slate-900 mb-1">Detalle Financiero</h3>
            <p className="text-xs text-slate-400 font-medium mb-4">Desglose por periodo contable</p>
          </div>

          {monthlyData.map((row) => (
            <div
              key={row.mes}
              className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-4"
            >
              {/* Periodo y Estado */}
              <div className="flex items-start justify-between mb-3 pb-3 border-b border-slate-100">
                <div>
                  <div className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Periodo</div>
                  <div className="font-bold text-slate-900">
                    {row.fecha 
                      ? new Date(row.fecha).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
                      : `${row.mes} ${yearLabel}`}
                  </div>
                </div>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                  Cerrado
                </span>
              </div>

              {/* Ingresos y Egresos */}
              <div className="grid grid-cols-2 gap-3 mb-3 pb-3 border-b border-slate-100">
                <div>
                  <div className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Ingresos</div>
                  <div className="text-sm font-bold text-emerald-600">{formatCurrency(row.ingresos)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Gastos</div>
                  <div className="text-sm font-bold text-rose-500">-{formatCurrency(row.egresos)}</div>
                </div>
              </div>

              {/* Utilidad y Margen */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <div className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Utilidad Bruta</div>
                  <div className="text-lg font-bold text-slate-900">{formatCurrency(row.utilidad)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Margen</div>
                  <div className="text-lg font-bold text-blue-600">
                    {row.ingresos > 0 ? ((row.utilidad / row.ingresos) * 100).toFixed(1) : '0.0'}%
                  </div>
                </div>
              </div>

              {/* Acción */}
              <div className="flex justify-end pt-3 border-t border-slate-100">
                <button 
                  onClick={() => {
                    if (row.fecha && periodo === 'DIARIO') {
                      setReporteId(`DIARIO:${row.fecha}`)
                    } else if (row.yearMonth) {
                      setReporteId(`MES:${row.yearMonth}`)
                    } else {
                      setReporteId(`${row.mes}-${yearLabel}`)
                    }
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <Eye className="h-4 w-4" />
                  Ver Detalles
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {reporteId && (
        <DetalleReporteFinancieroModal
          id={reporteId}
          onClose={() => setReporteId(null)}
        />
      )}
      
      {categoriaSeleccionada && (
        <DetalleGastoModal 
          categoria={categoriaSeleccionada.categoria}
          porcentaje={categoriaSeleccionada.porcentaje}
          monto={categoriaSeleccionada.monto}
          onClose={() => setCategoriaSeleccionada(null)}
        />
      )}
    </div>
  )
}

export default ReportesFinancierosPage
