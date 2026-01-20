'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  MapPin,
  Wallet,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronRight,
  UserPlus,
  Receipt,
  DollarSign,
  MessageSquare,
  Users,
  CreditCard,
  FileText,
  Plus,
  X,
  Filter,
  Smartphone,
  RefreshCw,
  Calculator,
  User,
  LogOut,
  Bell,
  GripVertical
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
} from '@dnd-kit/sortable'
import {
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

type EstadoVisita = 'pendiente' | 'pagado' | 'en_mora' | 'ausente' | 'reprogramado'

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
  nombre: string
  rol: 'cobrador'
  rutaAsignada: string
  avatar: string
  zona: string
  metaDiaria: number
}

// Componente Sortable para las visitas
function SortableVisita({ 
  visita, 
  isSelected, 
  onSelect,
  onShare,
  getEstadoClasses,
  getPrioridadColor 
}: {
  visita: VisitaRuta
  isSelected: boolean
  onSelect: (id: string) => void
  onShare: (id: string) => void
  getEstadoClasses: (estado: EstadoVisita) => string
  getPrioridadColor: (prioridad: 'alta' | 'media' | 'baja') => string
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: visita.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`w-full rounded-2xl border px-4 py-3 transition-all ${
        isSelected
          ? 'border-[#08557f] bg-[#08557f]/5'
          : 'border-gray-100 bg-white/90 shadow-sm'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Handle de arrastre */}
        <div className="mt-1 flex items-center cursor-grab active:cursor-grabbing" {...attributes} {...listeners}>
          <GripVertical className="h-5 w-5 text-gray-400" />
        </div>
        
        {/* Información del cliente */}
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <div className="text-sm font-medium text-gray-900">
                  {visita.cliente}
                </div>
                <div 
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: getPrioridadColor(visita.prioridad) }}
                ></div>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-gray-500">
                <MapPin className="h-3 w-3" />
                <span>{visita.direccion}</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-xs font-semibold text-gray-900">
                ${visita.montoCuota.toLocaleString('es-CO')}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium leading-none">
                <Clock className="h-3 w-3 text-gray-400" />
                <span>{visita.horaSugerida}</span>
              </span>
            </div>
          </div>

          {/* Estado y acciones */}
          <div className="flex items-center justify-between">
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-medium ${getEstadoClasses(
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
            
            <div className="flex items-center gap-1">
              <button 
                onClick={() => onSelect(visita.id)}
                className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200"
              >
                <ChevronRight className="h-3.5 w-3.5 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Panel expandido de acciones */}
          {isSelected && (
            <div className="mt-3 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => {
                    // Lógica para abrir modal de pago
                    console.log('Registrar pago para:', visita.id)
                  }}
                  className="flex items-center justify-center gap-2 rounded-xl bg-[#08557f] px-3 py-2 text-xs font-medium text-white hover:bg-[#063a58]"
                >
                  <DollarSign className="h-4 w-4" />
                  Registrar Pago
                </button>
                <button 
                  onClick={() => onShare(visita.id)}
                  className="flex items-center justify-center gap-2 rounded-xl bg-[#10b981] px-3 py-2 text-xs font-medium text-white hover:bg-emerald-600"
                >
                  <MessageSquare className="h-4 w-4" />
                  Compartir Recibo
                </button>
              </div>
              
              <div className="text-[11px] text-gray-600">
                <div className="flex items-center justify-between mb-1">
                  <span>Saldo total:</span>
                  <span className="font-medium">${visita.saldoTotal.toLocaleString('es-CO')}</span>
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

const VistaCobradorPage = () => {
  // Simulación de sesión del usuario
  const [userSession] = useState<UserSession>({
    id: 'CB-001',
    nombre: 'Juan Pérez',
    rol: 'cobrador',
    rutaAsignada: 'Ruta Norte',
    avatar: 'JP',
    zona: 'Zona Centro',
    metaDiaria: 1000000
  })

  // Estados principales
  const [visitaSeleccionada, setVisitaSeleccionada] = useState<string | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [showBaseRequestModal, setShowBaseRequestModal] = useState(false)
  const [showNewClientModal, setShowNewClientModal] = useState(false)
  
  // Estado para el drag & drop
  const [activeId, setActiveId] = useState<string | null>(null)
  const [visitasOrden, setVisitasOrden] = useState<string[]>([
    'V-001', 'V-002', 'V-003', 'V-004', 'V-005'
  ])

  // Datos base
  const visitasBase: VisitaRuta[] = useMemo(() => [
    {
      id: 'V-001',
      cliente: 'Carlos Rodríguez',
      direccion: 'Av. Principal #123',
      telefono: '3001234567',
      horaSugerida: '09:30',
      montoCuota: 125000,
      saldoTotal: 500000,
      estado: 'pendiente',
      proximaVisita: 'Hoy',
      ordenVisita: 1,
      prioridad: 'alta',
      cobradorId: 'CB-001'
    },
    {
      id: 'V-002',
      cliente: 'Ana Martínez',
      direccion: 'Calle 45, Urbanización Norte',
      telefono: '3109876543',
      horaSugerida: '10:15',
      montoCuota: 80000,
      saldoTotal: 320000,
      estado: 'en_mora',
      proximaVisita: 'Hoy',
      ordenVisita: 2,
      prioridad: 'alta',
      cobradorId: 'CB-001'
    },
    {
      id: 'V-003',
      cliente: 'Luis Fernández',
      direccion: 'Conjunto Residencial Vista Azul',
      telefono: '3205551234',
      horaSugerida: '11:00',
      montoCuota: 95750,
      saldoTotal: 382000,
      estado: 'pendiente',
      proximaVisita: 'Hoy',
      ordenVisita: 3,
      prioridad: 'media',
      cobradorId: 'CB-001'
    },
    {
      id: 'V-004',
      cliente: 'María González',
      direccion: 'Diagonal 56 #78-90',
      telefono: '3157778888',
      horaSugerida: '13:45',
      montoCuota: 110000,
      saldoTotal: 440000,
      estado: 'pagado',
      proximaVisita: '15/01',
      ordenVisita: 4,
      prioridad: 'baja',
      cobradorId: 'CB-001'
    },
    {
      id: 'V-005',
      cliente: 'José Pérez',
      direccion: 'Avenida 7 #23-45',
      telefono: '3004445555',
      horaSugerida: '14:30',
      montoCuota: 95000,
      saldoTotal: 380000,
      estado: 'ausente',
      proximaVisita: 'Mañana',
      ordenVisita: 5,
      prioridad: 'media',
      cobradorId: 'CB-001'
    }
  ], [])

  const operacionesCaja: OperacionCaja[] = useMemo(() => [
    { id: 'OP-001', tipo: 'pago', descripcion: 'Pago Carlos Rodríguez', monto: 125000, hora: '09:42', estado: 'completado', cobradorId: 'CB-001' },
    { id: 'OP-002', tipo: 'gasto', descripcion: 'Combustible', monto: 35000, hora: '08:15', estado: 'completado', cobradorId: 'CB-001' },
    { id: 'OP-003', tipo: 'base', descripcion: 'Base solicitada', monto: 50000, hora: '10:30', estado: 'pendiente', cobradorId: 'CB-001' },
    { id: 'OP-004', tipo: 'pago', descripcion: 'Pago María González', monto: 110000, hora: '13:50', estado: 'completado', cobradorId: 'CB-001' },
  ], [])

  // Filtrar y ordenar visitas
  const visitasCobrador = useMemo(() => {
    const filtradas = visitasBase.filter(v => v.cobradorId === userSession.id)
    // Ordenar según el orden actual
    return visitasOrden
      .map(id => filtradas.find(v => v.id === id))
      .filter((v): v is VisitaRuta => v !== undefined)
  }, [visitasBase, userSession.id, visitasOrden])

  const operacionesCobrador = useMemo(() => 
    operacionesCaja.filter(op => op.cobradorId === userSession.id),
    [operacionesCaja, userSession.id]
  )

  // Calcular caja - USANDO useMemo para evitar loops infinitos
  const cajaRuta = useMemo(() => {
    const recaudoTotal = operacionesCobrador
      .filter(op => op.tipo === 'pago' && op.estado === 'completado')
      .reduce((sum, op) => sum + op.monto, 0)
    
    const gastosOperativos = operacionesCobrador
      .filter(op => op.tipo === 'gasto' && op.estado === 'completado')
      .reduce((sum, op) => sum + op.monto, 0)
    
    const baseSolicitada = operacionesCobrador
      .filter(op => op.tipo === 'base' && op.estado === 'pendiente')
      .reduce((sum, op) => sum + op.monto, 0)
    
    const progresoMeta = (recaudoTotal / userSession.metaDiaria) * 100
    
    return {
      recaudoTotal,
      gastosOperativos,
      baseDisponible: baseSolicitada,
      saldoNeto: recaudoTotal - gastosOperativos,
      efectivoDisponible: recaudoTotal - gastosOperativos - baseSolicitada,
      cambioNecesario: 20000,
      metaDiaria: userSession.metaDiaria,
      progresoMeta: Math.min(progresoMeta, 100)
    }
  }, [operacionesCobrador, userSession.metaDiaria])

  // Configuración de sensores para drag & drop
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
    setActiveId(event.active.id as string)
  }, [])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setVisitasOrden((items) => {
        const oldIndex = items.indexOf(active.id as string)
        const newIndex = items.indexOf(over.id as string)
        return arrayMove(items, oldIndex, newIndex)
      })
    }

    setActiveId(null)
  }, [])

  const handleDragCancel = useCallback(() => {
    setActiveId(null)
  }, [])

  // Funciones auxiliares
  const getEstadoClasses = useCallback((estado: EstadoVisita) => {
    if (estado === 'pendiente') return 'bg-amber-50 text-amber-700 border-amber-100'
    if (estado === 'pagado') return 'bg-emerald-50 text-emerald-700 border-emerald-100'
    if (estado === 'en_mora') return 'bg-red-50 text-red-600 border-red-100'
    if (estado === 'ausente') return 'bg-gray-50 text-gray-600 border-gray-100'
    return 'bg-blue-50 text-blue-700 border-blue-100'
  }, [])

  const getPrioridadColor = useCallback((prioridad: 'alta' | 'media' | 'baja') => {
    if (prioridad === 'alta') return '#ef4444'
    if (prioridad === 'media') return '#f59e0b'
    return '#10b981'
  }, [])

  // Handlers de acciones
  const handleRegistrarPago = useCallback((visitaId: string, montoPagado: number) => {
    console.log(`Cobrador ${userSession.nombre} registra pago de ${montoPagado} para visita ${visitaId}`)
    setShowPaymentModal(false)
  }, [userSession.nombre])

  const handleRegistrarGasto = useCallback((descripcion: string, monto: number) => {
    console.log(`Cobrador ${userSession.nombre} registra gasto: ${descripcion} - $${monto}`)
    setShowExpenseModal(false)
  }, [userSession.nombre])

  const handleSolicitarBase = useCallback((monto: number, motivo: string) => {
    console.log(`Cobrador ${userSession.nombre} solicita base de $${monto}: ${motivo}`)
    setShowBaseRequestModal(false)
  }, [userSession.nombre])

  const handleNuevoCliente = useCallback((datos: any) => {
    console.log(`Cobrador ${userSession.nombre} crea nuevo cliente:`, datos)
    setShowNewClientModal(false)
  }, [userSession.nombre])

  const handleCompartirRecibo = useCallback((visitaId: string) => {
    console.log(`Cobrador ${userSession.nombre} comparte recibo para visita ${visitaId}`)
  }, [userSession.nombre])

  const handleLogout = useCallback(() => {
    console.log(`Cobrador ${userSession.nombre} cierra sesión`)
  }, [userSession.nombre])

  // Obtener la visita activa para el overlay
  const activeVisita = activeId ? visitasCobrador.find(v => v.id === activeId) : null

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 via-white to-gray-50 px-4 py-6">
      <div className="mx-auto flex w-full max-w-md flex-col gap-4">
        {/* Header con información del cobrador */}
        <header className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-[#08557f] to-[#063a58] rounded-full flex items-center justify-center text-white font-medium">
                  {userSession.avatar}
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white"></div>
              </div>
              <div>
                <h2 className="text-sm font-medium text-gray-900">{userSession.nombre}</h2>
                <p className="text-xs text-gray-500">Cobrador • {userSession.rutaAsignada}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-1.5 rounded-full bg-gray-100 relative">
                <Bell className="h-4 w-4 text-gray-600" />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              <button 
                onClick={handleLogout}
                className="p-1.5 rounded-full bg-gray-100"
                title="Cerrar sesión"
              >
                <LogOut className="h-4 w-4 text-gray-600" />
              </button>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full bg-[#08557f]/5 px-3 py-1 text-xs text-[#08557f] tracking-wide">
            <Wallet className="h-3 w-3" />
            <span>{userSession.rutaAsignada} • {userSession.zona}</span>
          </div>
          <div>
            <h1 className="text-2xl font-light text-gray-900 tracking-tight">
              Mi Ruta del Día
            </h1>
            <p className="mt-1 text-xs text-gray-500">
              Arrastra para reordenar • Los pagados desaparecen automáticamente
            </p>
          </div>
        </header>

        {/* Stats rápidos */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-white border border-gray-100 p-3">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-[#08557f]" />
              <span className="text-sm font-medium text-gray-900">Mi Recaudo</span>
            </div>
            <div className="text-lg font-semibold text-gray-900">
              ${cajaRuta.recaudoTotal.toLocaleString('es-CO')}
            </div>
            <div className="text-xs text-gray-500">Meta: ${userSession.metaDiaria.toLocaleString('es-CO')}</div>
          </div>
          <div className="rounded-xl bg-white border border-gray-100 p-3">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-[#fb851b]" />
              <span className="text-sm font-medium text-gray-900">Mis Pendientes</span>
            </div>
            <div className="text-lg font-semibold text-gray-900">
              {visitasCobrador.filter(v => v.estado === 'pendiente' || v.estado === 'en_mora').length}/{visitasCobrador.length}
            </div>
            <div className="text-xs text-gray-500">Clientes por visitar</div>
          </div>
        </div>

        {/* Barra de progreso de meta */}
        <div className="mt-2">
          <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
            <span>Progreso de meta diaria</span>
            <span>{Math.round(cajaRuta.progresoMeta)}%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-[#08557f] to-[#063a58] rounded-full transition-all duration-500"
              style={{ width: `${cajaRuta.progresoMeta}%` }}
            ></div>
          </div>
        </div>

        {/* Lista de visitas con Drag & Drop */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <SortableContext
            items={visitasOrden}
            strategy={verticalListSortingStrategy}
          >
            <section className="space-y-3">
              {visitasCobrador
                .filter(v => v.estado !== 'pagado') // Los pagados desaparecen automáticamente
                .map((visita) => (
                  <SortableVisita
                    key={visita.id}
                    visita={visita}
                    isSelected={visitaSeleccionada === visita.id}
                    onSelect={(id) => setVisitaSeleccionada(prev => prev === id ? null : id)}
                    onShare={handleCompartirRecibo}
                    getEstadoClasses={getEstadoClasses}
                    getPrioridadColor={getPrioridadColor}
                  />
                ))}
            </section>
          </SortableContext>

          {/* Overlay durante el drag */}
          <DragOverlay>
            {activeVisita && (
              <div className="rounded-2xl border-2 border-[#08557f] bg-white shadow-xl">
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <GripVertical className="h-5 w-5 text-[#08557f]" />
                    <span className="text-sm font-medium text-gray-900">{activeVisita.cliente}</span>
                  </div>
                  <div className="text-xs text-gray-500">Arrastrando...</div>
                </div>
              </div>
            )}
          </DragOverlay>
        </DndContext>

        {/* Mi Caja de Ruta */}
        <div className="rounded-2xl bg-gradient-to-br from-[#08557f] to-[#063a58] p-4 text-white">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              <h3 className="text-sm font-medium">Mi Caja de Ruta</h3>
            </div>
            <Calculator className="h-4 w-4" />
          </div>
          
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-xs text-gray-300">Recaudo total</div>
                <div className="text-lg font-semibold">${cajaRuta.recaudoTotal.toLocaleString('es-CO')}</div>
              </div>
              <div>
                <div className="text-xs text-gray-300">Mis Gastos</div>
                <div className="text-lg font-semibold text-red-200">${cajaRuta.gastosOperativos.toLocaleString('es-CO')}</div>
              </div>
            </div>
            
            <div className="pt-2 border-t border-white/20">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-gray-300">Mi Saldo neto</div>
                  <div className="text-xl font-bold">${cajaRuta.saldoNeto.toLocaleString('es-CO')}</div>
                </div>
                <button 
                  onClick={() => setShowBaseRequestModal(true)}
                  className="flex items-center gap-2 rounded-full bg-[#fb851b] px-3 py-1.5 text-xs font-medium hover:bg-amber-600"
                >
                  <CreditCard className="h-3 w-3" />
                  Solicitar Base
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mis Movimientos Recientes */}
        <div className="rounded-2xl bg-white border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-900">Mis Movimientos</h3>
            <button className="text-xs text-[#08557f] hover:text-[#063a58]">
              Ver historial
            </button>
          </div>
          
          <div className="space-y-2">
            {operacionesCobrador.slice(0, 3).map((op) => (
              <div key={op.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50/50">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${
                    op.tipo === 'pago' ? 'bg-green-100 text-green-600' :
                    op.tipo === 'gasto' ? 'bg-red-100 text-red-600' :
                    'bg-amber-100 text-amber-600'
                  }`}>
                    {op.tipo === 'pago' ? <DollarSign className="h-3 w-3" /> :
                     op.tipo === 'gasto' ? <Receipt className="h-3 w-3" /> :
                     <CreditCard className="h-3 w-3" />}
                  </div>
                  <div>
                    <div className="text-xs font-medium text-gray-900">{op.descripcion}</div>
                    <div className="text-[10px] text-gray-500">{op.hora}</div>
                  </div>
                </div>
                <div className={`text-sm font-medium ${
                  op.tipo === 'pago' ? 'text-green-600' :
                  op.tipo === 'gasto' ? 'text-red-600' :
                  'text-amber-600'
                }`}>
                  {op.tipo === 'pago' ? '+' : '-'}${op.monto.toLocaleString('es-CO')}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Botones flotantes de acción */}
        <div className="fixed bottom-20 right-4 flex flex-col gap-2">
          <button 
            onClick={() => setShowExpenseModal(true)}
            className="flex items-center justify-center w-12 h-12 rounded-full bg-gray-800 text-white shadow-lg hover:bg-gray-900"
            title="Registrar gasto operativo"
          >
            <Receipt className="h-5 w-5" />
          </button>
          <button 
            onClick={() => setShowNewClientModal(true)}
            className="flex items-center justify-center w-12 h-12 rounded-full bg-[#08557f] text-white shadow-lg hover:bg-[#063a58]"
            title="Nuevo cliente"
          >
            <UserPlus className="h-5 w-5" />
          </button>
          <button 
            onClick={() => setShowPaymentModal(true)}
            className="flex items-center justify-center w-14 h-14 rounded-full bg-[#fb851b] text-white shadow-lg hover:bg-amber-600"
            title="Registrar pago"
          >
            <Plus className="h-6 w-6" />
          </button>
        </div>

        {/* Footer con info de sesión */}
        <footer className="mt-4 flex items-center justify-between rounded-full bg-gray-900 px-4 py-2 text-[11px] text-gray-200">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              {userSession.nombre} • {visitasCobrador.filter(v => v.estado !== 'pagado').length} visitas pendientes
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Smartphone className="h-3 w-3 text-gray-400" />
            <span>{userSession.rutaAsignada}</span>
          </div>
        </footer>

        {/* Modal de registro de pago */}
        {showPaymentModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl w-full max-w-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Registrar Pago</h3>
                <button onClick={() => setShowPaymentModal(false)}>
                  <X className="h-5 w-5 text-gray-400" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Monto pagado</label>
                  <input 
                    type="number"
                    className="w-full p-3 border border-gray-300 rounded-lg"
                    placeholder="Ej: 125000"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Método de pago</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button className="p-3 border border-gray-300 rounded-lg text-center hover:bg-gray-50">
                      Efectivo
                    </button>
                    <button className="p-3 border border-gray-300 rounded-lg text-center hover:bg-gray-50">
                      Transferencia
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Comentario (opcional)</label>
                  <textarea 
                    className="w-full p-3 border border-gray-300 rounded-lg"
                    rows={2}
                    placeholder="Ej: Cliente pagó completo"
                  />
                </div>
              </div>
              
              <div className="flex space-x-3 mt-6">
                <button 
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => handleRegistrarPago(visitaSeleccionada!, 125000)}
                  className="flex-1 py-3 bg-[#08557f] text-white rounded-lg hover:bg-[#063a58]"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de registro de gasto */}
        {showExpenseModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl w-full max-w-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Registrar Gasto</h3>
                <button onClick={() => setShowExpenseModal(false)}>
                  <X className="h-5 w-5 text-gray-400" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Descripción</label>
                  <input 
                    type="text"
                    className="w-full p-3 border border-gray-300 rounded-lg"
                    placeholder="Ej: Combustible, almuerzo, peaje..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Monto</label>
                  <input 
                    type="number"
                    className="w-full p-3 border border-gray-300 rounded-lg"
                    placeholder="Ej: 25000"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Comprobante (opcional)</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                    <FileText className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <div className="text-sm text-gray-500">Subir foto del ticket</div>
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-3 mt-6">
                <button 
                  onClick={() => setShowExpenseModal(false)}
                  className="flex-1 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => handleRegistrarGasto('Combustible', 25000)}
                  className="flex-1 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-900"
                >
                  Registrar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de solicitud de base */}
        {showBaseRequestModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl w-full max-w-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Solicitar Base de Dinero</h3>
                <button onClick={() => setShowBaseRequestModal(false)}>
                  <X className="h-5 w-5 text-gray-400" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Monto solicitado</label>
                  <input 
                    type="number"
                    className="w-full p-3 border border-gray-300 rounded-lg"
                    placeholder="Ej: 50000"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Motivo</label>
                  <select className="w-full p-3 border border-gray-300 rounded-lg">
                    <option>Dar cambio a clientes</option>
                    <option>Nuevo préstamo inmediato</option>
                    <option>Otro</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Observaciones</label>
                  <textarea 
                    className="w-full p-3 border border-gray-300 rounded-lg"
                    rows={3}
                    placeholder="Explique brevemente la necesidad..."
                  />
                </div>
              </div>
              
              <div className="flex space-x-3 mt-6">
                <button 
                  onClick={() => setShowBaseRequestModal(false)}
                  className="flex-1 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => handleSolicitarBase(50000, 'Base para cambio')}
                  className="flex-1 py-3 bg-[#fb851b] text-white rounded-lg hover:bg-amber-600"
                >
                  Enviar Solicitud
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default VistaCobradorPage