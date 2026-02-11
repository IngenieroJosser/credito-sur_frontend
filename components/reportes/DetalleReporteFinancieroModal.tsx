'use client'

import { useMemo, useState, useEffect } from 'react'
import { X, Calendar, TrendingUp, TrendingDown, Eye, LineChart } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { getTransacciones } from '@/services/contabilidad-service'

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
  const [ingresos, setIngresos] = useState<number>(0)
  const [egresos, setEgresos] = useState<number>(0)
  const [utilidad, setUtilidad] = useState<number>(0)
  const [margen, setMargen] = useState<number>(0)
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

      const fechaInicio = start.toISOString()
      const fechaFin = end.toISOString()

      const [ingRes, egreRes] = await Promise.all([
        getTransacciones({ tipo: 'INGRESO', fechaInicio, fechaFin, limit: 10000 }),
        getTransacciones({ tipo: 'EGRESO', fechaInicio, fechaFin, limit: 10000 })
      ])

      if (cancelado) return

      const ingresosTotal = ingRes.data.reduce((acc, t) => acc + (t.monto || 0), 0)
      const egresosTotal = egreRes.data.reduce((acc, t) => acc + (t.monto || 0), 0)
      const utilidadTotal = Math.max(0, ingresosTotal - egresosTotal)
      const margenTotal = ingresosTotal > 0 ? (utilidadTotal / ingresosTotal) * 100 : 0

      setIngresos(ingresosTotal)
      setEgresos(egresosTotal)
      setUtilidad(utilidadTotal)
      setMargen(Number(margenTotal.toFixed(1)))

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
          valor: t.monto || 0,
          tipo: 'INGRESO',
          categoria: (t.categoria || 'INGRESO').replace(/\s+/g, '_'),
          fecha,
          hora
        }
      })
      const filasEgr: DetalleRow[] = egreRes.data.map(t => {
        const { fecha, hora } = formatFechaHora(t.fecha)
        return {
          label: t.descripcion || 'Movimiento',
          valor: t.monto || 0,
          tipo: 'EGRESO',
          categoria: (t.categoria || 'EGRESO').replace(/\s+/g, '_'),
          fecha,
          hora
        }
      })

      const todas = [...filasIng, ...filasEgr]
      setRows(todas)
    }
    cargar()
    return () => { cancelado = true }
  }, [id])

  if (!id) return null
  
  const fechaReporteTexto = useMemo(() => {
    try {
      return new Date().toLocaleDateString('es-CO', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
    } catch {
      return new Date().toLocaleDateString()
    }
  }, [])
  
  const [pagina, setPagina] = useState(1)
  const pageSize = 5
  const totalPaginas = Math.max(1, Math.ceil(rows.length / pageSize))
  const start = (pagina - 1) * pageSize
  const end = start + pageSize
  const rowsPaginadas = rows.slice(start, end)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 flex flex-col" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 flex items-start justify-between bg-slate-50/50 sticky top-0 backdrop-blur-md z-10">
          <div>
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
            className="p-2 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 space-y-8">
          
          {/* Summary Cards */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ingresos</p>
                  <p className="mt-1 text-xl font-black text-slate-900">{formatCurrency(ingresos)}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600">
                  <TrendingUp className="h-5 w-5" />
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Egresos</p>
                  <p className="mt-1 text-xl font-black text-slate-900">{formatCurrency(egresos)}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-100 text-rose-600">
                  <TrendingDown className="h-5 w-5" />
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Utilidad Neta</p>
                  <p className="mt-1 text-xl font-black text-slate-900">{formatCurrency(utilidad)}</p>
                  <p className="text-xs font-bold text-slate-400 mt-0.5">Margen: {margen.toFixed(1)}%</p>
                </div>
                <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-100 text-blue-600">
                  <Eye className="h-5 w-5" />
                </div>
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
            <div className="flex items-center justify-between px-6 py-4 bg-white border-t border-slate-100">
              <span className="text-xs font-bold text-slate-500">Página {pagina} de {totalPaginas}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPagina(p => Math.max(1, p - 1))}
                  disabled={pagina === 1}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${pagina === 1 ? 'text-slate-300 border-slate-200 bg-slate-50 cursor-not-allowed' : 'text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                >
                  Anterior
                </button>
                <button
                  onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                  disabled={pagina === totalPaginas}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${pagina === totalPaginas ? 'text-slate-300 border-slate-200 bg-slate-50 cursor-not-allowed' : 'text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                >
                  Siguiente
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
