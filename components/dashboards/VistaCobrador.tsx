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



import { useState, useEffect, useMemo, useCallback, useRef } from 'react'

import { useRealtimeData } from '@/hooks/useRealtimeData'
import { useRutaHistorial } from '@/hooks/useRutaHistorial'
import { useCierrePendienteRuta } from '@/hooks/useCierrePendienteRuta'

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

  AlertTriangle,

  XCircle,

  Info,

  Eye,

  Pencil,

  Trash2,

  ChevronRight,

  ChevronLeft,

  FileDown,
  ShieldAlert,

} from 'lucide-react'

import ConfirmModal from '@/components/ui/ConfirmModal'

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


import { formatCurrency, formatMilesCOP, getDisplayedCOPInteger, isSameDisplayedCOPAmount, resolveMediaUrl } from '@/lib/utils'

import { rutasService, Ruta } from '@/services/rutas-service'

import { registrarGasto, solicitarBase, obtenerSaldoDisponibleRuta, getRutaCierreHoy } from '@/services/contabilidad-service'
import { routesService as routesApi } from '@/services/routes-service'

import {
  buildReprogramacionCierrePendienteKey,
  prestamosService,
} from '@/services/prestamos-service'

import { reportesCoordinadorService } from '@/services/reportes-coordinador-service'
import type { RouteDetailResponse } from '@/services/reportes-coordinador-service'
import { clientesService, Cliente } from '@/services/clientes-service'

import { exportService } from '@/services/export-service'

import NuevoClienteModal from '@/components/clientes/NuevoClienteModal'

import RutaProvisionalModal from '@/components/dashboards/shared/RutaProvisionalModal'
import { VisitaRuta, EstadoVisita, PeriodoRuta, HistorialDia, mapNivelRiesgo, mapFrecuenciaToPeriodo } from '@/lib/types/cobranza'
import { StaticVisitaItem, SortableVisita, Portal, MODAL_Z_INDEX, SeleccionClienteModal } from '@/components/dashboards/shared/CobradorElements'
import EstadoCuentaModal from '@/components/cobranza/EstadoCuentaModal'

import PagoModal from '@/components/cobranza/PagoModal'

import AusenteModal from '@/components/cobranza/AusenteModal'

import CrearCreditoModal from '@/components/dashboards/shared/CrearCreditoModal'

import { CierrePendienteBanner } from '@/components/rutas/CierrePendienteBanner'
import { CierrePendienteDetalleModal } from '@/components/rutas/CierrePendienteDetalleModal'
import { useCierrePendienteDetalle } from '@/hooks/useCierrePendienteDetalle'
import type { CierrePendienteDetalle } from '@/types/rutas/cierre-pendiente'
import ReprogramarModal from '@/components/cobranza/ReprogramarModal'

import GastoModal from '@/components/dashboards/shared/GastoModal'

import BaseModal from '@/components/dashboards/shared/BaseModal'

import DetalleMoraModal from '@/components/cobranza/DetalleMoraModal'

import ClienteInfoModal from '@/components/cobranza/ClienteInfoModal'

import FloatingActionMenu, { FabAction } from '@/components/dashboards/shared/FloatingActionMenu'
import { RutaStatsCards } from './shared/RutaStatsCards'

import RutaKpiSection from '@/components/dashboards/shared/RutaKpiSection'
import SundayNoticeBanner from '@/components/rutas/SundayNoticeBanner'

import { useNotificaciones } from '@/components/providers/NotificacionesProvider'

import {
  buildRegularizedPaymentTarget,
  buildBogotaOffsetIsoFromKey,
  computeMontoExigibleHastaHoyFromCuotas,
  computeMontoNominalHastaHoyFromCuotas,
  computeMetaHoyFromVisitas,
  computeRutaHoyUiStatsFromVisitas,
  esDomingoBogota,
  getBogotaDateKey,
  getBogotaRangeByPeriod,
  getLocalDateKey,
  getPagoBogotaDateKey,
  isCuotaNoPagada,
  isTodayOrPastBogota,
  isVisitaExigibleHoy,
  normalizeDateKey,
  resolveFechaEfectivaCuota,
  shouldExcludeVisitaFromOperationalMeta,
  shouldIncludeVisitaInRutaHoyKpis,
  resolveCuotaProgressFromPrestamo,
  resolveNextPagoFromPrestamo,
  resolveProximaCuotaFromPrestamo,
  shouldMarkVisitaAsPagado,
  shouldShowVisitaEnRutaHoy,
  toBogotaDateTimeOffsetIso,
  computeDiasMoraFromCuotas,
} from '@/lib/rutas-core'
import { mapAsignacionesToVisitasLite } from '@/lib/ruta-visitas-mapper'
import { applyRecaudoHoyToVisitas, buildRecaudosHoyMapByPrestamoId, mergeVisitasPreservingLocalRecaudo, sumMontoTotalPagosByBogotaDateKey, sumMontoTotalPagosHistorico } from '@/lib/ruta-recaudos'
import { buildHistorialDiaFromBackend } from '@/lib/ruta-historial'
import { mapWithConcurrency, memoizePromiseByKey } from '@/lib/async-utils'

import { offlineStore } from '@/lib/offline/offlineDb'

import { formatShortDate } from '@/lib/utils/format'

import { pagosService } from '@/services/pagos-service'

import { TipoAmortizacion, MetodoPago } from '@/types/enums'

import { toast } from 'sonner'

const normalizePeriodoRuta = (raw: any): any => {
  const v = String(raw || '').toUpperCase()
  if (v === 'DIARIO' || v === 'DIA') return 'DIA'
  if (v === 'SEMANAL' || v === 'SEMANA') return 'SEMANA'
  if (v === 'QUINCENAL' || v === 'QUINCENA') return 'QUINCENA'
  if (v === 'MENSUAL' || v === 'MES') return 'MES'
  return 'DIA'
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



const VistaCobrador = () => {

  const { socket } = useNotificaciones()

  const [userSession, setUserSession] = useState<UserSession | null>(null)

  const [visitaSeleccionada, setVisitaSeleccionada] = useState<string | null>(null)

  const [showPaymentModal, setShowPaymentModal] = useState(false)

  const [pagoInitialIsAbono, setPagoInitialIsAbono] = useState(false)

  const [visitaPagoSeleccionada, setVisitaPagoSeleccionada] = useState<VisitaRuta | null>(null)



  const [showClienteInfoModal, setShowClienteInfoModal] = useState(false)

  const [visitaClienteSeleccionada, setVisitaClienteSeleccionada] = useState<VisitaRuta | null>(null)

  const [showEstadoCuentaModal, setShowEstadoCuentaModal] = useState(false)

  const [visitaEstadoCuentaSeleccionada, setVisitaEstadoCuentaSeleccionada] = useState<VisitaRuta | null>(null)

  const [visitaAusente, setVisitaAusente] = useState<VisitaRuta | null>(null)
  const [contextoRegularizacion, setContextoRegularizacion] = useState<any>(null)
  const contextoRegularizacionRef = useRef<any>(null)

  const setRegularizacionContext = useCallback((ctx: any) => {
    contextoRegularizacionRef.current = ctx
    setContextoRegularizacion(ctx)
  }, [])

  const clearRegularizacionContext = useCallback(() => {
    contextoRegularizacionRef.current = null
    setContextoRegularizacion(null)
  }, [])

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

  const [showEditClientModal, setShowEditClientModal] = useState(false)
  const [clientToEdit, setClientToEdit] = useState<Cliente | null>(null)

  const [showDeleteClientModal, setShowDeleteClientModal] = useState(false)
  const [clientToDelete, setClientToDelete] = useState<Cliente | null>(null)

  const [showReprogramModal, setShowReprogramModal] = useState(false)

  const [visitaReprogramar, setVisitaReprogramar] = useState<VisitaRuta | null>(null)

  const [showGastoModal, setShowGastoModal] = useState(false)

  const [showBaseModal, setShowBaseModal] = useState(false)

  const [activeId, setActiveId] = useState<string | null>(null)

  const [accionPendiente, setAccionPendiente] = useState<'PAGO' | 'ABONO' | 'REPROGRAMAR' | 'CUENTA' | null>(null)

  const [showClientSelector, setShowClientSelector] = useState(false)

  const [showRutaProvisional, setShowRutaProvisional] = useState(false)

  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Ref para guardar la posición del scroll
  const scrollPositionRef = useRef<number>(0)

  // Nuevos estados para la refactorización

  // Se eliminan funciones locales de fecha en favor de utilidades centralizadas


  const ajustarEstadoConPago = (v: VisitaRuta): EstadoVisita => {

    if (Number(v.saldoTotal || 0) <= 0) return 'pagado';

    const estadoRaw = String(v?.estado || '').toLowerCase().replace(/\s+/g, '_')
    if (estadoRaw === 'en_mora' || estadoRaw.includes('mora')) return v.estado


    const pagado = shouldMarkVisitaAsPagado({
      saldoTotal: v.saldoTotal,
      recaudadoHoy: v.recaudadoDelDia,
      montoCuotaExigible: v.montoCuota,
      estadoActual: v.estado,
    });

    if (pagado) return 'pagado';
    return v.estado;

  }



  const getDatesByPeriod = useCallback((period: 'HOY' | 'SEM' | 'MES' | 'AÑO') => {
    return getBogotaRangeByPeriod(period)
  }, [])

  const [showCreditModal, setShowCreditModal] = useState(false)

  const [isFabOpen, setIsFabOpen] = useState(false)

  const [searchQuery, setSearchQuery] = useState('')

  const [showHistory, setShowHistory] = useState(false)

  const [showMisClientes, setShowMisClientes] = useState(false)

  const [periodoRutaFiltro, setPeriodoRutaFiltro] = useState<PeriodoRuta | 'TODOS'>('TODOS')

  const [selectedHistoryDate, setSelectedHistoryDate] = useState<string | null>(null)

  const [selectedHistoryMonth, setSelectedHistoryMonth] = useState<string | null>(null)

  const [historyViewMode, setHistoryViewMode] = useState<'DAYS' | 'MONTHS'>('DAYS')

  const [periodoCards, setPeriodoCards] = useState<'HOY' | 'SEM' | 'MES' | 'AÑO'>('HOY')
  // Ref para evitar stale closures en useCallback que no tienen periodoCards en sus deps
  const periodoCardsRef = useRef<'HOY' | 'SEM' | 'MES' | 'AÑO'>('HOY')
  useEffect(() => {
    periodoCardsRef.current = periodoCards
  }, [periodoCards])



  const [gruposColapsados, setGruposColapsados] = useState<Record<string, boolean>>({})

  const toggleGrupo = useCallback(

    (key: string) => setGruposColapsados((prev) => ({ ...prev, [key]: !prev[key] })),

    [],

  )



  const [rutaStats, setRutaStats] = useState<{
    recaudo: number
    meta: number
    eficiencia: number
    gastos: number
    base: number
    pendientes?: number
    clientes?: number
    avance?: number
    nivelRiesgo?: string
    porcentajeMora?: number
  }>({ 
    recaudo: 0, 
    meta: 0, 
    eficiencia: 0, 
    gastos: 0, 
    base: 0,
    pendientes: 0,
    clientes: 0,
    avance: 0,
    nivelRiesgo: 'PELIGRO_MINIMO',
    porcentajeMora: 0
  })



  const [rutaActual, setRutaActual] = useState<Ruta | null>(null)

  const { cierrePendiente, hasCierrePendiente, refreshCierrePendiente } = useCierrePendienteRuta(rutaActual?.id)

  const [showDetalleCierre, setShowDetalleCierre] = useState(false)
  const {
    detalle,
    loading: loadingDetalleCierre,
    cargarDetalle,
  } = useCierrePendienteDetalle(rutaActual?.id)

  const [rutaCompletada, setRutaCompletada] = useState(false)

  const [rutaActivadaHoy, setRutaActivadaHoy] = useState(false)

  const [coordinadorToast, setCoordinadorToast] = useState<string | null>(null)

  const [showConfirmCompleteModal, setShowConfirmCompleteModal] = useState(false)
  const [showDoubleConfirmComplete, setShowDoubleConfirmComplete] = useState(false)

  const [modalAlerta, setModalAlerta] = useState<{titulo: string, mensaje: string, tipo: 'exito' | 'error' | 'info'} | null>(null)



  const [isLoading, setIsLoading] = useState(true)

  const [isLoadingAction, setIsLoadingAction] = useState(false) // New state for actions



  const [creditosPendientes, setCreditosPendientes] = useState<any[]>([]);

  



  const router = useRouter();


  // Datos base - se cargan desde el backend

  const [visitasBase, setVisitasBase] = useState<VisitaRuta[]>([])
  
  const [visitasSelectorFallback, setVisitasSelectorFallback] = useState<VisitaRuta[]>([])

  const [visitasOrden, setVisitasOrden] = useState<string[]>([])

  const visitasOrdenIndex = useMemo(() => {
    const m = new Map<string, number>()
    ;(Array.isArray(visitasOrden) ? visitasOrden : []).forEach((id, idx) => m.set(id, idx))
    return m
  }, [visitasOrden])


  const [operacionesCaja, setOperacionesCaja] = useState<OperacionCaja[]>([])



  // Historial dinámico (pendiente de integración real)

  const [historialRutas, setHistorialRutas] = useState<Record<string, HistorialDia> | null>(null);
  // DEFECTO-B FIX: ref que espeja historialRutas para leer el valor actual en effectos
  // sin necesitar historialRutas como dependencia (evita ciclos de re-render).
  const historialRutasRef = useRef<Record<string, HistorialDia> | null>(null);
  const cuotasHistorialCacheRef = useRef<Map<string, any[]>>(new Map())

  const [monthlyReport, setMonthlyReport] = useState<RouteDetailResponse | null>(null);

  const [recaudadoClienteHoy, setRecaudadoClienteHoy] = useState<number>(0);

  const [nextPagoFecha, setNextPagoFecha] = useState<string | null>(null);



  const [misCreditos, setMisCreditos] = useState<VisitaRuta[]>([])

  const [loadingMisCreditos, setLoadingMisCreditos] = useState(false)

  const [nextPagoMonto, setNextPagoMonto] = useState<number | null>(null);



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

          } catch (error: any) {

            console.warn('Error al obtener perfil, usando modo offline:', error);

            // No echar al usuario si es un problema temporal de red o servidor.

            // Solo redirigir si el token definitivamente murió (401) pero api.ts ya no lanza 401 severamente.

            if (error?.statusCode === 401) {

              router.replace('/login');

            }

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



  // Cargar estadísticas de la ruta según el periodo seleccionado

  const cargarEstadisticasRuta = useCallback(async (rutaId: string) => {

    try {

      const { inicio, fin } = getDatesByPeriod(periodoCards);

      const saldo = await obtenerSaldoDisponibleRuta(rutaId, undefined, inicio, fin);



      setRutaStats(prev => ({

        ...prev,

        recaudo: periodoCards === 'HOY'
          ? Number(prev.recaudo ?? 0)
          : Number(saldo?.recaudoDelDia ?? 0),

        gastos: Number(saldo?.gastosDelDia ?? 0),

        base: Number((saldo as any)?.saldoCaja ?? (saldo as any)?.baseEfectivo ?? prev.base ?? 0),

        // Para HOY preservamos la meta operativa ya cargada desde rutas.
        // No debe moverse por saldos vivos ni regularizaciones de jornadas pasadas.
        meta: prev.meta,

        eficiencia: periodoCards === 'HOY' ? prev.eficiencia : (() => {
          const meta = Number(prev.meta || 0)
          return meta > 0 ? Math.round((Number(saldo?.recaudoDelDia ?? 0) / meta) * 100) : prev.eficiencia
        })()

      }));

    } catch (error) {

      console.error("Error al cargar estadísticas por periodo:", error);

    }

  }, [periodoCards, rutaActual?.id]);



  // Recargar estadísticas cuando cambie el periodo o la ruta

  useEffect(() => {

    if (rutaActual?.id) {

      cargarEstadisticasRuta(rutaActual.id);

    }

  }, [periodoCards, rutaActual?.id, cargarEstadisticasRuta]);



  const computeHoyBogotaKey = useCallback(() => {
    const d = new Date()
    return getBogotaDateKey(d)
      || `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }, [])

  const [hoyBogotaKey, setHoyBogotaKey] = useState<string>(() => computeHoyBogotaKey())

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined

    const msHastaMedianocheBogota = () => {
      const ahora = new Date()
      const key = getBogotaDateKey(ahora)
      if (!key) return 60_000
      const nextMidnight = new Date(`${key}T24:00:00-05:00`).getTime()
      return Math.max(1_000, nextMidnight - ahora.getTime())
    }

    const programar = () => {
      timeout = setTimeout(() => {
        setHoyBogotaKey(computeHoyBogotaKey())
        programar()
      }, msHastaMedianocheBogota())
    }

    programar()
    return () => {
      if (timeout) clearTimeout(timeout)
    }
  }, [computeHoyBogotaKey])



  const cargarMisCreditosAsignados = useCallback(async (cobradorId: string) => {

    try {

      setLoadingMisCreditos(true)

      const resp = await rutasService.obtenerCreditosAsignadosACobrador(cobradorId)

      if (process.env.NODE_ENV !== 'production') {
        console.log('[Mis clientes] cobradorId:', cobradorId, 'resp:', JSON.stringify(resp)?.substring(0, 500))
      }

      const raw = (resp as any)?.data

      const filas = Array.isArray(raw) ? raw : []

      if (!Array.isArray(raw)) {

        console.warn('Mis clientes: respuesta inesperada en obtenerCreditosAsignadosACobrador', resp)

      } else if (filas.length === 0) {

        console.warn('[Mis clientes] Backend devolvió 0 filas para cobradorId:', cobradorId, '- ¿hay asignaciones activas con préstamos?')

      }



      const mapped: VisitaRuta[] = await Promise.all(filas.map(async (row: any, idx: number) => {
        const c = row?.cliente || {}
        const p = row?.prestamo || {}
        let prestamoAutoritativo: any = p
        if (p?.id) {
          try {
            const detalle = await prestamosService.obtenerPrestamoPorId(p.id)
            if (detalle) prestamoAutoritativo = detalle
          } catch {
            // ignore
          }
        }

        // Asegurar cuotas autoritativas para calcular exigible (incluye abonos).
        try {
          const cuotasEmb = Array.isArray((prestamoAutoritativo as any)?.cuotas) ? (prestamoAutoritativo as any).cuotas : []
          const faltanAbonos = cuotasEmb.some((c: any) => c && c.montoPagado === undefined)
          if (p?.id && (cuotasEmb.length === 0 || faltanAbonos)) {
            const cuotas = await prestamosService.obtenerCuotas(p.id)
            prestamoAutoritativo = { ...prestamoAutoritativo, cuotas }
          }
        } catch {
          // ignore
        }

        const { cuota: prox, fechaEfectiva } = resolveProximaCuotaFromPrestamo(prestamoAutoritativo)
        const esArticulo = p?.tipo === 'ARTICULO';
        const toNivel = (nivel: string) => {
          if (nivel === 'VERDE')   return 'bajo';
          if (nivel === 'AMARILLO') return 'precaucion';
          if (nivel === 'ROJO')    return 'moderado';
          if (nivel === 'LISTA_NEGRA') return 'critico';
          return 'bajo';
        };

        const nombreCredito = esArticulo ? (p?.articulo || 'Artículo') : 'Préstamo'
        const { cuotaActual, cuotasTotales } = resolveCuotaProgressFromPrestamo(prestamoAutoritativo)
        const cuotasForMonto = Array.isArray((prestamoAutoritativo as any)?.cuotas) ? (prestamoAutoritativo as any).cuotas : []
        const montoExigible = esArticulo
          ? computeMontoNominalHastaHoyFromCuotas(cuotasForMonto as any, hoyBogotaKey)
          : computeMontoExigibleHastaHoyFromCuotas(cuotasForMonto as any, hoyBogotaKey)
        const montoNominalProx = Number((prox as any)?.montoNominal ?? (prox as any)?.monto ?? 0)
        const montoPagadoProx = Number((prox as any)?.montoPagado ?? 0)
        const pendienteProx = Math.max(0, montoNominalProx - montoPagadoProx)
        const montoCuota = montoExigible > 0
          ? montoExigible
          : pendienteProx
        const montoCuotaNominal = computeMontoNominalHastaHoyFromCuotas(cuotasForMonto as any, hoyBogotaKey)
        const montoCuotaTotal = montoCuotaNominal > 0
          ? Math.max(montoCuotaNominal, Number((prox as any)?.monto ?? 0))
          : Number((prox as any)?.monto ?? montoCuota)
        const proximaVisitaV = fechaEfectiva || (prox as any)?.fechaVencimiento || row?.prestamo?.fechaEfectiva || hoyBogotaKey

        const hoyBogota = hoyBogotaKey
        const cuotasForEstado = Array.isArray((prestamoAutoritativo as any)?.cuotas) ? (prestamoAutoritativo as any).cuotas : []
        const tieneMora = (() => {
          const byCuotas = (Array.isArray(cuotasForEstado) ? cuotasForEstado : []).some((c: any) => {
            if (!c || !isCuotaNoPagada(c)) return false
            const vtoRaw = resolveFechaEfectivaCuota(c) || String(c?.fechaVencimiento || '')
            const vtoKey = normalizeDateKey(vtoRaw)
            return !!vtoKey && !!hoyBogota && vtoKey < hoyBogota
          })
          if (byCuotas) return true

          // Fallback: si no vinieron cuotas, inferir mora comparando la próxima visita
          const proxKey = proximaVisitaV ? normalizeDateKey(String(proximaVisitaV)) : ''
          return !!proxKey && !!hoyBogota && proxKey < hoyBogota
        })()

        const proxEstado = String((prox as any)?.estado || '').toUpperCase()
        const estadoCalculado: EstadoVisita = (() => {
          if (Number(p?.saldoPendiente || 0) <= 0) return 'pagado'
          if (proxEstado === 'PAGADA' || proxEstado === 'PAGADO') return 'pagado'
          if (tieneMora) return 'en_mora'
          return 'pendiente'
        })()

        const diasMora = computeDiasMoraFromCuotas(cuotasForEstado as any, hoyBogota, p?.frecuenciaPago || 'DIARIO');
        const ultimoPagoDate = 0

        return {
          id: `${row?.asignacionId || 'asig'}-${p?.id || idx}`,
          cliente: `${c?.nombres || ''} ${c?.apellidos || ''}`.trim() || 'Cliente',
          direccion: c?.direccion || 'Sin dirección registrada',
          telefono: c?.telefono || '',
          horaSugerida: '08:00 AM',
          montoCuota: montoCuotaTotal,
          montoCuotaPendiente: montoCuota,
          saldoTotal: estadoCalculado === 'pagado' ? 0 : montoCuota,
          estado: estadoCalculado,
          proximaVisita: proximaVisitaV,
          ordenVisita: Number(row?.ordenVisita || idx + 1),
          prioridad: 'media' as any,
          nivelRiesgo: toNivel(c?.nivelRiesgo || 'VERDE') as any,
          diasMora,
          cobradorId,
          periodoRuta: normalizePeriodoRuta(p?.frecuenciaPago || 'DIARIO') as any,
          clienteId: c?.id || '',
          prestamoId: p?.id || '',
          tipoPrestamo: esArticulo ? 'ARTICULO' : 'EFECTIVO',
          articuloNombre: nombreCredito,
          enProrroga: !!prox?.enProrroga,
          fechaProrroga: prox?.fechaVencimientoProrroga || undefined,
          cuotaActual,
          cuotasTotales,
          recaudadoDelDia: 0,
          recaudadoTotalClient: 0,
          fechaUltimoPago: ultimoPagoDate
        } as any;
      }));

      // Dedupe igual que admin: evita préstamos repetidos / filas duplicadas.
      const idsProcesados = new Set<string>()
      const firstPass = (Array.isArray(mapped) ? mapped : []).flatMap((v: any) => {
        const uniqueKey = v?.prestamoId ? `loan-${v.prestamoId}` : `client-${v.clienteId}`
        if (idsProcesados.has(uniqueKey)) return []
        idsProcesados.add(uniqueKey)
        return [v]
      })
      const clientesConPrestamo = new Set(firstPass.filter((v: any) => v?.prestamoId).map((v: any) => v?.clienteId))
      const mappedDedupe = firstPass.filter((v: any) => {
        if (!v?.prestamoId && clientesConPrestamo.has(v?.clienteId)) return false
        return true
      }) as any

      const finales = mappedDedupe.sort((a: any, b: any) => {
        if (a.estado === 'pagado' && b.estado !== 'pagado') return 1;
        if (a.estado !== 'pagado' && b.estado === 'pagado') return -1;
        const ao = Number((a as any).ordenVisita ?? 0);
        const bo = Number((b as any).ordenVisita ?? 0);
        if (ao !== bo) return ao - bo;
        const aId = String((a as any).id || '');
        const bId = String((b as any).id || '');
        return aId.localeCompare(bId);
      });

      setMisCreditos(finales)

    } catch (e: any) {

      console.error('Error cargando mis clientes (VistaCobrador):', e)

      toast.error('No se pudieron cargar los clientes asignados.')

    } finally {

      setLoadingMisCreditos(false)

    }

  // BUG-03 FIX: agregar hoyBogotaKey a deps para evitar stale closure al cambio de día.
  }, [hoyBogotaKey])



  useEffect(() => {

    let cancelled = false

    const rutaId = rutaActual?.id

    if (!rutaId) return



    ;(async () => {

      try {

        const resp = await getRutaCierreHoy(rutaId)

        if (cancelled) return

        if (resp?.cerradaHoy) setRutaCompletada(true)

      } catch {

        // ignore

      }

    })()



    return () => {

      cancelled = true

    }

  }, [rutaActual?.id])



  useEffect(() => {

    let cancelled = false

    const rutaId = rutaActual?.id

    if (!rutaId) return



    ;(async () => {

      try {

        const resp = await routesApi.getActivacionHoy(rutaId)

        if (cancelled) return

        setRutaActivadaHoy(Boolean(resp?.operableHoy ?? resp?.activadaHoy))

      } catch {

        // ignore

      }

    })()



    return () => {

      cancelled = true

    }

  }, [rutaActual?.id])



  const esDiaNoLaboral = esDomingoBogota()
  const rutaOperable = rutaActivadaHoy && !rutaCompletada && !esDiaNoLaboral

  const visitasBaseRef = useRef<any[]>([])
  useEffect(() => {
    visitasBaseRef.current = Array.isArray(visitasBase) ? (visitasBase as any[]) : []
  }, [visitasBase])

  // BUG-09 FIX: Map<string, number> con timestamp para evitar locks indefinidos.
  // El lock caduca después de 3s automáticamente sin necesidad de timeout externo.
  const pagosInFlightRef = useRef<Map<string, number>>(new Map())

  // WebSocket handler – se declara DESPUÉS de cargarDatosRuta (ver abajo)

  // para evitar referencia forward. El useEffect del socket está al final

  // del bloque de cargas.



  useEffect(() => {

    if (!showMisClientes || !userSession?.id) return

    cargarMisCreditosAsignados(userSession.id)

  }, [showMisClientes, userSession?.id, cargarMisCreditosAsignados])



  // ---------------------------------------------------------------------------

  // cargarDatosRuta – función estable (useCallback) que carga la lista completa

  // de visitas/cuotas desde el backend. Está separada del useEffect para poder

  // ser invocada también desde el handler de WebSocket.

  // ---------------------------------------------------------------------------

  const cargarDatosRuta = useCallback(async (silent = false) => {

    if (!userSession?.id) return;

      try {

        if (!silent) setIsLoading(true);

        // 1. Obtener la ruta asignada al cobrador

        const rutas = await rutasService.obtenerRutas({ cobradorId: userSession.id, limit: 1 });

        const rutaResumen = rutas[0]; 

        

        if (!rutaResumen) {

          setRutaActual(null);

          setVisitasBase([]);

          setVisitasOrden([]);

          setIsLoading(false);

          return;

        }



        // 2. Obtener el detalle COMPLETO de la ruta (incluyendo TODAS las asignaciones)

        // Esto garantiza que se trae todo lo asignado en Base de Datos.

        const rutaCompleta = await rutasService.obtenerRutaPorId(rutaResumen.id);
        const estDetalleRuta = (rutaCompleta as any)?.estadisticas || {};
        const estadisticasAutoritativas = {
          ...estDetalleRuta,
          cobranzaDelDia: Math.max(
            Number(estDetalleRuta?.cobranzaDelDia || 0),
            Number((rutaResumen as any)?.cobranzaDelDia || 0),
            Number((rutaResumen as any)?.estadisticas?.cobranzaDelDia || 0),
          ),
          metaDelDia: Math.max(
            Number(estDetalleRuta?.metaDelDia || 0),
            Number((rutaResumen as any)?.metaDelDia || 0),
            Number((rutaResumen as any)?.estadisticas?.metaDelDia || 0),
          ),
        };
        const rutaCompletaAutoritativa = {
          ...(rutaCompleta as any),
          estadisticas: estadisticasAutoritativas,
        };

        setRutaActual(rutaCompletaAutoritativa as any);

        // 3. Actualizar estadísticas con datos reales del backend

        // 3. Actualizar estadísticas con datos reales del backend
        const est = estadisticasAutoritativas;
        // DEFECTO-D FIX: Usar periodoCardsRef en lugar de periodoCards para evitar stale closures
        // dado que cargarDatosRuta no tiene a periodoCards en sus deps.
        const { inicio: cardInicio, fin: cardFin } = getDatesByPeriod(periodoCardsRef.current);
        let saldo: any = null;

        try {
          saldo = await obtenerSaldoDisponibleRuta(rutaCompleta.id, undefined, cardInicio, cardFin);
          
          setRutaStats(prev => ({
            ...prev,
            recaudo: periodoCardsRef.current === 'HOY'
              ? Number(prev?.recaudo || 0)
              : Number(saldo?.cobranzaDelDia ?? saldo?.recaudoDelDia ?? est.cobranzaDelDia ?? 0),
            meta: est.metaDelDia != null ? Number(est.metaDelDia) : Number(prev?.meta || 0),
            eficiencia: periodoCardsRef.current === 'HOY'
              ? Number(prev?.eficiencia || 0)
              : ((est.metaDelDia > 0) ? Math.round((Number(saldo?.cobranzaDelDia ?? saldo?.recaudoDelDia ?? 0) / est.metaDelDia) * 100) : Number(est.avanceDiario ?? 0)),
            gastos: Number(saldo?.gastosDelDia ?? 0),
            base: Number(saldo?.saldoCaja ?? saldo?.baseEfectivo ?? 0)
          }));
        } catch (errSaldo) {
          console.error("Error al obtener saldo de la ruta:", errSaldo);
          setRutaStats(prev => ({
            ...prev,
            recaudo: periodoCardsRef.current === 'HOY'
              ? Number(prev?.recaudo || 0)
              : Number(est.cobranzaDelDia ?? 0),
            meta: est.metaDelDia != null ? Number(est.metaDelDia) : Number(prev?.meta || 0),
            eficiencia: Number(est.avanceDiario ?? 0),
            gastos: 0,
            base: 0
          }));
        }







        // 4. Construir visitas desde asignaciones (ruta completa) con lógica correcta de próxima cuota y “aparece hoy”.
        const hoyKey = hoyBogotaKey

        const asignaciones = (rutaCompletaAutoritativa as any).asignaciones || (rutaCompletaAutoritativa as any).asignacionesRuta || []

        const visitasMapeadas: VisitaRuta[] = mapAsignacionesToVisitasLite({
          asignaciones,
          hoyKey,
          cobradorId: rutaCompleta.cobradorId,
        }) as any

        const idsProcesados = new Set<string>()
        const firstPass = (Array.isArray(visitasMapeadas) ? visitasMapeadas : []).flatMap((v: any) => {
          const uniqueKey = v?.prestamoId ? `loan-${v.prestamoId}` : `client-${v.clienteId}`
          if (idsProcesados.has(uniqueKey)) return []
          idsProcesados.add(uniqueKey)
          return [v]
        })

        const clientesConPrestamo = new Set(firstPass.filter((v: any) => v?.prestamoId).map((v: any) => v?.clienteId))
        const visitasMapeadasDedupe = firstPass.filter((v: any) => {
          if (!v?.prestamoId && clientesConPrestamo.has(v?.clienteId)) return false
          return true
        }) as any

        visitasMapeadasDedupe.sort((a: any, b: any) => (a.ordenVisita || 0) - (b.ordenVisita || 0))

        if (periodoCardsRef.current === 'HOY') {
          const metaFallback = (Array.isArray(visitasMapeadasDedupe) ? visitasMapeadasDedupe : [])
            .filter((v: any) => {
              const estadoRaw = String(v?.estado || '').toLowerCase().replace(/\s+/g, '_')
              if (estadoRaw === 'en_mora' || estadoRaw.includes('mora')) return true
              if (String(v?.periodoRuta || '').toUpperCase() === 'DIA') return true
              const proximaKey = v?.proximaVisita ? normalizeDateKey(String(v.proximaVisita)) : ''
              return !!proximaKey && proximaKey === hoyKey
            })
            .reduce((sum: number, v: any) => sum + Number(v?.montoCuota || 0), 0)

          if (metaFallback > 0) {
            setRutaStats(prev => {
              const metaPrev = Number(prev?.meta || 0)
              if (metaPrev > 0) return prev
              return { ...prev, meta: metaFallback }
            })
          }
        }

        let visitasEnriquecidas = visitasMapeadasDedupe
        try {
          const getCuotasByPrestamoId = memoizePromiseByKey(
            (prestamoId) => prestamosService.obtenerCuotas(prestamoId) as Promise<any[]>,
            () => [],
          )

          visitasEnriquecidas = await mapWithConcurrency(
            visitasMapeadasDedupe,
            async (v: any) => {
              if (!v?.prestamoId) return v
              const cuotas = await getCuotasByPrestamoId(String(v.prestamoId))
              const tipoPrestamo = String((v as any)?.tipoPrestamo || '').toUpperCase()
              const baseCuota = Number(v?.montoCuota || 0)
              const saldoPendiente = Number(v?.saldoTotal || 0)
              const tieneMora = (Array.isArray(cuotas) ? cuotas : []).some((c: any) => {
                if (!c || !isCuotaNoPagada(c)) return false
                const vtoRaw = resolveFechaEfectivaCuota(c) || String(c?.fechaVencimiento || '')
                const vtoKey = normalizeDateKey(vtoRaw)
                return !!vtoKey && vtoKey < hoyKey
              })

              if (tipoPrestamo !== 'ARTICULO') {
                const exigiblePendiente = computeMontoExigibleHastaHoyFromCuotas(cuotas as any, hoyKey)
                const exigibleNominal = computeMontoNominalHastaHoyFromCuotas(cuotas as any, hoyKey)
                return {
                  ...v,
                  montoCuota: exigibleNominal > 0 ? Math.max(exigibleNominal, baseCuota) : baseCuota,
                  montoCuotaPendiente: exigiblePendiente > 0 ? exigiblePendiente : (v as any)?.montoCuotaPendiente,
                  estado: (saldoPendiente <= 0 ? 'pagado' : (tieneMora ? 'en_mora' : v.estado)) as any,
                }
              }

              const exigibleNominal = computeMontoNominalHastaHoyFromCuotas(cuotas as any, hoyKey)
              const exigiblePendiente = computeMontoExigibleHastaHoyFromCuotas(cuotas as any, hoyKey)

              if (!(exigibleNominal > 0) && !tieneMora) {
                if (saldoPendiente > 0) {
                  return {
                    ...v,
                    montoCuota: saldoPendiente,
                    estado: 'pendiente' as any,
                  }
                }
                return v
              }
              return {
                ...v,
                montoCuota: Math.max(exigibleNominal, baseCuota),
                montoCuotaPendiente: exigiblePendiente,
                estado: (saldoPendiente <= 0 ? 'pagado' : (tieneMora ? 'en_mora' : v.estado)) as any,
              }
            },
            6,
          ) as any
        } catch {
          visitasEnriquecidas = visitasMapeadasDedupe
        }

        const debugRutaClienteQuery = (() => {
          try {
            return String(window?.localStorage?.getItem('debugRutaCliente') || '').toLowerCase().trim()
          } catch {
            return ''
          }
        })()

        if (debugRutaClienteQuery) {
          ;(Array.isArray(visitasEnriquecidas) ? visitasEnriquecidas : []).forEach((v: any) => {
            const nombre = String(v?.cliente || '').toLowerCase()
            if (!nombre.includes(debugRutaClienteQuery)) return
            console.log('[DEBUG VISITA]', {
              id: v?.id,
              cliente: v?.cliente,
              tipoPrestamo: (v as any)?.tipoPrestamo,
              montoCuota: v?.montoCuota,
              montoCuotaPendiente: (v as any)?.montoCuotaPendiente,
              saldoTotal: v?.saldoTotal,
              estado: v?.estado,
              recaudadoDelDia: v?.recaudadoDelDia,
              proximaVisita: v?.proximaVisita,
              periodoRuta: v?.periodoRuta,
              prestamoId: v?.prestamoId,
            })
          })
        }

        // Enriquecer con recaudo HOY para poder marcar correctamente como 'pagado'
        // (y evitar que una visita ya cobrada aparezca como pendiente tras refresh).
        try {
          const pagosResp = await pagosService.obtenerPagos({ limit: 5000 })
          const pagosData = (pagosResp as any)?.pagos || pagosResp || []
          const recaudosHoyMap = buildRecaudosHoyMapByPrestamoId(
            pagosData as any,
            hoyKey,
            { includeCierrePendiente: false },
          )
          visitasEnriquecidas = applyRecaudoHoyToVisitas(visitasEnriquecidas as any, {
            hoyBogotaKey: hoyKey,
            recaudosHoyMap,
          }) as any
        } catch {
          // silencioso
        }

        const merged = mergeVisitasPreservingLocalRecaudo(visitasBaseRef.current as any, visitasEnriquecidas as any)
        setVisitasBase(merged as any)
        setVisitasSelectorFallback(merged as any)
        setVisitasOrden((merged as any[]).map((v: any) => v.id))



      } catch (err) {

        console.error('Error cargando datos completos de ruta:', err);

        

        // Fallback offline: intentar reconstruir la ruta desde IndexedDB si falla la red

        try {

          const [offlineRutas, offlineClientes, offlinePrestamos, offlineCuotas] = await Promise.all([

            offlineStore.getAll<any>('rutas'),

            offlineStore.getAll<any>('clientes'),

            offlineStore.getAll<any>('prestamos'),

            offlineStore.getAll<any>('cuotas'),

          ]);



          // Buscar la ruta del cobrador actual

          const miRuta = offlineRutas.find(r => r.cobradorId === userSession.id);

          

          if (miRuta) {

             setRutaActual(miRuta);

             

             // Filtrar clientes de esta ruta

             const dataParaMapear = offlineClientes.filter(c => c.rutaId === miRuta.id);

             

             const visitasOffline: VisitaRuta[] = dataParaMapear.map((c: any, idx: number) => {

                 // Buscar préstamo activo para el cliente (solo estados operativos)

                 const p = offlinePrestamos.find(lp => 

                   lp.clienteId === c.id && 

                   (lp.estado === 'ACTIVO' || lp.estado === 'VENCIDO' || lp.estado === 'EN_MORA' || lp.estado === 'PENDIENTE')

                 );

                 

                 const proximaCuota = p ? offlineCuotas.find(cq => cq.prestamoId === p.id && cq.estado !== 'PAGADA') : null;

                 

                 return {

                     id: `offline-${c.id}`,

                     cliente: `${c.nombres || ''} ${c.apellidos || ''}`.trim(),

                     direccion: c.direccion || 'Sin dirección (Offline)',

                     telefono: c.telefono || '',

                     horaSugerida: '08:00 AM',

                     montoCuota: Number(proximaCuota?.monto || p?.montoCuota || 0),

                     saldoTotal: proximaCuota?.estado === 'PAGADA' || proximaCuota?.estado === 'PAGADO' ? 0 : Number(p?.saldoPendiente || 0),

                     estado: proximaCuota?.estado === 'VENCIDA' ? 'en_mora' : (proximaCuota?.estado === 'PAGADA' || proximaCuota?.estado === 'PAGADO' ? 'pagado' : 'pendiente'),

                     proximaVisita: proximaCuota?.fechaVencimiento || 'Offline',

                     ordenVisita: idx + 1,

                     prioridad: 'media',

                     nivelRiesgo: (c.nivelRiesgo || 'BAJO').toLowerCase() as any,

                     cobradorId: userSession.id,

                     periodoRuta: normalizePeriodoRuta(p?.frecuenciaPago || 'DIARIO') as PeriodoRuta,

                     clienteId: c.id,

                     prestamoId: p?.id

                 };

             });



             setVisitasBase(visitasOffline);

             setVisitasSelectorFallback(visitasOffline);

             setVisitasOrden(visitasOffline.map(v => v.id));

             

             // KPIs Offline básicos

             const totalMora = visitasOffline.filter(v => v.estado === 'en_mora').length;

             setRutaStats({

               recaudo: 0,

               meta: visitasOffline.reduce((sum, v) => sum + v.montoCuota, 0),

               eficiencia: 0,

               gastos: 0,

               base: 0

             });

          } else {

             setVisitasBase([]);

             setVisitasOrden([]);

          }

        } catch (offlineErr) {

          console.error('Error crítico en el fallback offline:', offlineErr);

          setVisitasBase([]);

          setVisitasOrden([]); 

        }

      } finally {
        if (!silent) setIsLoading(false)
      }

  // BUG-05 FIX: cargarDatosRuta NO depende de periodoCards — las visitas son independientes
  // del período. Las estadísticas por período se actualizan via cargarEstadisticasRuta (useEffect L681).
  // Eliminando periodoCards/getDatesByPeriod se evitan 60+ requests paralelos en cada cambio de filtro.
  }, [userSession?.id, hoyBogotaKey])


  useEffect(() => {

    cargarDatosRuta();

  }, [cargarDatosRuta, refreshTrigger]);



  // ---------------------------------------------------------------------------

  // WebSocket: suscripción a eventos de tiempo real via useRealtimeData.

  // ---------------------------------------------------------------------------



  // Handler completo: update focalizado con fallback a recarga completa
  const handlerFull = useCallback(async (payload?: any) => {
    const prestamoId = payload?.prestamoId || payload?.metadata?.prestamoId;
    const clienteId = payload?.clienteId || payload?.metadata?.clienteId;

    // BUG-09 FIX: el lock caduca si tiene más de 3s — evita bloquear WS updates por locks antiguos.
    const inFlightTs = prestamoId ? pagosInFlightRef.current.get(String(prestamoId)) : undefined;
    if (inFlightTs !== undefined && Date.now() - inFlightTs < 3000) {
      return
    }
    // Limpiar lock caducado si existía
    if (prestamoId && inFlightTs !== undefined) pagosInFlightRef.current.delete(String(prestamoId))

    // Manejo focalizado de visitas registradas (ausente, etc.)
    const accionVisita = payload?.accion || payload?.metadata?.accion;
    const clienteIdVisita = payload?.clienteId || payload?.metadata?.clienteId;
    const estadoVisitaPayload = payload?.estadoVisita || payload?.metadata?.estadoVisita;
    const notasVisitaPayload = payload?.notasVisita || payload?.notas || payload?.metadata?.notasVisita || payload?.metadata?.notas;

    if (accionVisita === 'VISITA_REGISTRADA' && clienteIdVisita && estadoVisitaPayload) {
      setVisitasBase((prev) => {
        const nextVisitas = prev.map((v) =>
          v.clienteId === clienteIdVisita
            ? { ...v, estado: estadoVisitaPayload as any, estadoVisita: estadoVisitaPayload as any, notasVisita: notasVisitaPayload ?? (v as any).notasVisita }
            : v,
        )
        visitasBaseRef.current = nextVisitas
        return nextVisitas
      })
      // Limpiar historial de hoy para forzar re-fetch si está abierto
      const hoyKey = hoyBogotaKey
      setHistorialRutas((prev: any) => {
        if (!prev || !prev[hoyKey]) return prev
        const next = { ...prev }
        delete next[hoyKey]
        return next
      })
      // Recalcular rutaStats para reflejar cambios en meta excluyendo ausentes
      setRutaStats((prev: any) => {
        if (periodoCards !== 'HOY') return prev
        const isAusente = shouldExcludeVisitaFromOperationalMeta
        const visitasActualizadas = visitasBaseRef.current || []
        const visitasSinAusentes = visitasActualizadas.filter((v: any) => !isAusente(v))
        const statsHoy = computeRutaHoyUiStatsFromVisitas(visitasSinAusentes, 0)
        const recaudo = Number(statsHoy.recaudo || 0)
        return {
          ...prev,
          meta: statsHoy.meta || 0,
          recaudo,
          pendiente: Math.max(0, (statsHoy.meta || 0) - recaudo),
        }
      })
      return // No necesita recarga completa
    }

    if (prestamoId) {
      const existeEnVisitas = visitasBaseRef.current.some((v: any) => v?.prestamoId === prestamoId);
      if (!existeEnVisitas) {
        await cargarDatosRuta(true);

        if (showMisClientes && userSession?.id) {
          await cargarMisCreditosAsignados(userSession.id);
        }

        return;
      }
      try {
        const p = await prestamosService.obtenerPrestamoPorId(prestamoId);
        const cuotas = await prestamosService.obtenerCuotas(prestamoId);
        const prox = cuotas.find((c: any) => c.estado !== 'PAGADA');
        
        let totalHoy = 0;
        if (prestamoId || clienteId) {
           const { pagosService } = await import('@/services/pagos-service');
           const pagosResp = prestamoId
             ? await pagosService.obtenerPagos({ prestamoId, limit: 1000 })
             : await pagosService.obtenerPagos({ clienteId, limit: 1000 });
           const pagosCalc = (pagosResp?.pagos || []);
           const hoyBogota = hoyBogotaKey
           const recaudosHoyMap = buildRecaudosHoyMapByPrestamoId(
             pagosCalc as any,
             hoyBogota,
             { includeCierrePendiente: false },
           )
           totalHoy = prestamoId ? Number(recaudosHoyMap[prestamoId] || 0) : 0
        }

        setVisitasBase((prev) => {
          const nuevas = prev.map(v => {
            if (v.prestamoId === prestamoId) {
              let nuevoEstado: EstadoVisita = 'pendiente';
              if (prox?.estado === 'VENCIDA' || (prox as any)?.estado === 'ATRASADA') nuevoEstado = 'en_mora';
              else if (!prox) nuevoEstado = 'pagado';
              
              const hoyStr = hoyBogotaKey;

              const cuotasVencidasHoy = cuotas.filter((c: any) => {
                if (c.estado === 'ANULADA') return false;
                if (c.estado === 'PAGADA') {
                  const f = c.fechaPago || '';
                  return f.startsWith(hoyStr);
                }
                const dV = c.fechaVencimiento?.split('T')[0];
                return dV && dV <= hoyStr;
              });
              const metaEstableRealtime = cuotasVencidasHoy.reduce((s, c) => s + Number(c.monto || 0), 0);

              const baseV: any = {
                ...v,
                estado: nuevoEstado,
                montoCuota: metaEstableRealtime,
                proximaVisita: prox?.fechaVencimiento || v.proximaVisita,
                cuotaActual: prox?.numeroCuota || v.cuotaActual,
                saldoTotal: nuevoEstado === 'pagado' ? 0 : Number(p.saldoPendiente || 0),
                recaudadoDelDia: Math.max(Number(v?.recaudadoDelDia || 0), Number(totalHoy || 0)),
              };

              baseV.estado = ajustarEstadoConPago(baseV as any) as any;
            // También limpiar el historial cargado para hoy, para forzar re-fetch
            const keyHoy = hoyBogotaKey;
            
            setHistorialRutas((prev: any) => {
              if (!prev || !prev[keyHoy]) return prev;
              const next = { ...prev };
              delete next[keyHoy];
              return next;
            });

            return baseV;
          }
          return v;
        });

        return nuevas;
      });
        
        if (rutaActual?.id) {
          cargarEstadisticasRuta(rutaActual.id);
        }
        return; // Evita recarga completa
      } catch (error) {
        console.error("Fallo update focalizado via socket, haciendo recarga completa", error);
      }
    }

    await cargarDatosRuta(true);

    if (showMisClientes && userSession?.id) {
      await cargarMisCreditosAsignados(userSession.id);
    }
  }, [cargarDatosRuta, showMisClientes, userSession?.id, cargarMisCreditosAsignados, rutaActual?.id, cargarEstadisticasRuta])

// ...
  const handlerKpi = useCallback(async () => {

    if (rutaActual?.id) await cargarEstadisticasRuta(rutaActual.id);

    if (showMisClientes && userSession?.id) await cargarMisCreditosAsignados(userSession.id);

  }, [rutaActual?.id, cargarEstadisticasRuta, showMisClientes, userSession?.id, cargarMisCreditosAsignados])



  useRealtimeData(
    ['pagos_actualizados', 'prestamos_actualizados', 'jornadas_actualizadas'],
    handlerFull,
  )

  useRealtimeData(
    ['rutas_actualizadas', 'dashboards_actualizados', 'jornadas_actualizadas'],
    handlerFull,
  )















  useEffect(() => {

    const cargarClientesSelector = async () => {

      if (!showClientSelector) return;

      if (visitasBase.length > 0) {

        setVisitasSelectorFallback([]);

        return;

      }

      try {

        // BUG-19 FIX: sin ruta activa no hay contexto para filtrar — evitar fetch masivo de BD.
        // La búsqueda sin ruta devolvería TODOS los clientes del sistema, lo cual es ineficiente.
        if (!rutaActual?.id) {
          setVisitasSelectorFallback([]);
          return;
        }

        const clientes: Cliente[] = await clientesService.obtenerTodos({ ruta: rutaActual.id });

        const clientesConPrestamo = clientes.filter(

          (c) => (c.prestamosActivos ?? 0) > 0

        );

        const fuente = clientesConPrestamo.length > 0 ? clientesConPrestamo : clientes;

        const visitas: VisitaRuta[] = fuente.map((c, index) => {

          const nombre = `${c.nombres || ''} ${c.apellidos || ''}`.trim() || 'Cliente';

          const riesgoBackend = c.nivelRiesgo;

          const riesgo =

            riesgoBackend === 'VERDE'

              ? 'bajo'

              : riesgoBackend === 'AMARILLO'

              ? 'leve'

              : riesgoBackend === 'ROJO'

              ? 'moderado'

              : riesgoBackend === 'LISTA_NEGRA'

              ? 'critico'

              : 'bajo';

          return {

            id: c.id,

            cliente: nombre,

            direccion: c.direccion || 'Sin dirección registrada',

            telefono: c.telefono || '',

            horaSugerida: '08:00 AM',

            montoCuota: Number(c.montoMora || 0),

            saldoTotal: Number(c.montoTotal || 0),

            estado: 'pendiente',

            proximaVisita: toBogotaDateTimeOffsetIso(new Date()),

            ordenVisita: index + 1,

            prioridad: 'media',

            nivelRiesgo: riesgo,

            cobradorId: userSession?.id || '',

            periodoRuta: 'DIA',

            clienteId: c.id,

            prestamoId: undefined,

          };

        });

        // DEFECTO-C FIX: clientesService.obtenerTodos() construye visitas con prestamoId:undefined
        // siempre (ver L1696). El filtro Boolean(prestamoId) SIEMPRE da 0 resultados.
        // El fallback anterior devolvía 'visitas' (todas sin prestamoId) — idéntico al original.
        // Fix correcto: si no podemos obtener visitas con prestamoId, no mostrar nada.
        // Es mejor un selector vacío que uno con clientes que generan error al pagar.
        setVisitasSelectorFallback([]);

      } catch {

        try {

          const offlineClientes = await offlineStore.getAll<Cliente>('clientes');

          const clientesConPrestamo = offlineClientes.filter(

            (c: any) => (c.prestamosActivos ?? 0) > 0

          );

          const fuente = clientesConPrestamo.length > 0 ? clientesConPrestamo : offlineClientes;

          const visitas: VisitaRuta[] = fuente.map((c, index) => {

            const nombre = `${c.nombres || ''} ${c.apellidos || ''}`.trim() || 'Cliente';

            const riesgoBackend = c.nivelRiesgo;

            const riesgo =

              riesgoBackend === 'VERDE'

                ? 'bajo'

                : riesgoBackend === 'AMARILLO'

                ? 'leve'

                : riesgoBackend === 'ROJO'

                ? 'moderado'

                : riesgoBackend === 'LISTA_NEGRA'

                ? 'critico'

                : 'bajo';

            return {

              id: c.id,

              cliente: nombre,

              direccion: c.direccion || 'Sin dirección registrada',

              telefono: c.telefono || '',

              horaSugerida: '08:00 AM',

              montoCuota: 0,

              saldoTotal: 0,

              estado: 'pendiente',

              proximaVisita: hoyBogotaKey,

              ordenVisita: index + 1,

              prioridad: 'media',

              nivelRiesgo: riesgo,

              cobradorId: userSession?.id || '',

              periodoRuta: 'DIA',

              clienteId: c.id,

              prestamoId: undefined,

            };

          });

          setVisitasSelectorFallback(visitas);

        } catch {

          setVisitasSelectorFallback([]);

        }

      }

    };

    cargarClientesSelector();

  }, [showClientSelector, visitasBase.length, rutaActual?.id, userSession?.id]);



  useEffect(() => {

    const cargarResumenMensual = async () => {

      if (!showHistory || historyViewMode !== 'MONTHS' || !rutaActual?.id) return;

      try {

        const now = new Date();

        const start = new Date(now.getFullYear(), now.getMonth(), 1);

        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        let totalRecaudado = 0;

        const pagosResp = await pagosService.obtenerPagos({ limit: 5000 });

        const pagosData = (pagosResp as any)?.pagos || pagosResp || [];

        const pagosMes = (Array.isArray(pagosData) ? pagosData : []).filter((p: any) => {

          const raw = p.fechaPago || p.creadoEn;

          if (!raw) return false;

          const d = new Date(raw);

          const inMonth = d >= start && d <= end;

          const cobradorMatch = userSession?.id ? (p.cobradorId === userSession.id) : true;

          // Un pago pertenece a esta ruta indirectamente si el cobrador coincide (ya que no viene p.ruta).

          // Por seguridad vamos a mapear en inMonth, si es el cobrador activo

          return inMonth && cobradorMatch;

        });

        const uniqueClientes = new Set<string>();

        for (const p of pagosMes) {

          totalRecaudado += Number(p.montoTotal || 0);

          const cid = p.clienteId || (p.cliente?.id);

          if (cid) uniqueClientes.add(cid);

        }

        const elapsedDays = now.getDate(); // días transcurridos del mes

        setMonthlyReport({

          ruta: {

            id: rutaActual.id,

            nombre: rutaActual.nombre,

            codigo: rutaActual.codigo || '',

            zona: rutaActual.zona || '',

            cobrador: {

              id: rutaActual.cobradorId,

              nombres: '',

              apellidos: ''

            }

          },

          periodo: {

            tipo: 'month',

            inicio: (() => {
              const startKey = getBogotaDateKey(start);
              return startKey
                ? buildBogotaOffsetIsoFromKey(startKey, { hh: 0, mm: 0, ss: 0, ms: 0 })
                : '';
            })(),

            fin: (() => {
              const endKey = getBogotaDateKey(end);
              return endKey
                ? buildBogotaOffsetIsoFromKey(endKey, { hh: 23, mm: 59, ss: 59, ms: 999 })
                : '';
            })()

          },

          estadisticas: {

            totalClientes: uniqueClientes.size,

            totalRecaudado,

            totalPagos: pagosMes.length,

            promedioDiario: elapsedDays > 0 ? Math.round(totalRecaudado / elapsedDays) : 0,

            pagosPorDia: []

          },

          pagosRecientes: [],

          clientesConPrestamos: []

        });

      } catch {

        setMonthlyReport(null);

      }

    };

    cargarResumenMensual();

  }, [showHistory, historyViewMode, rutaActual?.id]);



  const historial = useRutaHistorial({
    rutaId: rutaActual?.id,
    cobradorId: userSession?.id,
    getVisitasHoy: () => visitasBase,
    fetchPagos: () => pagosService.obtenerPagos({ limit: 5000 }) as any,
    loadDay: async (fechaClave: string) => {
      const visitasResp = await rutasService.obtenerVisitasDelDia(rutaActual?.id as any, fechaClave)
      const saldo = await obtenerSaldoDisponibleRuta(rutaActual?.id as any, fechaClave)

      const toKey = (raw: string): string => getPagoBogotaDateKey(raw)
      let pagosDelDia: any[] = []
      try {
        const pagosResp = await pagosService.obtenerPagos({ limit: 5000 })
        const pagosData = (pagosResp as any)?.pagos || pagosResp || []
        pagosDelDia = (Array.isArray(pagosData) ? pagosData : []).filter((p: any) => {
          const raw = p?.fechaPago || p?.creadoEn
          if (!raw) return false
          const cobradorMatch = userSession?.id ? (p?.cobradorId === userSession.id) : true
          return toKey(String(raw)) === fechaClave && cobradorMatch
        })
      } catch {
        pagosDelDia = []
      }

      return buildHistorialDiaFromBackend({ fechaClave, visitasResp, saldo, pagosDelDia })
    },
  })

  // DEFECTO-B FIX: mantener historialRutasRef sincronizado con el estado.
  useEffect(() => {
    historialRutasRef.current = historialRutas;
  }, [historialRutas]);

  useEffect(() => {
    if (!historial.historialRutas) return
    setHistorialRutas(historial.historialRutas)
  }, [historial.historialRutas])

  const cargarHistorialFecha = historial.cargarHistorialFecha

  const enriquecerHistorialDiaConCuotas = useCallback(async (fechaClave: string) => {
    const dayData = (historialRutas || {})[fechaClave]
    if (!dayData?.loaded) return
    const visitasRaw = Array.isArray(dayData?.visitas) ? dayData.visitas : []

    // 1) Backfill de prestamoId (solo ID) desde visitasBaseRef (ruta del día) cuando falte.
    //    No copiamos montoCuota/estado porque para historial interesa el exigible de esa fecha,
    //    y el "estado actual" puede haber avanzado después de pagar.
    const base = Array.isArray(visitasBaseRef.current) ? visitasBaseRef.current : []
    const byClienteId = new Map<string, any>()
    base.forEach((b: any) => {
      const k = String(b?.clienteId || '')
      if (!k) return
      byClienteId.set(k, b)
    })

    const visitas = visitasRaw.map((v: any) => {
      if (String(v?.prestamoId || '')) return v
      const cid = String(v?.clienteId || '')
      const match = cid ? byClienteId.get(cid) : null
      const pid = String(match?.prestamoId || '')
      if (!pid) return v
      return { ...v, prestamoId: pid }
    })

    const visitasConPrestamo = visitas.filter((v: any) => !!String(v?.prestamoId || ''))
    const yaEnriquecido = visitasConPrestamo.length > 0
      && visitasConPrestamo.every((v: any) => (v as any)?.enMoraHistorico !== undefined)
    if (yaEnriquecido) return
    const prestamoIds = Array.from(new Set(visitasConPrestamo.map((v: any) => String(v?.prestamoId || '')).filter(Boolean)))
    if (prestamoIds.length === 0) return

    const getCuotasByPrestamoId = memoizePromiseByKey(
      async (prestamoId: string) => {
        const cache = cuotasHistorialCacheRef.current
        if (cache.has(prestamoId)) return cache.get(prestamoId) || []
        const cuotas = await prestamosService.obtenerCuotas(prestamoId).catch(() => [])
        cache.set(prestamoId, cuotas as any[])
        return cuotas as any[]
      },
      () => [],
    )

    const nextVisitas = await mapWithConcurrency(
      visitas,
      async (v: any) => {
        const pid = String(v?.prestamoId || '')
        if (!pid) return v
        const cuotas = await getCuotasByPrestamoId(pid)
        const exigible = computeMontoExigibleHastaHoyFromCuotas(cuotas as any, fechaClave)
        const tieneMora = (Array.isArray(cuotas) ? cuotas : []).some((c: any) => {
          if (!c || !isCuotaNoPagada(c)) return false
          const vtoRaw = resolveFechaEfectivaCuota(c) || String(c?.fechaVencimiento || '')
          const vtoKey = normalizeDateKey(vtoRaw)
          return !!vtoKey && vtoKey < fechaClave
        })

        const enProrrogaHistorico = (Array.isArray(cuotas) ? cuotas : []).some((c: any) => {
          if (!c || !isCuotaNoPagada(c)) return false
          const prRaw = String(c?.fechaVencimientoProrroga || '')
          if (!prRaw) return false
          const prKey = normalizeDateKey(prRaw)
          if (!prKey) return false
          const vtoKey = normalizeDateKey(resolveFechaEfectivaCuota(c) || String(c?.fechaVencimiento || ''))

          // Considerar en prórroga si:
          // - existe fecha de prórroga
          // - la fecha del historial está antes o en la prórroga
          // - y el vencimiento original ya era previo/igual a la fecha del historial (se activó la prórroga)
          if (prKey < fechaClave) return false
          if (vtoKey && vtoKey > fechaClave) return false
          return true
        })
        return {
          ...v,
          montoCuotaPendiente: exigible > 0 ? exigible : (v as any)?.montoCuotaPendiente,
          enMoraHistorico: tieneMora,
          enProrrogaHistorico,
        }
      },
      6,
    )

    // BUG-17 FIX: enriquecerHistorialDiaConCuotas ya NO tiene historialRutas en deps.
    // Leer el historial del día directamente dentro del setter funcional de setHistorialRutas
    // evita que se recree el callback cada vez que se carga un nuevo día del historial,
    // rompiendo el ciclo de re-renders en cascada.
    setHistorialRutas((prev: any) => {
      const prevDia = (prev || {})[fechaClave]
      if (!prevDia) return prev
      return {
        ...(prev || {}),
        [fechaClave]: {
          ...prevDia,
          visitas: nextVisitas,
        },
      }
    })
  // BUG-17 FIX: sin historialRutas en deps — se accede vía setter funcional
  }, [])

  // DEFECTO-B FIX (completo): usar historialRutasRef para leer el historial actual sin
  // necesitar historialRutas como dep. Elimina el anti-patrón de side-effect en setState.
  useEffect(() => {
    if (!showHistory) return
    const hoy = new Date()
    const hoyKey = getBogotaDateKey(hoy)
      || `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`
    const dayData = (historialRutasRef.current || {})[hoyKey]
    if (dayData?.loaded) {
      void enriquecerHistorialDiaConCuotas(hoyKey)
    }
  }, [showHistory, enriquecerHistorialDiaConCuotas])

  // DEFECTO-B FIX (completo): usar historialRutasRef en lugar de setter como lector.
  useEffect(() => {
    if (!showHistory || !rutaActual?.id) return;
    const hoy = new Date();
    const key = getBogotaDateKey(hoy)
      || `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
    const existing = (historialRutasRef.current || {})[key];
    if (!existing || !existing.loaded) {
      void cargarHistorialFecha(key);
    }
  }, [showHistory, rutaActual?.id, cargarHistorialFecha]);

  useEffect(() => {
    if (!showHistory) return
    if (!selectedHistoryDate) return
    void enriquecerHistorialDiaConCuotas(selectedHistoryDate)
  }, [showHistory, selectedHistoryDate, enriquecerHistorialDiaConCuotas])

  // Filtrar y ordenar visitas

  const visitasCobrador = useMemo(() => {
    // Calcular inicio del período actual según frecuencia del crédito

    const getInicioPeriodoStr = (periodo: string): string => {

      const hoy = new Date();

      hoy.setHours(0, 0, 0, 0);

      const toKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

      if (periodo === 'SEMANA') {

        const day = hoy.getDay();

        const diff = day === 0 ? -6 : 1 - day;

        const lunes = new Date(hoy);

        lunes.setDate(hoy.getDate() + diff);

        return toKey(lunes);

      } else if (periodo === 'QUINCENA') {

        const q = new Date(hoy);

        q.setDate(hoy.getDate() <= 15 ? 1 : 16);

        return toKey(q);

      } else if (periodo === 'MES') {

        const m = new Date(hoy);

        m.setDate(1);

        return toKey(m);

      }

      return (() => { const d = new Date(); return toKey(d); })(); // DIA = hoy

    };



    const hoyLocal = new Date();

    hoyLocal.setHours(0, 0, 0, 0);

    const toKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

    const hoyStr = toKey(hoyLocal);



    const filtradas = (visitasBase || []).map((v: any) => ({
      ...v,
      estado: ajustarEstadoConPago(v),
    }))

    

    // Aplicar búsqueda

    const buscadas = filtradas.filter(v => 

      v.cliente.toLowerCase().includes(searchQuery.toLowerCase()) ||

      v.direccion.toLowerCase().includes(searchQuery.toLowerCase())

    )



    // BUG-12 FIX: en modo historial mostrar TODAS las visitas (incluyendo pagadas) para ver
    // el resumen completo del día. En modo normal ocultar las ya cobradas (shouldShowVisitaEnRutaHoy).
    const visibles = buscadas.filter((v: any) =>
      showHistory ? true : shouldShowVisitaEnRutaHoy(v, hoyBogotaKey),
    )

    // Ordenar consistente con Supervisor/Admin

    const sorted = visibles.sort((a: any, b: any) => {
      // En mora primero
      if (a.estado === 'en_mora' && b.estado !== 'en_mora') return -1;
      if (a.estado !== 'en_mora' && b.estado === 'en_mora') return 1;

      // Pagados al final (aunque en la mayoría de casos ya se filtran)
      if (a.estado === 'pagado' && b.estado !== 'pagado') return 1;
      if (a.estado !== 'pagado' && b.estado === 'pagado') return -1;

      // Para DIA respetar el orden de visita
      if (a.periodoRuta === 'DIA' && b.periodoRuta === 'DIA') {
        const ao = Number(a.ordenVisita ?? 0)
        const bo = Number(b.ordenVisita ?? 0)
        if (ao !== bo) return ao - bo
      }

      // Para no-DIA, priorizar por fechaUltimoPago (más antiguo arriba) si existe
      if (a.periodoRuta !== 'DIA' || b.periodoRuta !== 'DIA') {
        const aLast = Number(a.fechaUltimoPago || 0)
        const bLast = Number(b.fechaUltimoPago || 0)
        if (aLast !== bLast) return aLast - bLast
      }

      // Fallback por periodo (Mensual -> Quincenal -> Semanal -> Diario)
      const priority: Record<string, number> = { MES: 0, QUINCENA: 1, SEMANA: 2, DIA: 3 };
      const pA = priority[String(a.periodoRuta || '').toUpperCase()] ?? 99;
      const pB = priority[String(b.periodoRuta || '').toUpperCase()] ?? 99;
      if (pA !== pB) return pA - pB;

      // Fallback final estable
      const ao = Number(a.ordenVisita ?? 0)
      const bo = Number(b.ordenVisita ?? 0)
      if (ao !== bo) return ao - bo
      const aId = String(a.id || '')
      const bId = String(b.id || '')
      return aId.localeCompare(bId)
    });



    return sorted;

  }, [visitasBase, searchQuery, userSession?.id, showHistory, showMisClientes, ajustarEstadoConPago, hoyBogotaKey])



  const visitasSelector = visitasCobrador.length > 0 ? visitasCobrador : visitasSelectorFallback

  const kpisHoy = useMemo(() => {
    const visitasExigiblesHoy = (visitasBase || [])
      .map((v: any) => ({
        ...v,
        estado: ajustarEstadoConPago(v),
      }))
      .filter((v: any) => shouldIncludeVisitaInRutaHoyKpis(v, hoyBogotaKey))

    const isAusente = shouldExcludeVisitaFromOperationalMeta

    const visitasAusentesHoy = visitasExigiblesHoy.filter(isAusente)
    const visitasOperativasHoy = visitasExigiblesHoy.filter((v: any) => !isAusente(v))

    const meta = visitasOperativasHoy.reduce((sum: number, v: any) => {
      return sum + Number(v?.montoCuota || 0)
    }, 0)

    const recaudo = visitasExigiblesHoy.reduce((sum: number, v: any) => {
      return sum + Number(v?.recaudadoDelDia || 0)
    }, 0)

    const pendientes = visitasOperativasHoy.filter((v: any) => {
      const estado = String(v?.estado || '').toLowerCase()
      return estado !== 'pagado'
    }).length

    const efectividadRaw = meta > 0
      ? Number(((recaudo / meta) * 100).toFixed(1))
      : (recaudo > 0 ? 100 : 0)

    const efectividad = Math.min(100, Math.max(0, efectividadRaw))

    return {
      visitasExigiblesHoy,
      visitasOperativasHoy,
      visitasAusentesHoy,
      meta,
      recaudo,
      pendientes,
      ausentes: visitasAusentesHoy.length,
      efectividad,
    }
  }, [visitasBase, ajustarEstadoConPago, hoyBogotaKey])



  



  const rutaStatsUI = useMemo(() => {
    if (periodoCards !== 'HOY') return rutaStats

    const recaudoBackend = Math.max(
      Number(rutaStats.recaudo || 0),
      Number((rutaActual as any)?.cobranzaDelDia || 0),
      Number((rutaActual as any)?.estadisticas?.cobranzaDelDia || 0),
    )
    const metaBackend = Math.max(
      Number(rutaStats.meta || 0),
      Number((rutaActual as any)?.metaDelDia || 0),
      Number((rutaActual as any)?.estadisticas?.metaDelDia || 0),
    )
    const recaudoFinal = Math.max(Number(kpisHoy.recaudo || 0), recaudoBackend)
    const meta = Math.max(Number(kpisHoy.meta || 0), metaBackend)
    const pendiente = Math.max(0, meta - recaudoFinal)
    const eficiencia = Number(kpisHoy.efectividad || 0)
    const eficienciaFinal = meta > 0
      ? Math.min(100, Math.max(0, Number(((recaudoFinal / meta) * 100).toFixed(1))))
      : eficiencia

    return {
      ...rutaStats,
      recaudo: recaudoFinal,
      meta,
      eficiencia: eficienciaFinal,
      pendiente,
    }
  }, [periodoCards, rutaStats, kpisHoy, rutaActual])
  // BUG-08 FIX: filtrar por el ID real del cobrador en sesión, no por 'CB-001' hardcodeado.
  const operacionesCobrador = useMemo(() =>
    userSession?.id
      ? operacionesCaja.filter(op => op.cobradorId === userSession.id)
      : operacionesCaja,
    [operacionesCaja, userSession?.id]

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



    const hoyBogota = getBogotaDateKey(new Date())
    const recaudoEsperado = visitasCobrador.reduce((sum, v: any) => {
      if (v?.estado === 'pagado') return sum
      const incluye = isVisitaExigibleHoy(v, hoyBogota)
      if (!incluye) return sum
      return sum + Number(v?.montoCuota || 0)
    }, 0)



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



  const overlayVisita = useMemo(() => {

    return activeId ? visitasCobrador.find(v => v.id === activeId) || null : null

  }, [activeId, visitasCobrador])



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
    if (!rutaOperable) return
    setActiveId(event.active.id as string)
  }, [rutaOperable])

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
       // 1. Obtener y actualizar orden localmente para feedback inmediato
       const ids = [...visitasOrden];
       const oldIndex = ids.indexOf(active.id as string);
       const newIndex = ids.indexOf(over.id as string);

       if (oldIndex !== -1 && newIndex !== -1) {
          const newOrden = arrayMove(ids, oldIndex, newIndex);
          setVisitasOrden(newOrden);

          // 2. Persistir si es el dueño de la ruta
          const isOwner = userSession?.rol === 'COBRADOR';
          if (isOwner && rutaActual?.id) {
             try {
                // Generar lista única de clientes en su nuevo orden
                const clienteIdsOrdenados: string[] = [];
                newOrden.forEach(itemId => {
                   const v = visitasBase.find(vis => vis.id === itemId);
                   if (v?.clienteId && !clienteIdsOrdenados.includes(v.clienteId)) {
                      clienteIdsOrdenados.push(v.clienteId);
                   }
                });

                const dto = clienteIdsOrdenados.map((cid, index) => ({
                   clienteId: cid,
                   orden: index + 1
                }));

                await rutasService.actualizarOrdenClientes(rutaActual.id, dto);
                toast.success('Orden de ruta sincronizado');
             } catch (error) {
                console.error('Error guardando reordenamiento:', error);
                toast.error('No se pudo guardar el orden en el servidor');
             }
          }
       }
    }
    setActiveId(null)
  }, [visitasOrden, visitasBase, userSession, rutaActual]);







  const handleGuardarReprogramacion = useCallback(async (fecha: string, motivo: string, cuotaId?: string) => {

    if (!visitaReprogramar) return

    if (!fecha || !motivo) return



    const formatearFechaISO = (iso: string) => {

      const [yyyy, mm, dd] = iso.split('-')

      if (!yyyy || !mm || !dd) return iso

      return `${dd}/${mm}`

    }



    try {

      setIsLoadingAction(true)

      if (!visitaReprogramar?.prestamoId) {

        setModalAlerta({

          titulo: 'Error',

          mensaje: 'La visita seleccionada no tiene un préstamo asociado.',

          tipo: 'error'

        })

        return;

      }

      const contextoRegularizacionSnapshot =
        contextoRegularizacionRef.current
      const payloadBase = {
        fechaOperativaRuta:
          contextoRegularizacionSnapshot?.origenGestion ===
          'CIERRE_PENDIENTE'
            ? contextoRegularizacionSnapshot?.fechaOperativa
            : undefined,
        origenGestion:
          contextoRegularizacionSnapshot?.origenGestion ===
          'CIERRE_PENDIENTE'
            ? 'CIERRE_PENDIENTE'
            : undefined,
      } as const



      // Usar el nuevo flujo con revisión del supervisor

      if (cuotaId) {

        await prestamosService.solicitarReprogramacionCuota({

          prestamoId: visitaReprogramar.prestamoId,

          cuotaId,

          nuevaFecha: fecha,

          motivo,
          fechaOperativaRuta: payloadBase.fechaOperativaRuta,
          origenGestion: payloadBase.origenGestion,
          idempotencyKey:
            payloadBase.origenGestion === 'CIERRE_PENDIENTE'
              ? buildReprogramacionCierrePendienteKey({
                  rutaId: contextoRegularizacionSnapshot?.rutaId,
                  fechaOperativa:
                    contextoRegularizacionSnapshot?.fechaOperativa,
                  clienteId: visitaReprogramar.clienteId,
                  prestamoId: visitaReprogramar.prestamoId,
                  cuotaId,
                  nuevaFecha: fecha,
                })
              : undefined,
        })

      } else {

        // Fallback al endpoint anterior si no hay cuota específica

        await prestamosService.reprogramarPrestamo(visitaReprogramar.prestamoId, {

          fecha,

          motivo,

          cobradorId: userSession?.id || '',
          fechaOperativaRuta: payloadBase.fechaOperativaRuta,
          origenGestion: payloadBase.origenGestion,
          idempotencyKey:
            payloadBase.origenGestion === 'CIERRE_PENDIENTE'
              ? buildReprogramacionCierrePendienteKey({
                  rutaId: contextoRegularizacionSnapshot?.rutaId,
                  fechaOperativa:
                    contextoRegularizacionSnapshot?.fechaOperativa,
                  clienteId: visitaReprogramar.clienteId,
                  prestamoId: visitaReprogramar.prestamoId,
                  cuotaId: 'SIN_CUOTA',
                  nuevaFecha: fecha,
                })
              : undefined,

        })

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



      toast.success('Solicitud de reprogramación enviada exitosamente', {

        description: `La cuota será revisada para reprogramarse al ${formatearFechaISO(fecha)}`

      })



      setShowReprogramModal(false)

      setVisitaReprogramar(null)

      clearRegularizacionContext()

    } catch (error: any) {

      console.error(error)

      setModalAlerta({

          titulo: 'Error',

          mensaje: error.message || 'No se pudo realizar la reprogramación.',

          tipo: 'error'

      })

    } finally {

      setIsLoadingAction(false)

    }

  }, [visitaReprogramar, userSession?.id])



  // La exportación de ruta provisional ahora se maneja dentro del modal (genera un .txt)

  // No se guarda orden en el backend.



  const handleCrearCredito = useCallback(async (data: any) => {

    try {

      setIsLoadingAction(true)

      

      const esContado = Boolean((data as any).ventaContado);

      const isArticulo = data.creditType === 'articulo';

      const freq = esContado ? 'MENSUAL' : (data.frecuenciaPago || 'DIARIO');



      const payload: any = {

        clienteId: data.clienteCreditoId,

        tipoPrestamo: isArticulo ? 'ARTICULO' : 'EFECTIVO',

        monto: data.monto || 0,

        tasaInteres: esContado ? 0 : (data.tasaInteres || 0),

        tasaInteresMora: 2, 

        plazoMeses: data.plazoMeses || 1,

        cantidadCuotas: data.cantidadCuotas || data.cuotas || data.cuotasTotales || (isArticulo ? data.numCuotas : 0),

        cuotas: data.cuotas || data.cantidadCuotas || (isArticulo ? data.numCuotas : 0),

        frecuenciaPago: freq,

        fechaInicio: data.fechaInicio || toBogotaDateTimeOffsetIso(new Date()),
        fechaPrimerCobro: esContado ? undefined : data.fechaPrimerCobro,

        creadoPorId: userSession?.id,

        cuotaInicial: data.cuotaInicialArticulo || 0,

        notas: isArticulo

          ? `${esContado ? 'Venta de contado' : 'Crédito de artículo'}: ${data.articuloNombre || ''}`

          : (data.notas || ''),

        tipoAmortizacion: isArticulo ? 'INTERES_SIMPLE' : (data.tipoInteres || 'INTERES_SIMPLE'),

        esContado: esContado

      }



      if (isArticulo) {

        payload.productoId = data.articuloId;

        payload.precioProductoId = esContado ? undefined : data.precioProductoId;

      }



      const prestamo = await prestamosService.crearPrestamo(payload)

      

      setModalAlerta({

        titulo: 'Crédito Creado',

        mensaje: 'El crédito ha sido registrado exitosamente. Si requiere aprobación, se ha enviado la notificación correspondiente.',

        tipo: 'exito'

      })

      setShowCreditModal(false)



      // Descarga inmediata del contrato si es ARTICULO

      if (isArticulo && prestamo?.id) {

        try {

          await exportService.exportContrato(prestamo.id)

        } catch (err) {

          console.error('Error al descargar contrato:', err)

        }

      }

      

      // Refrescar datos

      if (rutaActual?.id) {

         cargarEstadisticasRuta(rutaActual.id);

      }

    } catch (error: any) {

      console.error('Error al crear crédito:', error)

      setModalAlerta({

        titulo: 'Error',

        mensaje: error.message || 'No se pudo crear el crédito. Por favor verifique los datos e intente de nuevo.',

        tipo: 'error'

      })

    } finally {

      setIsLoadingAction(false)

    }

  }, [userSession?.id, rutaActual?.id, cargarEstadisticasRuta])



  const handleDragCancel = useCallback(() => {

    setActiveId(null)

  }, [])



  // Funciones auxiliares

  const getEstadoClasses = useCallback((estado: EstadoVisita) => {

    if (estado === 'pagado') return 'bg-emerald-50 text-emerald-700 border-emerald-500/30'

    if (estado === 'pendiente') return 'bg-orange-50 text-orange-700 border-orange-500/30'

    if (estado === 'en_mora') return 'bg-rose-50 text-rose-700 border-rose-500/30'

    if (estado === 'ausente') return 'bg-amber-50 text-amber-700 border-amber-200'

    return 'bg-blue-50 text-blue-700 border-blue-500/30'

  }, [])



  const getPrioridadColor = useCallback((prioridad: 'alta' | 'media' | 'baja') => {

    if (prioridad === 'alta') return '#f97316'

    if (prioridad === 'media') return '#08557f'

    return '#94a3b8'

  }, [])



  const handleRegistrarPago = useCallback(async (
    monto: number,
    metodo: 'EFECTIVO' | 'TRANSFERENCIA',
    comprobante: File | null,
    contexto?: { tipoRegistro: 'PAGO' | 'ABONO'; cuotaNumeroEsperada?: number; montoCuotaEsperado: number; cuotaId?: string },
  ) => {

    const visitaSnapshot = visitaPagoSeleccionada
    const esAbonoSnapshot = pagoInitialIsAbono

    if (!visitaSnapshot) return

    if (!esAbonoSnapshot) {
      const cuota = Number(contexto?.montoCuotaEsperado || visitaSnapshot?.montoCuota || 0)
      const cuotaMostrada = getDisplayedCOPInteger(cuota)
      const montoNum = Number(monto || 0)
      if (cuotaMostrada > 0 && !isSameDisplayedCOPAmount(montoNum, cuota)) {
        setModalAlerta({
          titulo: 'Monto no coincide',
          mensaje: `Para registrar un PAGO el monto debe ser exactamente $${formatMilesCOP(cuotaMostrada)}. Si el valor es diferente, use la opción ABONO.`,
          tipo: 'error',
        })
        return
      }
    }

    const saldoTotal = Number(visitaSnapshot?.saldoTotal || 0)
    if (saldoTotal > 0 && monto > saldoTotal + 1) {
      setModalAlerta({
        titulo: 'Monto inválido',
        mensaje: `El monto ($${formatMilesCOP(monto)}) no puede ser mayor al saldo total del préstamo ($${formatMilesCOP(saldoTotal)}).`,
        tipo: 'error',
      })
      return
    }

    // Cerrar el modal lo más rápido posible para mejorar UX (no esperar request)
    const contextoRegularizacionSnapshot = contextoRegularizacionRef.current
    setShowPaymentModal(false)
    setVisitaPagoSeleccionada(null)
    clearRegularizacionContext()



    try {

      setIsLoadingAction(true)

      if (!visitaSnapshot.prestamoId) {

        setModalAlerta({

          titulo: 'Error',

          mensaje: 'Esta asignación no tiene un préstamo asociado vinculado correctamente. Por favor contacte soporte.',

          tipo: 'error'

        })

        return;

      }

      pagosInFlightRef.current.set(String(visitaSnapshot.prestamoId), Date.now())



      const esCierrePendiente =
        contextoRegularizacionSnapshot?.origenGestion === 'CIERRE_PENDIENTE'
      const prestamoIdFinal = esCierrePendiente
        ? contextoRegularizacionSnapshot?.prestamoId
        : visitaSnapshot.prestamoId
      const cuotaIdFinal = esCierrePendiente
        ? contextoRegularizacionSnapshot?.cuotaId
        : contexto?.cuotaId
      const cuotaNumeroFinal = esCierrePendiente
        ? contextoRegularizacionSnapshot?.cuotaNumeroEsperada
        : contexto?.cuotaNumeroEsperada
      const montoCuotaEsperadoFinal = esCierrePendiente
        ? contextoRegularizacionSnapshot?.montoCuotaEsperado
        : contexto?.montoCuotaEsperado

      const resultado = await pagosService.registrarPago({

        prestamoId: prestamoIdFinal,

        clienteId: visitaSnapshot.clienteId,

        montoTotal: monto,

        metodoPago: metodo as MetodoPago,

        comprobante,

        cobradorId: (rutaActual as any)?.cobradorId || (visitaSnapshot as any)?.cobradorId || userSession?.id || '',

        tipoRegistro: contexto?.tipoRegistro || (esAbonoSnapshot ? 'ABONO' : 'PAGO'),

        rutaId: esCierrePendiente ? contextoRegularizacionSnapshot?.rutaId : undefined,

        cuotaId: cuotaIdFinal,

        cuotaNumeroEsperada: cuotaNumeroFinal,

        montoCuotaEsperado: montoCuotaEsperadoFinal,

        fechaOperativaRuta: esCierrePendiente
          ? (contextoRegularizacionSnapshot?.fechaOperativaRuta || contextoRegularizacionSnapshot?.fechaOperativa)
          : undefined,

        origenGestion: esCierrePendiente ? 'CIERRE_PENDIENTE' : undefined,

        idempotencyKey: esCierrePendiente
          ? [
              'CIERRE_PENDIENTE',
              contextoRegularizacionSnapshot?.rutaId,
              contextoRegularizacionSnapshot?.fechaOperativaRuta || contextoRegularizacionSnapshot?.fechaOperativa,
              visitaSnapshot.clienteId,
              prestamoIdFinal,
              cuotaIdFinal ?? 'SIN_CUOTA_ID',
              cuotaNumeroFinal ?? 'SIN_CUOTA',
              contexto?.tipoRegistro || (esAbonoSnapshot ? 'ABONO' : 'PAGO'),
              Number(monto || 0),
            ].join(':')
          : undefined,

      })



      // Actualizar estado local (optimista) para reflejar pago

      // Regla: si con el pago completó la cuota del período, la visita se marca como 'pagado'

      // para que desaparezca del listado diario.

      let cuotaCompletadaLocal = false

      const isAusente = shouldExcludeVisitaFromOperationalMeta

      const resolveEstadoSinAusente = (v: any): any => {
        const estado = String(v?.estado || '').toLowerCase()

        if (estado !== 'ausente') {
          return v.estado
        }

        const diasMora = Number(v?.diasMora || 0)
        const enMoraHistorico = Boolean(v?.enMoraHistorico)
        const estadoPrestamo = String(v?.estadoPrestamo || '').toLowerCase()

        if (diasMora > 0 || enMoraHistorico || estadoPrestamo.includes('mora')) {
          return 'en_mora'
        }

        return 'pendiente'
      }

      const clienteIdPago = visitaSnapshot.clienteId

      if (!esCierrePendiente) {
        setVisitasBase((prev) => {
          const next = prev.map((v) => {
            if (v.clienteId !== clienteIdPago) return v

            const esVisitaPagada = v.id === visitaSnapshot.id

            const recaudadoPrev = Number((v as any).recaudadoDelDia || 0)
            const recaudadoNuevo = esVisitaPagada
              ? recaudadoPrev + Number(monto || 0)
              : recaudadoPrev

            const estadoBase = isAusente(v)
              ? resolveEstadoSinAusente(v)
              : v.estado

            const nextEstado = esVisitaPagada
              ? (
                  esAbonoSnapshot
                    ? estadoBase
                    : ajustarEstadoConPago({
                        ...(v as any),
                        estado: estadoBase,
                        estadoVisita: undefined,
                        recaudadoDelDia: recaudadoNuevo,
                      } as any)
                )
              : estadoBase

            return {
              ...v,
              recaudadoDelDia: recaudadoNuevo,
              estado: nextEstado as any,
              estadoVisita: undefined as any,
              notasVisita: undefined as any,
            }
          })

          visitasBaseRef.current = next as any
          return next
        })
      }

      // Si completó lo exigible de HOY, NO eliminar del estado local.
      // Mantenerla como 'pagado' evita que un refresh/realtime la re-inserte con estado viejo;
      // la UI ya la oculta en la ruta del día cuando no hay filtros/búsqueda.



      // Actualizar KPIs de ruta (recaudo y eficiencia) usando respuesta del backend

      const montoRegistrado = Number(resultado?.descomposicion?.montoTotal ?? monto);

      if (!esCierrePendiente) {
        setRutaStats(prev => {

          const nuevoRecaudo = prev.recaudo + montoRegistrado;
          const nuevaEficiencia = prev.meta > 0 ? parseFloat(((nuevoRecaudo / prev.meta) * 100).toFixed(1)) : prev.eficiencia;

          return { ...prev, recaudo: nuevoRecaudo, eficiencia: nuevaEficiencia };
        });
      }

      // Reconciliar una sola vez contra backend.
      try {
        await cargarDatosRuta(true)
        if (showMisClientes && userSession?.id) {
          await cargarMisCreditosAsignados(userSession.id)
        }
      } catch {}

    } catch (error: any) {

      console.error('Error al registrar pago', error)
      const isConflict = error?.isConflict || error?.statusCode === 409 || error?.error?.statusCode === 409
      const mensaje = error?.message || error?.error?.message || 'Ocurrió un error al registrar el pago. Intente de nuevo.'

      if (isConflict) {
        try {
          await cargarDatosRuta(true)
          if (showMisClientes && userSession?.id) {
            await cargarMisCreditosAsignados(userSession.id)
          }
        } catch {}
      }

      setModalAlerta({

        titulo: isConflict ? 'La cuota cambió' : 'Error',

        mensaje,

        tipo: 'error'

      })

    } finally {

      if (visitaSnapshot?.prestamoId) {
        pagosInFlightRef.current.delete(String(visitaSnapshot.prestamoId))
      }

      clearRegularizacionContext()
      setIsLoadingAction(false)

    }

  }, [visitaPagoSeleccionada, pagoInitialIsAbono, userSession?.id, cargarDatosRuta, showMisClientes, cargarMisCreditosAsignados])



  const confirmarFinalizarRuta = useCallback(async () => {

    const meta = Number(kpisHoy.meta || 0)
    const recaudo = Number(kpisHoy.recaudo || 0)
    const efectividad = meta > 0 ? Number(((recaudo / meta) * 100).toFixed(1)) : 0
    const clientesFaltantes = Number(kpisHoy.pendientes || 0)
    const clientesAusentes = Number(kpisHoy.ausentes || 0)



    socket?.emit('ruta_completada_emit', {

      rutaNombre: rutaActual?.nombre || 'Mi Ruta',

      cobradorNombre: userSession?.nombres || 'El Cobrador',

      recaudo,

      meta,

      efectividad,

      clientesFaltantes,

      clientesAusentes,

      rutaId: rutaActual?.id || undefined,

      actorId: userSession?.id,

      actorRol: userSession?.rol,

    }, (response: any) => {
      if (!response?.success) {
        toast.error(response?.message || 'No se pudo cerrar la ruta.')
        return
      }

      setRutaCompletada(true);
      setShowConfirmCompleteModal(false);

      const mensajeCierre = clientesFaltantes > 0
        ? `Ruta cerrada. Faltaron ${clientesFaltantes} cliente${clientesFaltantes > 1 ? 's' : ''} por cobrar hoy. Se alertó a la oficina.`
        : 'Se ha cerrado el día de manera exitosa y se alertó a la oficina.';

      setCoordinadorToast(mensajeCierre);
      window.setTimeout(() => setCoordinadorToast(null), 5000);
      toast.success('Ruta cerrada correctamente.')
    });

  }, [socket, rutaActual, userSession, kpisHoy])



  const handleCompletarRuta = useCallback(() => {
    // Bloquear cierre si hay jornada anterior pendiente de cierre
    if (hasCierrePendiente) {
      toast.error('No puedes cerrar la jornada actual porque existe una jornada anterior pendiente de cierre.');
      return;
    }
    setShowConfirmCompleteModal(true);
  }, [hasCierrePendiente])











  const handleAbrirClienteInfo = useCallback((visita: VisitaRuta) => {

    // El cobrador siempre abre el modal de info del cliente (para pagos)

    // El modal de mora es solo para roles de gestión interna (admin/supervisor)

    setVisitaClienteSeleccionada(visita)

    setNextPagoFecha(null)
    setNextPagoMonto(null)

    setShowClienteInfoModal(true)

  }, [])



  // Cargar recaudado del cliente en el día desde backend

  useEffect(() => {

    const cargarRecaudoCliente = async () => {

      if (!showClienteInfoModal || !visitaClienteSeleccionada?.clienteId) {

        setRecaudadoClienteHoy(0);

        setNextPagoFecha(null);

        setNextPagoMonto(null);

        return;

      }

      try {

        const resp = await pagosService.obtenerPagos({ clienteId: visitaClienteSeleccionada.clienteId, limit: 100 });

        let targetDateStr = hoyBogotaKey;

        

        // Si hay una fecha seleccionada en el historial, evaluarla directamente

        if (selectedHistoryDate) {

           targetDateStr = selectedHistoryDate;

        } else if ((visitaClienteSeleccionada as any).fecha || visitaClienteSeleccionada.proximaVisita) {

           const dString = (visitaClienteSeleccionada as any).fecha || visitaClienteSeleccionada.proximaVisita;

           targetDateStr = dString.includes('T') ? dString.split('T')[0] : dString;

        }



        const totalDelDia = (resp?.pagos || []).reduce((sum: number, p: any) => {

          const rawPago = p.fechaPago || p.creadoEn;

          const f = rawPago ? (rawPago.includes('T') ? rawPago.split('T')[0] : rawPago) : '';

          

          if (f === targetDateStr) return sum + Number(p.montoTotal || 0);

          return sum;

        }, 0);

        setRecaudadoClienteHoy(totalDelDia);

      } catch {

        setRecaudadoClienteHoy(0);

      }

    };

    cargarRecaudoCliente();

  }, [showClienteInfoModal, visitaClienteSeleccionada?.clienteId]);



  useEffect(() => {

    const cargarProximaCuotaCliente = async () => {

      if (!showClienteInfoModal || !visitaClienteSeleccionada) {

        setNextPagoFecha(null);

        setNextPagoMonto(null);

        return;

      }

      if (!visitaClienteSeleccionada?.prestamoId) {
        setNextPagoFecha(null)
        setNextPagoMonto(null)
        toast.error('No se pudo cargar la próxima cuota: falta el ID del préstamo.')
        return
      }

      try {

        let detalle: any = null;

        try {
          detalle = await prestamosService.obtenerPrestamoPorId(visitaClienteSeleccionada.prestamoId)
        } catch {
          detalle = null
        }

        const next = detalle ? resolveNextPagoFromPrestamo(detalle) : { monto: null, fecha: null }
        setNextPagoFecha(next?.fecha ? String(next.fecha) : null)
        setNextPagoMonto(typeof next?.monto === 'number' ? Number(next.monto) : null)

        if (detalle) {
          const prog = resolveCuotaProgressFromPrestamo(detalle)
          setVisitaClienteSeleccionada((prev) => {
            if (!prev) return prev
            return {
              ...prev,
              cuotaActual: prog.cuotaActual ?? (prev as any).cuotaActual,
              cuotasTotales: prog.cuotasTotales ?? (prev as any).cuotasTotales,
            } as any
          })
        }

      } catch {

        setNextPagoFecha(null);

        setNextPagoMonto(null);

      }

    };

    cargarProximaCuotaCliente();

  }, [showClienteInfoModal, visitaClienteSeleccionada?.prestamoId, visitaClienteSeleccionada?.clienteId, visitaClienteSeleccionada?.cliente]);



  // Cargar detalle real de mora al abrir el modal

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

          detalle = await prestamosService.obtenerPrestamoPorId(prestamoId)

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

          const freq = String((info as any)?.frecuenciaPago || (info as any)?.frecuencia || '').toUpperCase()
          if (freq === 'DIARIO') {
            const oldestKey = normalizeDateKey(String(oldest.fechaVencimiento || ''))
            const endKey = hoyBogotaKey
            if (oldestKey && endKey) {
              const start = new Date(`${oldestKey}T12:00:00-05:00`)
              const end = new Date(`${endKey}T12:00:00-05:00`)
              if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
                let count = 0
                const cur = new Date(start)
                cur.setDate(cur.getDate() + 1)
                while (cur.getTime() <= end.getTime()) {
                  if (cur.getDay() !== 0) count++
                  cur.setDate(cur.getDate() + 1)
                }
                diasMora = count
              }
            }
          } else {
            const oldestKey = normalizeDateKey(String(oldest.fechaVencimiento || ''))
            const endKey = hoyBogotaKey
            if (oldestKey && endKey) {
              const start = new Date(`${oldestKey}T12:00:00-05:00`)
              const end = new Date(`${endKey}T12:00:00-05:00`)
              if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
                const diff = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
                diasMora = diff > 0 ? diff : 0
              }
            }
          }

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

                  <span>{rutaActual?.nombre || userSession.rutaAsignada || 'Cargando ruta...'}</span>

                </div>

              </div>

            </div>

          </div>

        </header>

        <SundayNoticeBanner />



        <RutaKpiSection periodo={periodoCards} onPeriodoChange={setPeriodoCards} rutaStats={rutaStatsUI as any} />

        {/* Banner de cierre pendiente */}
        <CierrePendienteBanner
          cierrePendiente={cierrePendiente}
          onRefresh={refreshCierrePendiente}
          onVerDetalles={async () => {
            setShowDetalleCierre(true)
            await cargarDetalle()
          }}
        />

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

                  <button

                    onClick={() => setShowRutaProvisional(true)}

                    className="px-4 py-2 bg-blue-100 text-[#08557f] border border-blue-200 hover:bg-blue-200 rounded-xl flex items-center gap-2 font-bold shadow-sm transition-colors"

                  >

                    <Search className="h-4 w-4" />

                    <span className="hidden md:inline">Ruta Provisional</span>

                  </button>

                  <button 

                    onClick={() => {

                      setShowHistory(false)

                      setShowMisClientes(false)

                    }}

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

                    onClick={() => {

                      setShowHistory(true)

                      setShowMisClientes(false)

                    }}

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

                    onClick={() => {

                      setShowMisClientes(true)

                      setShowHistory(false)

                    }}

                    className={`px-4 py-2 border rounded-xl flex items-center gap-2 font-medium shadow-sm transition-colors ${

                      showMisClientes

                        ? 'bg-[#08557f] text-white border-[#08557f]'

                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'

                    }`}

                  >

                    <User className="h-4 w-4" />

                    <span className="hidden md:inline">Mis clientes</span>

                  </button>



                  <button

                    type="button"

                    onClick={handleCompletarRuta}

                    disabled={!rutaOperable}

                    className={`px-4 py-2 border rounded-xl flex items-center gap-2 font-bold shadow-sm transition-colors ${

                      !rutaOperable

                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200 cursor-not-allowed'

                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'

                    }`}

                  >

                    <CheckCircle2 className="h-4 w-4" />

                    <span className="hidden md:inline">{rutaCompletada ? 'Jornada completada hoy' : (!rutaActivadaHoy ? 'Jornada sin activar' : 'Completar jornada')}</span>

                  </button>



            </div>



              {!showHistory && !showMisClientes && (

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

            </div>

            {/* Lista de visitas */}

            <div>

              <div className="flex flex-col gap-4 mb-4">

                <div className="flex items-center justify-between">

                  {showHistory && (

                    <h3 className="font-bold text-slate-900 text-lg">Histórico de Rutas</h3>

                  )}

                  {showMisClientes && (

                    <h3 className="font-bold text-slate-900 text-lg">Mis clientes</h3>

                  )}

                  {!showHistory && !showMisClientes && (

                     <div className="flex flex-wrap gap-2 text-[10px] font-black text-slate-600 bg-white p-3 rounded-xl border border-slate-200 shadow-sm uppercase tracking-tighter">

                         <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 rounded-lg border border-emerald-500/20">

                             <div className="w-2 h-2 rounded-full bg-emerald-500"></div> 

                             <span>Mínimo</span>

                         </div>

                         <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 rounded-lg border border-blue-500/20">

                             <div className="w-2 h-2 rounded-full bg-blue-500"></div> 

                             <span>Leve</span>

                         </div>

                         <div className="flex items-center gap-1.5 px-2 py-1 bg-yellow-50 rounded-lg border border-yellow-500/20">

                             <div className="w-2 h-2 rounded-full bg-yellow-500"></div> 

                             <span>Precaución</span>

                         </div>

                         <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 rounded-lg border border-amber-500/20">

                             <div className="w-2 h-2 rounded-full bg-amber-500"></div> 

                             <span>Moderado</span>

                         </div>

                         <div className="flex items-center gap-1.5 px-2 py-1 bg-rose-50 rounded-lg border border-rose-500/20">

                             <div className="w-2 h-2 rounded-full bg-rose-500"></div> 

                             <span>Crítico</span>

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

                        const historyDates = historialRutas ? Object.keys(historialRutas).sort().reverse() : []; // Newest first



                        if (historyDates.length === 0) {

                          return (

                            <div className="flex flex-col items-center justify-center py-12 text-slate-400">

                               <History className="h-12 w-12 mb-3 opacity-20" />

                               <p className="text-sm font-bold">Sin historial disponible</p>

                            </div>

                          )

                        }



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



                             {/* MONTHS VIEW: días agrupados por mes con tarjetas de clientes */}

                             {historyViewMode === 'MONTHS' && (() => {

                               const allDates2 = historialRutas ? Object.keys(historialRutas).sort().reverse() : [];

                               const byMonth2: Record<string, string[]> = {};

                               for (const date of allDates2) {

                                 const [y2, mi2] = date.split('-');

                                 const mk = `${y2}-${mi2}`;

                                 if (!byMonth2[mk]) byMonth2[mk] = [];

                                 byMonth2[mk].push(date);

                               }

                               const monthKeys2 = Object.keys(byMonth2).sort().reverse();

                               if (monthKeys2.length === 0) {

                                 return (

                                   <div className="flex flex-col items-center justify-center py-12 text-slate-400">

                                     <History className="h-12 w-12 mb-3 opacity-20" />

                                     <p className="text-sm font-bold">Sin historial disponible</p>

                                   </div>

                                 );

                               }

                               return (

                                 <div className="space-y-4">

                                   {monthKeys2.map(monthKey => {

                                     const [my, mNum] = monthKey.split('-');

                                     const monthObj = new Date(parseInt(my), parseInt(mNum)-1, 1);

                                     const monthName = monthObj.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });

                                     const daysInMonth = byMonth2[monthKey];

                                    const isMonthExpanded = selectedHistoryMonth === monthKey;

                                    const monthRecaudo = daysInMonth.reduce((sum, d2) => sum + (((historialRutas as any)||{})[d2]?.resumen?.recaudo || 0), 0);

                                    const monthPagados = daysInMonth.reduce((sum, d2) => {

                                      const dd2 = ((historialRutas as any)||{})[d2];

                                      const cobrosFromPagos = Number(dd2?.resumen?.visitados || 0);

                                      if (cobrosFromPagos > 0) return sum + cobrosFromPagos;

                                      return sum + (dd2?.visitas?.filter((v: any) => v.estado === 'pagado')?.length || 0);

                                    }, 0);

                                    return (

                                      <div key={monthKey} className={`rounded-2xl border transition-all overflow-hidden bg-white border-slate-200 ${isMonthExpanded ? 'ring-1 ring-slate-300 shadow-md' : 'shadow-sm'}`}>

                                        <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => setSelectedHistoryMonth(isMonthExpanded ? null : monthKey)}>

                                          <div className="flex items-center gap-3">

                                             <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shadow-sm ${isMonthExpanded ? 'bg-[#08557f] text-white' : 'bg-slate-100 text-slate-600'}`}>{mNum}</div>

                                             <div>

                                               <div className="font-bold text-slate-900 capitalize">{monthName}</div>

                                               <div className="text-xs text-slate-500">{daysInMonth.length} días · Recaudo: <b>${formatMilesCOP(monthRecaudo)}</b></div>

                                             </div>

                                          </div>

                                          <div className="flex items-center gap-3">

                                           </div>

                                           <div className="flex items-center gap-3">

                                             <div className="px-2 py-1 rounded-lg text-[10px] font-bold bg-blue-50 text-blue-700">{monthPagados} cobros</div>

                                             <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isMonthExpanded ? 'rotate-180' : ''}`} />

                                           </div>

                                         </div>

                                         {isMonthExpanded && (

                                           <div className="border-t border-slate-100">

                                             {daysInMonth.map(date => {

                                               const dayData = ((historialRutas as any)||{})[date];

                                               const isDayExpanded = selectedHistoryDate === date;

                                               const [dy, dm, dd] = date.split('-');

                                               const dateObj2 = new Date(parseInt(dy), parseInt(dm)-1, parseInt(dd));

                                               const dayNameStr = dateObj2.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric' });

                                               return (

                                                 <div key={date} className={`border-b border-slate-50 last:border-0 transition-all ${isDayExpanded ? 'bg-slate-50/40' : ''}`}>

                                                   <div className="px-5 py-3 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => {

                                                     setSelectedHistoryDate(isDayExpanded ? null : date)

                                                     if (!isDayExpanded && !dayData.loaded) { void cargarHistorialFecha(date) }

                                                   }}>

                                                     <div className="flex items-center gap-3">

                                                       <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-[11px] ${isDayExpanded ? 'bg-[#08557f] text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>{dd}</div>

                                                       <div>

                                                         <span className="text-sm font-semibold text-slate-700 capitalize">{dayNameStr}</span>

                                                         <div className="text-[11px] text-slate-400">Recaudo: <b>${formatMilesCOP((dayData?.resumen?.recaudo || 0) as any)}</b>{dayData?.loaded && dayData.visitas.length > 0 && <span className="ml-2">· {dayData.visitas.length} clientes</span>}</div>

                                                       </div>

                                                     </div>

                                                     <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isDayExpanded ? 'rotate-180' : ''}`} />

                                                   </div>

                                                   {isDayExpanded && (

                                                     <div className="px-4 pb-4 space-y-2 animate-in slide-in-from-top-1 duration-150">

                                                       {!dayData.loaded ? (

                                                         <div className="flex flex-col items-center justify-center py-6 text-slate-400">

                                                           <div className="w-5 h-5 border-2 border-slate-300 border-t-[#08557f] rounded-full animate-spin mb-2" />

                                                           <span className="text-xs font-medium">Cargando clientes...</span>

                                                         </div>

                                                       ) : dayData.visitas.filter((v: any) => {

                                                           const isSaldado = String(v.estado || '').toLowerCase() === 'pagado' && Number(v.saldoTotal || 0) <= 0;

                                                           const tuvoActividad = Number(v.recaudadoDelDia || 0) > 0 || v.estadoVisita === 'ausente';

                                                           return !(isSaldado && !tuvoActividad);

                                                         }).length === 0 ? (

                                                         <div className="text-center py-6 text-[11px] text-slate-400 font-medium">Sin cobros registrados para este día</div>

                                                       ) : (

                                                         dayData.visitas.filter((v: any) => {

                                                             const isSaldado = String(v.estado || '').toLowerCase() === 'pagado' && Number(v.saldoTotal || 0) <= 0;

                                                             const tuvoActividad = Number(v.recaudadoDelDia || 0) > 0 || v.estadoVisita === 'ausente';

                                                             return !(isSaldado && !tuvoActividad);

                                                           }).map((visita: VisitaRuta) => (

                                                           <StaticVisitaItem key={visita.id} visita={visita} onSelect={() => {}} onVerCliente={handleAbrirClienteInfo} getEstadoClasses={getEstadoClasses} />

                                                         ))

                                                       )}

                                                     </div>

                                                   )}

                                                 </div>

                                               );

                                             })}

                                           </div>

                                         )}

                                       </div>

                                     );

                                   })}

                                 </div>

                               );

                             })()}



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

                                       const isCompleted = data.visitas.length > 0 && (data.resumen.efectividad === 100 || data.visitas.every((v: VisitaRuta) => v.estado === 'pagado'));



                                       return (

                                         <div key={date} 

                                              className={`rounded-2xl border transition-all overflow-hidden bg-white border-slate-200

                                                ${isExpanded ? 'ring-1 ring-slate-300 shadow-md' : 'shadow-sm'}

                                              `}

                                         >

                                           {/* Header (Clickable) */}

                                           <div 

                                              className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"

                                             onClick={() => {

                                               setSelectedHistoryDate(isExpanded ? null : date)

                                               if (!isExpanded && (!data.loaded)) {

                                                 void cargarHistorialFecha(date)

                                               }

                                             }}

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

                                                      Recaudo: <b>${formatMilesCOP(data.resumen.recaudo)}</b>

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

                                                      <span>{data.resumen.visitados} Clientes Gestionados</span>

                                                      <span>Estado</span>

                                                    </div>

                                                   <div>

                                                      {!(data as any).loaded ? (
                                                        <div className="flex flex-col items-center justify-center py-8 text-slate-400">

                                                          <div className="w-6 h-6 border-2 border-slate-300 border-t-[#08557f] rounded-full animate-spin mb-2" />

                                                          <span className="text-xs font-medium">Cargando detalles...</span>

                                                        </div>

                                                      ) : data.visitas.filter((v: any) => {

                                                           const isSaldado = String(v.estado || '').toLowerCase() === 'pagado' && Number(v.saldoTotal || 0) <= 0;

                                                           const tuvoActividad = Number(v.recaudadoDelDia || 0) > 0 || v.estadoVisita === 'ausente';

                                                           return !(isSaldado && !tuvoActividad);

                                                         }).length === 0 ? (

                                                        <div className="flex flex-col items-center justify-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">

                                                          <History className="w-8 h-8 text-slate-300 mb-2 opacity-30" />

                                                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center px-4">No se registraron visitas ni pagos para este día</span>

                                                        </div>

                                                      ) : (

                                                        data.visitas.filter((v: any) => {

                                                           const isSaldado = String(v.estado || '').toLowerCase() === 'pagado' && Number(v.saldoTotal || 0) <= 0;

                                                           const tuvoActividad = Number(v.recaudadoDelDia || 0) > 0 || v.estadoVisita === 'ausente';

                                                           return !(isSaldado && !tuvoActividad);

                                                         }).map((visita: VisitaRuta) => (

                                                          <StaticVisitaItem

                                                            key={visita.id}

                                                            visita={visita}

                                                            onSelect={() => {}}

                                                            onVerCliente={handleAbrirClienteInfo}

                                                            getEstadoClasses={getEstadoClasses}

                                                          />

                                                        ))

                                                      )}

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



                      if (showMisClientes) {

                        if (loadingMisCreditos) {

                          return (

                            <div className="flex flex-col items-center justify-center py-10 text-slate-400">

                              <div className="w-6 h-6 border-2 border-slate-300 border-t-[#08557f] rounded-full animate-spin mb-2" />

                              <span className="text-xs font-medium">Cargando clientes...</span>

                            </div>

                          )

                        }



                        const filtradas = misCreditos.filter((v) =>
                          (
                            v.cliente.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            v.direccion.toLowerCase().includes(searchQuery.toLowerCase())
                          ),
                        )



                        if (filtradas.length === 0) {

                          return (

                            <div className="text-center py-20 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 text-slate-400">

                              <Search className="h-10 w-10 mx-auto mb-3 opacity-20" />

                              <p className="font-medium">No se encontraron clientes asignados</p>

                            </div>

                          )

                        }



                        return (

                          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">

                            {filtradas.map((visita) => (

                              <StaticVisitaItem

                                key={visita.id}

                                visita={visita}

                                onSelect={() => {}}

                                onVerCliente={handleAbrirClienteInfo}

                                getEstadoClasses={getEstadoClasses}

                                actions={

                                  <>

                                    <button

                                      onClick={(e) => {

                                        e.stopPropagation();

                                        if (!rutaOperable) return

                                        setVisitaPagoSeleccionada(visita);

                                        setPagoInitialIsAbono(true);

                                        setShowPaymentModal(true);

                                      }}

                                      disabled={!rutaOperable}

                                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all active:scale-95 text-[11px] font-bold ${!rutaOperable ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}

                                    >

                                      <Wallet className="h-3.5 w-3.5" />

                                      Abono

                                    </button>

                                    <button

                                      onClick={(e) => {

                                        e.stopPropagation();

                                        if (!rutaOperable) return

                                        setVisitaEstadoCuentaSeleccionada(visita);

                                        setShowEstadoCuentaModal(true);

                                      }}

                                      disabled={!rutaOperable}

                                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all active:scale-95 text-[11px] font-bold ${!rutaOperable ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}

                                    >

                                      <FileTextIcon className="h-3.5 w-3.5 text-slate-400" />

                                      Estado

                                    </button>

                                    <button

                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (!rutaOperable) return;
                                        clearRegularizacionContext()
                                        setVisitaAusente(visita);
                                      }}

                                      disabled={!rutaOperable || visita.estadoVisita === 'ausente' || visita.estado === 'ausente'}

                                      title={!rutaOperable ? (rutaCompletada ? 'Jornada completada' : 'Jornada sin activar') : (visita.estadoVisita === 'ausente' || visita.estado === 'ausente' ? 'Cliente ya marcado como ausente' : 'Marcar como ausente')}

                                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border transition-all font-bold text-[11px] shadow-sm ${!rutaOperable || visita.estadoVisita === 'ausente' || visita.estado === 'ausente' ? 'bg-slate-50 text-slate-300 border-slate-100 opacity-50 cursor-not-allowed' : 'bg-white text-rose-700 border-rose-200 hover:bg-rose-50 active:scale-95'}`}

                                    >

                                      <XCircle className="h-3.5 w-3.5" />

                                      Ausente

                                    </button>

                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleAbrirClienteInfo(visita);
                                      }}
                                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-all font-bold text-[11px] shadow-sm"
                                      title="Ver expediente"
                                    >
                                      <Eye className="h-3.5 w-3.5" />
                                    </button>

                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const cliente: Cliente = {
                                          id: visita.clienteId,
                                          nombres: visita.cliente.split(' ')[0] || '',
                                          apellidos: visita.cliente.split(' ').slice(1).join(' ') || '',
                                          telefono: visita.telefono || '',
                                          direccion: visita.direccion || '',
                                        } as any;
                                        setClientToEdit(cliente);
                                        setShowEditClientModal(true);
                                      }}
                                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-amber-600 hover:bg-amber-50 transition-all font-bold text-[11px] shadow-sm"
                                      title="Editar cliente"
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </button>

                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const cliente: Cliente = {
                                          id: visita.clienteId,
                                          nombres: visita.cliente.split(' ')[0] || '',
                                          apellidos: visita.cliente.split(' ').slice(1).join(' ') || '',
                                        } as any;
                                        setClientToDelete(cliente);
                                        setShowDeleteClientModal(true);
                                      }}
                                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-rose-600 hover:bg-rose-50 transition-all font-bold text-[11px] shadow-sm"
                                      title="Eliminar cliente"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>

                                  </>

                                }

                              />

                            ))}

                          </div>

                        )

                      }



                      const isTodayOrMora = (dateStr: string) => {
                        if (!dateStr) return true;
                        return isTodayOrPastBogota(dateStr);
                      };

                      const filterByDate = (v: any) =>
                        searchQuery ||
                        isVisitaExigibleHoy(v, hoyBogotaKey);

                      const porPeriodo = {
                        DIA: visitasCobrador.filter(v => v.periodoRuta === 'DIA' && filterByDate(v)),
                        SEMANA: visitasCobrador.filter(v => v.periodoRuta === 'SEMANA' && filterByDate(v)),
                        QUINCENA: visitasCobrador.filter(v => v.periodoRuta === 'QUINCENA' && filterByDate(v)),
                        MES: visitasCobrador.filter(v => v.periodoRuta === 'MES' && filterByDate(v)),
                      }



                      const renderSeccion = (key: string, titulo: string, visitas: VisitaRuta[]) => {

                        if (visitas.length === 0) return null;

                        const visitasOrdenadas = (() => {
                          if (key !== 'DIA') return visitas
                          if (!Array.isArray(visitasOrden) || visitasOrden.length === 0) return visitas

                          return [...visitas].sort((a, b) => {
                            // En mora primero (incluso dentro del orden manual del día)
                            if (a.estado === 'en_mora' && b.estado !== 'en_mora') return -1
                            if (a.estado !== 'en_mora' && b.estado === 'en_mora') return 1

                            const ai = visitasOrdenIndex.get(a.id)
                            const bi = visitasOrdenIndex.get(b.id)
                            if (typeof ai === 'number' && typeof bi === 'number') return ai - bi
                            if (typeof ai === 'number') return -1
                            if (typeof bi === 'number') return 1
                            return (a.ordenVisita || 0) - (b.ordenVisita || 0)
                          })
                        })()

                        const estaColapsado = !!gruposColapsados[key];

                        return (

                        <div className="space-y-4">

                          <button

                            type="button"

                            onClick={() => toggleGrupo(key)}

                            className="w-full flex items-center gap-4 group"

                          >

                            <div className="h-px flex-1 bg-slate-200"></div>

                            <span className="flex items-center gap-2 text-[11px] font-black text-[#08557f] uppercase tracking-[0.25em] bg-blue-50/50 px-4 py-1.5 rounded-full border border-blue-100 shadow-sm whitespace-nowrap select-none group-hover:bg-blue-100/60 transition-colors">

                              {titulo}

                              <span className="ml-1 bg-blue-600 text-white text-[9px] px-2 py-0.5 rounded-full">{visitas.length}</span>

                              <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${estaColapsado ? '' : 'rotate-180'}`} />

                            </span>

                            <div className="h-px flex-1 bg-slate-200"></div>

                          </button>

                          {!estaColapsado && (

                            <div className="space-y-3">

                              {visitasOrdenadas.map((visita) => (

                                <SortableVisita
                                  key={visita.id}
                                  visita={visita}
                                  onSelect={(id) => setVisitaSeleccionada(id === visitaSeleccionada ? null : id)}
                                  onVerCliente={handleAbrirClienteInfo}
                                  getEstadoClasses={getEstadoClasses}
                                  disableSort={key !== 'DIA' || !rutaOperable}
                                  isSelected={visita.id === visitaSeleccionada}

                                  actions={

                                    <>

                                      <button

                                        onClick={(e) => {

                                          e.stopPropagation();

                                          if (!rutaOperable) return;

                                          clearRegularizacionContext()
                                          setVisitaPagoSeleccionada(visita);

                                          setPagoInitialIsAbono(false);

                                          setShowPaymentModal(true);

                                        }}

                                        disabled={!rutaOperable}

                                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all active:scale-95 text-[11px] font-bold ${!rutaOperable ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}

                                      >

                                        <DollarSign className="h-3.5 w-3.5" />

                                        Pago

                                      </button>

                                      <button

                                        onClick={(e) => {

                                          e.stopPropagation();

                                          if (!rutaOperable) return;

                                          clearRegularizacionContext()
                                          setVisitaPagoSeleccionada(visita);

                                          setPagoInitialIsAbono(true);

                                          setShowPaymentModal(true);

                                        }}

                                        disabled={!rutaOperable}

                                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all active:scale-95 text-[11px] font-bold ${!rutaOperable ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}

                                      >

                                        <Wallet className="h-3.5 w-3.5" />

                                        Abono

                                      </button>

                                      <button

                                        onClick={(e) => {

                                          e.stopPropagation();

                                          if (!rutaOperable) return;

                                          setVisitaEstadoCuentaSeleccionada(visita);

                                          setShowEstadoCuentaModal(true);

                                        }}

                                        disabled={!rutaOperable}

                                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border transition-all active:scale-95 text-[11px] font-bold ${!rutaOperable ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}

                                      >

                                        <FileTextIcon className="h-3.5 w-3.5 text-slate-400" />

                                        Estado

                                      </button>

                                      <button

                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (!rutaOperable) return;
                                          clearRegularizacionContext()
                                          setVisitaAusente(visita);
                                        }}

                                        disabled={!rutaOperable || visita.estadoVisita === 'ausente' || visita.estado === 'ausente'}

                                        title={!rutaOperable ? (rutaCompletada ? 'Jornada completada' : 'Jornada sin activar') : (visita.estadoVisita === 'ausente' || visita.estado === 'ausente' ? 'Cliente ya marcado como ausente' : 'Marcar como ausente')}

                                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border transition-all font-bold text-[11px] shadow-sm ${!rutaOperable || visita.estadoVisita === 'ausente' || visita.estado === 'ausente' ? 'bg-slate-50 text-slate-300 border-slate-100 opacity-50 cursor-not-allowed' : 'bg-white text-rose-700 border-rose-200 hover:bg-rose-50 active:scale-95'}`}

                                      >

                                        <XCircle className="h-3.5 w-3.5" />

                                        Ausente

                                      </button>

                                      <button

                                        onClick={(e) => {

                                          e.stopPropagation();

                                          if (!rutaOperable) return;

                                          clearRegularizacionContext()
                                          setVisitaReprogramar(visita);

                                          setShowReprogramModal(true);

                                        }}

                                        disabled={!rutaOperable}

                                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border transition-all active:scale-95 text-[11px] font-bold ${!rutaOperable ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}

                                      >

                                        <Calendar className="h-3.5 w-3.5 text-slate-400" />

                                        Repro.

                                      </button>

                                    </>

                                  }

                                />

                              ))}

                            </div>

                          )}

                        </div>

                        )

                      }



                      if (periodoRutaFiltro === 'DIA') return renderSeccion('DIA', 'Ruta del día', porPeriodo.DIA)

                      if (periodoRutaFiltro === 'SEMANA') return renderSeccion('SEMANA', 'Ruta de la semana', porPeriodo.SEMANA)

                      if (periodoRutaFiltro === 'QUINCENA') return renderSeccion('QUINCENA', 'Ruta quincenal', porPeriodo.QUINCENA)

                      if (periodoRutaFiltro === 'MES') return renderSeccion('MES', 'Ruta del mes', porPeriodo.MES)



                      return (

                        <>

                          {renderSeccion('MES', 'Ruta mensual', porPeriodo.MES)}

                          {renderSeccion('QUINCENA', 'Ruta quincenal', porPeriodo.QUINCENA)}

                          {renderSeccion('SEMANA', 'Ruta semanal', porPeriodo.SEMANA)}

                          {renderSeccion('DIA', 'Ruta del día', porPeriodo.DIA)}

                        </>

                      )

                    })()}

                  </div>

                </SortableContext>

                

                <DragOverlay>

                  {overlayVisita ? (

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

                                  {overlayVisita.cliente}

                                </div>

                                <div 

                                  className="h-1.5 w-1.5 rounded-full"

                                  style={{ backgroundColor: getPrioridadColor(overlayVisita.prioridad) }}

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


            </div>

          </div>

        </div>



        {/* Floating Action Buttons */}

        <FloatingActionMenu actions={[

          { label: 'Crear Crédito', icon: <CreditCard className="h-5 w-5" />, onClick: () => { setShowCreditModal(true); } },

          { label: 'Nuevo Cliente', icon: <UserPlus className="h-5 w-5" />, onClick: () => { setShowNewClientModal(true); } },

          { label: 'Registrar abono', icon: <RefreshCw className="h-5 w-5" />, color: 'orange', onClick: () => { setAccionPendiente('ABONO'); setShowClientSelector(true); } },

          { label: 'Registrar pago', icon: <DollarSign className="h-5 w-5" />, onClick: () => { setAccionPendiente('PAGO'); setShowClientSelector(true); } },

          { label: 'Pedir Base', icon: <Wallet className="h-5 w-5" />, color: 'emerald', onClick: () => { setShowBaseModal(true); } },

          { label: 'Gastos', icon: <ReceiptText className="h-5 w-5" />, color: 'rose', onClick: () => { setShowGastoModal(true); } },

        ] as FabAction[]} />





        {/* ── Modal de Información del Cliente (Expediente / Detalle) ── */}

        {showClienteInfoModal && visitaClienteSeleccionada && (

          <ClienteInfoModal

            visita={visitaClienteSeleccionada}

            nextPagoMonto={nextPagoMonto ?? Number((visitaClienteSeleccionada as any)?.montoCuotaPendiente ?? visitaClienteSeleccionada.montoCuota ?? 0)}

            nextPagoFecha={nextPagoFecha ?? (visitaClienteSeleccionada.proximaVisita || '')}

            recaudadoHoy={recaudadoClienteHoy}

            formatFechaLargaUTC={formatShortDate}

            onClose={() => {

              setShowClienteInfoModal(false)

              setVisitaClienteSeleccionada(null)

            }}

          />

        )}



        {/* Modales Compartidos */}

        {showPaymentModal && visitaPagoSeleccionada && (

          <PagoModal

            visita={visitaPagoSeleccionada}

            tipo={pagoInitialIsAbono ? 'ABONO' : 'PAGO'}

            onClose={() => {

              setShowPaymentModal(false)

              setVisitaPagoSeleccionada(null)

              clearRegularizacionContext()

            }}
            montoCuotaEsperadoOverride={contextoRegularizacion?.montoCuotaEsperado}
            cuotaNumeroEsperadaOverride={contextoRegularizacion?.cuotaNumeroEsperada}

            onConfirm={handleRegistrarPago}

          />

        )}



        {showRutaProvisional && (

          <RutaProvisionalModal

            visitas={visitasCobrador.filter((v: any) => {
              const pending = ['pendiente', 'en_mora'].includes(String(v?.estado || '').toLowerCase())
              if (!pending) return false
              return isVisitaExigibleHoy(v, hoyBogotaKey)
            })}

            initialOrder={visitasOrden}

            onClose={() => setShowRutaProvisional(false)}

            getEstadoClasses={getEstadoClasses}

          />

        )}



        <CrearCreditoModal

          isOpen={showCreditModal}

          onClose={() => setShowCreditModal(false)}

          onConfirm={handleCrearCredito}

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

        {showEditClientModal && clientToEdit && (
          <NuevoClienteModal
            cliente={clientToEdit}
            esEdicion={true}
            onClose={() => {
              setShowEditClientModal(false);
              setClientToEdit(null);
            }}
            onClienteCreado={(updatedClient) => {
              console.log('Cliente actualizado:', updatedClient);
              setShowEditClientModal(false);
              setClientToEdit(null);
              // Recargar clientes asignados
              if (userSession?.id) {
                cargarMisCreditosAsignados(userSession.id);
              }
            }}
          />
        )}

        {showDeleteClientModal && clientToDelete && (
          <ConfirmModal
            isOpen={showDeleteClientModal}
            onClose={() => {
              setShowDeleteClientModal(false);
              setClientToDelete(null);
            }}
            onConfirm={async () => {
              try {
                await clientesService.eliminar(clientToDelete.id);
                setShowDeleteClientModal(false);
                setClientToDelete(null);
                // Recargar clientes asignados
                if (userSession?.id) {
                  cargarMisCreditosAsignados(userSession.id);
                }
              } catch (error) {
                console.error('Error eliminando cliente:', error);
              }
            }}
            title="Eliminar cliente"
            message={`¿Estás seguro de que deseas eliminar al cliente ${clientToDelete.nombres} ${clientToDelete.apellidos}? Esta acción no se puede deshacer.`}
            confirmText="Eliminar"
            cancelText="Cancelar"
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

        {visitaAusente && (
          <AusenteModal
            visita={visitaAusente}
            onClose={() => {
              setVisitaAusente(null)
              clearRegularizacionContext()
            }}
            onConfirm={async (notas) => {
              if (!rutaActual?.id || !visitaAusente?.clienteId) return;
              
              // Guardar posición del scroll antes de recargar
              scrollPositionRef.current = window.scrollY;
              
              await rutasService.marcarVisitaAusente(rutaActual.id, visitaAusente.clienteId, {
                estadoVisita: 'ausente',
                notas,
                fechaOperativa: contextoRegularizacion?.fechaOperativa,
                origenGestion: contextoRegularizacion?.origenGestion,
              });
              const clienteIdAusente = visitaAusente.clienteId;
              setVisitasBase((prev: VisitaRuta[]) =>
                prev.map((v: VisitaRuta) =>
                  v.clienteId === clienteIdAusente
                    ? { ...v, estado: 'ausente' as any, estadoVisita: 'ausente' as any, notasVisita: notas }
                    : v
                )
              );
              // También actualizar misCreditos para que se refleje en la sección "mis clientes"
              setMisCreditos((prev: VisitaRuta[]) =>
                prev.map((v: VisitaRuta) =>
                  v.clienteId === clienteIdAusente
                    ? { ...v, estado: 'ausente' as any, estadoVisita: 'ausente' as any, notasVisita: notas }
                    : v
                )
              );
              toast.success('Cliente marcado como ausente');
              setVisitaAusente(null);
              clearRegularizacionContext();
              await cargarDatosRuta();
              
              // Restaurar posición del scroll después de recargar
              setTimeout(() => {
                window.scrollTo(0, scrollPositionRef.current);
              }, 100);
            }}
          />
        )}

        {showClientSelector && (

          <SeleccionClienteModal

            titulo={accionPendiente === 'PAGO' ? 'Seleccionar Cliente' : accionPendiente === 'ABONO' ? 'Seleccionar para Abono' : 'Seleccionar Cliente'}

            subtitulo={accionPendiente === 'PAGO' ? '¿Quién realiza el pago?' : 'Busque el cliente en la lista'}

            visitas={visitasBase}

          onSelect={(visita) => {

            setShowClientSelector(false)

            if (accionPendiente === 'PAGO') {

                clearRegularizacionContext()
                setVisitaPagoSeleccionada(visita)

                setPagoInitialIsAbono(false)

                setShowPaymentModal(true)

            }

            else if (accionPendiente === 'ABONO') {

                clearRegularizacionContext()
                setVisitaPagoSeleccionada(visita)

                setPagoInitialIsAbono(true)

                setShowPaymentModal(true)

            }

            else if (accionPendiente === 'REPROGRAMAR') {

                clearRegularizacionContext()
                setVisitaReprogramar(visita)

                setShowReprogramModal(true)

            }

            else {

                setVisitaEstadoCuentaSeleccionada(visita)

                setShowEstadoCuentaModal(true)

            }

            setAccionPendiente(null)

          }}

          onClose={() => {

            setShowClientSelector(false)

            setAccionPendiente(null)

          }}

          />

        )}



        {showReprogramModal && visitaReprogramar && (

          <ReprogramarModal

            visita={visitaReprogramar}

            onClose={() => {

              setShowReprogramModal(false)

              setVisitaReprogramar(null)

              clearRegularizacionContext()

            }}

            onConfirm={handleGuardarReprogramacion}

          />

        )}



        <GastoModal 

          isOpen={showGastoModal}

          onClose={() => setShowGastoModal(false)}
          
          rutaId={rutaActual?.id}
          
          cobradorId={userSession?.id}
          
          recaudoDia={rutaStats.recaudo}
          
          gastosDia={rutaStats.gastos}

          onConfirm={async (data) => {

            if (!rutaActual || !userSession) return

            try {

              setIsLoadingAction(true)

              await registrarGasto({
                descripcion: data.descripcion,
                valor: data.valor,
                comprobante: data.comprobante,
                rutaId: rutaActual.id,
                cobradorId: userSession.id,
                ...(data.categoriaId ? { categoriaId: data.categoriaId } : {}),
                ...(data.esPersonal !== undefined ? { esPersonal: data.esPersonal } : {})
              })

              // Sincronizar KPI de gastos con valor real desde backend

              try {

                const hoyClave = hoyBogotaKey;

                const saldo = await obtenerSaldoDisponibleRuta(rutaActual.id, hoyClave);

                setRutaStats(prev => ({

                  ...prev,

                  gastos: Number(saldo.gastosDelDia || prev.gastos)

                }));

              } catch {

                // Fallback local si el endpoint falla

                setRutaStats(prev => ({ ...prev, gastos: prev.gastos + data.valor }))

              }

              setModalAlerta({
                titulo: 'Éxito',
                mensaje: data.esPersonal ? 'Gasto personal registrado y enviado para aprobación.' : 'Gasto operativo registrado y descontado de la ruta.',
                tipo: 'exito'
              })

              setShowGastoModal(false)

            } catch (error: any) {

              console.error('Error al registrar gasto:', error)

              const mensajeError =

                error?.statusCode === 404 && typeof error?.message === 'string' && error.message.toLowerCase().includes('caja de ruta')

                  ? 'No se encontró una caja de ruta asociada para registrar el gasto. Informe al coordinador para que configure la caja de ruta en el módulo contable.'

                  : (error?.message || 'Error al registrar el gasto. Intente nuevamente.')

              setModalAlerta({

                titulo: 'Error',

                mensaje: mensajeError,

                tipo: 'error'

              })

            } finally {

              setIsLoadingAction(false)

            }

          }}

        />



        <BaseModal

          isOpen={showBaseModal}

          onClose={() => setShowBaseModal(false)}

          onConfirm={async (data) => {

            if (!rutaActual || !userSession) return

            try {

              setIsLoadingAction(true)

              await solicitarBase({

                monto: data.monto,

                descripcion: data.descripcion,

                cobradorId: userSession.id,

                rutaId: rutaActual.id

              })

              setModalAlerta({

                titulo: 'Éxito',

                mensaje: 'Solicitud de base enviada al coordinador. Espere aprobación.',

                tipo: 'exito'

              })

              setShowBaseModal(false)

            } catch (error: any) {

              console.error('Error solicitando base:', error)

              setModalAlerta({

                titulo: 'Error',

                mensaje: error.message || 'No se pudo enviar la solicitud de base.',

                tipo: 'error'

              })

            } finally {

              setIsLoadingAction(false)

            }

          }}

        />



        {showConfirmCompleteModal && (() => {

          const visitasCierreHoy = (visitasBase || [])
            .map((v: any) => ({ ...v, estado: ajustarEstadoConPago(v) }))
            .filter((v: any) => shouldIncludeVisitaInRutaHoyKpis(v, hoyBogotaKey))
          const visitasAusentesCierre = visitasCierreHoy.filter((v: any) => shouldExcludeVisitaFromOperationalMeta(v))
          const visitasOperativasCierre = visitasCierreHoy.filter((v: any) => !shouldExcludeVisitaFromOperationalMeta(v))
          const clientesFaltantesHoy = visitasOperativasCierre.filter((v: any) => {
            const estado = String(v?.estado || '').toLowerCase()
            return estado !== 'pagado'
          }).length
          const clientesAusentesHoy = visitasAusentesCierre.length
          const ausentesConNotaCierre = visitasAusentesCierre.map((v: any) => ({
            nombre: String(v?.cliente || 'Cliente'),
            nota: String(v?.notasVisita || '').trim(),
          }))
          const totalProgramadosHoy = visitasCierreHoy.length
          const totalOperativosHoy = visitasOperativasCierre.length
          const clientesCobradosHoy = visitasOperativasCierre.filter((v: any) => {
            const estado = String(v?.estado || '').toLowerCase()
            return estado === 'pagado' || Number(v?.recaudadoDelDia || 0) > 0
          }).length
          const metaV = Number((rutaStatsUI as any)?.meta || 0)
          const recaudoV = Number((rutaStatsUI as any)?.recaudo || 0)
          const porcentaje = Number((rutaStatsUI as any)?.eficiencia || 0)

          const alCien = porcentaje >= 100;

          const saldoDisponibleV = Number((rutaStatsUI as any)?.base || 0)
          const gastosDiaV = Number((rutaStatsUI as any)?.gastos || 0)
          const pendienteCobroV = Math.max(0, metaV - recaudoV)
          const recaudoNetoV = Math.max(0, recaudoV - gastosDiaV)
          const descuadre = saldoDisponibleV > 0 || clientesFaltantesHoy > 0 || clientesAusentesHoy > 0;

          // Todos pendientes = ningún cliente de la ruta fue cobrado

          const todosPendientes = clientesFaltantesHoy > 0 && clientesFaltantesHoy === totalOperativosHoy;

          return (

          <Portal>

            <div
              className="fixed inset-0 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
              style={{ zIndex: MODAL_Z_INDEX }}
              onClick={() => { setShowConfirmCompleteModal(false); setShowDoubleConfirmComplete(false); }}
            >
             <div 
               className="bg-white rounded-3xl p-6 shadow-2xl w-full max-w-md border border-slate-100 animate-in zoom-in-95 duration-200"
               onClick={(e) => e.stopPropagation()}
             >
                <div className="flex flex-col items-center text-center gap-4">
                    {!showDoubleConfirmComplete ? (
                      <>
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-2 border ${alCien ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-orange-50 text-orange-500 border-orange-100'}`}>
                           {alCien ? <CheckCircle2 className="h-8 w-8" /> : <AlertTriangle className="h-8 w-8" />}
                        </div>

                        <div>
                          <h3 className="text-xl font-black text-slate-900 tracking-tight mb-2">¿Finalizar Ruta del Día?</h3>
                          <p className="text-slate-500 text-sm font-medium leading-relaxed">
                             Al marcar la ruta como completada se reportará tu rendimiento a la oficina.
                          </p>
                        </div>

                        {descuadre && (
                          <div className="w-full flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-2xl text-left">
                            <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-xs font-black text-red-700 uppercase tracking-wide">Dinero sin entregar</p>
                              <p className="text-[11px] text-red-600 font-medium mt-0.5">
                                La caja de esta ruta conserva <span className="font-black">{formatCurrency(saldoDisponibleV)}</span>. Confirma que este valor ya fue recolectado o quedará soportado al cerrar.
                              </p>
                            </div>
                          </div>
                        )}

                        {clientesFaltantesHoy > 0 && (
                          <div className={`w-full flex items-start gap-2 p-3 rounded-2xl text-left border ${todosPendientes ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-100'}`}>
                            {todosPendientes
                              ? <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                              : <Info className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />}
                            <p className={`text-[11px] font-bold ${todosPendientes ? 'text-red-700' : 'text-amber-700'}`}>
                              {todosPendientes
                                ? <><span className="text-red-900 text-sm font-black">Ningún</span> cliente fue cobrado hoy. Sin recaudo en la jornada.</>  
                                : <>Faltaron <span className="text-amber-900 text-sm font-black">{clientesFaltantesHoy}</span> cliente{clientesFaltantesHoy > 1 ? 's' : ''} por cobrar hoy.</>}
                            </p>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-2 border border-red-200 animate-pulse">
                           <ShieldAlert className="h-8 w-8 text-red-600" />
                        </div>

                        <div>
                          <h3 className="text-xl font-black text-red-900 tracking-tight mb-2">¡Doble Confirmación!</h3>
                          <p className="text-red-700 text-sm font-bold leading-relaxed px-2">
                             Vas a cerrar con {clientesFaltantesHoy} pendiente{clientesFaltantesHoy === 1 ? '' : 's'}, {clientesAusentesHoy} ausente{clientesAusentesHoy === 1 ? '' : 's'} y {formatCurrency(saldoDisponibleV)} en caja.
                          </p>
                          <p className="mt-3 text-slate-500 text-[11px] font-medium leading-relaxed px-4">
                             Esta acción reportará la jornada a oficina con estos valores. Revisa antes de confirmar definitivamente.
                          </p>
                        </div>
                      </>
                    )}

                   <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-left grid grid-cols-2 gap-y-4 gap-x-3 w-full">
                      <div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Saldo caja ruta</p>
                        <p className="text-sm font-black text-blue-600">{formatCurrency((rutaStatsUI as any)?.base || 0)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Recaudado Hoy</p>
                        <p className={`text-sm font-black ${alCien ? 'text-emerald-600' : 'text-orange-600'}`}>{formatCurrency(recaudoV)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Gastos del Día</p>
                        <p className="text-sm font-black text-rose-600">{formatCurrency(gastosDiaV)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Meta Cobro</p>
                        <p className="text-sm font-black text-slate-900">{formatCurrency(metaV)}</p>
                      </div>

                      <div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Programados</p>
                        <p className="text-sm font-black text-slate-900">{totalProgramadosHoy}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Cobrados</p>
                        <p className="text-sm font-black text-emerald-600">{clientesCobradosHoy}</p>
                      </div>
                      {descuadre && (
                        <div className="col-span-2 p-3 bg-red-50 rounded-xl border border-red-100">
                          <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest">Saldo en caja al cierre</p>
                          <p className="text-lg font-black text-red-600">{formatCurrency(saldoDisponibleV)}</p>
                        </div>
                      )}

                      <div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Pendiente $</p>
                        <p className="text-sm font-black text-amber-600">{formatCurrency(pendienteCobroV)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Recaudo Neto</p>
                        <p className="text-sm font-black text-emerald-600">{formatCurrency(recaudoNetoV)}</p>
                      </div>

                      <div className="col-span-2 flex justify-between items-center border-t border-slate-200 pt-3">
                        <div>
                           <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Efectividad</p>
                           <p className={`text-sm font-black ${alCien ? 'text-emerald-600' : 'text-orange-600'}`}>{porcentaje}%</p>
                        </div>
                        <div className="text-right">
                           <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Pendientes</p>
                           <p className={`text-sm font-black ${clientesFaltantesHoy > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                             {clientesFaltantesHoy === 0 ? 'Ninguno' : `${clientesFaltantesHoy} clientes`}
                           </p>
                        </div>
                        <div className="text-right">
                           <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Ausentes</p>
                           <p className="text-sm font-black text-slate-500">
                             {clientesAusentesHoy === 0 ? 'Ninguno' : `${clientesAusentesHoy} cliente${clientesAusentesHoy > 1 ? 's' : ''}`}
                           </p>
                        </div>
                      </div>
                   </div>
                   {ausentesConNotaCierre.length > 0 && (
                     <div className="w-full text-left rounded-2xl border border-amber-200 bg-amber-50 p-3 space-y-2">
                       <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Ausentes con justificación</p>
                       <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                         {ausentesConNotaCierre.map((item, idx) => (
                           <div key={`${item.nombre}-${idx}`} className="text-[11px] leading-snug">
                             <p className="font-black text-amber-900">{item.nombre}</p>
                             <p className="font-medium text-amber-800 whitespace-pre-wrap break-words">{item.nota || 'Sin justificación registrada.'}</p>
                           </div>
                         ))}
                       </div>
                     </div>
                   )}

                   <div className="flex gap-3 w-full mt-2">
                      <button
                        onClick={() => { setShowConfirmCompleteModal(false); setShowDoubleConfirmComplete(false); }}
                        className="flex-1 py-3.5 text-slate-600 font-bold bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all active:scale-95 border border-slate-200"
                      >
                        Cancelar
                      </button>

                      <button
                        onClick={() => {
                          if (descuadre && !showDoubleConfirmComplete) {
                            setShowDoubleConfirmComplete(true)
                          } else {
                            confirmarFinalizarRuta()
                            setShowDoubleConfirmComplete(false)
                          }
                        }}
                        className={`flex-1 py-3.5 text-white font-bold rounded-2xl transition-all shadow-xl active:scale-95 ${showDoubleConfirmComplete ? 'bg-red-600 hover:bg-red-700 shadow-red-600/20' : 'bg-slate-900 hover:bg-slate-800 shadow-slate-900/20'}`}
                      >
                        {showDoubleConfirmComplete ? 'Sí, Finalizar' : 'Confirmar'}
                      </button>
                   </div>
                </div>
             </div>
          </div>
          </Portal>
        );
      })()}



        {/* Modal de Alerta usando ConfirmModal */}

        {modalAlerta && (

          <ConfirmModal

            isOpen={!!modalAlerta}

            onClose={() => setModalAlerta(null)}

            onConfirm={() => setModalAlerta(null)}

            title={modalAlerta.titulo}

            message={modalAlerta.mensaje}

            confirmText="Entendido"

            cancelText={null}

            variant={modalAlerta.tipo === 'error' ? 'danger' : modalAlerta.tipo === 'info' ? 'info' : 'success'}

          />

        )}

        <CierrePendienteDetalleModal
          open={showDetalleCierre}
          onClose={() => setShowDetalleCierre(false)}
          detalle={detalle}
          loading={loadingDetalleCierre}
          onVerEstadoCuenta={(cliente, contextoRegularizacion) => {
            const visita = visitasBase.find((v: any) => v.clienteId === cliente.clienteId)
            if (!visita) {
              toast.error('No se encontró la visita del cliente.')
              return
            }

            setShowDetalleCierre(false)

            setTimeout(() => {
              setVisitaEstadoCuentaSeleccionada(visita)
              setShowEstadoCuentaModal(true)
            }, 80)
          }}
          onRegistrarPago={(cliente, contextoRegularizacion) => {
            const visitaBase = visitasBase.find((v: any) => v.clienteId === cliente.clienteId)
            if (!visitaBase) {
              toast.error('No se encontró la visita del cliente.')
              return
            }

            const target = buildRegularizedPaymentTarget({
              rutaId: rutaActual?.id,
              cliente,
              visitaBase,
              contextoRegularizacion,
            })

            if (target.error) {
              toast.error(target.error)
              return
            }

            setShowDetalleCierre(false)

            setTimeout(() => {
              setRegularizacionContext(target.contextoPagoRegularizado)
              setVisitaPagoSeleccionada(target.visitaRegularizada as any)
              setPagoInitialIsAbono(false)
              setShowPaymentModal(true)
            }, 80)
          }}
          onMarcarAusente={(cliente, contextoRegularizacion) => {
            const visita = visitasBase.find((v: any) => v.clienteId === cliente.clienteId)
            if (!visita) {
              toast.error('No se encontró la visita del cliente.')
              return
            }

            setShowDetalleCierre(false)

            setTimeout(() => {
              setVisitaAusente(visita)
              setRegularizacionContext(contextoRegularizacion)
            }, 80)
          }}
          onReprogramar={(cliente, contextoRegularizacion) => {
            const visita = visitasBase.find((v: any) => v.clienteId === cliente.clienteId)
            if (!visita) {
              toast.error('No se encontró la visita del cliente.')
              return
            }

            setShowDetalleCierre(false)

            setTimeout(() => {
              setRegularizacionContext(contextoRegularizacion)
              setVisitaReprogramar(visita)
              setShowReprogramModal(true)
            }, 80)
          }}
          onRegularizar={async (contextoRegularizacion) => {
            if (!rutaActual?.id) {
              toast.error('No se encontró la ruta.')
              return
            }

            const fechaOperativa = contextoRegularizacion?.fechaOperativa
            if (!fechaOperativa) {
              toast.error('No se encontró la fecha operativa de la jornada.')
              return
            }

            try {
              await routesApi.cerrarJornadaRegularizada(
                rutaActual.id,
                fechaOperativa,
                'Jornada regularizada desde el módulo de cierre pendiente.',
              )

              toast.success('Jornada cerrada exitosamente.')

              await cargarDetalle()
              await refreshCierrePendiente?.()
              await cargarDatosRuta?.()
              setShowDetalleCierre(false)
            } catch (error: any) {
              toast.error(
                error?.message || 'No se pudo cerrar la jornada regularizada.',
              )
            }
          }}
          permissions={((): any => {
            const rolActual = String(userSession?.rol || '').toUpperCase()
            const isSuperAdmin =
              rolActual === 'SUPER_ADMIN' ||
              rolActual === 'SUPER_ADMINISTRADOR'
            const isAdmin = rolActual === 'ADMIN'
            const isCoordinador = rolActual === 'COORDINADOR'
            const isSupervisor = rolActual === 'SUPERVISOR'
            const isCobrador = rolActual === 'COBRADOR'

            const canAdministrarJornada = isSuperAdmin || isAdmin || isCoordinador
            const canSupervisarJornada = isSuperAdmin || isAdmin || isCoordinador || isSupervisor

            return {
              canExportarDetalle: false,
              canSolicitarCorreccion: false,
              canCerrarJornada: canAdministrarJornada,
              canRegistrarPago: (canSupervisarJornada || isCobrador) && !esDiaNoLaboral,
              canMarcarAusente: canSupervisarJornada || isCobrador,
              canAnularAusencia: false,
              canReprogramar: false,
              canVerPago: false,
              canVerComprobante: false,
              canAgregarObservacion: false,
            }
          })()}
          handlers={{
            onAnularAusencia: undefined,
            onVerPago: undefined,
            onVerComprobante: undefined,
            onAgregarObservacion: undefined,
          }}
        />

      </div>

    </div>

  )

}



export default VistaCobrador









