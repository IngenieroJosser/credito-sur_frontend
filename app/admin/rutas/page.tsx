'use client'

import { useState } from 'react'
import {
  MapPin,
  Route,
  Users,
  User,
  Clock,
  Activity,
  Plus,
  ChevronRight
} from 'lucide-react'

type EstadoRuta = 'activa' | 'inactiva'

interface RutaCobro {
  id: string
  nombre: string
  codigo: string
  estado: EstadoRuta
  cobrador: string
  supervisor: string
  clientesAsignados: number
  frecuenciaVisita: string
}

const RutasPage = () => {
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoRuta | 'todas'>(
    'todas'
  )

  const rutas: RutaCobro[] = [
    {
      id: 'RT-001',
      nombre: 'Ruta Centro',
      codigo: 'CENTRO-01',
      estado: 'activa',
      cobrador: 'Carlos Pérez',
      supervisor: 'Ana López',
      clientesAsignados: 48,
      frecuenciaVisita: 'Diaria'
    },
    {
      id: 'RT-002',
      nombre: 'Ruta Norte',
      codigo: 'NORTE-01',
      estado: 'activa',
      cobrador: 'María Rodríguez',
      supervisor: 'Luis Fernández',
      clientesAsignados: 32,
      frecuenciaVisita: 'Semanal'
    },
    {
      id: 'RT-003',
      nombre: 'Ruta Este',
      codigo: 'ESTE-01',
      estado: 'inactiva',
      cobrador: 'Pedro Gómez',
      supervisor: 'Sin asignar',
      clientesAsignados: 0,
      frecuenciaVisita: 'Configuración pendiente'
    }
  ]

  const rutasFiltradas =
    estadoFiltro === 'todas'
      ? rutas
      : rutas.filter((ruta) => ruta.estado === estadoFiltro)

  const rutasActivas = rutas.filter((ruta) => ruta.estado === 'activa').length

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 px-4 py-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 self-start px-3 py-1 rounded-full bg-[#08557f]/5 text-xs text-[#08557f] tracking-wide">
              <Route className="h-3 w-3" />
              <span>Gestión de rutas</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-light text-gray-900 tracking-tight">
              Rutas de cobro y territorios
            </h1>
            <p className="text-sm text-gray-500 max-w-xl">
              Organiza las rutas de tus cobradores, controla la carga diaria y asegura cobertura sobre toda la cartera.
            </p>
          </div>
          <div className="flex gap-2">
            <button className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-xs text-gray-700 hover:border-gray-300">
              <Plus className="h-4 w-4" />
              <span>Nueva ruta</span>
            </button>
          </div>
        </header>

        <section className="grid gap-6 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1.7fr)]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-gray-100 bg-white p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-xs uppercase tracking-[0.2em] text-gray-500">
                  Resumen de rutas
                </div>
                <Activity className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <div className="text-2xl font-light text-gray-900">
                    {rutasActivas}
                  </div>
                  <div className="text-xs text-gray-500">
                    Rutas activas en operación
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-2xl font-light text-gray-900">
                    {rutas.reduce(
                      (acc, ruta) => acc + ruta.clientesAsignados,
                      0
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    Clientes asignados en total
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs uppercase tracking-[0.2em] text-gray-500">
                  Filtros rápidos
                </div>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <button
                  onClick={() => setEstadoFiltro('todas')}
                  className={`rounded-full px-3 py-1 border ${
                    estadoFiltro === 'todas'
                      ? 'border-gray-800 bg-gray-900 text-white'
                      : 'border-gray-200 bg-white text-gray-600'
                  }`}
                >
                  Todas
                </button>
                <button
                  onClick={() => setEstadoFiltro('activa')}
                  className={`rounded-full px-3 py-1 border ${
                    estadoFiltro === 'activa'
                      ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                      : 'border-gray-200 bg-white text-gray-600'
                  }`}
                >
                  Activas
                </button>
                <button
                  onClick={() => setEstadoFiltro('inactiva')}
                  className={`rounded-full px-3 py-1 border ${
                    estadoFiltro === 'inactiva'
                      ? 'border-amber-400 bg-amber-50 text-amber-700'
                      : 'border-gray-200 bg-white text-gray-600'
                  }`}
                >
                  Inactivas
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-gray-500 uppercase tracking-[0.18em]">
                <MapPin className="h-3.5 w-3.5 text-gray-400" />
                <span>Detalle de rutas</span>
              </div>
              <span className="text-[11px] text-gray-400">
                {rutasFiltradas.length} rutas configuradas
              </span>
            </div>

            <div className="grid gap-3">
              {rutasFiltradas.map((ruta) => (
                <div
                  key={ruta.id}
                  className="group rounded-xl border border-gray-100 bg-gray-50/60 hover:bg-white hover:border-gray-200 transition-all"
                >
                  <div className="flex items-center gap-4 p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#08557f]/10">
                      <Route className="h-5 w-5 text-[#08557f]" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">
                          {ruta.nombre}
                        </span>
                        <span className="rounded-full bg-gray-900 text-white text-[10px] px-2 py-0.5 tracking-wide">
                          {ruta.codigo}
                        </span>
                        <span
                          className={`rounded-full text-[10px] px-2 py-0.5 ${
                            ruta.estado === 'activa'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {ruta.estado === 'activa' ? 'Activa' : 'Inactiva'}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                        <span className="inline-flex items-center gap-1">
                          <User className="h-3.5 w-3.5 text-gray-400" />
                          <span>{ruta.cobrador}</span>
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Users className="h-3.5 w-3.5 text-gray-400" />
                          <span>{ruta.clientesAsignados} clientes</span>
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-gray-400" />
                          <span>{ruta.frecuenciaVisita}</span>
                        </span>
                      </div>
                    </div>
                    <button className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 group-hover:border-gray-300">
                      <ChevronRight className="h-4 w-4" />
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

export default RutasPage

