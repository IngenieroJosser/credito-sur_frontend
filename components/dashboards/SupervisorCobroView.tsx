'use client'

/**
 * ============================================================================
 * VISTA OPERATIVA DE COBRANZA - MODO SUPERVISOR
 * ============================================================================
 * Adaptación de VistaCobrador para que el Supervisor pueda gestionar rutas.
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  MapPin,
  RefreshCw,

  CheckCircle2,
  History,
  UserPlus,
  Receipt,
  DollarSign,
  ChevronDown,
  X,
  CreditCard,
  Plus,

  GripVertical,
  Calendar,
  Search,
  FileText as FileTextIcon,

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
import { ExportButton } from '@/components/ui/ExportButton'
import NuevoClienteModal from '@/components/clientes/NuevoClienteModal'
import { VisitaRuta, EstadoVisita, PeriodoRuta, HistorialDia } from '@/lib/types/cobranza'
import { StaticVisitaItem, SortableVisita, Portal, MODAL_Z_INDEX, SeleccionClienteModal } from '@/components/dashboards/shared/CobradorElements'
import { rutasService } from '@/services/rutas-service'
import EstadoCuentaModal from '@/components/cobranza/EstadoCuentaModal'
import PagoModal from '@/components/dashboards/shared/PagoModal'
import CrearCreditoModal from '@/components/dashboards/shared/CrearCreditoModal'
import ReprogramarModal from '@/components/cobranza/ReprogramarModal'
import GastoModal from '@/components/dashboards/shared/GastoModal'
import BaseModal from '@/components/dashboards/shared/BaseModal'
import DetalleMoraModal from '@/components/cobranza/DetalleMoraModal'
import FloatingActionMenu, { FabAction } from '@/components/dashboards/shared/FloatingActionMenu'
import { loansService_ } from '@/services/loans-service'
import { prestamosService } from '@/services/prestamos-service'

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

const SupervisorCobroView = ({ rutaId }: { rutaId?: string }) => {
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
  const [moraCuenta, setMoraCuenta] = useState<{
    id: string
    numeroPrestamo: string
    cliente: { nombre: string; documento: string; telefono: string; direccion: string }
    diasMora: number
    montoMora: number
    montoTotalDeuda: number
    cuotasVencidas: number
    ruta: string
    cobrador: string
    nivelRiesgo: string
  } | null>(null)
  const [showNewClientModal, setShowNewClientModal] = useState(false)
  const [showReprogramModal, setShowReprogramModal] = useState(false)
  const [visitaReprogramar, setVisitaReprogramar] = useState<VisitaRuta | null>(null)
  const [showGastoModal, setShowGastoModal] = useState(false)
  const [showBaseModal, setShowBaseModal] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  
  const [showCreditModal, setShowCreditModal] = useState(false)
  const [isFabOpen, setIsFabOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const [periodoRutaFiltro, setPeriodoRutaFiltro] = useState<PeriodoRuta | 'TODOS'>('TODOS')
  const [selectedHistoryDate, setSelectedHistoryDate] = useState<string | null>(null)
  const [historyViewMode, setHistoryViewMode] = useState<'DAYS' | 'MONTHS'>('DAYS')

  // Selector de cliente para acciones globales
  const [showClientSelector, setShowClientSelector] = useState(false)
  const [pendingAction, setPendingAction] = useState<'CUENTA' | 'AGENDAR' | null>(null)

  const [rutaCompletada, setRutaCompletada] = useState(false)
  const [coordinadorToast, setCoordinadorToast] = useState<string | null>(null)

  const [isLoading, setIsLoading] = useState(true)

  // Determine if this is the supervisor's personal route
  // In a real app, this would check against the user's assigned route ID or a permission flag
  const isPersonal = rutaId === 'RT-SUP' || rutaId === 'SUP-001' || !rutaId // Default to personal if no ID for dev




  const router = useRouter();

  // Datos base
  const [visitasBase, setVisitasBase] = useState<VisitaRuta[]>([])

  const [visitasOrden, setVisitasOrden] = useState<string[]>([])

  const operacionesCaja: OperacionCaja[] = []

  const [historialRutas, setHistorialRutas] = useState<any>({});

  useEffect(() => {
    const cargarHistorial = async () => {
      if (!rutaId) return;
      try {
        const resp = await rutasService.obtenerVisitasDelDia(rutaId as string);
        const hoy = new Date();
        const fecha = hoy.toISOString().split('T')[0];
        
        const visitasMap: any[] = (resp?.visitas || []).map((v: any, index: number) => ({
             id: v.asignacionId || `hist-${index}`,
             cliente: `${v.cliente?.nombres || ''} ${v.cliente?.apellidos || ''}`,
             estado: v.prestamos?.[0]?.proximaCuota?.estado === 'PAGADA' ? 'pagado' : 'pendiente',
             telefono: v.cliente?.telefono,
             montoCuota: Number(v.prestamos?.[0]?.proximaCuota?.monto || 0),
             saldoTotal: Number(v.prestamos?.[0]?.saldoPendiente || 0),
             periodoRuta: 'DIA'
        }));

        setHistorialRutas({
            [fecha]: {
                resumen: { visitados: visitasMap.length, total: visitasMap.length },
                visitas: visitasMap
            }
        });
      } catch (e) {}
    };
    cargarHistorial();
  }, [rutaId]);

  // Cargar datos del usuario y ruta
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const userData = localStorage.getItem('user');
        const token = localStorage.getItem('token');
        
        if (!token) {
          router.replace('/login');
          return;
        }

        if (userData) {
          setUserSession(JSON.parse(userData));
        } else {
             const perfil = await obtenerPerfil();
             localStorage.setItem('user', JSON.stringify(perfil));
             setUserSession(perfil);
        }

        // Cargar Ruta si existe ID
        if (rutaId) {
            const ruta = await rutasService.obtenerRutaPorId(rutaId);
            if (ruta && ruta.asignaciones) {
                 const visitas: VisitaRuta[] = ruta.asignaciones.map((a: any, index: number) => ({
                    id: a.cliente.id, 
                    cliente: `${a.cliente.nombres} ${a.cliente.apellidos}`,
                    direccion: a.cliente.direccion || 'Sin dirección',
                    telefono: a.cliente.telefono || '',
                    horaSugerida: '09:00',
                    montoCuota: 0,
                    saldoTotal: 0,
                    estado: 'pendiente',
                    proximaVisita: 'Hoy',
                    ordenVisita: index + 1,
                    prioridad: 'media',
                    nivelRiesgo: (() => {
                        const r = a.cliente.nivelRiesgo || 'VERDE';
                        if (r === 'VERDE') return 'bajo';
                        if (r === 'AMARILLO') return 'precaucion' as any;
                        if (r === 'ROJO') return 'moderado';
                        if (r === 'LISTA_NEGRA') return 'critico';
                        return 'bajo';
                    })() as any,
                    cobradorId: ruta.cobradorId,
                    periodoRuta: 'DIA',
                    clienteId: a.cliente.id,
                    prestamoId: a.cliente.prestamos?.[0]?.id || ''
                 }));
                 setVisitasBase(visitas);
                 setVisitasOrden(visitas.map(v => v.id));
            }
        }
      } catch (error) {
        console.error('Error al cargar datos:', error);
      } finally {
        setIsLoading(false);
      }
    };

    cargarDatos();
  }, [router, rutaId]);


  // Filtrar y ordenar visitas
  const visitasCobrador = useMemo(() => {
    const filtradas = visitasBase
    
    const buscadas = filtradas.filter(v => 
      v.cliente.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.direccion.toLowerCase().includes(searchQuery.toLowerCase())
    )

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
    operacionesCaja.filter(op => op.cobradorId === 'CB-001'), 
    [operacionesCaja]
  )

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

  // Cargar detalle de mora al abrir el modal
  useEffect(() => {
    const cargarDetalleMora = async () => {
      if (!showMoraModal || !visitaMoraSeleccionada) {
        setMoraCuenta(null)
        return
      }
      const prestamoId = visitaMoraSeleccionada.prestamoId || visitaMoraSeleccionada.id
      try {
        let detalle: any = null
        try {
          detalle = await loansService_.obtenerDetallePrestamo(prestamoId)
        } catch {
          detalle = null
        }
        if (detalle) {
          setMoraCuenta({
            id: visitaMoraSeleccionada.id,
            numeroPrestamo: detalle.numeroPrestamo || detalle.id || prestamoId,
            cliente: {
              nombre: detalle.cliente?.nombre || visitaMoraSeleccionada.cliente,
              documento: detalle.cliente?.documento || 'N/A',
              telefono: detalle.cliente?.telefono || visitaMoraSeleccionada.telefono,
              direccion: detalle.cliente?.direccion || visitaMoraSeleccionada.direccion
            },
            diasMora: Number(detalle.diasMora || 0),
            montoMora: Number(detalle.montoMora ?? (visitaMoraSeleccionada.saldoTotal - visitaMoraSeleccionada.montoCuota)),
            montoTotalDeuda: Number(detalle.montoTotalDeuda ?? visitaMoraSeleccionada.saldoTotal),
            cuotasVencidas: Number(detalle.cuotasVencidas || 0),
            ruta: userSession?.rutaAsignada || 'Ruta Asignada',
            cobrador: userSession?.nombres || 'Cobrador',
            nivelRiesgo: visitaMoraSeleccionada.nivelRiesgo === 'critico' ? 'ROJO' :
                         visitaMoraSeleccionada.nivelRiesgo === 'moderado' ? 'AMARILLO' : 'VERDE'
          })
          return
        }
        const info = await prestamosService.obtenerPrestamoPorId(prestamoId)
        const cuotas = await prestamosService.obtenerCuotas(prestamoId).catch(() => [])
        const vencidas = (cuotas || []).filter((c: any) => c.estado === 'VENCIDA')
        const cuotasVencidas = vencidas.length
        let diasMora = 0
        if (vencidas.length > 0) {
          const oldest = vencidas.reduce((min: any, c: any) => (
            new Date(c.fechaVencimiento).getTime() < new Date(min.fechaVencimiento).getTime() ? c : min
          ), vencidas[0])
          const diff = Math.floor((Date.now() - new Date(oldest.fechaVencimiento).getTime()) / (1000 * 60 * 60 * 24))
          diasMora = diff > 0 ? diff : 0
        }
        const numeroPrestamo = info.numeroPrestamo || info.id || prestamoId
        const montoTotalDeuda = Number(info.saldoPendiente ?? visitaMoraSeleccionada.saldoTotal)
        const montoMora = Number(info.moraAcumulada ?? Math.max(0, visitaMoraSeleccionada.saldoTotal - visitaMoraSeleccionada.montoCuota))
        setMoraCuenta({
          id: visitaMoraSeleccionada.id,
          numeroPrestamo,
          cliente: {
            nombre: visitaMoraSeleccionada.cliente,
            documento: info.cliente?.dni || 'N/A',
            telefono: visitaMoraSeleccionada.telefono,
            direccion: visitaMoraSeleccionada.direccion
          },
          diasMora,
          montoMora,
          montoTotalDeuda,
          cuotasVencidas,
          ruta: userSession?.rutaAsignada || 'Ruta Asignada',
          cobrador: userSession?.nombres || 'Cobrador',
          nivelRiesgo: visitaMoraSeleccionada.nivelRiesgo === 'critico' ? 'ROJO' :
                       visitaMoraSeleccionada.nivelRiesgo === 'moderado' ? 'AMARILLO' : 'VERDE'
        })
      } catch {
        setMoraCuenta({
          id: visitaMoraSeleccionada.id,
          numeroPrestamo: prestamoId,
          cliente: {
            nombre: visitaMoraSeleccionada.cliente,
            documento: 'N/A',
            telefono: visitaMoraSeleccionada.telefono,
            direccion: visitaMoraSeleccionada.direccion
          },
          diasMora: 0,
          montoMora: Math.max(0, visitaMoraSeleccionada.saldoTotal - visitaMoraSeleccionada.montoCuota),
          montoTotalDeuda: visitaMoraSeleccionada.saldoTotal,
          cuotasVencidas: 0,
          ruta: userSession?.rutaAsignada || 'Ruta Asignada',
          cobrador: userSession?.nombres || 'Cobrador',
          nivelRiesgo: visitaMoraSeleccionada.nivelRiesgo === 'critico' ? 'ROJO' :
                       visitaMoraSeleccionada.nivelRiesgo === 'moderado' ? 'AMARILLO' : 'VERDE'
        })
      }
    }
    cargarDetalleMora()
  }, [showMoraModal, visitaMoraSeleccionada, userSession])
  const handleDragCancel = useCallback(() => {
    setActiveId(null)
  }, [])

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

  const activeVisita = activeId ? visitasCobrador.find(v => v.id === activeId) : null

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
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_800px_at_100%_200px,#08557f_0,transparent_100%)] opacity-20"></div>
      </div>

      <div className="relative w-full space-y-8 p-8">
        
        {/* Supervisor Context Banner */}
        <div className={`rounded-xl border p-3 flex items-center gap-3 animate-in slide-in-from-top-4 ${
            isPersonal ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'
        }`}>
            <div className={`p-2 rounded-lg ${isPersonal ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
                <Target className="w-5 h-5" />
            </div>
            <div>
                <h4 className={`font-bold text-sm ${isPersonal ? 'text-blue-900' : 'text-orange-900'}`}>
                    {isPersonal ? 'Mi Ruta Personal' : 'Modo Supervisión'}
                </h4>
                <p className={`text-xs ${isPersonal ? 'text-blue-700' : 'text-orange-700'}`}>
                    {isPersonal ? 'Tienes control total sobre esta ruta.' : 'Visualizando ruta asignada. Modo lectura.'}
                </p>
            </div>
            <button onClick={() => router.back()} className={`ml-auto px-3 py-1.5 rounded-lg text-xs font-bold border shadow-sm ${
                isPersonal ? 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50' : 'bg-white text-orange-600 border-orange-200 hover:bg-orange-50'
            }`}>
                Salir
            </button>
        </div>


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
                  <span className="font-medium text-slate-700">{userSession.rol}</span>
                  <span>•</span>
                  <span>Supervisando {userSession.rutaAsignada || 'Ruta'}</span>
                </div>
              </div>
            </div>
          </div>
        </header>


        {/* Stats rápidos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          
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




        <div className="space-y-6">
          <div className="space-y-6">
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
            
            {/* TOP TOOLBAR - Visible for Supervisor on ANY route */}
            <div className="mt-4 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
                        <button onClick={() => { 
                          if (visitaSeleccionada) {
                             const v = visitasCobrador.find(v => v.id === visitaSeleccionada);
                             if (v) {
                               setVisitaPagoSeleccionadaId(v.id);
                               setPagoInitialIsAbono(false);
                               setShowPaymentModal(true);
                             }
                          } else {
                             setVisitaPagoSeleccionadaId(null);
                             setShowPaymentModal(true);
                             setPagoInitialIsAbono(false); 
                          }
                        }} className="flex-1 min-w-[max-content] bg-[#08557f]/5 text-[#08557f] border border-[#08557f]/10 px-4 py-3 rounded-xl flex items-center justify-center gap-2 font-bold shadow-sm active:scale-95 transition-all">
                            <DollarSign className="h-5 w-5" /> Pagar
                        </button>
                        <button onClick={() => { 
                           if (visitaSeleccionada) {
                             const v = visitasCobrador.find(v => v.id === visitaSeleccionada);
                             if (v) {
                               setVisitaPagoSeleccionadaId(v.id);
                               setPagoInitialIsAbono(true);
                               setShowPaymentModal(true);
                             }
                           } else {
                               setVisitaPagoSeleccionadaId(null); 
                               setShowPaymentModal(true); 
                               setPagoInitialIsAbono(true);
                           }
                        }} className="flex-1 min-w-[max-content] bg-orange-50 text-orange-700 border border-orange-200 px-4 py-3 rounded-xl flex items-center justify-center gap-2 font-bold shadow-sm active:scale-95 transition-all">
                            <RefreshCw className="h-5 w-5" /> Abonar
                        </button>
                        <button onClick={() => { 
                           if (visitaSeleccionada) {
                              const v = visitasCobrador.find(v => v.id === visitaSeleccionada);
                              setVisitaEstadoCuentaSeleccionada(v || null);
                              setShowEstadoCuentaModal(true); 
                           } else {
                              setPendingAction('CUENTA');
                              setShowClientSelector(true);
                           }
                        }} className="flex-1 min-w-[max-content] bg-white text-slate-700 border border-slate-200 px-4 py-3 rounded-xl flex items-center justify-center gap-2 font-bold shadow-sm active:scale-95 transition-all hover:bg-slate-50">
                            <FileTextIcon className="h-5 w-5 text-slate-400" /> Cuenta
                        </button>
                        <button onClick={() => { 
                           if (visitaSeleccionada) {
                              const v = visitasCobrador.find(v => v.id === visitaSeleccionada);
                              setVisitaReprogramar(v || null);
                              setShowReprogramModal(true); 
                           } else {
                              setPendingAction('AGENDAR');
                              setShowClientSelector(true);
                           }
                        }} className="flex-1 min-w-[max-content] bg-white text-slate-700 border border-slate-200 px-4 py-3 rounded-xl flex items-center justify-center gap-2 font-bold shadow-sm active:scale-95 transition-all hover:bg-slate-50">
                            <Calendar className="h-5 w-5 text-slate-400" /> Agendar
                        </button>
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
                  items={visitasOrden}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-6">
                    {(() => {
                      if (showHistory) {
                        const historyDates = Object.keys(historialRutas).sort().reverse(); 

                        return (
                          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
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
                             </div>

                             {historyViewMode === 'DAYS' && (
                                <div className="space-y-3">
                                    <h3 className="text-sm font-bold text-slate-500 uppercase px-1">Historial de Días</h3>
                                    {historyDates.map(date => {
                                       const data = (historialRutas as Record<string, HistorialDia>)[date]
                                       const isExpanded = selectedHistoryDate === date
                                       const [y, m, d] = date.split('-')
                                       const dateObj = new Date(parseInt(y), parseInt(m)-1, parseInt(d))
                                       const dayName = dateObj.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })
                                       
                                       const isCompleted = data.resumen.efectividad === 100 || data.visitas.every((v: VisitaRuta) => v.estado === 'pagado');

                                       return (
                                         <div key={date} 
                                              className={`rounded-2xl border transition-all overflow-hidden bg-white border-slate-200
                                                ${isExpanded ? 'ring-1 ring-slate-300 shadow-md' : 'shadow-sm'}
                                              `}
                                         >
                                           <div 
                                             className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                                             onClick={() => setSelectedHistoryDate(isExpanded ? null : date)}
                                           >
                                             <div className="flex items-center gap-3">
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
                                  disableSort={rutaCompletada || !isPersonal}
                                  isSelected={visita.id === visitaSeleccionada}
                                >
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

                    <div className="space-y-4">
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

        {showEstadoCuentaModal && visitaEstadoCuentaSeleccionada && (
          <EstadoCuentaModal
            onClose={() => {
              setShowEstadoCuentaModal(false)
              setVisitaEstadoCuentaSeleccionada(null)
            }}
            visita={visitaEstadoCuentaSeleccionada}
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
              } else if (pendingAction === 'AGENDAR') {
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



        {showMoraModal && visitaMoraSeleccionada && moraCuenta && (
          <DetalleMoraModal
            cuenta={moraCuenta}
            onClose={() => {
              setShowMoraModal(false)
              setVisitaMoraSeleccionada(null)
              setMoraCuenta(null)
            }}
          />
        )}

        {/* Floating Action Button (FAB) */}
        <FloatingActionMenu actions={[
          { label: 'Crear Crédito', icon: <CreditCard className="h-5 w-5" />, onClick: () => setShowCreditModal(true) },
          { label: 'Nuevo Cliente', icon: <UserPlus className="h-5 w-5" />, onClick: () => setShowNewClientModal(true) },
          { label: 'Registrar abono', icon: <RefreshCw className="h-5 w-5" />, color: 'orange', onClick: () => { setVisitaPagoSeleccionadaId(null); setPagoInitialIsAbono(true); setShowPaymentModal(true); } },
          { label: 'Registrar pago', icon: <DollarSign className="h-5 w-5" />, onClick: () => { setVisitaPagoSeleccionadaId(null); setPagoInitialIsAbono(false); setShowPaymentModal(true); } },
          { label: 'Gastos', icon: <ReceiptText className="h-5 w-5" />, color: 'rose', onClick: () => setShowGastoModal(true) },
        ] as FabAction[]} />
      </div>
    </div>
  )
}

export default SupervisorCobroView
