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
  Eye,
  Plus,
  Search,
  TrendingUp,
  AlertTriangle,
  LayoutGrid,
  List,
  Pencil,
  X,
  Save,
  CheckCircle2,
  Trash2,
  ArrowRightLeft,
  ChevronLeft,
  ChevronRight,
  XCircle,
} from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'

// ... (Resto del código)

interface RutasPageViewProps {
  readOnly?: boolean;
  rutasBasePath?: string;
  rutas?: any[];
}

export const RutasPageView = ({ readOnly = false, rutasBasePath = '/admin/rutas', rutas = [] }: RutasPageViewProps) => {
  const router = useRouter()
  const { user: currentUser } = useAuth()
  const [busqueda, setBusqueda] = useState('')
  const [estadoFiltro, setEstadoFiltro] = useState('TODAS')
  const [vista, setVista] = useState<'grid' | 'list'>('grid')
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    nombre: '',
    codigo: '',
    zona: '',
    frecuenciaVisita: 'DIARIO',
    estado: 'ACTIVA',
    cobradorId: '',
    supervisorId: '',
    descripcion: ''
  })

  // Mocks
  const [cobradores] = useState<{ id: string, nombre: string }[]>([
    { id: '1', nombre: 'Juan Pérez' },
    { id: '2', nombre: 'María González' },
    { id: '3', nombre: 'Pedro Sánchez' },
    { id: '4', nombre: 'Ana López' },
    { id: '5', nombre: 'Luis Martínez' }
  ])
  const [supervisores] = useState<{ id: string, nombre: string }[]>([
    { id: '1', nombre: 'Carlos Ruiz' },
    { id: '2', nombre: 'Sofia Torres' }
  ])
  
  // Use mock data if rutas prop is empty for visualization
  const displayRutas = rutas.length > 0 ? rutas : [
    {
      id: '1',
      nombre: 'Ruta Centro - Comercial',
      codigo: 'RT-CEN-01',
      zona: 'Centro',
      estado: 'ACTIVA',
      cobrador: 'Juan Pérez',
      cobradorId: '1',
      supervisorId: '1',
      clientesAsignados: 45,
      clientesNuevos: 3,
      cobranzaDelDia: 1250000,
      metaDelDia: 1500000,
      descripcion: 'Zona comercial del centro'
    },
    {
      id: '2',
      nombre: 'Ruta Norte - Residencial',
      codigo: 'RT-NOR-01',
      zona: 'Norte',
      estado: 'ACTIVA',
      cobrador: 'Juan Pérez', // Same collector, testing multiple routes
      cobradorId: '1',
      supervisorId: '1',
      clientesAsignados: 32,
      clientesNuevos: 0,
      cobranzaDelDia: 850000,
      metaDelDia: 1200000,
      descripcion: 'Zona residencial norte'
    },
     {
      id: '3',
      nombre: 'Ruta Sur - Mixta',
      codigo: 'RT-SUR-01',
      zona: 'Sur',
      estado: 'PENDIENTE_ACTIVACION',
      cobrador: 'Pedro Sánchez',
      cobradorId: '3',
      supervisorId: '2',
      clientesAsignados: 18,
      clientesNuevos: 5,
      cobranzaDelDia: 0,
      metaDelDia: 800000,
       descripcion: 'Nueva zona de expansión'
    },
     {
      id: '4',
      nombre: 'Ruta Oeste - Industrial',
      codigo: 'RT-OES-01',
      zona: 'Oeste',
      estado: 'INACTIVA',
      cobrador: 'Ana López',
      cobradorId: '4',
      supervisorId: '2',
      clientesAsignados: 0,
      clientesNuevos: 0,
      cobranzaDelDia: 0,
      metaDelDia: 0,
      descripcion: 'Zona industrial, temporalmente inactiva'
    }
  ];

  const [clientesRuta, setClientesRuta] = useState<any[]>([])
  const [isAddingCliente, setIsAddingCliente] = useState(false)
  const [clienteSearch, setClienteSearch] = useState('')
  const [clientesDisponibles] = useState<any[]>([])
  const [clienteAMover, setClienteAMover] = useState<string | null>(null)
  const [rutaDestinoId, setRutaDestinoId] = useState('')

  const handleCreateClick = () => {
    setEditingId(null)
    setFormData({
      nombre: '',
      codigo: '',
      zona: '',
      frecuenciaVisita: 'DIARIO',
      estado: 'ACTIVA',
      cobradorId: '',
      supervisorId: '',
      descripcion: ''
    })
    setShowModal(true)
  }

  const handleEditClick = (ruta: any) => {
    setEditingId(ruta.id)
    setFormData({
      nombre: ruta.nombre,
      codigo: ruta.codigo,
      zona: ruta.zona || '',
      frecuenciaVisita: ruta.frecuenciaVisita || 'DIARIO',
      estado: ruta.estado || 'ACTIVA',
      cobradorId: ruta.cobradorId || '',
      supervisorId: ruta.supervisorId || '',
      descripcion: ruta.descripcion || ''
    })
    setShowModal(true)
  }

  const handleInputChange = (e: any) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e: any) => {
    e.preventDefault()
    setShowModal(false)
  }

  const handleToggleEstado = (id: string) => {
    console.log('Toggle estado', id)
    // Mock toggle logic
    // displayRutas updates would happen here with backend integration
  }
  const handleMoveCliente = (id: string) => { console.log('Mover', id) }
  const confirmAddCliente = (cliente: any) => { console.log('Add', cliente) }
  const [activeTab, setActiveTab] = useState<'info' | 'clientes'>('info')

  // PAGINACIÓN
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 9

  // ... (Rest of code)

  const rutasFiltradas = displayRutas.filter((ruta) => {
    const cumpleEstado = estadoFiltro === 'TODAS' || ruta.estado === estadoFiltro
    const cumpleBusqueda =
      ruta.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      ruta.codigo.toLowerCase().includes(busqueda.toLowerCase()) ||
      ruta.cobrador.toLowerCase().includes(busqueda.toLowerCase())

    return cumpleEstado && cumpleBusqueda
  })

  // Lógica de Paginación
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentRutas = rutasFiltradas.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(rutasFiltradas.length / itemsPerPage);

  // Reset página al filtrar
  if (currentPage > totalPages && totalPages > 0) {
    setCurrentPage(1);
  }

  const rutasActivas = displayRutas.filter((ruta) => ruta.estado === 'ACTIVA').length
  const rutasPendientes = displayRutas.filter((ruta) => ruta.estado === 'PENDIENTE_ACTIVACION').length
  const totalClientes = displayRutas.reduce((acc, curr) => acc + curr.clientesAsignados, 0)
  const metaTotal = displayRutas.reduce((acc, curr) => acc + curr.metaDelDia, 0)
  const cobranzaTotal = displayRutas.reduce((acc, curr) => acc + curr.cobranzaDelDia, 0)
  const porcentajeAvance = metaTotal > 0 ? (cobranzaTotal / metaTotal) * 100 : 0

  // Force list view for Coordinador
  if (rutasBasePath.includes('/coordinador') && vista !== 'list') {
    setVista('list')
  }

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
              <span className="text-blue-600">Rutas y </span>
              <span className="text-orange-500">Cobradores</span>
            </h1>
            <p className="text-slate-500 mt-1 font-medium text-sm max-w-2xl">
              Administra la asignación geográfica de clientes y monitorea el rendimiento de cada zona operativa.
            </p>
          </div>
          <div className="flex gap-4">
            {!readOnly && currentUser?.role !== 'COBRADOR' && (
              <button
                onClick={handleCreateClick}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-xl hover:border-slate-400 hover:bg-slate-50 transition-all duration-200 shadow-sm font-bold text-sm group"
              >
                <Plus className="w-4 h-4 text-slate-500 group-hover:text-slate-900 transition-colors" />
                <span>Nueva Ruta</span>
              </button>
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
                bgIcon: 'bg-emerald-50',
              },
              {
                label: 'Clientes Asignados',
                value: totalClientes,
                sub: `En ${rutasActivas} rutas`,
                icon: Users,
                color: 'text-slate-900',
                subColor: 'text-slate-500',
                iconColor: 'text-blue-600',
                bgIcon: 'bg-blue-50',
              },
              {
                label: 'Avance Cobranza',
                value: `${porcentajeAvance.toFixed(1)}%`,
                sub: `Meta: ${formatCurrency(metaTotal)}`,
                icon: TrendingUp,
                color: 'text-slate-900',
                subColor: 'text-slate-500',
                iconColor: 'text-indigo-600',
                bgIcon: 'bg-indigo-50',
              },
              {
                label: 'Coordinadores',
                value: '2',
                sub: 'Supervisando rutas',
                icon: User,
                color: 'text-slate-900',
                subColor: 'text-slate-500',
                iconColor: 'text-blue-600',
                bgIcon: 'bg-blue-50',
              },
            ].map((stat, i) => (
              <div
                key={i}
                className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 group"
              >
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
                  <Eye className="h-3.5 w-3.5" />
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
                className="w-full pl-11 pr-4 py-2.5 rounded-xl border-slate-200 bg-slate-50/50 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900/20 transition-all placeholder:text-slate-400"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
              {(['TODAS', 'PENDIENTE_ACTIVACION', 'ACTIVA', 'INACTIVA'] as const).map((estado) => {
                const count = estado === 'PENDIENTE_ACTIVACION' ? rutasPendientes : null
                const label = estado === 'TODAS' ? 'Todas'
                  : estado === 'PENDIENTE_ACTIVACION' ? 'Pendientes'
                    : estado.charAt(0) + estado.slice(1).toLowerCase()

                return (
                  <button
                    key={estado}
                    onClick={() => setEstadoFiltro(estado)}
                    className={cn(
                      'px-6 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2',
                      estadoFiltro === estado
                        ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200',
                    )}
                  >
                    {label}
                    {count !== null && count > 0 && (
                      <span className={cn(
                        'px-2 py-0.5 rounded-full text-xs font-bold',
                        estadoFiltro === estado
                          ? 'bg-orange-500 text-white'
                          : 'bg-orange-100 text-orange-600'
                      )}>
                        {count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {!rutasBasePath.includes('/coordinador') && (
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setVista('grid')}
                className={cn(
                  'p-2.5 rounded-lg transition-all',
                  vista === 'grid' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600',
                )}
              >
                <LayoutGrid className="h-5 w-5" />
              </button>
              <button
                onClick={() => setVista('list')}
                className={cn(
                  'p-2.5 rounded-lg transition-all',
                  vista === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600',
                )}
              >
                <List className="h-5 w-5" />
              </button>
            </div>
            )}
          </div>

          {/* Contenido Principal */}
          {vista === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {currentRutas.map((ruta) => (
                <div
                  key={ruta.id}
                  className="group bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col"
                >
                  <div className="p-8 flex-1 space-y-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-100 text-xs font-bold text-slate-600 tracking-wide border border-slate-200">
                            {ruta.codigo}
                          </span>
                          {ruta.clientesNuevos > 0 && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-blue-50 text-xs font-bold text-blue-700 tracking-wide border border-blue-200">
                              +{ruta.clientesNuevos} nuevos
                            </span>
                          )}
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mt-3 group-hover:text-blue-700 transition-colors">
                          {ruta.nombre}
                        </h3>
                      </div>
                      <div
                        className={cn(
                          'px-3 py-1 rounded-full text-xs font-bold border',
                          ruta.estado === 'ACTIVA'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : ruta.estado === 'PENDIENTE_ACTIVACION'
                              ? 'bg-orange-50 text-orange-700 border-orange-200'
                              : ruta.estado === 'COMPLETADA'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-slate-50 text-slate-600 border-slate-200',
                        )}
                      >
                        {ruta.estado === 'PENDIENTE_ACTIVACION' ? 'PENDIENTE' : ruta.estado}
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
                            style={{
                              width: `${ruta.metaDelDia > 0 ? Math.min((ruta.cobranzaDelDia / ruta.metaDelDia) * 100, 100) : 0}%`,
                            }}
                          ></div>
                        </div>
                        <p className="text-xs text-right text-slate-400 mt-2 font-medium">Meta: {formatCurrency(ruta.metaDelDia)}</p>
                      </div>
                    )}
                  </div>

                  <div className="p-4 bg-slate-50/50 border-t border-slate-100 group-hover:bg-blue-50/30 transition-colors">
                    <div className="flex justify-between items-center gap-3">
                      <span className="text-xs text-slate-400 font-bold">ID: {ruta.id}</span>

                      <div className="flex items-center gap-2">
                        {/* Botones de acción (siempre visibles) */}
                        <div className="flex items-center gap-1">
                          {!readOnly && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleEditClick(ruta)
                              }}
                              className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                              title="Editar"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          )}
                          {!readOnly && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    handleToggleEstado(ruta.id)
                                }}
                                className={cn(
                                    "p-2 rounded-lg transition-all",
                                    ruta.estado === 'ACTIVA' 
                                        ? "text-slate-400 hover:text-rose-600 hover:bg-rose-50" 
                                        : "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                                )}
                                title={ruta.estado === 'ACTIVA' ? "Desactivar" : "Activar"}
                            >
                                {ruta.estado === 'ACTIVA' ? <Trash2 className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                            </button>
                          )}
                          <Link
                            href={`${rutasBasePath}/${ruta.id}`}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            title="Ver detalle"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Card para añadir nueva ruta */}
              {!readOnly && (
                <button
                  onClick={handleCreateClick}
                  className="group flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed border-slate-300 hover:border-slate-900 hover:bg-slate-50 transition-all duration-300 min-h-[400px]"
                >
                  <div className="p-6 rounded-full bg-slate-100 group-hover:bg-white group-hover:shadow-md transition-all mb-6 duration-300 border border-slate-200">
                    <Plus className="h-8 w-8 text-slate-400 group-hover:text-slate-900" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">Crear nueva ruta</h3>
                  <p className="text-sm text-slate-500 mt-3 text-center max-w-[200px] leading-relaxed font-medium">
                    Define un nuevo territorio y asigna un cobrador responsable.
                  </p>
                </button>
              )}
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
                    {currentRutas.map((ruta) => (
                      <tr
                        key={ruta.id}
                        onClick={() => router.push(`${rutasBasePath}/${ruta.id}`)}
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
                          <span
                            className={cn(
                              'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border',
                              ruta.estado === 'ACTIVA'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                : 'bg-slate-50 text-slate-600 border-slate-100',
                            )}
                          >
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
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                router.push(`${rutasBasePath}/${ruta.id}`)
                              }}
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Ver detalle"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {!readOnly && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleEditClick(ruta)
                                }}
                                className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                title="Editar"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                            )}
                            {!readOnly && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleToggleEstado(ruta.id)
                                }}
                                className={cn(
                                    "p-2 rounded-lg transition-all",
                                    ruta.estado === 'ACTIVA' 
                                        ? "text-slate-400 hover:text-rose-600 hover:bg-rose-50" 
                                        : "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                                )}
                                title={ruta.estado === 'ACTIVA' ? "Desactivar" : "Activar"}
                              >
                                {ruta.estado === 'ACTIVA' ? <Trash2 className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Paginación Elegante Estandarizada */}
          <div className="p-4 border-t border-slate-100 bg-slate-50/30 flex justify-between items-center text-xs text-slate-500 font-medium rounded-2xl">
            <span>
              Mostrando {currentRutas.length} de {rutasFiltradas.length} resultados
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed font-bold flex items-center gap-1 transition-colors text-slate-700"
              >
                <ChevronLeft className="h-3 w-3" /> Anterior
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed font-bold flex items-center gap-1 transition-colors text-slate-700"
              >
                Siguiente <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Nueva Ruta */}
      {!readOnly && showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm transition-opacity" onClick={() => setShowModal(false)} />

          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl ring-1 ring-slate-900/5 transform transition-all animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex flex-col h-full max-h-[90vh]">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50 sticky top-0 z-10 backdrop-blur-sm shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 text-orange-500 rounded-lg">
                    <Route className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">
                      <span className="text-blue-600">{editingId ? 'Editar' : 'Nueva'}</span> <span className="text-orange-500">Ruta</span>
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      {editingId ? 'Modifique los datos de la ruta existente' : 'Configure una nueva zona de cobranza'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Tabs */}
              {editingId && (
                <div className="flex px-6 border-b border-slate-100 bg-white shrink-0">
                  <button
                    onClick={() => setActiveTab('info')}
                    className={cn(
                      'px-4 py-3 text-sm font-bold border-b-2 transition-colors',
                      activeTab === 'info'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                    )}
                  >
                    Información General
                  </button>
                  <button
                    onClick={() => setActiveTab('clientes')}
                    className={cn(
                      'px-4 py-3 text-sm font-bold border-b-2 transition-colors',
                      activeTab === 'clientes'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                    )}
                  >
                    Clientes Asignados
                  </button>
                </div>
              )}

              <div className="flex-1 overflow-y-auto p-6">
                {activeTab === 'info' ? (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs uppercase tracking-wider font-bold text-slate-500">Nombre de la Ruta</label>
                        <input
                          type="text"
                          name="nombre"
                          value={formData.nombre}
                          onChange={handleInputChange}
                          placeholder="Ej: Ruta Centro - Comercial"
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 outline-none transition-all font-bold text-slate-900 placeholder:text-slate-400"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs uppercase tracking-wider font-bold text-slate-500">Código Identificador</label>
                        <input
                          type="text"
                          name="codigo"
                          value={formData.codigo}
                          onChange={handleInputChange}
                          placeholder="Ej: RT-CEN-01"
                          className="w-full px-4 py-2.5 rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all font-medium text-slate-900 placeholder:text-slate-400"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs uppercase tracking-wider font-bold text-slate-500">Zona</label>
                        <div className="relative">
                          <input
                            type="text"
                            name="zona"
                            value={formData.zona}
                            onChange={handleInputChange}
                            placeholder="Ej: Sector Norte"
                            className="w-full px-4 py-2.5 rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all font-medium text-slate-900 placeholder:text-slate-400"
                            required
                          />
                          <MapPin className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs uppercase tracking-wider font-bold text-slate-500">Cobrador Asignado</label>
                        <div className="relative">
                          <select
                            name="cobradorId"
                            value={formData.cobradorId}
                            onChange={handleInputChange}
                            className="w-full px-4 py-2.5 rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all font-medium text-slate-900 appearance-none"
                            required
                          >
                            <option value="">Seleccione un cobrador</option>
                            {cobradores.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.nombre}
                              </option>
                            ))}
                          </select>
                          <User className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs uppercase tracking-wider font-bold text-slate-500">Supervisor</label>
                        <div className="relative">
                          <select
                            name="supervisorId"
                            value={formData.supervisorId}
                            onChange={handleInputChange}
                            className="w-full px-4 py-2.5 rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all font-medium text-slate-900 appearance-none"
                            required
                          >
                            <option value="">Seleccione un supervisor</option>
                            {supervisores.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.nombre}
                              </option>
                            ))}
                          </select>
                          <CheckCircle2 className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs uppercase tracking-wider font-bold text-slate-500">Estado de la Ruta</label>
                        <div className="flex bg-slate-100 p-1 rounded-xl">
                          <button
                            type="button" 
                            onClick={() => setFormData(prev => ({ ...prev, estado: 'ACTIVA' }))}
                            className={cn(
                              "flex-1 py-2.5 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2",
                              formData.estado === 'ACTIVA' 
                                ? "bg-white text-emerald-700 shadow-sm ring-1 ring-black/5" 
                                : "text-slate-400 hover:text-slate-600"
                            )}
                          >
                            <CheckCircle2 className={cn("h-4 w-4", formData.estado === 'ACTIVA' ? "text-emerald-500" : "text-slate-400")} />
                            Activa
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, estado: 'INACTIVA' }))}
                            className={cn(
                              "flex-1 py-2.5 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2",
                              formData.estado === 'INACTIVA'
                                ? "bg-white text-slate-700 shadow-sm ring-1 ring-black/5"
                                : "text-slate-400 hover:text-slate-600"
                            )}
                          >
                            <XCircle className="h-4 w-4" />
                            Inactiva
                          </button>
                        </div>
                      </div>

                      <div className="col-span-full space-y-2">
                        <label className="text-xs uppercase tracking-wider font-bold text-slate-500">Descripción</label>
                        <textarea
                          name="descripcion"
                          value={formData.descripcion}
                          onChange={handleInputChange}
                          rows={3}
                          className="w-full px-4 py-3 rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all font-medium text-slate-900 resize-none"
                          placeholder="Detalles de la ruta..."
                        />
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setShowModal(false)}
                        className="flex-1 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Save className="h-4 w-4" />
                        <span>{loading ? 'Guardando...' : 'Guardar'}</span>
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center bg-blue-50 p-4 rounded-xl border border-blue-100 mb-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-full text-blue-600 shadow-sm">
                          <Users className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">Total Clientes</p>
                          <p className="text-2xl font-bold text-slate-900">{clientesRuta.length}</p>
                        </div>
                      </div>
                      {!isAddingCliente ? (
                        <button
                          onClick={() => setIsAddingCliente(true)}
                          type="button"
                          className="px-4 py-2 bg-white text-blue-600 font-bold text-sm rounded-lg shadow-sm border border-blue-100 hover:bg-blue-50 transition-colors flex items-center gap-2"
                        >
                          <Plus className="h-4 w-4" />
                          Agregar Cliente
                        </button>
                      ) : (
                        <div className="relative w-72">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                              autoFocus
                              type="text"
                              placeholder="Buscar por nombre..."
                              className="w-full pl-9 pr-9 py-2.5 text-sm border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm text-slate-900"
                              value={clienteSearch}
                              onChange={e => setClienteSearch(e.target.value)}
                            />
                            <button
                              onClick={() => {
                                setIsAddingCliente(false)
                                setClienteSearch('')
                              }}
                              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>

                          {/* Dropdown Results */}
                          {clienteSearch.length > 0 && (
                            <div className="absolute top-full mt-2 left-0 w-full bg-white rounded-xl shadow-xl border border-slate-100 max-h-60 overflow-y-auto z-50 animate-in fade-in slide-in-from-top-2">
                              {clientesDisponibles.filter(c =>
                                !clientesRuta.some(existing => existing.id === c.id) &&
                                c.nombre.toLowerCase().includes(clienteSearch.toLowerCase())
                              ).length > 0 ? (
                                clientesDisponibles
                                  .filter(c =>
                                    !clientesRuta.some(existing => existing.id === c.id) &&
                                    c.nombre.toLowerCase().includes(clienteSearch.toLowerCase())
                                  )
                                  .map(cliente => (
                                    <button
                                      key={cliente.id}
                                      onClick={() => confirmAddCliente(cliente)}
                                      className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-slate-50 last:border-0 group"
                                    >
                                      <p className="font-bold text-sm text-slate-900 group-hover:text-blue-700">{cliente.nombre}</p>
                                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                                        <MapPin className="h-3 w-3" />
                                        <span>{cliente.direccion}</span>
                                      </div>
                                    </button>
                                  ))
                              ) : (
                                <div className="p-4 text-center">
                                  <p className="text-xs text-slate-500 font-medium">No se encontraron clientes</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      {clientesRuta.map((cliente) => (
                        <div key={cliente.id} className="p-4 bg-white border border-slate-200 rounded-xl hover:shadow-md transition-shadow group">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="h-10 w-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-bold border border-slate-200">
                                {cliente.nombre.charAt(0)}
                              </div>
                              <div>
                                <h4 className="font-bold text-slate-900">{cliente.nombre}</h4>
                                <p className="text-xs text-slate-500 truncate max-w-[200px]">{cliente.direccion}</p>
                              </div>
                            </div>

                            <div className="text-right">
                              <p className="text-xs text-slate-400 font-bold uppercase">Deuda</p>
                              <p className="font-bold text-slate-900">{formatCurrency(cliente.deuda)}</p>
                            </div>
                          </div>

                          {/* Acciones de movimiento */}
                          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-3">
                            <div className="flex-1 relative">
                              <select
                                className="w-full text-sm pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                value={clienteAMover === cliente.id ? rutaDestinoId : ''}
                                onChange={(e) => {
                                  setClienteAMover(cliente.id)
                                  setRutaDestinoId(e.target.value)
                                }}
                              >
                                <option value="">Mover a otra ruta...</option>
                                {rutas
                                  .filter(r => r.id !== editingId)
                                  .map(r => (
                                    <option key={r.id} value={r.id}>{r.nombre}</option>
                                  ))
                                }
                              </select>
                              <ArrowRightLeft className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                            </div>

                            <button
                              disabled={loading || clienteAMover !== cliente.id || !rutaDestinoId}
                              onClick={() => handleMoveCliente(cliente.id)}
                              className="px-4 py-2 bg-slate-900 text-white text-sm font-bold rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                            >
                              {loading && clienteAMover === cliente.id ? 'Moviendo...' : 'Mover'}
                            </button>
                          </div>
                        </div>
                      ))}

                      {clientesRuta.length === 0 && (
                        <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
                          <Users className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                          <p className="text-slate-500 font-medium">No hay clientes asignados a esta ruta.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
