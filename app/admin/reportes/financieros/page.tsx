'use client'

import { LineChart, DollarSign, Calendar, Download } from 'lucide-react'

const ReportesFinancierosPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 px-4 py-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 self-start rounded-full bg-[#08557f]/5 px-3 py-1 text-xs text-[#08557f] tracking-wide">
              <LineChart className="h-3 w-3" />
              <span>Reportes financieros</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-light text-gray-900 tracking-tight">
              Ingresos, egresos y rentabilidad
            </h1>
            <p className="text-sm text-gray-500 max-w-xl">
              Diseñado para contabilidad y administración, con foco en resultados por periodo y comparativos contra objetivos.
            </p>
          </div>
          <div className="flex gap-2">
            <button className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-xs text-gray-700 hover:border-gray-300">
              <Download className="h-4 w-4" />
              <span>Exportar</span>
            </button>
          </div>
        </header>

        <section className="rounded-2xl border border-gray-100 bg-white p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-gray-500 uppercase tracking-[0.18em]">
              <DollarSign className="h-3.5 w-3.5 text-gray-400" />
              <span>Resumen financiero</span>
            </div>
            <Calendar className="h-4 w-4 text-gray-400" />
          </div>
          <p className="text-sm text-gray-500">
            Aquí vivirán reportes de flujo de caja, estados de resultados por periodo, análisis de rentabilidad por producto y métricas clave para toma de decisiones financieras.
          </p>
        </section>
      </div>
    </div>
  )
}

export default ReportesFinancierosPage

