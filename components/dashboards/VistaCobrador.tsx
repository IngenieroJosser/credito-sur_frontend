'use client'

/**
 * ============================================================================
 * VISTA OPERATIVA DE COBRANZA (VISTA COBRADOR)
 * ============================================================================
 * 
 * @description
 * Componente central para la operación de campo (Mobile First Design).
 * Gestiona el flujo de trabajo diario del cobrador:
 * 1. Planificación de Ruta (Drag & Drop).
 * 2. Registro de Gestión (Pagos, No Pagos, Reprogramaciones).
 * 3. Rendición de Cuentas (Cierre de Caja).
 * 
 * @architecture
 * - Utiliza `@dnd-kit` para listas ordenables táctiles.
 * - Maneja estado local complejo para funcionamiento Offline-First (simulado).
 * - Integra múltiples modales operativos dentro del mismo archivo para performance móvil.
 * 
 * @roles ['COBRADOR', 'ADMIN']
 * Nota: El Admin puede visualizar esta vista en modo "Solo Lectura" (ver rutas/page.tsx).
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  MapPin,
  RefreshCw,
  Wallet,
  CheckCircle2,
  History,
  UserPlus,
  Receipt,
  DollarSign,
  ChevronDown,
  X,
  CreditCard,
  Plus,
  ClipboardList,
  GripVertical,
  Calendar,
  Search,
  FileText as FileTextIcon,
  BarChart3,
  User,
  Target,
  ReceiptText,
} from 'lucide-react'
import { Sparkline } from '@/components/ui/PremiumCharts'
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
import { useRouter } from 'next/navigation'
import { RolUsuario } from '@/lib/types/autenticacion-type'
import { obtenerPerfil } from '@/services/autenticacion-service'
import { formatCurrency } from '@/lib/utils'
import { rutasService } from '@/services/rutas-service'
import { prestamosService } from '@/services/prestamos-service'
import { ExportButton } from '@/components/ui/ExportButton'
import NuevoClienteModal from '@/components/clientes/NuevoClienteModal'
import { VisitaRuta, EstadoVisita, PeriodoRuta, HistorialDia } from '@/lib/types/cobranza'
import { StaticVisitaItem, SortableVisita, Portal, MODAL_Z_INDEX, SeleccionClienteModal } from '@/components/dashboards/shared/CobradorElements'
import EstadoCuentaModal from '@/components/cobranza/EstadoCuentaModal'
import PagoModal from '@/components/dashboards/shared/PagoModal'
import CrearCreditoModal from '@/components/dashboards/shared/CrearCreditoModal'
import ReprogramarModal from '@/components/cobranza/ReprogramarModal'
import GastoModal from '@/components/dashboards/shared/GastoModal'
import BaseModal from '@/components/dashboards/shared/BaseModal'
import DetalleMoraModal from '@/components/cobranza/DetalleMoraModal'
import FloatingActionMenu, { FabAction } from '@/components/dashboards/shared/FloatingActionMenu'
import { offlineStore } from '@/lib/offline/offlineDb'
import { enqueuePago } from '@/lib/offline/offlineQueue'

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



const VistaCobrador = () => {
  const [userSession, setUserSession] = useState<UserSession | null>(null)
  const [visitaSeleccionada, setVisitaSeleccionada] = useState<string | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [pagoInitialIsAbono, setPagoInitialIsAbono] = useState(false)
  const [visitaPagoSeleccionadaId, setVisitaPagoSeleccionadaId] = useState<string | null>(null)
  
  const [showClienteInfoModal, setShowClienteInfoModal] = useState(false)
  const [visitaClienteSeleccionada, setVisitaClienteSeleccionada] = useState<VisitaRuta | null>(null)
  const [showEstadoCuentaModal, setShowEstadoCuentaModal] = useState(false)
  const [visitaEstadoCuentaSeleccionada, setVisitaEstadoCuentaSeleccionada] = useState<VisitaRuta | null>(null)
  
  const [showMoraModal, setShowMoraModal] = useState(false)
  const [visitaMoraSeleccionada, setVisitaMoraSeleccionada] = useState<VisitaRuta | null>(null)
  const [showNewClientModal, setShowNewClientModal] = useState(false)
  const [showReprogramModal, setShowReprogramModal] = useState(false)
  const [visitaReprogramar, setVisitaReprogramar] = useState<VisitaRuta | null>(null)
  const [showGastoModal, setShowGastoModal] = useState(false)
  const [showBaseModal, setShowBaseModal] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  
  // Nuevos estados para la refactorización
  const [showCreditModal, setShowCreditModal] = useState(false)
  const [isFabOpen, setIsFabOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const [periodoRutaFiltro, setPeriodoRutaFiltro] = useState<PeriodoRuta | 'TODOS'>('TODOS')
  const [selectedHistoryDate, setSelectedHistoryDate] = useState<string | null>(null)
  const [historyViewMode, setHistoryViewMode] = useState<'DAYS' | 'MONTHS'>('DAYS')

  const [rutaCompletada, setRutaCompletada] = useState(false)
  const [coordinadorToast, setCoordinadorToast] = useState<string | null>(null)
  const [showClientSelector, setShowClientSelector] = useState(false)
  const [pendingAction, setPendingAction] = useState<'CUENTA' | 'AGENDAR' | null>(null)

  const [isLoading, setIsLoading] = useState(true)

  const creditosPendientes = useMemo(
    () => [
      { id: 'CP-001', cliente: 'María Torres', monto: 850000, estado: 'Pendiente aprobación', fecha: 'Hoy' },
      { id: 'CP-002', cliente: 'Luis Pérez', monto: 1200000, estado: 'En revisión', fecha: 'Ayer' },
      { id: 'CP-003', cliente: 'Ana Gutiérrez', monto: 620000, estado: 'Pendiente aprobación', fecha: 'Ayer' },
    ],
    []
  )

  const router = useRouter();

  // Datos base - se cargan desde el backend
  const [visitasBase, setVisitasBase] = useState<VisitaRuta[]>([])

  const [visitasOrden, setVisitasOrden] = useState<string[]>([])

  const [operacionesCaja, setOperacionesCaja] = useState<OperacionCaja[]>([])

  const historialRutas = useMemo(() => ({
    '2024-01-05': {
      resumen: { recaudo: 450000, efectividad: 100, visitados: 19, total: 19 },
      visitas: [
        { ...visitasBase[0], id: 'H1-01', estado: 'pagado', montoCuota: 50000 },
        { ...visitasBase[1], id: 'H1-02', estado: 'pagado', montoCuota: 25000 },
        { ...visitasBase[2], id: 'H1-03', estado: 'ausente', montoCuota: 0 },
        { ...visitasBase[0], id: 'H1-04', cliente: 'Roberto Gómez', estado: 'pagado', montoCuota: 45000 },
      ] as VisitaRuta[]
    },
    '2024-01-06': {
      resumen: { recaudo: 520000, efectividad: 100, visitados: 20, total: 20 },
      visitas: [
         { ...visitasBase[3], id: 'H2-01', estado: 'pagado', montoCuota: 150000 },
         { ...visitasBase[0], id: 'H2-02', cliente: 'Lucía Méndez', estado: 'pagado', montoCuota: 60000 },
      ] as VisitaRuta[]
    },
    '2024-01-07': {
       resumen: { recaudo: 380000, efectividad: 85, visitados: 15, total: 17 },
       visitas: [
         { ...visitasBase[1], id: 'H3-01', estado: 'pagado', montoCuota: 30000 },
       ] as VisitaRuta[]
    }
  }), [visitasBase])

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
              SUPERVISOR: '/supervisor',
              COBRADOR: '/cobranzas',
              CONTADOR: '/contador/contable',
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

  // Cargar visitas reales desde el backend cuando el usuario está disponible
  useEffect(() => {
    if (!userSession?.id) return;

    const cargarVisitas = async () => {
      try {
        // Obtener rutas asignadas al cobrador
        const rutas = await rutasService.obtenerRutas({ cobradorId: userSession.id, limit: 10 });
        const ruta = rutas[0]; // Ruta principal del cobrador
        if (!ruta || !ruta.asignaciones) {
          setVisitasBase([]);
          setVisitasOrden([]);
          return;
        }

        // Construir visitas desde las asignaciones de la ruta
        const visitas: VisitaRuta[] = ruta.asignaciones.map((asig: any, idx: number) => {
          const cliente = asig.cliente || {};
          const prestamo = asig.prestamo || {};
          return {
            id: asig.id || `V-${idx}`,
            cliente: `${cliente.nombres || ''} ${cliente.apellidos || ''}`.trim() || 'Sin nombre',
            direccion: cliente.direccion || 'Sin dirección',
            telefono: cliente.telefono || '',
            horaSugerida: '',
            montoCuota: prestamo.valorCuota || prestamo.montoPendiente || 0,
            saldoTotal: prestamo.saldoPendiente || prestamo.montoTotal || 0,
            estado: (prestamo.diasMora > 0 ? 'en_mora' : prestamo.estado === 'PAGADO' ? 'pagado' : 'pendiente') as EstadoVisita,
            proximaVisita: 'Hoy',
            ordenVisita: idx + 1,
            prioridad: prestamo.diasMora > 15 ? 'alta' : prestamo.diasMora > 0 ? 'media' : 'baja',
            nivelRiesgo: prestamo.riesgo === 'ROJO' ? 'critico' : prestamo.riesgo === 'AMARILLO' ? 'moderado' : 'bajo',
            cobradorId: userSession.id,
            periodoRuta: (asig.frecuencia || 'DIA') as PeriodoRuta,
          };
        });

        setVisitasBase(visitas);
        setVisitasOrden(visitas.map(v => v.id));
      } catch (err) {
        console.error('Error cargando visitas de ruta:', err);
        // Fallback offline: cargar clientes y préstamos de IndexedDB
        try {
          const [offlineClientes, offlinePrestamos] = await Promise.all([
            offlineStore.getAll<any>('clientes'),
            offlineStore.getAll<any>('prestamos'),
          ]);
          if (offlineClientes.length > 0) {
            const visitasOffline: VisitaRuta[] = offlineClientes.slice(0, 30).map((c: any, idx: number) => {
              const prestamo = offlinePrestamos.find((p: any) => p.clienteId === c.id);
              return {
                id: c.id,
                cliente: `${c.nombres || ''} ${c.apellidos || ''}`.trim() || 'Sin nombre',
                direccion: c.direccion || 'Sin dirección',
                telefono: c.telefono || '',
                horaSugerida: '',
                montoCuota: prestamo?.saldoPendiente ? Math.round(prestamo.saldoPendiente / (prestamo.cantidadCuotas || 1)) : 0,
                saldoTotal: prestamo?.saldoPendiente || 0,
                estado: 'pendiente' as EstadoVisita,
                proximaVisita: 'Hoy',
                ordenVisita: idx + 1,
                prioridad: 'media' as const,
                nivelRiesgo: 'moderado' as const,
                cobradorId: userSession.id,
                periodoRuta: 'DIA' as PeriodoRuta,
              };
            });
            setVisitasBase(visitasOffline);
            setVisitasOrden(visitasOffline.map(v => v.id));
            return;
          }
        } catch { /* ignore */ }
        setVisitasBase([]);
        setVisitasOrden([]);
      }
    };

    cargarVisitas();
  }, [userSession?.id]);

  // Filtrar y ordenar visitas
  const visitasCobrador = useMemo(() => {
    const filtradas = visitasBase.filter(v => !userSession?.id || v.cobradorId === userSession.id)
    
    // Aplicar búsqueda
    const buscadas = filtradas.filter(v => 
      v.cliente.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.direccion.toLowerCase().includes(searchQuery.toLowerCase())
    )

    // Ordenar por Periodo (Mensual -> Quincenal -> Semanal -> Diario)
    const sorted = buscadas.sort((a, b) => {
        const priority: Record<string, number> = { 'MES': 0, 'QUINCENA': 1, 'SEMANA': 2, 'DIA': 3 };
        const pA = priority[a.periodoRuta] ?? 99;
        const pB = priority[b.periodoRuta] ?? 99;
        return pA - pB;
    });

    return sorted;
  }, [visitasBase, searchQuery])

  const exportarRutaDiariaCSV = useCallback(() => {
    const filas = visitasCobrador
      .filter((v) => v.periodoRuta === 'DIA' && v.estado !== 'pagado')
      .map((v) => {
        const cols = [
          v.ordenVisita,
          v.cliente,
          v.telefono,
          v.direccion,
          v.horaSugerida,
          v.estado,
          v.montoCuota,
          v.saldoTotal,
          v.proximaVisita,
        ]
        return cols
          .map((c) => String(c).replace(/\r?\n/g, ' ').replace(/"/g, '""'))
          .map((c) => `"${c}"`)
          .join(',')
      })

    const header = [
      'orden',
      'cliente',
      'telefono',
      'direccion',
      'hora_sugerida',
      'estado',
      'monto_cuota',
      'saldo_total',
      'proxima_visita',
    ].join(',')

    const csv = [header, ...filas].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = `ruta-diaria-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }, [visitasCobrador])

  const exportarRutaDiariaPDF = useCallback(() => {
    const data = visitasCobrador
      .filter((v) => v.periodoRuta === 'DIA' && v.estado !== 'pagado')

    const rows = data
      .map(
        (v) => `
          <tr>
            <td>${v.ordenVisita}</td>
            <td>${v.cliente}</td>
            <td>${v.telefono}</td>
            <td>${v.direccion}</td>
            <td>${v.horaSugerida}</td>
            <td>${v.estado}</td>
            <td style="text-align:right;">${formatCurrency(v.montoCuota)}</td>
          </tr>
        `
      )
      .join('')

    const html = `
      <html>
        <head>
          <title>Ruta diaria</title>
          <meta charset="utf-8" />
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; }
            h1 { font-size: 18px; margin: 0 0 4px; }
            .sub { color: #64748b; font-size: 12px; margin-bottom: 16px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #e2e8f0; padding: 8px; font-size: 12px; vertical-align: top; }
            th { background: #f8fafc; text-align: left; }
          </style>
        </head>
        <body>
          <h1>Ruta diaria</h1>
          <div class="sub">${new Date().toISOString().slice(0, 10)} • ${data.length} visitas</div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Cliente</th>
                <th>Teléfono</th>
                <th>Dirección</th>
                <th>Hora</th>
                <th>Estado</th>
                <th>Monto</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
          <script>
            window.onload = () => { window.print(); };
          </script>
        </body>
      </html>
    `

    const w = window.open('', '_blank', 'noopener,noreferrer')
    if (!w) return
    w.document.open()
    w.document.write(html)
    w.document.close()
  }, [visitasCobrador])

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

    const recaudoEsperado = visitasCobrador
      .filter(v => v.periodoRuta === 'DIA')
      .reduce((sum, v) => sum + (v.montoCuota || 0), 0)

    const eficiencia = recaudoEsperado > 0 
      ? Math.round((recaudoTotal / recaudoEsperado) * 100) 
      : 0

    return {
      recaudoTotal,
      recaudoEsperado,
      gastosOperativos,
      eficiencia,
      baseDisponible: baseSolicitada,
      saldoNeto: recaudoTotal - gastosOperativos,
      efectivoDisponible: recaudoTotal - gastosOperativos - baseSolicitada,
      cambioNecesario: 20000,
    }
  }, [operacionesCobrador, visitasCobrador])

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
    if (rutaCompletada) return
    setActiveId(event.active.id as string)
  }, [rutaCompletada])



  const handleGuardarReprogramacion = useCallback((fecha: string, motivo: string) => {
    if (!visitaReprogramar) return
    if (!fecha) return

    const formatearFechaISO = (iso: string) => {
      const [yyyy, mm, dd] = iso.split('-')
      if (!yyyy || !mm || !dd) return iso
      return `${dd}/${mm}`
    }

    setVisitasBase((prev) =>
      prev.map((v) => {
        if (v.id !== visitaReprogramar.id) return v
        return {
          ...v,
          estado: 'reprogramado',
          proximaVisita: formatearFechaISO(fecha),
        }
      })
    )

    console.log('Reprogramar visita', visitaReprogramar.id, fecha, motivo)
    setShowReprogramModal(false)
    setVisitaReprogramar(null)
  }, [visitaReprogramar])

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
    if (estado === 'pendiente') return 'bg-orange-50 text-orange-700 border-orange-100'
    if (estado === 'pagado') return 'bg-blue-50 text-blue-700 border-blue-100'
    if (estado === 'en_mora') return 'bg-orange-100 text-orange-800 border-orange-200'
    if (estado === 'ausente') return 'bg-gray-50 text-gray-600 border-gray-100'
    return 'bg-blue-50 text-blue-700 border-blue-100'
  }, [])

  const getPrioridadColor = useCallback((prioridad: 'alta' | 'media' | 'baja') => {
    if (prioridad === 'alta') return '#f97316'
    if (prioridad === 'media') return '#08557f'
    return '#94a3b8'
  }, [])

  const handleRegistrarPago = useCallback((visitaId: string, montoPagado: number, metodo: 'EFECTIVO' | 'TRANSFERENCIA', comprobante: File | null) => {
    console.log(`Registra pago de ${montoPagado} para visita ${visitaId} (${metodo})`, comprobante)
    setShowPaymentModal(false)
  }, [])

  const handleCompletarRuta = useCallback(() => {
    setRutaCompletada(true)
    setCoordinadorToast('Se notificó al coordinador: ruta diaria marcada como completada.')
    window.setTimeout(() => setCoordinadorToast(null), 4000)
  }, [])





  const handleAbrirClienteInfo = useCallback((visita: VisitaRuta) => {
    if (visita.estado === 'en_mora') {
      setVisitaMoraSeleccionada(visita)
      setShowMoraModal(true)
    } else {
      setVisitaClienteSeleccionada(visita)
      setShowClienteInfoModal(true)
    }
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
        <div className="absolute inset-0 bg-[radial-gradient(circle_800px_at_100%_200px,#08557f_0,transparent_100%)] opacity-20"></div>
      </div>

      <div className="relative w-full space-y-8 p-8">
        {coordinadorToast && (
          <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-800">
            {coordinadorToast}
          </div>
        )}

        {rutaCompletada && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
            Ruta del día completada. Las modificaciones están bloqueadas.
          </div>
        )}

        {/* Header con información del cobrador */}
        <header className="space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-12 h-12 bg-[#08557f] rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-[#08557f]/20">
                  {generarAvatar(userSession.nombres, userSession.apellidos)}
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-orange-500 rounded-full border-2 border-white"></div>
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
          </div>
        </header>

        {/* Stats rápidos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          
          {/* Tarjeta 1: Recaudo */}
          <div className="bg-white border border-slate-100 rounded-[2rem] p-6 hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500 group relative overflow-hidden">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center justify-center p-3 rounded-2xl bg-slate-50 text-slate-400 group-hover:text-[#08557f] group-hover:bg-blue-50 transition-colors border border-slate-100 shadow-sm">
                <DollarSign className="h-5 w-5" />
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center font-black text-[10px] px-3 py-1 rounded-full bg-emerald-50 text-emerald-600">
                  +12.5%
                </div>
                <Sparkline data={[10, 15, 12, 18, 22, 19, 25]} color="#08557f" height={30} />
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-3xl font-black text-slate-900 tracking-tighter">
                ${cajaRuta.recaudoTotal.toLocaleString('es-CO')}
              </div>
              <div className="text-[10px] font-bold text-slate-400 mt-1">
                Objetivo: ${cajaRuta.recaudoEsperado.toLocaleString('es-CO')}
              </div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] leading-none pt-1">
                Mi Recaudo
              </div>
            </div>
          </div>

          {/* Tarjeta 2: Efectividad */}
          <div className="bg-white border border-slate-100 rounded-[2rem] p-6 hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500 group relative overflow-hidden">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center justify-center p-3 rounded-2xl bg-slate-50 text-slate-400 group-hover:text-emerald-600 group-hover:bg-emerald-50 transition-colors border border-slate-100 shadow-sm">
                <Target className="h-5 w-5" />
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center font-black text-[10px] px-3 py-1 rounded-full bg-emerald-50 text-emerald-600">
                  ÓPTIMO
                </div>
                <Sparkline data={[40, 50, 45, 70, 85, 90, cajaRuta.eficiencia]} color="#10b981" height={30} />
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-3xl font-black text-slate-900 tracking-tighter">
                {cajaRuta.eficiencia}%
              </div>
              <div className="text-[10px] font-bold text-slate-400 mt-1">
                Pendiente: ${(Math.max(0, cajaRuta.recaudoEsperado - cajaRuta.recaudoTotal)).toLocaleString('es-CO')}
              </div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] leading-none pt-1">
                Efectividad
              </div>
            </div>
          </div>

          {/* Tarjeta 3: Gastos */}
          <div className="bg-white border border-slate-100 rounded-[2rem] p-6 hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500 group relative overflow-hidden">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center justify-center p-3 rounded-2xl bg-slate-50 text-slate-400 group-hover:text-rose-600 group-hover:bg-rose-50 transition-colors border border-slate-100 shadow-sm">
                <Receipt className="h-5 w-5" />
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center font-black text-[10px] px-3 py-1 rounded-full bg-rose-50 text-rose-600">
                  RUTA
                </div>
                <Sparkline data={[5, 10, 8, 15, 12, 20]} color="#f43f5e" height={30} />
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-3xl font-black text-slate-900 tracking-tighter">
                ${cajaRuta.gastosOperativos.toLocaleString('es-CO')}
              </div>
              <div className="text-[10px] font-bold text-slate-400 mt-1">
                Registrados hoy
              </div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] leading-none pt-1">
                Gastos
              </div>
            </div>
          </div>
        </div>

        {/* Créditos pendientes */}
        <div className="rounded-2xl bg-white/80 backdrop-blur-sm border border-slate-200 p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase">Créditos pendientes</div>
              <h3 className="text-lg font-bold text-slate-900">En revisión</h3>
            </div>
            <div className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100">
              {creditosPendientes.length} pendientes
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {creditosPendientes.map((credito) => (
              <div key={credito.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="text-xs font-bold text-slate-500">{credito.id}</div>
                <div className="mt-1 text-sm font-bold text-slate-900">{credito.cliente}</div>
                <div className="mt-2 text-sm text-slate-600">${credito.monto.toLocaleString('es-CO')}</div>
                <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-orange-50 text-orange-700 border border-orange-100 px-2 py-0.5 text-[10px] font-bold">
                  {credito.estado}
                </div>
                <div className="mt-2 text-[11px] text-slate-400">{credito.fecha}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-6">
            {/* Buscador y filtros */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 buscador-3d">
                  <Search className="icon h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Buscar cliente, dirección..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="buscador-3d-input"
                  />
                </div>
              </div>

            <div className="mt-4 border-t border-slate-100 pt-4 flex flex-wrap items-center gap-2 overflow-x-auto pb-1">

                  <ExportButton
                    label="Exportar Ruta"
                    onExportExcel={exportarRutaDiariaCSV}
                    onExportPDF={exportarRutaDiariaPDF}
                  />
                  <button 
                    onClick={() => setShowHistory(false)}
                    className={`px-4 py-2 border rounded-xl flex items-center gap-2 font-medium shadow-sm transition-colors ${
                      !showHistory 
                        ? 'bg-[#08557f] text-white border-[#08557f]' 
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <MapPin className="h-4 w-4" />
                    <span className="hidden md:inline">Mi Ruta</span>
                  </button>
                  <button 
                    onClick={() => setShowHistory(true)}
                    className={`px-4 py-2 border rounded-xl flex items-center gap-2 font-medium shadow-sm transition-colors ${
                      showHistory 
                        ? 'bg-[#08557f] text-white border-[#08557f]' 
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <History className="h-4 w-4" />
                    <span className="hidden md:inline">Historial</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCompletarRuta}
                    disabled={rutaCompletada}
                    className={`px-4 py-2 border rounded-xl flex items-center gap-2 font-bold shadow-sm transition-colors ${
                      rutaCompletada
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 opacity-70'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="hidden md:inline">Completar ruta</span>
                  </button>
            </div>
            </div>

            {/* Client Actions Bar (Appears when a client is selected) */}
            {/* Top Stats / Toolbar */}
            <div className="mb-6 space-y-4">
            {/* Top Toolbar (Compact) */}
            <div className="mb-6">
                <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
                     <button onClick={() => { setVisitaPagoSeleccionadaId(null); setShowPaymentModal(true); setPagoInitialIsAbono(false); }} className="flex-1 min-w-[max-content] bg-[#08557f]/5 text-[#08557f] border border-[#08557f]/10 px-4 py-3 rounded-xl flex items-center justify-center gap-2 font-bold shadow-sm active:scale-95 transition-all">
                         <DollarSign className="h-5 w-5" /> Pagar
                     </button>
                     <button onClick={() => { setVisitaPagoSeleccionadaId(null); setShowPaymentModal(true); setPagoInitialIsAbono(true); }} className="flex-1 min-w-[max-content] bg-orange-50 text-orange-700 border border-orange-200 px-4 py-3 rounded-xl flex items-center justify-center gap-2 font-bold shadow-sm active:scale-95 transition-all">
                         <RefreshCw className="h-5 w-5" /> Abonar
                     </button>
                     <button 
                        onClick={() => { 
                           setPendingAction('CUENTA');
                           setShowClientSelector(true); 
                        }} 
                        className="flex-1 min-w-[max-content] bg-white text-slate-700 border border-slate-200 px-4 py-3 rounded-xl flex items-center justify-center gap-2 font-bold shadow-sm active:scale-95 transition-all hover:bg-slate-50"
                     >
                         <FileTextIcon className="h-5 w-5 text-slate-400" /> Cuenta
                     </button>
                     <button 
                        onClick={() => { 
                           setPendingAction('AGENDAR');
                           setShowClientSelector(true); 
                        }} 
                        className="flex-1 min-w-[max-content] bg-white text-slate-700 border border-slate-200 px-4 py-3 rounded-xl flex items-center justify-center gap-2 font-bold shadow-sm active:scale-95 transition-all hover:bg-slate-50"
                     >
                         <Calendar className="h-5 w-5 text-slate-400" /> Agendar
                     </button>
                </div>
            </div>
            </div>

              {!showHistory && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Período de ruta</div>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {(
                        [
                          { key: 'TODOS' as const, label: 'Todo' },
                          { key: 'DIA' as const, label: 'Día' },
                          { key: 'SEMANA' as const, label: 'Semanal' },
                          { key: 'QUINCENA' as const, label: 'Quincenal' },
                          { key: 'MES' as const, label: 'Mensual' },
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
            {/* Lista de visitas */}
            <div>
              <div className="flex flex-col gap-4 mb-4">
                <div className="flex items-center justify-between">
                  {showHistory && (
                    <h3 className="font-bold text-slate-900 text-lg">Histórico de Rutas</h3>
                  )}
                  {!showHistory && (
                     <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-2 flex items-center justify-between bg-white border border-slate-200 p-2 rounded-xl shadow-sm">
                        <span className="mr-2">Niveles de Riesgo:</span>
                        <div className="flex gap-3">
                           <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-blue-600 ring-2 ring-blue-100"></div><span className="text-slate-700">Bajo</span></div>
                           <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-600 ring-2 ring-emerald-100"></div><span className="text-slate-700">Leve</span></div>
                           <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-orange-600 ring-2 ring-orange-100"></div><span className="text-slate-700">Moderado</span></div>
                           <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-700 ring-2 ring-red-100"></div><span className="text-slate-700">Crítico</span></div>
                        </div>
                     </div>
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
                  items={visitasOrden}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-6">
                    {(() => {
                      if (showHistory) {
                        const historyDates = Object.keys(historialRutas).sort().reverse(); // Newest first

                        return (
                          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                             {/* Improved Filter Tabs (Pills) */}
                             <div className="flex items-center gap-2 mb-2">
                               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-1">VISTA:</span>
                               <button 
                                 onClick={() => setHistoryViewMode('DAYS')}
                                 className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${
                                    historyViewMode === 'DAYS' 
                                    ? 'bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-900/20' 
                                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700'
                                 }`}
                               >
                                 Días
                               </button>
                               <button 
                                 onClick={() => setHistoryViewMode('MONTHS')}
                                 className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${
                                    historyViewMode === 'MONTHS' 
                                    ? 'bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-900/20' 
                                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700'
                                 }`}
                               >
                                 Meses
                               </button>
                             </div>

                             {/* Monthly Summary (ONLY in MONTHS mode) */}
                             {historyViewMode === 'MONTHS' && (
                               <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all relative overflow-hidden group cursor-pointer"
                                    onClick={() => setSelectedHistoryDate(selectedHistoryDate === 'SUMMARY' ? null : 'SUMMARY')}
                               >
                                  <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-full -mr-8 -mt-8 group-hover:scale-110 transition-transform duration-500"></div>
                                  <div className="flex items-start justify-between relative z-10">
                                    <div>
                                       <h4 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
                                         <BarChart3 className="w-5 h-5 text-slate-500" />
                                         Resumen Enero 2024
                                       </h4>
                                       <div className="text-sm font-medium text-slate-500 mt-1">Recaudo Total: <span className="text-slate-900 font-bold">$12.5M</span></div>
                                    </div>
                                    <div className={`p-2 rounded-full bg-slate-50 border border-slate-100 transition-transform ${selectedHistoryDate === 'SUMMARY' ? 'rotate-180 bg-slate-100' : ''}`}>
                                      <ChevronDown className="w-5 h-5 text-slate-400" />
                                    </div>
                                  </div>
                                  {selectedHistoryDate === 'SUMMARY' && (
                                     <div className="mt-4 pt-4 border-t border-slate-100 animate-in fade-in space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                           <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                              <div className="text-2xl font-bold text-slate-800">94%</div>
                                              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Efectividad Global</div>
                                           </div>
                                           <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                              <div className="text-2xl font-bold text-slate-800">450</div>
                                              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Visitas Totales</div>
                                           </div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 text-center text-xs text-slate-500">
                                          <div>
                                            <div className="font-bold text-slate-900">24</div>
                                            <div>Días</div>
                                          </div>
                                          <div>
                                            <div className="font-bold text-slate-900">441</div>
                                            <div>Pagos</div>
                                          </div>
                                          <div>
                                            <div className="font-bold text-emerald-600">98%</div>
                                            <div>Asistencia</div>
                                          </div>
                                        </div>
                                     </div>
                                  )}
                               </div>
                             )}

                             {/* Daily Routes List (Only in DAYS mode) */}
                             {historyViewMode === 'DAYS' && (
                                <div className="space-y-3">
                                    <h3 className="text-sm font-bold text-slate-500 uppercase px-1">Historial de Días</h3>
                                    {historyDates.map(date => {
                                       const data = (historialRutas as Record<string, HistorialDia>)[date]
                                       const isExpanded = selectedHistoryDate === date
                                       const [y, m, d] = date.split('-')
                                       const dateObj = new Date(parseInt(y), parseInt(m)-1, parseInt(d))
                                       const dayName = dateObj.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })
                                       
                                       // Detect completion
                                       const isCompleted = data.resumen.efectividad === 100 || data.visitas.every((v: VisitaRuta) => v.estado === 'pagado');

                                       return (
                                         <div key={date} 
                                              className={`rounded-2xl border transition-all overflow-hidden bg-white border-slate-200
                                                ${isExpanded ? 'ring-1 ring-slate-300 shadow-md' : 'shadow-sm'}
                                              `}
                                         >
                                           {/* Header (Clickable) */}
                                           <div 
                                             className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                                             onClick={() => setSelectedHistoryDate(isExpanded ? null : date)}
                                           >
                                             <div className="flex items-center gap-3">
                                                {/* Date Badge */}
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shadow-sm
                                                    ${isExpanded ? 'bg-[#08557f] text-white' : 'bg-slate-100 text-slate-600'}
                                                `}>
                                                   {d}
                                                </div>
                                                
                                                <div>
                                                   <div className="font-bold text-slate-900 capitalize flex items-center gap-2">
                                                      {dayName}
                                                      {isCompleted && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold uppercase border border-emerald-200">Completada</span>}
                                                   </div>
                                                   <div className="text-xs text-slate-500">
                                                      Recaudo: <b>${data.resumen.recaudo.toLocaleString('es-CO')}</b>
                                                   </div>
                                                </div>
                                             </div>
                                             <div className="flex items-center gap-3">
                                                <div className={`px-2 py-1 rounded-lg text-[10px] font-bold ${data.resumen.efectividad >= 90 ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-700'}`}>
                                                  {data.resumen.efectividad}%
                                                </div>
                                                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                             </div>
                                           </div>

                                           {/* Body (Expanded) */}
                                           {isExpanded && (
                                              <div className="border-t border-slate-100 bg-white p-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
                                                 <div className="flex justify-between text-xs font-bold text-slate-500 uppercase px-1">
                                                    <span>{data.visitas.length} Clientes Visitados</span>
                                                    <span>Detalle</span>
                                                 </div>
                                                 <div className="">
                                                    {data.visitas.map((visita: VisitaRuta) => (
                                                        <StaticVisitaItem 
                                                        key={visita.id}
                                                        visita={visita}
                                                        onSelect={() => {}} onVerCliente={handleAbrirClienteInfo}
                                                        getEstadoClasses={getEstadoClasses}
                                                        />
                                                    ))}
                                                 </div>
                                              </div>
                                           )}
                                         </div>
                                       )
                                    })}
                                </div>
                             )}
                          </div>
                        )
                      }

                      const noPagadas = visitasCobrador.filter(v => v.estado !== 'pagado')

                      const porPeriodo = {
                        DIA: noPagadas.filter(v => v.periodoRuta === 'DIA'),
                        SEMANA: noPagadas.filter(v => v.periodoRuta === 'SEMANA'),
                        QUINCENA: noPagadas.filter(v => v.periodoRuta === 'QUINCENA'),
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
                                  onSelect={(id) => setVisitaSeleccionada(id === visitaSeleccionada ? null : id)}
                                  onVerCliente={handleAbrirClienteInfo}
                                  getEstadoClasses={getEstadoClasses}
                                  disableSort={rutaCompletada}
                                  isSelected={visita.id === visitaSeleccionada}
                                >
                                  <div className="flex gap-2">
                                     <button 
                                       onClick={(e) => {
                                         e.stopPropagation()
                                         setVisitaPagoSeleccionadaId(visita.id)
                                         setPagoInitialIsAbono(false)
                                         setShowPaymentModal(true)
                                       }}
                                       className="flex-1 bg-[#08557f] text-white py-2.5 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 shadow-sm shadow-[#08557f]/20 active:scale-95 transition-all"
                                     >
                                       <DollarSign className="w-3.5 h-3.5" /> Pagar
                                     </button>
                                     <button 
                                       onClick={(e) => {
                                         e.stopPropagation()
                                         setVisitaPagoSeleccionadaId(visita.id)
                                         setPagoInitialIsAbono(true)
                                         setShowPaymentModal(true)
                                       }}
                                       className="flex-1 bg-orange-600 text-white py-2.5 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 shadow-sm shadow-orange-600/20 active:scale-95 transition-all"
                                     >
                                       <RefreshCw className="w-3.5 h-3.5" /> Abonar
                                     </button>
                                     <button 
                                       onClick={(e) => {
                                         e.stopPropagation()
                                         setVisitaEstadoCuentaSeleccionada(visita)
                                         setShowEstadoCuentaModal(true)
                                       }}
                                       className="p-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl active:scale-95 transition-all"
                                       title="Estado de Cuenta"
                                     >
                                       <FileTextIcon className="w-4 h-4" />
                                     </button>
                                     <button 
                                       onClick={(e) => {
                                         e.stopPropagation()
                                         setVisitaReprogramar(visita)
                                         setShowReprogramModal(true)
                                       }}
                                       className="p-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl active:scale-95 transition-all"
                                       title="Reagendar"
                                     >
                                       <Calendar className="w-4 h-4" />
                                     </button>
                                  </div>
                                </SortableVisita>
                              ))}
                            </div>
                          )}
                        </div>
                      )

                      if (periodoRutaFiltro === 'DIA') return renderSeccion('Ruta del día', porPeriodo.DIA)
                      if (periodoRutaFiltro === 'SEMANA') return renderSeccion('Ruta de la semana', porPeriodo.SEMANA)
                      if (periodoRutaFiltro === 'QUINCENA') return renderSeccion('Ruta quincenal', porPeriodo.QUINCENA)
                      if (periodoRutaFiltro === 'MES') return renderSeccion('Ruta del mes', porPeriodo.MES)

                      return (
                        <>
                          {renderSeccion('Ruta mensual', porPeriodo.MES)}
                          {renderSeccion('Ruta quincenal', porPeriodo.QUINCENA)}
                          {renderSeccion('Ruta semanal', porPeriodo.SEMANA)}
                          {renderSeccion('Ruta del día', porPeriodo.DIA)}
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
              {!showHistory && visitasCobrador.some(v => v.estado === 'pagado') && (
                <div className="mt-8">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-4 opacity-50">
                    <CheckCircle2 className="h-5 w-5" />
                    Completadas
                  </h3>
                  <div className="relative z-10 pointer-events-auto space-y-3 opacity-60 grayscale hover:opacity-100 hover:grayscale-0 transition-all">
                    {visitasCobrador
                      .filter(v => v.estado === 'pagado' && (periodoRutaFiltro === 'TODOS' || v.periodoRuta === periodoRutaFiltro))
                      .map((visita) => (
                        <StaticVisitaItem
                          key={visita.id}
                          visita={visita}
                          onSelect={(id) => setVisitaSeleccionada(id === visitaSeleccionada ? null : id)}
                          onVerCliente={handleAbrirClienteInfo}
                          getEstadoClasses={getEstadoClasses}
                        />
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Floating Action Buttons */}
        <FloatingActionMenu actions={[
          { label: 'Crear Crédito', icon: <CreditCard className="h-5 w-5" />, onClick: () => setShowCreditModal(true) },
          { label: 'Nuevo Cliente', icon: <UserPlus className="h-5 w-5" />, onClick: () => setShowNewClientModal(true) },
          { label: 'Registrar abono', icon: <RefreshCw className="h-5 w-5" />, color: 'orange', onClick: () => { setVisitaPagoSeleccionadaId(null); setPagoInitialIsAbono(true); setShowPaymentModal(true); } },
          { label: 'Registrar pago', icon: <DollarSign className="h-5 w-5" />, onClick: () => { setVisitaPagoSeleccionadaId(null); setPagoInitialIsAbono(false); setShowPaymentModal(true); } },
          { label: 'Solicitudes', icon: <ClipboardList className="h-5 w-5" />, onClick: () => router.push('/cobranzas/solicitudes') },
          { label: 'Pedir Base', icon: <Wallet className="h-5 w-5" />, color: 'emerald', onClick: () => setShowBaseModal(true) },
          { label: 'Gastos', icon: <ReceiptText className="h-5 w-5" />, color: 'rose', onClick: () => setShowGastoModal(true) },
        ] as FabAction[]} />


        {showClienteInfoModal && (
          <Portal>
            <div
              className="fixed inset-0 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
              style={{ zIndex: MODAL_Z_INDEX }}
              onClick={() => {
                setShowClienteInfoModal(false)
                setVisitaClienteSeleccionada(null)
              }}
            >
              <div
                className="w-full max-w-md bg-white rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-slate-900">Cliente</h3>
                    <button
                      onClick={() => {
                        setShowClienteInfoModal(false)
                        setVisitaClienteSeleccionada(null)
                      }}
                      className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="space-y-6">
                    {/* Header Info */}
                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-slate-100 rounded-full -mr-16 -mt-16"></div>
                      <div className="relative z-10 flex items-center gap-5">
                        <div className="h-24 w-24 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-300 font-bold overflow-hidden">
                          <User className="w-12 h-12" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-2xl font-bold text-slate-900 leading-tight">
                            {visitaClienteSeleccionada?.cliente || 'Sin nombre'}
                          </h4>
                          <div className="flex items-center gap-2 mt-2">
                             <span className="bg-[#08557f] text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter">Activo</span>
                             <span className="text-slate-400 text-xs font-bold">{visitaClienteSeleccionada?.id}</span>
                          </div>
                        </div>
                      </div>
                    </div>



                    {/* Detailed Info Sections */}
                    <div className="space-y-4">
                       {/* Personal Data */}
                       <div className="space-y-3">
                          <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Información de contacto</h5>
                          <div className="grid grid-cols-1 gap-3">
                             <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm">
                                <div className="text-xs text-slate-500 font-bold mb-1 uppercase tracking-tighter">Dirección Exacta</div>
                                <div className="text-slate-900 font-bold">{visitaClienteSeleccionada?.direccion || 'No registrada'}</div>
                             </div>
                             <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm">
                                <div className="text-xs text-slate-500 font-bold mb-1 uppercase tracking-tighter">Punto de Referencia</div>
                                <div className="text-slate-900 font-medium italic">{visitaClienteSeleccionada?.direccion || 'Casa rejas blancas, frente al parque.'}</div>
                             </div>
                          </div>
                       </div>

                       {/* Financial Summary */}
                       <div className="space-y-3 pt-2">
                          <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Resumen Financiero</h5>
                          <div className="grid grid-cols-2 gap-3">
                             <div className="bg-orange-50 border border-orange-100 p-4 rounded-2xl shadow-sm">
                                <div className="text-xs text-orange-600 font-bold mb-1 uppercase tracking-tighter">Por Entregar</div>
                                <div className="text-orange-900 font-black text-xl">${visitaClienteSeleccionada?.saldoTotal.toLocaleString('es-CO')}</div>
                             </div>
                             <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl shadow-sm text-right">
                                <div className="text-xs text-emerald-600 font-bold mb-1 uppercase tracking-tighter">Recaudado</div>
                                <div className="text-emerald-900 font-black text-xl">$0</div>
                             </div>
                          </div>
                          <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex justify-between items-center">
                             <div>
                                <div className="text-[10px] text-slate-500 font-bold uppercase">Cuota Proyectada</div>
                                <div className="text-slate-900 font-bold text-lg">${visitaClienteSeleccionada?.montoCuota.toLocaleString('es-CO')}</div>
                             </div>
                             <div className="text-right">
                                <div className="text-[10px] text-slate-500 font-bold uppercase">Próxima Fecha</div>
                                <div className="text-[#08557f] font-bold">{visitaClienteSeleccionada?.proximaVisita}</div>
                             </div>
                          </div>
                       </div>
                    </div>

                    <div className="pt-4 mt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowClienteInfoModal(false)
                          setVisitaClienteSeleccionada(null)
                        }}
                        className="w-full rounded-2xl bg-[#08557f] py-4 text-sm font-black text-white hover:bg-[#063a58] shadow-xl shadow-[#08557f]/20 transition-all uppercase tracking-widest"
                      >
                        Cerrar Detalles
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Portal>
        )}

        {/* Modales Compartidos */}
        <PagoModal
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false)
            setVisitaPagoSeleccionadaId(null)
          }}
          onConfirm={(data) => {
            handleRegistrarPago(data.clienteId, data.monto, 'EFECTIVO', data.comprobante)
          }}
          initialIsAbono={pagoInitialIsAbono}
          initialVisita={visitaPagoSeleccionadaId ? visitasCobrador.find(v => v.id === visitaPagoSeleccionadaId) : undefined}
        />

        <CrearCreditoModal
          isOpen={showCreditModal}
          onClose={() => setShowCreditModal(false)}
          onConfirm={(data) => {
            console.log('Crédito creado:', data)
            setShowCreditModal(false)
          }}
        />

        {showNewClientModal && (
          <NuevoClienteModal
            onClose={() => setShowNewClientModal(false)}
            onClienteCreado={(nuevo) => {
              console.log('Nuevo cliente creado:', nuevo)
              setShowNewClientModal(false)
            }}
          />
        )}


        {showMoraModal && visitaMoraSeleccionada && (
          <DetalleMoraModal
            cuenta={{
              id: visitaMoraSeleccionada.id,
              numeroPrestamo: visitaMoraSeleccionada.id, // Mock
              cliente: {
                nombre: visitaMoraSeleccionada.cliente,
                documento: 'N/A', // Not in VisitaRuta
                telefono: visitaMoraSeleccionada.telefono,
                direccion: visitaMoraSeleccionada.direccion
              },
              diasMora: 15, // Mock default values
              montoMora: visitaMoraSeleccionada.saldoTotal - visitaMoraSeleccionada.montoCuota, // Estimate
              montoTotalDeuda: visitaMoraSeleccionada.saldoTotal,
              cuotasVencidas: 1, // Mock
              ruta: userSession?.rutaAsignada || 'Ruta Asignada',
              cobrador: userSession?.nombres || 'Cobrador',
              nivelRiesgo: visitaMoraSeleccionada.nivelRiesgo === 'critico' ? 'ROJO' : 
                          visitaMoraSeleccionada.nivelRiesgo === 'moderado' ? 'AMARILLO' : 'VERDE'
            }}
            onClose={() => {
              setShowMoraModal(false)
              setVisitaMoraSeleccionada(null)
            }}
          />
        )}

        {showEstadoCuentaModal && visitaEstadoCuentaSeleccionada && (
          <EstadoCuentaModal
            onClose={() => {
              setShowEstadoCuentaModal(false)
              setVisitaEstadoCuentaSeleccionada(null)
            }}
            visita={visitaEstadoCuentaSeleccionada}
          />
        )}

        {showClientSelector && (
          <SeleccionClienteModal
            titulo={pendingAction === 'CUENTA' ? 'Ver Estado de Cuenta' : 'Agendar Visita'}
            subtitulo={pendingAction === 'CUENTA' ? 'Consultar Cliente' : 'Programar Cliente'}
            visitas={visitasCobrador}
            onSelect={(visita) => {
              setShowClientSelector(false)
              if (pendingAction === 'CUENTA') {
                setVisitaEstadoCuentaSeleccionada(visita)
                setShowEstadoCuentaModal(true)
              } else {
                setVisitaReprogramar(visita)
                setShowReprogramModal(true)
              }
              setPendingAction(null)
            }}
            onClose={() => {
              setShowClientSelector(false)
              setPendingAction(null)
            }}
          />
        )}

        {showReprogramModal && visitaReprogramar && (
          <ReprogramarModal
            visita={visitaReprogramar}
            onClose={() => {
              setShowReprogramModal(false)
              setVisitaReprogramar(null)
            }}
            onConfirm={handleGuardarReprogramacion}
          />
        )}

        <GastoModal 
          isOpen={showGastoModal}
          onClose={() => setShowGastoModal(false)}
          onConfirm={(data) => {
            console.log('Gasto registrado:', data)
            setShowGastoModal(false)
          }}
        />

        <BaseModal
          isOpen={showBaseModal}
          onClose={() => setShowBaseModal(false)}
          onConfirm={(data) => {
            console.log('Base solicitada:', data)
            setShowBaseModal(false)
          }}
        />
      </div>
    </div>
  )
}

export default VistaCobrador
