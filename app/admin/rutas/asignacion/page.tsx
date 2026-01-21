'use client'

import { useState } from 'react'
import {
  Users,
  User,
  Route,
  Activity,
  ChevronRight,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Cobrador {
  id: string
  nombre: string
  rutasAsignadas: number
  clientesTotales: number
  capacidadMaxima: number
}

interface RutaAsignable {
  id: string
  nombre: string
  codigo: string
  clientes: number
  cobradorActual?: string
}

const AsignacionCobradoresPage = () => {
  const [cobradorSeleccionado, setCobradorSeleccionado] = useState<string | null>(
    null
  )
  const [expandido, setExpandido] = useState(true)

  const cobradores: Cobrador[] = [
    {
      id: 'CB-001',
      nombre: 'Carlos Pérez',
      rutasAsignadas: 3,
      clientesTotales: 96,
      capacidadMaxima: 120
    },
    {
      id: 'CB-002',
      nombre: 'María Rodríguez',
      rutasAsignadas: 2,
      clientesTotales: 68,
      capacidadMaxima: 110
    },
    {
      id: 'CB-003',
      nombre: 'Pedro Gómez',
      rutasAsignadas: 1,
      clientesTotales: 32,
      capacidadMaxima: 90
    }
  ]

  const rutas: RutaAsignable[] = [
    {
      id: 'RT-001',
      nombre: 'Ruta Centro',
      codigo: 'CENTRO-01',
      clientes: 48,
      cobradorActual: 'Carlos Pérez'
    },
    {
      id: 'RT-002',
      nombre: 'Ruta Norte',
      codigo: 'NORTE-01',
      clientes: 32,
      cobradorActual: 'María Rodríguez'
    },
    {
      id: 'RT-003',
      nombre: 'Ruta Este',
      codigo: 'ESTE-01',
      clientes: 24,
      cobradorActual: 'Sin asignar'
    }
  ]

  const capacidadUsada = (cobrador: Cobrador) =>
    Math.round((cobrador.clientesTotales / cobrador.capacidadMaxima) * 100)

  return (
    <div className="min-h-screen bg-white relative">
      {/* Fondo arquitectónico ultra sutil */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-white via-gray-50/50 to-white"></div>
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(to right, #08557f 0.5px, transparent 0.5px)`,
          backgroundSize: '96px 1px',
          opacity: 0.03
        }}></div>
      </div>

      <div className="relative max-w-6xl mx-auto px-4 py-8 space-y-8">
        <header className="space-y-4">
          <div className="inline-flex items-center gap-2 self-start px-3 py-1 rounded-full bg-[#08557f]/5 text-xs font-medium text-[#08557f] tracking-wide border border-[#08557f]/10">
            <Users className="h-3.5 w-3.5" />
            <span>Asignación de cobradores</span>
          </div>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <h1 className="text-3xl font-light text-gray-900 tracking-tight">
                Balance de carga operativa
              </h1>
              <p className="text-sm text-gray-500 max-w-xl font-light leading-relaxed">
                Reparte rutas entre cobradores evitando sobrecarga y asegurando que cada cliente reciba visitas en la frecuencia correcta.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setExpandido(!expandido)}
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-5 py-2.5 text-xs font-medium text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-all shadow-sm"
              >
                <Activity className="h-4 w-4 text-gray-400" />
                <span>
                  {expandido ? 'Contraer detalle' : 'Expandir detalle'}
                </span>
                {expandido ? (
                  <ChevronUp className="h-3.5 w-3.5 text-gray-400" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                )}
              </button>
            </div>
          </div>
        </header>

        <section className="grid gap-8 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1.8fr)]">
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <div className="text-xs uppercase tracking-[0.2em] font-semibold text-gray-400">
                Cobradores
              </div>
              <span className="text-[10px] font-medium text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">
                Selecciona para ajustar
              </span>
            </div>

            <div className="space-y-3">
              {cobradores.map((cobrador) => {
                const porcentaje = capacidadUsada(cobrador)
                const esSeleccionado = cobradorSeleccionado === cobrador.id

                return (
                  <button
                    key={cobrador.id}
                    type="button"
                    onClick={() =>
                      setCobradorSeleccionado(
                        esSeleccionado ? null : cobrador.id
                      )
                    }
                    className={cn(
                      "w-full rounded-xl border px-5 py-4 text-left transition-all duration-300 group relative overflow-hidden",
                      esSeleccionado
                        ? "border-[#08557f] bg-white shadow-md shadow-[#08557f]/5"
                        : "border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm"
                    )}
                  >
                    {esSeleccionado && (
                      <div className="absolute inset-y-0 left-0 w-1 bg-[#08557f]" />
                    )}
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-full transition-colors",
                        esSeleccionado ? "bg-[#08557f]/10" : "bg-gray-50 group-hover:bg-[#08557f]/5"
                      )}>
                        <User className={cn(
                          "h-5 w-5 transition-colors",
                          esSeleccionado ? "text-[#08557f]" : "text-gray-400 group-hover:text-[#08557f]"
                        )} />
                      </div>
                      <div className="flex-1 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className={cn(
                            "text-sm font-medium transition-colors",
                            esSeleccionado ? "text-[#08557f]" : "text-gray-900"
                          )}>
                            {cobrador.nombre}
                          </span>
                          <span className="text-[10px] font-medium text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">
                            {cobrador.rutasAsignadas} rutas
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>
                            {cobrador.clientesTotales} clientes asignados
                          </span>
                          <span className={cn(
                            "font-medium",
                            porcentaje > 90 ? "text-red-600" : "text-gray-500"
                          )}>
                            {porcentaje}%
                          </span>
                        </div>
                        <div className="mt-2 h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-500",
                              porcentaje > 90 ? "bg-red-500" : "bg-[#08557f]"
                            )}
                            style={{ width: `${Math.min(porcentaje, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-[0.2em]">
                <Route className="h-3.5 w-3.5" />
                <span>Rutas disponibles</span>
              </div>
              <span className="text-[10px] font-medium text-gray-400">
                Vista conceptual
              </span>
            </div>

            <div className="grid gap-3">
              {rutas.map((ruta) => (
                <div
                  key={ruta.id}
                  className="group rounded-xl border border-gray-100 bg-white p-1 hover:border-gray-200 hover:shadow-sm transition-all duration-300"
                >
                  <div className="flex items-center gap-4 p-4 rounded-lg bg-gray-50/30 group-hover:bg-white transition-colors">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#08557f]/5 group-hover:bg-[#08557f]/10 transition-colors">
                      <Route className="h-5 w-5 text-[#08557f]" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">
                          {ruta.nombre}
                        </span>
                        <span className="rounded-full bg-gray-900 text-white text-[10px] px-2 py-0.5 tracking-wide font-medium">
                          {ruta.codigo}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1.5">
                          <Users className="h-3 w-3 text-gray-400" />
                          {ruta.clientes} clientes
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-1 h-1 rounded-full bg-gray-300" />
                          Cobrador: <span className="font-medium text-gray-700">{ruta.cobradorActual}</span>
                        </span>
                      </div>
                    </div>
                    <button className="inline-flex h-8 items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-medium text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-all shadow-sm">
                      <span>Reasignar</span>
                      <ChevronRight className="h-3 w-3 text-gray-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default AsignacionCobradoresPage
