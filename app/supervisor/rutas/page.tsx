'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Filter, LayoutGrid, List, MapPin, Search, TrendingUp, Users, Eye } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'

type EstadoRuta = 'ACTIVA' | 'INACTIVA'

type ViewMode = 'grid' | 'list'

interface RutaCobro {
  id: string
  nombre: string
  codigo: string
  estado: EstadoRuta
  cobrador: string
  supervisor: string
  clientesAsignados: number
  frecuenciaVisita: string
  cobranzaDelDia: number
  metaDelDia: number
}

export default function SupervisorRutasPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/supervisor')
  }, [router])

  return null

  const [busqueda, setBusqueda] = useState('')
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoRuta | 'TODAS'>('TODAS')
  const [vista, setVista] = useState<ViewMode>('grid')

  const rutas: RutaCobro[] = useMemo(
    () => [
      {
        id: 'RT-001',
        nombre: 'Ruta Centro',
        codigo: 'CENTRO-01',
        estado: 'ACTIVA',
        cobrador: 'Carlos Pérez',
        supervisor: 'Ana López',
        clientesAsignados: 48,
        frecuenciaVisita: 'Diaria',
        cobranzaDelDia: 1250000,
        metaDelDia: 1500000,
      },
      {
        id: 'RT-002',
        nombre: 'Ruta Norte',
        codigo: 'NORTE-01',
        estado: 'ACTIVA',
        cobrador: 'María Rodríguez',
        supervisor: 'Luis Fernández',
        clientesAsignados: 32,
        frecuenciaVisita: 'Semanal',
        cobranzaDelDia: 820000,
        metaDelDia: 1000000,
      },
      {
        id: 'RT-003',
        nombre: 'Ruta Este',
        codigo: 'ESTE-01',
        estado: 'INACTIVA',
        cobrador: 'Pedro Gómez',
        supervisor: 'Sin asignar',
        clientesAsignados: 0,
        frecuenciaVisita: 'Pendiente',
        cobranzaDelDia: 0,
        metaDelDia: 0,
      },
    ],
    [],
  )

  const rutasFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return rutas.filter((r) => {
      const coincideEstado = estadoFiltro === 'TODAS' || r.estado === estadoFiltro
      const coincideBusqueda =
        !q || r.nombre.toLowerCase().includes(q) || r.codigo.toLowerCase().includes(q) || r.cobrador.toLowerCase().includes(q)
      return coincideEstado && coincideBusqueda
    })
  }, [busqueda, estadoFiltro, rutas])

  const totalRecaudo = rutasFiltradas.reduce((acc, r) => acc + r.cobranzaDelDia, 0)
  const totalMeta = rutasFiltradas.reduce((acc, r) => acc + r.metaDelDia, 0)
  const porcentaje = totalMeta > 0 ? Math.round((totalRecaudo / totalMeta) * 100) : 0

  return (
    <div className="min-h-screen bg-slate-50 relative">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-cyan-500 opacity-20 blur-[100px]"></div>
      </div>

      <div className="relative z-10 px-6 md:px-8 py-8 space-y-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between animate-in fade-in slide-in-from-top-4 duration-500">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 mb-2 border border-slate-200">
              <MapPin className="h-3.5 w-3.5" />
              <span>Supervisor</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              <span className="text-blue-600">Rutas </span>
              <span className="text-orange-500">de Cobro</span>
            </h1>
            <p className="text-sm text-slate-500 max-w-2xl mt-1 font-medium">Visibilidad operativa de desempeño por ruta.</p>
          </div>

          <Link
            href="/supervisor"
            className="inline-flex items-center gap-2 rounded-xl bg-white border border-slate-200 px-6 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
          >
            <span>Volver al panel</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Recaudo</span>
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{formatCurrency(totalRecaudo)}</div>
            <div className="text-xs text-slate-500 font-medium mt-1">{porcentaje}% de meta</div>
          </div>
          <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Meta</span>
              <TrendingUp className="h-4 w-4 text-slate-400" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{formatCurrency(totalMeta)}</div>
            <div className="text-xs text-slate-500 font-medium mt-1">Suma de rutas filtradas</div>
          </div>
          <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Clientes</span>
              <Users className="h-4 w-4 text-sky-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{rutasFiltradas.reduce((acc, r) => acc + r.clientesAsignados, 0)}</div>
            <div className="text-xs text-slate-500 font-medium mt-1">Asignados</div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por ruta, código o cobrador..."
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 bg-white shadow-sm text-sm font-medium placeholder:text-slate-400"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative w-full md:w-auto">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <select
                value={estadoFiltro}
                onChange={(e) => setEstadoFiltro(e.target.value as EstadoRuta | 'TODAS')}
                className="w-full md:w-auto pl-10 pr-8 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 bg-white shadow-sm appearance-none cursor-pointer font-medium text-slate-600"
              >
                <option value="TODAS">Todas</option>
                <option value="ACTIVA">Activas</option>
                <option value="INACTIVA">Inactivas</option>
              </select>
            </div>

            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
              <button
                onClick={() => setVista('grid')}
                className={cn(
                  'p-2 rounded-lg transition-all duration-200',
                  vista === 'grid' ? 'bg-white text-primary shadow-sm' : 'text-slate-400 hover:text-slate-600',
                )}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setVista('list')}
                className={cn(
                  'p-2 rounded-lg transition-all duration-200',
                  vista === 'list' ? 'bg-white text-primary shadow-sm' : 'text-slate-400 hover:text-slate-600',
                )}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {rutasFiltradas.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 border-dashed">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Sin resultados</h3>
            <p className="text-slate-500 font-medium">No hay rutas con los filtros actuales.</p>
          </div>
        ) : vista === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rutasFiltradas.map((ruta) => (
              <div key={ruta.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-lg font-bold text-slate-900">{ruta.nombre}</div>
                      <div className="text-xs text-slate-500 font-mono font-medium">{ruta.codigo}</div>
                    </div>
                    <span
                      className={cn(
                        'px-3 py-1 rounded-full text-xs font-bold border',
                        ruta.estado === 'ACTIVA'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                          : 'bg-slate-50 text-slate-600 border-slate-200',
                      )}
                    >
                      {ruta.estado}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-slate-400 font-bold uppercase">Cobrador</div>
                      <div className="text-sm font-bold text-slate-800">{ruta.cobrador}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400 font-bold uppercase">Supervisor</div>
                      <div className="text-sm font-bold text-slate-800">{ruta.supervisor}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400 font-bold uppercase">Clientes</div>
                      <div className="text-sm font-bold text-slate-800">{ruta.clientesAsignados}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400 font-bold uppercase">Frecuencia</div>
                      <div className="text-sm font-bold text-slate-800">{ruta.frecuenciaVisita}</div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-slate-400 font-bold uppercase">Meta</div>
                      <div className="text-sm font-bold text-slate-900">{formatCurrency(ruta.metaDelDia)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400 font-bold uppercase">Recaudo</div>
                      <div className="text-sm font-bold text-emerald-700">{formatCurrency(ruta.cobranzaDelDia)}</div>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <Link
                      href={`/supervisor/rutas/${ruta.id}`}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all"
                    >
                      <Eye className="h-4 w-4" />
                      Ver detalle
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 font-bold tracking-wider">Ruta</th>
                    <th className="px-6 py-4 font-bold tracking-wider">Cobrador</th>
                    <th className="px-6 py-4 font-bold tracking-wider">Clientes</th>
                    <th className="px-6 py-4 font-bold tracking-wider">Meta</th>
                    <th className="px-6 py-4 font-bold tracking-wider">Recaudo</th>
                    <th className="px-6 py-4 font-bold tracking-wider text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rutasFiltradas.map((ruta) => (
                    <tr key={ruta.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900">{ruta.nombre}</div>
                        <div className="text-xs text-slate-500 font-mono">{ruta.codigo}</div>
                      </td>
                      <td className="px-6 py-4 text-slate-700 font-medium">{ruta.cobrador}</td>
                      <td className="px-6 py-4 text-slate-700 font-bold">{ruta.clientesAsignados}</td>
                      <td className="px-6 py-4 text-slate-900 font-bold">{formatCurrency(ruta.metaDelDia)}</td>
                      <td className="px-6 py-4 text-emerald-700 font-bold">{formatCurrency(ruta.cobranzaDelDia)}</td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/supervisor/rutas/${ruta.id}`}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors inline-flex"
                          title="Ver detalle"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
