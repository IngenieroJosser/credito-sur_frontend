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
  GripVertical,
  Home,
  BarChart3,
  Settings,
  Camera,
  Search,
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
} from '@dnd-kit/sortable'
import {
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useRouter } from 'next/navigation'
import { RolUsuario } from '@/lib/types/autenticacion-type'
import { cerrarSesion, obtenerPerfil } from '@/services/autenticacion-service'
import { formatCurrency } from '@/lib/utils'

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
          ? 'border-slate-900 bg-slate-50'
          : 'border-slate-200 bg-white/80 backdrop-blur-sm shadow-[0_8px_30px_rgb(0,0,0,0.04)]'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Handle de arrastre */}
        <div className="mt-1 flex items-center cursor-grab active:cursor-grabbing" {...attributes} {...listeners}>
          <GripVertical className="h-5 w-5 text-slate-400" />
        </div>
        
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
            
            <div className="flex items-center gap-1">
              <button 
                onClick={() => onSelect(visita.id)}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600"
              >
                <ChevronRight className="h-3.5 w-3.5" />
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
                  className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800 shadow-lg shadow-slate-900/20"
                >
                  <DollarSign className="h-4 w-4" />
                  Registrar Pago
                </button>
                <button 
                  onClick={() => onShare(visita.id)}
                  className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 shadow-lg shadow-emerald-600/20"
                >
                  <MessageSquare className="h-4 w-4" />
                  Compartir Recibo
                </button>
              </div>

              <button 
                onClick={() => {
                  console.log('Ver estado de cuenta:', visita.cliente)
                  // Aquí iría la lógica para abrir el estado de cuenta
                }}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 border border-slate-200"
              >
                <FileTextIcon className="h-4 w-4" />
                Ver Estado de Cuenta
              </button>
              
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

const VistaCobrador = () => {
  const [userSession, setUserSession] = useState<UserSession | null>(null)
  const [visitaSeleccionada, setVisitaSeleccionada] = useState<string | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [showBaseRequestModal, setShowBaseRequestModal] = useState(false)
  const [showNewClientModal, setShowNewClientModal] = useState(false)
  
  // Nuevos estados para la refactorización
  const [showCreditModal, setShowCreditModal] = useState(false)
  const [creditType, setCreditType] = useState<'prestamo' | 'articulo'>('prestamo')
  const [isFabOpen, setIsFabOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showHistory, setShowHistory] = useState(false)

  const [isLoading, setIsLoading] = useState(true)
  
  // Estado para el drag & drop
  const [activeId, setActiveId] = useState<string | null>(null)
  const [visitasOrden, setVisitasOrden] = useState<string[]>([
    'V-001', 'V-002', 'V-003', 'V-004', 'V-005'
  ])

  const router = useRouter();

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

  // Cargar datos del usuario al montar el componente
  useEffect(() => {
    const cargarUsuario = async () => {
      try {
        // Primero intentar cargar desde localStorage
        const userData = localStorage.getItem('user');
        const token = localStorage.getItem('token');
        
        if (!token) {
          router.replace('/login');
          return;
        }

        if (userData) {
          const user = JSON.parse(userData);
          setUserSession(user);
          
          // Verificar que el rol sea COBRADOR
          if (user.rol !== 'COBRADOR') {
            // Redirigir según el rol
            const ROLE_REDIRECT_MAP: Record<RolUsuario, string> = {
              SUPER_ADMINISTRADOR: '/admin',
              COORDINADOR: '/coordinador',
              SUPERVISOR: '/supervision',
              COBRADOR: '/cobranzas',
              CONTADOR: '/contabilidad',
            };
            
            const redirectPath = ROLE_REDIRECT_MAP[user.rol as RolUsuario] ?? '/';
            router.replace(redirectPath);
            return;
          }
        } else {
          // Si no hay datos en localStorage, obtener del backend
          try {
            const perfil = await obtenerPerfil();
            localStorage.setItem('user', JSON.stringify(perfil));
            setUserSession(perfil);
          } catch (error) {
            console.error('Error al obtener perfil:', error);
            router.replace('/login');
          }
        }
      } catch (error) {
        console.error('Error al cargar usuario:', error);
        router.replace('/login');
      } finally {
        setIsLoading(false);
      }
    };

    cargarUsuario();
  }, [router]);

  // Filtrar y ordenar visitas
  const visitasCobrador = useMemo(() => {
    const filtradas = visitasBase.filter(v => v.cobradorId === 'CB-001') // Temporal
    
    // Aplicar búsqueda
    const buscadas = filtradas.filter(v => 
      v.cliente.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.direccion.toLowerCase().includes(searchQuery.toLowerCase())
    )

    // Ordenar según el orden actual
    return visitasOrden
      .map(id => buscadas.find(v => v.id === id))
      .filter((v): v is VisitaRuta => v !== undefined)
  }, [visitasBase, visitasOrden, searchQuery])

  const operacionesCobrador = useMemo(() => 
    operacionesCaja.filter(op => op.cobradorId === 'CB-001'), // Temporal
    [operacionesCaja]
  )

  // Calcular caja
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
    
    const metaDiaria = 1000000; // Temporal
    const progresoMeta = (recaudoTotal / metaDiaria) * 100
    
    return {
      recaudoTotal,
      gastosOperativos,
      baseDisponible: baseSolicitada,
      saldoNeto: recaudoTotal - gastosOperativos,
      efectivoDisponible: recaudoTotal - gastosOperativos - baseSolicitada,
      cambioNecesario: 20000,
      metaDiaria,
      progresoMeta: Math.min(progresoMeta, 100)
    }
  }, [operacionesCobrador])

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
  const handleLogout = useCallback(async () => {
    try {
      await cerrarSesion();
      router.replace('/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  }, [router])

  const handleRegistrarPago = useCallback((visitaId: string, montoPagado: number) => {
    console.log(`Registra pago de ${montoPagado} para visita ${visitaId}`)
    setShowPaymentModal(false)
  }, [])

  const handleRegistrarGasto = useCallback((descripcion: string, monto: number) => {
    console.log(`Registra gasto: ${descripcion} - $${monto}`)
    setShowExpenseModal(false)
  }, [])

  const handleSolicitarBase = useCallback((monto: number, motivo: string) => {
    console.log(`Solicita base de $${monto}: ${motivo}`)
    setShowBaseRequestModal(false)
  }, [])

  const handleNuevoCliente = useCallback((datos: unknown) => {
    console.log(`Crea nuevo cliente:`, datos)
    setShowNewClientModal(false)
  }, [])

  const handleCompartirRecibo = useCallback((visitaId: string) => {
    console.log(`Comparte recibo para visita ${visitaId}`)
  }, [])

  // Obtener la visita activa para el overlay
  const activeVisita = activeId ? visitasCobrador.find(v => v.id === activeId) : null

  // Generar avatar del usuario
  const generarAvatar = (nombres: string, apellidos: string) => {
    return nombres.charAt(0) + (apellidos?.charAt(0) || '');
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-600 font-medium">Cargando sesión...</p>
        </div>
      </div>
    );
  }

  if (!userSession) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 relative">
      {/* Fondo arquitectónico ultra sutil */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_800px_at_100%_200px,#cbd5e1_0,transparent_100%)] opacity-40"></div>
      </div>

      <div className="relative z-10 w-full space-y-8 p-8">
        {/* Header con información del cobrador */}
        <header className="space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-slate-900/20">
                  {generarAvatar(userSession.nombres, userSession.apellidos)}
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white"></div>
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {userSession.nombres} {userSession.apellidos}
                </h2>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <span className="font-medium text-slate-700">Cobrador</span>
                  <span>•</span>
                  <span>{userSession.rutaAsignada || 'Ruta Norte'}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="p-2.5 rounded-xl bg-white/80 backdrop-blur-sm border border-slate-200 shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all relative group">
                <Bell className="h-5 w-5 text-slate-600 group-hover:text-slate-900" />
                <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
              </button>
              <button 
                onClick={handleLogout}
                className="p-2.5 rounded-xl bg-white/80 backdrop-blur-sm border border-slate-200 shadow-sm hover:bg-red-50 hover:border-red-100 hover:text-red-600 transition-all group"
                title="Cerrar sesión"
              >
                <LogOut className="h-5 w-5 text-slate-600 group-hover:text-red-600" />
              </button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4 pt-4 border-t border-slate-200">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar cliente, dirección..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent shadow-sm"
              />
            </div>
            <div className="flex gap-2">
              <button className="px-4 py-2 bg-white border border-slate-200 rounded-xl flex items-center gap-2 text-slate-600 font-medium hover:bg-slate-50 shadow-sm">
                <Filter className="h-4 w-4" />
                <span>Filtros</span>
              </button>
              <button 
                onClick={() => setShowHistory(!showHistory)}
                className={`px-4 py-2 border rounded-xl flex items-center gap-2 font-medium shadow-sm transition-colors ${
                  showHistory 
                    ? 'bg-slate-900 text-white border-slate-900' 
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <History className="h-4 w-4" />
                <span className="hidden md:inline">{showHistory ? 'Ver Ruta' : 'Historial'}</span>
              </button>
            </div>
          </div>
        </header>

        {/* Stats rápidos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-2xl bg-white/80 backdrop-blur-sm border border-slate-200 p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 group">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-slate-100 group-hover:bg-slate-200 transition-colors">
                <DollarSign className="h-5 w-5 text-slate-900" />
              </div>
              <span className="text-sm font-bold text-slate-600">Mi Recaudo</span>
            </div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              ${cajaRuta.recaudoTotal.toLocaleString('es-CO')}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-slate-900 rounded-full transition-all duration-1000"
                  style={{ width: `${cajaRuta.progresoMeta}%` }}
                />
              </div>
              <span className="text-[10px] font-bold text-slate-400">
                {Math.round(cajaRuta.progresoMeta)}%
              </span>
            </div>
          </div>
          <div className="rounded-2xl bg-white/80 backdrop-blur-sm border border-slate-200 p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 group">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-orange-50 group-hover:bg-orange-100 transition-colors">
                <Receipt className="h-5 w-5 text-orange-600" />
              </div>
              <span className="text-sm font-bold text-slate-600">Gastos</span>
            </div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              ${cajaRuta.gastosOperativos.toLocaleString('es-CO')}
            </div>
            <p className="text-xs text-slate-400 mt-1 font-medium">Registrados hoy</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-6">
            {/* Barra de progreso de meta */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <div className="flex items-center justify-between text-sm text-slate-600 mb-2">
                <span className="font-bold">Progreso de meta diaria</span>
                <span className="font-bold text-slate-900">{Math.round(cajaRuta.progresoMeta)}%</span>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-slate-900 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${cajaRuta.progresoMeta}%` }}
                ></div>
              </div>
            </div>

            {/* Lista de visitas */}
            <div>
              <div className="flex flex-col gap-4 mb-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-lg">
                    {showHistory ? 'Histórico de Rutas' : 'Ruta de hoy'}
                  </h3>
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
                  items={visitasCobrador.map(v => v.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-3">
                    {visitasCobrador
                      .filter(v => v.estado !== 'pagado')
                      .map((visita) => (
                        <SortableVisita
                          key={visita.id}
                          visita={visita}
                          isSelected={visitaSeleccionada === visita.id}
                          onSelect={(id) => setVisitaSeleccionada(id === visitaSeleccionada ? null : id)}
                          onShare={handleCompartirRecibo}
                          getEstadoClasses={getEstadoClasses}
                          getPrioridadColor={getPrioridadColor}
                        />
                      ))}
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
                  <div className="space-y-3 opacity-60 grayscale hover:opacity-100 hover:grayscale-0 transition-all">
                    {visitasCobrador
                      .filter(v => v.estado === 'pagado')
                      .map((visita) => (
                        <SortableVisita
                          key={visita.id}
                          visita={visita}
                          isSelected={false}
                          onSelect={() => {}}
                          onShare={handleCompartirRecibo}
                          getEstadoClasses={getEstadoClasses}
                          getPrioridadColor={getPrioridadColor}
                        />
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Floating Action Buttons (Restored) */}
        <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
          {/* Actions Menu */}
          <div className={`flex flex-col gap-3 transition-all duration-200 origin-bottom-right ${isFabOpen ? 'scale-100 opacity-100' : 'scale-0 opacity-0 hidden'}`}>
            <button 
              onClick={() => setShowExpenseModal(true)}
              className="flex items-center gap-3 pr-1"
            >
              <span className="bg-slate-900 text-white text-xs font-bold px-2 py-1 rounded-lg shadow-lg">Reg. Gasto</span>
              <div className="p-3 rounded-full bg-orange-500 text-white shadow-lg shadow-orange-500/30 hover:bg-orange-600 transition-all">
                <Receipt className="h-5 w-5" />
              </div>
            </button>
            <button 
              onClick={() => setShowBaseRequestModal(true)}
              className="flex items-center gap-3 pr-1"
            >
              <span className="bg-slate-900 text-white text-xs font-bold px-2 py-1 rounded-lg shadow-lg">Pedir Base</span>
              <div className="p-3 rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 hover:bg-emerald-600 transition-all">
                <Wallet className="h-5 w-5" />
              </div>
            </button>
            <button 
              onClick={() => setShowNewClientModal(true)}
              className="flex items-center gap-3 pr-1"
            >
              <span className="bg-slate-900 text-white text-xs font-bold px-2 py-1 rounded-lg shadow-lg">Crear Cliente</span>
              <div className="p-3 rounded-full bg-blue-500 text-white shadow-lg shadow-blue-500/30 hover:bg-blue-600 transition-all">
                <UserPlus className="h-5 w-5" />
              </div>
            </button>
          </div>

          {/* Main Toggle Button */}
          <button
            onClick={() => setIsFabOpen(!isFabOpen)}
            className={`p-4 rounded-full shadow-xl transition-all duration-300 ${
              isFabOpen 
                ? 'bg-slate-900 text-white rotate-45' 
                : 'bg-blue-600 text-white hover:bg-blue-700 hover:scale-105'
            }`}
          >
            <Plus className="h-6 w-6" />
          </button>
        </div>

        {/* Modales (Implementación simplificada para el ejemplo) */}
        {/* Modal de Pagos */}
        {showPaymentModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-slate-900">Registrar Pago</h3>
                  <button 
                    onClick={() => setShowPaymentModal(false)}
                    className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                
                <div className="space-y-6">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-sm text-slate-500 mb-1">Cliente</p>
                    <p className="font-bold text-slate-900 text-lg">Carlos Rodríguez</p>
                    <p className="text-xs text-slate-400">Cuota esperada: $125.000</p>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Monto Recibido</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-6 w-6 text-slate-400" />
                      <input 
                        type="number" 
                        className="w-full pl-10 pr-4 py-4 bg-white border-2 border-slate-200 rounded-xl focus:border-slate-900 focus:ring-0 font-bold text-2xl text-slate-900 placeholder:text-slate-300"
                        placeholder="0"
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {[10000, 20000, 50000, 100000].map(amount => (
                      <button 
                        key={amount}
                        className="py-2 px-1 rounded-lg bg-slate-50 border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 hover:border-slate-300"
                      >
                        +${(amount/1000).toFixed(0)}k
                      </button>
                    ))}
                  </div>

                  <button 
                    onClick={() => handleRegistrarPago('temp-id', 125000)}
                    className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl shadow-lg shadow-slate-900/20 hover:bg-slate-800 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="h-5 w-5" />
                    Confirmar Pago
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Gastos */}
        {showExpenseModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-slate-900">Registrar Gasto</h3>
                  <button 
                    onClick={() => setShowExpenseModal(false)}
                    className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Concepto</label>
                    <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-slate-900 focus:ring-0 font-medium text-slate-900">
                      <option>Combustible</option>
                      <option>Alimentación</option>
                      <option>Reparación Moto</option>
                      <option>Papelería</option>
                      <option>Otros</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Monto</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <input 
                        type="number" 
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-slate-900 focus:ring-0 font-bold text-slate-900"
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Comprobante (Opcional)</label>
                    <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center text-slate-400 hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer">
                      <Camera className="h-8 w-8 mb-2" />
                      <span className="text-xs font-bold">Tomar foto</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleRegistrarGasto('Combustible', 35000)}
                    className="w-full bg-slate-900 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-slate-900/20 hover:bg-slate-800 active:scale-[0.98] transition-all"
                  >
                    Guardar Gasto
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Solicitud de Base */}
        {showBaseRequestModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-slate-900">Solicitar Base</h3>
                  <button 
                    onClick={() => setShowBaseRequestModal(false)}
                    className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Monto Solicitado</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <input 
                        type="number" 
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-slate-900 focus:ring-0 font-bold text-slate-900"
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Motivo / Descripción</label>
                    <textarea 
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-slate-900 focus:ring-0 font-medium text-slate-900 resize-none"
                      rows={3}
                      placeholder="Ej: Para préstamo cliente X..."
                    ></textarea>
                  </div>
                  <button 
                    onClick={() => handleSolicitarBase(50000, 'Solicitud manual')}
                    className="w-full bg-slate-900 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-slate-900/20 hover:bg-slate-800 active:scale-[0.98] transition-all"
                  >
                    Enviar Solicitud
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default VistaCobrador