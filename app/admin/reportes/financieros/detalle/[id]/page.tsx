'use client'

import { useMemo, useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Calendar, Eye, LineChart, TrendingDown, TrendingUp } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { getMovimientosLedger, getResumenFinanciero } from '@/services/contabilidad-service'
import { buildBogotaOffsetIsoFromKey, getBogotaDateKey } from '@/lib/rutas-core'

type DetalleRow = {
  label: string
  valor: number
  tipo: 'INGRESO' | 'EGRESO'
  categoria: string
}

export default function DetalleReporteFinancieroPage() {
  const router = useRouter()
  const params = useParams()
  const rawId = (params?.id as string) ?? ''
  const [ingresos, setIngresos] = useState(0)
  const [egresos, setEgresos] = useState(0)
  const [utilidad, setUtilidad] = useState(0)
  const [margen, setMargen] = useState(0)
  const [rows, setRows] = useState<DetalleRow[]>([])
  const [loading, setLoading] = useState(true)

  const periodoLabel = useMemo(() => {
    const parts = decodeURIComponent(rawId).split('-')
    const mes = parts[0] || 'Periodo'
    const year = parts[1] || String(new Date().getFullYear())
    return `${mes} ${year}`
  }, [rawId])

  useEffect(() => {
    const cargar = async () => {
      setLoading(true)
      try {
        const parts = decodeURIComponent(rawId).split('-')
        const mesAbbr = (parts[0] || '').toLowerCase()
        const yearNum = Number(parts[1] || new Date().getFullYear())

        const mapMes: Record<string, number> = {
          ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5, jul: 6, ago: 7, sep: 8, oct: 9, nov: 10, dic: 11
        }
        const monthIdx = mapMes[mesAbbr] ?? new Date().getMonth()

        const inicio = new Date(yearNum, monthIdx, 1)
        const fin = new Date(yearNum, monthIdx + 1, 0)
        fin.setHours(23, 59, 59, 999)

        const inicioKey = getBogotaDateKey(inicio)
        const finKey = getBogotaDateKey(fin)
        const fechaInicio = inicioKey
          ? buildBogotaOffsetIsoFromKey(inicioKey, { hh: 0, mm: 0, ss: 0, ms: 0 })
          : ''
        const fechaFin = finKey
          ? buildBogotaOffsetIsoFromKey(finKey, { hh: 23, mm: 59, ss: 59, ms: 999 })
          : ''

        const [ingRes, egreRes, costosRes, resumen] = await Promise.all([
          getMovimientosLedger({ accountPrefix: '3.', fechaInicio, fechaFin, limit: 2000 }),
          getMovimientosLedger({ accountPrefix: '4.', fechaInicio, fechaFin, limit: 2000 }),
          getMovimientosLedger({ accountPrefix: '5.', fechaInicio, fechaFin, limit: 2000 }),
          getResumenFinanciero(fechaInicio, fechaFin),
        ])

        const sumLineas = (
          entries: typeof ingRes.data,
          prefix: string,
          side: 'debitAmount' | 'creditAmount',
        ) => entries.reduce((acc, t) => {
          return acc + t.lineas
            .filter((linea) => String(linea.accountCode).startsWith(prefix))
            .reduce((lineAcc, linea) => lineAcc + Number(linea[side] || 0), 0)
        }, 0)

        const totalIngresos = Number((resumen as any)?.ingresosHoy ?? sumLineas(ingRes.data, '3.', 'creditAmount'))
        const totalGastos = Number((resumen as any)?.egresosHoy ?? sumLineas(egreRes.data, '4.', 'debitAmount'))
        const totalCostos = Number((resumen as any)?.costosVentasHoy ?? sumLineas(costosRes.data, '5.', 'debitAmount'))
        const totalEgresos = totalGastos + totalCostos
        const utilidadCalc = Number((resumen as any)?.utilidadReal ?? (resumen as any)?.gananciaNeta ?? (totalIngresos - totalEgresos))
        const margenCalc = totalIngresos > 0 ? (utilidadCalc / totalIngresos) * 100 : 0

        setIngresos(totalIngresos)
        setEgresos(totalEgresos)
        setUtilidad(utilidadCalc)
        setMargen(margenCalc)

        const agrupados: Record<string, { label: string; valor: number; tipo: 'INGRESO' | 'EGRESO' }> = {}
        ingRes.data.forEach(t => {
          const cat = t.lineas.find((linea) => String(linea.accountCode).startsWith('3.'))?.accountName || t.tipo || 'OTROS_INGRESOS'
          if (!agrupados[cat]) agrupados[cat] = { label: cat.replace(/_/g, ' '), valor: 0, tipo: 'INGRESO' }
          agrupados[cat].valor += t.lineas
            .filter((linea) => String(linea.accountCode).startsWith('3.'))
            .reduce((acc, linea) => acc + Number(linea.creditAmount || 0), 0)
        })
        egreRes.data.forEach(t => {
          const cat = t.lineas.find((linea) => String(linea.accountCode).startsWith('4.'))?.accountName || t.tipo || 'OTROS_EGRESOS'
          if (!agrupados[cat]) agrupados[cat] = { label: cat.replace(/_/g, ' '), valor: 0, tipo: 'EGRESO' }
          agrupados[cat].valor += t.lineas
            .filter((linea) => String(linea.accountCode).startsWith('4.'))
            .reduce((acc, linea) => acc + Number(linea.debitAmount || 0), 0)
        })
        costosRes.data.forEach(t => {
          const cat = t.lineas.find((linea) => String(linea.accountCode).startsWith('5.'))?.accountName || t.tipo || 'COSTOS'
          if (!agrupados[cat]) agrupados[cat] = { label: cat.replace(/_/g, ' '), valor: 0, tipo: 'EGRESO' }
          agrupados[cat].valor += t.lineas
            .filter((linea) => String(linea.accountCode).startsWith('5.'))
            .reduce((acc, linea) => acc + Number(linea.debitAmount || 0), 0)
        })
        const lista: DetalleRow[] = Object.entries(agrupados)
          .map(([categoria, info]) => ({ categoria, label: info.label, valor: info.valor, tipo: info.tipo }))
          .sort((a, b) => b.valor - a.valor)

        setRows(lista)
      } catch (e) {
        console.error('Error cargando detalle financiero:', e)
        setIngresos(0)
        setEgresos(0)
        setUtilidad(0)
        setMargen(0)
        setRows([])
      } finally {
        setLoading(false)
      }
    }
    cargar()
  }, [rawId])

  return (
    <div className="min-h-screen bg-slate-50 relative">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-slate-400 opacity-20 blur-[100px]"></div>
      </div>

      <div className="relative z-10 w-full px-6 md:px-8 py-8 space-y-8">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <button
              type="button"
              onClick={() => router.back()}
              className="mb-3 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 shadow-sm hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver
            </button>

            <div className="inline-flex items-center gap-2 self-start rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600 tracking-wide font-bold border border-slate-200">
              <LineChart className="h-3.5 w-3.5" />
              <span>Detalle de transacción</span>
            </div>

            <h1 className="mt-2 text-3xl md:text-4xl font-bold tracking-tight">
              <span className="text-blue-600">Reporte </span>
              <span className="text-orange-500">Financiero</span>
            </h1>

            <p className="mt-2 text-sm text-slate-500 font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {periodoLabel}
            </p>
          </div>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ingresos</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{formatCurrency(ingresos)}</p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Egresos</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{formatCurrency(egresos)}</p>
              </div>
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-rose-600">
                <TrendingDown className="h-5 w-5" />
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Utilidad / Margen</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{formatCurrency(utilidad)}</p>
                <p className="mt-1 text-xs font-bold text-slate-500">{margen.toFixed(1)}%</p>
              </div>
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 text-blue-600">
                <Eye className="h-5 w-5" />
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-200 bg-white/50">
            <h2 className="text-lg font-bold text-slate-900">Detalle de movimientos</h2>
            <p className="text-sm text-slate-500 font-medium">Desglose por categoría (datos reales)</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/50 text-slate-400 font-bold uppercase tracking-wider text-xs">
                <tr>
                  <th className="px-6 py-4 text-left">Concepto</th>
                  <th className="px-6 py-4 text-left">Categoría</th>
                  <th className="px-6 py-4 text-center">Tipo</th>
                  <th className="px-6 py-4 text-right">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <tr key={r.categoria} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-800">{r.label}</td>
                    <td className="px-6 py-4 text-slate-600 font-medium">{r.categoria}</td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={
                          r.tipo === 'INGRESO'
                            ? 'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200'
                            : 'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-700 border border-rose-200'
                        }
                      >
                        {r.tipo}
                      </span>
                    </td>
                    <td className={r.tipo === 'INGRESO' ? 'px-6 py-4 text-right font-bold text-slate-900' : 'px-6 py-4 text-right font-bold text-rose-600'}>
                      {r.tipo === 'INGRESO' ? formatCurrency(r.valor) : `-${formatCurrency(r.valor)}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}
