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
    <div className="min-h-screen bg-slate-50">
      {/* Header Sticky */}
      <div className="sticky top-0 z-30 backdrop-blur-xl bg-slate-50/80 border-b border-slate-200/60 px-6 md:px-8 py-4">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between animate-in fade-in slide-in-from-top-4 duration-500">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-xs text-slate-600 tracking-wide font-bold border border-slate-200 mb-2">
              <Users className="h-3.5 w-3.5" />
              <span>Asignación de cobradores</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
              Balance de <span className="text-slate-700">Carga Operativa</span>
            </h1>
            <p className="text-slate-500 mt-1 font-medium text-sm max-w-xl">
              Reparte rutas entre cobradores evitando sobrecarga y asegurando cobertura.
            </p>
          </div>
          <button
            onClick={() => setExpandido(!expandido)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-all shadow-sm hover:shadow-md"
          >
            <Activity className="h-4 w-4 text-slate-400" />
            <span>
              {expandido ? 'Contraer detalle' : 'Expandir detalle'}
            </span>
            {expandido ? (
              <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            )}
          </button>
        </header>
      </div>

      <div className="px-6 md:px-8 py-8">
        <section className="grid gap-8 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1.8fr)] animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <div className="text-xs uppercase tracking-[0.2em] font-bold text-slate-400">
                Cobradores
              </div>
              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
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
                        ? "border-slate-900 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.12)]"
                        : "border-slate-200 bg-white/50 hover:border-slate-300 hover:bg-white hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
                    )}
                  >
                    {esSeleccionado && (
                      <div className="absolute inset-y-0 left-0 w-1 bg-slate-900" />
                    )}
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-full transition-colors",
                        esSeleccionado ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-400 group-hover:bg-slate-200 group-hover:text-slate-600"
                      )}>
                        <User className="h-5 w-5" />
                      </div>
                      <div className="flex-1 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className={cn(
                            "text-sm font-bold transition-colors",
                            esSeleccionado ? "text-slate-900" : "text-slate-700"
                          )}>
                            {cobrador.nombre}
                          </span>
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                            {cobrador.rutasAsignadas} rutas
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                          <span>
                            {cobrador.clientesTotales} clientes asignados
                          </span>
                          <span className={cn(
                            "font-bold",
                            porcentaje > 90 ? "text-rose-600" : "text-slate-500"
                          )}>
                            {porcentaje}%
                          </span>
                        </div>
                        <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-500",
                              porcentaje > 90 ? "bg-rose-500" : "bg-slate-900"
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
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">
                <Route className="h-3.5 w-3.5" />
                <span>Rutas disponibles</span>
              </div>
              <span className="text-[10px] font-bold text-slate-400">
                Vista conceptual
              </span>
            </div>

            <div className="grid gap-3">
              {rutas.map((ruta) => (
                <div
                  key={ruta.id}
                  className="group rounded-xl border border-slate-200 bg-white p-1 hover:border-slate-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300"
                >
                  <div className="flex items-center gap-4 p-4 rounded-lg bg-slate-50/50 group-hover:bg-white transition-colors">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 group-hover:bg-slate-200 transition-colors">
                      <Route className="h-5 w-5 text-slate-600" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">
                          {ruta.nombre}
                        </span>
                        <span className="rounded-full bg-slate-900 text-white text-[10px] px-2 py-0.5 tracking-wide font-bold">
                          {ruta.codigo}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 font-medium">
                        <span className="flex items-center gap-1.5">
                          <Users className="h-3 w-3 text-slate-400" />
                          {ruta.clientes} clientes
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                          Cobrador: <span className="font-bold text-slate-700">{ruta.cobradorActual}</span>
                        </span>
                      </div>
                    </div>
                    <button className="inline-flex h-8 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-all shadow-sm">
                      <span>Reasignar</span>
                      <ChevronRight className="h-3 w-3 text-slate-400" />
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
