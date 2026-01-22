'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
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
  AlertTriangle,
  LayoutGrid,
  List
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
  const router = useRouter()
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoRuta | 'TODAS'>('TODAS')
  const [busqueda, setBusqueda] = useState('')
  const [vista, setVista] = useState<'grid' | 'list'>('grid')
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

  // Simulamos el usuario actual (esto vendría del contexto de autenticación)
  const currentUser = {
    role: 'ADMIN', // Cambiar a 'COBRADOR' para probar la vista restringida
    nombre: 'Carlos Pérez'
  };

  const rutasFiltradas = rutas.filter((ruta) => {
    // Filtro por rol: Cobrador solo ve sus rutas
    if (currentUser.role === 'COBRADOR' && ruta.cobrador !== currentUser.nombre) {
      return false;
    }

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
    <div className="min-h-screen bg-slate-50 relative">
      {/* Fondo Arquitectónico */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-primary opacity-20 blur-[100px]"></div>
      </div>

      <div className="relative z-10 px-6 md:px-8 py-8 space-y-8">
        {/* Header Standard */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between animate-in fade-in slide-in-from-top-4 duration-500">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-xs text-slate-600 tracking-wide font-bold border border-slate-200 mb-2">
              <Route className="h-3.5 w-3.5" />
              <span>Gestión de Territorios</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              <span className="text-blue-600">Rutas y </span><span className="text-orange-500">Cobradores</span>
            </h1>
            <p className="text-slate-500 mt-1 font-medium text-sm max-w-2xl">
              Administra la asignación geográfica de clientes y monitorea el rendimiento de cada zona operativa.
            </p>
          </div>
          <div className="flex gap-4">
            {currentUser.role !== 'COBRADOR' && (
              <Link 
                href="/admin/rutas/nueva"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/20 hover:bg-primary-dark hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
              >
                <Plus className="h-4 w-4" />
                <span>Nueva Ruta</span>
              </Link>
            )}
          </div>
        </div>

        <div className="space-y-8">
          {/* Tarjetas de Resumen (Stats) */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { 
                label: 'Rutas Activas', 
                value: rutasActivas, 
                sub: 'Operativas hoy', 
                icon: MapPin, 
                color: 'text-slate-900', 
                subColor: 'text-emerald-600',
                iconColor: 'text-emerald-600',
                bgIcon: 'bg-emerald-50'
              },
              { 
                label: 'Clientes Asignados', 
                value: totalClientes, 
                sub: `En ${rutasActivas} rutas`, 
                icon: Users, 
                color: 'text-slate-900', 
                subColor: 'text-slate-500',
                iconColor: 'text-blue-600',
                bgIcon: 'bg-blue-50'
              },
              { 
                label: 'Avance Cobranza', 
                value: `${porcentajeAvance.toFixed(1)}%`, 
                sub: `Meta: ${formatCurrency(metaTotal)}`, 
                icon: TrendingUp, 
                color: 'text-slate-900', 
                subColor: 'text-slate-500',
                iconColor: 'text-indigo-600',
                bgIcon: 'bg-indigo-50'
              },
              { 
                label: 'Incidencias', 
                value: '3', 
                sub: 'Requieren atención', 
                icon: AlertTriangle, 
                color: 'text-slate-900', 
                subColor: 'text-amber-600',
                iconColor: 'text-amber-600',
                bgIcon: 'bg-amber-50'
              }
            ].map((stat, i) => (
              <div key={i} className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 group">
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-3 rounded-xl transition-colors ${stat.bgIcon}`}>
                    <stat.icon className={`h-6 w-6 ${stat.iconColor}`} />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{stat.label}</p>
                  <h3 className={`text-3xl font-bold ${stat.color} tracking-tight`}>{stat.value}</h3>
                </div>
                <div className={`mt-4 text-xs font-medium ${stat.subColor} flex items-center gap-1.5`}>
                  <Activity className="h-3.5 w-3.5" />
                  {stat.sub}
                </div>
              </div>
            ))}
          </div>

          {/* Filtros y Búsqueda */}
          <div className="flex flex-col md:flex-row gap-6 bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por nombre, código o cobrador..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900 transition-all text-sm font-medium text-slate-900 placeholder:text-slate-400"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
              {(['TODAS', 'ACTIVA', 'INACTIVA'] as const).map((estado) => (
                <button
                  key={estado}
                  onClick={() => setEstadoFiltro(estado)}
                  className={cn(
                    "px-6 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap",
                    estadoFiltro === estado
                      ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                  )}
                >
                  {estado === 'TODAS' ? 'Todas' : estado.charAt(0) + estado.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
            
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setVista('grid')}
                className={cn(
                  "p-2.5 rounded-lg transition-all",
                  vista === 'grid'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-400 hover:text-slate-600'
                )}
              >
                <LayoutGrid className="h-5 w-5" />
              </button>
              <button
                onClick={() => setVista('list')}
                className={cn(
                  "p-2.5 rounded-lg transition-all",
                  vista === 'list'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-400 hover:text-slate-600'
                )}
              >
                <List className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Contenido Principal */}
          {vista === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {rutasFiltradas.map((ruta) => (
                <div 
                  key={ruta.id} 
                  className="group bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col"
                >
                  <div className="p-8 flex-1 space-y-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-100 text-xs font-bold text-slate-600 tracking-wide border border-slate-200">
                          {ruta.codigo}
                        </span>
                        <h3 className="text-xl font-bold text-slate-900 mt-3 group-hover:text-blue-700 transition-colors">
                          {ruta.nombre}
                        </h3>
                      </div>
                      <div className={cn(
                        "px-3 py-1 rounded-full text-xs font-bold border",
                        ruta.estado === 'ACTIVA' 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                          : 'bg-slate-50 text-slate-600 border-slate-100'
                      )}>
                        {ruta.estado}
                      </div>
                    </div>

                    <div className="space-y-4 pt-2">
                      <div className="flex items-center gap-4 group/item">
                        <div className="p-2 bg-slate-50 rounded-lg text-slate-400 group-hover/item:bg-blue-50 group-hover/item:text-blue-600 transition-colors">
                          <User className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Cobrador</p>
                          <p className="font-bold text-slate-900">{ruta.cobrador}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 group/item">
                        <div className="p-2 bg-slate-50 rounded-lg text-slate-400 group-hover/item:bg-blue-50 group-hover/item:text-blue-600 transition-colors">
                          <Users className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Cartera</p>
                          <p className="font-bold text-slate-900">{ruta.clientesAsignados} clientes</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 group/item">
                        <div className="p-2 bg-slate-50 rounded-lg text-slate-400 group-hover/item:bg-blue-50 group-hover/item:text-blue-600 transition-colors">
                          <Clock className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Frecuencia</p>
                          <p className="font-bold text-slate-900">{ruta.frecuenciaVisita}</p>
                        </div>
                      </div>
                    </div>

                    {/* Barra de progreso de meta diaria */}
                    {ruta.estado === 'ACTIVA' && (
                      <div className="pt-6 border-t border-slate-100">
                        <div className="flex justify-between items-end mb-2">
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">Recaudo Diario</p>
                            <p className="font-bold text-slate-900">{formatCurrency(ruta.cobranzaDelDia)}</p>
                          </div>
                          <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                            {ruta.metaDelDia > 0 ? ((ruta.cobranzaDelDia / ruta.metaDelDia) * 100).toFixed(0) : 0}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                          <div 
                            className="bg-slate-900 h-2 rounded-full transition-all duration-1000 ease-out"
                            style={{ width: `${ruta.metaDelDia > 0 ? Math.min((ruta.cobranzaDelDia / ruta.metaDelDia) * 100, 100) : 0}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-right text-slate-400 mt-2 font-medium">
                          Meta: {formatCurrency(ruta.metaDelDia)}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex justify-between items-center group-hover:bg-blue-50/30 transition-colors">
                    <span className="text-xs text-slate-400 font-bold">ID: {ruta.id}</span>
                    <Link 
                      href={`/admin/rutas/${ruta.id}`}
                      className="text-sm font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
                    >
                      Ver detalle
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              ))}

              {/* Card para añadir nueva ruta */}
              <button className="group flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed border-slate-300 hover:border-slate-900 hover:bg-slate-50 transition-all duration-300 min-h-[400px]">
                <div className="p-6 rounded-full bg-slate-100 group-hover:bg-white group-hover:shadow-md transition-all mb-6 duration-300 border border-slate-200">
                  <Plus className="h-8 w-8 text-slate-400 group-hover:text-slate-900" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Crear nueva ruta</h3>
                <p className="text-sm text-slate-500 mt-3 text-center max-w-[200px] leading-relaxed font-medium">
                  Define un nuevo territorio y asigna un cobrador responsable.
                </p>
              </button>
            </div>
          ) : (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 font-bold tracking-wider">Ruta / Código</th>
                      <th className="px-6 py-4 font-bold tracking-wider">Estado</th>
                      <th className="px-6 py-4 font-bold tracking-wider">Cobrador</th>
                      <th className="px-6 py-4 font-bold tracking-wider">Clientes</th>
                      <th className="px-6 py-4 font-bold tracking-wider">Avance Diario</th>
                      <th className="px-6 py-4 font-bold tracking-wider text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rutasFiltradas.map((ruta) => (
                      <tr 
                        key={ruta.id} 
                        onClick={() => router.push(`/admin/rutas/${ruta.id}`)}
                        className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 text-primary flex items-center justify-center border border-blue-100">
                              <Route className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="font-bold text-primary">{ruta.nombre}</div>
                              <div className="text-xs text-slate-500 font-medium">{ruta.codigo}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border",
                            ruta.estado === 'ACTIVA' 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                              : 'bg-slate-50 text-slate-600 border-slate-100'
                          )}>
                            {ruta.estado}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 border border-slate-200">
                              {ruta.cobrador.charAt(0)}
                            </div>
                            <span className="text-slate-700 font-medium">{ruta.cobrador}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                            <Users className="w-4 h-4 text-slate-400" />
                            <span>{ruta.clientesAsignados}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {ruta.estado === 'ACTIVA' ? (
                            <div className="w-32 space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className="font-bold text-primary">{((ruta.cobranzaDelDia / ruta.metaDelDia) * 100).toFixed(0)}%</span>
                                <span className="text-slate-500 font-medium">{formatCurrency(ruta.cobranzaDelDia)}</span>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden border border-slate-200">
                                <div 
                                  className="bg-slate-900 h-1.5 rounded-full"
                                  style={{ width: `${Math.min((ruta.cobranzaDelDia / ruta.metaDelDia) * 100, 100)}%` }}
                                ></div>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 font-medium">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors">
                            <ChevronRight className="w-4 h-4" />
                          </button>
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
    </div>
  )
}

export default RutasPage
