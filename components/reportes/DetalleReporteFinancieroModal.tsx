'use client'

import { useMemo, useState, useEffect } from 'react'
import { X, Calendar, TrendingUp, TrendingDown, Eye, LineChart } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { getMovimientosLedger } from '@/services/contabilidad-service'
import { buildBogotaOffsetIsoFromKey, getBogotaDateKey, normalizeDateKey } from '@/lib/rutas-core'
import Paginador from '@/components/ui/Paginador'

interface DetalleReporteFinancieroModalProps {
  id: string
  onClose: () => void
}

type DetalleRow = {
  label: string
  valor: number
  tipo: 'INGRESO' | 'EGRESO'
  categoria: string
  fecha: string
  hora: string
}

export default function DetalleReporteFinancieroModal({ id, onClose }: DetalleReporteFinancieroModalProps) {
  const [periodoLabel, setPeriodoLabel] = useState<string>('')
  const [ingresos, setIngresos] = useState<Record<string, number>>({})
  const [gastos, setGastos] = useState<number>(0)
  const [costos, setCostos] = useState<number>(0)
  const [utilidadOperativa, setUtilidadOperativa] = useState<number>(0)
  const [utilidadNeta, setUtilidadNeta] = useState<number>(0)
  const [rows, setRows] = useState<DetalleRow[]>([])

  useEffect(() => {
    let cancelado = false
    async function cargar() {
      if (!id) return
      let start: Date
      let end: Date
      if (id.startsWith('DIARIO:')) {
        const iso = id.replace('DIARIO:', '')
        const d = new Date(iso)
        start = new Date(d)
        start.setHours(0,0,0,0)
        end = new Date(d)
        end.setHours(23,59,59,999)
        setPeriodoLabel(d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }))
      } else if (id.startsWith('MES:')) {
        const ym = id.replace('MES:', '')
        const [yStr, mStr] = ym.split('-')
        const y = parseInt(yStr, 10)
        const m = parseInt(mStr, 10) - 1
        start = new Date(y, m, 1)
        start.setHours(0,0,0,0)
        end = new Date(y, m + 1, 0)
        end.setHours(23,59,59,999)
        setPeriodoLabel(start.toLocaleDateString('es-CO', { month: 'short', year: 'numeric' }))
      } else {
        const parts = decodeURIComponent(id).split('-')
        const mes = parts[0] || 'Periodo'
        const year = parts[1] || String(new Date().getFullYear())
        setPeriodoLabel(`${mes} ${year}`)
        const monthsMap: Record<string, number> = { Ene: 0, Feb: 1, Mar: 2, Abr: 3, May: 4, Jun: 5, Jul: 6, Ago: 7, Sep: 8, Oct: 9, Nov: 10, Dic: 11 }
        const monthIndex = monthsMap[mes] ?? null
        const yearNum = Number(year) || new Date().getFullYear()
        start = monthIndex !== null ? new Date(yearNum, monthIndex, 1) : new Date()
        start.setHours(0,0,0,0)
        end = monthIndex !== null ? new Date(yearNum, (monthIndex as number) + 1, 0) : new Date()
        end.setHours(23,59,59,999)
      }

      const startKey = getBogotaDateKey(start)
      const endKey = getBogotaDateKey(end)
      const fechaInicio = startKey
        ? buildBogotaOffsetIsoFromKey(startKey, { hh: 0, mm: 0, ss: 0, ms: 0 })
        : ''
      const fechaFin = endKey
        ? buildBogotaOffsetIsoFromKey(endKey, { hh: 23, mm: 59, ss: 59, ms: 999 })
        : ''

      const [ingRes, egreRes, costoRes] = await Promise.all([
        getMovimientosLedger({ accountPrefix: '3.', fechaInicio, fechaFin, limit: 10000 }),
        getMovimientosLedger({ accountPrefix: '4.', fechaInicio, fechaFin, limit: 10000 }),
        getMovimientosLedger({ accountPrefix: '5.', fechaInicio, fechaFin, limit: 10000 })
      ])

      if (cancelado) return

      const ingMap: Record<string, number> = {
        '3.1': 0, '3.2': 0, '3.3': 0, '3.4': 0
      }

      ingRes.data.forEach(t => {
        t.lineas.forEach(l => {
          if (String(l.accountCode).startsWith('3.')) {
            const prefix = String(l.accountCode).substring(0, 3)
            if (ingMap[prefix] !== undefined && l.creditAmount) {
              ingMap[prefix] += Number(l.creditAmount)
            }
          }
        })
      })

      const ingresosTotales = Object.values(ingMap).reduce((a, b) => a + b, 0)
      const gastosTotales = egreRes.data.reduce((acc, t) => acc + Number(t.totalDebito || 0), 0)
      const costosTotales = costoRes.data.reduce((acc, t) => acc + Number(t.totalDebito || 0), 0)

      const utilOperativa = ingresosTotales - gastosTotales - costosTotales
      const utilNeta = utilOperativa // Si hubiera impuestos o financieros irían acá

      setIngresos(ingMap)
      setGastos(gastosTotales)
      setCostos(costosTotales)
      setUtilidadOperativa(utilOperativa)
      setUtilidadNeta(utilNeta)

      const formatFechaHora = (iso: string) => {
        const d = new Date(iso)
        const fecha = d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
        const hora = d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true })
        return { fecha, hora }
      }

      const filasIng: DetalleRow[] = ingRes.data.map(t => {
        const { fecha, hora } = formatFechaHora(t.fecha)
        return {
          label: t.descripcion || 'Movimiento',
          valor: Number(t.totalCredito || 0),
          tipo: 'INGRESO',
          categoria: (t.lineas.find((linea) => String(linea.accountCode).startsWith('3.'))?.accountName || t.tipo || 'INGRESO').replace(/\s+/g, '_'),
          fecha,
          hora
        }
      })
      const filasEgr: DetalleRow[] = egreRes.data.map(t => {
        const { fecha, hora } = formatFechaHora(t.fecha)
        return {
          label: t.descripcion || 'Movimiento',
          valor: Number(t.totalDebito || 0),
          tipo: 'EGRESO',
          categoria: (t.lineas.find((linea) => String(linea.accountCode).startsWith('4.'))?.accountName || t.tipo || 'EGRESO').replace(/\s+/g, '_'),
          fecha,
          hora
        }
      })
      const filasCos: DetalleRow[] = costoRes.data.map(t => {
        const { fecha, hora } = formatFechaHora(t.fecha)
        return {
          label: t.descripcion || 'Movimiento',
          valor: Number(t.totalDebito || 0),
          tipo: 'EGRESO',
          categoria: (t.lineas.find((linea) => String(linea.accountCode).startsWith('5.'))?.accountName || t.tipo || 'COSTO').replace(/\s+/g, '_'),
          fecha,
          hora
        }
      })

      const todas = [...filasIng, ...filasEgr, ...filasCos]
      setRows(todas)
    }
    cargar()
    return () => { cancelado = true }
  }, [id])

  // Estos dos hooks van antes del `return null`. Puestos después, el modal
  // cerrado ejecutaba menos hooks que el abierto, y en cuanto el número cambia
  // entre dos renders React tumba la pantalla con el error 310.
  const fechaReporteTexto = useMemo(() => {
    try {
      return new Date().toLocaleDateString('es-CO', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
    } catch {
      return new Date().toLocaleDateString()
    }
  }, [])

  const [pagina, setPagina] = useState(1)

  if (!id) return null

  const pageSize = 5
  const totalPaginas = Math.max(1, Math.ceil(rows.length / pageSize))
  const start = (pagina - 1) * pageSize
  const end = start + pageSize
  const rowsPaginadas = rows.slice(start, end)

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 flex flex-col" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 flex items-start justify-between bg-slate-50/50 sticky top-0 backdrop-blur-md z-10">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-600 border border-blue-100 mb-2">
              <LineChart className="h-3.5 w-3.5" />
              <span>Detalle de Transacción</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Reporte Financiero</h2>
            <div className="flex items-center gap-4 mt-1">
              <p className="flex items-center gap-2 text-slate-600 font-bold text-sm">
                <Calendar className="h-4 w-4" />
                <span className="text-slate-700">{periodoLabel}</span>
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="shrink-0 p-2 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 space-y-8">
          
          {/* Summary Cards */}
          <section className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Desglose Oficial</h3>
            
            <div className="space-y-3 mb-6">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600 font-medium">Ingresos por intereses</span>
                <span className="font-bold text-slate-900">{formatCurrency(ingresos['3.1'] || 0)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600 font-medium">Mora</span>
                <span className="font-bold text-slate-900">{formatCurrency(ingresos['3.2'] || 0)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600 font-medium">Otros ingresos</span>
                <span className="font-bold text-slate-900">{formatCurrency(ingresos['3.3'] || 0)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600 font-medium">Ingresos por artículos</span>
                <span className="font-bold text-slate-900">{formatCurrency(ingresos['3.4'] || 0)}</span>
              </div>
              <div className="border-t border-slate-200 pt-3 flex justify-between items-center text-sm text-rose-600">
                <span className="font-medium">Costos de artículos vendidos</span>
                <span className="font-bold">-{formatCurrency(costos)}</span>
              </div>
              <div className="flex justify-between items-center text-sm text-rose-600">
                <span className="font-medium">Gastos operativos</span>
                <span className="font-bold">-{formatCurrency(gastos)}</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 mb-4 shadow-sm">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-slate-500 uppercase">Utilidad Operativa</span>
                <span className={`text-xl font-black ${utilidadOperativa >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {formatCurrency(utilidadOperativa)}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">Fórmula: Ingresos operativos - Gastos operativos - Costos</p>
            </div>

            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-md">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-slate-300 uppercase">Utilidad Neta</span>
                <span className={`text-xl font-black ${utilidadNeta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {formatCurrency(utilidadNeta)}
                </span>
              </div>
            </div>
          </section>

          {/* Table */}
          <section className="bg-slate-50/50 rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-white/50">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Desglose de Movimientos</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider text-xs">
                  <tr>
                    <th className="px-6 py-3 text-left">Concepto</th>
                    <th className="px-6 py-3 text-left">Categoría</th>
                    <th className="px-6 py-3 text-center">Tipo</th>
                    <th className="px-6 py-3 text-left">Fecha</th>
                    <th className="px-6 py-3 text-left">Hora</th>
                    <th className="px-6 py-3 text-right">Monto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {rowsPaginadas.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-800">{r.label}</td>
                      <td className="px-6 py-4 text-slate-500 font-medium text-xs">{r.categoria.replace(/_/g, ' ')}</td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={
                            r.tipo === 'INGRESO'
                              ? 'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-700 border border-emerald-200'
                              : 'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-700 border border-rose-200'
                          }
                        >
                          {r.tipo}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600 font-medium text-xs">{r.fecha}</td>
                      <td className="px-6 py-4 text-slate-600 font-medium text-xs">{r.hora}</td>
                      <td className={r.tipo === 'INGRESO' ? 'px-6 py-4 text-right font-black text-slate-900' : 'px-6 py-4 text-right font-black text-rose-600'}>
                        {r.tipo === 'INGRESO' ? formatCurrency(r.valor) : `-${formatCurrency(r.valor)}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 bg-white border-t border-slate-100">
              <Paginador
                pagina={pagina}
                totalPaginas={totalPaginas}
                onCambiar={setPagina}
                className="mt-0"
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
