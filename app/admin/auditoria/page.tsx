'use client'

import { Shield, Search, Filter } from 'lucide-react'

const AuditoriaSistemaPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 px-4 py-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="space-y-3">
          <div className="inline-flex items-center gap-2 self-start rounded-full bg-[#08557f]/5 px-3 py-1 text-xs text-[#08557f] tracking-wide">
            <Shield className="h-3 w-3" />
            <span>Auditoría del sistema</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-light text-gray-900 tracking-tight">
            Trazabilidad de acciones críticas
          </h1>
          <p className="text-sm text-gray-500 max-w-xl">
            Registro conceptual de eventos como creación de créditos, cambios de límites, ajustes de mora y movimientos contables.
          </p>
        </header>

        <section className="rounded-2xl border border-gray-100 bg-white p-5 space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1 max-w-md">
              <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                placeholder="Buscar por usuario, acción o módulo"
                className="w-full rounded-full border border-gray-200 bg-white pl-9 pr-3 py-2.5 text-sm text-gray-800 outline-none focus:border-[#08557f] focus:ring-2 focus:ring-[#08557f]/10 transition-all"
              />
            </div>
            <button className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 hover:border-gray-300">
              <Filter className="h-4 w-4" />
              <span>Filtros</span>
            </button>
          </div>

          <div className="mt-2 rounded-xl border border-dashed border-gray-200 bg-gray-50/80 px-4 py-6 text-sm text-gray-500">
            Esta vista está diseñada para mostrar una tabla de auditoría con filtros por usuario, rango de fechas, tipo de entidad y detalle de cada cambio realizado en el sistema.
          </div>
        </section>
      </div>
    </div>
  )
}

export default AuditoriaSistemaPage
