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
  ChevronRight,
  Search,
  TrendingUp,
  AlertTriangle
} from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'

// Enums alineados con Prisma
type EstadoRuta = 'ACTIVA' | 'INACTIVA'

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

const RutasPage = () => {
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoRuta | 'TODAS'>('TODAS')
  const [busqueda, setBusqueda] = useState('')
  const [rutas] = useState<RutaCobro[]>([
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
      metaDelDia: 1500000
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
      metaDelDia: 1000000
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
      metaDelDia: 0
    },
    {
      id: 'RT-004',
      nombre: 'Ruta Sur - Expansión',
      codigo: 'SUR-EXP-01',
      estado: 'ACTIVA',
      cobrador: 'Juanito Alimaña',
      supervisor: 'Ana López',
      clientesAsignados: 15,
      frecuenciaVisita: 'Diaria',
      cobranzaDelDia: 300000,
      metaDelDia: 500000
    }
  ])

  const rutasFiltradas = rutas.filter((ruta) => {
    const cumpleEstado = estadoFiltro === 'TODAS' || ruta.estado === estadoFiltro
    const cumpleBusqueda = 
      ruta.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      ruta.codigo.toLowerCase().includes(busqueda.toLowerCase()) ||
      ruta.cobrador.toLowerCase().includes(busqueda.toLowerCase())
    
    return cumpleEstado && cumpleBusqueda
  })

  const rutasActivas = rutas.filter((ruta) => ruta.estado === 'ACTIVA').length
  const totalClientes = rutas.reduce((acc, curr) => acc + curr.clientesAsignados, 0)
  const metaTotal = rutas.reduce((acc, curr) => acc + curr.metaDelDia, 0)
  const cobranzaTotal = rutas.reduce((acc, curr) => acc + curr.cobranzaDelDia, 0)
  const porcentajeAvance = metaTotal > 0 ? (cobranzaTotal / metaTotal) * 100 : 0

  return (
    <div className="min-h-screen bg-white relative">
      {/* Fondo arquitectónico ultra sutil */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-white via-gray-50/50 to-white"></div>
        {/* Líneas de estructura */}
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(to right, #08557f 0.5px, transparent 0.5px)`,
          backgroundSize: '96px 1px',
          opacity: 0.03
        }}></div>
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(to bottom, #08557f 0.5px, transparent 0.5px)`,
          backgroundSize: '1px 96px',
          opacity: 0.03
        }}></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto p-6 md:p-12 space-y-12">
        <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 self-start px-3 py-1 rounded-full bg-[#08557f]/5 text-xs text-[#08557f] tracking-wide font-medium">
              <Route className="h-3.5 w-3.5" />
              <span>Gestión de Territorios</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-light text-gray-900 tracking-tight">
              Rutas y <span className="font-semibold text-[#08557f]">Cobradores</span>
            </h1>
            <p className="text-lg text-gray-500 max-w-2xl font-light leading-relaxed">
              Administra la asignación geográfica de clientes y monitorea el rendimiento de cada zona operativa.
            </p>
          </div>
          <div className="flex gap-4">
            <button className="inline-flex items-center gap-2 rounded-xl bg-[#08557f] px-6 py-3 text-sm font-medium text-white shadow-lg shadow-[#08557f]/20 hover:bg-[#064364] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300">
              <Plus className="h-4 w-4" />
              <span>Nueva Ruta</span>
            </button>
          </div>
        </header>

        {/* Tarjetas de Resumen (Stats) */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { 
              label: 'Rutas Activas', 
              value: rutasActivas, 
              sub: 'Operativas hoy', 
              icon: MapPin, 
              color: 'text-gray-900', 
              subColor: 'text-emerald-600' 
            },
            { 
              label: 'Clientes Asignados', 
              value: totalClientes, 
              sub: `En ${rutasActivas} rutas`, 
              icon: Users, 
              color: 'text-gray-900', 
              subColor: 'text-gray-500' 
            },
            { 
              label: 'Avance Cobranza', 
              value: `${porcentajeAvance.toFixed(1)}%`, 
              sub: `Meta: ${formatCurrency(metaTotal)}`, 
              icon: TrendingUp, 
              color: 'text-gray-900', 
              subColor: 'text-gray-500' 
            },
            { 
              label: 'Incidencias', 
              value: '3', 
              sub: 'Requieren atención', 
              icon: AlertTriangle, 
              color: 'text-gray-900', 
              subColor: 'text-amber-600' 
            }
          ].map((stat, i) => (
            <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 group">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-gray-50 rounded-xl group-hover:bg-[#08557f]/5 group-hover:text-[#08557f] transition-colors">
                  <stat.icon className="h-6 w-6 text-gray-900 group-hover:text-[#08557f]" />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">{stat.label}</p>
                <h3 className={`text-3xl font-light ${stat.color} tracking-tight`}>{stat.value}</h3>
              </div>
              <div className={`mt-4 text-xs font-medium ${stat.subColor} flex items-center gap-1.5`}>
                <Activity className="h-3.5 w-3.5" />
                {stat.sub}
              </div>
            </div>
          ))}
        </div>

        {/* Filtros y Búsqueda */}
        <div className="flex flex-col md:flex-row gap-6 bg-white p-2 rounded-2xl border border-gray-100 shadow-sm">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, código o cobrador..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-11 pr-4 py-3.5 rounded-xl border-none bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#08557f]/5 transition-all text-sm font-medium text-gray-900 placeholder:text-gray-400"
            />
          </div>
          <div className="flex gap-1 bg-gray-50 p-1 rounded-xl overflow-x-auto">
            {(['TODAS', 'ACTIVA', 'INACTIVA'] as const).map((estado) => (
              <button
                key={estado}
                onClick={() => setEstadoFiltro(estado)}
                className={cn(
                  "px-6 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                  estadoFiltro === estado
                    ? 'bg-white text-[#08557f] shadow-sm ring-1 ring-black/5'
                    : 'text-gray-500 hover:text-[#08557f] hover:bg-[#08557f]/5'
                )}
              >
                {estado === 'TODAS' ? 'Todas' : estado.charAt(0) + estado.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Grid de Rutas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {rutasFiltradas.map((ruta) => (
            <div 
              key={ruta.id} 
              className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col"
            >
              <div className="p-8 flex-1 space-y-6">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-gray-100 text-xs font-semibold text-gray-600 tracking-wide">
                      {ruta.codigo}
                    </span>
                    <h3 className="text-xl font-bold text-gray-900 mt-3 group-hover:text-[#08557f] transition-colors">
                      {ruta.nombre}
                    </h3>
                  </div>
                  <div className={cn(
                    "px-3 py-1 rounded-full text-xs font-medium border",
                    ruta.estado === 'ACTIVA' 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                      : 'bg-gray-50 text-gray-600 border-gray-100'
                  )}>
                    {ruta.estado}
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                  <div className="flex items-center gap-4 group/item">
                    <div className="p-2 bg-gray-50 rounded-lg text-gray-400 group-hover/item:bg-[#08557f]/5 group-hover/item:text-[#08557f] transition-colors">
                      <User className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Cobrador</p>
                      <p className="font-medium text-gray-900">{ruta.cobrador}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 group/item">
                    <div className="p-2 bg-gray-50 rounded-lg text-gray-400 group-hover/item:bg-[#08557f]/5 group-hover/item:text-[#08557f] transition-colors">
                      <Users className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Cartera</p>
                      <p className="font-medium text-gray-900">{ruta.clientesAsignados} clientes</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 group/item">
                    <div className="p-2 bg-gray-50 rounded-lg text-gray-400 group-hover/item:bg-[#08557f]/5 group-hover/item:text-[#08557f] transition-colors">
                      <Clock className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Frecuencia</p>
                      <p className="font-medium text-gray-900">{ruta.frecuenciaVisita}</p>
                    </div>
                  </div>
                </div>

                {/* Barra de progreso de meta diaria */}
                {ruta.estado === 'ACTIVA' && (
                  <div className="pt-6 border-t border-gray-50">
                    <div className="flex justify-between items-end mb-2">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1">Recaudo Diario</p>
                        <p className="font-bold text-gray-900">{formatCurrency(ruta.cobranzaDelDia)}</p>
                      </div>
                      <span className="text-sm font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                        {((ruta.cobranzaDelDia / ruta.metaDelDia) * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className="bg-[#08557f] h-1.5 rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${Math.min((ruta.cobranzaDelDia / ruta.metaDelDia) * 100, 100)}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-right text-gray-400 mt-2">
                      Meta: {formatCurrency(ruta.metaDelDia)}
                    </p>
                  </div>
                )}
              </div>

              <div className="p-4 bg-gray-50/50 border-t border-gray-100 flex justify-between items-center group-hover:bg-[#08557f]/5 transition-colors">
                <span className="text-xs text-gray-400 font-medium">ID: {ruta.id}</span>
                <button className="text-sm font-medium text-[#08557f] hover:text-[#064364] flex items-center gap-1 transition-colors">
                  Ver detalle
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}

          {/* Card para añadir nueva ruta */}
          <button className="group flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed border-gray-200 hover:border-[#08557f] hover:bg-[#08557f]/5 transition-all duration-300 min-h-[400px]">
            <div className="p-6 rounded-full bg-gray-50 group-hover:bg-white group-hover:shadow-md transition-all mb-6 duration-300">
              <Plus className="h-8 w-8 text-gray-400 group-hover:text-[#08557f]" />
            </div>
            <h3 className="text-xl font-medium text-gray-900 group-hover:text-[#08557f]">Crear nueva ruta</h3>
            <p className="text-sm text-gray-500 mt-3 text-center max-w-[200px] leading-relaxed">
              Define un nuevo territorio y asigna un cobrador responsable.
            </p>
          </button>
        </div>
      </div>
    </div>
  )
}

export default RutasPage
