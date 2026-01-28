'use client'

import { useState, useEffect, useMemo, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
  Navigation,
  CheckCircle2,
  XCircle,
  MapPin,
  MoreVertical,
  Banknote,
  AlertTriangle,
  ArrowLeft,
  Receipt,
  Plus,
  Pencil,
  Save,
  Search,
  Filter,
  History as HistoryIcon,
  GripVertical,
  Wallet,
  ChevronRight,
  UserPlus,

  DollarSign,
  MessageSquare,
  Eye,
  ClipboardList,
  Users,
  CreditCard,
  FileText,
  X,
  Smartphone,
  RefreshCw,
  Calculator,
  User,
  Home,
  BarChart3,
  Settings,
  Camera,
  Calendar,
  History,
  ShoppingBag,
  FileText as FileTextIcon
} from 'lucide-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { formatCOPInputValue, formatCurrency, cn } from '@/lib/utils'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { RolUsuario } from '@/lib/types/autenticacion-type'
import { obtenerPerfil } from '@/services/autenticacion-service'
import {  formatMilesCOP, parseCOPInputToNumber } from '@/lib/utils'
import { ExportButton } from '@/components/ui/ExportButton'


// Interfaces de datos
interface ClienteRuta {
  id: string
  nombre: string
  direccion: string
  telefono: string
  cuota: number
  saldoPendiente: number
  diasMora: number
  estadoVisita: 'PENDIENTE' | 'VISITADO_PAGO' | 'VISITADO_NO_PAGO'
  horaVisita?: string
}

interface GastoRuta {
  id: string
  tipo: 'OPERATIVO' | 'TRANSPORTE' | 'OTRO'
  descripcion: string
  valor: number
  hora: string
}

type EstadoVisita = 'pendiente' | 'pagado' | 'en_mora' | 'ausente' | 'reprogramado'
type PeriodoRuta = 'DIA' | 'SEMANA' | 'MES'

interface VisitaRuta {
  id: string
  cliente: string
  direccion: string
  telefono: string
  horaSugerida: string
  montoCuota: number
  saldoTotal: number
  estado: EstadoVisita
  proximaVisita: string
  ordenVisita: number
  prioridad: 'alta' | 'media' | 'baja'
  cobradorId: string
  periodoRuta: PeriodoRuta
}

const DetalleRutaPage = () => {
  const params = useParams()
  // Manejo seguro del ID de la ruta
  const rutaId = params?.id ? decodeURIComponent(params.id as string) : 'Desconocida'

  // Datos de prueba (Mock Data)
  const [clientes] = useState<ClienteRuta[]>([
   
  ])

  const [gastos] = useState<GastoRuta[]>([
    {
      id: '1',
      tipo: 'TRANSPORTE',
      descripcion: 'Gasolina',
      valor: 15000,
      hora: '08:00 AM'
    },
    {
      id: '2',
      tipo: 'OPERATIVO',
      descripcion: 'Almuerzo',
      valor: 12000,
      hora: '12:30 PM'
    }
  ])
  

  const progreso = {
    total: clientes.length,
    visitados: clientes.filter(c => c.estadoVisita !== 'PENDIENTE').length,
    recaudado: 150000
  }

  const totalGastos = gastos.reduce((acc, g) => acc + g.valor, 0)

  const porcentajeProgreso = (progreso.visitados / progreso.total) * 100

  const [isGastoModalOpen, setIsGastoModalOpen] = useState(false)
  const [nuevoGasto, setNuevoGasto] = useState({ tipo: 'OPERATIVO', descripcion: '', valor: '' })
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [rutaCompletada, setRutaCompletada] = useState(false)
  const [showCompletarRutaModal, setShowCompletarRutaModal] = useState(false)
  const [periodoRutaFiltro, setPeriodoRutaFiltro] = useState<'TODOS' | 'DIA' | 'SEMANA' | 'MES'>('TODOS')
  const [visitasCobrador, setVisitasCobrador] = useState<VisitaRuta[]>([])
  const [activeVisita, setActiveVisita] = useState<VisitaRuta | null>(null)
  const [visitaSeleccionada, setVisitaSeleccionada] = useState<string | null>(null)
  const [visitaReprogramar, setVisitaReprogramar] = useState<VisitaRuta | null>(null)
  const [showReprogramModal, setShowReprogramModal] = useState(false)

  // Sensors para drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Handlers para drag & drop
  const handleDragStart = useCallback((event: DragStartEvent) => {
    if (rutaCompletada) return
    const visita = visitasCobrador.find(v => v.id === event.active.id)
    setActiveVisita(visita || null)
  }, [rutaCompletada, visitasCobrador])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    setActiveVisita(null)

    if (over && active.id !== over.id) {
      setVisitasCobrador((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id)
        const newIndex = items.findIndex(item => item.id === over.id)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }, [])

  const handleDragCancel = useCallback(() => {
    setActiveVisita(null)
  }, [])

  // Funciones auxiliares
  const getEstadoClasses = useCallback((estado: EstadoVisita) => {
    switch (estado) {
      case 'pagado':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100'
      case 'en_mora':
        return 'bg-rose-50 text-rose-700 border-rose-100'
      case 'ausente':
        return 'bg-amber-50 text-amber-700 border-amber-100'
      case 'reprogramado':
        return 'bg-blue-50 text-blue-700 border-blue-100'
      default:
        return 'bg-slate-50 text-slate-700 border-slate-100'
    }
  }, [])

  const getPrioridadColor = useCallback((prioridad: 'alta' | 'media' | 'baja') => {
    switch (prioridad) {
      case 'alta':
        return '#ef4444'
      case 'media':
        return '#f59e0b'
      default:
        return '#10b981'
    }
  }, [])

  // Handlers placeholder
  const handleAbrirClienteInfo = useCallback((visita: VisitaRuta) => {
    console.log('Abrir info cliente:', visita)
  }, [])

  const handleAbrirPago = useCallback((visita: VisitaRuta) => {
    console.log('Abrir pago:', visita)
  }, [])

  const handleAbrirAbono = useCallback((visita: VisitaRuta) => {
    console.log('Abrir abono:', visita)
  }, [])

  const handleAbrirEstadoCuenta = useCallback((visita: VisitaRuta) => {
    console.log('Abrir estado cuenta:', visita)
  }, [])

  const handleGuardarGasto = (e: React.FormEvent) => {
    e.preventDefault()
    // La hora se toma automáticamente del sistema
    const horaActual = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
    console.log('Guardando gasto:', { ...nuevoGasto, hora: horaActual })
    setIsGastoModalOpen(false)
    setNuevoGasto({ tipo: 'OPERATIVO', descripcion: '', valor: '' })
  }

  const EstadoCuentaModal = ({
    visita,
    onClose,
  }: {
    visita: VisitaRuta
    onClose: () => void
  }) => {
    
      return (
        <Portal>
          <div
            className="fixed inset-0 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
            style={{ zIndex: MODAL_Z_INDEX }}
            onClick={onClose}
          >
            <div
              className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Estado de Cuenta</h3>
                    <p className="text-sm text-slate-500 font-medium">{visita.cliente}</p>
                  </div>
    
                  <button
                    onClick={onClose}
                    className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
    
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="bg-slate-50 rounded-2xl border border-slate-100 p-4">
                    <div className="text-xs font-bold text-slate-500 uppercase">Saldo total</div>
                    <div className="mt-1 text-lg font-bold text-slate-900">${visita.saldoTotal.toLocaleString('es-CO')}</div>
                  </div>
                  <div className="bg-slate-50 rounded-2xl border border-slate-100 p-4">
                    <div className="text-xs font-bold text-slate-500 uppercase">Cuota esperada</div>
                    <div className="mt-1 text-lg font-bold text-slate-900">${visita.montoCuota.toLocaleString('es-CO')}</div>
                  </div>
                  <div className="bg-slate-50 rounded-2xl border border-slate-100 p-4">
                    <div className="text-xs font-bold text-slate-500 uppercase">Próxima visita</div>
                    <div className="mt-1 text-lg font-bold text-slate-900">{visita.proximaVisita}</div>
                  </div>
                </div>
    
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold text-slate-900">Últimos movimientos</h4>
                    <span className="text-xs font-bold text-slate-400">Mock</span>
                  </div>
    
                  <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 overflow-hidden">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="p-4 bg-white">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-bold text-slate-900">Pago #{i}</div>
                            <div className="text-xs text-slate-500">Método: EFECTIVO</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold text-slate-900">${formatMilesCOP(visita.montoCuota)}</div>
                            <div className="text-xs font-bold text-[#08557f]">CONFIRMADO</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
    
                <div className="mt-6">
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full rounded-xl bg-[#08557f] px-3 py-3 text-sm font-bold text-white hover:bg-[#063a58]"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Portal>
      )
    }

    

const MODAL_Z_INDEX = 2147483647

function Portal({ children }: { children: ReactNode }) {
  if (typeof document === 'undefined') return null
  return createPortal(children, document.body)
}


  return (
    
    <div className="min-h-screen bg-slate-50 relative pb-20">
      {/* Fondo arquitectónico */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-cyan-500 opacity-20 blur-[100px]"></div>
      </div>

      <div className="relative z-10 w-full p-6 md:p-8 space-y-6">
        {/* Header */}
        <header className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
               <Link href="/admin/rutas" className="p-2 bg-white rounded-full shadow-sm hover:bg-slate-100 transition-colors">
                  <ArrowLeft className="h-5 w-5 text-slate-600" />
               </Link>
               <div>
                 <h1 className="text-3xl font-bold tracking-tight">
                   <span className="text-blue-600">Ruta </span><span className="text-orange-500">Diaria</span>
                 </h1>
                 <p className="text-slate-500 font-medium text-sm">
                   {new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })} • ID: {rutaId}
                 </p>
              </div>
            </div>
            <Link 
              href={`/admin/rutas/${rutaId}/editar`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 font-bold text-sm rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
            >
              <Pencil className="h-4 w-4" />
              <span>Editar</span>
            </Link>
          </div>

          {/* Tarjetas de Resumen */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Tarjeta de Progreso y Recaudo */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-end mb-4">
                <div>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Recaudado Hoy</p>
                  <div className="text-3xl font-bold text-slate-900">{formatCurrency(progreso.recaudado)}</div>
                </div>
                <div className="text-right">
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Progreso</p>
                  <div className="text-xl font-bold text-slate-900">{progreso.visitados}/{progreso.total}</div>
                </div>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-600 rounded-full transition-all duration-500"
                  style={{ width: `${porcentajeProgreso}%` }}
                />
              </div>
            </div>

            {/* Tarjeta de Gastos */}
            
          </div>
        </header>

        {/* Buscador y filtros */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar cliente, dirección..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#08557f]/20 focus:border-[#08557f] shadow-sm text-slate-900 placeholder:text-slate-400"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowFilters((v) => !v)}
                    className={`px-4 py-2 border rounded-xl flex items-center gap-2 font-medium shadow-sm transition-colors ${
                      showFilters
                        ? 'bg-[#08557f] text-white border-[#08557f]'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Filter className="h-4 w-4" />
                    <span>Filtros</span>
                  </button>
                 
                  <button 
                    onClick={() => setShowHistory(!showHistory)}
                    className={`px-4 py-2 border rounded-xl flex items-center gap-2 font-medium shadow-sm transition-colors ${
                      showHistory 
                        ? 'bg-[#08557f] text-white border-[#08557f]' 
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <HistoryIcon className="h-4 w-4" />
                    <span className="hidden md:inline">{showHistory ? 'Ver Ruta' : 'Historial'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowCompletarRutaModal(true)}
                    disabled={rutaCompletada}
                    className={`px-4 py-2 border rounded-xl flex items-center gap-2 font-bold shadow-sm transition-colors ${
                      rutaCompletada
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 opacity-70'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="hidden md:inline">Activar Ruta</span>
                  </button>
                </div>
              </div>

              {showFilters && !showHistory && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Período de ruta</div>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {(
                        [
                          { key: 'TODOS' as const, label: 'Día / Semana / Mes' },
                          { key: 'DIA' as const, label: 'Día' },
                          { key: 'SEMANA' as const, label: 'Semana' },
                          { key: 'MES' as const, label: 'Mes' },
                        ]
                      ).map((item) => (
                        <button
                          key={item.key}
                          onClick={() => setPeriodoRutaFiltro(item.key)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                            periodoRutaFiltro === item.key
                              ? 'bg-[#08557f] text-white border-[#08557f] shadow-lg shadow-[#08557f]/20'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

        {/* Lista de Clientes */}
       

         {/* Lista de visitas */}
         <div>
              <div className="flex flex-col gap-4 mb-4">
                <div className="flex items-center justify-between">
                  {showHistory && (
                    <h3 className="font-bold text-slate-900 text-lg">Histórico de Rutas</h3>
                  )}
                </div>
              </div>

              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragCancel={handleDragCancel}
              >
                <SortableContext
                  items={visitasCobrador.filter(v => v.estado !== 'pagado').map(v => v.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-6">
                    {(() => {
                      if (showHistory) {
                        return (
                          <div className="space-y-3">
                            {visitasCobrador.map((visita) => (
                              <SortableVisita
                                key={visita.id}
                                visita={visita}
                                isSelected={visitaSeleccionada === visita.id}
                                onSelect={(id) => setVisitaSeleccionada(id === visitaSeleccionada ? null : id)}
                                onVerCliente={handleAbrirClienteInfo}
                                onRegistrarPago={handleAbrirPago}
                                onRegistrarAbono={handleAbrirAbono}
                                onReprogramar={(visita) => {
                                  setVisitaReprogramar(visita)
                                  setShowReprogramModal(true)
                                }}
                                onVerEstadoCuenta={handleAbrirEstadoCuenta}
                                getEstadoClasses={getEstadoClasses}
                                getPrioridadColor={getPrioridadColor}
                                disableSort={rutaCompletada}
                                disableModificaciones={rutaCompletada}
                              />
                            ))}
                          </div>
                        )
                      }

                      const noPagadas = visitasCobrador.filter(v => v.estado !== 'pagado')

                      const porPeriodo = {
                        DIA: noPagadas.filter(v => v.periodoRuta === 'DIA'),
                        SEMANA: noPagadas.filter(v => v.periodoRuta === 'SEMANA'),
                        MES: noPagadas.filter(v => v.periodoRuta === 'MES'),
                      }

                      const renderSeccion = (titulo: string, visitas: VisitaRuta[]) => (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                              {titulo}
                            </div>
                            <div className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-full border border-slate-200">
                              {visitas.length}
                            </div>
                          </div>
                          {visitas.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-slate-200 bg-white/50 px-4 py-6 text-sm text-slate-500">
                              Sin visitas
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {visitas.map((visita) => (
                                <SortableVisita
                                  key={visita.id}
                                  visita={visita}
                                  isSelected={visitaSeleccionada === visita.id}
                                  onSelect={(id) => setVisitaSeleccionada(id === visitaSeleccionada ? null : id)}
                                  onVerCliente={handleAbrirClienteInfo}
                                  onRegistrarPago={handleAbrirPago}
                                  onRegistrarAbono={handleAbrirAbono}
                                  onReprogramar={(visita) => {
                                    setVisitaReprogramar(visita)
                                    setShowReprogramModal(true)
                                  }}
                                  onVerEstadoCuenta={handleAbrirEstadoCuenta}
                                  getEstadoClasses={getEstadoClasses}
                                  getPrioridadColor={getPrioridadColor}
                                  disableSort={rutaCompletada}
                                  disableModificaciones={rutaCompletada}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      )

                      if (periodoRutaFiltro === 'DIA') return renderSeccion('Ruta del día', porPeriodo.DIA)
                      if (periodoRutaFiltro === 'SEMANA') return renderSeccion('Ruta de la semana', porPeriodo.SEMANA)
                      if (periodoRutaFiltro === 'MES') return renderSeccion('Ruta del mes', porPeriodo.MES)

                      return (
                        <>
                          {renderSeccion('Ruta del día', porPeriodo.DIA)}
                          {renderSeccion('Ruta de la semana', porPeriodo.SEMANA)}
                          {renderSeccion('Ruta del mes', porPeriodo.MES)}
                        </>
                      )
                    })()}
                  </div>
                </SortableContext>
                
                <DragOverlay>
                  {activeVisita ? (
                    <div className="w-full rounded-2xl border border-slate-900 bg-white shadow-xl px-4 py-3 opacity-90 rotate-2 cursor-grabbing">
                      <div className="flex items-start gap-3">
                        <div className="mt-1 flex items-center">
                          <GripVertical className="h-5 w-5 text-slate-400" />
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <div className="text-sm font-bold text-slate-900">
                                  {activeVisita.cliente}
                                </div>
                                <div 
                                  className="h-1.5 w-1.5 rounded-full"
                                  style={{ backgroundColor: getPrioridadColor(activeVisita.prioridad) }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>

              {/* Visitas Completadas */}
              {visitasCobrador.some(v => v.estado === 'pagado') && (
                <div className="mt-8">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-4 opacity-50">
                    <CheckCircle2 className="h-5 w-5" />
                    Completadas
                  </h3>
                  <div className="relative z-10 pointer-events-auto space-y-3 opacity-60 grayscale hover:opacity-100 hover:grayscale-0 transition-all">
                    {visitasCobrador
                      .filter(v => v.estado === 'pagado')
                      .map((visita) => (
                        <StaticVisitaItem
                          key={visita.id}
                          visita={visita}
                          isSelected={visitaSeleccionada === visita.id}
                          onSelect={(id) => setVisitaSeleccionada(id === visitaSeleccionada ? null : id)}
                          onVerCliente={handleAbrirClienteInfo}
                          onRegistrarPago={() => {}}
                          onRegistrarAbono={handleAbrirAbono}
                          onReprogramar={(visita) => {
                            setVisitaReprogramar(visita)
                            setShowReprogramModal(true)
                          }}
                          onVerEstadoCuenta={handleAbrirEstadoCuenta}
                          getEstadoClasses={getEstadoClasses}
                          getPrioridadColor={getPrioridadColor}
                        />
                      ))}
                  </div>
                </div>
              )}
            </div>

        {/* Sección de Gastos */}
        
      </div>
      

      {/* Modal de Registro de Gasto */}
      {isGastoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-lg text-slate-900">
                <span className="text-blue-600">Registrar</span> <span className="text-orange-500">Gasto</span>
              </h3>
              <button 
                onClick={() => setIsGastoModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>
            
            {/* Modal Body */}
            <form onSubmit={handleGuardarGasto} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Tipo de Gasto</label>
                <select
                  required
                  className="w-full px-4 py-2.5 rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all font-medium text-slate-900 appearance-none"
                  value={nuevoGasto.tipo}
                  onChange={e => setNuevoGasto({...nuevoGasto, tipo: e.target.value})}
                >
                  <option value="OPERATIVO">OPERATIVO</option>
                  <option value="TRANSPORTE">TRANSPORTE</option>
                  <option value="OTRO">OTRO</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Descripción</label>
                <textarea 
                  required
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all font-medium text-slate-900 resize-none"
                  placeholder="Detalles del gasto..."
                  value={nuevoGasto.descripcion}
                  onChange={e => setNuevoGasto({...nuevoGasto, descripcion: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Valor</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                  <input 
                    type="text" 
                    inputMode="numeric"
                    required
                    min="0"
                    className="w-full pl-8 pr-4 py-2.5 rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all font-medium text-slate-900"
                    placeholder="0"
                    value={nuevoGasto.valor}
                    onChange={e => setNuevoGasto({ ...nuevoGasto, valor: formatCOPInputValue(e.target.value) })}
                  />
                </div>
              </div>

              <div className="p-3 bg-blue-50 rounded-xl flex items-start gap-3 border border-blue-100">
                <div className="p-1.5 bg-blue-100 rounded-lg text-blue-600 mt-0.5">
                  <Banknote className="h-4 w-4" />
                </div>
                <div className="text-xs text-blue-800">
                  <p className="font-bold mb-0.5">Nota Importante</p>
                  <p>Este gasto quedará en estado <strong>Pendiente de Aprobación</strong> hasta que el supervisor lo valide.</p>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex gap-3 pt-4 mt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsGastoModalOpen(false)}
                  className="flex-1 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  <span>Guardar</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )


// Componente SortableVisita
function SortableVisita({
  visita,
  isSelected,
  onSelect,
  onRegistrarPago,
  onRegistrarAbono,
  onReprogramar,
  onVerCliente,
  onVerEstadoCuenta,
  getEstadoClasses,
  getPrioridadColor,
  disableSort,
  disableModificaciones,
}: {
  visita: VisitaRuta
  isSelected: boolean
  onSelect: (id: string) => void
  onRegistrarPago: (visita: VisitaRuta) => void
  onRegistrarAbono: (visita: VisitaRuta) => void
  onReprogramar: (visita: VisitaRuta) => void
  onVerCliente: (visita: VisitaRuta) => void
  onVerEstadoCuenta: (visita: VisitaRuta) => void
  getEstadoClasses: (estado: EstadoVisita) => string
  getPrioridadColor: (prioridad: 'alta' | 'media' | 'baja') => string
  disableSort?: boolean
  disableModificaciones?: boolean
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: visita.id, disabled: !!disableSort })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative z-10 pointer-events-auto w-full rounded-2xl border px-4 py-3 transition-all ${
        isSelected
          ? 'border-[#08557f] bg-[#f7f7f7]'
          : 'border-slate-200 bg-white/80 backdrop-blur-sm shadow-[0_8px_30px_rgb(0,0,0,0.04)]'
      }`}
    >
      <div className="flex items-start gap-3">
        {disableSort ? (
          <div className="mt-1 flex items-center">
            <GripVertical className="h-5 w-5 text-slate-200" />
          </div>
        ) : (
          <div
            className="mt-1 flex items-center cursor-grab active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-5 w-5 text-slate-400" />
          </div>
        )}
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <div className="text-sm font-bold text-slate-900">
                  {visita.cliente}
                </div>
                <div 
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: getPrioridadColor(visita.prioridad) }}
                ></div>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <MapPin className="h-3 w-3" />
                <span>{visita.direccion}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold ${getEstadoClasses(
                visita.estado
              )}`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
              <span className="capitalize">
                {visita.estado === 'pendiente' && 'Pendiente'}
                {visita.estado === 'pagado' && 'Pagado'}
                {visita.estado === 'en_mora' && 'En mora'}
                {visita.estado === 'ausente' && 'Ausente'}
                {visita.estado === 'reprogramado' && 'Reprogramado'}
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Componente StaticVisitaItem
function StaticVisitaItem({
  visita,
  isSelected,
  onSelect,
  onRegistrarPago,
  onRegistrarAbono,
  onReprogramar,
  onVerCliente,
  onVerEstadoCuenta,
  getEstadoClasses,
  getPrioridadColor,
  disableModificaciones,
}: {
  visita: VisitaRuta
  isSelected: boolean
  onSelect: (id: string) => void
  onRegistrarPago: (visita: VisitaRuta) => void
  onRegistrarAbono: (visita: VisitaRuta) => void
  onReprogramar: (visita: VisitaRuta) => void
  onVerCliente: (visita: VisitaRuta) => void
  onVerEstadoCuenta: (visita: VisitaRuta) => void
  getEstadoClasses: (estado: EstadoVisita) => string
  getPrioridadColor: (prioridad: 'alta' | 'media' | 'baja') => string
}) {
  return (
    <div
      className={`relative z-10 pointer-events-auto w-full rounded-2xl border px-4 py-3 transition-all ${
        isSelected
          ? 'border-[#08557f] bg-[#f7f7f7]'
          : 'border-slate-200 bg-white/80 backdrop-blur-sm shadow-[0_8px_30px_rgb(0,0,0,0.04)]'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-1 flex items-center">
          <GripVertical className="h-5 w-5 text-slate-200" />
        </div>

        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <div className="text-sm font-bold text-slate-900">{visita.cliente}</div>
                <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: getPrioridadColor(visita.prioridad) }} />
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <MapPin className="h-3 w-3" />
                <span>{visita.direccion}</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-xs font-bold text-slate-900">${visita.montoCuota.toLocaleString('es-CO')}</span>
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2 py-0.5 text-[10px] font-medium leading-none text-slate-600 bg-slate-50">
                <Clock className="h-3 w-3 text-slate-400" />
                <span>{visita.horaSugerida}</span>
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold ${getEstadoClasses(visita.estado)}`}>
              <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
              <span className="capitalize">
                {visita.estado === 'pendiente' && 'Pendiente'}
                {visita.estado === 'pagado' && 'Pagado'}
                {visita.estado === 'en_mora' && 'En mora'}
                {visita.estado === 'ausente' && 'Ausente'}
                {visita.estado === 'reprogramado' && 'Reprogramado'}
              </span>
            </span>

            <div className="relative z-[9999] pointer-events-auto flex items-center gap-1">
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation()
                  onVerCliente(visita)
                }}
                className="relative z-[9999] pointer-events-auto p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600"
                title="Ver cliente"
              >
                <Eye className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation()
                  onSelect(visita.id)
                }}
                className="relative z-[9999] pointer-events-auto p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {isSelected && (
            <div className="mt-3 space-y-3">
              {visita.estado === 'pagado' ? (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onRegistrarAbono(visita)}
                    disabled={!!disableModificaciones}
                    className="flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-3 py-2 text-[11px] font-bold text-white hover:bg-orange-600 shadow-lg shadow-orange-500/20"
                  >
                    <Wallet className="h-4 w-4" />
                    Registrar Abono
                  </button>
                  <button
                    type="button"
                    onClick={() => onVerEstadoCuenta(visita)}
                    className="flex items-center justify-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-[11px] font-bold text-slate-700 hover:bg-slate-200 border border-slate-200"
                  >
                    <FileTextIcon className="h-4 w-4" />
                    Ver Estado de Cuenta
                  </button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => onRegistrarPago(visita)}
                      disabled={!!disableModificaciones}
                      className="flex items-center justify-center gap-2 rounded-xl bg-[#08557f] px-3 py-2 text-[11px] font-bold text-white hover:bg-[#063a58] shadow-lg shadow-[#08557f]/20"
                    >
                      <DollarSign className="h-4 w-4" />
                      Registrar Pago
                    </button>
                    <button
                      type="button"
                      onClick={() => onRegistrarAbono(visita)}
                      disabled={!!disableModificaciones}
                      className="flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-3 py-2 text-[11px] font-bold text-white hover:bg-orange-600 shadow-lg shadow-orange-500/20"
                    >
                      <Wallet className="h-4 w-4" />
                      Registrar Abono
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => onVerEstadoCuenta(visita)}
                      className="flex items-center justify-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-[11px] font-bold text-slate-700 hover:bg-slate-200 border border-slate-200"
                    >
                      <FileTextIcon className="h-4 w-4" />
                      Ver Estado de Cuenta
                    </button>
                    <button
                      type="button"
                      onClick={() => onReprogramar(visita)}
                      disabled={!!disableModificaciones}
                      className="flex items-center justify-center gap-2 rounded-xl bg-orange-50 px-3 py-2 text-[11px] font-bold text-orange-700 hover:bg-orange-100 border border-orange-200"
                    >
                      <Calendar className="h-4 w-4" />
                      Reprogramar
                    </button>
                  </div>
                </>
              )}

              <div className="text-[11px] text-slate-600">
                <div className="flex items-center justify-between mb-1">
                  <span>Saldo total:</span>
                  <span className="font-bold">${visita.saldoTotal.toLocaleString('es-CO')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Próxima visita:</span>
                  <span className="font-medium">{visita.proximaVisita}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Teléfono:</span>
                  <span className="font-medium">{visita.telefono}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SortableVisita({
  visita,
  isSelected,
  onSelect,
  onRegistrarPago,
  onRegistrarAbono,
  onReprogramar,
  onVerCliente,
  onVerEstadoCuenta,
  getEstadoClasses,
  getPrioridadColor,
  disableSort,
  disableModificaciones,
  
}: {
  visita: VisitaRuta
  isSelected: boolean
  onSelect: (id: string) => void
  onRegistrarPago: (visita: VisitaRuta) => void
  onRegistrarAbono: (visita: VisitaRuta) => void
  onReprogramar: (visita: VisitaRuta) => void
  onVerCliente: (visita: VisitaRuta) => void
  onVerEstadoCuenta: (visita: VisitaRuta) => void
  getEstadoClasses: (estado: EstadoVisita) => string
  getPrioridadColor: (prioridad: 'alta' | 'media' | 'baja') => string
  disableSort?: boolean
  disableModificaciones?: boolean
}) {
  return (
    <SortableItem
      visita={visita}
      isSelected={isSelected}
      onSelect={onSelect}
      onRegistrarPago={onRegistrarPago}
      onRegistrarAbono={onRegistrarAbono}
      onReprogramar={onReprogramar}
      onVerCliente={onVerCliente}
      onVerEstadoCuenta={onVerEstadoCuenta}
      getEstadoClasses={getEstadoClasses}
      getPrioridadColor={getPrioridadColor}
      disableSort={disableSort}
      disableModificaciones={disableModificaciones}
    />
  )
}

interface OperacionCaja {
  id: string
  tipo: 'pago' | 'gasto' | 'base'
  descripcion: string
  monto: number
  hora: string
  estado: 'completado' | 'pendiente'
  cobradorId: string
}

interface UserSession {
  id: string
  nombres: string
  apellidos: string
  correo?: string
  telefono?: string
  rol: RolUsuario
  rutaAsignada?: string
  zona?: string
  metaDiaria?: number
  avatar?: string
}



// Componente Sortable para las visitas
function SortableItem({
  visita,
  isSelected,
  onSelect,
  onRegistrarPago,
  onRegistrarAbono,
  onReprogramar,
  onVerCliente,
  onVerEstadoCuenta,
  getEstadoClasses,
  getPrioridadColor,
  disableSort,
  disableModificaciones,
}: {
  visita: VisitaRuta
  isSelected: boolean
  onSelect: (id: string) => void
  onRegistrarPago: (visita: VisitaRuta) => void
  onRegistrarAbono: (visita: VisitaRuta) => void
  onReprogramar: (visita: VisitaRuta) => void
  onVerCliente: (visita: VisitaRuta) => void
  onVerEstadoCuenta: (visita: VisitaRuta) => void
  getEstadoClasses: (estado: EstadoVisita) => string
  getPrioridadColor: (prioridad: 'alta' | 'media' | 'baja') => string
  disableSort?: boolean
  disableModificaciones?: boolean
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: visita.id, disabled: !!disableSort })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative z-10 pointer-events-auto w-full rounded-2xl border px-4 py-3 transition-all ${
        isSelected
          ? 'border-[#08557f] bg-[#f7f7f7]'
          : 'border-slate-200 bg-white/80 backdrop-blur-sm shadow-[0_8px_30px_rgb(0,0,0,0.04)]'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Handle de arrastre */}
        {disableSort ? (
          <div className="mt-1 flex items-center">
            <GripVertical className="h-5 w-5 text-slate-200" />
          </div>
        ) : (
          <div
            className="mt-1 flex items-center cursor-grab active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-5 w-5 text-slate-400" />
          </div>
        )}
        
        {/* Información del cliente */}
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <div className="text-sm font-bold text-slate-900">
                  {visita.cliente}
                </div>
                <div 
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: getPrioridadColor(visita.prioridad) }}
                ></div>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <MapPin className="h-3 w-3" />
                <span>{visita.direccion}</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-xs font-bold text-slate-900">
                ${visita.montoCuota.toLocaleString('es-CO')}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2 py-0.5 text-[10px] font-medium leading-none text-slate-600 bg-slate-50">
                <Clock className="h-3 w-3 text-slate-400" />
                <span>{visita.horaSugerida}</span>
              </span>
            </div>
          </div>

          {/* Estado y acciones */}
          <div className="flex items-center justify-between">
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold ${getEstadoClasses(
                visita.estado
              )}`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
              <span className="capitalize">
                {visita.estado === 'pendiente' && 'Pendiente'}
                {visita.estado === 'pagado' && 'Pagado'}
                {visita.estado === 'en_mora' && 'En mora'}
                {visita.estado === 'ausente' && 'Ausente'}
                {visita.estado === 'reprogramado' && 'Reprogramado'}
              </span>
            </span>
            
            <div className="relative z-[9999] pointer-events-auto flex items-center gap-1">
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation()
                  onVerCliente(visita)
                }}
                className="relative z-[9999] pointer-events-auto p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600"
                title="Ver cliente"
              >
                <Eye className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation()
                  onSelect(visita.id)
                }}
                className="relative z-[9999] pointer-events-auto p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Panel expandido de acciones */}
          {isSelected && (
            <div className="mt-3 space-y-3" onPointerDown={(e) => e.stopPropagation()}>
              <div className="grid grid-cols-2 gap-2">
                {visita.estado !== 'pagado' && (
                  <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => {
                      if (disableModificaciones) return
                      onRegistrarPago(visita)
                    }}
                    disabled={!!disableModificaciones}
                    className="flex items-center justify-center gap-2 rounded-xl bg-[#08557f] px-3 py-2 text-[11px] font-bold text-white hover:bg-[#063a58] shadow-lg shadow-[#08557f]/20"
                  >
                    <DollarSign className="h-4 w-4" />
                    Registrar Pago
                  </button>
                )}
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => {
                    if (disableModificaciones) return
                    onRegistrarAbono(visita)
                  }}
                  disabled={!!disableModificaciones}
                  className="flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-3 py-2 text-[11px] font-bold text-white hover:bg-orange-600 shadow-lg shadow-orange-500/20"
                >
                  <Wallet className="h-4 w-4" />
                  Registrar Abono
                </button>
              </div>

              <button 
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => onVerEstadoCuenta(visita)}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 border border-slate-200"
              >
                <FileTextIcon className="h-4 w-4" />
                Ver Estado de Cuenta
              </button>

              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => {
                  if (disableModificaciones) return
                  onReprogramar(visita)
                }}
                disabled={!!disableModificaciones}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-orange-50 px-3 py-2 text-xs font-bold text-orange-700 hover:bg-orange-100 border border-orange-200"
              >
                <Calendar className="h-4 w-4" />
                Reprogramar Visita
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
}
export default DetalleRutaPage
