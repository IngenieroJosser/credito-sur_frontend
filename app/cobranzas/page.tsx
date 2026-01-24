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
  Camera
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

const VistaCobradorPage = () => {
  const [userSession, setUserSession] = useState<UserSession | null>(null)
  const [visitaSeleccionada, setVisitaSeleccionada] = useState<string | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [showBaseRequestModal, setShowBaseRequestModal] = useState(false)
  const [showNewClientModal, setShowNewClientModal] = useState(false)
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
    // Ordenar según el orden actual
    return visitasOrden
      .map(id => filtradas.find(v => v.id === id))
      .filter((v): v is VisitaRuta => v !== undefined)
  }, [visitasBase, visitasOrden])

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

          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between pt-4 border-t border-slate-200">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700 tracking-wide font-bold border border-slate-200">
                <Wallet className="h-3.5 w-3.5" />
                <span>{userSession.rutaAsignada || 'Ruta Norte'} • {userSession.zona || 'Zona Centro'}</span>
              </div>
              <div>
                <h1 className="text-4xl font-light text-slate-900 tracking-tight">
                  Mi Ruta <span className="font-bold text-slate-900">del Día</span>
                </h1>
                <p className="mt-2 text-sm text-slate-500 max-w-2xl font-medium">
                  Gestiona tus visitas, registra pagos y mantén el control de tu ruta. Los clientes pagados se archivan automáticamente.
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Stats rápidos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

          <div className="rounded-2xl bg-white/80 backdrop-blur-sm border border-slate-200 p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 group">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-emerald-50 group-hover:bg-emerald-100 transition-colors">
                <Wallet className="h-5 w-5 text-emerald-600" />
              </div>
              <span className="text-sm font-bold text-slate-600">Efectivo Real</span>
            </div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              ${cajaRuta.efectivoDisponible.toLocaleString('es-CO')}
            </div>
            <p className="text-xs text-slate-400 mt-1 font-medium">Disponible en caja</p>
          </div>

          <div className="rounded-2xl bg-white/80 backdrop-blur-sm border border-slate-200 p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 group">
             <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-blue-50 group-hover:bg-blue-100 transition-colors">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <span className="text-sm font-bold text-slate-600">Clientes</span>
            </div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {visitasCobrador.filter(v => v.estado === 'pendiente').length} / {visitasCobrador.length}
            </div>
            <p className="text-xs text-slate-400 mt-1 font-medium">Visitas pendientes</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
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
            <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="font-bold text-slate-900">Visitas Programadas</h3>
                <span className="text-xs font-bold text-slate-500 bg-white px-2 py-1 rounded-md border border-slate-200">
                  {visitasCobrador.length} Total
                </span>
              </div>
              <div className="p-6">
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
                    <div className="space-y-3">
                      {visitasCobrador
                        .filter(v => v.estado !== 'pagado')
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
                      
                      {visitasCobrador.filter(v => v.estado !== 'pagado').length === 0 && (
                        <div className="text-center py-12">
                          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 mb-4">
                            <CheckCircle2 className="h-6 w-6 text-slate-400" />
                          </div>
                          <h3 className="text-sm font-bold text-slate-900">¡Todo al día!</h3>
                          <p className="text-xs text-slate-500 mt-1">No hay visitas pendientes en tu ruta</p>
                        </div>
                      )}
                    </div>
                  </SortableContext>

                  <DragOverlay>
                    {activeVisita && (
                      <div className="rounded-2xl border-2 border-slate-900 bg-white shadow-xl rotate-2 scale-105">
                        <div className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <GripVertical className="h-5 w-5 text-slate-900" />
                            <span className="text-sm font-bold text-slate-900">{activeVisita.cliente}</span>
                          </div>
                          <div className="text-xs text-slate-500">Arrastrando...</div>
                        </div>
                      </div>
                    )}
                  </DragOverlay>
                </DndContext>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Desktop Actions */}
            <div className="hidden lg:grid grid-cols-2 gap-3">
              <button 
                onClick={() => setShowExpenseModal(true)}
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-white/80 backdrop-blur-sm border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 hover:bg-slate-50 transition-all group"
              >
                <div className="p-2 rounded-full bg-orange-50 text-orange-600 group-hover:bg-orange-100 transition-colors">
                  <Receipt className="h-5 w-5" />
                </div>
                <span className="text-sm font-bold text-slate-700 group-hover:text-slate-900">Gasto</span>
              </button>

              <button 
                onClick={() => setShowBaseRequestModal(true)}
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-white/80 backdrop-blur-sm border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 hover:bg-slate-50 transition-all group"
              >
                <div className="p-2 rounded-full bg-blue-50 text-blue-600 group-hover:bg-blue-100 transition-colors">
                  <DollarSign className="h-5 w-5" />
                </div>
                <span className="text-sm font-bold text-slate-700 group-hover:text-slate-900">Base</span>
              </button>

              <button 
                onClick={() => setShowNewClientModal(true)}
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-white/80 backdrop-blur-sm border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 hover:bg-slate-50 transition-all group"
              >
                <div className="p-2 rounded-full bg-purple-50 text-purple-600 group-hover:bg-purple-100 transition-colors">
                  <UserPlus className="h-5 w-5" />
                </div>
                <span className="text-sm font-bold text-slate-700 group-hover:text-slate-900">Cliente</span>
              </button>
              
               <button 
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-white/80 backdrop-blur-sm border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 hover:bg-slate-50 transition-all group"
              >
                 <div className="p-2 rounded-full bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100 transition-colors">
                  <Calculator className="h-5 w-5" />
                </div>
                <span className="text-sm font-bold text-slate-700 group-hover:text-slate-900">Cuadre</span>
              </button>
            </div>

            {/* Mi Caja de Ruta */}
            <div className="rounded-2xl bg-slate-900 p-6 text-white shadow-lg shadow-slate-900/20">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-white/10">
                    <Wallet className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold">Mi Caja</h3>
                    <p className="text-xs text-slate-400">Balance actual</p>
                  </div>
                </div>
                <button className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                  <RefreshCw className="h-4 w-4 text-slate-400" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <div className="text-xs text-slate-400 mb-1">Recaudo total</div>
                    <div className="text-lg font-bold text-white">${cajaRuta.recaudoTotal.toLocaleString('es-CO')}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <div className="text-xs text-red-200 mb-1">Mis Gastos</div>
                    <div className="text-lg font-bold text-red-100">-${cajaRuta.gastosOperativos.toLocaleString('es-CO')}</div>
                  </div>
                </div>
                
                <div className="pt-4 border-t border-white/10">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-slate-300">Saldo neto</span>
                    <span className="text-2xl font-bold tracking-tight">${cajaRuta.saldoNeto.toLocaleString('es-CO')}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Efectivo disponible</span>
                    <span>${cajaRuta.efectivoDisponible.toLocaleString('es-CO')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Mis Movimientos Recientes */}
            <div className="rounded-2xl bg-white/80 backdrop-blur-sm border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-slate-900">Movimientos</h3>
                <button className="text-xs font-bold text-slate-900 hover:text-slate-700 hover:underline">
                  Ver todo
                </button>
              </div>
              
              <div className="space-y-4">
                {operacionesCobrador.slice(0, 4).map((op) => (
                  <div key={op.id} className="flex items-center justify-between group cursor-pointer hover:bg-slate-50 p-2 rounded-lg transition-colors -mx-2">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${
                        op.tipo === 'pago' ? 'bg-emerald-50 text-emerald-600' :
                        op.tipo === 'gasto' ? 'bg-red-50 text-red-600' :
                        'bg-blue-50 text-blue-600'
                      }`}>
                        {op.tipo === 'pago' ? <DollarSign className="h-4 w-4" /> :
                         op.tipo === 'gasto' ? <Receipt className="h-4 w-4" /> :
                         <CreditCard className="h-4 w-4" />}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-900 group-hover:text-slate-700 transition-colors">{op.descripcion}</div>
                        <div className="text-xs text-slate-500">{op.hora}</div>
                      </div>
                    </div>
                    <div className={`text-sm font-bold ${
                      op.tipo === 'pago' ? 'text-emerald-600' :
                      op.tipo === 'gasto' ? 'text-red-600' :
                      'text-blue-600'
                    }`}>
                      {op.tipo === 'pago' ? '+' : '-'}${op.monto.toLocaleString('es-CO')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Botones flotantes de acción */}
        <div className="fixed bottom-20 right-4 flex flex-col gap-2">
          <button 
            onClick={() => setShowExpenseModal(true)}
            className="flex items-center justify-center w-12 h-12 rounded-full bg-slate-800 text-white shadow-lg hover:bg-slate-900 transition-colors"
            title="Registrar gasto operativo"
          >
            <Receipt className="h-5 w-5" />
          </button>
          <button 
            onClick={() => setShowNewClientModal(true)}
            className="flex items-center justify-center w-12 h-12 rounded-full bg-slate-900 text-white shadow-lg hover:bg-slate-800 transition-colors"
            title="Nuevo cliente"
          >
            <UserPlus className="h-5 w-5" />
          </button>
          <button 
            onClick={() => setShowPaymentModal(true)}
            className="flex items-center justify-center w-14 h-14 rounded-full bg-[#fb851b] text-white shadow-lg hover:bg-amber-600 transition-colors"
            title="Registrar pago"
          >
            <Plus className="h-6 w-6" />
          </button>
        </div>

        {/* Footer con info de sesión */}
        <footer className="mt-4 flex items-center justify-between rounded-full bg-slate-900 px-4 py-2 text-[11px] text-slate-200">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              {userSession.nombres} • {visitasCobrador.filter(v => v.estado !== 'pagado').length} visitas pendientes
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Smartphone className="h-3 w-3 text-slate-400" />
            <span>{userSession.rutaAsignada || 'Ruta Norte'}</span>
          </div>
        </footer>

        {/* Modal de registro de pago */}
        {showPaymentModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-900">Registrar Pago</h3>
                <button onClick={() => setShowPaymentModal(false)}>
                  <X className="h-5 w-5 text-slate-400 hover:text-slate-600" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Monto pagado</label>
                  <input 
                    type="number"
                    className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900 transition-all font-medium text-slate-900"
                    placeholder="Ej: 125000"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Método de pago</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button className="p-3 border border-slate-200 rounded-xl text-center hover:bg-slate-50 text-slate-600 font-medium transition-colors">
                      Efectivo
                    </button>
                    <button className="p-3 border border-slate-200 rounded-xl text-center hover:bg-slate-50 text-slate-600 font-medium transition-colors">
                      Transferencia
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Comentario (opcional)</label>
                  <textarea 
                    className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900 transition-all text-slate-900"
                    rows={2}
                    placeholder="Ej: Cliente pagó completo"
                  />
                </div>
              </div>
              
              <div className="flex space-x-3 mt-6">
                <button 
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 py-3 border border-slate-200 rounded-xl text-slate-700 font-bold hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => handleRegistrarPago(visitaSeleccionada!, 125000)}
                  className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 shadow-lg shadow-slate-900/20 transition-all"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de registro de gasto */}
        {showExpenseModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm transition-all duration-300">
            <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl scale-100 opacity-100 transition-all">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Registrar Gasto</h3>
                  <p className="text-sm text-gray-500">Nuevo gasto operativo de ruta</p>
                </div>
                <button 
                  onClick={() => setShowExpenseModal(false)}
                  className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">Descripción</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FileText className="h-5 w-5 text-gray-400" />
                    </div>
                    <input 
                      type="text"
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#08557f]/20 focus:border-[#08557f] transition-all outline-none"
                      placeholder="Ej: Combustible, almuerzo..."
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">Monto</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <DollarSign className="h-5 w-5 text-gray-400" />
                    </div>
                    <input 
                      type="number"
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#08557f]/20 focus:border-[#08557f] transition-all outline-none"
                      placeholder="0"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">Comprobante</label>
                  <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-[#08557f]/50 hover:bg-[#08557f]/5 transition-all cursor-pointer group">
                    <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-[#08557f]/10 transition-colors">
                      <Camera className="h-5 w-5 text-gray-400 group-hover:text-[#08557f]" />
                    </div>
                    <div className="text-sm font-medium text-gray-700 group-hover:text-[#08557f]">Subir foto</div>
                    <div className="text-xs text-gray-400 mt-1">Opcional</div>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3 mt-8">
                <button 
                  onClick={() => setShowExpenseModal(false)}
                  className="flex-1 py-3 px-4 bg-white border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 hover:border-gray-300 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => handleRegistrarGasto('Combustible', 25000)}
                  className="flex-1 py-3 px-4 bg-[#08557f] text-white rounded-xl font-medium shadow-lg shadow-[#08557f]/20 hover:bg-[#063a58] hover:shadow-xl hover:-translate-y-0.5 transition-all"
                >
                  Registrar Gasto
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
        {/* Modal de Pago */}
        {showPaymentModal && visitaSeleccionada && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-slate-900">Registrar Pago</h3>
                  <button 
                    onClick={() => setShowPaymentModal(false)}
                    className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                
                <div className="space-y-6">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <p className="text-sm text-slate-500 font-medium mb-1">Cliente</p>
                    <p className="text-base font-bold text-slate-900">
                      {visitasCobrador.find(v => v.id === visitaSeleccionada)?.cliente}
                    </p>
                    <div className="flex justify-between mt-3 pt-3 border-t border-slate-200">
                      <div>
                        <p className="text-xs text-slate-500">Cuota Esperada</p>
                        <p className="text-sm font-bold text-slate-900">
                          {formatCurrency(visitasCobrador.find(v => v.id === visitaSeleccionada)?.montoCuota || 0)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500">Saldo Total</p>
                        <p className="text-sm font-bold text-slate-900">
                          {formatCurrency(visitasCobrador.find(v => v.id === visitaSeleccionada)?.saldoTotal || 0)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Monto Recibido
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <input 
                        type="number" 
                        autoFocus
                        className="w-full pl-10 pr-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:border-slate-900 focus:ring-0 text-lg font-bold text-slate-900 placeholder:text-slate-300"
                        placeholder="0"
                      />
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button className="px-3 py-1 bg-slate-100 text-xs font-bold text-slate-600 rounded-lg hover:bg-slate-200">
                        Completo
                      </button>
                      <button className="px-3 py-1 bg-slate-100 text-xs font-bold text-slate-600 rounded-lg hover:bg-slate-200">
                        Abono
                      </button>
                    </div>
                  </div>

                  <button 
                    onClick={() => {
                      // Simulación de pago
                      const visita = visitasCobrador.find(v => v.id === visitaSeleccionada);
                      if (visita) {
                        handleRegistrarPago(visita.id, visita.montoCuota);
                      }
                    }}
                    className="w-full bg-emerald-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="h-5 w-5" />
                    Confirmar Pago
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Nueva Solicitud (Base) */}
        {showBaseRequestModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-slate-900">Solicitar Dinero</h3>
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

export default VistaCobradorPage