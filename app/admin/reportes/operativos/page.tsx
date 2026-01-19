'use client'

import { BarChart3, Calendar, Filter, Download } from 'lucide-react'

const ReportesOperativosPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 px-4 py-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 self-start rounded-full bg-[#08557f]/5 px-3 py-1 text-xs text-[#08557f] tracking-wide">
              <BarChart3 className="h-3 w-3" />
              <span>Reportes operativos</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-light text-gray-900 tracking-tight">
              Rendimiento diario y por rutas
            </h1>
            <p className="text-sm text-gray-500 max-w-xl">
              Consolida la operación por cobrador, ruta y estado de los créditos para decisiones rápidas de coordinación.
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
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5">
                <Calendar className="h-3.5 w-3.5 text-gray-400" />
                <span>Hoy</span>
              </div>
              <button className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-gray-700 hover:border-gray-300">
                <Filter className="h-3.5 w-3.5" />
                <span>Filtros avanzados</span>
              </button>
            </div>
          </div>
          <p className="text-sm text-gray-500">
            Sección pensada para mostrar tarjetas y tablas de indicadores operativos: cobranzas del día, efectividad por ruta, cuentas nuevas, renovaciones y clientes en mora detectados.
          </p>
        </section>
      </div>
    </div>
  )
}

export default ReportesOperativosPage

