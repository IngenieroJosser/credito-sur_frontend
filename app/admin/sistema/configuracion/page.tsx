'use client'

import { Settings, SlidersHorizontal } from 'lucide-react'

const ConfiguracionSistemaPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 px-4 py-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="space-y-3">
          <div className="inline-flex items-center gap-2 self-start rounded-full bg-[#08557f]/5 px-3 py-1 text-xs text-[#08557f] tracking-wide">
            <Settings className="h-3 w-3" />
            <span>Configuración general</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-light text-gray-900 tracking-tight">
            Parámetros globales del sistema
          </h1>
          <p className="text-sm text-gray-500 max-w-xl">
            Espacio reservado para ajustar tasas de interés, reglas de mora, frecuencias de pago y otros parámetros maestros controlados por administración.
          </p>
        </header>

        <section className="rounded-2xl border border-gray-100 bg-white p-5 space-y-4">
          <div className="flex items-center gap-2 text-xs text-gray-500 uppercase tracking-[0.18em]">
            <SlidersHorizontal className="h-3.5 w-3.5 text-gray-400" />
            <span>Panel de parámetros</span>
          </div>
          <p className="text-sm text-gray-500">
            Aquí se ubicarán formularios minimalistas para ajustar configuraciones clave del negocio, con controles de seguridad para evitar cambios no autorizados.
          </p>
        </section>
      </div>
    </div>
  )
}

export default ConfiguracionSistemaPage

