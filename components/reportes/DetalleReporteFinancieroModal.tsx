'use client'

import { useMemo } from 'react'
import { X, Calendar, TrendingUp, TrendingDown, Eye, LineChart } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface DetalleReporteFinancieroModalProps {
  id: string
  onClose: () => void
}

type DetalleRow = {
  label: string
  valor: number
  tipo: 'INGRESO' | 'EGRESO'
  categoria: string
}

export default function DetalleReporteFinancieroModal({ id, onClose }: DetalleReporteFinancieroModalProps) {
  const { periodoLabel, ingresos, egresos, utilidad, margen, rows } = useMemo(() => {
    // Si id viene vacío, evitamos errores
    if (!id) {
      return {
        periodoLabel: '',
        ingresos: 0,
        egresos: 0,
        utilidad: 0,
        margen: 0,
        rows: []
      }
    }

    const parts = decodeURIComponent(id).split('-')
    const mes = parts[0] || 'Periodo'
    const year = parts[1] || String(new Date().getFullYear())

    const ingresosBase = 42000000
    const egresosBase = 18000000

    const seed = id
      .split('')
      .reduce((acc, ch) => acc + ch.charCodeAt(0), 0)

    const ingresos = ingresosBase + (seed % 7) * 1500000
    const egresos = egresosBase + (seed % 5) * 900000
    const utilidad = Math.max(0, ingresos - egresos)
    const margen = ingresos > 0 ? (utilidad / ingresos) * 100 : 0

    const rows: DetalleRow[] = [
      { label: 'Cobros de cuotas', valor: Math.round(ingresos * 0.72), tipo: 'INGRESO', categoria: 'COBRO_CUOTA' },
      { label: 'Abonos a capital', valor: Math.round(ingresos * 0.18), tipo: 'INGRESO', categoria: 'ABONO_CAPITAL' },
      { label: 'Otros ingresos', valor: Math.max(0, ingresos - (Math.round(ingresos * 0.72) + Math.round(ingresos * 0.18))), tipo: 'INGRESO', categoria: 'OTROS_INGRESOS' },
      { label: 'Gastos operativos', valor: Math.round(egresos * 0.55), tipo: 'EGRESO', categoria: 'GASTO_OPERATIVO' },
      { label: 'Gastos administrativos', valor: Math.round(egresos * 0.35), tipo: 'EGRESO', categoria: 'GASTO_ADMINISTRATIVO' },
      { label: 'Otros egresos', valor: Math.max(0, egresos - (Math.round(egresos * 0.55) + Math.round(egresos * 0.35))), tipo: 'EGRESO', categoria: 'OTROS_EGRESOS' },
    ]

    return {
      periodoLabel: `${mes} ${year}`,
      ingresos,
      egresos,
      utilidad,
      margen,
      rows,
    }
  }, [id])

  if (!id) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 flex flex-col">
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 flex items-start justify-between bg-slate-50/50 sticky top-0 backdrop-blur-md z-10">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-600 border border-blue-100 mb-2">
              <LineChart className="h-3.5 w-3.5" />
              <span>Detalle de Transacción</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Reporte Financiero</h2>
            <p className="flex items-center gap-2 text-slate-500 font-medium mt-1 text-sm">
              <Calendar className="h-4 w-4" />
              {periodoLabel}
            </p>
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
                    <th className="px-6 py-3 text-right">Monto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {rows.map((r, i) => (
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
                      <td className={r.tipo === 'INGRESO' ? 'px-6 py-4 text-right font-black text-slate-900' : 'px-6 py-4 text-right font-black text-rose-600'}>
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
    </div>
  )
}
