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
import { useRutaHistorial } from '@/hooks/useRutaHistorial'

import { buildHistorialDiaFromBackend } from '@/lib/ruta-historial'
import { mapWithConcurrency, memoizePromiseByKey } from '@/lib/async-utils'

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
} from 'lucide-react'

import { RolUsuario } from '@/types/enums'
import { EstadoVisita, PeriodoRuta, VisitaRuta } from '@/lib/types/cobranza'

import { obtenerPerfil } from '@/services/autenticacion-service'
import { rutasService, Ruta } from '@/services/rutas-service'

import NuevoClienteModal from '@/components/clientes/NuevoClienteModal'
import ClienteInfoModal from '@/components/cobranza/ClienteInfoModal'
import { StaticVisitaItem, SortableVisita, SeleccionClienteModal } from '@/components/dashboards/shared/CobradorElements'
import EstadoCuentaModal from '@/components/cobranza/EstadoCuentaModal'
import PagoModal from '@/components/cobranza/PagoModal'
import CrearCreditoModal from '@/components/dashboards/shared/CrearCreditoModal'

import ConfirmModal from '@/components/ui/ConfirmModal'

import ReprogramarModal from '@/components/cobranza/ReprogramarModal'

import GastoModal from '@/components/dashboards/shared/GastoModal'


import BaseModal from '@/components/dashboards/shared/BaseModal'


import DetalleMoraModal from '@/components/cobranza/DetalleMoraModal'


import FloatingActionMenu, { FabAction } from '@/components/dashboards/shared/FloatingActionMenu'
import { RutaStatsCards } from '@/components/dashboards/shared/RutaStatsCards'

import RutaKpiSection from '@/components/dashboards/shared/RutaKpiSection'


import { prestamosService } from '@/services/prestamos-service'
import { pagosService } from '@/services/pagos-service'

import { applyRecaudoHoyToVisitas, buildRecaudosHoyMapByPrestamoId, indexPagosByPrestamoId, sumMontoTotalPagosByBogotaDateKey } from '@/lib/ruta-recaudos'

import { obtenerSaldoDisponibleRuta, getRutaCierreHoy, registrarGasto } from '@/services/contabilidad-service'


import { routesService as routesApi } from '@/services/routes-service'


import { exportService } from '@/services/export-service'


import { useNotificaciones } from '@/components/providers/NotificacionesProvider'


import { toast } from 'sonner'

import { computeMontoExigibleHastaHoyFromCuotas, computeMetaHoyFromVisitas, getBogotaDateKey, getBogotaRangeByPeriod, getLocalDateKey, getPagoBogotaDateKey, isCuotaNoPagada, isTodayOrPastBogota, isVisitaExigibleHoy, normalizeDateKey, resolveFechaEfectivaCuota, resolveProximaCuotaFromPrestamo, resolveCuotaProgressFromPrestamo, shouldMarkVisitaAsPagado, toBogotaDateTimeOffsetIso } from '@/lib/rutas-core'

import { mapAsignacionesToVisitasLite } from '@/lib/ruta-visitas-mapper'

import SundayNoticeBanner from '@/components/rutas/SundayNoticeBanner'

import RutaProvisionalModal from '@/components/dashboards/shared/RutaProvisionalModal'


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


  


  const [showClienteInfoModal, setShowClienteInfoModal] = useState(false)


  const [visitaClienteSeleccionada, setVisitaClienteSeleccionada] = useState<VisitaRuta | null>(null)

  const [nextPagoFecha, setNextPagoFecha] = useState<string | null>(null)
  const [nextPagoMonto, setNextPagoMonto] = useState<number | null>(null)


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


  const [showMisClientes, setShowMisClientes] = useState(false)


  const [periodoRutaFiltro, setPeriodoRutaFiltro] = useState<PeriodoRuta | 'TODOS'>('TODOS')


  const [selectedHistoryDate, setSelectedHistoryDate] = useState<string | null>(null)


  const [selectedHistoryMonth, setSelectedHistoryMonth] = useState<string | null>(null)


  const [historyViewMode, setHistoryViewMode] = useState<'DAYS' | 'MONTHS'>('DAYS')

 
  


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


  const [rutaCompletada, setRutaCompletada] = useState(false)


  const [rutaActivadaHoy, setRutaActivadaHoy] = useState(false)


  const rutaOperable = rutaActivadaHoy && !rutaCompletada


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



  const getDatesByPeriod = (period: 'HOY' | 'SEM' | 'MES' | 'AÑO') => {
    return getBogotaRangeByPeriod(period)
  };

  const cargarEstadisticasRuta = useCallback(async () => {
    if (!rutaId) return {} as Record<string, number>

    const { inicio: cardInicio, fin: cardFin } = getDatesByPeriod(periodoCards)

    try {
      const saldo: any = await obtenerSaldoDisponibleRuta(rutaId as string, undefined, cardInicio, cardFin)
      setRutaStats((prev: any) => ({
        ...prev,
        recaudo: Number(saldo?.cobranzaDelDia ?? saldo?.recaudoDelDia ?? prev.recaudo ?? 0),
        meta: Number(prev.meta ?? 0),
        eficiencia:
          Number(prev.meta ?? 0) > 0
            ? Math.round(
                (Number(saldo?.cobranzaDelDia ?? saldo?.recaudoDelDia ?? prev.recaudo ?? 0) /
                  Number(prev.meta ?? 0)) *
                  100,
              )
            : Number(prev.eficiencia ?? 0),
        gastos: Number(saldo?.gastosDelDia ?? prev.gastos ?? 0),
        base: Number(saldo?.saldoCaja ?? saldo?.baseEfectivo ?? prev.base ?? 0),
      }))

      return (saldo?.recaudosPorReferencia || {}) as Record<string, number>
    } catch (e) {
      return {} as Record<string, number>
    }
  }, [rutaId, periodoCards])



  const router = useRouter();


  const [rutaInfo, setRutaInfo] = useState<{ id: string; cobradorId: string; nombre?: string; cobradorNombre?: string } | null>(null);



  const cargarMisCreditos = useCallback(async () => {
    const cobradorId = rutaInfo?.cobradorId
    if (!cobradorId) return

    try {
      setLoadingMisCreditos(true)
      const resp = await rutasService.obtenerCreditosAsignadosACobrador(cobradorId)
      const raw = (resp as any)?.data
      const filas = Array.isArray(raw) ? raw : []

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
        const esArticulo = p?.tipo === 'ARTICULO'

        const toNivel = (nivel: string) => {
          if (nivel === 'VERDE') return 'bajo'
          if (nivel === 'AMARILLO') return 'precaucion'
          if (nivel === 'ROJO') return 'moderado'
          if (nivel === 'LISTA_NEGRA') return 'critico'
          return 'bajo'
        }

        const { cuotaActual, cuotasTotales } = resolveCuotaProgressFromPrestamo(prestamoAutoritativo)
        const cuotasForMonto = Array.isArray((prestamoAutoritativo as any)?.cuotas) ? (prestamoAutoritativo as any).cuotas : []
        const hoyKey = getBogotaDateKey(new Date())
        const montoExigible = computeMontoExigibleHastaHoyFromCuotas(cuotasForMonto, hoyKey)
        const montoNominalProx = Number((prox as any)?.montoNominal ?? (prox as any)?.monto ?? 0)
        const montoPagadoProx = Number((prox as any)?.montoPagado ?? 0)
        const pendienteProx = Math.max(0, montoNominalProx - montoPagadoProx)
        const montoCuota = montoExigible > 0 ? montoExigible : pendienteProx
        const proximaVisitaV = fechaEfectiva || (prox as any)?.fechaVencimiento || row?.prestamo?.fechaEfectiva || getBogotaDateKey(new Date())

        const hoyBogota = getBogotaDateKey(new Date())
        const cuotasForEstado = Array.isArray((prestamoAutoritativo as any)?.cuotas) ? (prestamoAutoritativo as any).cuotas : []
        const tieneMora = (Array.isArray(cuotasForEstado) ? cuotasForEstado : []).some((c: any) => {
          if (!c || !isCuotaNoPagada(c)) return false
          const vtoRaw = resolveFechaEfectivaCuota(c) || String(c?.fechaVencimiento || '')
          const vtoKey = normalizeDateKey(vtoRaw)
          return !!vtoKey && !!hoyBogota && vtoKey < hoyBogota
        })

        const proxEstado = String((prox as any)?.estado || '').toUpperCase()
        const estadoCalculado: EstadoVisita = (() => {
          if (Number(p?.saldoPendiente || 0) <= 0) return 'pagado'
          if (proxEstado === 'PAGADA' || proxEstado === 'PAGADO') return 'pagado'
          if (tieneMora) return 'en_mora'
          return 'pendiente'
        })()

        return {
          id: `${row?.asignacionId || 'asig'}-${p?.id || idx}`,
          cliente: `${c?.nombres || ''} ${c?.apellidos || ''}`.trim() || 'Cliente',
          direccion: c?.direccion || 'Sin dirección registrada',
          telefono: c?.telefono || '',
          horaSugerida: '08:00 AM',
          montoCuota,
          saldoTotal: Number(p?.saldoPendiente || 0),
          estado: estadoCalculado,
          proximaVisita: proximaVisitaV,
          ordenVisita: Number(row?.ordenVisita || idx + 1),
          prioridad: 'media' as any,
          nivelRiesgo: toNivel(c?.nivelRiesgo || 'VERDE') as any,
          cobradorId,
          periodoRuta: (p?.frecuenciaPago || 'DIA') as any,
          clienteId: c?.id || '',
          prestamoId: p?.id || '',
          tipoPrestamo: esArticulo ? 'ARTICULO' : 'EFECTIVO',
          articuloNombre: esArticulo ? (p?.articulo || 'Artículo') : 'Préstamo',
          cuotaActual,
          cuotasTotales,
        } as any
      }))

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
        const ao = Number(a.ordenVisita ?? 0);
        const bo = Number(b.ordenVisita ?? 0);
        if (ao !== bo) return ao - bo;
        const aId = String(a.id || '');
        const bId = String(b.id || '');
        return aId.localeCompare(bId);
      });

      setMisCreditos(finales)
    } catch (e: any) {
      console.error('Error cargando mis clientes:', e)
    } finally {
      setLoadingMisCreditos(false)
    }
  }, [rutaInfo?.cobradorId])



  useEffect(() => {

    if (!showMisClientes) return

    cargarMisCreditos()

  }, [showMisClientes, cargarMisCreditos])



  // Datos base

  const [visitasBase, setVisitasBase] = useState<VisitaRuta[]>([])

  const visitasBaseRef = useRef<any[]>([])
  useEffect(() => {
    visitasBaseRef.current = Array.isArray(visitasBase) ? (visitasBase as any[]) : []
  }, [visitasBase])

  const pagosInFlightRef = useRef<Set<string>>(new Set())



  const [visitasOrden, setVisitasOrden] = useState<string[]>([])



  const [historialRutas, setHistorialRutas] = useState<any>({});

  const historyDates = useMemo(() => {
    return Object.keys(historialRutas || {}).sort().reverse()
  }, [historialRutas])

  const historyByMonth = useMemo(() => {
    const byMonth: Record<string, string[]> = {}
    for (const date of historyDates) {
      const [y, m] = String(date).split('-')
      if (!y || !m) continue
      const monthKey = `${y}-${m}`
      if (!byMonth[monthKey]) byMonth[monthKey] = []
      byMonth[monthKey].push(date)
    }
    return byMonth
  }, [historyDates])

  const historyMonthKeys = useMemo(() => {
    return Object.keys(historyByMonth).sort().reverse()
  }, [historyByMonth])

  const historyMonthSummaryByKey = useMemo(() => {
    const summary: Record<string, { monthRecaudo: number; monthPagados: number }> = {}

    for (const monthKey of historyMonthKeys) {
      const daysInMonth = historyByMonth[monthKey] || []

      const monthRecaudo = daysInMonth.reduce((sum, d) => sum + ((historialRutas as any)[d]?.resumen?.recaudo || 0), 0)
      const monthPagados = daysInMonth.reduce((sum, d) => {
        const dayData = (historialRutas as any)[d]
        const cobrosFromPagos = Number(dayData?.resumen?.visitados || 0)
        if (cobrosFromPagos > 0) return sum + cobrosFromPagos
        return sum + (dayData?.visitas?.filter((v: any) => v.estado === 'pagado')?.length || 0)
      }, 0)

      summary[monthKey] = { monthRecaudo, monthPagados }
    }

    return summary
  }, [historialRutas, historyByMonth, historyMonthKeys])

  const historial = useRutaHistorial({
    rutaId: rutaId,
    cobradorId: rutaInfo?.cobradorId,
    getVisitasHoy: () => visitasBase,
    fetchPagos: () => pagosService.obtenerPagos({ limit: 5000 }) as any,
    loadDay: async (fechaClave: string) => {
      const visitasResp = await rutasService.obtenerVisitasDelDia(rutaId as string, fechaClave)
      const saldo = await obtenerSaldoDisponibleRuta(rutaId as string, fechaClave)

      const toKey = (raw: string): string => getPagoBogotaDateKey(raw)
      let pagosDelDia: any[] = []
      try {
        const pagosResp = await pagosService.obtenerPagos({ limit: 5000 })
        const pagosData = (pagosResp as any)?.pagos || pagosResp || []
        pagosDelDia = (Array.isArray(pagosData) ? pagosData : []).filter((p: any) => {
          const raw = p?.fechaPago || p?.creadoEn
          if (!raw) return false
          const cobradorMatch = rutaInfo?.cobradorId ? (p?.cobradorId === rutaInfo.cobradorId) : true
          return toKey(String(raw)) === fechaClave && cobradorMatch
        })
      } catch {
        pagosDelDia = []
      }

      return buildHistorialDiaFromBackend({ fechaClave, visitasResp, saldo, pagosDelDia })
    },
  })

  useEffect(() => {
    if (!historial.historialRutas) return
    setHistorialRutas(historial.historialRutas as any)
  }, [historial.historialRutas])


  const cargarHistorialFecha = historial.cargarHistorialFecha



  // Al abrir el historial, cargar hoy automáticamente

  useEffect(() => {

    if (!showHistory || !rutaId) return;

    const hoy = getBogotaDateKey(new Date());

    const existing = (historialRutas || {})[hoy];

    if (!existing || !existing.loaded) {

      cargarHistorialFecha(hoy);

    }

  }, [showHistory, rutaId, historialRutas, cargarHistorialFecha]);



  // WebSocket useEffect queda declarado DESPUÉS de cargarVisitasRuta (ver abajo)



  // ---------------------------------------------------------------------------

  // cargarVisitasRuta – carga y enriquece la lista de visitas desde el backend.

  // Es un useCallback estable para poder ser invocado tanto desde el useEffect

  // de montaje como desde el handler del WebSocket (tiempo real).

  // ---------------------------------------------------------------------------
  // cargarVisitasRuta – carga y enriquece la lista de visitas desde el backend.
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

      if (ruta && ruta.asignaciones) {
        const hoyKey = getBogotaDateKey(new Date())

        const getCuotasByPrestamoId = memoizePromiseByKey(
          (prestamoId) => prestamosService.obtenerCuotas(prestamoId) as Promise<any[]>,
          () => [],
        )

        const visitasRaw = mapAsignacionesToVisitasLite({
          asignaciones: ruta.asignaciones,
          hoyKey,
          cobradorId: ruta.cobradorId,
        }) as any[]

        const clientesConPrestamo = new Set<string>();
        visitasRaw.forEach((v: any) => {
          if (v.prestamoId && v.clienteId) clientesConPrestamo.add(v.clienteId);
        });

        const seenIds = new Set<string>();
        const visitas = visitasRaw.filter((v: any) => {
          if (!v.prestamoId && v.clienteId && clientesConPrestamo.has(v.clienteId)) return false;
          const clave = v.prestamoId ? `prestamo-${v.prestamoId}` : `cliente-${v.clienteId}`;
          if (seenIds.has(clave)) return false;
          seenIds.add(clave);
          return true;
        });

        const visitasEnriquecidas = await mapWithConcurrency(
          visitas,
          async (v: any) => {
            if (!v.prestamoId) return v;
            try {
              const rawCuotas = await getCuotasByPrestamoId(v.prestamoId);
              const cuotas = rawCuotas.sort((a, b) => 
                new Date(a.fechaVencimiento).getTime() - new Date(b.fechaVencimiento).getTime()
              );
              
              const hoyBogota = getBogotaDateKey(new Date());

              const getCuotaVtoKey = (c: any): string => {
                if (!c) return ''
                const raw = resolveFechaEfectivaCuota(c) || c?.fechaVencimiento
                if (!raw) return ''
                return normalizeDateKey(String(raw))
              }

              const pendiente = cuotas.find((c: any) => isCuotaNoPagada(c));

              if (pendiente) {
                const cuotasExigibles = cuotas.filter((c: any) => {
                  if (!isCuotaNoPagada(c)) return false;
                  const vtoKey = getCuotaVtoKey(c);
                  return vtoKey && vtoKey <= hoyBogota;
                });

                const totalExigible = cuotasExigibles.reduce((sum: number, c: any) => sum + Number(c.monto || 0), 0);
                const esMora = cuotasExigibles.some((c: any) => {
                  const vtoKey = getCuotaVtoKey(c)
                  return vtoKey && vtoKey < hoyBogota
                })

                const cuotaMasAntigua = cuotasExigibles.reduce((acc: any, c: any) => {
                  const vtoKey = getCuotaVtoKey(c);
                  if (!vtoKey) return acc;
                  if (!acc) return { c, vtoKey };
                  return vtoKey < acc.vtoKey ? { c, vtoKey } : acc;
                }, null as null | { c: any; vtoKey: string });

                const pendKey = getCuotaVtoKey(pendiente);
                const montoReal = Number(pendiente.monto || (Number(pendiente.montoCapital || 0) + Number(pendiente.montoInteres || 0)) || v.montoCuota || 0);
                const yaPagadoHoy = cuotas.some((c: any) => {
                  const s = String(c?.estado || '').toUpperCase();
                  if (s !== 'PAGADA' && s !== 'PAGADO') return false;
                  const pKey = c?.fechaPago ? getBogotaDateKey(new Date(c.fechaPago)) : '';
                  return pKey && pKey === hoyBogota;
                });
                
                return {
                  ...v,
                  montoCuota: totalExigible > 0 ? totalExigible : (montoReal > 0 ? montoReal : v.montoCuota),
                  proximaVisita: (pendiente.estado === 'PRORROGADA' && pendiente.fechaVencimientoProrroga)
                    ? pendiente.fechaVencimientoProrroga
                    : (pendiente.fechaVencimiento || v.proximaVisita),
                  cuotaActual: pendiente.numeroCuota,
                  cuotasTotales: cuotas.length,
                  estado: (yaPagadoHoy ? 'pagado' : (esMora ? 'en_mora' : 'pendiente')) as EstadoVisita,
                  enProrroga: pendiente.estado === 'PRORROGADA' || !!pendiente.fechaVencimientoProrroga,
                  fechaProrroga: pendiente.fechaVencimientoProrroga || undefined,
                  fechaOriginalVencimiento: pendiente.fechaVencimiento || undefined,
                  targetVencimiento: cuotaMasAntigua?.c ? ((String(cuotaMasAntigua.c?.estado || '').toUpperCase() === 'PRORROGADA' && cuotaMasAntigua.c?.fechaVencimientoProrroga)
                    ? cuotaMasAntigua.c.fechaVencimientoProrroga
                    : cuotaMasAntigua.c.fechaVencimiento) : v.targetVencimiento,
                };
              }
              return { ...v, cuotasTotales: cuotas.length };
            } catch (e) {
              console.warn('Error enriqueciendo visita principal:', e);
              return v;
            }
          },
          6,
        );

        const hoyBogota = getBogotaDateKey(new Date());
        
        // 1. Obtener recaudos hoy de forma masiva para confiabilidad total
        const pagosRecientesResp = await pagosService.obtenerPagos({ limit: 1000 });
        const pagosRecientes = (pagosRecientesResp as any)?.pagos || pagosRecientesResp || [];
        const recaudosHoyMap = buildRecaudosHoyMapByPrestamoId(pagosRecientes as any, hoyBogota)

        const { totalHistoricoByPrestamoId, ultimoPagoDateByPrestamoId } = indexPagosByPrestamoId(pagosRecientes as any)

        const finales = (applyRecaudoHoyToVisitas(visitasEnriquecidas as any[], { hoyBogotaKey: hoyBogota, recaudosHoyMap }) as any[]).map((v: any) => {
          const pid = v?.prestamoId
          if (!pid) return v
          return {
            ...v,
            recaudadoTotalClient: Number(totalHistoricoByPrestamoId[pid] || 0),
            fechaUltimoPago: Number(ultimoPagoDateByPrestamoId[pid] || 0),
          }
        })

        finales.sort((a: any, b: any) => {
          if (a.estado === 'pagado' && b.estado !== 'pagado') return 1;
          if (a.estado !== 'pagado' && b.estado === 'pagado') return -1;
          const ao = Number(a.ordenVisita ?? 0);
          const bo = Number(b.ordenVisita ?? 0);
          if (ao !== bo) return ao - bo;
          const aId = String(a.id || '');
          const bId = String(b.id || '');
          return aId.localeCompare(bId);
        });

        const hoyBogotaPrincipal = getBogotaDateKey(new Date());

        const visitasExigiblesHoy = (finales || []).filter((v: any) => isVisitaExigibleHoy(v, hoyBogotaPrincipal))
        const metaHoy = computeMetaHoyFromVisitas(visitasExigiblesHoy as any, hoyBogotaPrincipal)

        const finalesFiltrados = finales.filter((v: any) => {
          if (v?.estado === 'pagado') return false;
          // Preferir el flag calculado con la misma lógica del cobrador.
          if (v?.apareceHoy === true) return true;
          const proximaKey = v?.proximaVisita ? normalizeDateKey(String(v.proximaVisita)) : '';
          return v?.estado === 'en_mora' || v?.periodoRuta === 'DIA' || (proximaKey && proximaKey === hoyBogotaPrincipal);
        });

        setRutaStats((prev: any) => ({
          ...prev,
          meta: periodoCards === 'HOY' ? metaHoy : prev.meta,
        }));

        const prevList = visitasBaseRef.current
        const prevById = new Map<string, any>((Array.isArray(prevList) ? prevList : []).map((v: any) => [String(v?.id || ''), v]))

        const merged = (finalesFiltrados as any[]).map((v: any) => {
          const id = String(v?.id || '')
          const local = prevById.get(id)
          if (!local) return v

          const localRecaudoDia = Number(local?.recaudadoDelDia || 0)
          const nextRecaudoDia = Number(v?.recaudadoDelDia || 0)
          const recaudadoDelDia = Math.max(localRecaudoDia, nextRecaudoDia)

          const localRecaudoTotal = Number(local?.recaudadoTotalClient || 0)
          const nextRecaudoTotal = Number(v?.recaudadoTotalClient || 0)
          const recaudadoTotalClient = Math.max(localRecaudoTotal, nextRecaudoTotal)

          const estadoLocal = String(local?.estado || '')
          const estadoBackend = String(v?.estado || '')
          const saldoBackend = Number(v?.saldoTotal || 0)
          const proxBackend = String(v?.proximaVisita || '')
          const proxLocal = String(local?.proximaVisita || '')
          const esNuevaCuota = !!proxBackend && !!proxLocal && proxBackend !== proxLocal

          const estado = (estadoLocal === 'pagado' && !esNuevaCuota && saldoBackend > 0)
            ? 'pagado'
            : (estadoBackend as any)

          return {
            ...v,
            recaudadoDelDia,
            recaudadoTotalClient,
            estado,
          }
        })

        setVisitasBase(merged as any);
        setVisitasOrden((merged as any[]).map((v: any) => v.id));
      }
    } catch (error) {
      console.error('Error al cargar visitas de ruta (supervisor):', error);
    }
  }, [rutaId, cargarEstadisticasRuta]);



  // ---------------------------------------------------------------------------

  // WebSocket: suscripción a eventos en tiempo real via useRealtimeData.

  // ---------------------------------------------------------------------------



  // Handler completo: recarga visitas/cuotas al registrar pagos o nuevos préstamos

  const handlerFull = useCallback(async (payload?: any) => {

    const prestamoId = payload?.prestamoId || payload?.metadata?.prestamoId;
    const clienteId = payload?.clienteId || payload?.metadata?.clienteId;

    if (prestamoId && pagosInFlightRef.current.has(String(prestamoId))) {
      return
    }

    if (prestamoId) {
      const existeEnVisitas = visitasBaseRef.current.some((v: any) => v?.prestamoId === prestamoId);
      if (existeEnVisitas) {
        try {
          const p = await prestamosService.obtenerPrestamoPorId(prestamoId);
          const cuotas = await prestamosService.obtenerCuotas(prestamoId);
          const prox = cuotas.find((c: any) => c.estado !== 'PAGADA');

          const hoyBogota = getBogotaDateKey(new Date());

          let totalHoy = 0;
          if (prestamoId || clienteId) {
            const pagosResp = prestamoId
              ? await pagosService.obtenerPagos({ prestamoId, limit: 1000 })
              : await pagosService.obtenerPagos({ clienteId, limit: 1000 });

            const pagosCalc = (pagosResp?.pagos || []);
            totalHoy = pagosCalc.reduce((sum: number, pg: any) => {
              const raw = pg.fechaPago || pg.creadoEn;
              if (!raw) return sum;
              const pDateStr = typeof raw === 'string' ? normalizeDateKey(raw) : getBogotaDateKey(raw);
              return pDateStr === hoyBogota ? sum + Number(pg.montoTotal || 0) : sum;
            }, 0);
          }

          setVisitasBase((prev: any) => prev.map((v: any) => {
            if (v?.prestamoId !== prestamoId) return v;

            let nuevoEstado: any = 'pendiente';
            const proxKey = prox ? normalizeDateKey(String(resolveFechaEfectivaCuota(prox) || prox?.fechaVencimiento || '')) : ''
            if (proxKey && proxKey < hoyBogota) nuevoEstado = 'en_mora';
            else if (!prox) nuevoEstado = 'pagado';

            const cuotasHoyYVencidas = cuotas.filter((c: any) => {
              if (c.estado === 'ANULADA') return false;
              const pDate = c.fechaPago ? getBogotaDateKey(c.fechaPago) : '';
              if (c.estado === 'PAGADA') {
                return pDate === hoyBogota;
              }
              const dv = c.fechaVencimiento?.split('T')[0];
              return dv && dv <= hoyBogota;
            });
            const montoMetaActualizado = cuotasHoyYVencidas.reduce((s, c) => s + Number(c.monto || 0), 0);

            const baseV: any = {
              ...v,
              estado: nuevoEstado,
              montoCuota: montoMetaActualizado,
              proximaVisita: prox?.fechaVencimiento || v.proximaVisita,
              cuotaActual: prox?.numeroCuota || v.cuotaActual,
              saldoTotal: Number(p?.saldoPendiente || 0),
              recaudadoDelDia: totalHoy,
            };

            // Solo marcar como pagado cuando realmente completó la cuota del período (o ya no hay saldo)
            const cuota = Number(baseV.montoCuota || 0);
            if (Number(baseV.saldoTotal || 0) <= 0) {
              baseV.estado = 'pagado';
            } else if (cuota > 0 && totalHoy >= (cuota - 1) && totalHoy > 0) {
              baseV.estado = 'pagado';
            }

            // Limpiar historial de hoy si existe
            setHistorialRutas((prev: any) => {
              if (!prev || !prev[hoyBogota]) return prev;
              const next = { ...prev };
              delete next[hoyBogota];
              return next;
            });

            return baseV;
          }));
          
          cargarEstadisticasRuta();
          if (showMisClientes) await cargarMisCreditos();
          return;
        } catch (e) {
          // Fallback a recarga completa
        }
      }
    }

    await cargarVisitasRuta();

    if (showMisClientes) await cargarMisCreditos();

  }, [cargarVisitasRuta, showMisClientes, cargarMisCreditos, cargarEstadisticasRuta])



  // Handler ligero: solo refresca KPIs (dashboards no cambian cuotas)

  const handlerKpi = useCallback(() => {

    cargarEstadisticasRuta();

    if (showMisClientes) cargarMisCreditos();

  }, [cargarEstadisticasRuta, showMisClientes, cargarMisCreditos])



  useRealtimeData(['pagos_actualizados', 'prestamos_actualizados'], handlerFull)

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
          // Carga de estadísticas y recaudo (ahora retorna el mapa de recaudos por referencia)
          const recaudosMap = await cargarEstadisticasRuta();

          // Carga de visitas delegada al useCallback reutilizable, pasando el mapa de recaudos
          await cargarVisitasRuta(recaudosMap);
        }
      } catch (error) {
        console.error('Error al cargar datos de supervisor:', error);
      } finally {
        setIsLoading(false);
      }
    };

    cargarDatos();
  }, [router, rutaId, periodoCards, cargarVisitasRuta, cargarEstadisticasRuta]);



  useEffect(() => {

    cargarEstadisticasRuta()

  }, [cargarEstadisticasRuta])





  const sensors = useSensors(

    useSensor(PointerSensor, {

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



    // Al pagar la cuota, desaparece de la ruta hasta el próximo vencimiento
    const filtered = searched.filter(v => {
      // Desaparecer si ya está pagado o tiene recaudo hoy
      if (v.estado === 'pagado') return false;
      return true;
    })



    const sorted = filtered.sort((a, b) => {
      // 1. Pagados al final (aunque filtrados, por consistencia)
      if (a.estado === 'pagado' && b.estado !== 'pagado') return 1;
      if (a.estado !== 'pagado' && b.estado === 'pagado') return -1;

      if (a.periodoRuta === 'DIA' && b.periodoRuta === 'DIA') {
        return a.ordenVisita - b.ordenVisita;
      }

      // 3. Otros periodos: Ordenar por última fecha de pago (más antiguo arriba)
      if (a.fechaUltimoPago !== b.fechaUltimoPago) {
        return (a.fechaUltimoPago || 0) - (b.fechaUltimoPago || 0);
      }

      // 4. Fallback final al orden manual
      return a.ordenVisita - b.ordenVisita;
    });



    return sorted

  }, [visitasBase, searchQuery])



  const handleDragStart = useCallback((event: DragStartEvent) => {

    if (!rutaOperable) return

    setActiveId(event.active.id as string)

  }, [rutaOperable])



  const handleGuardarReprogramacion = useCallback(async (fecha: string, motivo: string, cuotaId?: string) => {

    if (!visitaReprogramar) return

    if (!fecha || !motivo) return



    try {

      // Enviar solicitud al backend — queda pendiente de aprobación del supervisor/admin o se autoaprueba

      if (visitaReprogramar.prestamoId) {

        if (cuotaId) {

          await prestamosService.solicitarReprogramacionCuota({

            prestamoId: visitaReprogramar.prestamoId,

            cuotaId,

            nuevaFecha: fecha,

            motivo,

          })

        } else {

          // Fallback al endpoint principal (el backend detectará la cuota automáticamente)

          await prestamosService.reprogramarPrestamo(visitaReprogramar.prestamoId, {

            fecha,

            motivo,

            cobradorId: userSession?.id || ''

          })

        }

      }



      // Marcar localmente como reprogramado (UI feedback)

      const [yyyy, mm, dd] = fecha.split('-')

      const fechaLabel = dd && mm ? `${dd}/${mm}` : fecha

      setVisitasBase((prev) =>

        prev.map((v) => {

          if (v.id !== visitaReprogramar.id) return v

          return { ...v, estado: 'reprogramado', proximaVisita: fechaLabel }

        })

      )



      toast.success('Solicitud de reprogramación enviada exitosamente', {

        description: `La cuota será revisada para reprogramarse al ${fechaLabel}`

      })



    } catch (err: any) {

      setModalAlerta({

        tipo: 'error',

        titulo: 'Error al solicitar',

        mensaje: err?.message || 'No se pudo enviar la solicitud de reprogramación.',

      })

    }



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



  useEffect(() => {

    let cancelled = false

    const rutaIdToCheck = (rutaInfo as any)?.id || rutaId

    if (!rutaIdToCheck) return



    ;(async () => {

      try {

        const resp = await routesApi.getActivacionHoy(rutaIdToCheck)

        if (cancelled) return

        setRutaActivadaHoy(Boolean(resp?.activadaHoy))

      } catch {

        // ignore

      }

    })()



    return () => {

      cancelled = true

    }

  }, [rutaId, (rutaInfo as any)?.id])

  const handleDragCancel = useCallback(() => {

    setActiveId(null)

  }, [])



  const getEstadoClasses = useCallback((estado: EstadoVisita) => {

    if (estado === 'pendiente') return 'bg-orange-50 text-orange-700 border-orange-100'

    if (estado === 'pagado') return 'bg-blue-50 text-blue-700 border-blue-100'

    if (estado === 'en_mora') return 'bg-rose-50 text-rose-700 border-rose-500/30'

    if (estado === 'ausente') return 'bg-gray-50 text-gray-600 border-gray-100'

    return 'bg-blue-50 text-blue-700 border-blue-100'

  }, [])



  const getPrioridadColor = useCallback((prioridad: 'alta' | 'media' | 'baja') => {

    if (prioridad === 'alta') return '#f97316'

    if (prioridad === 'media') return '#08557f'

    return '#94a3b8'

  }, [])



  const handleRegistrarPago = useCallback(async (visitaId: string, montoPagado: number, metodo: 'EFECTIVO' | 'TRANSFERENCIA', comprobante: File | null) => {

    const visita = visitasBase.find(v => v.id === visitaId)

    if (!visita?.prestamoId || !visita?.clienteId) {

      toast.error('No se pudo registrar el pago: visita inválida')

      return

    }

    if (!userSession?.id) {

      toast.error('No se pudo registrar el pago: sesión inválida')

      return

    }



    try {

      setIsLoading(true)

      pagosInFlightRef.current.add(String(visita.prestamoId))

      await prestamosService.registrarPago({

        prestamoId: visita.prestamoId,

        clienteId: visita.clienteId,

        monto: montoPagado,

        metodoPago: metodo,

        comprobante,

        esAbono: pagoInitialIsAbono,

        cobradorId: userSession.id,

      })



      // Marcar como pagado si completó la cuota del período (para que desaparezca del diario)

      const montoCuotaPrev = Number(visita.montoCuota || 0)
      const recPrev = Number((visita as any).recaudadoDelDia || 0)
      const recNuevo = recPrev + Number(montoPagado || 0)
      const cuotaCompletadaLocal = montoCuotaPrev > 0 && recNuevo >= (montoCuotaPrev - 1)

      setVisitasBase(prev => prev.map(v => {

        if (v.id !== visitaId) return v

        const cuotaCompletada = cuotaCompletadaLocal

        return {

          ...v,

          recaudadoDelDia: recNuevo,

          estado: cuotaCompletada ? 'pagado' : v.estado,

        } as any

      }))



      toast.success('Pago registrado')

      // Reconciliar una sola vez contra backend (y mantener lock durante la reconciliación)
      try {
        await cargarVisitasRuta()
        await cargarEstadisticasRuta()
        if (showMisClientes) await cargarMisCreditos()
      } catch {}

      setShowPaymentModal(false)

    } catch (e) {

      console.error('Error registrando pago (SupervisorCobroView):', e)

      toast.error('No se pudo registrar el pago')

    } finally {

      if (visita?.prestamoId) {
        pagosInFlightRef.current.delete(String(visita.prestamoId))
      }

      setIsLoading(false)

    }

  }, [visitasBase, userSession?.id, pagoInitialIsAbono, cargarVisitasRuta, showMisClientes, cargarMisCreditos, cargarEstadisticasRuta])

  const handleCrearCredito = useCallback(async (data: any) => {

    try {

      setIsLoading(true)

      

      const esContado = Boolean((data as any).ventaContado)

      const isArticulo = data.creditType === 'articulo'

      const freq = esContado ? 'MENSUAL' : (data.frecuenciaPago || 'DIARIO')



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

        creadoPorId: userSession?.id,

        cuotaInicial: data.cuotaInicialArticulo || 0,

        notas: isArticulo

          ? `${esContado ? 'Venta de contado' : 'Crédito de artículo'}: ${data.articuloNombre || ''}`

          : (data.notas || ''),

        tipoAmortizacion: isArticulo ? 'INTERES_SIMPLE' : (data.tipoInteres || 'INTERES_SIMPLE'),

        esContado: esContado

      }



      if (isArticulo) {

        payload.productoId = data.articuloId

        payload.precioProductoId = esContado ? undefined : data.precioProductoId

      }



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

    const recaudo = rutaStats.recaudo || 0

    const meta = rutaStats.meta || 0

    const efectividad = meta > 0 ? Math.round((recaudo / meta) * 100) : 0



    // Contar clientes pendientes reales: solo los que se debían cobrar hoy (o están en mora)
    // y ajustando estado según pagos del día.
    const toLocalKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const hoyStr = toLocalKey(new Date())

    const ajustarEstadoConPago = (v: any) => {
      if (Number(v.saldoTotal || 0) <= 0) return 'pagado'
      const pagadoHoy = Number((v as any).recaudadoDelDia || 0)
      const cuota = Number(v.montoCuota || 0)
      if (pagadoHoy >= cuota - 1 && pagadoHoy > 0) return 'pagado'
      const prox = v.proximaVisita ? (String(v.proximaVisita).includes('T') ? String(v.proximaVisita).split('T')[0] : String(v.proximaVisita)) : ''
      if (prox === hoyStr && pagadoHoy >= cuota - 1) return 'pagado'
      return v.estado
    }

    const debeCobrarHoyOMora = (v: any) => {
      if (v.estado === 'en_mora') return true
      const prox = (v as any).targetVencimiento || v.proximaVisita
      const proxKey = prox ? (String(prox).includes('T') ? String(prox).split('T')[0] : String(prox)) : ''
      return proxKey === hoyStr
    }

    const visitasHoy = (visitasBase || [])
      .map((v: any) => ({ ...v, estado: ajustarEstadoConPago(v) }))
      .filter((v: any) => debeCobrarHoyOMora(v))

    const clientesFaltantes = visitasHoy.filter((v: any) => v.estado === 'pendiente' || v.estado === 'en_mora').length



    // Emitir evento de cierre con datos completos (guarda en BD + notifica coordinadores)

    socket?.emit('ruta_completada_emit', {

      rutaNombre: userSession?.rutaAsignada || rutaId || 'Mi Ruta',

      cobradorNombre: `${userSession?.nombres || ''} ${userSession?.apellidos || ''}`.trim() || 'Supervisor',

      recaudo,

      meta,

      efectividad,

      clientesFaltantes,

      rutaId: rutaInfo?.id || rutaId || undefined,

    })



    setRutaCompletada(true)

    setShowConfirmCompleteModal(false)



    const mensajeCierre = clientesFaltantes > 0

      ? `Ruta cerrada. Faltaron ${clientesFaltantes} cliente${clientesFaltantes > 1 ? 's' : ''} por cobrar. Se alertó a la oficina.`

      : 'Ruta del día completada exitosamente. Se notificó al coordinador.'

    setCoordinadorToast(mensajeCierre)

    window.setTimeout(() => setCoordinadorToast(null), 5000)

  }, [socket, rutaId, rutaInfo, rutaStats, visitasBase, userSession])



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

                  <span className="font-medium text-slate-700">{userSession.rol}</span>

                  <span>•</span>

                  <span>Supervisando {rutaInfo?.nombre || userSession.rutaAsignada || 'Ruta'} {rutaInfo?.cobradorNombre ? `(${rutaInfo.cobradorNombre})` : ''}</span>

                </div>

              </div>

            </div>

          </div>

        </header>





        <RutaKpiSection periodo={periodoCards} onPeriodoChange={setPeriodoCards} rutaStats={rutaStats as any} />










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



                             {historyViewMode === 'DAYS' && (

                                <div className="space-y-3">

                                    <h3 className="text-sm font-bold text-slate-500 uppercase px-1">Historial de Días</h3>

                                     {historyDates.map(date => {

                                        const data = (historialRutas as Record<string, any>)[date];

                                        const isExpanded = selectedHistoryDate === date;

                                        const [y, m, d] = date.split('-');

                                        const dateObj = new Date(parseInt(y), parseInt(m)-1, parseInt(d));

                                        const dayName = dateObj.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });

                                        const isCompleted = data.visitas.length > 0 && (data.resumen.efectividad >= 95 || data.visitas.every((v: any) => v.estado === 'pagado'));



                                        return (

                                          <div key={date} 

                                               className={`rounded-2xl border transition-all overflow-hidden bg-white border-slate-200

                                                 ${isExpanded ? 'ring-1 ring-slate-300 shadow-md' : 'shadow-sm'}

                                               `}

                                          >

                                            <div 

                                              className="px-5 py-3 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"

                                              onClick={() => {
                                    setSelectedHistoryDate(isExpanded ? null : date)
                                    if (!isExpanded && !data.loaded) {
                                      void cargarHistorialFecha(date)
                                    }
                                  }}

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

                                                     <span>{data.visitas.length} Clientes Gestionados</span>

                                                     <span>Estado</span>

                                                  </div>

                                                  <div>

                                                     {!data.loaded ? (

                                                       <div className="flex flex-col items-center justify-center py-8 text-slate-400">

                                                         <div className="w-6 h-6 border-2 border-slate-300 border-t-[#08557f] rounded-full animate-spin mb-2" />

                                                         <span className="text-xs font-medium">Cargando detalles...</span>

                                                       </div>

                                                     ) : data.visitas.length === 0 ? (

                                                       <div className="flex flex-col items-center justify-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">

                                                          <History className="w-8 h-8 text-slate-300 mb-2 opacity-30" />

                                                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center px-4">No se registraron visitas ni pagos para este día</span>

                                                       </div>

                                                     ) : (

                                                       data.visitas.map((visita: VisitaRuta) => (

                                                           <StaticVisitaItem 

                                                           key={visita.id}

                                                           visita={visita}

                                                           onSelect={() => {}} onVerCliente={handleAbrirClienteInfo}

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



                              {/* MONTHS VIEW: días agrupados por mes, con tarjetas de clientes */}

                              {historyViewMode === 'MONTHS' && (() => {

                                if (historyMonthKeys.length === 0) {

                                  return (

                                    <div className="flex flex-col items-center justify-center py-12 text-slate-400">

                                      <History className="h-12 w-12 mb-3 opacity-20" />

                                      <p className="text-sm font-bold">Sin historial disponible</p>

                                    </div>

                                  );

                                }

                                return (

                                  <div className="space-y-4">

                                    {historyMonthKeys.map(monthKey => {

                                      const [my, mm] = monthKey.split('-');

                                      const monthObj = new Date(parseInt(my), parseInt(mm)-1, 1);

                                      const monthName = monthObj.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });

                                      const daysInMonth = historyByMonth[monthKey] || [];

                                      const isMonthExpanded = selectedHistoryMonth === monthKey;

                                      const monthRecaudo = Number(historyMonthSummaryByKey[monthKey]?.monthRecaudo || 0)
                                      const monthPagados = Number(historyMonthSummaryByKey[monthKey]?.monthPagados || 0)

                                      return (

                                        <div key={monthKey} className={`rounded-2xl border transition-all overflow-hidden bg-white border-slate-200 ${isMonthExpanded ? 'ring-1 ring-slate-300 shadow-md' : 'shadow-sm'}`}>

                                          {/* Header del mes */}

                                          <div

                                            className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"

                                            onClick={() => setSelectedHistoryMonth(isMonthExpanded ? null : monthKey)}

                                          >

                                            <div className="flex items-center gap-3">

                                              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shadow-sm ${isMonthExpanded ? 'bg-[#08557f] text-white' : 'bg-slate-100 text-slate-600'}`}>

                                                {mm}

                                              </div>

                                              <div>

                                                <div className="font-bold text-slate-900 capitalize">{monthName}</div>

                                                <div className="text-xs text-slate-500">

                                                  <span>{daysInMonth.length} días · </span>

                                                  <span>Recaudo: <b>${monthRecaudo.toLocaleString('es-CO')}</b></span>

                                                </div>

                                              </div>

                                            </div>

                                            <div className="flex items-center gap-3">

                                              <div className="px-2 py-1 rounded-lg text-[10px] font-bold bg-blue-50 text-blue-700">

                                                {monthPagados} cobros

                                              </div>

                                              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isMonthExpanded ? 'rotate-180' : ''}`} />

                                            </div>

                                          </div>



                                          {/* Días del mes expandibles */}

                                          {isMonthExpanded && (

                                            <div className="border-t border-slate-100">

                                              {daysInMonth.map(date => {

                                                const dayData = (historialRutas as any)[date];

                                                const isDayExpanded = selectedHistoryDate === date;

                                                const [dy, dm, dd] = date.split('-');

                                                const dateObj = new Date(parseInt(dy), parseInt(dm)-1, parseInt(dd));

                                                const dayName = dateObj.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric' });



                                                return (

                                                  <div key={date} className={`border-b border-slate-50 last:border-0 transition-all ${isDayExpanded ? 'bg-slate-50/40' : ''}`}>

                                                    {/* Sub-header del día */}

                                                    <div

                                                      className="px-5 py-3 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"

                                                      onClick={async () => {

                                                        if (!isDayExpanded && !dayData.loaded) {

                                                          await cargarHistorialFecha(date);

                                                        }

                                                        setSelectedHistoryDate(isDayExpanded ? null : date);

                                                      }}

                                                    >

                                                      <div className="flex items-center gap-3">

                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-[11px] ${isDayExpanded ? 'bg-[#08557f] text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>

                                                          {dd}

                                                        </div>

                                                        <div>

                                                          <span className="text-sm font-semibold text-slate-700 capitalize">{dayName}</span>

                                                          <div className="text-[11px] text-slate-400">

                                                            Recaudo: <b>${(dayData?.resumen?.recaudo || 0).toLocaleString('es-CO')}</b>

                                                            {dayData?.loaded && dayData.visitas.length > 0 && (

                                                              <span className="ml-2">&middot; {dayData.visitas.length} clientes</span>

                                                            )}

                                                          </div>

                                                        </div>

                                                      </div>

                                                      <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isDayExpanded ? 'rotate-180' : ''}`} />

                                                    </div>



                                                    {/* Tarjetas de clientes del día */}

                                                    {isDayExpanded && (

                                                      <div className="px-4 pb-4 space-y-2 animate-in slide-in-from-top-1 duration-150">

                                                        {!dayData.loaded ? (

                                                          <div className="flex flex-col items-center justify-center py-6 text-slate-400">

                                                            <div className="w-5 h-5 border-2 border-slate-300 border-t-[#08557f] rounded-full animate-spin mb-2" />

                                                            <span className="text-xs font-medium">Cargando clientes...</span>

                                                          </div>

                                                        ) : dayData.visitas.length === 0 ? (

                                                          <div className="text-center py-6 text-[11px] text-slate-400 font-medium">

                                                            Sin cobros registrados para este día

                                                          </div>

                                                        ) : (

                                                          dayData.visitas.map((visita: VisitaRuta) => (

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

                          v.cliente.toLowerCase().includes(searchQuery.toLowerCase()) ||

                          v.direccion.toLowerCase().includes(searchQuery.toLowerCase()),

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



                            <div className="space-y-3">

                              {filtradas.map((visita) => (

                                <StaticVisitaItem

                                  key={visita.id}

                                  visita={visita}

                                  allowClick={false}

                                  onVerCliente={handleAbrirClienteInfo}

                                  getEstadoClasses={getEstadoClasses}

                                  getPrioridadColor={getPrioridadColor}

                                  actions={

                                    <>

                                      <button

                                        onClick={(e) => {

                                          e.stopPropagation()

                                          if (!rutaOperable) return

                                          setVisitaPagoSeleccionadaId(visita.id)

                                          setPagoInitialIsAbono(false)

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

                                  <SortableVisita

                                    key={visita.id}

                                    visita={visita}

                                    onSelect={(id) =>

                                      setVisitaSeleccionada(

                                        id === visitaSeleccionada ? null : id,

                                      )

                                    }

                                    onVerCliente={handleAbrirClienteInfo}

                                    getEstadoClasses={getEstadoClasses}

                                    disableSort={rutaCompletada || !isPersonal}

                                    isSelected={visita.id === visitaSeleccionada}

                                    actions={

                                      <>

                                        <button

                                          onClick={(e) => {

                                            e.stopPropagation()

                                            if (!rutaOperable) return

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

                                            setVisitaReprogramar(visita)

                                            setShowReprogramModal(true)

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

            nextPagoMonto={nextPagoMonto ?? (visitaClienteSeleccionada.montoCuota || 0)}

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
              const hoyBogota = getBogotaDateKey(new Date())
              return isVisitaExigibleHoy(v, hoyBogota)
            })}

            initialOrder={visitasOrden}

            onClose={() => setShowRutaProvisional(false)}

            getEstadoClasses={getEstadoClasses}

          />

        )}



        {showPaymentModal && visitaPagoSeleccionadaId && (

          <PagoModal

            visita={visitasCobrador.find((v: any) => v.id === visitaPagoSeleccionadaId) || ({} as any)}

            tipo={pagoInitialIsAbono ? 'ABONO' : 'PAGO'}

            onClose={() => {

              setShowPaymentModal(false)

              setVisitaPagoSeleccionadaId(null)

            }}

            onConfirm={async (monto: number, metodo: 'EFECTIVO' | 'TRANSFERENCIA', comprobante: File | null) => {

              const visitaId = visitaPagoSeleccionadaId

              // Cerrar inmediatamente para UX
              setShowPaymentModal(false)
              setVisitaPagoSeleccionadaId(null)

              // Registrar en background (y actualizar optimista)
              void handleRegistrarPago(visitaId, Number(monto || 0), metodo, comprobante)

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

          onConfirm={async (data) => {
            if (!rutaId) return

            const cobradorIdReal = (rutaInfo as any)?.cobradorId || userSession?.id || ''
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
                ...(data.categoriaId ? { categoriaId: data.categoriaId } : {}),
              })

              try {
                const hoyClave = getBogotaDateKey(new Date())
                const saldo = await obtenerSaldoDisponibleRuta(rutaId as string, hoyClave)
                setRutaStats((prev: any) => ({
                  ...prev,
                  gastos: Number((saldo as any)?.gastosDelDia ?? prev.gastos),
                }))
              } catch {
                setRutaStats((prev: any) => ({ ...prev, gastos: Number(prev?.gastos || 0) + Number(data.valor || 0) }))
              }

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

                setVisitaReprogramar(visita)

                setShowReprogramModal(true)

              } else if (pendingAction === 'PAGO') {

                setVisitaPagoSeleccionadaId(visita.id)

                setPagoInitialIsAbono(false)

                setShowPaymentModal(true)

              } else if (pendingAction === 'ABONO') {

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



        {/* Floating Action Button (FAB) - siempre visible para supervisor */}

        <FloatingActionMenu actions={[

            { label: 'Crear Crédito', icon: <CreditCard className="h-5 w-5" />, onClick: () => { setShowCreditModal(true); } },

            { label: 'Nuevo Cliente', icon: <UserPlus className="h-5 w-5" />, onClick: () => { setShowNewClientModal(true); } },

            { label: 'Registrar abono', icon: <RefreshCw className="h-5 w-5" />, color: 'orange', onClick: () => { setPendingAction('ABONO'); setShowClientSelector(true); } },

            { label: 'Registrar pago', icon: <DollarSign className="h-5 w-5" />, onClick: () => { setPendingAction('PAGO'); setShowClientSelector(true); } },

            { label: 'Pedir Base', icon: <Wallet className="h-5 w-5" />, color: 'emerald', onClick: () => { setShowBaseModal(true); } },

            { label: 'Gastos', icon: <ReceiptText className="h-5 w-5" />, color: 'rose', onClick: () => { setShowGastoModal(true); } },

          ] as FabAction[]} />



        {showConfirmCompleteModal && (

          <ConfirmModal

            isOpen={showConfirmCompleteModal}

            onClose={() => setShowConfirmCompleteModal(false)}

            onConfirm={handleCompletarRuta}

            title="¿Finalizar ruta supervisada?"

            message="Al confirmar, se enviará el reporte de rendimiento y clientes pendientes a la oficina central. Esta acción bloqueará la modificación de créditos y pagos por el resto del día."

            confirmText="Sí, Finalizar Ruta"

            cancelText="No, Volver"

            variant="danger"

          />

        )}



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

      </div>

    </div>

  )

}



export default SupervisorCobroView

