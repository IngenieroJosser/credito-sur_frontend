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
  Target
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { ExportButton } from '@/components/ui/ExportButton'
import { TransactionalHighDetailChart } from '@/components/ui/TransactionalHighDetailChart'
import AnimacionCarga from '@/components/ui/AnimacionCarga'
import { getMonthlyEvolution, getFinancialTargets } from '@/services/reportes-service'
import { getResumenFinanciero, getMovimientosLedger } from '@/services/contabilidad-service'
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
  entradasCaja: number;
  ingresos: number;
  ingresosDevengados: number;
  cobros: number;
  egresos: number;
  utilidad: number;
  utilidadOperativa: number;
  provisionCartera: number;
  utilidadNeta: number;
  margen: number;
  interes: number;
  mora: number;
  margenArticulos: number;
  otrosIngresos: number;
  gastosOperativos: number;
}

interface MonthlyEvolution {
  mes: string;
  ingresos: number;
  cobros: number;
  egresos: number;
  utilidad: number;
  fecha?: string;
  yearMonth?: string;
}

type FinancialPeriod = 'DIARIO' | 'SEMANAL' | 'MENSUAL' | 'ANUAL'

const FINANCIAL_PERIOD_OPTIONS: Array<{ value: FinancialPeriod; label: string }> = [
  { value: 'DIARIO', label: 'Hoy' },
  { value: 'SEMANAL', label: 'Sem' },
  { value: 'MENSUAL', label: 'Mes' },
  { value: 'ANUAL', label: 'Año' },
]

const getIngresoOperativoMovimiento = (movimiento: { lineas?: Array<{ accountCode?: string; creditAmount?: number; debitAmount?: number }> }) => {
  return (movimiento.lineas || [])
    .filter((linea) => {
      const accountCode = String(linea.accountCode || '')
      return accountCode.startsWith('3.1') || accountCode.startsWith('3.2')
    })
    .reduce((acc, linea) => acc + Number(linea.creditAmount || 0) - Number(linea.debitAmount || 0), 0)
}

const isIngresoOperativoMovimiento = (movimiento: { tipo?: string; lineas?: Array<{ accountCode?: string; creditAmount?: number; debitAmount?: number }> }) => {
  const tipo = String(movimiento.tipo || '').toUpperCase()
  if (tipo === 'VENTA_ARTICULO' || tipo === 'DESEMBOLSO') return false
  return getIngresoOperativoMovimiento(movimiento) > 0
}

const getCobroMovimiento = (movimiento: { impactoCaja?: number; totalDebito?: number }) => {
  const impactoCaja = Number(movimiento.impactoCaja || 0)
  if (impactoCaja > 0) return impactoCaja
  return Number(movimiento.totalDebito || 0)
}

const ReportesFinancierosPage = () => {
  const router = useRouter()
  const pathname = usePathname()
  const [periodo, setPeriodo] = useState<FinancialPeriod>('DIARIO')
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  
  const [summary, setSummary] = useState<FinancialSummary>({
    entradasCaja: 0,
    ingresos: 0,
    ingresosDevengados: 0,
    cobros: 0,
    egresos: 0,
    utilidad: 0,
    utilidadOperativa: 0,
    provisionCartera: 0,
    utilidadNeta: 0,
    margen: 0,
    interes: 0,
    mora: 0,
    margenArticulos: 0,
    otrosIngresos: 0,
    gastosOperativos: 0,
  })
  
  const [monthlyData, setMonthlyData] = useState<MonthlyEvolution[]>([])
  const [trendIngresos, setTrendIngresos] = useState<number | null>(null)
  const [trendCobros, setTrendCobros] = useState<number | null>(null)
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

      const monthlyRespMaybe = periodo === 'DIARIO'
        ? null
        : await getMonthlyEvolution(ahora.getFullYear())

      const startKey = getBogotaDateKey(new Date(startDate))
      const endKey = getBogotaDateKey(new Date(endDate))
      const resumenPeriodo = await getResumenFinanciero(startKey, endKey)
      const movimientosPeriodo = await getMovimientosLedger({ fechaInicio: startDate, fechaFin: endDate, limit: 10000 })
      const totalIngresosPeriodo = Number(resumenPeriodo?.ingresosHoy || 0)
      const totalEntradasCajaPeriodo = (Array.isArray(movimientosPeriodo?.data) ? movimientosPeriodo.data : [])
        .reduce((acc, movimiento: any) => acc + Number(movimiento?.impactoCaja || 0), 0)
      const totalIngresosDevengadosPeriodo = Number((resumenPeriodo as any)?.ingresosDevengadosHoy ?? totalIngresosPeriodo)
      const totalCobrosPeriodo = Number((resumenPeriodo as any)?.cobranzaHoy || 0)
      const totalEgresosPeriodo = Number(resumenPeriodo?.egresosHoy || 0)
      const utilidadPeriodo = Number((resumenPeriodo as any)?.utilidadReal ?? (resumenPeriodo as any)?.gananciaNeta ?? (totalIngresosPeriodo - totalEgresosPeriodo))
      const utilidadOperativaPeriodo = Number((resumenPeriodo as any)?.utilidadOperativa ?? utilidadPeriodo)
      const provisionCarteraPeriodo = Number((resumenPeriodo as any)?.provisionCarteraTotal ?? 0)
      const utilidadNetaPeriodo = utilidadPeriodo

      const margenPeriodo = totalIngresosDevengadosPeriodo > 0 ? (utilidadOperativaPeriodo / totalIngresosDevengadosPeriodo) * 100 : 0

      setSummary({
        entradasCaja: totalEntradasCajaPeriodo,
        ingresos: totalIngresosPeriodo,
        ingresosDevengados: totalIngresosDevengadosPeriodo,
        cobros: totalCobrosPeriodo,
        egresos: totalEgresosPeriodo,
        utilidad: utilidadPeriodo,
        utilidadOperativa: utilidadOperativaPeriodo,
        provisionCartera: provisionCarteraPeriodo,
        utilidadNeta: utilidadNetaPeriodo,
        margen: Number(margenPeriodo.toFixed(1)),
        interes: Number((resumenPeriodo as any)?.interesHoy || 0),
        mora: Number((resumenPeriodo as any)?.moraHoy || 0),
        margenArticulos: Number((resumenPeriodo as any)?.margenArticulosHoy || 0),
        otrosIngresos: Number((resumenPeriodo as any)?.otrosIngresosHoy || 0),
        gastosOperativos: totalEgresosPeriodo,
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

        if (periodo === 'SEMANAL') {
          const prevStartNoon = new Date(y, m, d - 13, 12, 0, 0, 0)
          const prevEndNoon = new Date(y, m, d - 7, 12, 0, 0, 0)
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
        const prevStartKey = getBogotaDateKey(new Date(prevRange.inicio))
        const prevEndKey = getBogotaDateKey(new Date(prevRange.fin))
        const prevResumen = await getResumenFinanciero(prevStartKey, prevEndKey)
        const prevIngresos = Number(prevResumen?.ingresosHoy || 0)
        const prevCobros = Number((prevResumen as any)?.cobranzaHoy || 0)
        const prevEgresos = Number(prevResumen?.egresosHoy || 0)
        const ingresosPerc = prevIngresos > 0
          ? ((totalIngresosPeriodo - prevIngresos) / prevIngresos) * 100
          : (totalIngresosPeriodo > 0 ? 100 : 0)
        const cobrosPerc = prevCobros > 0
          ? ((totalCobrosPeriodo - prevCobros) / prevCobros) * 100
          : (totalCobrosPeriodo > 0 ? 100 : 0)
        const egresosPerc = prevEgresos > 0
          ? ((totalEgresosPeriodo - prevEgresos) / prevEgresos) * 100
          : (totalEgresosPeriodo > 0 ? 100 : 0)
        setTrendIngresos(Number(ingresosPerc.toFixed(1)))
        setTrendCobros(Number(cobrosPerc.toFixed(1)))
        setTrendEgresos(Number(egresosPerc.toFixed(1)))
      } catch {
        setTrendIngresos(null)
        setTrendCobros(null)
        setTrendEgresos(null)
      }

      if (periodo === 'DIARIO' || periodo === 'SEMANAL') {
        const desde7Noon = new Date(y, m, d - 6, 12, 0, 0, 0)
        const desde7Key = getBogotaDateKey(desde7Noon)
        const fechaInicio = buildBogotaOffsetIsoFromKey(desde7Key, { hh: 0, mm: 0, ss: 0, ms: 0 })
        const fechaFin = toBogotaDateTimeOffsetIso(ahora)

        const [ingRes, cobroRes, egreRes, movimientos7Res] = await Promise.all([
          getMovimientosLedger({ accountPrefix: '3.', fechaInicio, fechaFin, limit: 1000 }),
          getMovimientosLedger({ tipo: 'PAGO', accountPrefix: '1.', fechaInicio, fechaFin, limit: 1000 }),
          getMovimientosLedger({ accountPrefix: '4.', fechaInicio, fechaFin, limit: 1000 }),
          getMovimientosLedger({ fechaInicio, fechaFin, limit: 10000 })
        ])

        const dias: { [key: string]: { ingresos: number; cobros: number; egresos: number } } = {}
        const range: Date[] = []
        for (let i = 0; i < 7; i++) {
          const dd = new Date(desde7Noon)
          dd.setDate(desde7Noon.getDate() + i)
          const key = getBogotaDateKey(dd)
          dias[key] = { ingresos: 0, cobros: 0, egresos: 0 }
          range.push(dd)
        }
        ingRes.data.filter(isIngresoOperativoMovimiento).forEach(t => {
          const key = normalizeDateKey(t.fecha)
          if (dias[key]) dias[key].ingresos += getIngresoOperativoMovimiento(t)
        })
        cobroRes.data
          .filter((t: any) => String(t.origenGestion || '').toUpperCase() !== 'CIERRE_PENDIENTE')
          .forEach(t => {
            const key = normalizeDateKey(t.fecha)
            if (dias[key]) dias[key].cobros += getCobroMovimiento(t)
          })
        egreRes.data.forEach(t => {
          const key = normalizeDateKey(t.fecha)
          if (dias[key]) dias[key].egresos += Number(t.totalDebito || 0)
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
            cobros: v.cobros,
            egresos: v.egresos,
            utilidad: v.ingresos - v.egresos,
            fecha: toBogotaDateTimeOffsetIso(d)
          }
        })
        setMonthlyData(series)

        const totalIngresos7 = Object.values(dias).reduce((acc, v) => acc + v.ingresos, 0)
        const totalCobros7 = Object.values(dias).reduce((acc, v) => acc + v.cobros, 0)
        const totalEgresos7 = Object.values(dias).reduce((acc, v) => acc + v.egresos, 0)

        if (periodo === 'SEMANAL') {
          const nowKey7 = getBogotaDateKey(ahora)
          const resumen7 = await getResumenFinanciero(desde7Key, nowKey7)
          const ingresosDevengados7 = Number((resumen7 as any)?.ingresosDevengadosHoy ?? totalIngresos7)
          const entradasCaja7 = (Array.isArray(movimientos7Res?.data) ? movimientos7Res.data : [])
            .reduce((acc, movimiento: any) => acc + Number(movimiento?.impactoCaja || 0), 0)
          const utilidad7 = Number((resumen7 as any)?.utilidadReal ?? (resumen7 as any)?.gananciaNeta ?? (totalIngresos7 - totalEgresos7))
          const utilidadOperativa7 = Number((resumen7 as any)?.utilidadOperativa ?? utilidad7)
          const provisionCartera7 = Number((resumen7 as any)?.provisionCarteraTotal ?? 0)
          const utilidadNeta7 = utilidad7
          const margen7 = ingresosDevengados7 > 0 ? (utilidadOperativa7 / ingresosDevengados7) * 100 : 0
          setSummary({
            entradasCaja: entradasCaja7,
            ingresos: totalIngresos7,
            ingresosDevengados: ingresosDevengados7,
            cobros: totalCobros7,
            egresos: totalEgresos7,
            utilidad: utilidad7,
            utilidadOperativa: utilidadOperativa7,
            provisionCartera: provisionCartera7,
            utilidadNeta: utilidadNeta7,
            margen: Number(margen7.toFixed(1)),
            interes: Number((resumen7 as any)?.interesHoy || 0),
            mora: Number((resumen7 as any)?.moraHoy || 0),
            margenArticulos: Number((resumen7 as any)?.margenArticulosHoy || 0),
            otrosIngresos: Number((resumen7 as any)?.otrosIngresosHoy || 0),
            gastosOperativos: totalEgresos7,
          })

          const prevDesde7Noon = new Date(y, m, d - 13, 12, 0, 0, 0)
          const prevFin7Noon = new Date(y, m, d - 7, 12, 0, 0, 0)
          const prevDesde7Key = getBogotaDateKey(prevDesde7Noon)
          const prevFin7Key = getBogotaDateKey(prevFin7Noon)
          try {
            const [prevIng7Res, prevCobro7Res, prevEgre7Res] = await Promise.all([
              getMovimientosLedger({
                accountPrefix: '3.',
                fechaInicio: buildBogotaOffsetIsoFromKey(prevDesde7Key, { hh: 0, mm: 0, ss: 0, ms: 0 }),
                fechaFin: buildBogotaOffsetIsoFromKey(prevFin7Key, { hh: 23, mm: 59, ss: 59, ms: 999 }),
                limit: 1000,
              }),
              getMovimientosLedger({
                tipo: 'PAGO',
                accountPrefix: '1.',
                fechaInicio: buildBogotaOffsetIsoFromKey(prevDesde7Key, { hh: 0, mm: 0, ss: 0, ms: 0 }),
                fechaFin: buildBogotaOffsetIsoFromKey(prevFin7Key, { hh: 23, mm: 59, ss: 59, ms: 999 }),
                limit: 1000,
              }),
              getMovimientosLedger({
                accountPrefix: '4.',
                fechaInicio: buildBogotaOffsetIsoFromKey(prevDesde7Key, { hh: 0, mm: 0, ss: 0, ms: 0 }),
                fechaFin: buildBogotaOffsetIsoFromKey(prevFin7Key, { hh: 23, mm: 59, ss: 59, ms: 999 }),
                limit: 1000,
              }),
            ])
            const prevIng7 = prevIng7Res.data.filter(isIngresoOperativoMovimiento).reduce((acc, t) => acc + getIngresoOperativoMovimiento(t), 0)
            const prevCobro7 = prevCobro7Res.data
              .filter((t: any) => String(t.origenGestion || '').toUpperCase() !== 'CIERRE_PENDIENTE')
              .reduce((acc, t) => acc + getCobroMovimiento(t), 0)
            const prevEgr7 = prevEgre7Res.data.reduce((acc, t) => acc + Number(t.totalDebito || 0), 0)
            const ingresosPerc7 = prevIng7 > 0 ? ((totalIngresos7 - prevIng7) / prevIng7) * 100 : (totalIngresos7 > 0 ? 100 : 0)
            const cobrosPerc7 = prevCobro7 > 0 ? ((totalCobros7 - prevCobro7) / prevCobro7) * 100 : (totalCobros7 > 0 ? 100 : 0)
            const egresosPerc7 = prevEgr7 > 0 ? ((totalEgresos7 - prevEgr7) / prevEgr7) * 100 : (totalEgresos7 > 0 ? 100 : 0)
            setTrendIngresos(Number(ingresosPerc7.toFixed(1)))
            setTrendCobros(Number(cobrosPerc7.toFixed(1)))
            setTrendEgresos(Number(egresosPerc7.toFixed(1)))
          } catch {
            setTrendIngresos(null)
            setTrendCobros(null)
            setTrendEgresos(null)
          }
        }
      } else {
        const ingResAll = await getMovimientosLedger({ accountPrefix: '3.', fechaInicio: startDate, fechaFin: endDate, limit: 10000 })
        const cobroResAll = await getMovimientosLedger({ tipo: 'PAGO', accountPrefix: '1.', fechaInicio: startDate, fechaFin: endDate, limit: 10000 })
        const egreResAll = await getMovimientosLedger({ accountPrefix: '4.', fechaInicio: startDate, fechaFin: endDate, limit: 10000 })

        if (periodo === 'MENSUAL') {
          const startD = new Date(startDate)
          const endD = new Date(endDate)
          const days: Date[] = []
          const dayMap: Record<string, { ingresos: number; cobros: number; egresos: number; fecha: string }> = {}
          const iter = new Date(startD)
          while (iter <= endD) {
            const key = getBogotaDateKey(iter)
            dayMap[key] = { ingresos: 0, cobros: 0, egresos: 0, fecha: toBogotaDateTimeOffsetIso(iter) }
            days.push(new Date(iter))
            iter.setDate(iter.getDate() + 1)
          }
          ingResAll.data.filter(isIngresoOperativoMovimiento).forEach(t => {
            const key = normalizeDateKey(t.fecha)
            if (dayMap[key]) dayMap[key].ingresos += getIngresoOperativoMovimiento(t)
          })
          cobroResAll.data
            .filter((t: any) => String(t.origenGestion || '').toUpperCase() !== 'CIERRE_PENDIENTE')
            .forEach(t => {
              const key = normalizeDateKey(t.fecha)
              if (dayMap[key]) dayMap[key].cobros += getCobroMovimiento(t)
            })
          egreResAll.data.forEach(t => {
            const key = normalizeDateKey(t.fecha)
            if (dayMap[key]) dayMap[key].egresos += Number(t.totalDebito || 0)
          })
          const series: MonthlyEvolution[] = days.map(d => {
            const key = getBogotaDateKey(d)
            const v = dayMap[key]
            const label = d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
            return {
              mes: label,
              ingresos: v?.ingresos || 0,
              cobros: v?.cobros || 0,
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
          const monthMap: Record<string, { ingresos: number; cobros: number; egresos: number }> = {}
          const months: { key: string; label: string }[] = []
          const iter = new Date(startM.getFullYear(), startM.getMonth(), 1)
          while (iter <= endM) {
            const key = `${iter.getFullYear()}-${String(iter.getMonth()+1).padStart(2,'0')}`
            const label = iter.toLocaleString('es-CO', { month: 'short' })
            monthMap[key] = { ingresos: 0, cobros: 0, egresos: 0 }
            months.push({ key, label })
            iter.setMonth(iter.getMonth() + 1, 1)
          }
          ingResAll.data.filter(isIngresoOperativoMovimiento).forEach(t => {
            const d = new Date(t.fecha)
            const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
            if (monthMap[key]) monthMap[key].ingresos += getIngresoOperativoMovimiento(t)
          })
          cobroResAll.data
            .filter((t: any) => String(t.origenGestion || '').toUpperCase() !== 'CIERRE_PENDIENTE')
            .forEach(t => {
              const d = new Date(t.fecha)
              const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
              if (monthMap[key]) monthMap[key].cobros += getCobroMovimiento(t)
            })
          egreResAll.data.forEach(t => {
            const d = new Date(t.fecha)
            const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
            if (monthMap[key]) monthMap[key].egresos += Number(t.totalDebito || 0)
          })
          const series: MonthlyEvolution[] = months.map(m => {
            const v = monthMap[m.key]
            return {
              mes: m.label,
              ingresos: v.ingresos,
              cobros: v.cobros,
              egresos: v.egresos,
              utilidad: v.ingresos - v.egresos,
              yearMonth: m.key
            }
          })
          setMonthlyData(series)
        }
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
              {FINANCIAL_PERIOD_OPTIONS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPeriodo(p.value)}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                    periodo === p.value
                      ? 'bg-blue-600 text-white shadow-md' 
                      : 'text-slate-600 hover:text-blue-600 hover:bg-blue-50'
                  }`}
                >
                  {p.label}
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-6">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
            <div className="flex justify-between items-start gap-3 mb-4">
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Flujo Neto de Caja</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-2 break-words leading-tight">{formatCurrency(summary.entradasCaja)}</h3>
              </div>
              <div className="shrink-0 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
            <p className="text-xs font-semibold text-slate-400">Entradas menos salidas/reversos de caja del periodo</p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
            <div className="flex justify-between items-start gap-3 mb-4">
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ingresos de Cartera</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-2 break-words leading-tight">{formatCurrency(summary.ingresos)}</h3>
              </div>
              <div className="shrink-0 p-3 bg-teal-50 rounded-xl border border-teal-100">
                <DollarSign className="h-5 w-5 text-teal-600" />
              </div>
            </div>
            {trendIngresos !== null && (
              <div className={`flex items-center text-xs font-bold w-fit max-w-full px-2 py-1 rounded-full border ${trendIngresos >= 0 ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : 'text-rose-600 bg-rose-50 border-rose-100'}`}>
                <ArrowUpRight className="h-3 w-3 mr-1 shrink-0" />
                <span>{trendIngresos >= 0 ? `+${trendIngresos}%` : `${trendIngresos}%`} vs periodo anterior</span>
              </div>
            )}
            <p className="mt-2 text-xs font-semibold text-slate-400">Interés y mora; no incluye artículos, cuota inicial ni otros ingresos externos</p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
            <div className="flex justify-between items-start gap-3 mb-4">
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cobros de Cuotas</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-2 break-words leading-tight">{formatCurrency(summary.cobros)}</h3>
              </div>
              <div className="shrink-0 p-3 bg-blue-50 rounded-xl border border-blue-100">
                <DollarSign className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            {trendCobros !== null && (
              <div className={`flex items-center text-xs font-bold w-fit max-w-full px-2 py-1 rounded-full border ${trendCobros >= 0 ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : 'text-rose-600 bg-rose-50 border-rose-100'}`}>
                <ArrowUpRight className="h-3 w-3 mr-1 shrink-0" />
                <span>{trendCobros >= 0 ? `+${trendCobros}%` : `${trendCobros}%`} vs periodo anterior</span>
              </div>
            )}
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
            <div className="flex justify-between items-start gap-3 mb-4">
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Gastos Operativos</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-2 break-words leading-tight">{formatCurrency(summary.egresos)}</h3>
              </div>
              <div className="shrink-0 p-3 bg-rose-50 rounded-xl border border-rose-100">
                <TrendingDown className="h-5 w-5 text-rose-600" />
              </div>
            </div>
            {trendEgresos !== null && (
              <div className={`flex items-center text-xs font-bold w-fit max-w-full px-2 py-1 rounded-full border ${trendEgresos >= 0 ? 'text-rose-600 bg-rose-50 border-rose-100' : 'text-emerald-600 bg-emerald-50 border-emerald-100'}`}>
                <ArrowUpRight className="h-3 w-3 mr-1 shrink-0" />
                <span>{trendEgresos >= 0 ? `+${trendEgresos}%` : `${trendEgresos}%`} vs periodo anterior</span>
              </div>
            )}
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
            <div className="flex justify-between items-start gap-3 mb-4">
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Utilidad Operativa</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-2 break-words leading-tight">{formatCurrency(summary.utilidadOperativa)}</h3>
              </div>
              <div className="shrink-0 p-3 bg-blue-50 rounded-xl border border-blue-100">
                <DollarSign className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <p className="text-xs font-semibold text-slate-400">Interés + mora + margen de artículos menos gastos</p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
            <div className="flex justify-between items-start gap-3 mb-4">
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Provisión de Cartera</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-2 break-words leading-tight">{formatCurrency(summary.provisionCartera)}</h3>
              </div>
              <div className="shrink-0 p-3 bg-amber-50 rounded-xl border border-amber-100">
                <PieChart className="h-5 w-5 text-amber-600" />
              </div>
            </div>
            <p className="text-xs font-semibold text-slate-400">Reserva para préstamos en mora/incumplimiento</p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
            <div className="flex justify-between items-start gap-3 mb-4">
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Utilidad Neta Estimada</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-2 break-words leading-tight">{formatCurrency(summary.utilidadNeta)}</h3>
              </div>
              <div className="shrink-0 p-3 bg-purple-50 rounded-xl border border-purple-100">
                <DollarSign className="h-5 w-5 text-purple-600" />
              </div>
            </div>
            <div className={`flex items-center text-xs font-bold w-fit max-w-full px-2 py-1 rounded-full border ${summary.utilidadNeta >= 0 ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : 'text-rose-600 bg-rose-50 border-rose-100'}`}>
              <ArrowUpRight className="h-3 w-3 mr-1 shrink-0" />
              <span>{summary.utilidadNeta >= 0 ? 'Rentable' : 'No rentable'}</span>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
            <div className="flex justify-between items-start gap-3 mb-4">
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Margen Promedio</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-2 break-words leading-tight">{summary.margen.toFixed(1)}%</h3>
              </div>
              <div className="shrink-0 p-3 bg-purple-50 rounded-xl border border-purple-100">
                <PieChart className="h-5 w-5 text-purple-600" />
              </div>
            </div>
            {metaMargen !== null && (
              <div className={`flex items-center text-xs font-bold w-fit max-w-full px-2 py-1 rounded-full border ${summary.margen >= metaMargen ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : 'text-amber-700 bg-amber-50 border-amber-100'}`}>
                <Target className="h-3 w-3 mr-1 shrink-0" />
                <span>Meta {metaMargen.toFixed(1)}%</span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="flex flex-col gap-1 mb-5">
            <h3 className="text-base font-bold text-slate-900">Desglose de Utilidad</h3>
            <p className="text-xs text-slate-400 font-medium">Resultado contable del periodo: intereses, mora y margen de artículos menos gastos operativos y provisión de cartera.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Interés</p>
              <p className="mt-2 text-lg font-black text-slate-900">{formatCurrency(summary.interes)}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Mora</p>
              <p className="mt-2 text-lg font-black text-slate-900">{formatCurrency(summary.mora)}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Margen Artículos Devengado</p>
              <p className="mt-2 text-lg font-black text-slate-900">{formatCurrency(summary.margenArticulos)}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Otros Ingresos Externos</p>
              <p className="mt-2 text-lg font-black text-slate-900">{formatCurrency(summary.otrosIngresos)}</p>
            </div>
            <div className="rounded-xl border border-rose-100 bg-rose-50/60 p-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-rose-600">Gastos Operativos</p>
              <p className="mt-2 text-lg font-black text-rose-700">{formatCurrency(summary.gastosOperativos)}</p>
            </div>
            <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-amber-600">Provisión de Cartera</p>
              <p className="mt-2 text-lg font-black text-amber-700">{formatCurrency(summary.provisionCartera)}</p>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 gap-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-4 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 md:mb-8">
              <div>
                <h3 className="text-base md:text-lg font-bold text-slate-900">Tendencia de Cobros</h3>
                <p className="text-xs md:text-sm text-slate-400 font-medium">Cobranza contable registrada en ledger como PAGO</p>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold">
                <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                <span className="text-slate-600">Cobros</span>
              </div>
            </div>

            <TransactionalHighDetailChart
              data={monthlyData.map(d => ({
                label: d.mes,
                value: d.cobros,
                date: d.fecha,
              }))}
            />
          </div>

          {/* Main Chart: Monthly Trends */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-4 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 md:mb-8">
              <div>
                <h3 className="text-base md:text-lg font-bold text-slate-900">Evolución Financiera</h3>
                <p className="text-xs md:text-sm text-slate-400 font-medium">Comportamiento por periodo seleccionado de ingresos de cartera y gastos operativos</p>
              </div>
              <div className="flex items-center gap-3 md:gap-4 text-xs font-bold">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                  <span className="text-slate-600">Ingresos operativos</span>
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

      </div>
    </div>
  )
}

export default ReportesFinancierosPage
