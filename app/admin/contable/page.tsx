'use client'

import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  PieChart,
  FileText,
  Calendar
} from 'lucide-react'

const ModuloContablePage = () => {
  const resumen = {
    ingresos: 28500,
    egresos: 13250,
    utilidadNeta: 15250
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 px-4 py-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 self-start rounded-full bg-[#08557f]/5 px-3 py-1 text-xs text-[#08557f] tracking-wide">
              <DollarSign className="h-3 w-3" />
              <span>Módulo contable</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-light text-gray-900 tracking-tight">
              Visión financiera del sistema
            </h1>
            <p className="text-sm text-gray-500 max-w-xl">
              Control centralizado de costos de artículos, gastos operativos e indicadores clave de rentabilidad.
            </p>
          </div>
        </header>

        <section className="grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-[0.2em] text-gray-500">
                Ingresos
              </div>
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-light text-gray-900">
              ${resumen.ingresos.toFixed(2)}
            </div>
            <p className="text-xs text-gray-400">
              Entradas por cuotas cobradas y abonos a capital.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-[0.2em] text-gray-500">
                Egresos
              </div>
              <TrendingDown className="h-4 w-4 text-red-500" />
            </div>
            <div className="text-2xl font-light text-gray-900">
              ${resumen.egresos.toFixed(2)}
            </div>
            <p className="text-xs text-gray-400">
              Gastos operativos, comisiones y base de cobradores.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-[0.2em] text-gray-500">
                Utilidad neta
              </div>
              <PieChart className="h-4 w-4 text-[#fb851b]" />
            </div>
            <div className="text-2xl font-light text-gray-900">
              ${resumen.utilidadNeta.toFixed(2)}
            </div>
            <p className="text-xs text-gray-400">
              Resultado del periodo antes de impuestos.
            </p>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-gray-500 uppercase tracking-[0.18em]">
                <FileText className="h-3.5 w-3.5 text-gray-400" />
                <span>Gastos operativos</span>
              </div>
            </div>
            <p className="text-sm text-gray-500">
              Vista conceptual para el registro de gastos de ruta, sucursales y operaciones centrales, con clasificación por tipo y centro de costo.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-gray-500 uppercase tracking-[0.18em]">
                <Calendar className="h-3.5 w-3.5 text-gray-400" />
                <span>Flujo de caja</span>
              </div>
            </div>
            <p className="text-sm text-gray-500">
              Sección destinada a reportes de caja diaria, conciliación por usuario y movimientos entre cajas principales y de ruta.
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}

export default ModuloContablePage

