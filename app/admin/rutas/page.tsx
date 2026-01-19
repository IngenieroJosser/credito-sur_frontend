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
  BarChart2,
  TrendingUp,
  AlertTriangle
} from 'lucide-react'

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

  // Mock Data enriquecida
  const rutas: RutaCobro[] = [
    {
      id: 'RT-001',
      nombre: 'Ruta Centro',
      codigo: 'CENTRO-01',
      estado: 'ACTIVA',
      cobrador: 'Carlos Pérez',
      supervisor: 'Ana López',
      clientesAsignados: 48,
      frecuenciaVisita: 'Diaria',
      cobranzaDelDia: 12500,
      metaDelDia: 15000
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
      cobranzaDelDia: 8200,
      metaDelDia: 10000
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
      cobranzaDelDia: 3000,
      metaDelDia: 5000
    }
  ]

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: 'VES',
      minimumFractionDigits: 0
    }).format(amount)
  }

  return (
    <div className="min-h-screen bg-gray-50/50 px-4 py-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 self-start px-3 py-1 rounded-full bg-primary/10 text-xs text-primary tracking-wide font-medium border border-primary/10">
              <Route className="h-3.5 w-3.5" />
              <span>Gestión de Territorios</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
              Rutas y Cobradores
            </h1>
            <p className="text-sm text-gray-500 max-w-xl">
              Administra la asignación geográfica de clientes y monitorea el rendimiento de cada zona.
            </p>
          </div>
          <div className="flex gap-3">
            <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-primary/20 hover:bg-primary-dark hover:shadow-primary/30 transition-all">
              <Plus className="h-4 w-4" />
              <span>Nueva Ruta</span>
            </button>
          </div>
        </header>

        {/* Tarjetas de Resumen (Stats) */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Rutas Activas</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">{rutasActivas}</h3>
              <div className="flex items-center gap-1 mt-2 text-xs text-green-600 font-medium">
                <Activity className="h-3 w-3" />
                <span>Operativas hoy</span>
              </div>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <MapPin className="h-5 w-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Clientes Asignados</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">{totalClientes}</h3>
              <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                <Users className="h-3 w-3" />
                <span>En {rutasActivas} rutas</span>
              </div>
            </div>
            <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
              <User className="h-5 w-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Avance Cobranza</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">{porcentajeAvance.toFixed(1)}%</h3>
              <div className="flex items-center gap-1 mt-2 text-xs text-orange-600 font-medium">
                <TrendingUp className="h-3 w-3" />
                <span>Meta: {formatCurrency(metaTotal)}</span>
              </div>
            </div>
            <div className="p-2 bg-orange-50 rounded-lg text-orange-600">
              <BarChart2 className="h-5 w-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Incidencias</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">3</h3>
              <div className="flex items-center gap-1 mt-2 text-xs text-red-500 font-medium">
                <AlertTriangle className="h-3 w-3" />
                <span>Requieren atención</span>
              </div>
            </div>
            <div className="p-2 bg-red-50 rounded-lg text-red-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Filtros y Búsqueda */}
        <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, código o cobrador..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
            {(['TODAS', 'ACTIVA', 'INACTIVA'] as const).map((estado) => (
              <button
                key={estado}
                onClick={() => setEstadoFiltro(estado)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  estadoFiltro === estado
                    ? 'bg-primary text-white shadow-md shadow-primary/20'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {estado === 'TODAS' ? 'Todas' : estado.charAt(0) + estado.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Grid de Rutas (Cards en lugar de lista simple para llenar espacio) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rutasFiltradas.map((ruta) => (
            <div 
              key={ruta.id} 
              className="group bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col"
            >
              <div className="p-5 flex-1">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
                      {ruta.codigo}
                    </span>
                    <h3 className="text-lg font-bold text-gray-900 mt-2 group-hover:text-primary transition-colors">
                      {ruta.nombre}
                    </h3>
                  </div>
                  <div className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                    ruta.estado === 'ACTIVA' 
                      ? 'bg-green-50 text-green-700 border-green-100' 
                      : 'bg-gray-100 text-gray-600 border-gray-200'
                  }`}>
                    {ruta.estado}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <div className="p-1.5 bg-blue-50 rounded-md text-blue-600">
                      <User className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Cobrador</p>
                      <p className="font-medium">{ruta.cobrador}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <div className="p-1.5 bg-purple-50 rounded-md text-purple-600">
                      <Users className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Clientes</p>
                      <p className="font-medium">{ruta.clientesAsignados} asignados</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <div className="p-1.5 bg-orange-50 rounded-md text-orange-600">
                      <Clock className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Frecuencia</p>
                      <p className="font-medium">{ruta.frecuenciaVisita}</p>
                    </div>
                  </div>
                </div>

                {/* Barra de progreso de meta diaria */}
                {ruta.estado === 'ACTIVA' && (
                  <div className="mt-6">
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-gray-500">Progreso diario</span>
                      <span className="font-medium text-gray-900">
                        {((ruta.cobranzaDelDia / ruta.metaDelDia) * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min((ruta.cobranzaDelDia / ruta.metaDelDia) * 100, 100)}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs mt-1.5 text-gray-400">
                      <span>{formatCurrency(ruta.cobranzaDelDia)}</span>
                      <span>Meta: {formatCurrency(ruta.metaDelDia)}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex justify-end">
                <button className="text-sm font-medium text-primary hover:text-primary-dark flex items-center gap-1 transition-colors">
                  Ver detalle
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}

          {/* Card para añadir nueva ruta (Empty State visual) */}
          <button className="group flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed border-gray-300 hover:border-primary hover:bg-blue-50/30 transition-all min-h-[300px]">
            <div className="p-4 rounded-full bg-gray-100 group-hover:bg-white group-hover:shadow-md transition-all mb-4">
              <Plus className="h-6 w-6 text-gray-400 group-hover:text-primary" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 group-hover:text-primary">Crear nueva ruta</h3>
            <p className="text-sm text-gray-500 mt-2 text-center max-w-[200px]">
              Define un nuevo territorio y asigna un cobrador
            </p>
          </button>
        </div>
      </div>
    </div>
  )
}

export default RutasPage
