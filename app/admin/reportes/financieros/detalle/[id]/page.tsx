'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Calendar, Eye, LineChart, TrendingDown, TrendingUp } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

type DetalleRow = {
  label: string
  valor: number
  tipo: 'INGRESO' | 'EGRESO'
  categoria: string
}

export default function DetalleReporteFinancieroPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const rawId = params?.id ?? ''

  const { periodoLabel, ingresos, egresos, utilidad, margen, rows } = useMemo(() => {
    const parts = decodeURIComponent(rawId).split('-')
    const mes = parts[0] || 'Periodo'
    const year = parts[1] || String(new Date().getFullYear())

    const ingresosBase = 42000000
    const egresosBase = 18000000

    const seed = rawId
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
            <p className="text-sm text-slate-500 font-medium">Desglose mock por categoría</p>
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
