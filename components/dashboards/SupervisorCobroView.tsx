'use client'


/**
 * ============================================================================
 * VISTA OPERATIVA DE COBRANZA - MODO SUPERVISOR
 *
 * ============================================================================
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'

import { useRealtimeData } from '@/hooks/useRealtimeData'
import { useCierrePendienteRuta } from '@/hooks/useCierrePendienteRuta'
import RutaHistorialOperativo from '@/components/rutas/historial/RutaHistorialOperativo'

import { mapWithConcurrency, memoizePromiseByKey } from '@/lib/async-utils'
import { mapNivelRiesgo } from '@/lib/types/cobranza'
import { enrichVisitasConCuotasYRiesgo } from '@/lib/rutas/enrich-visitas-con-cuotas-y-riesgo'
import { ordenarVisitasRutaActual } from '@/lib/rutas/ordenar-visitas-ruta'
import { resolveVisitaBaseRegularizacion } from '@/lib/rutas/resolve-visita-base-regularizacion'
import { formatMilesCOP } from '@/lib/utils'
import { buildRutaHoyOperativa } from '@/lib/rutas/build-ruta-hoy-operativa'
import { formatRoleLabel } from '@/lib/display-labels'
import { computeDiasMoraFromCuotas } from '@/lib/rutas-core'
import { resolveRiesgoObligacion, resolveNivelRiesgoUi } from '@/lib/rutas/riesgo-obligacion'

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
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
  FileDown,
  ShieldAlert,
} from 'lucide-react'

import { RolUsuario, MetodoPago } from '@/types/enums'
import { EstadoVisita, PeriodoRuta, VisitaRuta } from '@/lib/types/cobranza'

import { obtenerPerfil } from '@/services/autenticacion-service'
import { rutasService, Ruta } from '@/services/rutas-service'

import NuevoClienteModal from '@/components/clientes/NuevoClienteModal'
import ClienteInfoModal from '@/components/cobranza/ClienteInfoModal'
import { StaticVisitaItem, SeleccionClienteModal, Portal, MODAL_Z_INDEX } from '@/components/dashboards/shared/CobradorElements'
import EstadoCuentaModal from '@/components/cobranza/EstadoCuentaModal'
import PagoModal from '@/components/cobranza/PagoModal'
import AusenteModal from '@/components/cobranza/AusenteModal'
import CrearCreditoModal from '@/components/dashboards/shared/CrearCreditoModal'
import { CierrePendienteBanner } from '@/components/rutas/CierrePendienteBanner'
import { CierrePendienteDetalleModal } from '@/components/rutas/CierrePendienteDetalleModal'
import { useCierrePendienteDetalle } from '@/hooks/useCierrePendienteDetalle'
import type { CierrePendienteDetalle } from '@/types/rutas/cierre-pendiente'

import ConfirmModal from '@/components/ui/ConfirmModal'

import ReprogramarModal from '@/components/cobranza/ReprogramarModal'

import GastoModal from '@/components/dashboards/shared/GastoModal'


import BaseModal from '@/components/dashboards/shared/BaseModal'


import DetalleMoraModal from '@/components/cobranza/DetalleMoraModal'


import FloatingActionMenu, { FabAction } from '@/components/dashboards/shared/FloatingActionMenu'

import RutaKpiSection from '@/components/dashboards/shared/RutaKpiSection'


import {
  buildReprogramacionCierrePendienteKey,
  prestamosService,
} from '@/services/prestamos-service'
import { buildCrearPrestamoPayload } from '@/lib/creditos/crear-prestamo-payload'
import { pagosService } from '@/services/pagos-service'

import { applyRecaudoHoyToVisitas, buildRecaudosHoyMapByPrestamoId, computeMontoCuotaPendienteDespuesDeRecaudo, indexPagosByPrestamoId } from '@/lib/ruta-recaudos'

import { obtenerSaldoDisponibleRuta, obtenerSaldoCajaSupervisor, getRutaCierreHoy, registrarGasto } from '@/services/contabilidad-service'


import { routesService as routesApi } from '@/services/routes-service'


import { exportService } from '@/services/export-service'


import { useNotificaciones } from '@/components/providers/NotificacionesProvider'


import {
  buildRegularizedPaymentTarget,
  computeMontoExigibleHastaHoyFromCuotas,
  computeMontoNominalHastaHoyFromCuotas,
  computeRutaHoyUiStatsFromVisitas,
  resolveRutaHoyKpiStats,
  esDomingoBogota,
  getBogotaDateKey,
  getBogotaRangeByPeriod,
  getPagoBogotaDateKey,
  isCuotaNoPagada,
  isTodayOrPastBogota,
  isVisitaExigibleHoy,
  normalizeDateKey,
  resolveFechaEfectivaCuota,
  shouldExcludeVisitaFromOperationalMeta,
  resolveProximaCuotaFromPrestamo,
  resolveCuotaProgressFromPrestamo,
  resolveCuotaNormalOperativa,
  resolveCobradorIdForRouteAction,
  computeDiasMoraFromCuotaObjetivo,
  shouldShowVisitaEnRutaHoy,
  resolveRutaDailySummary,
  resolveCuotaIdFromVisitaLike,
} from '@/lib/rutas-core'

import { mapAsignacionesToVisitasLite } from '@/lib/ruta-visitas-mapper'
import { mapDailyVisitsResponseToVisitas as mapDailyVisitsResponseToVisitasShared, type MapMode } from '@/lib/rutas/map-daily-visits-to-visitas'

import SundayNoticeBanner from '@/components/rutas/SundayNoticeBanner'
import { SafePointerSensor } from '@/components/dashboards/shared/safe-pointer-sensor'

import RutaProvisionalModal from '@/components/dashboards/shared/RutaProvisionalModal'

import { toast } from 'sonner'

const normalizePeriodoRuta = (raw: any): any => {
  const v = String(raw || '').toUpperCase()
  if (v === 'DIARIO' || v === 'DIA') return 'DIA'
  if (v === 'SEMANAL' || v === 'SEMANA') return 'SEMANA'
  if (v === 'QUINCENAL' || v === 'QUINCENA') return 'QUINCENA'
  if (v === 'MENSUAL' || v === 'MES') return 'MES'
  return 'DIA'
}

const mapDailyVisitToVisitaRuta = (row: any, rutaCobradorId: string, idx: number): VisitaRuta => {
  const cliente = row?.cliente || {}
  const prestamos = Array.isArray(row?.prestamos) ? row.prestamos : []
  const prestamoObjetivo = prestamos.find((p: any) => p?.id === row?.prestamoObjetivoId) || prestamos[0] || {}
  const cuotaObjetivo = row?.cuotaObjetivo || prestamoObjetivo?.cuotaObjetivo || prestamoObjetivo?.proximaCuota || {}
  const cuotaId = resolveCuotaIdFromVisitaLike(row, prestamoObjetivo, cuotaObjetivo)
  const saldoExigible = Number(
    cuotaObjetivo?.saldoExigibleEnFechaOperativa ??
    prestamoObjetivo?.montoMetaOperativaPendiente ??
    cuotaObjetivo?.montoCuota ??
    cuotaObjetivo?.monto ??
    0,
  )
  const montoNominal = Number(
    cuotaObjetivo?.montoCuotaNormal ??
    cuotaObjetivo?.montoNominal ??
    cuotaObjetivo?.montoCuota ??
    cuotaObjetivo?.monto ??
    prestamoObjetivo?.valorCuota ??
    prestamoObjetivo?.montoCuota ??
    saldoExigible,
  )
  const saldoTotal = Number(prestamoObjetivo?.saldoPendiente ?? saldoExigible)
  const recaudo = Number(row?.recaudadoDelDia || 0)
  const estadoCuota = String(cuotaObjetivo?.estadoActual || cuotaObjetivo?.estado || '').toUpperCase()
  const enMora = Boolean(cuotaObjetivo?.enMoraEnFechaOperativa) || estadoCuota === 'VENCIDA'
  const pagado = saldoTotal <= 0 || Boolean(cuotaObjetivo?.cubiertaPorPagoJornada) || (saldoExigible <= 0 && recaudo > 0)
  const diasMora = Number(
    row?.diasMora ??
      row?.diasMoraOperativos ??
      cuotaObjetivo?.diasMora ??
      computeDiasMoraFromCuotaObjetivo(cuotaObjetivo, getBogotaDateKey(new Date()), prestamoObjetivo?.frecuenciaPago) ??
      0,
  )

  return {
    id: `${row?.asignacionId || 'daily'}-${prestamoObjetivo?.id || cliente?.id || idx}`,
    cliente: `${cliente?.nombres || ''} ${cliente?.apellidos || ''}`.trim() || 'Cliente',
    direccion: cliente?.direccion || 'Sin dirección registrada',
    telefono: cliente?.telefono || '',
    horaSugerida: '08:00 AM',
    montoCuota: montoNominal,
    montoCuotaNormal: montoNominal,
    montoCuotaPendiente: saldoExigible,
    saldoTotal: Math.max(0, saldoTotal),
    estado: (pagado ? 'pagado' : enMora ? 'en_mora' : 'pendiente') as EstadoVisita,
    estadoVisita: row?.estadoVisita || undefined,
    notasVisita: row?.notasVisita || undefined,
    proximaVisita: cuotaObjetivo?.fechaEfectiva || cuotaObjetivo?.fechaVencimientoProrroga || cuotaObjetivo?.fechaVencimiento || getBogotaDateKey(new Date()),
    targetVencimiento: cuotaObjetivo?.fechaVencimiento || undefined,
    ordenVisita: Number(row?.ordenVisita || idx + 1),
    prioridad: enMora ? 'alta' : 'media',
    nivelRiesgo: mapNivelRiesgo(cliente?.nivelRiesgo) as any,
    cobradorId: rutaCobradorId,
    periodoRuta: normalizePeriodoRuta(prestamoObjetivo?.frecuenciaPago) as PeriodoRuta,
    clienteId: cliente?.id || '',
    prestamoId: prestamoObjetivo?.id || row?.prestamoObjetivoId || '',
    cuotaId,
    cuotaObjetivoId: cuotaId,
    cuotaObjetivoPrestamoId: cuotaId,
    cuotaObjetivo,
    proximaCuota: prestamoObjetivo?.proximaCuota,
    cuotaActual: Number(cuotaObjetivo?.numeroCuota || 0) || undefined,
    cuotasTotales: Number(prestamoObjetivo?.cantidadCuotas || 0) || undefined,
    tipoPrestamo: String(prestamoObjetivo?.tipo || '').toUpperCase() === 'ARTICULO' ? 'ARTICULO' : 'EFECTIVO',
    articuloNombre: String(prestamoObjetivo?.tipo || '').toUpperCase() === 'ARTICULO' ? 'Artículo' : 'Préstamo',
    enProrroga: Boolean(cuotaObjetivo?.fechaVencimientoProrroga),
    fechaProrroga: cuotaObjetivo?.fechaVencimientoProrroga || undefined,
    fechaOriginalVencimiento: cuotaObjetivo?.fechaVencimiento || undefined,
    recaudadoDelDia: recaudo,
    diasMora,
  } as any
}

const mapObligacionToVisitaRuta = (o: any, rutaCobradorId: string, idx: number, hoyKey: string): VisitaRuta => {
  const clienteObj = typeof o.cliente === 'object' && o.cliente ? o.cliente : {}
  const prestamo = o.prestamo || {}
  const clienteNombre =
    o.clienteNombre ||
    clienteObj?.nombre ||
    `${clienteObj?.nombres || ''} ${clienteObj?.apellidos || ''}`.trim() ||
    (typeof o.cliente === 'string' ? o.cliente : '') ||
    'Cliente'

  const estadoGestion = String(
    o.estadoGestion ||
    o.estadoVisita ||
    prestamo?.estadoGestion ||
    prestamo?.estadoVisita ||
    'PENDIENTE',
  ).toUpperCase()

  const cuotaObjetivo = o.cuotaObjetivo || prestamo?.cuotaObjetivo || prestamo?.proximaCuota || {}
  const cuotaId = resolveCuotaIdFromVisitaLike(o, prestamo, cuotaObjetivo)

  const estadoCuota = String(
    o.cuotaObjetivo?.estadoActual ||
    o.cuotaObjetivo?.estado ||
    cuotaObjetivo?.estadoActual ||
    cuotaObjetivo?.estado ||
    prestamo?.proximaCuota?.estadoActual ||
    prestamo?.proximaCuota?.estado ||
    '',
  ).toUpperCase()

  const estaEnMora =
    Boolean(o.cuotaObjetivo?.enMoraEnFechaOperativa) ||
    Boolean(cuotaObjetivo?.enMoraEnFechaOperativa) ||
    estadoCuota.includes('VENC') ||
    estadoCuota.includes('MORA')

  const estadoVisual: EstadoVisita = estadoGestion.includes('REPROGRAM')
    ? 'reprogramado'
    : estaEnMora
      ? 'en_mora'
      : 'pendiente'

  const montoMetaPendiente = Number(
    o.montoMetaOperativaPendiente ??
    prestamo?.montoMetaOperativaPendiente ??
    o.cuotaObjetivo?.saldoExigibleEnFechaOperativa ??
    prestamo?.cuotaObjetivo?.saldoExigibleEnFechaOperativa ??
    0,
  )
  const cuotaNormal = Number(
    o.montoCuotaNormal ??
    o.cuotaObjetivo?.montoCuota ??
    o.cuotaObjetivo?.montoNominal ??
    cuotaObjetivo?.montoCuota ??
    cuotaObjetivo?.montoNominal ??
    cuotaObjetivo?.monto ??
    prestamo?.proximaCuota?.montoCuota ??
    prestamo?.proximaCuota?.montoNominal ??
    prestamo?.proximaCuota?.monto ??
    prestamo?.valorCuota ??
    prestamo?.montoCuota ??
    0,
  )
  const frecuenciaPago = o.frecuenciaPago || prestamo?.frecuenciaPago || 'DIARIO'
  const diasMora = Number(
    o.diasMora ??
      o.diasMoraOperativos ??
      o.cuotaObjetivo?.diasMora ??
      cuotaObjetivo?.diasMora ??
      computeDiasMoraFromCuotaObjetivo(cuotaObjetivo, hoyKey, frecuenciaPago) ??
      0,
  )

  return {
    ...o,
    id: o.id || o.prestamoId || prestamo?.id || `obligacion-${idx}`,
    cliente: clienteNombre,
    direccion: o.direccion || clienteObj?.direccion || 'Sin dirección registrada',
    telefono: o.telefono || clienteObj?.telefono || '',
    horaSugerida: o.horaSugerida || '08:00 AM',
    montoCuota: cuotaNormal,
    montoCuotaNormal: cuotaNormal,
    montoCuotaPendiente: montoMetaPendiente,
    montoMoraAcumulada: Number(
      o.montoMoraAcumulada ??
      o.saldoVencidoAcumulado ??
      o.cuotaObjetivo?.montoMoraAcumulada ??
      o.cuotaObjetivo?.saldoVencidoAcumulado ??
      prestamo?.cuotaObjetivo?.montoMoraAcumulada ??
      prestamo?.cuotaObjetivo?.saldoVencidoAcumulado ??
      0,
    ),
    cuotasVencidas: Number(
      o.cuotasVencidas ??
      o.cuotaObjetivo?.cuotasVencidas ??
      prestamo?.cuotaObjetivo?.cuotasVencidas ??
      0,
    ),
    saldoTotal: Number(
      o.saldoTotal ??
      o.saldoPendiente ??
      prestamo?.saldoTotal ??
      prestamo?.saldoPendiente ??
      0,
    ),
    estado: estadoVisual,
    estadoGestion,
    estadoVisita: o.estadoVisita || prestamo?.estadoVisita || undefined,
    notasVisita: o.notasVisita || prestamo?.notasVisita || undefined,
    proximaVisita:
      resolveFechaEfectivaCuota(cuotaObjetivo) ||
      cuotaObjetivo?.fechaVencimientoProrroga ||
      cuotaObjetivo?.fechaVencimiento ||
      prestamo?.proximaCuota?.fechaVencimientoProrroga ||
      prestamo?.proximaCuota?.fechaVencimiento ||
      o.proximaVisita ||
      o.fechaVisita ||
      hoyKey,
    ordenVisita: Number(o.ordenVisita || idx + 1),
    prioridad: estaEnMora ? 'alta' : o.prioridad || 'media',
    nivelRiesgo: mapNivelRiesgo(o.nivelRiesgo || clienteObj?.nivelRiesgo),
    cobradorId: rutaCobradorId,
    periodoRuta: normalizePeriodoRuta(frecuenciaPago) as PeriodoRuta,
    clienteId: o.clienteId || clienteObj?.id || '',
    prestamoId: o.prestamoId || prestamo?.id || '',
    cuotaId,
    cuotaObjetivoId: cuotaId,
    cuotaObjetivoPrestamoId: cuotaId,
    cuotaObjetivo,
    proximaCuota: prestamo?.proximaCuota,
    diasMora,
  } as any
}


/**


 * UserSession es la información del usuario que se almacena en el contexto de la aplicación.


 */


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


  const { socket } = useNotificaciones()


  const [userSession, setUserSession] = useState<UserSession | null>(null)


  const [visitaSeleccionada, setVisitaSeleccionada] = useState<string | null>(null)


  const [showPaymentModal, setShowPaymentModal] = useState(false)


  const [pagoInitialIsAbono, setPagoInitialIsAbono] = useState(false)

  const [showRutaProvisional, setShowRutaProvisional] = useState(false)


  const [visitaPagoSeleccionadaId, setVisitaPagoSeleccionadaId] = useState<string | null>(null)
  const [visitaPagoRegularizada, setVisitaPagoRegularizada] = useState<VisitaRuta | null>(null)


  


  const [showClienteInfoModal, setShowClienteInfoModal] = useState(false)


  const [visitaClienteSeleccionada, setVisitaClienteSeleccionada] = useState<VisitaRuta | null>(null)

  const [nextPagoFecha, setNextPagoFecha] = useState<string | null>(null)
  const [nextPagoMonto, setNextPagoMonto] = useState<number | null>(null)


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

  const {
    cierrePendiente,
    hasCierrePendiente,
    loading: loadingCierrePendiente,
    refreshCierrePendiente,
  } = useCierrePendienteRuta(rutaId)

  const [showDetalleCierre, setShowDetalleCierre] = useState(false)
  const {
    detalle,
    loading: loadingDetalleCierre,
    cargarDetalle,
  } = useCierrePendienteDetalle(rutaId)

  const [showCierrePendienteModal, setShowCierrePendienteModal] = useState(false)


  


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


  const [historyViewMode, setHistoryViewMode] = useState<'DAYS' | 'MONTHS'>('DAYS')
  const [historialRefreshKey, setHistorialRefreshKey] = useState(0)
  const [periodoRutaFiltro, setPeriodoRutaFiltro] = useState<PeriodoRuta | 'TODOS'>('TODOS')
  const refreshHistorialOperativo = useCallback(() => { setHistorialRefreshKey((prev) => prev + 1) }, [])
  const [showMisClientes, setShowMisClientes] = useState(false)

 
  


  const [misCreditos, setMisCreditos] = useState<VisitaRuta[]>([])


  const [loadingMisCreditos, setLoadingMisCreditos] = useState(false)


  


  const [gruposColapsados, setGruposColapsados] = useState<Record<string, boolean>>({})


  const toggleGrupo = useCallback(


    (key: string) => setGruposColapsados((prev) => ({ ...prev, [key]: !prev[key] })),


    [],


  )


  


  // Selector de cliente para acciones globales


  const [showClientSelector, setShowClientSelector] = useState(false)


  const [pendingAction, setPendingAction] = useState<'CUENTA' | 'AGENDAR' | 'PAGO' | 'ABONO' | null>(null)


  


  const [showConfirmCompleteModal, setShowConfirmCompleteModal] = useState(false)
  const [showDoubleConfirmComplete, setShowDoubleConfirmComplete] = useState(false)


  const [rutaCompletada, setRutaCompletada] = useState(false)


  const [rutaActivadaHoy, setRutaActivadaHoy] = useState(false)
  const [isCheckingActivacion, setIsCheckingActivacion] = useState(true)


  const esDiaNoLaboral = esDomingoBogota()
  const rutaOperable = rutaActivadaHoy && !rutaCompletada && !esDiaNoLaboral


  const [coordinadorToast, setCoordinadorToast] = useState<string | null>(null)


  


  const [modalAlerta, setModalAlerta] = useState<{titulo: string, mensaje: string, tipo: 'exito' | 'error' | 'info'} | null>(null)


  const [isLoading, setIsLoading] = useState(true)


  


  // El supervisor puede gestionar pagos en CUALQUIER ruta (propia o de un cobrador)


  // isPersonal solo controla si puede reordenar la lista (drag & drop)


  const isPersonal = rutaId === 'RT-SUP' || rutaId === 'SUP-001' || !rutaId


  const isReadOnly = false  // El supervisor/admin siempre puede registrar pagos


  const [periodoCards, setPeriodoCards] = useState<'HOY' | 'SEM' | 'MES' | 'AÑO'>('HOY')


  const [rutaStats, setRutaStats] = useState<{
    recaudo: number
    meta: number
    eficiencia: number
    gastos: number
    gastosProvisionales: number
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
    gastosProvisionales: 0,
    base: 0,
    pendientes: 0,
    clientes: 0,
    avance: 0,
    nivelRiesgo: 'PELIGRO_MINIMO',
    porcentajeMora: 0
  })



  const getDatesByPeriod = (period: 'HOY' | 'SEM' | 'MES' | 'AÑO') => {
    return getBogotaRangeByPeriod(period)
  };

  const cargarEstadisticasRuta = useCallback(async () => {
    if (!rutaId) return {} as Record<string, number>

    const { inicio: cardInicio, fin: cardFin } = getDatesByPeriod(periodoCards)

    try {
      // Si el usuario es SUPERVISOR, usar su caja propia en lugar de la caja de ruta
      const esSupervisor = userSession?.rol === RolUsuario.SUPERVISOR
      const saldo: any = esSupervisor && userSession?.id
        ? await obtenerSaldoCajaSupervisor(userSession.id, undefined, cardInicio, cardFin)
        : await obtenerSaldoDisponibleRuta(rutaId as string, undefined, cardInicio, cardFin)

      const recaudoBackend = Number(saldo?.cobranzaDelDia ?? saldo?.recaudoDelDia ?? 0)

      setRutaStats((prev: any) => {
        if (periodoCards === 'HOY') {
          const recaudo = Number(
            saldo?.cobranzaDelDia ??
            saldo?.recaudoDelDia ??
            prev.recaudo ??
            0,
          )
          const meta = Number(prev.meta ?? 0)
          return {
            ...prev,
            recaudo,
            eficiencia: meta > 0 ? Number(((recaudo / meta) * 100).toFixed(1)) : prev.eficiencia,
            pendiente: Math.max(0, meta - recaudo),
            pendientes: Math.max(0, meta - recaudo),
            gastos: Number(saldo?.gastosDelDia ?? prev.gastos ?? 0),
            gastosProvisionales: Number((saldo as any)?.egresosProvisionales ?? prev.gastosProvisionales ?? 0),
            base: Number(saldo?.saldoCaja ?? saldo?.baseEfectivo ?? prev.base ?? 0),
          }
        }
        // Lógica original para SEM / MES / AÑO
        const isAusente = shouldExcludeVisitaFromOperationalMeta
        const visitasActuales = visitasBaseRef.current
        const hasVisitasActuales = Array.isArray(visitasActuales) && visitasActuales.length > 0
        const visitasParaMeta = Array.isArray(visitasActuales)
          ? visitasActuales.filter((v: any) => !isAusente(v))
          : []
        const statsHoy = computeRutaHoyUiStatsFromVisitas(visitasParaMeta, 0)
        const statsAutoritativas = {
          meta: Number(statsHoy.meta || 0),
          recaudo: recaudoBackend > 0 ? recaudoBackend : Number(prev.recaudo ?? 0),
          eficiencia: Number(prev.eficiencia ?? 0),
          pendiente: Number(prev.pendiente ?? 0),
        }
        const eficiencia = statsAutoritativas.meta > 0
          ? Number(((statsAutoritativas.recaudo / statsAutoritativas.meta) * 100).toFixed(1))
          : Number(prev.eficiencia ?? 0)
        const shouldUpdateOperationalKpis =
          hasVisitasActuales ||
          recaudoBackend > 0 ||
          Number(prev.meta ?? 0) > 0 ||
          Number(prev.recaudo ?? 0) > 0
        return {
          ...prev,
          recaudo: shouldUpdateOperationalKpis ? statsAutoritativas.recaudo : prev.recaudo,
          meta: shouldUpdateOperationalKpis ? statsAutoritativas.meta : prev.meta,
          eficiencia: shouldUpdateOperationalKpis ? eficiencia : prev.eficiencia,
          pendiente: shouldUpdateOperationalKpis ? statsAutoritativas.pendiente : prev.pendiente,
          gastos: Number(saldo?.gastosDelDia ?? prev.gastos ?? 0),
          gastosProvisionales: Number((saldo as any)?.egresosProvisionales ?? prev.gastosProvisionales ?? 0),
          base: Number(saldo?.saldoCaja ?? saldo?.baseEfectivo ?? prev.base ?? 0),
        }
      })

      return (saldo?.recaudosPorReferencia || {}) as Record<string, number>
    } catch (e) {
      return {} as Record<string, number>
    }
  }, [rutaId, periodoCards, userSession?.id, userSession?.rol])



  const router = useRouter();


  const [rutaInfo, setRutaInfo] = useState<{ id: string; cobradorId: string; nombre?: string; cobradorNombre?: string } | null>(null);

  const mapDailyVisitsResponseToVisitas = useCallback((resp: any, cobradorId: string): VisitaRuta[] => {
    return mapDailyVisitsResponseToVisitasShared({
      resp,
      hoyBogotaKey,
      rutaData: { cobradorId },
      initialRuta: { cobradorId },
      modo: 'LIVE' as MapMode,
      fechaOperativa: hoyBogotaKey,
    })
  }, [hoyBogotaKey])



  const cargarMisCreditos = useCallback(async () => {
    const cobradorId = rutaInfo?.cobradorId
    if (!cobradorId || !rutaId) return

    try {
      setLoadingMisCreditos(true)

      // Usar buildRutaHoyOperativa para consistencia con otros roles
      const ruta = await rutasService.obtenerRutaPorId(rutaId as string)
      const visitasResp = await rutasService.obtenerVisitasDelDia(
        rutaId as string,
        hoyBogotaKey,
      )
      const pagosResp = await pagosService.obtenerPagos({ limit: 5000 })
      const pagos = (pagosResp as any)?.pagos || pagosResp || []

      const result = await buildRutaHoyOperativa({
        ruta,
        dailyVisits: visitasResp,
        hoyBogotaKey,
        cobradorId,
        pagos,
      })

      setMisCreditos(result.kpiItems as any)
    } catch (e: any) {
      console.error('Error cargando mis clientes:', e)
    } finally {
      setLoadingMisCreditos(false)
    }
  }, [rutaInfo?.cobradorId, rutaId, hoyBogotaKey])



  useEffect(() => {

    if (!showMisClientes) return

    cargarMisCreditos()

  }, [showMisClientes, cargarMisCreditos])




  // Datos base

  const [visitasBase, setVisitasBase] = useState<VisitaRuta[]>([])
  const visitasBaseRef = useRef<any[]>([])
  
  // Helper: actualiza estado Y ref sincrónicamente para evitar que lecturas
  // inmediatas de visitasBaseRef.current vean datos obsoletos (race condition
  // entre setVisitasBase → useEffect → ref cuando la siguiente fn lee el ref
  // antes de que React re-renderice).
  const setVisitasBaseAndRef = useCallback((next: any[] | ((prev: any[]) => any[])) => {
    if (typeof next === 'function') {
      setVisitasBase((prev: any) => {
        const result = next(prev)
        visitasBaseRef.current = Array.isArray(result) ? result : []
        return result
      })
    } else {
      visitasBaseRef.current = Array.isArray(next) ? next : []
      setVisitasBase(next)
    }
  }, [])

  // BUG-09 FIX: Map<string, number> con timestamp para evitar locks indefinidos.
  const pagosInFlightRef = useRef<Map<string, number>>(new Map())
  const visitasRutaHoyKpiRef = useRef<any[]>([])



  const [visitasOrden, setVisitasOrden] = useState<string[]>([])



  const [historialRutas, setHistorialRutas] = useState<any>({});
  // WebSocket useEffect queda declarado DESPUÉS de cargarVisitasRuta (ver abajo)



  // ---------------------------------------------------------------------------

  // cargarVisitasRuta – carga y enriquece la lista de visitas desde el backend.

  // Es un useCallback estable para poder ser invocado tanto desde el useEffect

  // de montaje como desde el handler del WebSocket (tiempo real).

  // ---------------------------------------------------------------------------
  const cargarVisitasRuta = useCallback(async (recaudosMapExterno?: Record<string, number>) => {
    if (!rutaId) return;

    try {
      const ruta = await rutasService.obtenerRutaPorId(rutaId);
      let cobradorNombre = '';

      if ((ruta as any).cobrador) {
        cobradorNombre = `${(ruta as any).cobrador.nombres || ''} ${(ruta as any).cobrador.apellidos || ''}`.trim();
      } else if (ruta.cobradorId) {
        try {
          const { usuariosService } = await import('@/services/usuarios-service');
          const usr = await usuariosService.obtenerPorId(ruta.cobradorId);
          if (usr) cobradorNombre = `${usr.nombres || ''} ${usr.apellidos || ''}`.trim();
        } catch (e) {
          console.warn('No se pudo obtener el nombre del cobrador asignado:', e);
        }
      }
      setRutaInfo({ id: ruta.id, cobradorId: ruta.cobradorId, nombre: ruta.nombre, cobradorNombre });

      if (ruta) {
        const hoyKey = getBogotaDateKey(new Date())

        const getCuotasByPrestamoId = memoizePromiseByKey(
          (prestamoId) => prestamosService.obtenerCuotas(prestamoId) as Promise<any[]>,
          () => [],
        )

        let visitasRaw: any[] = []
        let dailyVisitsData: any = null
        let pagosRecientes: any[] = []
        let helperResult: any = null

        try {
          const visitasDia = await rutasService.obtenerVisitasDelDia(ruta.id, hoyKey)
          dailyVisitsData = visitasDia

          // Usar helper compartido para construir fuente completa de KPI
          const pagosRecientesResp = await pagosService.obtenerPagos({ limit: 5000 })
          pagosRecientes = (pagosRecientesResp as any)?.pagos || pagosRecientesResp || []

          helperResult = await buildRutaHoyOperativa({
            ruta,
            dailyVisits: visitasDia,
            hoyBogotaKey,
            cobradorId: ruta.cobradorId,
            pagos: pagosRecientes,
          })

          // Aplicar lógica específica de SupervisorCobroView (prorrogas, targetVencimiento, etc.)
          const visitasConLogicaSupervisor = await mapWithConcurrency(
            helperResult.kpiItems,
            async (v: any) => {
              if (!v.prestamoId || !v.cuotaObjetivo) return v

              const pendiente = v.cuotaObjetivo
              const hoyBogota = hoyBogotaKey

              const getCuotaVtoKey = (c: any): string => {
                if (!c) return ''
                const raw = resolveFechaEfectivaCuota(c) || c?.fechaVencimiento
                if (!raw) return ''
                return normalizeDateKey(String(raw))
              }

              const cuotasExigibles = (await getCuotasByPrestamoId(v.prestamoId)).filter((c: any) => {
                if (!isCuotaNoPagada(c)) return false
                const vtoKey = getCuotaVtoKey(c)
                return vtoKey && vtoKey <= hoyBogota
              })

              const cuotaMasAntigua = cuotasExigibles.reduce((acc: any, c: any) => {
                const vtoKey = getCuotaVtoKey(c)
                if (!vtoKey) return acc
                if (!acc) return { c, vtoKey }
                return vtoKey < acc.vtoKey ? { c, vtoKey } : acc
              }, null as null | { c: any; vtoKey: string })

              return {
                ...v,
                enProrroga: pendiente.estado === 'PRORROGADA' || !!pendiente.fechaVencimientoProrroga,
                fechaProrroga: pendiente.fechaVencimientoProrroga || undefined,
                fechaOriginalVencimiento: pendiente.fechaVencimiento || undefined,
                targetVencimiento: cuotaMasAntigua?.c ? ((String(cuotaMasAntigua.c?.estado || '').toUpperCase() === 'PRORROGADA' && cuotaMasAntigua.c?.fechaVencimientoProrroga)
                  ? cuotaMasAntigua.c.fechaVencimientoProrroga
                  : cuotaMasAntigua.c.fechaVencimiento) : v.targetVencimiento,
              }
            },
            6,
          )

          visitasRaw = visitasConLogicaSupervisor
        } catch (dailyError) {
          console.warn('No se pudo cargar agenda diaria de supervisor, usando detalle de ruta:', dailyError)
          visitasRaw = mapAsignacionesToVisitasLite({
            asignaciones: (ruta as any).asignaciones || (ruta as any).asignacionesRuta || [],
            hoyKey,
            cobradorId: ruta.cobradorId,
            filtrarExigibles: false,
          }) as any[]
        }

        const { totalHistoricoByPrestamoId, ultimoPagoDateByPrestamoId } = indexPagosByPrestamoId(pagosRecientes as any)

        let finales = visitasRaw.map((v: any) => {
          const pid = v?.prestamoId
          if (!pid) return v
          return {
            ...v,
            recaudadoTotalClient: Number(totalHistoricoByPrestamoId[pid] || 0),
            fechaUltimoPago: Number(ultimoPagoDateByPrestamoId[pid] || 0),
          }
        })

        finales = ordenarVisitasRutaActual(finales)

        const hoyBogotaPrincipal = hoyBogotaKey;

        // Usar directamente los resultados del helper: kpiItems para KPI, visibleItems para tarjetas
        const visitasBaseParaKpi = helperResult?.kpiItems || []
        const visitasVisibles = helperResult?.visibleItems || []

        // Guardar kpiItems para usar en el historial de hoy
        visitasRutaHoyKpiRef.current = visitasBaseParaKpi

        const prevByKey = new Map(
          (visitasBaseRef.current || []).map((v: any) => [
            String(v?.prestamoId || v?.clienteId || v?.id || ''),
            v,
          ]),
        )

        const merged = visitasVisibles.map((v: any) => {
          const key = String(v?.prestamoId || v?.clienteId || v?.id || '')
          const prev = prevByKey.get(key)

          return {
            ...v,
            recaudadoDelDia: Math.max(
              Number(v?.recaudadoDelDia || 0),
              Number(prev?.recaudadoDelDia || 0),
            ),
            recaudadoTotalClient: Math.max(
              Number(v?.recaudadoTotalClient || 0),
              Number(prev?.recaudadoTotalClient || 0),
            ),
            fechaUltimoPago: Number(v?.fechaUltimoPago || prev?.fechaUltimoPago || 0),
          }
        })

        setRutaStats((prev: any) => {
          if (periodoCards === 'HOY') {
            const statsHoy = computeRutaHoyUiStatsFromVisitas(visitasBaseParaKpi as any[], 0)
            const recaudo = Number(statsHoy.recaudo || prev.recaudo || 0)
            return {
              ...prev,
              recaudo,
              meta: statsHoy.meta,
              eficiencia:
                statsHoy.meta > 0
                  ? Number(((recaudo / statsHoy.meta) * 100).toFixed(1))
                  : recaudo > 0
                    ? 100
                    : 0,
              pendiente: Math.max(0, statsHoy.meta - recaudo),
              pendientes: Math.max(0, statsHoy.meta - recaudo),
              clientes: visitasVisibles.length,
            }
          }

          const isAusente = shouldExcludeVisitaFromOperationalMeta
          const finalesSinAusentes = (merged || []).filter((v: any) => !isAusente(v))
          const statsHoy = computeRutaHoyUiStatsFromVisitas(finalesSinAusentes as any[], 0)
          const rutaStatsBackend = (ruta as any)?.estadisticas || {}
          const recaudoBackendHoy = Math.max(
            Number((ruta as any)?.cobranzaDelDia || 0),
            Number(rutaStatsBackend?.cobranzaDelDia || 0),
          )
          const metaBackendHoy = Math.max(
            Number((ruta as any)?.metaDelDia || 0),
            Number(rutaStatsBackend?.metaDelDia || 0),
          )
          const stats = resolveRutaHoyKpiStats(
            statsHoy,
            {
              recaudo: recaudoBackendHoy,
              meta: metaBackendHoy,
              eficiencia: rutaStatsBackend?.avanceDiario,
            },
            { preferUi: Array.isArray(merged) },
          )
          return {
            ...prev,
            meta: stats.meta,
            recaudo: stats.recaudo,
            eficiencia: stats.eficiencia,
            pendiente: stats.pendiente,
          }
        });

        // Sync ref ANTES de que cargarEstadisticasRuta lo lea (evita stale ref)
        setVisitasBaseAndRef(merged as any[])
        setVisitasOrden((merged as any[]).map((v: any) => v.id));
      }
    } catch (error) {
      console.error('Error al cargar visitas de ruta (supervisor):', error);
    }
  }, [rutaId, hoyBogotaKey, periodoCards, cargarEstadisticasRuta]);



  // ---------------------------------------------------------------------------

  // WebSocket: suscripción a eventos en tiempo real via useRealtimeData.

  // ---------------------------------------------------------------------------



  // Handler completo: recarga visitas/cuotas al registrar pagos o nuevos préstamos

  const handlerFull = useCallback(async (payload?: any) => {
    const prestamoId = payload?.prestamoId || payload?.metadata?.prestamoId;
    const clienteId = payload?.clienteId || payload?.metadata?.clienteId;

    // BUG-09 FIX: el lock caduca si tiene más de 3s — evita bloquear WS updates por locks antiguos.
    const inFlightTs = prestamoId ? pagosInFlightRef.current.get(String(prestamoId)) : undefined;
    if (inFlightTs !== undefined && Date.now() - inFlightTs < 3000) {
      return
    }
    if (prestamoId && inFlightTs !== undefined) pagosInFlightRef.current.delete(String(prestamoId))

    // Manejo focalizado de visitas registradas (ausente, etc.)
    const accionVisita = payload?.accion || payload?.metadata?.accion;
    const clienteIdVisita = payload?.clienteId || payload?.metadata?.clienteId;
    const estadoVisitaPayload = payload?.estadoVisita || payload?.metadata?.estadoVisita;
    const notasVisitaPayload = payload?.notasVisita || payload?.notas || payload?.metadata?.notasVisita || payload?.metadata?.notas;

    if (accionVisita === 'VISITA_REGISTRADA' && clienteIdVisita && estadoVisitaPayload) {
      refreshHistorialOperativo()
      await cargarVisitasRuta()
      return
    }

    refreshHistorialOperativo()

    await cargarVisitasRuta();

    if (showMisClientes) await cargarMisCreditos();

  }, [cargarVisitasRuta, showMisClientes, cargarMisCreditos, hoyBogotaKey, periodoCards, refreshHistorialOperativo])

  const handlerKpi = useCallback(() => {

    cargarEstadisticasRuta();

    if (showMisClientes) cargarMisCreditos();

  }, [cargarEstadisticasRuta, showMisClientes, cargarMisCreditos])



  useRealtimeData(
    [
      'pagos_actualizados',
      'prestamos_actualizados',
      'rutas_actualizadas',
      'jornadas_actualizadas',
    ],
    handlerFull,
  )

  useRealtimeData(['dashboards_actualizados'], handlerKpi)



  // Cargar datos del usuario y ruta (sesión + KPIs + visitas)

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
          try {
            const perfil = await obtenerPerfil();
            localStorage.setItem('user', JSON.stringify(perfil));
            setUserSession(perfil as unknown as UserSession);
          } catch (e: any) {
            if (e?.statusCode === 401) router.replace('/login');
          }
        }



        if (rutaId) {
          // La meta operativa depende de visitas/cuotas enriquecidas. Cargar visitas
          // primero evita que una respuesta temprana de caja pise KPIs con ceros.
          await cargarVisitasRuta();

          // Luego actualizar caja/base/gastos sin reemplazar KPIs operativas válidas.
          await cargarEstadisticasRuta();
        }
      } catch (error) {
        console.error('Error al cargar datos de supervisor:', error);
      } finally {
        setIsLoading(false);
      }
    };

    cargarDatos();
  }, [router, rutaId, periodoCards, cargarVisitasRuta, cargarEstadisticasRuta]);



  // BUG-11 FIX: Este useEffect duplicaba la carga de estadísticas que ya hace el useEffect
  // de cargarDatos (línea ~1253) al montar. Eliminado para evitar doble fetch y parpadeo en KPIs.
  // cargarEstadisticasRuta se invoca cuando cambia periodoCards o cuando el WebSocket lo dispara.





  const sensors = useSensors(

    useSensor(SafePointerSensor, {

      activationConstraint: {

        distance: 8,

      },

    }),

    useSensor(KeyboardSensor, {

      coordinateGetter: sortableKeyboardCoordinates,

    }),

  )



  





  // Filtrar y ordenar visitas

  const visitasCobrador = useMemo(() => {

    const searched = (visitasBase || []).filter(v =>
      v.cliente.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.direccion.toLowerCase().includes(searchQuery.toLowerCase())
    )


    const filtered = searched.filter((v: any) => {
      return shouldShowVisitaEnRutaHoy(v, hoyBogotaKey)
    })



    const sorted = ordenarVisitasRutaActual(filtered)



    return sorted

  }, [visitasBase, searchQuery, hoyBogotaKey])



  const handleDragStart = useCallback((event: DragStartEvent) => {

    if (!rutaOperable) return

    setActiveId(event.active.id as string)

  }, [rutaOperable])



  const handleGuardarReprogramacion = useCallback(async (fecha: string, motivo: string, cuotaId?: string) => {

    if (!visitaReprogramar) return

    if (!fecha || !motivo) return

    const cuotaIdFinal = String(
      cuotaId || 
      (visitaReprogramar as any)?.cuotaId || 
      (visitaReprogramar as any)?.cuotaObjetivoId || 
      (visitaReprogramar as any)?.cuotaObjetivo?.id || 
      (visitaReprogramar as any)?.proximaCuota?.id || 
      ''
    ).trim();

    console.log('[REPROGRAMACION DEBUG]', {
      prestamoId: visitaReprogramar.prestamoId,
      clienteId: visitaReprogramar.clienteId,
      cuotaId,
      cuotaIdFinal,
      fecha,
      motivo,
    })

    try {

      // Enviar solicitud al backend — queda pendiente de aprobación del supervisor/admin o se autoaprueba

      if (visitaReprogramar.prestamoId) {
        if (!cuotaIdFinal) {
          setModalAlerta({
            tipo: 'error',
            titulo: 'Error al solicitar',
            mensaje: 'No se pudo identificar la cuota a reprogramar.',
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

        await prestamosService.solicitarReprogramacionCuota({
          prestamoId: visitaReprogramar.prestamoId,
          cuotaId: cuotaIdFinal,
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
                  cuotaId: cuotaIdFinal,
                  nuevaFecha: fecha,
                })
              : undefined,
        })

      }



      // Marcar localmente como reprogramado (UI feedback)
      const fechaLabel = (() => {
        const [, mm, dd] = fecha.split('-')
        return dd && mm ? `${dd}/${mm}` : fecha
      })()

      setVisitasBaseAndRef((prev: any[]) =>
        prev.map((v: any) => {
          if (v.id !== visitaReprogramar.id) return v
          return {
            ...v,
            estado: 'reprogramado',
            estadoVisita: 'reprogramado',
            proximaVisita: fecha,
            cuotaObjetivo: {
              ...(v as any).cuotaObjetivo,
              fechaVencimiento: fecha,
              fechaEfectiva: fecha,
            },
            proximaCuota: {
              ...(v as any).proximaCuota,
              fechaVencimiento: fecha,
              fechaEfectiva: fecha,
            },
          }
        })
      )

      refreshHistorialOperativo()

      try {
        await cargarVisitasRuta()
        await cargarEstadisticasRuta()
        if (showMisClientes) await cargarMisCreditos()
      } catch {}

      toast.success('Solicitud de reprogramación enviada exitosamente', {
        description: `La cuota será revisada para reprogramarse al ${fechaLabel}`
      })

      setShowReprogramModal(false)
      setVisitaReprogramar(null)
      clearRegularizacionContext()

    } catch (err: any) {
      const message =
        err?.response?.data?.message ??
        err?.data?.message ??
        err?.message ??
        'No se pudo enviar la solicitud de reprogramación.'

      console.error('Error reprogramando cuota (supervisor):', {
        message,
        error: err,
        response: err?.response,
        data: err?.response?.data || err?.data,
      })

      setModalAlerta({
        tipo: 'error',
        titulo: 'Error al solicitar',
        mensaje: Array.isArray(message) ? message[0] : message,
      })
    }

  }, [
    visitaReprogramar,
    clearRegularizacionContext,
    hoyBogotaKey,
    cargarVisitasRuta,
    cargarEstadisticasRuta,
    showMisClientes,
    cargarMisCreditos,
    setVisitasBaseAndRef,
    refreshHistorialOperativo,
  ])



  const handleDragEnd = useCallback(() => {
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

  useEffect(() => {

    let cancelled = false

    const rutaIdToCheck = (rutaInfo as any)?.id || rutaId

    if (!rutaIdToCheck) return



    ;(async () => {

      try {

        const resp = await getRutaCierreHoy(rutaIdToCheck)

        if (cancelled) return

        if (resp?.cerradaHoy) setRutaCompletada(true)

      } catch {

        // ignore

      }

    })()



    return () => {

      cancelled = true

    }

  }, [rutaId, (rutaInfo as any)?.id])



  const refreshActivacionHoy = useCallback(async () => {
    const rutaIdToCheck = (rutaInfo as any)?.id || rutaId
    if (!rutaIdToCheck) return

    try {
      const resp = await routesApi.getActivacionHoy(rutaIdToCheck)
      setRutaActivadaHoy(Boolean(resp?.operableHoy ?? resp?.activadaHoy))
    } catch {
      // ignore
    } finally {
      setIsCheckingActivacion(false)
    }
  }, [rutaId, (rutaInfo as any)?.id])

  useEffect(() => {
    void refreshActivacionHoy()
  }, [refreshActivacionHoy])

  useRealtimeData(
    ['rutas_actualizadas', 'jornadas_actualizadas'],
    refreshActivacionHoy,
  )

  const handleDragCancel = useCallback(() => {

    setActiveId(null)

  }, [])



  const getEstadoClasses = useCallback((estado: EstadoVisita) => {

    if (estado === 'pendiente') return 'bg-orange-50 text-orange-700 border-orange-100'

    if (estado === 'pagado') return 'bg-blue-50 text-blue-700 border-blue-100'

    if (estado === 'en_mora') return 'bg-rose-50 text-rose-700 border-rose-500/30'

    if (estado === 'ausente') return 'bg-amber-50 text-amber-700 border-amber-200'

    return 'bg-blue-50 text-blue-700 border-blue-100'

  }, [])



  const getPrioridadColor = useCallback((prioridad: 'alta' | 'media' | 'baja') => {

    if (prioridad === 'alta') return '#f97316'

    if (prioridad === 'media') return '#08557f'

    return '#94a3b8'

  }, [])



  const handleRegistrarPago = useCallback(async (
    visitaId: string,
    montoPagado: number,
    metodo: 'EFECTIVO' | 'TRANSFERENCIA',
    comprobante: File | null,
    esAbono: boolean,
    contexto?: { tipoRegistro: 'PAGO' | 'ABONO'; cuotaNumeroEsperada?: number; montoCuotaEsperado: number; cuotaId?: string },
  ) => {

    const contextoRegularizacionSnapshot = contextoRegularizacionRef.current as any
    const esCierrePendiente =
      contextoRegularizacionSnapshot?.origenGestion === 'CIERRE_PENDIENTE'
    const visita = visitaPagoRegularizada || visitasBase.find(v => v.id === visitaId)

    if (!visita?.prestamoId || !visita?.clienteId) {

      toast.error('No se pudo registrar el pago: visita inválida')

      return

    }

    if (!userSession?.id) {

      toast.error('No se pudo registrar el pago: sesión inválida')

      return

    }

    const rutaIdFinal = esCierrePendiente
      ? contextoRegularizacionSnapshot?.rutaId
      : (rutaInfo?.id || rutaId);

    if (!rutaIdFinal) {
      toast.error('No se pudo registrar el pago: falta la ruta operativa.');
      return;
    }

    const esSupervisor = userSession?.rol === RolUsuario.SUPERVISOR;

    if (esSupervisor && !rutaInfo?.cobradorId) {
      toast.error('No se pudo registrar el pago: falta el cobrador responsable de la ruta.');
      return;
    }

    const cobradorResponsableId = resolveCobradorIdForRouteAction(
      rutaInfo?.cobradorId,
      userSession.id,
    );

    try {

      setIsLoading(true)

      pagosInFlightRef.current.set(String(visita.prestamoId), Date.now())

      const prestamoIdFinal = esCierrePendiente
        ? contextoRegularizacionSnapshot?.prestamoId
        : visita.prestamoId
      const cuotaIdFinal = esCierrePendiente
        ? contextoRegularizacionSnapshot?.cuotaId
        : contexto?.cuotaId
      const cuotaNumeroFinal = esCierrePendiente
        ? contextoRegularizacionSnapshot?.cuotaNumeroEsperada
        : contexto?.cuotaNumeroEsperada
      const montoCuotaEsperadoFinal = esCierrePendiente
        ? contextoRegularizacionSnapshot?.montoCuotaEsperado
        : contexto?.montoCuotaEsperado

      await pagosService.registrarPago({

        prestamoId: prestamoIdFinal,

        clienteId: visita.clienteId,

        montoTotal: montoPagado,

        metodoPago: metodo as MetodoPago,

        comprobante,

        cobradorId: cobradorResponsableId,

        tipoRegistro: contexto?.tipoRegistro || (esAbono ? 'ABONO' : 'PAGO'),

        rutaId: rutaIdFinal,

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
              visita.clienteId,
              prestamoIdFinal,
              cuotaIdFinal ?? 'SIN_CUOTA_ID',
              cuotaNumeroFinal ?? 'SIN_CUOTA',
              contexto?.tipoRegistro || (esAbono ? 'ABONO' : 'PAGO'),
              Number(montoPagado || 0),
            ].join(':')
          : undefined,

      })



      // Marcar como pagado si completó la cuota del período (para que desaparezca del diario)

      const montoCuotaPrev = Number(visita.montoCuota || 0)
      const recPrev = Number((visita as any).recaudadoDelDia || 0)
      const recNuevo = recPrev + Number(montoPagado || 0)
      const cuotaCompletadaLocal = montoCuotaPrev > 0 && recNuevo >= (montoCuotaPrev - 1)

      const clienteIdPago = visita.clienteId

      if (!esCierrePendiente) {
        setVisitasBaseAndRef((prev: any[]) => prev.map((v: any) => {
          if (v.clienteId !== clienteIdPago) return v

          const esVisitaPagada = v.id === visitaId

          const recPrevVisita = Number(v.recaudadoDelDia || 0)
          const recNuevoVisita = esVisitaPagada
            ? recPrevVisita + Number(montoPagado || 0)
            : recPrevVisita

          const estabaAusente =
            String(v?.estadoVisita || '').toLowerCase() === 'ausente' ||
            String(v?.estado || '').toLowerCase() === 'ausente'

          const estadoSinAusente =
            estabaAusente
              ? (
                  Number(v?.diasMora || 0) > 0 || Boolean(v?.enMoraHistorico)
                    ? 'en_mora'
                    : 'pendiente'
                )
              : v.estado

          const cuota = Number(v.montoCuota || 0)
          const cuotaCompletada = esVisitaPagada && cuota > 0 && recNuevoVisita >= cuota - 1
          const montoCuotaPendiente = esVisitaPagada
            ? computeMontoCuotaPendienteDespuesDeRecaudo(v as any, recNuevoVisita)
            : (v as any)?.montoCuotaPendiente

          return {
            ...v,
            recaudadoDelDia: recNuevoVisita,
            montoCuotaPendiente,
            estado: cuotaCompletada ? 'pagado' : estadoSinAusente,
            estadoVisita: undefined as any,
            notasVisita: undefined as any,
          }
        }))
      }



      toast.success('Pago registrado')

      refreshHistorialOperativo()

      // Reconciliar una sola vez contra backend (y mantener lock durante la reconciliación)
      try {
        await cargarVisitasRuta()
        await cargarEstadisticasRuta()
        if (showMisClientes) await cargarMisCreditos()
      } catch {}

      setShowPaymentModal(false)

    } catch (e) {

      console.error('Error registrando pago (SupervisorCobroView):', e)
      const error = e as any
      const isConflict = error?.isConflict || error?.statusCode === 409 || error?.error?.statusCode === 409
      const mensaje = error?.message || error?.error?.message || 'No se pudo registrar el pago'

      if (isConflict) {
        try {
          await cargarVisitasRuta()
          await cargarEstadisticasRuta()
          if (showMisClientes) await cargarMisCreditos()
        } catch {}
      }

      toast.error(mensaje)

    } finally {

      if (visita?.prestamoId) {
        pagosInFlightRef.current.delete(String(visita.prestamoId))
      }

      clearRegularizacionContext()
      setVisitaPagoRegularizada(null)
      setIsLoading(false)

    }

  }, [
    visitasBase,
    visitaPagoRegularizada,
    userSession?.id,
    userSession?.rol,
    pagoInitialIsAbono,
    rutaInfo?.id,
    rutaInfo?.cobradorId,
    rutaId,
    cargarVisitasRuta,
    showMisClientes,
    cargarMisCreditos,
    cargarEstadisticasRuta,
    clearRegularizacionContext,
    setVisitasBaseAndRef,
    refreshHistorialOperativo,
  ])

  const handleCrearCredito = useCallback(async (data: any) => {

    try {

      setIsLoading(true)

      const esContado = Boolean((data as any).ventaContado)
      const isArticulo = data.creditType === 'articulo'
      const payload = buildCrearPrestamoPayload(data, userSession?.id)

      const prestamo = await prestamosService.crearPrestamo(payload)



      if (isArticulo && prestamo?.id && !esContado) {

        try {

          await exportService.exportContrato(prestamo.id)

        } catch (err) {

          console.error('Error al descargar contrato:', err)

        }

      }

      

      // Asignar cliente a la ruta automáticamente si estamos en una ruta específica

      if (rutaId) {

        try {

          await rutasService.asignarCliente(

            rutaId,

            data.clienteCreditoId,

            rutaInfo?.cobradorId || ''

          );

        } catch (assignError) {

          console.error('Error al asignar cliente a la ruta:', assignError);

        }

      }



      setModalAlerta({

        titulo: 'Crédito Creado',

        mensaje: 'El crédito ha sido registrado (Pendiente de Aprobación) y el cliente vinculado a esta ruta.',

        tipo: 'exito'

      })

      setShowCreditModal(false)

      

    } catch (error: any) {

      console.error('Error al crear crédito:', error)

      setModalAlerta({

        titulo: 'Error',

        mensaje: error.message || 'No se pudo crear el crédito. Inténtelo de nuevo.',

        tipo: 'error'

      })

    } finally {

      setIsLoading(false)

    }

  }, [userSession?.id])



  const handleCompletarRuta = useCallback(() => {
    // Advertir si hay cierre pendiente anterior (supervisor puede regularizar)
    if (hasCierrePendiente) {
      setShowCierrePendienteModal(true)
      return
    }

    const recaudo = rutaStats.recaudo || 0

    // Calcular meta desde visitasOperativasHoy (excluye ausentes) en lugar de rutaStats.meta
    // Esto evita emitir meta incorrecta en evento de cierre cuando rutaStats está stale
    const hoyStr = hoyBogotaKey

    const ajustarEstadoConPago = (v: any) => {
      if (Number(v.saldoTotal || 0) <= 0) return 'pagado'
      const pagadoHoy = Number((v as any).recaudadoDelDia || 0)
      const cuota = Number(v.montoCuota || 0)
      if (pagadoHoy >= cuota - 1 && pagadoHoy > 0) return 'pagado'
      const prox = v.proximaVisita ? (String(v.proximaVisita).includes('T') ? String(v.proximaVisita).split('T')[0] : String(v.proximaVisita)) : ''
      if (prox === hoyStr && pagadoHoy >= cuota - 1) return 'pagado'
      return v.estado
    }

    const visitasHoy = (visitasBase || [])
      .map((v: any) => ({ ...v, estado: ajustarEstadoConPago(v) }))
      .filter((v: any) => shouldShowVisitaEnRutaHoy(v, hoyBogotaKey))

    const visitasOperativasHoy = visitasHoy.filter((v: any) => !shouldExcludeVisitaFromOperationalMeta(v));
    const visitasAusentesHoy = visitasHoy.filter((v: any) => shouldExcludeVisitaFromOperationalMeta(v));

    // Calcular meta real desde visitas operativas (excluye ausentes)
    const statsHoy = computeRutaHoyUiStatsFromVisitas(visitasOperativasHoy, 0);
    const meta = statsHoy.meta;

    const efectividad = meta > 0 ? Math.round((recaudo / meta) * 100) : (recaudo > 0 ? 100 : 0)

    const clientesFaltantes = visitasOperativasHoy.filter((v: any) => {
      const estado = String(v?.estado || '').toLowerCase();
      return estado === 'pendiente' || estado === 'en_mora';
    }).length;

    const clientesAusentes = visitasAusentesHoy.length;



    // Emitir evento de cierre con datos completos (guarda en BD + notifica coordinadores)

    socket?.emit('ruta_completada_emit', {

      rutaNombre: userSession?.rutaAsignada || rutaId || 'Mi Ruta',

      cobradorNombre: `${userSession?.nombres || ''} ${userSession?.apellidos || ''}`.trim() || 'Supervisor',

      recaudo,

      meta,

      efectividad,

      clientesFaltantes,

      clientesAusentes,

      rutaId: rutaInfo?.id || rutaId || undefined,

      actorId: userSession?.id,

      actorRol: userSession?.rol,

    }, (response: any) => {
      if (!response?.success) {
        toast.error(response?.message || 'No se pudo cerrar la ruta.')
        return
      }

      setRutaCompletada(true)
      setShowConfirmCompleteModal(false)
      toast.success('Ruta cerrada correctamente.')
    })



    const mensajeCierre = clientesFaltantes > 0

      ? `Ruta cerrada. Faltaron ${clientesFaltantes} cliente${clientesFaltantes > 1 ? 's' : ''} por cobrar. Se alertó a la oficina.`

      : 'Ruta del día completada exitosamente. Se notificó al coordinador.'

    setCoordinadorToast(mensajeCierre)

    window.setTimeout(() => setCoordinadorToast(null), 5000)

  }, [
    socket,
    rutaId,
    rutaInfo,
    rutaStats,
    visitasBase,
    userSession,
    hoyBogotaKey,
    hasCierrePendiente,
  ]);



  const handleAbrirClienteInfo = useCallback((visita: VisitaRuta) => {
    // Si llegamos aquí, el clic fue detectado.
    if (!visita.clienteId) {
       console.error('[Supervisor] No se puede abrir el modal: clienteId es nulo o vacío');
       toast.error('Error: No se encontró el ID del cliente');
       return;
    }

    setVisitaClienteSeleccionada(visita)
    setNextPagoFecha(null)
    setNextPagoMonto(null)
    setShowClienteInfoModal(true)
  }, [])

  useEffect(() => {
    const cargarNextPagoCliente = async () => {
      if (!showClienteInfoModal || !visitaClienteSeleccionada) {
        setNextPagoFecha(null)
        setNextPagoMonto(null)
        return
      }

      if (!visitaClienteSeleccionada?.prestamoId) {
        setNextPagoFecha(null)
        setNextPagoMonto(null)
        return
      }

      try {
        const detalle = await prestamosService.obtenerPrestamoPorId(visitaClienteSeleccionada.prestamoId)
        const backendProx = (detalle as any)?.proximaCuota ?? null
        const backendFecha = backendProx
          ? (backendProx?.fechaVencimientoProrroga || backendProx?.fechaVencimiento || null)
          : null
        const backendMonto = backendProx ? Number(backendProx?.montoNominal ?? backendProx?.monto ?? 0) : null

        setNextPagoFecha(backendFecha)
        setNextPagoMonto(typeof backendMonto === 'number' ? backendMonto : null)

        const prog = resolveCuotaProgressFromPrestamo(detalle)
        setVisitaClienteSeleccionada((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            cuotaActual: prog.cuotaActual ?? (prev as any).cuotaActual,
            cuotasTotales: prog.cuotasTotales ?? (prev as any).cuotasTotales,
          } as any
        })
      } catch {
        setNextPagoFecha(null)
        setNextPagoMonto(null)
      }
    }

    void cargarNextPagoCliente()
  }, [showClienteInfoModal, visitaClienteSeleccionada?.prestamoId])



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

        <SundayNoticeBanner />

        
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

                  <span className="font-medium text-slate-700">{formatRoleLabel(userSession.rol)}</span>

                  <span>•</span>

                  <span>Supervisando {rutaInfo?.nombre || userSession.rutaAsignada || 'Ruta'} {rutaInfo?.cobradorNombre ? `(${rutaInfo.cobradorNombre})` : ''}</span>

                </div>

              </div>

            </div>

          </div>

        </header>





        <RutaKpiSection periodo={periodoCards} onPeriodoChange={setPeriodoCards} rutaStats={rutaStats as any} userRol={userSession?.rol} />

        {/* Banner de cierre pendiente */}
        <CierrePendienteBanner
          cierrePendiente={cierrePendiente}
          loading={loadingCierrePendiente}
          onRefresh={refreshCierrePendiente}
          onVerDetalles={() => {
            setShowDetalleCierre(true)
            void cargarDetalle()
          }}
        />










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
                    onClick={() => setShowRutaProvisional(true)}
                    className="px-4 py-2 bg-blue-100 text-[#08557f] border border-blue-200 hover:bg-blue-200 rounded-xl flex items-center gap-2 font-medium shadow-sm transition-colors"
                  >
                    <Search className="h-4 w-4" />
                    <span className="hidden md:inline">Ruta Provisional</span>
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

            </div>

            </div>

            {/* Barra de acciones operativa desactivada para supervisor */}            {!showHistory && !showMisClientes && (

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

                        return (
                          <RutaHistorialOperativo
                            key={`${rutaInfo?.id || rutaId || 'ruta'}-${historialRefreshKey}`}
                            rutaId={rutaInfo?.id || rutaId}
                            cobradorId={rutaInfo?.cobradorId}
                            actorId={userSession?.id}
                            actorRol={userSession?.rol}
                            getVisitasHoy={() => visitasBase}
                            onVerCliente={handleAbrirClienteInfo}
                            getEstadoClasses={getEstadoClasses}
                          />
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
                          v.cliente.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          v.direccion.toLowerCase().includes(searchQuery.toLowerCase())
                        )



                        if (filtradas.length === 0) {

                          return (

                            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">

                              <User className="w-12 h-12 text-slate-200 mx-auto mb-4" />

                              <p className="font-bold text-slate-400">No hay créditos asignados.</p>

                            </div>

                          )

                        }



                        return (

                          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">

                            <div className="flex items-center justify-between px-1">

                              <h3 className="font-bold text-slate-900 text-lg">Mis clientes</h3>

                              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full">

                                {`${filtradas.length} créditos`}

                              </div>

                            </div>

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



                            <div className="space-y-3">

                              {filtradas.map((visita) => (

                                <StaticVisitaItem

                                  key={visita.id}

                                  visita={visita}

                                  allowClick={false}

                                  getEstadoClasses={getEstadoClasses}

                                  getPrioridadColor={getPrioridadColor}

                                  actions={

                                    <>

                                      <button

                                        onClick={(e) => {

                                          e.stopPropagation()

                                          if (!rutaOperable) return

                                          setVisitaEstadoCuentaSeleccionada(visita)

                                          setShowEstadoCuentaModal(true)

                                        }}

                                        disabled={!rutaOperable}

                                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border transition-all active:scale-95 text-[11px] font-bold ${!rutaOperable ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}

                                      >

                                        <FileTextIcon className="h-3.5 w-3.5 text-slate-400" />

                                        Estado

                                      </button>

                                    </>

                                  }

                                />

                              ))}

                            </div>

                          </div>

                        )

                      }



                      const isTodayOrMora = (dateStr: string) => {
                        if (!dateStr) return true;
                        return isTodayOrPastBogota(dateStr);
                      };

                      const filterByDate = (v: any) => searchQuery || Number(v.montoCuota) > 0 || isTodayOrMora(v.proximaVisita);

                      const porPeriodo = {
                        DIA: visitasCobrador.filter(v => v.periodoRuta === 'DIA' && filterByDate(v)),
                        SEMANA: visitasCobrador.filter(v => v.periodoRuta === 'SEMANA' && filterByDate(v)),
                        QUINCENA: visitasCobrador.filter(v => v.periodoRuta === 'QUINCENA' && filterByDate(v)),
                        MES: visitasCobrador.filter(v => v.periodoRuta === 'MES' && filterByDate(v)),
                      }



                      const renderSeccion = (key: string, titulo: string, visitas: VisitaRuta[]) => {

                        if (visitas.length === 0) return null

                        const estaColapsado = !!gruposColapsados[key]

                        return (

                          <div className="space-y-4">

                            <button

                              type="button"

                              onClick={() => toggleGrupo(key)}

                              className="w-full flex items-center gap-4 group"

                            >

                              <div className="h-px flex-1 bg-slate-200" />

                              <span className="flex items-center gap-2 text-[11px] font-black text-[#08557f] uppercase tracking-[0.25em] bg-blue-50/50 px-4 py-1.5 rounded-full border border-blue-100 shadow-sm whitespace-nowrap select-none group-hover:bg-blue-100/60 transition-colors">

                                {titulo}{' '}

                                <span className="ml-1 bg-blue-600 text-white text-[9px] px-2 py-0.5 rounded-full">

                                  {visitas.length}

                                </span>

                                <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${estaColapsado ? '' : 'rotate-180'}`} />

                              </span>

                              <div className="h-px flex-1 bg-slate-200" />

                            </button>

                            {!estaColapsado && (

                              <div className="space-y-3">

                                {visitas.map((visita) => (

                                  <StaticVisitaItem

                                    key={visita.id}

                                    visita={visita}

                                    onSelect={(id) =>

                                      setVisitaSeleccionada(

                                        id === visitaSeleccionada ? null : id,

                                      )

                                    }

                                    onVerCliente={handleAbrirClienteInfo}

                                    getEstadoClasses={getEstadoClasses}

                                    isSelected={visita.id === visitaSeleccionada}

                                    actions={

                                      <>

                                        <button

                                          onClick={(e) => {

                                            e.stopPropagation()

                                            if (!rutaOperable) return

                                            clearRegularizacionContext()
                                            setVisitaPagoSeleccionadaId(visita.id)

                                            setPagoInitialIsAbono(false)

                                            setShowPaymentModal(true)

                                          }}

                                          disabled={!rutaOperable}

                                          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all active:scale-95 text-[11px] font-bold ${!rutaOperable ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}

                                        >

                                          <DollarSign className="h-3.5 w-3.5" />

                                          Pago

                                        </button>

                                        <button

                                          onClick={(e) => {

                                            e.stopPropagation()

                                            if (!rutaOperable) return

                                            clearRegularizacionContext()
                                            setVisitaPagoSeleccionadaId(visita.id)

                                            setPagoInitialIsAbono(true)

                                            setShowPaymentModal(true)

                                          }}

                                          disabled={!rutaOperable}

                                          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all active:scale-95 text-[11px] font-bold ${!rutaOperable ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}

                                        >

                                          <Wallet className="h-3.5 w-3.5" />

                                          Abono

                                        </button>

                                        <button

                                          onClick={(e) => {

                                            e.stopPropagation()

                                            if (!rutaOperable) return

                                            setVisitaEstadoCuentaSeleccionada(visita)

                                            setShowEstadoCuentaModal(true)

                                          }}

                                          disabled={!rutaOperable}

                                          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border transition-all active:scale-95 text-[11px] font-bold ${!rutaOperable ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}

                                        >

                                          <FileTextIcon className="h-3.5 w-3.5 text-slate-400" />

                                          Estado

                                        </button>

                                        <button

                                          onClick={(e) => {

                                            e.stopPropagation()

                                            if (!rutaOperable) return
                                            const isProrrogaVencida =
                                              visita.enProrroga &&
                                              visita.fechaProrroga &&
                                              new Date(visita.fechaProrroga).getTime() < Date.now()
                                            if (visita.enProrroga && !isProrrogaVencida) return

                                            clearRegularizacionContext()
                                            setVisitaReprogramar(visita)

                                            setShowReprogramModal(true)

                                          }}

                                          disabled={
                                            !rutaOperable ||
                                            (!!visita.enProrroga &&
                                              !(
                                                visita.fechaProrroga &&
                                                new Date(visita.fechaProrroga).getTime() < Date.now()
                                              ))
                                          }
                                          title={
                                            !rutaOperable
                                              ? rutaCompletada
                                                ? 'Jornada completada'
                                                : 'Jornada sin activar'
                                              : visita.enProrroga &&
                                                  !(
                                                    visita.fechaProrroga &&
                                                    new Date(visita.fechaProrroga).getTime() < Date.now()
                                                  )
                                                ? 'No se puede reprogramar con prórroga activa'
                                                : 'Solicitar reprogramación'
                                          }

                                          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border transition-all active:scale-95 text-[11px] font-bold ${!rutaOperable || (visita.enProrroga && !(visita.fechaProrroga && new Date(visita.fechaProrroga).getTime() < Date.now())) ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}

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




            </div>

          </div>

        </div>



        {showClienteInfoModal && visitaClienteSeleccionada && (

          <ClienteInfoModal

            visita={visitaClienteSeleccionada}

            nextPagoMonto={nextPagoMonto ?? resolveCuotaNormalOperativa(visitaClienteSeleccionada)}

            nextPagoFecha={nextPagoFecha ?? (visitaClienteSeleccionada.proximaVisita || '')}

            recaudadoHoy={Number((visitaClienteSeleccionada as any).recaudadoDelDia || 0)}

            formatFechaLargaUTC={(d: string) => {

              if (!d) return '—';

              // Extraer solo la parte YYYY-MM-DD para evitar problemas de zona horaria

              const datePart = d.includes('T') ? d.split('T')[0] : d;

              const [year, month, day] = datePart.split('-').map(Number);

              if (!year || !month || !day) return d;

              

              // Crear fecha local (Colombia)

              const localDate = new Date(year, month - 1, day);

              return localDate.toLocaleDateString('es-CO', { 

                year: 'numeric', 

                month: '2-digit', 

                day: '2-digit' 

              });

            }}

            onClose={() => {

              setShowClienteInfoModal(false)

              setVisitaClienteSeleccionada(null)

            }}

          />

        )}

        {showRutaProvisional && (

          <RutaProvisionalModal

            visitas={visitasCobrador.filter((v: any) => {
              const pending = ['pendiente', 'en_mora'].includes(String(v?.estado || '').toLowerCase())
              if (!pending) return false
              const hoyBogota = hoyBogotaKey
              return isVisitaExigibleHoy(v, hoyBogota)
            })}

            initialOrder={visitasOrden}

            onClose={() => setShowRutaProvisional(false)}

            getEstadoClasses={getEstadoClasses}

          />

        )}



        {showPaymentModal && visitaPagoSeleccionadaId && (

          <PagoModal

            visita={visitaPagoRegularizada || visitasCobrador.find((v: any) => v.id === visitaPagoSeleccionadaId)!}

            tipo={pagoInitialIsAbono ? 'ABONO' : 'PAGO'}

            onClose={() => {

              setShowPaymentModal(false)

              setVisitaPagoSeleccionadaId(null)
              setVisitaPagoRegularizada(null)

              clearRegularizacionContext()

            }}
            montoCuotaEsperadoOverride={(contextoRegularizacion as any)?.montoCuotaEsperado ?? resolveCuotaNormalOperativa(visitaPagoRegularizada || visitasBase.find(v => v.id === visitaPagoSeleccionadaId))}
            cuotaNumeroEsperadaOverride={(contextoRegularizacion as any)?.cuotaNumeroEsperada}

            onConfirm={async (monto: number, metodo: 'EFECTIVO' | 'TRANSFERENCIA', comprobante: File | null, contexto) => {

              const visitaId = visitaPagoSeleccionadaId

              // Cerrar inmediatamente para UX
              setShowPaymentModal(false)
              setVisitaPagoSeleccionadaId(null)
              setVisitaPagoRegularizada(null)

              // Registrar en background (y actualizar optimista)
              void handleRegistrarPago(visitaId, Number(monto || 0), metodo, comprobante, pagoInitialIsAbono, contexto)

            }}

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
              if (!rutaInfo?.id || !visitaAusente?.clienteId) return;
              await rutasService.marcarVisitaAusente(rutaInfo.id, visitaAusente.clienteId, {
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
              toast.success('Cliente marcado como ausente');
              setVisitaAusente(null);
              clearRegularizacionContext();
              await cargarVisitasRuta();
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
          
          rutaId={rutaId as string}

          cobradorId={
            userSession?.rol === RolUsuario.SUPERVISOR
              ? userSession.id
              : ((rutaInfo as any)?.cobradorId || userSession?.id)
          }
          
          recaudoDia={rutaStats.recaudo}
          
          gastosDia={rutaStats.gastos}

          onConfirm={async (data) => {
            if (!rutaId) return

            // Si el usuario es SUPERVISOR, usar su propio ID para que el gasto se debite de su caja
            const esSupervisor = userSession?.rol === RolUsuario.SUPERVISOR
            const cobradorIdReal = esSupervisor
              ? userSession?.id
              : ((rutaInfo as any)?.cobradorId || userSession?.id || '')

            if (!cobradorIdReal) {
              toast.error('No se pudo registrar el gasto: falta cobrador')
              return
            }

            try {
              setIsLoading(true)

              await registrarGasto({
                descripcion: data.descripcion,
                valor: data.valor,
                comprobante: data.comprobante,
                rutaId: rutaId as string,
                cobradorId: cobradorIdReal,
              })
              toast.success('Gasto registrado. Se envió a aprobación.')
              setShowGastoModal(false)
            } catch (e: any) {
              console.error('Error al registrar gasto (SupervisorCobroView):', e)
              const msg = e?.message || 'No se pudo registrar el gasto'
              setModalAlerta({ titulo: 'Error', mensaje: msg, tipo: 'error' })
            } finally {
              setIsLoading(false)
            }
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

            titulo={

              pendingAction === 'CUENTA' ? 'Ver Estado de Cuenta' : 

              pendingAction === 'PAGO' ? 'Registrar Pago' :

              pendingAction === 'ABONO' ? 'Registrar Abono' :

              'Agendar Visita'

            }

            subtitulo={

              pendingAction === 'CUENTA' ? 'Consultar Cliente' : 

              pendingAction === 'PAGO' ? 'Busque el cliente que paga' :

              pendingAction === 'ABONO' ? 'Busque el cliente para abono' :

              'Programar Cliente'

            }

            visitas={visitasBase}

            onSelect={(visita) => {

              setShowClientSelector(false)

              if (pendingAction === 'CUENTA') {

                setVisitaEstadoCuentaSeleccionada(visita)

                setShowEstadoCuentaModal(true)

              } else if (pendingAction === 'AGENDAR') {

                clearRegularizacionContext()
                setVisitaReprogramar(visita)

                setShowReprogramModal(true)

              } else if (pendingAction === 'PAGO') {

                clearRegularizacionContext()
                setVisitaPagoSeleccionadaId(visita.id)

                setPagoInitialIsAbono(false)

                setShowPaymentModal(true)

              } else if (pendingAction === 'ABONO') {

                clearRegularizacionContext()
                setVisitaPagoSeleccionadaId(visita.id)

                setPagoInitialIsAbono(true)

                setShowPaymentModal(true)

              }

              setPendingAction(null)

            }}

            onClose={() => {

              setShowClientSelector(false)

            }}

          />

        )}



        {/* Floating Action Button (FAB) - local cuando hay rutaId seleccionado para contexto operativo */}

        {rutaId && (
          <FloatingActionMenu actions={[

            { label: 'Crear Crédito', icon: <CreditCard className="h-5 w-5" />, onClick: () => { setShowCreditModal(true); } },

            { label: 'Nuevo Cliente', icon: <UserPlus className="h-5 w-5" />, onClick: () => { setShowNewClientModal(true); } },

            { label: 'Registrar abono', icon: <RefreshCw className="h-5 w-5" />, color: 'orange', onClick: () => { setPendingAction('ABONO'); setShowClientSelector(true); } },

            { label: 'Registrar pago', icon: <DollarSign className="h-5 w-5" />, onClick: () => { setPendingAction('PAGO'); setShowClientSelector(true); } },

            { label: 'Pedir Base', icon: <Wallet className="h-5 w-5" />, color: 'emerald', onClick: () => { setShowBaseModal(true); } },

            { label: 'Gastos', icon: <ReceiptText className="h-5 w-5" />, color: 'rose', onClick: () => { setShowGastoModal(true); } },

          ] as FabAction[]} />
        )}



        {showConfirmCompleteModal && (() => {
          const ajustarEstadoConPagoModal = (v: any) => {
            if (Number(v.saldoTotal || 0) <= 0) return 'pagado'

            const pagadoHoy = Number(v?.recaudadoDelDia || 0)
            const cuota = Number(v?.montoCuota || 0)

            if (cuota > 0 && pagadoHoy >= cuota - 1 && pagadoHoy > 0) return 'pagado'

            return v.estado
          }

          const isAusenteModal = shouldExcludeVisitaFromOperationalMeta

          const visitasHoyModal = (visitasBase || [])
            .map((v: any) => ({ ...v, estado: ajustarEstadoConPagoModal(v) }))
            .filter((v: any) => shouldShowVisitaEnRutaHoy(v, hoyBogotaKey))

          const visitasAusentesHoyModal = visitasHoyModal.filter((v: any) => isAusenteModal(v))
          const visitasOperativasHoyModal = visitasHoyModal.filter((v: any) => !isAusenteModal(v))
          const statsModal = computeRutaHoyUiStatsFromVisitas(visitasOperativasHoyModal, 0)

          const recaudoV = Number(statsModal.recaudo || 0)
          const metaV = Number(statsModal.meta || 0)
          const porcentaje = metaV > 0
            ? Math.round((recaudoV / metaV) * 100)
            : (recaudoV > 0 ? 100 : 0)

          const alCien = porcentaje >= 100
          const descuadre = recaudoV < metaV
          const clientesFaltantesHoy = visitasOperativasHoyModal.filter((v: any) => {
            const estado = String(v?.estado || '').toLowerCase()
            return estado === 'pendiente' || estado === 'en_mora'
          }).length
          const clientesAusentesHoy = visitasAusentesHoyModal.length
          const ausentesConNotaCierre = visitasAusentesHoyModal.map((v: any) => ({
            nombre: String(v?.cliente || 'Cliente'),
            nota: String(v?.notasVisita || '').trim(),
          }))
          const totalProgramadosHoy = visitasHoyModal.length
          const clientesCobradosHoy = Math.max(0, visitasOperativasHoyModal.length - clientesFaltantesHoy)
          const todosPendientes = clientesFaltantesHoy > 0 && clientesFaltantesHoy === visitasOperativasHoyModal.length
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
                          <h3 className="text-xl font-black text-slate-900 tracking-tight mb-2">¿Finalizar Ruta Supervisada?</h3>
                          <p className="text-slate-500 text-sm font-medium leading-relaxed">
                             Al cerrar como supervisor se enviará el reporte consolidado a la oficina central.
                          </p>
                        </div>

                        <div>
                         <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Programados</p>
                         <p className="text-sm font-black text-slate-900">{totalProgramadosHoy}</p>
                       </div>
                       <div>
                         <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Cobrados</p>
                         <p className="text-sm font-black text-emerald-600">{clientesCobradosHoy}</p>
                       </div>
                       <div>
                         <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Ausentes</p>
                         <p className="text-sm font-black text-amber-600">{clientesAusentesHoy}</p>
                       </div>
                       {descuadre && (
                          <div className="w-full flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-2xl text-left">
                            <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-xs font-black text-red-700 uppercase tracking-wide">Descuadre Detectado</p>
                              <p className="text-[11px] text-red-600 font-medium mt-0.5">
                                Se recaudaron {formatMilesCOP(recaudoV)} de {formatMilesCOP(metaV)} esperados. Esta diferencia se registrará en la deuda del cobrador.
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
                                ? <><span className="text-red-900 text-sm font-black">Ningún</span> cliente fue cobrado hoy. Sin recaudo reportado.</>  
                                : <>Faltaron <span className="text-amber-900 text-sm font-black">{clientesFaltantesHoy}</span> cliente{clientesFaltantesHoy > 1 ? 's' : ''} por cobrar.</>}
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
                             Confirmas un descuadre de <span className="text-lg underline underline-offset-4 decoration-2">{formatMilesCOP(metaV - recaudoV)}</span>. 
                          </p>
                          <p className="mt-3 text-slate-500 text-[11px] font-medium leading-relaxed px-4">
                             Esta acción es irreversible y afectará el balance contable del cobrador. ¿Deseas proceder con el cierre supervisado?
                          </p>
                        </div>
                      </>
                    )}

                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-left grid grid-cols-2 gap-y-4 gap-x-3 w-full">
                       <div>
                         <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Base/Saldo</p>
                         <p className="text-sm font-black text-blue-600">{formatMilesCOP(rutaStats.base || 0)}</p>
                       </div>
                       <div>
                         <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Recaudado</p>
                         <p className={`text-sm font-black ${alCien ? 'text-emerald-600' : 'text-orange-600'}`}>{formatMilesCOP(recaudoV)}</p>
                       </div>
                       <div>
                         <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Gastos</p>
                         <p className="text-sm font-black text-rose-600">{formatMilesCOP(rutaStats.gastos || 0)}</p>
                       </div>
                       <div>
                         <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Meta</p>
                         <p className="text-sm font-black text-slate-900">{formatMilesCOP(metaV)}</p>
                       </div>

                       {descuadre && (
                         <div className="col-span-2 p-3 bg-red-50 rounded-xl border border-red-100">
                           <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest">Diferencia Final</p>
                           <p className="text-lg font-black text-red-600">{formatMilesCOP(metaV - recaudoV)}</p>
                         </div>
                       )}
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
                             handleCompletarRuta()
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



        {/* Modal de Alerta */}

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

        {/* Modal de confirmación de cierre pendiente */}
        {showCierrePendienteModal && (
          <ConfirmModal
            isOpen={showCierrePendienteModal}
            onClose={() => setShowCierrePendienteModal(false)}
            onConfirm={() => {
              setShowCierrePendienteModal(false)
              // Continuar con el cierre de ruta
              const recaudo = rutaStats.recaudo || 0
              const hoyStr = hoyBogotaKey

              const ajustarEstadoConPago = (v: any) => {
                if (Number(v.saldoTotal || 0) <= 0) return 'pagado'
                const pagadoHoy = Number((v as any).recaudadoDelDia || 0)
                const cuota = Number(v.montoCuota || 0)
                if (pagadoHoy >= cuota - 1 && pagadoHoy > 0) return 'pagado'
                const prox = v.proximaVisita ? (String(v.proximaVisita).includes('T') ? String(v.proximaVisita).split('T')[0] : String(v.proximaVisita)) : ''
                if (prox === hoyStr && pagadoHoy >= cuota - 1) return 'pagado'
                return v.estado
              }

              const visitasHoy = (visitasBase || [])
                .map((v: any) => ({ ...v, estado: ajustarEstadoConPago(v) }))
                .filter((v: any) => shouldShowVisitaEnRutaHoy(v, hoyBogotaKey))

              const isAusente = shouldExcludeVisitaFromOperationalMeta

              const visitasAusentesHoy = visitasHoy.filter(isAusente);
              const visitasOperativasHoy = visitasHoy.filter((v: any) => !isAusente(v));

              const statsHoy = computeRutaHoyUiStatsFromVisitas(visitasOperativasHoy, 0);
              const meta = statsHoy.meta;

              const clientesFaltantes = visitasHoy.filter((v: any) => !isAusente(v) && v.estado !== 'pagado').length
              const clientesAusentes = visitasAusentesHoy.length

              const efectividad = meta > 0 ? Math.round((recaudo / meta) * 100) : 0

              socket?.emit('ruta_completada_emit', {
                rutaNombre: userSession?.rutaAsignada || rutaId || 'Mi Ruta',
                cobradorNombre: userSession?.nombres || 'Cobrador',
                recaudo,
                meta,
                efectividad,
                clientesFaltantes,
                rutaId,
                actorId: userSession?.id,
                actorRol: userSession?.rol,
              }, (response: any) => {
                if (!response?.success) {
                  toast.error(response?.message || 'No se pudo cerrar la ruta.')
                  return
                }

                const mensajeCierre = clientesFaltantes > 0
                  ? `Ruta cerrada. Faltaron ${clientesFaltantes} cliente${clientesFaltantes > 1 ? 's' : ''} por cobrar hoy. Se alertó a la oficina.`
                  : 'Se ha cerrado el día de manera exitosa y se alertó a la oficina.';

                setCoordinadorToast(mensajeCierre);
                window.setTimeout(() => setCoordinadorToast(null), 5000);
                toast.success('Ruta cerrada correctamente.')
              })
            }}
            title="Jornada Pendiente de Cierre"
            message="Esta ruta tiene una jornada anterior pendiente de cierre. No se recomienda cerrar la jornada actual hasta regularizar la anterior. ¿Desea continuar con el cierre de la jornada actual?"
            confirmText="Continuar con cierre"
            cancelText="Cancelar"
            variant="warning"
          />
        )}

        <CierrePendienteDetalleModal
          open={showDetalleCierre}
          onClose={() => setShowDetalleCierre(false)}
          detalle={detalle}
          loading={loadingDetalleCierre}
          onVerEstadoCuenta={(cliente, contextoRegularizacion) => {
            const visita = resolveVisitaBaseRegularizacion(cliente, visitasBase)
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
            const visitaBase = resolveVisitaBaseRegularizacion(cliente, visitasBase)
            if (!visitaBase) {
              toast.error('No se encontró la visita del cliente.')
              return
            }

            const target = buildRegularizedPaymentTarget({
              rutaId,
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
              setVisitaPagoRegularizada(target.visitaRegularizada as any)
              setVisitaPagoSeleccionadaId(visitaBase.id)
              setPagoInitialIsAbono(false)
              setShowPaymentModal(true)
            }, 80)
          }}
          onRegistrarAbono={(cliente, contextoRegularizacion) => {
            const visitaBase = resolveVisitaBaseRegularizacion(cliente, visitasBase)
            if (!visitaBase) {
              toast.error('No se encontró la visita del cliente.')
              return
            }

            const target = buildRegularizedPaymentTarget({
              rutaId,
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
              setVisitaPagoRegularizada(target.visitaRegularizada as any)
              setVisitaPagoSeleccionadaId(visitaBase.id)
              setPagoInitialIsAbono(true)
              setShowPaymentModal(true)
            }, 80)
          }}
          onMarcarAusente={(cliente, contextoRegularizacion) => {
            const visita = resolveVisitaBaseRegularizacion(cliente, visitasBase)
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
            const visitaBase = resolveVisitaBaseRegularizacion(cliente, visitasBase)
            if (!visitaBase) {
              toast.error('No se encontró la visita del cliente.')
              return
            }

            const target = buildRegularizedPaymentTarget({
              rutaId,
              cliente,
              visitaBase,
              contextoRegularizacion,
              intent: 'reprogramacion',
            })

            if (target.error) {
              toast.error(target.error)
              return
            }

            setShowDetalleCierre(false)

            setTimeout(() => {
              setRegularizacionContext(target.contextoPagoRegularizado)
              setVisitaReprogramar(target.visitaRegularizada as any)
              setShowReprogramModal(true)
            }, 80)
          }}
          onRegularizar={async (contextoRegularizacion, observaciones) => {
            if (!rutaId) {
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
                rutaId,
                fechaOperativa,
                observaciones || 'Jornada regularizada desde el módulo de cierre pendiente.',
              )

              toast.success('Jornada cerrada exitosamente.')
              setShowDetalleCierre(false)

              void Promise.allSettled([
                cargarDetalle(),
                refreshCierrePendiente?.(),
                cargarVisitasRuta?.(),
              ])
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
              canMarcarAusente: false,
              canAnularAusencia: false,
              canReprogramar: (canSupervisarJornada || isCobrador) && !esDiaNoLaboral,
              canVerPago: false,
              canVerComprobante: false,
              canAgregarObservacion: false,
            }
          })()}
          handlers={{
            onExportarDetalle: undefined,
            onSolicitarCorreccion: undefined,
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



export default SupervisorCobroView









