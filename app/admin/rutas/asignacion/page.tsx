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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 px-4 py-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="space-y-3">
          <div className="inline-flex items-center gap-2 self-start px-3 py-1 rounded-full bg-[#08557f]/5 text-xs text-[#08557f] tracking-wide">
            <Users className="h-3 w-3" />
            <span>Asignación de cobradores</span>
          </div>
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl md:text-3xl font-light text-gray-900 tracking-tight">
                Balance de carga operativa
              </h1>
              <p className="text-sm text-gray-500 max-w-xl">
                Reparte rutas entre cobradores evitando sobrecarga y asegurando que cada cliente reciba visitas en la frecuencia correcta.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setExpandido(!expandido)}
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-xs text-gray-700 hover:border-gray-300"
              >
                <Activity className="h-4 w-4" />
                <span>
                  {expandido ? 'Contraer detalle' : 'Expandir detalle'}
                </span>
                {expandido ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </div>
        </header>

        <section className="grid gap-6 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1.8fr)]">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-[0.2em] text-gray-500">
                Cobradores
              </div>
              <span className="text-[11px] text-gray-400">
                Selecciona uno para ajustar rutas
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
                    className={`w-full rounded-xl border px-4 py-3 text-left transition-all ${
                      esSeleccionado
                        ? 'border-[#08557f] bg-[#08557f]/5'
                        : 'border-gray-100 bg-gray-50/60 hover:bg-white hover:border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#08557f]/10">
                        <User className="h-4 w-4 text-[#08557f]" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-900">
                            {cobrador.nombre}
                          </span>
                          <span className="text-[11px] text-gray-500">
                            {cobrador.rutasAsignadas} rutas
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>
                            {cobrador.clientesTotales} clientes asignados
                          </span>
                          <span>Capacidad {porcentaje}%</span>
                        </div>
                        <div className="mt-1 h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[#08557f] to-[#fb851b]"
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

          <div className="rounded-2xl border border-gray-100 bg-white p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-gray-500 uppercase tracking-[0.18em]">
                <Route className="h-3.5 w-3.5 text-gray-400" />
                <span>Rutas disponibles</span>
              </div>
              <span className="text-[11px] text-gray-400">
                Vista conceptual para planificación
              </span>
            </div>

            <div className="grid gap-3">
              {rutas.map((ruta) => (
                <div
                  key={ruta.id}
                  className="rounded-xl border border-gray-100 bg-gray-50/60 hover:bg-white hover:border-gray-200 transition-all"
                >
                  <div className="flex items-center gap-4 p-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#fb851b]/10">
                      <Route className="h-4 w-4 text-[#fb851b]" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">
                          {ruta.nombre}
                        </span>
                        <span className="rounded-full bg-gray-900 text-white text-[10px] px-2 py-0.5 tracking-wide">
                          {ruta.codigo}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                        <span>{ruta.clientes} clientes</span>
                        <span>
                          Cobrador actual:{' '}
                          <span className="font-medium text-gray-800">
                            {ruta.cobradorActual}
                          </span>
                        </span>
                      </div>
                    </div>
                    <button className="inline-flex h-8 items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 hover:border-gray-300">
                      <span>Reasignar</span>
                      <ChevronRight className="h-3.5 w-3.5" />
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

