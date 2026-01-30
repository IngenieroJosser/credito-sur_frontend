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
  Wallet,
  CheckCircle2,
  // Filter,
  History,
  UserPlus,
  Receipt,
  DollarSign,
  Camera,
  ChevronDown,
  X,
  CreditCard,
  Plus,
  ClipboardList,
  GripVertical,
  Calendar,
  Search,
  ShoppingBag,
  FileText as FileTextIcon,
  BarChart3,
  User,
  Users,
  Target,
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
import { MOCK_ARTICULOS } from '@/services/articulos-service'
import { formatCOPInputValue, formatCurrency, formatMilesCOP, parseCOPInputToNumber } from '@/lib/utils'
import { ExportButton } from '@/components/ui/ExportButton'
import NuevoClienteModal from '@/components/clientes/NuevoClienteModal'
import { VisitaRuta, EstadoVisita, PeriodoRuta, HistorialDia } from '@/lib/types/cobranza'
import { StaticVisitaItem, SortableVisita, Portal, MODAL_Z_INDEX } from '@/components/dashboards/shared/CobradorElements'
import EstadoCuentaModal from '@/components/cobranza/EstadoCuentaModal'

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
  const [visitaPagoSeleccionada, setVisitaPagoSeleccionada] = useState<VisitaRuta | null>(null)
  const [isAbono, setIsAbono] = useState(false)
  const [metodoPago, setMetodoPago] = useState<'EFECTIVO' | 'TRANSFERENCIA'>('EFECTIVO')
  const [comprobanteTransferencia, setComprobanteTransferencia] = useState<File | null>(null)
  const [comprobanteTransferenciaPreviewUrl, setComprobanteTransferenciaPreviewUrl] = useState<string | null>(null)
  const [showClienteInfoModal, setShowClienteInfoModal] = useState(false)
  const [visitaClienteSeleccionada, setVisitaClienteSeleccionada] = useState<VisitaRuta | null>(null)
  const [showEstadoCuentaModal, setShowEstadoCuentaModal] = useState(false)
  const [visitaEstadoCuentaSeleccionada, setVisitaEstadoCuentaSeleccionada] = useState<VisitaRuta | null>(null)
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [showBaseRequestModal, setShowBaseRequestModal] = useState(false)
  const [showNewClientModal, setShowNewClientModal] = useState(false)
  const [showReprogramModal, setShowReprogramModal] = useState(false)
  const [visitaReprogramar, setVisitaReprogramar] = useState<VisitaRuta | null>(null)
  const [reprogramFecha, setReprogramFecha] = useState('')
  const [reprogramMotivo, setReprogramMotivo] = useState('')
  const [activeId, setActiveId] = useState<string | null>(null)
  
  // Nuevos estados para la refactorización
  const [showCreditModal, setShowCreditModal] = useState(false)
  const [creditType, setCreditType] = useState<'prestamo' | 'articulo'>('prestamo')
  const [isFabOpen, setIsFabOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  // const [showFilters, setShowFilters] = useState(false) // Removed
  const [periodoRutaFiltro, setPeriodoRutaFiltro] = useState<PeriodoRuta | 'TODOS'>('TODOS')
  const [selectedHistoryDate, setSelectedHistoryDate] = useState<string | null>(null)
  const [historyViewMode, setHistoryViewMode] = useState<'DAYS' | 'MONTHS'>('DAYS')

  const [montoPagoInput, setMontoPagoInput] = useState('')
  const [montoGastoInput, setMontoGastoInput] = useState('')
  const [conceptoGasto, setConceptoGasto] = useState('Combustible')
  const [descripcionGastoInput, setDescripcionGastoInput] = useState('')
  const [montoBaseInput, setMontoBaseInput] = useState('')
  const [montoPrestamoInput, setMontoPrestamoInput] = useState('')
  const [tasaInteresInput, setTasaInteresInput] = useState('10')
  const [cuotasPrestamoInput, setCuotasPrestamoInput] = useState('12')
  const [tipoInteres, setTipoInteres] = useState<'SIMPLE' | 'AMORTIZABLE'>('SIMPLE')
  const [cuotaInicialArticuloInput, setCuotaInicialArticuloInput] = useState('')
  const [fechaCreditoInput, setFechaCreditoInput] = useState(new Date().toISOString().split('T')[0])
  const [frecuenciaPago, setFrecuenciaPago] = useState('Diaria')
  const [fechaPrimerCobro, setFechaPrimerCobro] = useState('')
  
  // Estados para artículos
  const [articuloSeleccionadoId, setArticuloSeleccionadoId] = useState<string>('')
  // Refactor: Instead of complete option, we store selected Duration Index from the options list
  const [planArticuloIndex, setPlanArticuloIndex] = useState<number | null>(null)
  
  const articuloSeleccionado = MOCK_ARTICULOS.find(a => a.id === articuloSeleccionadoId)
  
  // Calculate results dynamically
  const planSeleccionado = (articuloSeleccionado && planArticuloIndex !== null) 
    ? articuloSeleccionado.opcionesCuotas[planArticuloIndex] 
    : null;

  // Derivar meses desde el mock (asumiendo Quincenal como base en mock)
  const mesesPlan = planSeleccionado ? planSeleccionado.numeroCuotas / 2 : 0;
  
  const calculoCreditoArticulo = useMemo(() => {
     if(!planSeleccionado || !mesesPlan) return null;
     
     const precioTotal = planSeleccionado.precioTotal;
     const inicial = parseCOPInputToNumber(cuotaInicialArticuloInput);
     const aFinanciar = Math.max(0, precioTotal - inicial);
     
     // Calculate Quotas based on Frequency
     let numCuotas = 0;
     if (frecuenciaPago === 'Diaria') numCuotas = Math.ceil(mesesPlan * 30); // 30 quotas/month
     else if (frecuenciaPago === 'Semanal') numCuotas = Math.ceil(mesesPlan * 4); // 4 quotas/month (approx standard)
     else if (frecuenciaPago === 'Quincenal') numCuotas = Math.ceil(mesesPlan * 2); 
     else if (frecuenciaPago === 'Mensuales') numCuotas = Math.ceil(mesesPlan * 1);
     
     const valorCuota = numCuotas > 0 ? Math.ceil(aFinanciar / numCuotas) : 0;
     
     return {
        meses: mesesPlan,
        precioTotal,
        aFinanciar,
        numCuotas,
        valorCuota
     };
  }, [planSeleccionado, mesesPlan, frecuenciaPago, cuotaInicialArticuloInput]);

  const [rutaCompletada, setRutaCompletada] = useState(false)
  const [showCompletarRutaModal, setShowCompletarRutaModal] = useState(false)
  const [coordinadorToast, setCoordinadorToast] = useState<string | null>(null)

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

  // Datos base
  const [visitasBase, setVisitasBase] = useState<VisitaRuta[]>(() => [
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
      nivelRiesgo: 'moderado',
      cobradorId: 'CB-001',
      periodoRuta: 'DIA'
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
      nivelRiesgo: 'critico',
      cobradorId: 'CB-001',
      periodoRuta: 'DIA'
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
      nivelRiesgo: 'leve',
      cobradorId: 'CB-001',
      periodoRuta: 'SEMANA'
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
      nivelRiesgo: 'bajo',
      cobradorId: 'CB-001',
      periodoRuta: 'SEMANA'
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
      nivelRiesgo: 'moderado',
      cobradorId: 'CB-001',
      periodoRuta: 'MES'
    }
  ])

  const operacionesCaja: OperacionCaja[] = useMemo(() => [
    { id: 'OP-001', tipo: 'pago', descripcion: 'Pago Carlos Rodríguez', monto: 125000, hora: '09:42', estado: 'completado', cobradorId: 'CB-001' },
    { id: 'OP-002', tipo: 'gasto', descripcion: 'Combustible', monto: 35000, hora: '08:15', estado: 'completado', cobradorId: 'CB-001' },
    { id: 'OP-003', tipo: 'base', descripcion: 'Base solicitada', monto: 50000, hora: '10:30', estado: 'pendiente', cobradorId: 'CB-001' },
    { id: 'OP-004', tipo: 'pago', descripcion: 'Pago María González', monto: 110000, hora: '13:50', estado: 'completado', cobradorId: 'CB-001' },
  ], [])

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

  useEffect(() => {
    if (comprobanteTransferenciaPreviewUrl) {
      URL.revokeObjectURL(comprobanteTransferenciaPreviewUrl)
      setComprobanteTransferenciaPreviewUrl(null)
    }

    if (!comprobanteTransferencia) return
    if (!comprobanteTransferencia.type.startsWith('image/')) return

    const url = URL.createObjectURL(comprobanteTransferencia)
    setComprobanteTransferenciaPreviewUrl(url)

    return () => {
      URL.revokeObjectURL(url)
    }
  }, [comprobanteTransferencia, comprobanteTransferenciaPreviewUrl])

  // Filtrar y ordenar visitas
  const visitasCobrador = useMemo(() => {
    const filtradas = visitasBase.filter(v => v.cobradorId === 'CB-001') // Temporal
    
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



  const handleGuardarReprogramacion = useCallback(() => {
    if (!visitaReprogramar) return
    if (!reprogramFecha) return

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
          proximaVisita: formatearFechaISO(reprogramFecha),
        }
      })
    )

    console.log('Reprogramar visita', visitaReprogramar.id, reprogramFecha, reprogramMotivo)
    setShowReprogramModal(false)
    setVisitaReprogramar(null)
    setReprogramFecha('')
    setReprogramMotivo('')
  }, [reprogramFecha, reprogramMotivo, visitaReprogramar])

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
    setShowCompletarRutaModal(false)
    setCoordinadorToast('Se notificó al coordinador: ruta diaria marcada como completada.')
    window.setTimeout(() => setCoordinadorToast(null), 4000)
  }, [])

  const handleRegistrarGasto = useCallback((concepto: string, descripcion: string, monto: number) => {
    console.log(`Registra gasto: ${concepto} - ${descripcion} - $${monto}`)
    if (concepto === 'Gasto Personal') {
       console.log('NOTA: Este gasto se registra como deuda del cobrador para corte de quincena/mes.')
    }
    setShowExpenseModal(false)
  }, [])

  const handleSolicitarBase = useCallback((monto: number, motivo: string) => {
    console.log(`Solicita base de $${monto}: ${motivo}`)
    setShowBaseRequestModal(false)
  }, [])




  const handleAbrirClienteInfo = useCallback((visita: VisitaRuta) => {
    setVisitaClienteSeleccionada(visita)
    setShowClienteInfoModal(true)
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
                Meta: ${cajaRuta.recaudoEsperado.toLocaleString('es-CO')}
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
                    onClick={() => setShowCompletarRutaModal(true)}
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
                     <button onClick={() => { setVisitaPagoSeleccionada(null); setShowPaymentModal(true); setIsAbono(false); }} className="flex-1 min-w-[max-content] bg-emerald-50 text-emerald-700 border border-emerald-200 px-4 py-3 rounded-xl flex items-center justify-center gap-2 font-bold shadow-sm active:scale-95 transition-all">
                         <DollarSign className="h-5 w-5" /> Pagar
                     </button>
                     <button onClick={() => { setVisitaPagoSeleccionada(null); setShowPaymentModal(true); setIsAbono(true); }} className="flex-1 min-w-[max-content] bg-blue-50 text-blue-700 border border-blue-200 px-4 py-3 rounded-xl flex items-center justify-center gap-2 font-bold shadow-sm active:scale-95 transition-all">
                         <Wallet className="h-5 w-5" /> Abonar
                     </button>
                     <button onClick={() => { setVisitaEstadoCuentaSeleccionada(null); setShowEstadoCuentaModal(true); }} className="flex-1 min-w-[max-content] bg-white text-slate-700 border border-slate-200 px-4 py-3 rounded-xl flex items-center justify-center gap-2 font-bold shadow-sm active:scale-95 transition-all hover:bg-slate-50">
                         <FileTextIcon className="h-5 w-5 text-slate-400" /> Cuenta
                     </button>
                     <button onClick={() => { setVisitaReprogramar(null); setShowReprogramModal(true); }} className="flex-1 min-w-[max-content] bg-white text-slate-700 border border-slate-200 px-4 py-3 rounded-xl flex items-center justify-center gap-2 font-bold shadow-sm active:scale-95 transition-all hover:bg-slate-50">
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
                  items={visitasCobrador.filter(v => v.estado !== 'pagado').map(v => v.id)}
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
                                />
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

        {/* Floating Action Buttons (Restored) */}
          {isFabOpen && (
            <div 
              className="fixed top-0 left-0 w-screen h-screen z-40 bg-slate-900/10 backdrop-blur-[1px] cursor-default" 
              onClick={() => setIsFabOpen(false)}
            />
          )}
          <div className="fixed right-6 z-50 flex flex-col items-end gap-3 bottom-[calc(1.5rem+env(safe-area-inset-bottom))] pointer-events-none">
            {/* Actions Menu */}
          <div
            className={`flex flex-col gap-3 transition-all duration-200 origin-bottom-right ${
              isFabOpen ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-2 pointer-events-none'
            }`}
          >
            <button
              onClick={() => {
                setShowCreditModal(true)
                setIsFabOpen(false)
              }}
              className={`flex items-center justify-between w-56 gap-3 ${isFabOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
            >
              <span className="bg-[#08557f] text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg shadow-[#08557f]/20">Crear Crédito</span>
              <div className="h-11 w-11 flex items-center justify-center rounded-full bg-white text-[#08557f] border border-[#08557f]/20 shadow-lg shadow-[#08557f]/10 hover:bg-[#f1f6fb] transition-all">
                <CreditCard className="h-5 w-5" />
              </div>
            </button>
            <button 
              onClick={() => {
                setShowNewClientModal(true)
                setIsFabOpen(false)
              }}
              className={`flex items-center justify-between w-56 gap-3 ${isFabOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
            >
              <span className="bg-[#08557f] text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg shadow-[#08557f]/20">Crear Cliente</span>
              <div className="h-11 w-11 flex items-center justify-center rounded-full bg-white text-[#08557f] border border-[#08557f]/20 shadow-lg shadow-[#08557f]/10 hover:bg-[#f1f6fb] transition-all">
                <UserPlus className="h-5 w-5" />
              </div>
            </button>
            <button 
              onClick={() => setShowExpenseModal(true)}
              className={`flex items-center justify-between w-56 gap-3 ${isFabOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
            >
              <span className="bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg shadow-orange-500/20">Reg. Gasto</span>
              <div className="h-11 w-11 flex items-center justify-center rounded-full bg-white text-orange-500 border border-orange-200 shadow-lg shadow-orange-500/10 hover:bg-orange-50 transition-all">
                <Receipt className="h-5 w-5" />
              </div>
            </button>
            <button 
              onClick={() => setShowBaseRequestModal(true)}
              className={`flex items-center justify-between w-56 gap-3 ${isFabOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
            >
              <span className="bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg shadow-orange-500/20">Pedir Base</span>
              <div className="h-11 w-11 flex items-center justify-center rounded-full bg-white text-orange-500 border border-orange-200 shadow-lg shadow-orange-500/10 hover:bg-orange-50 transition-all">
                <Wallet className="h-5 w-5" />
              </div>
            </button>
            <button
              onClick={() => {
                router.push('/cobranzas/solicitudes')
                setIsFabOpen(false)
              }}
              className={`flex items-center justify-between w-56 gap-3 ${isFabOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
            >
              <span className="bg-[#08557f] text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg shadow-[#08557f]/20">Solicitudes</span>
              <div className="h-11 w-11 flex items-center justify-center rounded-full bg-white text-[#08557f] border border-[#08557f]/20 shadow-lg shadow-[#08557f]/10 hover:bg-[#f1f6fb] transition-all">
                <ClipboardList className="h-5 w-5" />
              </div>
            </button>
          </div>

          {/* Main Toggle Button */}
          <button
            onClick={() => setIsFabOpen(!isFabOpen)}
            className={`pointer-events-auto p-4 rounded-full shadow-xl transition-all duration-300 ${
              isFabOpen 
                ? 'bg-[#063a58] text-white rotate-45' 
                : 'bg-[#08557f] text-white hover:bg-[#063a58] hover:scale-105'
            }`}
          >
            <Plus className="h-6 w-6" />
          </button>
        </div>

        {/* Modales (Implementación simplificada para el ejemplo) */}
        {showCompletarRutaModal && (
          <Portal>
            <div
              className="fixed inset-0 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
              style={{ zIndex: MODAL_Z_INDEX }}
              onClick={() => setShowCompletarRutaModal(false)}
            >
              <div
                className="w-full max-w-md bg-white rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">Completar ruta</h3>
                      <p className="text-sm text-slate-500 font-medium">Al completar la ruta no podrás hacer más modificaciones hoy.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowCompletarRutaModal(false)}
                      className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowCompletarRutaModal(false)}
                      className="flex-1 rounded-xl bg-slate-100 px-3 py-3 text-sm font-bold text-slate-700 hover:bg-slate-200"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleCompletarRuta}
                      className="flex-1 rounded-xl bg-emerald-600 px-3 py-3 text-sm font-bold text-white hover:bg-emerald-700"
                    >
                      Marcar como completada
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </Portal>
        )}

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

        {/* Modal de Reprogramación */}
        {showReprogramModal && (
          <Portal>
            <div
              className="fixed inset-0 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
              style={{ zIndex: MODAL_Z_INDEX }}
              onClick={() => {
                setShowReprogramModal(false)
                setVisitaReprogramar(null)
                setReprogramFecha('')
                setReprogramMotivo('')
              }}
            >
              <div
                className="w-full max-w-md bg-white rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
              >
                  {!visitaReprogramar ? (
                        <div className="p-6">
                           <div className="flex items-center justify-between mb-4">
                             <h3 className="text-xl font-bold text-slate-900">Agendar Visita</h3>
                             <button onClick={() => setShowReprogramModal(false)} className="p-2 bg-slate-100 rounded-full text-slate-500">
                               <X className="h-5 w-5" />
                             </button>
                           </div>
                           <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                               <label className="block text-sm font-bold text-slate-700 mb-2">Buscar Cliente</label>
                               <select 
                                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-3 text-slate-900 outline-none focus:border-[#08557f] font-bold"
                                    onChange={(e) => {
                                        const v = visitasCobrador.find(x => x.id === e.target.value);
                                        if(v) setVisitaReprogramar(v);
                                    }}
                                    value=""
                               >
                                    <option value="" disabled>Seleccione cliente...</option>
                                    {visitasCobrador.map(v => (
                                        <option key={v.id} value={v.id}>{v.cliente}</option>
                                    ))}
                               </select>
                           </div>
                        </div>
                  ) : (
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">Reprogramar visita</h3>
                      <p className="text-sm text-slate-500">{visitaReprogramar.cliente}</p>
                    </div>
                    <button
                      onClick={() => {
                        setShowReprogramModal(false)
                        setVisitaReprogramar(null)
                      }}
                      className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Nueva fecha</label>
                      <input
                        type="date"
                        value={reprogramFecha}
                        onChange={(e) => setReprogramFecha(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Motivo</label>
                      <textarea
                        value={reprogramMotivo}
                        onChange={(e) => setReprogramMotivo(e.target.value)}
                        rows={3}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900 resize-none"
                        placeholder="Ej: Cliente no estaba disponible"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleGuardarReprogramacion}
                      className="w-full bg-orange-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-orange-500/20 hover:bg-orange-600 active:scale-[0.98] transition-all"
                    >
                      Guardar reprogramación
                    </button>
                  </div>
                </div>
              )}
              </div>
            </div>
          </Portal>
        )}

        {showEstadoCuentaModal && (
            !visitaEstadoCuentaSeleccionada ? (
                  <Portal>
                    <div
                      className="fixed inset-0 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
                      style={{ zIndex: MODAL_Z_INDEX }}
                      onClick={() => setShowEstadoCuentaModal(false)}
                    >
                      <div
                        className="w-full max-w-md bg-white rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200 p-6"
                        onClick={(e) => e.stopPropagation()}
                      >
                           <div className="flex items-center justify-between mb-4">
                             <h3 className="text-xl font-bold text-slate-900">Ver Estado de Cuenta</h3>
                             <button onClick={() => setShowEstadoCuentaModal(false)} className="p-2 bg-slate-100 rounded-full text-slate-500">
                               <X className="h-5 w-5" />
                             </button>
                           </div>
                           <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                               <label className="block text-sm font-bold text-slate-700 mb-2">Buscar Cliente</label>
                               <select 
                                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-3 text-slate-900 outline-none focus:border-[#08557f] font-bold"
                                    onChange={(e) => {
                                        const v = visitasCobrador.find(x => x.id === e.target.value);
                                        if(v) setVisitaEstadoCuentaSeleccionada(v);
                                    }}
                                    value=""
                               >
                                    <option value="" disabled>Seleccione cliente...</option>
                                    {visitasCobrador.map(v => (
                                        <option key={v.id} value={v.id}>{v.cliente}</option>
                                    ))}
                               </select>
                           </div>
                      </div>
                    </div>
                  </Portal>
            ) : (
              <EstadoCuentaModal
                visita={visitaEstadoCuentaSeleccionada}
                onClose={() => {
                  setShowEstadoCuentaModal(false)
                  setVisitaEstadoCuentaSeleccionada(null)
                }}
              />
            )
        )}

        {/* Modal de Pagos */}
        {showPaymentModal && (
          <Portal>
            <div
              className="fixed inset-0 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
              style={{ zIndex: MODAL_Z_INDEX }}
              onClick={() => {
                setShowPaymentModal(false)
                setVisitaPagoSeleccionada(null)
                setIsAbono(false)
                setMontoPagoInput('')
                setMetodoPago('EFECTIVO')
                setComprobanteTransferencia(null)
              }}
            >
              <div
                className="w-full max-w-md bg-white rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-slate-900">{isAbono ? 'Registrar Abono' : 'Registrar Pago'}</h3>
                    <button 
                      onClick={() => setShowPaymentModal(false)}
                      className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  
                  <div className="space-y-6">
                     {!visitaPagoSeleccionada ? (
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                           <label className="block text-sm font-bold text-slate-700 mb-2">Buscar Cliente</label>
                           <select 
                                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-3 text-slate-900 outline-none focus:border-[#08557f] font-bold"
                                onChange={(e) => {
                                    const v = visitasCobrador.find(x => x.id === e.target.value);
                                    if(v) {
                                      setVisitaPagoSeleccionada(v);
                                      if (!isAbono) setMontoPagoInput(formatMilesCOP(v.montoCuota));
                                    }
                                }}
                                value=""
                           >
                                <option value="" disabled>Seleccione cliente...</option>
                                {visitasCobrador.map(v => (
                                    <option key={v.id} value={v.id}>{v.cliente}</option>
                                ))}
                           </select>
                        </div>
                     ) : (
                        <div className="bg-[#08557f]/5 p-5 rounded-3xl border border-[#08557f]/10 relative overflow-hidden">
                           <div className="absolute top-0 right-0 w-24 h-24 bg-[#08557f]/5 rounded-full -mr-12 -mt-12"></div>
                           <button 
                             onClick={() => {
                               setVisitaPagoSeleccionada(null);
                               setMontoPagoInput('');
                             }}
                             className="absolute top-4 right-4 p-2 bg-white text-slate-400 rounded-xl hover:text-slate-700 shadow-sm border border-slate-100 transition-all z-10"
                             title="Cambiar cliente"
                           >
                             <Users className="w-4 h-4" />
                           </button>
                           
                           <div className="relative z-10 flex gap-4 items-center">
                              <div className="h-14 w-14 rounded-2xl bg-white border border-[#08557f]/10 flex items-center justify-center text-[#08557f] shadow-sm">
                                 <User className="w-7 h-7" />
                              </div>
                              <div className="flex-1 min-w-0">
                                 <p className="text-[10px] font-black text-[#08557f] uppercase tracking-widest mb-0.5">Cliente Seleccionado</p>
                                 <p className="font-bold text-slate-900 text-lg truncate">{visitaPagoSeleccionada.cliente}</p>
                                 <div className="flex items-center gap-1.5 mt-1">
                                    <MapPin className="w-3 h-3 text-slate-400" />
                                    <p className="text-xs text-slate-500 truncate">{visitaPagoSeleccionada.direccion}</p>
                                 </div>
                              </div>
                           </div>

                           <div className="mt-4 pt-4 border-t border-[#08557f]/10 grid grid-cols-2 gap-4">
                              <div>
                                 <div className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter mb-1">Cuota Esperada</div>
                                 <div className="text-slate-900 font-black text-lg">${formatMilesCOP(visitaPagoSeleccionada.montoCuota)}</div>
                              </div>
                              <div className="text-right">
                                 <div className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter mb-1">Saldo Total</div>
                                 <div className="text-[#08557f] font-black text-lg">${formatMilesCOP(visitaPagoSeleccionada.saldoTotal)}</div>
                              </div>
                           </div>
                        </div>
                     )}

                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Método de Pago</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setMetodoPago('EFECTIVO')}
                          className={`py-3 rounded-xl border text-sm font-bold transition-colors ${
                            metodoPago === 'EFECTIVO'
                              ? 'bg-[#08557f] text-white border-[#08557f]'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          EFECTIVO
                        </button>
                        <button
                          type="button"
                          onClick={() => setMetodoPago('TRANSFERENCIA')}
                          className={`py-3 rounded-xl border text-sm font-bold transition-colors ${
                            metodoPago === 'TRANSFERENCIA'
                              ? 'bg-[#08557f] text-white border-[#08557f]'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          TRANSFERENCIA
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Monto Recibido</label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-6 w-6 text-slate-400" />
                        <input 
                          type="text"
                          inputMode="numeric"
                          value={montoPagoInput}
                          onChange={(e) => setMontoPagoInput(formatCOPInputValue(e.target.value))}
                          className="w-full pl-10 pr-4 py-4 bg-white border-2 border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-bold text-2xl text-slate-900 placeholder:text-slate-300"
                          placeholder="0"
                          autoFocus
                        />
                      </div>
                    </div>



                    <button 
                      onClick={() => {
                        handleRegistrarPago(visitaPagoSeleccionada?.id || '', parseCOPInputToNumber(montoPagoInput), metodoPago, comprobanteTransferencia)
                      }}
                      disabled={
                        parseCOPInputToNumber(montoPagoInput) <= 0 ||
                        (metodoPago === 'TRANSFERENCIA' && !comprobanteTransferencia)
                      }
                      className="w-full bg-[#08557f] text-white font-bold py-4 rounded-xl shadow-lg shadow-[#08557f]/20 hover:bg-[#063a58] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
                    >
                      <CheckCircle2 className="h-5 w-5" />
                      {isAbono ? 'Confirmar Abono' : 'Confirmar Pago'}
                    </button>

                    {metodoPago === 'TRANSFERENCIA' && (
                      <div className="pt-2">
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                          Comprobante (Obligatorio)
                        </label>
                        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-bold text-slate-900">Sube el comprobante</p>
                                {comprobanteTransferencia && (
                                  <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-[#08557f] border border-blue-100">
                                    ADJUNTO
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500">Imagen o PDF. Recomendado: foto clara del recibo.</p>
                            </div>
                            {comprobanteTransferencia && (
                              <button
                                type="button"
                                onClick={() => {
                                  setComprobanteTransferencia(null)
                                }}
                                className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100"
                              >
                                Quitar
                              </button>
                            )}
                          </div>

                          {comprobanteTransferenciaPreviewUrl && (
                            <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={comprobanteTransferenciaPreviewUrl}
                                alt="Comprobante"
                                className="w-full h-40 object-cover"
                              />
                            </div>
                          )}

                          {comprobanteTransferencia && !comprobanteTransferenciaPreviewUrl && (
                            <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
                              <p className="text-xs font-bold text-slate-700 truncate">
                                Archivo: {comprobanteTransferencia.name}
                              </p>
                            </div>
                          )}

                          <div className="mt-3">
                            <input
                              type="file"
                              accept="image/*,application/pdf"
                              onChange={(e) => setComprobanteTransferencia(e.target.files?.[0] || null)}
                              className="w-full text-sm"
                              required
                            />
                          </div>
                        </div>
                        {!comprobanteTransferencia && (
                          <p className="mt-2 text-xs font-bold text-rose-600">
                            Adjunta el comprobante para confirmar una transferencia.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Portal>
        )}

        {/* Modal de Gastos */}
        {showExpenseModal && (
          <Portal>
            <div
              className="fixed inset-0 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
              style={{ zIndex: MODAL_Z_INDEX }}
              onClick={() => {
                setShowExpenseModal(false)
                setMontoGastoInput('')
                setDescripcionGastoInput('')
              }}
            >
              <div
                className="w-full max-w-md bg-white rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
              >
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
                      <select 
                        value={conceptoGasto}
                        onChange={(e) => setConceptoGasto(e.target.value)}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900"
                      >
                        <option value="Combustible">Combustible</option>
                        <option value="Reparación Moto">Reparación Moto</option>
                        <option value="Papelería">Papelería</option>
                        <option value="Gasto Personal">Gasto Personal</option>
                        <option value="Otros">Otros</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Monto</label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <input 
                          type="text"
                          inputMode="numeric"
                          value={montoGastoInput}
                          onChange={(e) => setMontoGastoInput(formatCOPInputValue(e.target.value))}
                          className="w-full pl-10 pr-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-bold text-slate-900"
                          placeholder="0"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Descripción</label>
                      <textarea 
                        value={descripcionGastoInput}
                        onChange={(e) => setDescripcionGastoInput(e.target.value)}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900 resize-none"
                        rows={3}
                        placeholder="Describe el gasto realizado..."
                      ></textarea>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Comprobante (Opcional)</label>
                      <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center text-slate-400 hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer">
                        <Camera className="h-8 w-8 mb-2" />
                        <span className="text-xs font-bold">Tomar foto</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleRegistrarGasto(conceptoGasto, descripcionGastoInput, parseCOPInputToNumber(montoGastoInput))}
                      className="w-full bg-orange-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-orange-500/20 hover:bg-orange-600 active:scale-[0.98] transition-all"
                    >
                      Guardar Gasto
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </Portal>
        )}

        {/* Modal de Solicitud de Base */}
        {showBaseRequestModal && (
          <Portal>
            <div
              className="fixed inset-0 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
              style={{ zIndex: MODAL_Z_INDEX }}
              onClick={() => {
                setShowBaseRequestModal(false)
                setMontoBaseInput('')
              }}
            >
              <div
                className="w-full max-w-md bg-white rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
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
                          type="text"
                          inputMode="numeric"
                          value={montoBaseInput}
                          onChange={(e) => setMontoBaseInput(formatCOPInputValue(e.target.value))}
                          className="w-full pl-10 pr-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-bold text-slate-900"
                          placeholder="0"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Motivo / Descripción</label>
                      <textarea 
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900 resize-none"
                        rows={3}
                        placeholder="Ej: Para préstamo cliente X..."
                      ></textarea>
                    </div>
                    <button 
                      onClick={() => handleSolicitarBase(parseCOPInputToNumber(montoBaseInput), 'Solicitud manual')}
                      className="w-full bg-orange-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-orange-500/20 hover:bg-orange-600 active:scale-[0.98] transition-all"
                    >
                      Enviar Solicitud
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </Portal>
        )}

        {/* Modal de Crear Cliente */}
        {showNewClientModal && (
            <NuevoClienteModal 
                onClose={() => setShowNewClientModal(false)}
                onClienteCreado={() => {
                    // MOCK_CLIENTES.unshift(nuevo);
                    // Aquí no tenemos clienteCreditoId pero es similar a como estaba
                    setShowNewClientModal(false);
                }}
            />
        )}

        {/* Modal de Crear Crédito */}
        {showCreditModal && (
          <Portal>
            <div
              className="fixed inset-0 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
              style={{ zIndex: MODAL_Z_INDEX }}
              onClick={() => {
                setShowCreditModal(false)
                setCreditType('prestamo')
                setMontoPrestamoInput('')
                setTasaInteresInput('')
                setCuotasPrestamoInput('')
                setCuotaInicialArticuloInput('')
                setArticuloSeleccionadoId('')
                setPlanArticuloIndex(null)
                setFrecuenciaPago('Semanal') // Default reasonable frequency
              }}
            >
              <div
                className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-slate-900">Crear Nuevo Crédito</h3>
                    <button 
                      onClick={() => {
                        setShowCreditModal(false)
                        setCreditType('prestamo')
                      }}
                      className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                
                {/* Selector de Tipo de Crédito */}
                <div className="mb-6">
                  <label className="block text-sm font-bold text-slate-700 mb-3">Tipo de Crédito</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setCreditType('prestamo')}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        creditType === 'prestamo'
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <DollarSign className="h-6 w-6 mx-auto mb-2" />
                      <div className="font-bold text-sm">Préstamo en Efectivo</div>
                    </button>
                    <button
                      onClick={() => setCreditType('articulo')}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        creditType === 'articulo'
                          ? 'border-orange-500 bg-orange-50 text-orange-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <ShoppingBag className="h-6 w-6 mx-auto mb-2" />
                      <div className="font-bold text-sm">Crédito por Artículo</div>
                    </button>
                  </div>
                </div>

                {/* Formulario Dinámico */}
                <div className="space-y-4">
                  {/* Cliente - Común para ambos */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Cliente</label>
                    <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900">
                      <option value="">Seleccionar cliente...</option>
                      <option>Carlos Rodríguez</option>
                      <option>Ana Martínez</option>
                      <option>Luis Fernández</option>
                    </select>
                  </div>

                  {/* Contenido específico según tipo */}
                  {creditType === 'prestamo' ? (
                    <>
                      {/* Formulario de Préstamo */}
                      <div className="mb-4">
                        <label className="block text-sm font-bold text-slate-700 mb-2">Tipo de Interés</label>
                        <select 
                            value={tipoInteres}
                            onChange={(e) => setTipoInteres(e.target.value as 'SIMPLE' | 'AMORTIZABLE')}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900"
                        >
                            <option value="AMORTIZABLE">Amortizable</option>
                            <option value="SIMPLE">Interés Simple</option>
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">Monto del Préstamo</label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                            <input 
                              type="text"
                              inputMode="numeric"
                              value={montoPrestamoInput}
                              onChange={(e) => setMontoPrestamoInput(formatCOPInputValue(e.target.value))}
                              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-bold text-slate-900"
                              placeholder="0"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">Tasa de Interés (%)</label>
                          <input 
                            type="text"
                            inputMode="decimal"
                            value={tasaInteresInput}
                            onChange={(e) => setTasaInteresInput(e.target.value.replace(/[^0-9.]/g, ''))}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900"
                            placeholder="5.0"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">Frecuencia de Pago</label>
                          <select 
                            value={frecuenciaPago}
                            onChange={(e) => setFrecuenciaPago(e.target.value)}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900"
                          >
                            <option value="Diaria">Diaria</option>
                            <option value="Semanal">Semanal</option>
                            <option value="Quincenal">Quincenal</option>
                            <option value="Mensuales">Mensuales</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">Cuotas</label>
                          <input 
                            type="text"
                            inputMode="numeric"
                            value={cuotasPrestamoInput}
                            onChange={(e) => setCuotasPrestamoInput(e.target.value.replace(/\D/g, ''))}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900"
                            placeholder="12"
                          />
                        </div>
                      </div>



                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">Fecha Inicio Crédito</label>
                          <input 
                            type="date"
                            value={fechaCreditoInput}
                            disabled={true}
                            className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl font-medium text-slate-500 cursor-not-allowed opacity-75"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">Fecha Primer Cobro</label>
                          <input 
                            type="date"
                            value={fechaPrimerCobro}
                            onChange={(e) => setFechaPrimerCobro(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900"
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Formulario de Artículo */}
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                        <p className="text-sm font-medium text-blue-900">
                          <strong>Nota:</strong> Los precios y cuotas de los artículos son asignados por el contable.
                        </p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Artículo</label>
                        <select 
                          value={articuloSeleccionadoId}
                          onChange={(e) => {
                             setArticuloSeleccionadoId(e.target.value)
                             setPlanArticuloIndex(null)
                           }}
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900"
                        >
                          <option value="">Seleccionar artículo...</option>
                          {MOCK_ARTICULOS.map((articulo) => (
                            <option key={articulo.id} value={articulo.id}>
                              {articulo.nombre} - {formatCurrency(articulo.precioBase)}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      {articuloSeleccionado && (
                        <>
                          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                            <div className="text-xs font-bold text-slate-500 uppercase mb-2">Precio Base (Sin Financiamiento)</div>
                            <div className="text-lg font-bold text-slate-900">{formatCurrency(articuloSeleccionado.precioBase)}</div>
                          </div>
                          
                          <div>
                             <label className="block text-sm font-bold text-slate-700 mb-2">Plazo (Meses)</label>
                             <select 
                               value={planArticuloIndex !== null ? planArticuloIndex : ''}
                               onChange={(e) => {
                                 const idx = e.target.value ? parseInt(e.target.value) : null
                                 setPlanArticuloIndex(idx)
                               }}
                               className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900"
                             >
                                <option value="">Seleccionar plazo...</option>
                                {articuloSeleccionado.opcionesCuotas.map((op, idx) => {
                                   // Interpret mock data: numeroCuotas (Quincenal assumed) / 2 = Months
                                   const meses = op.numeroCuotas / 2;
                                   return (
                                     <option key={idx} value={idx}>
                                        {meses} Meses - Total: {formatCurrency(op.precioTotal)}
                                     </option>
                                   )
                                })}
                             </select>
                          </div>

                          <div className="mb-4">
                             <label className="block text-sm font-bold text-slate-700 mb-2">Frecuencia de Pago</label>
                             <select 
                               value={frecuenciaPago}
                               onChange={(e) => setFrecuenciaPago(e.target.value)}
                               className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900"
                             >
                               <option value="Diaria">Diaria</option>
                               <option value="Semanal">Semanal</option>
                               <option value="Quincenal">Quincenal</option>
                               <option value="Mensuales">Mensual</option>
                             </select>
                          </div>
                          
                          {calculoCreditoArticulo && (
                             <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-3">
                                <div className="flex justify-between items-center pb-2 border-b border-emerald-100">
                                   <span className="text-xs font-bold text-emerald-800 uppercase">A Financiar</span>
                                   <span className="font-bold text-emerald-900 text-lg">{formatCurrency(calculoCreditoArticulo.aFinanciar)}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-center">
                                   <div>
                                      <div className="text-xs text-emerald-700 font-bold uppercase mb-1">Cuotas</div>
                                      <div className="bg-white/60 p-2 rounded-lg font-bold text-emerald-900 border border-emerald-100">
                                         {calculoCreditoArticulo.numCuotas} <span className="text-xs font-normal text-emerald-700">x {frecuenciaPago}</span>
                                      </div>
                                   </div>
                                   <div>
                                      <div className="text-xs text-emerald-700 font-bold uppercase mb-1">Valor Cuota</div>
                                      <div className="bg-white/60 p-2 rounded-lg font-bold text-emerald-900 border border-emerald-100">
                                         {formatCurrency(calculoCreditoArticulo.valorCuota)}
                                      </div>
                                   </div>
                                </div>
                             </div>
                          )}
                          


                          <div className="mb-4">
                            <label className="block text-sm font-bold text-slate-700 mb-2">Cuota Inicial</label>
                            <div className="relative">
                              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                              <input 
                                type="text"
                                inputMode="numeric"
                                value={cuotaInicialArticuloInput}
                                onChange={(e) => setCuotaInicialArticuloInput(formatCOPInputValue(e.target.value))}
                                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900"
                                placeholder="0"
                              />
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-bold text-slate-700 mb-2">Fecha Inicio Crédito</label>
                              <input 
                                type="date"
                                value={fechaCreditoInput}
                                disabled={true}
                                className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl font-medium text-slate-500 cursor-not-allowed opacity-75"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-bold text-slate-700 mb-2">Fecha Primer Cobro</label>
                              <input 
                                type="date"
                                value={fechaPrimerCobro}
                                onChange={(e) => setFechaPrimerCobro(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900"
                              />
                            </div>
                          </div>
                        </>
                      )}
                    </>
                  )}

                  {/* Notas - Común para ambos */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Notas (Opcional)</label>
                    <textarea 
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900 resize-none"
                      rows={3}
                      placeholder="Observaciones adicionales..."
                    ></textarea>
                  </div>

                  {/* Resumen */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div className="text-xs font-bold text-slate-500 uppercase mb-2">Resumen</div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Tipo:</span>
                        <span className="font-bold text-slate-900">
                          {creditType === 'prestamo' ? 'Préstamo en Efectivo' : 'Crédito por Artículo'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Estado:</span>
                        <span className="font-bold text-orange-600">Pendiente de Aprobación</span>
                      </div>
                    </div>
                  </div>

                  {/* Botones de Acción */}
                  <div className="flex gap-3 pt-2">
                    <button 
                      onClick={() => {
                        setShowCreditModal(false)
                        setCreditType('prestamo')
                      }}
                      className="flex-1 bg-slate-100 text-slate-700 font-bold py-3.5 rounded-xl hover:bg-slate-200 transition-all"
                    >
                      Cancelar
                    </button>
                    <button 
                      onClick={() => {
                        console.log('Crear crédito:', { creditType, tipoInteres })
                        setShowCreditModal(false)
                        setCreditType('prestamo')
                      }}
                      className="flex-1 bg-[#08557f] text-white font-bold py-3.5 rounded-xl shadow-lg shadow-[#08557f]/20 hover:bg-[#063a58] active:scale-[0.98] transition-all"
                    >
                      Crear Crédito
                    </button>
                  </div>
                </div>
              </div>
              </div>
            </div>
          </Portal>
        )}
      </div>
    </div>
  )
}

export default VistaCobrador