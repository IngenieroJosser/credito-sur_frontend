'use client'

import { logger } from '@/lib/logger'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'

import {
  CheckCircle2,
  X,
  XCircle,
  ArrowLeft,
  Search,
  Filter,
  Wallet,
  DollarSign,
  Calendar,
  FileText as FileTextIcon,
  ChevronRight,
  TrendingUp,
  Sparkles,
  MapPin,
  AlertCircle,
  UserPlus,
  Plus,
  User,
  Phone,
  CreditCard,
  Fingerprint,
  CalendarDays,
  Star,
  History,
  Loader2,
  ChevronDown,
  FileDown,
  Eye,
  Shield
} from 'lucide-react'

import { formatCurrency, formatMilesCOP } from '@/lib/utils'

import Link from 'next/link'

import { useRouter } from 'next/navigation'

import { RutaDetalleMock } from '@/lib/rutas-data'

import { routesService } from '@/services/routes-service'

import { rutasService, type DailyVisitsResponse } from '@/services/rutas-service'

import { clientesService } from '@/services/clientes-service'

import { useNotification } from '@/components/providers/NotificationProvider'



import PagoModal from '@/components/cobranza/PagoModal'

import EstadoCuentaModal from '@/components/cobranza/EstadoCuentaModal'

import ReprogramarModal from '@/components/cobranza/ReprogramarModal'

import AusenteModal from '@/components/cobranza/AusenteModal'

import { VisitaRuta, EstadoVisita } from '@/lib/types/cobranza'

import { StaticVisitaItem, SeleccionClienteModal, Portal } from '@/components/dashboards/shared/CobradorElements'

import NuevoClienteModal from '@/components/clientes/NuevoClienteModal'

import { useAuth } from '@/hooks/useAuth'

import ConfirmModal from '@/components/ui/ConfirmModal'

import CrearCreditoModal from '@/components/dashboards/shared/CrearCreditoModal'
import { buildCrearPrestamoPayload } from '@/lib/creditos/crear-prestamo-payload'

import {
  buildReprogramacionCierrePendienteKey,
  prestamosService,
} from '@/services/prestamos-service'

import { pagosService } from '@/services/pagos-service'

import { FrecuenciaPago } from '@/types/enums'

import { obtenerSaldoDisponibleRuta } from '@/services/contabilidad-service'

import RutaHeader from '@/components/rutas/RutaHeader'

import RutaKpiSection from '@/components/dashboards/shared/RutaKpiSection'

import { CierrePendienteBanner } from '@/components/rutas/CierrePendienteBanner'
import { CierrePendienteDetalleModal } from '@/components/rutas/CierrePendienteDetalleModal'
import { useCierrePendienteDetalle } from '@/hooks/useCierrePendienteDetalle'
import type { CierrePendienteDetalle } from '@/types/rutas/cierre-pendiente'

import { HistorialDia, mapNivelRiesgo, mapFrecuenciaToPeriodo } from '@/lib/types/cobranza'

import { exportService } from '@/services/export-service'

import { toast } from 'sonner'

import { useRealtimeData } from '@/hooks/useRealtimeData'
import { useRutaHistorial } from '@/hooks/useRutaHistorial'
import { useCierrePendienteRuta } from '@/hooks/useCierrePendienteRuta'
import ClienteInfoModal from '@/components/cobranza/ClienteInfoModal'
import { formatShortDate } from '@/lib/utils/format'
import { buildRegularizedPaymentTarget, computeMontoExigibleHastaHoyFromCuotas, computeMontoNominalHastaHoyFromCuotas, computeRutaHoyUiStatsFromVisitas, resolveRutaHoyKpiStats, esDomingoBogota, getBogotaDateKey, getBogotaRangeByPeriod, getPagoBogotaDateKey, isCuotaNoPagada, isTodayOrPastBogota, isVisitaExigibleHoy, normalizeDateKey, resolveFechaEfectivaCuota, shouldExcludeVisitaFromOperationalMeta, shouldMarkVisitaAsPagado, shouldShowVisitaEnRutaHoy, toBogotaDateTimeOffsetIso, resolveProximaCuotaFromPrestamo, computeDiasMoraFromCuotas, resolveCuotaNormalOperativa, resolveCuotaIdFromVisitaLike } from '@/lib/rutas-core'

import { mapAsignacionesToVisitasLite } from '@/lib/ruta-visitas-mapper'
import { buildRecaudosHoyMapByPrestamoId, computeMontoCuotaPendienteDespuesDeRecaudo, indexPagosByPrestamoId, mergeVisitasPreservingLocalRecaudo, sumMontoTotalPagosByBogotaDateKey } from '@/lib/ruta-recaudos'
import { mapWithConcurrency, memoizePromiseByKey } from '@/lib/async-utils'
import { buildHistorialDiaFromBackend, hasGestionHistorial, isPagoForHistorialFecha, resolveRiesgoObligacion } from '@/lib/ruta-historial'

interface GastoRuta {
  id: string
  tipo: 'OPERATIVO' | 'TRANSPORTE' | 'OTRO'
  descripcion: string
  valor: number
  hora: string
}

interface RutaClientProps {
  initialRuta: RutaDetalleMock | null
  rutaId?: string
}

type RutaClientLoadedProps = {
  initialRuta: RutaDetalleMock
  rutaData: RutaDetalleMock
  rutaId?: string
  rutaCompletada: boolean
  setRutaCompletada: React.Dispatch<React.SetStateAction<boolean>>
  currentUser: any
  onRutaRefresh?: (prestamoId?: string) => Promise<void> | void
}

const RutaClientLoaded = ({
  initialRuta,
  rutaData,
  rutaId,
  rutaCompletada,
  setRutaCompletada,
  currentUser,
  onRutaRefresh,
}: RutaClientLoadedProps) => {
  const { showNotification } = useNotification()
  const router = useRouter()

  const [gastos] = useState<GastoRuta[]>([])

  const [isGastoModalOpen, setIsGastoModalOpen] = useState(false)
  const [nuevoGasto, setNuevoGasto] = useState({ tipo: 'OPERATIVO', descripcion: '', valor: '' })

  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [periodoCards, setPeriodoCards] = useState<'HOY' | 'SEM' | 'MES' | 'AÑO'>('HOY')

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

  const computeHoyBogotaKey = useCallback(() => {
    const d = new Date()
    return getBogotaDateKey(d)
      || `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }, [])

  const [hoyBogotaKey, setHoyBogotaKey] = useState<string>(() => computeHoyBogotaKey())
  const [dailyVisitsHoy, setDailyVisitsHoy] = useState<DailyVisitsResponse | null>(null)

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
  const [rutaStatsCards, setRutaStatsCards] = useState<{
    recaudo: number
    meta: number
    eficiencia: number
    gastos: number
    base: number
    pendiente?: number
  }>({
    recaudo: Number((initialRuta as any)?.estadisticas?.cobranzaDelDia || 0),
    meta: Number((initialRuta as any)?.estadisticas?.metaDelDia || 0),
    eficiencia: Number((initialRuta as any)?.estadisticas?.avanceDiario || 0),
    gastos: 0,
    base: 0,
  })

  const getDatesByPeriod = useCallback((period: 'HOY' | 'SEM' | 'MES' | 'AÑO') => {
    return getBogotaRangeByPeriod(period)
  }, [])

  const [showClienteSelector, setShowClienteSelector] = useState(false)
  const [showNewClientModal, setShowNewClientModal] = useState(false)
  const [showCrearCreditoModal, setShowCrearCreditoModal] = useState(false)
  const [selectedClienteForCredito, setSelectedClienteForCredito] = useState<VisitaRuta | null>(null)
  const [defaultClienteId, setDefaultClienteId] = useState<string | null>(null)
  const [showCrearCreditoPrompt, setShowCrearCreditoPrompt] = useState(false)
  const [isExportingPdf, setIsExportingPdf] = useState(false)

  const [vistaRuta, setVistaRuta] = useState<'ACTUAL' | 'HISTORIAL' | 'MIS_CLIENTES'>('ACTUAL')
  const [enrichNonce, setEnrichNonce] = useState(0)
  
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

  const [historialRutas, setHistorialRutas] = useState<Record<string, HistorialDia>>({} as any)
  const historialRutasRef = useRef<Record<string, HistorialDia>>({} as any)

  useEffect(() => {
    historialRutasRef.current = historialRutas
  }, [historialRutas])

  const [periodoRutaFiltro, setPeriodoRutaFiltro] = useState<'TODOS' | 'DIA' | 'SEMANA' | 'QUINCENA' | 'MES'>('TODOS')

  const [historyViewMode, setHistoryViewMode] = useState<'DAYS' | 'MONTHS'>('DAYS')
  const [selectedHistoryDate, setSelectedHistoryDate] = useState<string | null>(null)
  const [selectedHistoryMonth, setSelectedHistoryMonth] = useState<string | null>(null)
  const [historyFrecuenciaFiltro, setHistoryFrecuenciaFiltro] = useState<'TODOS' | 'DIA' | 'SEMANA' | 'QUINCENA' | 'MES'>('TODOS')

  const [gruposColapsados, setGruposColapsados] = useState<Record<string, boolean>>({})
  const toggleGrupo = useCallback((key: string) => {
    setGruposColapsados((prev) => ({
      ...(prev || {}),
      [key]: !(prev || {})[key],
    }))
  }, [])

  const visitasCobradorRef = useRef<VisitaRuta[]>([])
  const lastEnrichKeyRef = useRef('')

  const historial = useRutaHistorial({
    rutaId,
    cobradorId: rutaData?.cobradorId,
    getVisitasHoy: () => visitasCobradorRef.current,
    fetchPagos: () => pagosService.obtenerPagos({ limit: 5000 }) as any,
    loadDay: async (fechaClave: string) => {
      const visitasResp = await rutasService.obtenerVisitasDelDia(rutaId as any, fechaClave)
      const saldo = await obtenerSaldoDisponibleRuta(rutaId as any, fechaClave)

      let pagosDelDia: any[] = []
      try {
        const pagosResp = await pagosService.obtenerPagos({ limit: 5000 })
        const pagosData = (pagosResp as any)?.pagos || pagosResp || []
        pagosDelDia = (Array.isArray(pagosData) ? pagosData : []).filter((p: any) => {
          const cobradorMatch = rutaData?.cobradorId ? (p?.cobradorId === rutaData.cobradorId) : true
          return isPagoForHistorialFecha(p, fechaClave) && cobradorMatch
        })
      } catch {
        pagosDelDia = []
      }

      return buildHistorialDiaFromBackend({ fechaClave, visitasResp, saldo, pagosDelDia })
    },
    preferLoadDayForToday: true,
  })

  useEffect(() => {
    if (!historial.historialRutas) return
    setHistorialRutas(historial.historialRutas as any)
  }, [historial.historialRutas])

  const historyDates = historial.historyDates

  const historyByMonth = useMemo(() => {
    const byMonth: Record<string, string[]> = {}
    for (const date of historyDates || []) {
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
        return sum + (((dayData?.visitas) || []).filter((v: any) => v.estado === 'pagado').length)
      }, 0)
      summary[monthKey] = { monthRecaudo, monthPagados }
    }

    return summary
  }, [historialRutas, historyByMonth, historyMonthKeys])

  const cargarHistorialFecha = historial.cargarHistorialFecha

  const cuotasHistorialCacheRef = useRef<Map<string, any[]>>(new Map())

  const enriquecerHistorialDiaConCuotas = useCallback(async (fechaClave: string) => {
    const dayData = (historialRutasRef.current as any)?.[fechaClave]
    if (!dayData?.loaded) return
    const visitasRaw = Array.isArray(dayData?.visitas) ? dayData.visitas : []

    const visitasConPrestamo = visitasRaw.filter((v: any) => !!String(v?.prestamoId || ''))
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
      visitasRaw,
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
  }, [])

  useEffect(() => {
    if (vistaRuta !== 'HISTORIAL') return
    const hoy = hoyBogotaKey
    const dayData = (historialRutasRef.current as any)?.[hoy]
    if (!dayData?.loaded) return
    void enriquecerHistorialDiaConCuotas(hoy)
  }, [vistaRuta, hoyBogotaKey, enriquecerHistorialDiaConCuotas])

  useEffect(() => {
    if (vistaRuta !== 'HISTORIAL') return
    if (!selectedHistoryDate) return
    void enriquecerHistorialDiaConCuotas(selectedHistoryDate)
  }, [vistaRuta, selectedHistoryDate, enriquecerHistorialDiaConCuotas])



  useEffect(() => {

    if (vistaRuta !== 'HISTORIAL' || !initialRuta?.id) return;

    const hoy = hoyBogotaKey;
    const existing = (historialRutas || {})[hoy];

    if (!existing || (!existing.loaded)) {

      cargarHistorialFecha(hoy);

    }

  }, [vistaRuta, rutaId, historialRutas, cargarHistorialFecha]);  // === Mapeo de asignaciones a modelo de UI (VisitaRuta) ===
  // === Mapeo de asignaciones a modelo de UI (VisitaRuta) ===
  const mapearAsignacionesAVisitas = useCallback((data: any) => {
    const asignaciones = data?.asignaciones || data?.asignacionesRuta;
    if (!asignaciones || !Array.isArray(asignaciones)) return [];

    const hoyKey = hoyBogotaKey
    const visitasRaw = mapAsignacionesToVisitasLite({
      asignaciones,
      hoyKey,
      cobradorId: initialRuta?.cobradorId || '',
    }) as any[]

    const idsProcesados = new Set<string>()
    const firstPass = visitasRaw.flatMap((v: any) => {
      const uniqueKey = v?.prestamoId ? `loan-${v.prestamoId}` : `client-${v.clienteId}`
      if (idsProcesados.has(uniqueKey)) return []
      idsProcesados.add(uniqueKey)
      
      const cuotaId = resolveCuotaIdFromVisitaLike(
        v,
        (v as any)?.prestamo,
        (v as any)?.cuotaObjetivo || (v as any)?.proximaCuota,
      )
      
      return [
        {
          ...v,
          // Ajuste de forma admin: mantiene el mismo shape que usaba antes.
          cobradorId: initialRuta?.cobradorId || '',
          cuotaId,
          cuotaObjetivoId: cuotaId,
          cuotaObjetivoPrestamoId: cuotaId,
        },
      ]
    })

    const clientesConPrestamo = new Set(firstPass.filter((v: any) => v.prestamoId).map((v: any) => v.clienteId))
    return firstPass.filter((v: any) => {
      if (!v.prestamoId && clientesConPrestamo.has(v.clienteId)) return false
      return true
    }) as VisitaRuta[]
  }, [initialRuta?.cobradorId, hoyBogotaKey]);

  const [visitasCobrador, setVisitasCobrador] = useState<VisitaRuta[]>(() => mapearAsignacionesAVisitas(initialRuta));

  useEffect(() => {
    visitasCobradorRef.current = visitasCobrador
  }, [visitasCobrador])

  const mapDailyVisitsResponseToVisitas = useCallback((resp: DailyVisitsResponse | null | undefined): VisitaRuta[] => {
    const obligaciones = Array.isArray((resp as any)?.obligaciones)
      ? (resp as any).obligaciones
      : []

    const rows = obligaciones.length > 0
      ? obligaciones
      : (Array.isArray((resp as any)?.visitas) ? (resp as any).visitas : [])

    const mapped = rows.map((row: any, idx: number) => {
      const visita = row?.visita || row || {}
      const c = row?.cliente || visita?.cliente || {}
      const p = row?.prestamo || visita?.prestamo || visita?.prestamos?.[0] || {}
      const cuotaObjetivo =
        row?.cuotaObjetivo ||
        p?.cuotaObjetivo ||
        visita?.cuotaObjetivo ||
        p?.proximaCuota ||
        visita?.proximaCuota ||
        null
      const proximaCuota = p?.proximaCuota || cuotaObjetivo
      const montoMetaPendiente = Number(
        row?.montoMetaOperativaPendiente ??
          p?.montoMetaOperativaPendiente ??
          cuotaObjetivo?.saldoExigibleEnFechaOperativa ??
          proximaCuota?.montoNominal ??
          proximaCuota?.monto ??
          0,
      )
      const recaudadoDelDia = Number(
        row?.recaudadoDelDia ??
          p?.recaudadoDelDia ??
          p?.recaudadoHoy ??
          visita?.recaudadoDelDia ??
          0,
      )
      const montoCuotaNormal = Number(
        cuotaObjetivo?.montoNominal ??
          cuotaObjetivo?.montoCuota ??
          cuotaObjetivo?.monto ??
          proximaCuota?.montoNominal ??
          proximaCuota?.monto ??
          montoMetaPendiente,
      )
      const montoCuota = montoMetaPendiente > 0
        ? montoMetaPendiente
        : Math.max(0, montoCuotaNormal - Number(cuotaObjetivo?.montoPagado || 0))
      const fechaEfectiva =
        cuotaObjetivo?.fechaEfectiva ||
        p?.fechaEfectiva ||
        proximaCuota?.fechaEfectiva ||
        proximaCuota?.fechaVencimientoProrroga ||
        proximaCuota?.fechaVencimiento ||
        hoyBogotaKey
      const estadoGestion = String(row?.estadoGestion || p?.estadoGestion || '').toUpperCase()
      const estadoCuota = String(cuotaObjetivo?.estadoActual || cuotaObjetivo?.estado || proximaCuota?.estado || '').toUpperCase()
      const estadoCalculado: EstadoVisita =
        recaudadoDelDia > 0 || estadoGestion === 'PAGO_REGISTRADO' || estadoCuota === 'PAGADA'
          ? 'pagado'
          : cuotaObjetivo?.enMoraEnFechaOperativa || estadoCuota === 'VENCIDA'
            ? 'en_mora'
            : 'pendiente'
      const esArticulo = p?.tipo === 'ARTICULO' || p?.tipoPrestamo === 'ARTICULO'
      const cuotaId = String(
        row?.cuotaObjetivoId ||
          cuotaObjetivo?.id ||
          proximaCuota?.id ||
          visita?.cuotaObjetivoId ||
          '',
      )
      const frecuencia = p?.frecuenciaPago || 'DIARIO'
      const nombreCliente = `${c?.nombres || ''} ${c?.apellidos || ''}`.trim()
      
      // Calcular monto vencido acumulado (factor dominante para riesgo)
      const montoVencidoAcumulado = Number(
        row?.montoMoraAcumulada ??
        row?.montoVencidoAcumulado ??
        row?.saldoVencidoAcumulado ??
        row?.saldoOperativoJornada ??
        p?.montoMoraAcumulada ??
        p?.montoVencidoAcumulado ??
        p?.saldoVencidoAcumulado ??
        p?.saldoOperativoJornada ??
        cuotaObjetivo?.montoMoraAcumulada ??
        cuotaObjetivo?.montoVencidoAcumulado ??
        cuotaObjetivo?.saldoVencidoAcumulado ??
        (
          estadoCalculado === 'en_mora'
            ? Number(p?.saldoPendiente ?? row?.saldoPendiente ?? row?.saldoTotal ?? 0)
            : 0
        )
      )
      
      // Calcular riesgo de obligación/crédito (no del cliente)
      const diasMora = Number(cuotaObjetivo?.diasMora || p?.diasMora || 0)
      const cuotasVencidasVal = Number(row?.cuotasVencidas ?? cuotaObjetivo?.cuotasVencidas ?? 0)
      const esProvisional = Boolean(p?.esProvisional) || String(p?.estadoAprobacion || '').toUpperCase() === 'PENDIENTE'
      
      // Enriquecer row con montoVencidoAcumulado para que resolveRiesgoObligacion lo use
      const rowEnriquecido = { ...row, montoVencidoAcumulado }
      
      const nivelObligacion = resolveRiesgoObligacion({
        row: rowEnriquecido,
        prestamo: p,
        cuotaObjetivo,
        estadoCalculado,
        diasMora,
        cuotasVencidas: cuotasVencidasVal,
        esProvisional,
      })
      const nivelCliente = c?.nivelRiesgo || visita?.nivelRiesgo || 'VERDE'
      
      // Priorizar riesgo de obligación sobre riesgo de cliente
      const nivel = nivelObligacion
      
      return {
        id: `${visita?.asignacionId || row?.asignacionId || 'daily'}-${p?.id || cuotaId || idx}`,
        cliente: nombreCliente || row?.nombreCliente || 'Cliente',
        direccion: c?.direccion || visita?.direccion || 'Sin dirección registrada',
        telefono: c?.telefono || visita?.telefono || '',
        horaSugerida: '08:00 AM',
        montoCuota,
        montoCuotaNormal,
        montoCuotaPendiente: montoMetaPendiente > 0 ? montoMetaPendiente : montoCuota,
        montoMoraAcumulada: montoVencidoAcumulado,
        montoVencidoAcumulado,
        saldoVencidoAcumulado: montoVencidoAcumulado,
        cuotasVencidas: Number(row?.cuotasVencidas ?? cuotaObjetivo?.cuotasVencidas ?? 0),
        saldoTotal: estadoCalculado === 'pagado' ? 0 : Number(p?.saldoPendiente || 0),
        estado: estadoCalculado,
        estadoVisita: row?.estadoVisita || p?.estadoVisita || visita?.estadoVisita || undefined,
        notasVisita: row?.notasVisita || p?.notasVisita || visita?.notasVisita || undefined,
        proximaVisita: fechaEfectiva,
        targetVencimiento: proximaCuota?.fechaVencimiento || cuotaObjetivo?.fechaVencimiento,
        ordenVisita: Number(visita?.ordenVisita || row?.ordenVisita || idx + 1),
        prioridad: nivel === 'ROJO' || nivel === 'LISTA_NEGRA' ? 'alta' : 'media' as any,
        nivelRiesgo: mapNivelRiesgo(nivel) as any,
        diasMora,
        cobradorId: rutaData?.cobradorId || initialRuta.cobradorId,
        periodoRuta: mapFrecuenciaToPeriodo(frecuencia as any) as any,
        clienteId: c?.id || visita?.clienteId || '',
        prestamoId: p?.id || row?.prestamoId || '',
        tipoPrestamo: esArticulo ? 'ARTICULO' : 'EFECTIVO',
        articuloNombre: esArticulo ? (p?.articulo || p?.producto?.nombre || 'Artículo') : 'Préstamo',
        cuotaActual: Number(cuotaObjetivo?.numeroCuota || proximaCuota?.numeroCuota || 1),
        cuotasTotales: Number(p?.cantidadCuotas || 0),
        cuotaId,
        cuotaObjetivoId: cuotaId,
        cuotaObjetivoPrestamoId: cuotaId,
        cuotaObjetivo,
        proximaCuota,
        pendienteAprobacion: Boolean(p?.esProvisional) || String(p?.estadoAprobacion || '').toUpperCase() === 'PENDIENTE',
        estadoAprobacion: p?.estadoAprobacion || null,
        estadoEfectoProvisional: p?.estadoEfectoProvisional || null,
        esProvisional: Boolean(p?.esProvisional),
        esRevertido: Boolean(p?.esRevertido),
        etiquetaRevision: p?.etiquetaRevision || null,
        enProrroga: String(proximaCuota?.estado || cuotaObjetivo?.estadoActual || '').toUpperCase() === 'PRORROGADA',
        fechaProrroga: proximaCuota?.fechaVencimientoProrroga || cuotaObjetivo?.fechaVencimientoProrroga || null,
        fechaOriginalVencimiento: proximaCuota?.fechaVencimiento || cuotaObjetivo?.fechaVencimiento || null,
        recaudadoDelDia,
      } as VisitaRuta
    })

    const seen = new Set<string>()
    const uniques = mapped.filter((v: any) => {
      const key = String(v?.prestamoId || v?.clienteId || v?.id || '')
      if (!key) return true
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    return uniques.sort((a: any, b: any) => {
      if (a.estado === 'pagado' && b.estado !== 'pagado') return 1
      if (a.estado !== 'pagado' && b.estado === 'pagado') return -1
      const ao = Number(a.ordenVisita ?? 0)
      const bo = Number(b.ordenVisita ?? 0)
      if (ao !== bo) return ao - bo
      return String(a.id || '').localeCompare(String(b.id || ''))
    })
  }, [hoyBogotaKey, initialRuta.cobradorId, rutaData?.cobradorId])

  const cargarDailyVisitsHoy = useCallback(async () => {
    if (!rutaId) {
      setDailyVisitsHoy(null)
      return
    }

    try {
      const resp = await rutasService.obtenerVisitasDelDia(rutaId as any, hoyBogotaKey)
      setDailyVisitsHoy(resp)

      const mapped = mapDailyVisitsResponseToVisitas(resp)
      if (mapped.length > 0) {
        // Merge selectivo: mapped es la fuente canónica, solo preservar campos locales de recaudo/gestión
        const prevByPrestamoId = new Map(
          (visitasCobradorRef.current || [])
            .filter((v: any) => v?.prestamoId)
            .map((v: any) => [String(v.prestamoId), v]),
        )

        const merged = mapped.map((next: any) => {
          const prev = prevByPrestamoId.get(String(next?.prestamoId || ''))

          if (!prev) return next

          return {
            ...next,

            // preservar solo estado local de cobro/gestión
            recaudadoDelDia: Number(prev?.recaudadoDelDia || 0) > 0
              ? prev.recaudadoDelDia
              : next.recaudadoDelDia,

            recaudadoTotalClient: prev?.recaudadoTotalClient ?? next.recaudadoTotalClient,
            fechaUltimoPago: prev?.fechaUltimoPago ?? next.fechaUltimoPago,

            estadoVisita: prev?.estadoVisita ?? next.estadoVisita,
            notasVisita: prev?.notasVisita ?? next.notasVisita,
          }
        })

        visitasCobradorRef.current = merged as any
        setVisitasCobrador(merged as any)
        setEnrichNonce((n) => n + 1)
      }
    } catch (error) {
      console.error('Error cargando daily-visits de ruta actual:', error)
      setDailyVisitsHoy(null)
    }
  }, [rutaId, hoyBogotaKey, mapDailyVisitsResponseToVisitas])

  useEffect(() => {
    void cargarDailyVisitsHoy()
  }, [cargarDailyVisitsHoy, rutaData])

  // Mantener visitas actualizadas cuando cambian los datos de la ruta (WebSocket)
  useEffect(() => {
    if (!rutaData) return

    const tieneDailyVisits =
      (Array.isArray((dailyVisitsHoy as any)?.obligaciones) &&
        (dailyVisitsHoy as any).obligaciones.length > 0) ||
      (Array.isArray((dailyVisitsHoy as any)?.visitas) &&
        (dailyVisitsHoy as any).visitas.length > 0)

    if (tieneDailyVisits) return

    const nextList = mapearAsignacionesAVisitas(rutaData)
    const merged = mergeVisitasPreservingLocalRecaudo(visitasCobradorRef.current as any, nextList as any)
    visitasCobradorRef.current = merged as any
    setVisitasCobrador(merged as any);
  }, [rutaData, dailyVisitsHoy, mapearAsignacionesAVisitas]);





  // Cargar historial de pagos para enriquecer las visitas

  useEffect(() => {

    if (visitasCobrador.length === 0) return;

    const enrichKey = JSON.stringify({
      nonce: enrichNonce,
      items: visitasCobrador.map((v: any) => ({
        id: v?.id,
        prestamoId: v?.prestamoId,
        recaudo: v?.recaudadoDelDia,
        cuota: v?.montoCuota,
        saldo: v?.saldoTotal,
        proxima: v?.proximaVisita,
      })),
    })

    if (lastEnrichKeyRef.current === enrichKey) return;
    lastEnrichKeyRef.current = enrichKey;



    const enriquecerConPagos = async () => {
      const hoyBogota = getBogotaDateKey(new Date());

      const getCuotasByPrestamoId = memoizePromiseByKey(
        (prestamoId) => prestamosService.obtenerCuotas(prestamoId) as Promise<any[]>,
        () => [],
      )
      
      // 1. Obtener todos los pagos recientes de forma masiva para evitar N peticiones API
      const pagosRecientesResp = await pagosService.obtenerPagos({ limit: 1000 });
      const todosPagos = (pagosRecientesResp as any)?.pagos || pagosRecientesResp || [];

      const recaudosHoyMap = buildRecaudosHoyMapByPrestamoId(
        todosPagos as any,
        hoyBogota,
        { includeCierrePendiente: false },
      )

      const { totalHistoricoByPrestamoId, ultimoPagoDateByPrestamoId } = indexPagosByPrestamoId(todosPagos as any)

      const actualizadas = await mapWithConcurrency(
        visitasCobrador,
        async (v: any) => {
          if (!v.clienteId || !v.prestamoId) return { ...v, recaudadoDelDia: 0, recaudadoTotalClient: 0 };

          try {
            const prestamoId = v.prestamoId
            const totalHoy = Number(recaudosHoyMap[prestamoId] || 0)
            const totalHistorico = Number(totalHistoricoByPrestamoId[prestamoId] || 0)
            const ultimoPagoDate = Number(ultimoPagoDateByPrestamoId[prestamoId] || 0)

            // 2. Obtener Cuotas para actualizar fecha y monto real
            let montoCuotaReal = v.montoCuota;
            let montoCuotaPendienteReal = Number((v as any)?.montoCuotaPendiente ?? v.montoCuota ?? 0);
            let fechaReal = v.proximaVisita;
            let cuotaActual = v.cuotaActual
            let cuotasTotales = v.cuotasTotales

            const cuotas = await getCuotasByPrestamoId(prestamoId);
            const pendiente = (Array.isArray(cuotas) ? cuotas : []).find((c: any) => isCuotaNoPagada(c));

            if (pendiente) {
              const exigiblePendiente = computeMontoExigibleHastaHoyFromCuotas(cuotas as any, hoyBogota)
              const exigibleNominal = computeMontoNominalHastaHoyFromCuotas(cuotas as any, hoyBogota)
              const montoPendiente = Number(pendiente.monto || (Number(pendiente.montoCapital || 0) + Number(pendiente.montoInteres || 0)) || 0)
              const pagadoPendiente = Number(pendiente.montoPagado || 0)
              const pendienteReal = Math.max(0, montoPendiente - pagadoPendiente)

              montoCuotaReal = Number(
                (v as any)?.montoCuotaNormal ??
                pendiente.montoNominal ??
                pendiente.montoCuota ??
                pendiente.monto ??
                (montoPendiente > 0 ? montoPendiente : montoCuotaReal),
              )
              montoCuotaPendienteReal = exigiblePendiente > 0 ? exigiblePendiente : pendienteReal

              fechaReal = resolveFechaEfectivaCuota(pendiente) || (pendiente.fechaVencimiento || v.proximaVisita);
              
              cuotaActual = pendiente.numeroCuota;
              cuotasTotales = Array.isArray(cuotas) ? cuotas.length : cuotasTotales;
            }

            const tieneMora = (Array.isArray(cuotas) ? cuotas : []).some((c: any) => {
              if (!c || !isCuotaNoPagada(c)) return false
              const vtoRaw = resolveFechaEfectivaCuota(c) || String(c?.fechaVencimiento || '')
              const vtoKey = normalizeDateKey(vtoRaw)
              return !!vtoKey && vtoKey < hoyBogota
            })

            // 3. Determinar Estado Final
            let nuevoEstado = v.estado;
            const cuotaComparar = montoCuotaReal > 0 ? montoCuotaReal : v.montoCuota;
            const montoOperativoComparar = montoCuotaPendienteReal > 0 ? montoCuotaPendienteReal : cuotaComparar;
            const cobroSuficiente = totalHoy >= (montoOperativoComparar - 1);

            // Si el cliente ya fue marcado ausente localmente, respetar ese estado
            // (un pago posterior lo sobreescribirá correctamente)
            if (nuevoEstado === 'ausente') {
              // Solo salir de 'ausente' si se registró un pago hoy
              if (totalHoy > 0 && cobroSuficiente) {
                nuevoEstado = 'pagado';
              }
            } else {
              // Solo ocultar si realmente completó la cuota del día (o si el saldo ya quedó en 0)
              if (Number(v.saldoTotal || 0) <= 0 || (totalHoy > 0 && cobroSuficiente) || v.estado === 'pagado') {
                nuevoEstado = 'pagado';
              }

              const pagado = shouldMarkVisitaAsPagado({
                saldoTotal: v.saldoTotal,
                recaudadoHoy: totalHoy,
                montoCuotaExigible: montoOperativoComparar,
                estadoActual: v.estado,
              })
              if (pagado) nuevoEstado = 'pagado'

              if (nuevoEstado !== 'pagado' && Number(v?.saldoTotal || 0) > 0 && tieneMora) {
                nuevoEstado = 'en_mora' as any
              }
            }

            return { 
              ...v, 
              recaudadoDelDia: totalHoy, 
              recaudadoTotalClient: totalHistorico, 
              fechaUltimoPago: ultimoPagoDate,
              montoCuota: cuotaComparar,
              montoCuotaNormal: cuotaComparar,
              montoCuotaPendiente: montoCuotaPendienteReal,
              proximaVisita: fechaReal,
              cuotaActual,
              cuotasTotales,
              estado: nuevoEstado,
              cuotaId: pendiente?.id || (v as any)?.cuotaId,
              cuotaObjetivoId: pendiente?.id || (v as any)?.cuotaObjetivoId,
              cuotaObjetivoPrestamoId: pendiente?.id || (v as any)?.cuotaObjetivoPrestamoId,
              proximaCuota: pendiente,
              cuotaObjetivo: pendiente,
              // Preservar campos de riesgo y acumulado vencido del objeto original
              montoMoraAcumulada: v.montoMoraAcumulada,
              montoVencidoAcumulado: v.montoVencidoAcumulado,
              saldoVencidoAcumulado: v.saldoVencidoAcumulado,
              nivelRiesgo: v.nivelRiesgo,
              prioridad: v.prioridad,
            };
          } catch (error) {
            console.error("Error en enriquecerConPagos (Admin):", error);
            return { ...v, recaudadoDelDia: 0, recaudadoTotalClient: 0, fechaUltimoPago: 0 };
          }
        },
        6,
      );

      setVisitasCobrador(mergeVisitasPreservingLocalRecaudo(visitasCobradorRef.current as any, actualizadas as any) as any);
    };



    enriquecerConPagos();

  }, [enrichNonce, visitasCobrador]);



  // Agrupar visitas por frecuencia de pago

  const { visitasAgrupadas, totalMostradas, exportarRutaDiariaCSV, exportarRutaDiariaPDF } = useMemo(() => {
    if (!visitasCobrador) return {
      visitasAgrupadas: { MES: [], QUINCENA: [], SEMANA: [], DIA: [] },
      totalMostradas: 0,
      exportarRutaDiariaCSV: async () => {},
      exportarRutaDiariaPDF: async () => {},
    };

    const hoyBogota = getBogotaDateKey(new Date());

    const pagosEnriquecidos = visitasCobrador.some(v => v.recaudadoTotalClient !== undefined)

    void pagosEnriquecidos

    let filtradas = visitasCobrador.filter(v => {
      const matchesSearch =
        v.cliente.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.direccion.toLowerCase().includes(searchQuery.toLowerCase())

      if (!matchesSearch) return false

      return shouldShowVisitaEnRutaHoy(v as any, hoyBogota);
    });

    if (periodoRutaFiltro !== 'TODOS') {
        filtradas = filtradas.filter(v => v.periodoRuta === periodoRutaFiltro);
    }

    filtradas.sort((a: any, b: any) => {
      if (a.estado === 'pagado' && b.estado !== 'pagado') return 1;
      if (a.estado !== 'pagado' && b.estado === 'pagado') return -1;

      if (a.estado === 'en_mora' && b.estado !== 'en_mora') return -1;
      if (a.estado !== 'en_mora' && b.estado === 'en_mora') return 1;

      if (a.periodoRuta !== 'DIA' || b.periodoRuta !== 'DIA') {
        if (a.fechaUltimoPago !== b.fechaUltimoPago) {
          return (a.fechaUltimoPago || 0) - (b.fechaUltimoPago || 0);
        }
      }

      const ao = Number(a.ordenVisita ?? 0);
      const bo = Number(b.ordenVisita ?? 0);
      if (ao !== bo) return ao - bo;
      const aId = String(a.id || '');
      const bId = String(b.id || '');
      return aId.localeCompare(bId);
    });

    const exportarRutaDiariaCSV = async () => {
      try {
        await exportService.exportOperationalReport('excel', {
          rutaId: initialRuta.id,
          startDate: getBogotaDateKey(new Date()),
        } as any);
      } catch (e) {
        toast.error('No se pudo exportar el reporte de ruta a Excel');
        console.error('Error exportando ruta CSV:', e);
      }
    }

    const exportarRutaDiariaPDF = async () => {
      try {
        await exportService.exportOperationalReport('pdf', {
          rutaId: initialRuta.id,
          startDate: getBogotaDateKey(new Date()),
        } as any);
      } catch (e) {
        toast.error('No se pudo exportar el reporte de ruta a PDF');
        console.error('Error exportando ruta PDF:', e);
      }
    }

    const agrupar = {
      MES: filtradas.filter(v => v.periodoRuta === 'MES'),
      QUINCENA: filtradas.filter(v => v.periodoRuta === 'QUINCENA'),
      SEMANA: filtradas.filter(v => v.periodoRuta === 'SEMANA'),
      DIA: filtradas.filter(v => v.periodoRuta === 'DIA'),
    }

    return { 
      visitasAgrupadas: agrupar, 
      totalMostradas: filtradas.length,
      exportarRutaDiariaCSV,
      exportarRutaDiariaPDF
    };
  }, [visitasCobrador, searchQuery, periodoRutaFiltro, vistaRuta, initialRuta?.id]);



  const [visitaSeleccionada, setVisitaSeleccionada] = useState<string | null>(null)

  const [accionPendiente, setAccionPendiente] = useState<'PAGO' | 'ABONO' | 'REPROGRAMAR' | 'ESTADO_CUENTA' | null>(null)

  

  const [estadoCuentaVisita, setEstadoCuentaVisita] = useState<VisitaRuta | null>(null)

  const [pagoVisita, setPagoVisita] = useState<{visita: VisitaRuta, tipo: 'PAGO' | 'ABONO'} | null>(null)

  const [visitaReprogramar, setVisitaReprogramar] = useState<VisitaRuta | null>(null)

  const [detalleVisita, setDetalleVisita] = useState<VisitaRuta | null>(null)



  const getEstadoClasses = useCallback((estado: EstadoVisita) => {

    switch (estado) {

      case 'pagado': return 'bg-emerald-50 text-emerald-700 border-emerald-500/30'

      case 'pendiente': return 'bg-orange-50 text-orange-700 border-orange-500/30'

      case 'en_mora': return 'bg-rose-50 text-rose-700 border-rose-500/30'

      case 'ausente': return 'bg-amber-50 text-amber-700 border-amber-200'

      case 'reprogramado': return 'bg-blue-50 text-blue-700 border-blue-500/30'

      default: return 'bg-slate-50 text-slate-700 border-slate-300'

    }

  }, [])



  const getPrioridadColor = useCallback((prioridad: 'alta' | 'media' | 'baja') => {

    switch (prioridad) {

      case 'alta': return '#ef4444'

      case 'media': return '#f59e0b'

      default: return '#10b981'

    }

  }, [])



  const handleAbrirClienteInfo = useCallback((visita: VisitaRuta) => setDetalleVisita(visita), [setDetalleVisita])

  const handleAbrirPago = useCallback((visita: VisitaRuta) => setPagoVisita({ visita, tipo: 'PAGO' }), [setPagoVisita])

  const handleAbrirAbono = useCallback((visita: VisitaRuta) => setPagoVisita({ visita, tipo: 'ABONO' }), [setPagoVisita])

  const handleAbrirEstadoCuenta = useCallback((visita: VisitaRuta) => setEstadoCuentaVisita(visita), [setEstadoCuentaVisita])



  const handleGuardarGasto = (e: React.FormEvent) => {

    e.preventDefault()

    setIsGastoModalOpen(false)

    setNuevoGasto({ tipo: 'OPERATIVO', descripcion: '', valor: '' })

  }


  const [rutaActivadaHoy, setRutaActivadaHoy] = useState(false)
  const [loadingActivacionHoy, setLoadingActivacionHoy] = useState(false)
  const [isCheckingActivacion, setIsCheckingActivacion] = useState(true)
  const esDiaNoLaboral = esDomingoBogota()

  const refreshActivacionHoy = useCallback(async () => {
    if (!initialRuta?.id) return
    try {
      const resp = await routesService.getActivacionHoy(initialRuta.id)
      setRutaActivadaHoy(Boolean(resp?.operableHoy ?? resp?.activadaHoy))
    } catch (e) {
      // ignore
    } finally {
      setIsCheckingActivacion(false)
    }
  }, [initialRuta?.id])

  useEffect(() => {
    refreshActivacionHoy()
  }, [refreshActivacionHoy])

  const handleActivarRuta = async () => {
    if (!initialRuta?.id) return
    try {
      setLoadingActivacionHoy(true)
      const resp = await routesService.activarHoy(initialRuta.id)
      setRutaActivadaHoy(Boolean(resp?.operableHoy ?? resp?.activadaHoy))
      showNotification('success', resp?.message || 'Ruta activada para hoy correctamente', 'Éxito')
    } catch (error: any) {
      console.error('Error activando ruta del día:', error)
      
      const status =
        error?.statusCode ??
        error?.status ??
        error?.response?.status ??
        error?.error?.statusCode ??
        error?.response?.data?.statusCode;

      const message =
        error?.response?.data?.message ??
        error?.error?.message ??
        error?.message ??
        'La ruta ya tiene movimiento de caja hoy y se considera operativa.';

      // Tratar 409 como caso de negocio (conflicto por restricción de BD)
      if (status === 409) {
        showNotification('info', message, 'Información');
        await refreshActivacionHoy();
      } else {
        showNotification('error', message || 'No se pudo activar la ruta para hoy', 'Error');
      }
    } finally {
      setLoadingActivacionHoy(false)
    }
  }

  const rutaOperable = rutaActivadaHoy && !rutaCompletada && !esDiaNoLaboral



  // Clases de riesgo para el badge superior

  const getRiesgoBadgeClasses = (riesgo: string) => {

    switch (riesgo) {

        case 'PELIGRO_MINIMO': return 'bg-emerald-100 text-emerald-800 border-emerald-200';

        case 'LEVE_RETRASO': return 'bg-blue-100 text-blue-800 border-blue-200';

        case 'PRECAUCION': return 'bg-yellow-100 text-yellow-800 border-yellow-200';

        case 'RIESGO_MODERADO': return 'bg-amber-100 text-amber-800 border-amber-200';

        case 'ALTO_RIESGO': return 'bg-rose-100 text-rose-800 border-rose-200';

        default: return 'bg-slate-100 text-slate-800 border-slate-200';

    }

  }



  const getRiesgoLabel = (riesgo: string) => {

      return riesgo.replace('_', ' ');

  }



  const estadisticas = (rutaData as any)?.estadisticas || initialRuta.estadisticas;
  const resumenDailyVisitsHoy = dailyVisitsHoy?.resumen || null

  const nivelRiesgo = (rutaData as any)?.nivelRiesgo || initialRuta.nivelRiesgo;

  const porcentajeProgreso = estadisticas?.avanceDiario || 0;

  useEffect(() => {
    const run = async () => {
      try {
        const { inicio, fin } = getDatesByPeriod(periodoCards)
        const saldo: any = await obtenerSaldoDisponibleRuta(initialRuta.id, undefined, inicio, fin)

        const recaudo = Number(saldo?.cobranzaDelDia ?? saldo?.recaudoDelDia ?? estadisticas?.cobranzaDelDia ?? 0)

        const isAusente = shouldExcludeVisitaFromOperationalMeta

        const visitasParaMeta = Array.isArray(visitasCobrador)
          ? visitasCobrador
              .filter((v: any) => shouldShowVisitaEnRutaHoy(v, hoyBogotaKey))
              .filter((v: any) => !isAusente(v))
          : []
        const statsUiHoy = computeRutaHoyUiStatsFromVisitas(visitasParaMeta, 0)

        const metaBackendRaw = estadisticas?.metaDelDia
        const hasMetaBackend = metaBackendRaw !== null && metaBackendRaw !== undefined
        const metaBackend = hasMetaBackend ? Number(metaBackendRaw) : null

        const metaBackendHoy = Math.max(
          Number(metaBackend ?? 0),
          Number((initialRuta as any)?.metaDelDia || 0),
          Number((initialRuta as any)?.estadisticas?.metaDelDia || 0),
        )
        const recaudoBackendHoy = Math.max(
          Number(recaudo || 0),
          Number((initialRuta as any)?.cobranzaDelDia || 0),
          Number((initialRuta as any)?.estadisticas?.cobranzaDelDia || 0),
        )
        const tieneResumenHoy =
          periodoCards === 'HOY'
          && Boolean(
            resumenDailyVisitsHoy
            && (
              resumenDailyVisitsHoy.meta !== undefined
              || resumenDailyVisitsHoy.recaudo !== undefined
              || resumenDailyVisitsHoy.recaudoOperativo !== undefined
            ),
          )
        const recaudoResumenHoy = tieneResumenHoy
          ? Number(resumenDailyVisitsHoy?.recaudoOperativo ?? resumenDailyVisitsHoy?.recaudo ?? 0)
          : recaudoBackendHoy

        const statsRutaHoy = 
          periodoCards === 'HOY'
            ? {
                meta: statsUiHoy.meta,
                recaudo: recaudoResumenHoy,
                pendiente: Math.max(0, statsUiHoy.meta - recaudoResumenHoy),
                eficiencia: 
                  statsUiHoy.meta > 0
                    ? Number(((recaudoResumenHoy / statsUiHoy.meta) * 100).toFixed(1))
                    : recaudoResumenHoy > 0
                      ? 100
                      : 0,
              }
            : resolveRutaHoyKpiStats(statsUiHoy, {
                meta: metaBackendHoy,
                recaudo: recaudoBackendHoy,
                eficiencia: estadisticas?.avanceDiario,
              }, { preferUi: Array.isArray(visitasCobrador) })

        const meta = periodoCards === 'HOY'
          ? statsRutaHoy.meta
          : Number(metaBackend ?? 0)

        const recaudoFinal = periodoCards === 'HOY'
          ? statsRutaHoy.recaudo
          : Number(recaudo ?? 0)

        const pendienteHoy = periodoCards === 'HOY'
          ? statsRutaHoy.pendiente
          : undefined

        const eficiencia = periodoCards === 'HOY'
          ? statsRutaHoy.eficiencia
          : (meta > 0
            ? Math.min(100, Math.max(0, Number(((recaudoFinal / meta) * 100).toFixed(1))))
            : Number(estadisticas?.avanceDiario ?? 0))

        setRutaStatsCards({
          recaudo: recaudoFinal,
          meta,
          eficiencia,
          pendiente: pendienteHoy,
          gastos: Number(saldo?.gastosDelDia ?? 0),
          base: Number(saldo?.saldoCaja ?? saldo?.baseEfectivo ?? 0)
        } as any)
      } catch {
        const recaudo = Number(estadisticas?.cobranzaDelDia ?? 0)

        const isAusente = shouldExcludeVisitaFromOperationalMeta

        const visitasParaMeta = Array.isArray(visitasCobrador)
          ? visitasCobrador
              .filter((v: any) => shouldShowVisitaEnRutaHoy(v, hoyBogotaKey))
              .filter((v: any) => !isAusente(v))
          : []
        const statsHoy = computeRutaHoyUiStatsFromVisitas(
          visitasParaMeta,
          periodoCards === 'HOY' ? 0 : recaudo,
        )

        const metaBackendRaw = estadisticas?.metaDelDia
        const hasMetaBackend = metaBackendRaw !== null && metaBackendRaw !== undefined
        const metaBackend = hasMetaBackend ? Number(metaBackendRaw) : null

        const metaBackendHoy = Math.max(
          Number(metaBackend ?? 0),
          Number((initialRuta as any)?.metaDelDia || 0),
          Number((initialRuta as any)?.estadisticas?.metaDelDia || 0),
        )
        const recaudoBackendHoy = Math.max(
          Number(recaudo || 0),
          Number((initialRuta as any)?.cobranzaDelDia || 0),
          Number((initialRuta as any)?.estadisticas?.cobranzaDelDia || 0),
        )
        const tieneResumenHoy =
          periodoCards === 'HOY'
          && Boolean(
            resumenDailyVisitsHoy
            && (
              resumenDailyVisitsHoy.meta !== undefined
              || resumenDailyVisitsHoy.recaudo !== undefined
              || resumenDailyVisitsHoy.recaudoOperativo !== undefined
            ),
          )
        const metaResumenHoy = tieneResumenHoy
          ? Number(resumenDailyVisitsHoy?.meta ?? 0)
          : metaBackendHoy
        const recaudoResumenHoy = tieneResumenHoy
          ? Number(resumenDailyVisitsHoy?.recaudoOperativo ?? resumenDailyVisitsHoy?.recaudo ?? 0)
          : recaudoBackendHoy

        const statsRutaHoy = 
          periodoCards === 'HOY'
            ? {
                meta: statsHoy.meta,
                recaudo: recaudoResumenHoy,
                pendiente: Math.max(0, statsHoy.meta - recaudoResumenHoy),
                eficiencia: 
                  statsHoy.meta > 0
                    ? Number(((recaudoResumenHoy / statsHoy.meta) * 100).toFixed(1))
                    : recaudoResumenHoy > 0
                      ? 100
                      : 0,
              }
            : resolveRutaHoyKpiStats(statsHoy, {
                meta: metaBackendHoy,
                recaudo: recaudoBackendHoy,
                eficiencia: estadisticas?.avanceDiario,
              }, { preferUi: Array.isArray(visitasCobrador) })

        const meta = periodoCards === 'HOY'
          ? statsRutaHoy.meta
          : Number(metaBackend ?? 0)

        const recaudoFinal = periodoCards === 'HOY'
          ? statsRutaHoy.recaudo
          : Number(recaudo ?? 0)

        const pendienteHoy = periodoCards === 'HOY'
          ? statsRutaHoy.pendiente
          : undefined

        const eficiencia = periodoCards === 'HOY'
          ? statsRutaHoy.eficiencia
          : (meta > 0
            ? Math.min(100, Math.max(0, Number(((recaudoFinal / meta) * 100).toFixed(1))))
            : Number(estadisticas?.avanceDiario ?? 0))
        setRutaStatsCards((prev) => ({
          ...prev,
          recaudo: recaudoFinal,
          meta,
          eficiencia,
          pendiente: periodoCards === 'HOY' ? pendienteHoy : prev.pendiente,
        }))
      }
    }

    if (!initialRuta?.id) return
    void run()
  }, [
    estadisticas?.cobranzaDelDia,
    estadisticas?.metaDelDia,
    estadisticas?.avanceDiario,
    getDatesByPeriod,
    initialRuta?.id,
    periodoCards,
    resumenDailyVisitsHoy?.efectividad,
    resumenDailyVisitsHoy?.meta,
    resumenDailyVisitsHoy?.recaudo,
    resumenDailyVisitsHoy?.recaudoOperativo,
    visitasCobrador,
  ])



  const [misCreditos, setMisCreditos] = useState<VisitaRuta[]>([])

  const [loadingMisCreditos, setLoadingMisCreditos] = useState(false)



  const cargarMisCreditos = useCallback(async () => {
    if (!rutaId) return
    try {
      setLoadingMisCreditos(true)
      const resp = await rutasService.obtenerVisitasDelDia(rutaId as any, hoyBogotaKey)
      const mapped = mapDailyVisitsResponseToVisitas(resp)
      setMisCreditos(mapped)
    } catch (e: any) {
      console.error('Error cargando mis clientes (ruta admin):', e)
      toast.error('No se pudieron cargar las obligaciones operativas de la ruta.')
    } finally {
      setLoadingMisCreditos(false)
    }
  }, [rutaId, hoyBogotaKey, mapDailyVisitsResponseToVisitas])

  // Enriquecer Mis clientes con pagos (similar a enriquecerConPagos)
  useEffect(() => {
    const enriquecerMisCreditos = async () => {
      if (misCreditos.length === 0 || vistaRuta !== 'MIS_CLIENTES') return

      const hoyBogota = getBogotaDateKey(new Date())

      const getCuotasByPrestamoId = memoizePromiseByKey(
        (prestamoId) => prestamosService.obtenerCuotas(prestamoId) as Promise<any[]>,
        () => [],
      )

      const pagosRecientesResp = await pagosService.obtenerPagos({ limit: 1000 })
      const todosPagos = (pagosRecientesResp as any)?.pagos || pagosRecientesResp || []

      const recaudosHoyMap = buildRecaudosHoyMapByPrestamoId(
        todosPagos as any,
        hoyBogota,
        { includeCierrePendiente: false },
      )

      const { totalHistoricoByPrestamoId, ultimoPagoDateByPrestamoId } = indexPagosByPrestamoId(todosPagos as any)

      const actualizadas = await mapWithConcurrency(
        misCreditos,
        async (v: any) => {
          if (!v.clienteId || !v.prestamoId) return { ...v, recaudadoDelDia: 0, recaudadoTotalClient: 0 }

          try {
            const prestamoId = v.prestamoId
            const totalHoy = Number(recaudosHoyMap[prestamoId] || 0)
            const totalHistorico = Number(totalHistoricoByPrestamoId[prestamoId] || 0)
            const ultimoPagoDate = Number(ultimoPagoDateByPrestamoId[prestamoId] || 0)

            let montoCuotaReal = v.montoCuota
            let montoCuotaPendienteReal = Number((v as any)?.montoCuotaPendiente ?? v.montoCuota ?? 0)
            let fechaReal = v.proximaVisita
            let cuotaActual = v.cuotaActual
            let cuotasTotales = v.cuotasTotales

            const cuotas = await getCuotasByPrestamoId(prestamoId)
            const pendiente = (Array.isArray(cuotas) ? cuotas : []).find((c: any) => isCuotaNoPagada(c))

            if (pendiente) {
              const exigiblePendiente = computeMontoExigibleHastaHoyFromCuotas(cuotas as any, hoyBogota)
              const exigibleNominal = computeMontoNominalHastaHoyFromCuotas(cuotas as any, hoyBogota)
              const montoPendiente = Number(pendiente.monto || (Number(pendiente.montoCapital || 0) + Number(pendiente.montoInteres || 0)) || 0)
              const pagadoPendiente = Number(pendiente.montoPagado || 0)
              const pendienteReal = Math.max(0, montoPendiente - pagadoPendiente)

              montoCuotaReal = Number(
                (v as any)?.montoCuotaNormal ??
                pendiente.montoNominal ??
                pendiente.montoCuota ??
                pendiente.monto ??
                (montoPendiente > 0 ? montoPendiente : montoCuotaReal),
              )
              montoCuotaPendienteReal = exigiblePendiente > 0 ? exigiblePendiente : pendienteReal

              fechaReal = resolveFechaEfectivaCuota(pendiente) || (pendiente.fechaVencimiento || v.proximaVisita)

              cuotaActual = pendiente.numeroCuota
              cuotasTotales = Array.isArray(cuotas) ? cuotas.length : cuotasTotales
            }

            const tieneMora = (Array.isArray(cuotas) ? cuotas : []).some((c: any) => {
              if (!c || !isCuotaNoPagada(c)) return false
              const vtoRaw = resolveFechaEfectivaCuota(c) || String(c?.fechaVencimiento || '')
              const vtoKey = normalizeDateKey(vtoRaw)
              return !!vtoKey && vtoKey < hoyBogota
            })

            let nuevoEstado = v.estado
            const cuotaComparar = montoCuotaReal > 0 ? montoCuotaReal : v.montoCuota
            const montoOperativoComparar = montoCuotaPendienteReal > 0 ? montoCuotaPendienteReal : cuotaComparar
            const cobroSuficiente = totalHoy >= (montoOperativoComparar - 1)

            if (nuevoEstado === 'ausente') {
              if (totalHoy > 0 && cobroSuficiente) {
                nuevoEstado = 'pagado'
              }
            } else {
              if (Number(v.saldoTotal || 0) <= 0 || (totalHoy > 0 && cobroSuficiente) || v.estado === 'pagado') {
                nuevoEstado = 'pagado'
              }

              const pagado = shouldMarkVisitaAsPagado({
                saldoTotal: v.saldoTotal,
                recaudadoHoy: totalHoy,
                montoCuotaExigible: montoOperativoComparar,
                estadoActual: v.estado,
              })
              if (pagado) nuevoEstado = 'pagado'

              if (nuevoEstado !== 'pagado' && Number(v?.saldoTotal || 0) > 0 && tieneMora) {
                nuevoEstado = 'en_mora' as any
              }
            }

            return {
              ...v,
              recaudadoDelDia: totalHoy,
              recaudadoTotalClient: totalHistorico,
              fechaUltimoPago: ultimoPagoDate,
              montoCuota: cuotaComparar,
              montoCuotaNormal: cuotaComparar,
              montoCuotaPendiente: montoCuotaPendienteReal,
              proximaVisita: fechaReal,
              cuotaActual,
              cuotasTotales,
              estado: nuevoEstado,
              cuotaId: pendiente?.id || (v as any)?.cuotaId,
              cuotaObjetivoId: pendiente?.id || (v as any)?.cuotaObjetivoId,
              cuotaObjetivoPrestamoId: pendiente?.id || (v as any)?.cuotaObjetivoPrestamoId,
              proximaCuota: pendiente,
              cuotaObjetivo: pendiente,
              // Preservar campos de riesgo y acumulado vencido del objeto original
              montoMoraAcumulada: v.montoMoraAcumulada,
              montoVencidoAcumulado: v.montoVencidoAcumulado,
              saldoVencidoAcumulado: v.saldoVencidoAcumulado,
              nivelRiesgo: v.nivelRiesgo,
              prioridad: v.prioridad,
            }
          } catch (error) {
            console.error("Error en enriquecerMisCreditos (Admin):", error)
            return { ...v, recaudadoDelDia: 0, recaudadoTotalClient: 0, fechaUltimoPago: 0 }
          }
        },
        6,
      )

      setMisCreditos(actualizadas)
    }

    enriquecerMisCreditos()
  }, [misCreditos, vistaRuta])



  useEffect(() => {

    if (vistaRuta !== 'MIS_CLIENTES') return

    cargarMisCreditos()

  }, [vistaRuta, cargarMisCreditos])

  // Tiempo real: actualización optimista para visitas registradas
  useRealtimeData(['pagos_actualizados', 'rutas_actualizadas', 'prestamos_actualizados', 'jornadas_actualizadas'], async (payload?: any) => {
    // Manejo focalizado de visitas registradas (ausente, etc.)
    const accionVisita = payload?.accion || payload?.metadata?.accion;
    const clienteIdVisita = payload?.clienteId || payload?.metadata?.clienteId;
    const estadoVisitaPayload = payload?.estadoVisita || payload?.metadata?.estadoVisita;
    const notasVisitaPayload = payload?.notasVisita || payload?.notas || payload?.metadata?.notasVisita || payload?.metadata?.notas;

    if (accionVisita === 'VISITA_REGISTRADA' && clienteIdVisita && estadoVisitaPayload) {
      setVisitasCobrador((prev: VisitaRuta[]) =>
        prev.map((v) =>
          v.clienteId === clienteIdVisita
            ? { ...v, estado: estadoVisitaPayload as any, estadoVisita: estadoVisitaPayload as any, notasVisita: notasVisitaPayload ?? (v as any).notasVisita }
            : v,
        ),
      )
      const hoyKey = hoyBogotaKey
      setHistorialRutas((prev: any) => {
        if (!prev || !prev[hoyKey]) return prev
        const next = { ...prev }
        delete next[hoyKey]
        return next
      })
      return
    }

    // Para otros eventos, delegar a onRutaRefresh si existe
    if (onRutaRefresh) {
      await onRutaRefresh()
    }
  })





  return (

    <div className="min-h-screen bg-slate-50 relative pb-20">

      <div className="fixed inset-0 pointer-events-none">

        <div className="absolute inset-0 bg-slate-50"></div>

      </div>



      <div className="relative z-10 w-full p-6 md:p-8 space-y-6">

        <RutaHeader
          backHref="/rutas"
          backContent={
            <div className="p-2 bg-white rounded-full shadow-sm hover:bg-slate-100 transition-colors">
              <ArrowLeft className="h-5 w-5 text-slate-600" />
            </div>
          }
          title={
            <h1 className="text-3xl font-bold tracking-tight">
              <span className="text-blue-600">Ruta </span>
              <span className="text-orange-500">{(initialRuta.nombre || '').replace(/^Ruta\s+/i, '')}</span>
            </h1>
          }
          badge={
            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getRiesgoBadgeClasses(nivelRiesgo)}`}>
              {getRiesgoLabel(nivelRiesgo)}
            </span>
          }
          subtitle={
            <>
              {new Date().toLocaleDateString('es-CO', { timeZone: 'America/Bogota', weekday: 'long', day: 'numeric', month: 'long' })} • {initialRuta.codigo} • {initialRuta.cobrador}
            </>
          }
        />

        <RutaKpiSection periodo={periodoCards} onPeriodoChange={setPeriodoCards} rutaStats={rutaStatsCards as any} />

        {/* Banner de cierre pendiente */}
        <CierrePendienteBanner
          cierrePendiente={cierrePendiente}
          loading={loadingCierrePendiente}
          onVerDetalles={() => {
            setShowDetalleCierre(true)
            void cargarDetalle()
          }}
        />

        {(currentUser?.rol === 'SUPER_ADMINISTRADOR' || currentUser?.rol === 'ADMIN') && (

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">

                <div className="flex items-start justify-between">

                  <div>

                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Efectivo Entregado</p>

                    <div className="text-3xl font-bold text-slate-900">{formatCurrency(Number((estadisticas as any)?.efectivoEntregado || 0))}</div>

                    <p className="text-xs text-slate-400 mt-1">Total recolectado de esta ruta</p>

                  </div>

                  <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">

                    <Wallet className="h-5 w-5 text-indigo-600" />

                  </div>

                </div>

            </div>

          </div>

        )}



        {/* Action Bar & Filtros */}

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">

              <div className="flex flex-col md:flex-row gap-4 mb-4">

                <div className="relative flex-1">

                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />

                  <input

                    type="text"

                    placeholder="Buscar cliente..."

                    value={searchQuery}

                    onChange={(e) => setSearchQuery(e.target.value)}

                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#08557f]/20 focus:border-[#08557f] shadow-sm text-slate-900 placeholder:text-slate-400"

                  />

                </div>

              </div>



              {/* Botones de Acción y Navegación (Estilo Cobrador) */}

              <div className="mt-4 border-t border-slate-100 pt-4 flex flex-wrap items-center gap-2 overflow-x-auto pb-1">

                  <button 

                    onClick={() => {

                      setVistaRuta('ACTUAL')

                    }}

                    className={`px-4 py-2 border rounded-xl flex items-center gap-2 font-medium shadow-sm transition-colors ${

                      vistaRuta === 'ACTUAL'

                        ? 'bg-[#08557f] text-white border-[#08557f]' 

                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'

                    }`}

                  >

                    <MapPin className="h-4 w-4" />

                    <span className="hidden md:inline">Ver Ruta Actual</span>

                  </button>



                  <button 

                    onClick={() => setVistaRuta('HISTORIAL')}

                    className={`px-4 py-2 border rounded-xl flex items-center gap-2 font-medium shadow-sm transition-colors ${

                      vistaRuta === 'HISTORIAL'

                        ? 'bg-[#08557f] text-white border-[#08557f]' 

                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'

                    }`}

                  >

                    <History className="h-4 w-4" />

                    <span className="hidden md:inline">Historial</span>

                  </button>



                  <button

                    onClick={() => {

                      setVistaRuta('MIS_CLIENTES')

                    }}

                    className={`px-4 py-2 border rounded-xl flex items-center gap-2 font-medium shadow-sm transition-colors ${

                      vistaRuta === 'MIS_CLIENTES'

                        ? 'bg-[#08557f] text-white border-[#08557f]'

                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'

                    }`}

                  >

                    <User className="h-4 w-4" />

                    <span className="hidden md:inline">Mis clientes</span>

                  </button>



                  {!esDiaNoLaboral && !rutaCompletada && vistaRuta === 'ACTUAL' && (
                    <button 
                      type="button"
                      onClick={handleActivarRuta}
                      disabled={isCheckingActivacion || loadingActivacionHoy || rutaActivadaHoy}
                      className={`px-4 py-2 border rounded-xl flex items-center gap-2 font-bold shadow-sm transition-colors ${
                        isCheckingActivacion || loadingActivacionHoy || rutaActivadaHoy
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 cursor-not-allowed opacity-70'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="hidden md:inline">
                        {isCheckingActivacion 
                          ? 'Comprobando...' 
                          : rutaActivadaHoy 
                            ? 'Jornada activada' 
                            : (loadingActivacionHoy ? 'Activando...' : 'Activar jornada')}
                      </span>
                    </button>
                  )}



                  {(currentUser?.rol === 'SUPER_ADMINISTRADOR' || currentUser?.rol === 'ADMIN') && vistaRuta === 'ACTUAL' && (

                    <div className="flex gap-2">

                        <button

                        onClick={() => { if (!rutaOperable) return; setShowNewClientModal(true) }}

                        disabled={!rutaOperable}

                        className={`px-4 py-2 border rounded-xl flex items-center gap-2 font-bold shadow-sm transition-colors ${!rutaOperable ? 'bg-slate-50 text-slate-300 border-slate-100 opacity-50 cursor-not-allowed' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}

                        >

                        <UserPlus className="h-4 w-4 text-slate-400" />

                        <span className="hidden md:inline">Crear Cliente</span>

                        </button>



                        <button 

                        onClick={() => {

                            if (!rutaOperable) return

                            setSelectedClienteForCredito(null)

                            setShowCrearCreditoModal(true)

                        }}

                        disabled={!rutaOperable}

                        className={`px-4 py-2 border rounded-xl flex items-center gap-2 font-bold shadow-sm transition-colors ${!rutaOperable ? 'bg-slate-50 text-slate-300 border-slate-100 opacity-50 cursor-not-allowed' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}

                        >

                        <Plus className="h-4 w-4 text-slate-400" />

                        <span className="hidden md:inline">Crear Crédito</span>

                        </button>

                    </div>

                  )}

                  

              </div>



              {/* Filtros de Periodo (Estilo Cobrador Exacto) */}

              {vistaRuta === 'ACTUAL' && (

                <div className="mt-4 pt-4 border-t border-slate-200">

                  <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">

                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Período de ruta</div>

                    <div className="flex gap-2 overflow-x-auto pb-1 items-center">


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

        

         {/* Contenido Principal: Lista o Historial */}

         <div className="space-y-6">

            

            {vistaRuta === 'HISTORIAL' ? (

              // ========================= VISTA HISTORIAL =========================

              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">

                      <div className="flex items-center gap-3">

                          <History className="h-6 w-6 text-[#08557f]" />

                          <h3 className="font-bold text-slate-900 text-xl">

                              Historial de la Ruta

                          </h3>

                      </div>

                  </div>



                <div className="space-y-4 animate-in fade-in">

                   <div className="flex items-center justify-between px-1">

                     <h3 className="font-bold text-slate-900 text-lg">Historial de Rutas</h3>

                     <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full">Últimos 30 días</div>

                   </div>



                   {/* Toggle DIAS | MESES + Filtro de Frecuencia */}

                   <div className="flex flex-col gap-3 mb-3">

                     <div className="flex items-center gap-2">

                       <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-1">VISTA:</span>

                       <button onClick={() => setHistoryViewMode('DAYS')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${historyViewMode === 'DAYS' ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}>Dias</button>

                       <button onClick={() => setHistoryViewMode('MONTHS')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${historyViewMode === 'MONTHS' ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}>Meses</button>

                     </div>

                     {/* Chips de frecuencia para filtrar clientes dentro del historial */}

                     <div className="flex items-center gap-2 flex-wrap">

                       <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">COBROS:</span>

                       {([

                         { key: 'TODOS' as const, label: 'Todos' },

                         { key: 'DIA' as const, label: 'Diarios' },

                         { key: 'SEMANA' as const, label: 'Semanales' },

                         { key: 'QUINCENA' as const, label: 'Quincenales' },

                         { key: 'MES' as const, label: 'Mensuales' },

                       ]).map(f => (

                         <button

                           key={f.key}

                           onClick={() => setHistoryFrecuenciaFiltro(f.key)}

                           className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all border ${

                             historyFrecuenciaFiltro === f.key

                               ? 'bg-[#08557f] text-white border-[#08557f] shadow-md'

                               : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'

                           }`}

                         >

                           {f.label}

                         </button>

                       ))}

                     </div>

                   </div>



                   {historyDates.length > 0 ? (

                      <div className="space-y-3">


                        {/* === VISTA MESES === */}

                        {historyViewMode === 'MONTHS' && (() => {
                          return (

                            <div className="space-y-4">


                              {historyMonthKeys.map(monthKey => {

                                const [my, mNum] = monthKey.split('-');

                                const monthObj = new Date(parseInt(my), parseInt(mNum)-1, 1);

                                const monthName = monthObj.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });

                                const daysInMonth = historyByMonth[monthKey] || [];

                                const isMonthExpanded = selectedHistoryMonth === monthKey;

                                const monthRecaudo = Number(historyMonthSummaryByKey[monthKey]?.monthRecaudo || 0)
                                const monthPagados = Number(historyMonthSummaryByKey[monthKey]?.monthPagados || 0)

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

                                        <div className="px-2 py-1 rounded-lg text-[10px] font-bold bg-blue-50 text-blue-700">{monthPagados} cobros</div>

                                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isMonthExpanded ? 'rotate-180' : ''}`} />

                                      </div>

                                    </div>

                                    {isMonthExpanded && (

                                      <div className="border-t border-slate-100">

                                        {daysInMonth.map(date => {

                                          const dayData = (historialRutas as any)[date];

                                          const isDayExpanded = selectedHistoryDate === date;

                                          const [dy, dm, dd] = date.split('-');

                                          const dateObj = new Date(parseInt(dy), parseInt(dm)-1, parseInt(dd));

                                          const dayNameStr = dateObj.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric' });

                                          return (

                                            <div key={date} className={`border-b border-slate-50 last:border-0 ${isDayExpanded ? 'bg-slate-50/40' : ''}`}>

                                              <div className="px-5 py-3 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => {

                                                setSelectedHistoryDate(isDayExpanded ? null : date)

                                                if (!isDayExpanded && !dayData.loaded) { void cargarHistorialFecha(date) }

                                              }}>

                                                <div className="flex items-center gap-3">

                                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-[11px] ${isDayExpanded ? 'bg-[#08557f] text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>{dd}</div>

                                                  <div>

                                                    <span className="text-sm font-semibold text-slate-700 capitalize">{dayNameStr}</span>

                                                    <div className="text-[11px] text-slate-400">Recaudo: <b>${formatMilesCOP((dayData?.resumen?.recaudo || 0) as any)}</b>{dayData?.loaded && Number(dayData?.resumen?.total || 0) > 0 && <span className="ml-2">· {Number(dayData?.resumen?.total || 0)} obligaciones</span>}</div>

                                                  </div>

                                                </div>

                                                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isDayExpanded ? 'rotate-180' : ''}`} />

                                              </div>

                                              {isDayExpanded && (

                                                <div className="px-4 pb-4 space-y-2 animate-in slide-in-from-top-1 duration-150">

                                                   {!dayData.loaded ? (

                                                    <div className="flex flex-col items-center justify-center py-6 text-slate-400"><div className="w-5 h-5 border-2 border-slate-300 border-t-[#08557f] rounded-full animate-spin mb-2" /><span className="text-xs">Cargando...</span></div>

                                                  ) : (() => {

                                                    const filtradas = historyFrecuenciaFiltro === 'TODOS'

                                                      ? dayData.visitas

                                                      : dayData.visitas.filter((v: any) => v.periodoRuta === historyFrecuenciaFiltro);

                                                    if (filtradas.length === 0) return <div className="text-center py-6 text-[11px] text-slate-400">Sin cobros {historyFrecuenciaFiltro !== 'TODOS' ? `(${historyFrecuenciaFiltro.toLowerCase()})` : ''} para este dia</div>;

                                                    return filtradas.map((v: any) => (

                                                      <StaticVisitaItem key={v.id} visita={v} allowClick={false} onVerCliente={handleAbrirClienteInfo} getEstadoClasses={getEstadoClasses} getPrioridadColor={getPrioridadColor} />

                                                    ));

                                                  })()

                                                  }

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



                        {/* === VISTA DÍAS === */}

                        {historyViewMode === 'DAYS' && historyDates.map(date => {

                             const data = (historialRutas as Record<string, HistorialDia>)[date];

                             const isExpanded = selectedHistoryDate === date;

                             const [y, m, d] = date.split('-');

                             const dateObj = new Date(parseInt(y), parseInt(m)-1, parseInt(d));

                             const dayName = dateObj.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });

                             const jornadaEtiqueta = (data.resumen as any).jornadaEtiqueta;
                             const jornadaEtiquetaColor = (data.resumen as any).jornadaEtiquetaColor || 'bg-slate-100 text-slate-700 border-slate-200';

                             return (

                               <div key={date} className={`rounded-2xl border transition-all overflow-hidden bg-white border-slate-200 ${isExpanded ? 'ring-1 ring-slate-300 shadow-md' : 'shadow-sm'}`}>

                                 <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => {
                                   setSelectedHistoryDate(isExpanded ? null : date)
                                   if (!isExpanded && !data.loaded) { void cargarHistorialFecha(date) }
                                 }}>

                                   <div className="flex items-center gap-3">

                                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shadow-sm ${isExpanded ? 'bg-[#08557f] text-white' : 'bg-slate-100 text-slate-600'}`}>{d}</div>

                                      <div>

                                         <div className="font-bold text-slate-900 capitalize flex items-center gap-2">{dayName}{jornadaEtiqueta && <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border ${jornadaEtiquetaColor}`}>{jornadaEtiqueta}</span>}</div>

                                         <div className="text-xs text-slate-500">Recaudo: <b>${formatMilesCOP(data.resumen.recaudo)}</b></div>

                                      </div>

                                   </div>

                                   <div className="flex items-center gap-3">

                                      <div className={`px-2 py-1 rounded-lg text-[10px] font-bold ${data.resumen.efectividad >= 90 ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-700'}`}>{data.resumen.efectividad}%</div>

                                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />

                                   </div>

                                 </div>

                                 {isExpanded && (

                                    <div className="border-t border-slate-100 bg-white p-4 space-y-4 animate-in slide-in-from-top-2 duration-200">

                                       <div className="grid grid-cols-3 gap-2">

                                          <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 text-center"><div className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Recaudo</div><div className="text-xs font-black text-slate-700">${formatMilesCOP(data.resumen.recaudo)}</div></div>

                                          <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 text-center"><div className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Gastos</div><div className="text-xs font-black text-rose-600">${formatMilesCOP(data.resumen.gastos)}</div></div>

                                          <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 text-center"><div className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Gestionados</div><div className="text-xs font-black text-blue-600">{data.resumen.visitados}/{data.resumen.total}</div></div>

                                       </div>

                                       <div className="space-y-3">

                                          <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase px-1"><span>Obligaciones gestionadas</span><span>Estado</span></div>

                                           {!data.loaded ? (

                                             <div className="flex flex-col items-center justify-center py-8 text-slate-400"><Loader2 className="w-6 h-6 animate-spin mb-2 opacity-20" /><span className="text-xs font-medium">Cargando detalles...</span></div>

                                           ) : (() => {

                                             const filtradas = data.visitas.filter((v: any) => {
                                               // Filtrar por frecuencia
                                               if (historyFrecuenciaFiltro !== 'TODOS' && v.periodoRuta !== historyFrecuenciaFiltro) return false;
                                               
                                               // Ocultar saldados que no tuvieron gestión real en este día.
                                               const isSaldado = String(v.estado || '').toLowerCase() === 'pagado' && Number(v.saldoTotal || 0) <= 0;
                                               if (isSaldado && !hasGestionHistorial(v)) return false;

                                               return true;
                                             });

                                             if (filtradas.length === 0) return (

                                               <div className="flex flex-col items-center justify-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200"><History className="w-8 h-8 text-slate-300 mb-2 opacity-30" /><span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center px-4">No hay visitas {historyFrecuenciaFiltro !== 'TODOS' ? `con frecuencia ${historyFrecuenciaFiltro.toLowerCase()}` : ''} para este dia</span></div>

                                             );

                                             return filtradas.map((v: any) => (

                                               <StaticVisitaItem key={v.id} visita={v} allowClick={false} onVerCliente={handleAbrirClienteInfo} getEstadoClasses={getEstadoClasses} getPrioridadColor={getPrioridadColor} />

                                             ));

                                           })()}

                                        </div>

                                    </div>

                                 )}

                               </div>

                             );

                        })}



                      </div>

                   ) : (

                     <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">

                         <History className="w-12 h-12 text-slate-200 mx-auto mb-4" />

                         <p className="font-bold text-slate-400">No hay información de historial disponible.</p>

                     </div>

                   )}

                </div>

              </div>

            ) : vistaRuta === 'MIS_CLIENTES' ? (

              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">

                <div className="flex items-center justify-between px-1">

                  <h3 className="font-bold text-slate-900 text-lg">Mis clientes</h3>

                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full">

                    {loadingMisCreditos ? 'Cargando' : `${misCreditos.length} créditos`}

                  </div>

                </div>



                {loadingMisCreditos ? (

                  <div className="flex flex-col items-center justify-center py-10 text-slate-400">

                    <Loader2 className="w-6 h-6 animate-spin mb-2 opacity-20" />

                    <span className="text-xs font-medium">Cargando clientes...</span>

                  </div>

                ) : (() => {

                  const filtradas = misCreditos.filter((v) =>
                    (
                      v.cliente.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      v.direccion.toLowerCase().includes(searchQuery.toLowerCase())
                    ),
                  )



                  if (filtradas.length === 0) {

                    return (

                      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">

                        <User className="w-12 h-12 text-slate-200 mx-auto mb-4" />

                        <p className="font-bold text-slate-400">No hay créditos asignados para este cobrador.</p>

                      </div>

                    )

                  }



                  return (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      {filtradas.map((visita) => (
                        <StaticVisitaItem
                          key={visita.id}
                          visita={visita}
                          allowClick={true}
                          onVerCliente={handleAbrirClienteInfo}
                          getEstadoClasses={getEstadoClasses}
                          getPrioridadColor={getPrioridadColor}
                          actions={
                            <>
                              <button
                                onClick={(e) => { e.stopPropagation(); if (visita.pendienteAprobacion || !rutaOperable) return; handleAbrirPago(visita); }}
                                disabled={visita.pendienteAprobacion || !rutaOperable}
                                title={visita.pendienteAprobacion ? 'Crédito pendiente de revisión' : !rutaOperable ? (rutaCompletada ? 'Jornada completada' : 'Jornada sin activar') : 'Registrar Pago'}
                                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all font-bold text-[11px] shadow-sm ${visita.pendienteAprobacion || !rutaOperable ? 'bg-slate-50 text-slate-300 border border-slate-100 opacity-50 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'}`}
                              >
                                <DollarSign className="h-3.5 w-3.5" />
                                Pago
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); if (visita.pendienteAprobacion || !rutaOperable) return; handleAbrirAbono(visita); }}
                                disabled={visita.pendienteAprobacion || !rutaOperable}
                                title={visita.pendienteAprobacion ? 'Crédito pendiente de revisión' : !rutaOperable ? (rutaCompletada ? 'Jornada completada' : 'Jornada sin activar') : 'Registrar Abono'}
                                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all font-bold text-[11px] shadow-sm ${visita.pendienteAprobacion || !rutaOperable ? 'bg-slate-50 text-slate-300 border border-slate-100 opacity-50 cursor-not-allowed' : 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95'}`}
                                style={{ backgroundColor: !rutaOperable && !rutaCompletada ? '#f97316' : undefined }}
                              >
                                <Wallet className="h-3.5 w-3.5" />
                                Abono
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); if(!rutaOperable) return; handleAbrirEstadoCuenta(visita); }}
                                disabled={!rutaOperable}
                                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all font-bold text-[11px] shadow-sm border ${!rutaOperable ? 'bg-slate-50 text-slate-300 border-slate-100 opacity-50 cursor-not-allowed' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 active:scale-95'}`}
                              >
                                <FileTextIcon className="h-3.5 w-3.5 text-slate-400" />
                                Estado
                              </button>
                              <button
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  if (!rutaOperable) return;
                                  const isProrrogaVencida = visita.enProrroga && visita.fechaProrroga && new Date(visita.fechaProrroga).getTime() < Date.now();
                                  if (!visita.enProrroga || isProrrogaVencida) {
                                    clearRegularizacionContext()
                                    setVisitaReprogramar(visita)
                                  }
                                }}
                                disabled={!rutaOperable || (!!visita.enProrroga && !(visita.fechaProrroga && new Date(visita.fechaProrroga).getTime() < Date.now()))}
                                title={!rutaOperable ? (rutaCompletada ? 'Jornada completada' : 'Jornada sin activar') : (visita.enProrroga && !(visita.fechaProrroga && new Date(visita.fechaProrroga).getTime() < Date.now()) ? 'No se puede reprogramar con prorroga activa' : 'Solicitar reprogramacion')}
                                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border transition-all font-bold text-[11px] shadow-sm ${!rutaOperable || (visita.enProrroga && !(visita.fechaProrroga && new Date(visita.fechaProrroga).getTime() < Date.now())) ? 'bg-slate-50 text-slate-300 border-slate-100 opacity-50 cursor-not-allowed' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 active:scale-95'}`}
                              >
                                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                Repro.
                              </button>
                            </>
                          }
                        />
                      ))}
                    </div>
                  )

                })()}

              </div>

            ) : (

              // ========================= VISTA VISITAS ACTUALES =========================

              <>

                  <div className="flex flex-col gap-6 animate-in fade-in duration-300">

                    <div className="flex items-center justify-end">

                    </div>



                    {/* Leyenda de Riesgos Simplificada */}

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

                  </div>



                  {/* LISTA DE VISITAS AGRUPADA POR FRECUENCIA — Colapsables */}

                  <div className="space-y-10">

                    {Object.entries({
                        MES: 'Mensual',
                        QUINCENA: 'Quincenal',
                        SEMANA: 'Semanal',
                        DIA: 'Diario'
                    }).map(([key, label]) => {

                        const visitas = visitasAgrupadas[key as keyof typeof visitasAgrupadas];

                        if (visitas.length === 0) return null;

                        const estaColapsado = !!gruposColapsados[key];



                        return (

                            <div key={key} className="space-y-4">

                                {/* Separador clicable — mismo look de antes + chevron */}

                                <button

                                  type="button"

                                  onClick={() => toggleGrupo(key)}

                                  className="w-full flex items-center gap-4 group"

                                >

                                    <div className="h-px flex-1 bg-slate-200" />

                                    <span className="flex items-center gap-2 text-[11px] font-black text-[#08557f] uppercase tracking-[0.25em] bg-blue-50/50 px-4 py-1.5 rounded-full border border-blue-100 shadow-sm whitespace-nowrap select-none group-hover:bg-blue-100/60 transition-colors">

                                        {label}

                                        <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${estaColapsado ? '' : 'rotate-180'}`} />

                                    </span>

                                    <div className="h-px flex-1 bg-slate-200" />

                                </button>



                                {/* Visitas — se ocultan si está colapsado */}

                                {!estaColapsado && (

                                  <div className="space-y-4 animate-in slide-in-from-top-2 duration-150">

                                    {visitas.map((visita) => (

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
                                                  onClick={(e) => { e.stopPropagation(); if (visita.pendienteAprobacion || !rutaOperable) return; handleAbrirPago(visita); }}
                                                  disabled={visita.pendienteAprobacion || !rutaOperable}
                                                  title={visita.pendienteAprobacion ? 'Crédito pendiente de revisión' : !rutaOperable ? (rutaCompletada ? 'Jornada completada' : 'Jornada sin activar') : 'Registrar Pago'}
                                                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all font-bold text-[11px] shadow-sm ${visita.pendienteAprobacion || !rutaOperable ? 'bg-slate-50 text-slate-300 border border-slate-100 opacity-50 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'}`}
                                                >
                                                  <DollarSign className="h-3.5 w-3.5" />
                                                  Pago
                                                </button>
                                                <button
                                                  onClick={(e) => { e.stopPropagation(); if (visita.pendienteAprobacion || !rutaOperable) return; handleAbrirAbono(visita); }}
                                                  disabled={visita.pendienteAprobacion || !rutaOperable}
                                                  title={visita.pendienteAprobacion ? 'Crédito pendiente de revisión' : !rutaOperable ? (rutaCompletada ? 'Jornada completada' : 'Jornada sin activar') : 'Registrar Abono'}
                                                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all font-bold text-[11px] shadow-sm ${visita.pendienteAprobacion || !rutaOperable ? 'bg-slate-50 text-slate-300 border border-slate-100 opacity-50 cursor-not-allowed' : 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95'}`}
                                                  style={{ backgroundColor: !rutaOperable && !rutaCompletada ? '#f97316' : undefined }}
                                                >
                                                  <Wallet className="h-3.5 w-3.5" />
                                                  Abono
                                                </button>
                                                <button
                                                  onClick={(e) => { e.stopPropagation(); if(!rutaOperable) return; handleAbrirEstadoCuenta(visita); }}
                                                  disabled={!rutaOperable}
                                                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all font-bold text-[11px] shadow-sm border ${!rutaOperable ? 'bg-slate-50 text-slate-300 border-slate-100 opacity-50 cursor-not-allowed' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 active:scale-95'}`}
                                                >
                                                  <FileTextIcon className="h-3.5 w-3.5 text-slate-400" />
                                                  Estado
                                                </button>
                                                <button
                                                  onClick={(e) => { 
                                                    e.stopPropagation(); 
                                                    if (!rutaOperable) return;
                                                    const isProrrogaVencida = visita.enProrroga && visita.fechaProrroga && new Date(visita.fechaProrroga).getTime() < Date.now();
                                                    if (!visita.enProrroga || isProrrogaVencida) {
                                                      clearRegularizacionContext()
                                                      setVisitaReprogramar(visita)
                                                    }
                                                  }}
                                                  disabled={!rutaOperable || (!!visita.enProrroga && !(visita.fechaProrroga && new Date(visita.fechaProrroga).getTime() < Date.now()))}
                                                  title={!rutaOperable ? (rutaCompletada ? 'Jornada completada' : 'Jornada sin activar') : (visita.enProrroga && !(visita.fechaProrroga && new Date(visita.fechaProrroga).getTime() < Date.now()) ? 'No se puede reprogramar con prorroga activa' : 'Solicitar reprogramacion')}
                                                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border transition-all font-bold text-[11px] shadow-sm ${!rutaOperable || (visita.enProrroga && !(visita.fechaProrroga && new Date(visita.fechaProrroga).getTime() < Date.now())) ? 'bg-slate-50 text-slate-300 border-slate-100 opacity-50 cursor-not-allowed' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 active:scale-95'}`}
                                                >
                                                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                                  Repro.
                                                </button>
                                              </>
                                            }
                                        >
                                        </StaticVisitaItem>

                                    ))}

                                  </div>

                                )}

                            </div>

                        )

                    })}



                    {totalMostradas === 0 && (

                        <div className="text-center py-20 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 text-slate-400">

                            <Search className="h-10 w-10 mx-auto mb-3 opacity-20" />

                            <p className="font-medium">No se encontraron visitas para mostrar en este modo</p>

                        </div>

                    )}

                  </div>

              </>

            )}

         </div>

      </div>



      {/* Modales (Gasto, Pago, etc...) */}

      {isGastoModalOpen && (

        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">

           <form onSubmit={handleGuardarGasto} className="p-6 space-y-4 bg-white rounded-lg">

              {/* Contenido simplificado gasto por brevedad de edicion */}

               <h3 className="font-bold">Registrar Gasto</h3>

               <button type="submit">Guardar</button>

           </form>

        </div>

      )}



      {/* Modal de Estado de Cuenta */}

      {estadoCuentaVisita && (

        <EstadoCuentaModal 

          visita={estadoCuentaVisita} 

          onClose={() => setEstadoCuentaVisita(null)} 

        />

      )}

      {/* Modal de Pago/Abono */}

      {visitaAusente && (
        <AusenteModal
          visita={visitaAusente}
          onClose={() => {
            setVisitaAusente(null)
            clearRegularizacionContext()
          }}
          onConfirm={async (notas) => {
            if (!initialRuta?.id || !visitaAusente?.clienteId) return;
            await rutasService.marcarVisitaAusente(initialRuta.id, visitaAusente.clienteId, {
              estadoVisita: 'ausente',
              notas,
              fechaOperativa: contextoRegularizacion?.fechaOperativa,
              origenGestion: contextoRegularizacion?.origenGestion,
            });
            // Actualización optimista: marcar el cliente como ausente en el estado local
            // inmediatamente para que el UI refleje el cambio sin esperar al enrich.
            const clienteIdAusente = visitaAusente.clienteId;
            setVisitasCobrador((prev) =>
              (prev || []).map((v) =>
                v.clienteId === clienteIdAusente
                  ? { ...v, estado: 'ausente' as any, estadoVisita: 'ausente' as any, notasVisita: notas }
                  : v
              )
            );
            showNotification('success', 'Cliente marcado como ausente', 'Éxito');
            setVisitaAusente(null);
            clearRegularizacionContext();
            setEnrichNonce((n) => n + 1);
            try {
              await onRutaRefresh?.();
            } catch {}
          }}
        />
      )}

      {pagoVisita && (
        <PagoModal
          visita={pagoVisita.visita}
          tipo={pagoVisita.tipo}
          onClose={() => {
            setPagoVisita(null)
            clearRegularizacionContext()
          }}
          montoCuotaEsperadoOverride={contextoRegularizacion?.montoCuotaEsperado ?? resolveCuotaNormalOperativa(pagoVisita?.visita)}
          cuotaNumeroEsperadaOverride={contextoRegularizacion?.cuotaNumeroEsperada}
          onConfirm={async (monto, metodo, comprobante, contexto) => {
            try {
              const pagoActual = pagoVisita

              // Cerrar inmediatamente para UX
              const contextoRegularizacionSnapshot = contextoRegularizacionRef.current
              setPagoVisita(null)
              clearRegularizacionContext()

              if (!pagoActual?.visita?.clienteId || !pagoActual?.visita?.prestamoId) {
                showNotification('error', 'No se pudo registrar el pago: falta cliente o préstamo', 'Error');
                return;
              }

              const esCierrePendiente =
                contextoRegularizacionSnapshot?.origenGestion === 'CIERRE_PENDIENTE'

              const prestamoIdFinal =
                esCierrePendiente
                  ? contextoRegularizacionSnapshot?.prestamoId
                  : pagoActual.visita.prestamoId

              const cuotaIdFinal =
                esCierrePendiente
                  ? contextoRegularizacionSnapshot?.cuotaId
                  : contexto?.cuotaId

              const cuotaNumeroFinal =
                esCierrePendiente
                  ? contextoRegularizacionSnapshot?.cuotaNumeroEsperada
                  : contexto?.cuotaNumeroEsperada

              const montoCuotaEsperadoFinal =
                esCierrePendiente
                  ? contextoRegularizacionSnapshot?.montoCuotaEsperado
                  : contexto?.montoCuotaEsperado

              await pagosService.registrarPago({
                clienteId: pagoActual.visita.clienteId,
                prestamoId: prestamoIdFinal,
                cobradorId: initialRuta.cobradorId,
                montoTotal: monto,
                metodoPago: metodo,
                comprobante: comprobante,
                tipoRegistro: contexto?.tipoRegistro || pagoActual.tipo,
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
                      pagoActual.visita.clienteId,
                      prestamoIdFinal,
                      cuotaIdFinal ?? 'SIN_CUOTA_ID',
                      cuotaNumeroFinal ?? 'SIN_CUOTA',
                      contexto?.tipoRegistro || pagoActual.tipo,
                      Number(monto || 0),
                    ].join(':')
                  : undefined,
              } as any);

              // Actualizacion optimista solo para pagos operativos de hoy.
              if (!esCierrePendiente) {
                const prestamoIdPago = String(prestamoIdFinal || pagoActual.visita.prestamoId || '')
                const visitaIdPago = String(pagoActual.visita.id || '')
                setVisitasCobrador((prev) => {
                  const next = (prev || []).map((v: any) => {
                    const esVisitaPagada =
                      String(v?.prestamoId || '') === prestamoIdPago ||
                      String(v?.id || '') === visitaIdPago
                    if (!esVisitaPagada) return v

                    const estadoActual = String(v?.estado || '').toLowerCase()
                    const estabaAusente =
                      estadoActual === 'ausente' ||
                      String(v?.estadoVisita || '').toLowerCase() === 'ausente'

                    const estadoSinAusente =
                      estabaAusente
                        ? (
                            Number(v?.diasMora || 0) > 0 || Boolean(v?.enMoraHistorico)
                              ? 'en_mora'
                              : 'pendiente'
                          )
                        : v.estado

                    const recaudadoDelDia = Number(v?.recaudadoDelDia || 0) + Number(monto || 0)
                    const montoCuotaPendiente = computeMontoCuotaPendienteDespuesDeRecaudo(v as any, recaudadoDelDia)
                    const estado = shouldMarkVisitaAsPagado({
                      saldoTotal: v?.saldoTotal,
                      recaudadoHoy: recaudadoDelDia,
                      montoCuotaExigible: v?.montoCuota,
                      estadoActual: estadoSinAusente,
                    })
                      ? 'pagado'
                      : estadoSinAusente

                    return {
                      ...v,
                      recaudadoDelDia,
                      montoCuotaPendiente,
                      estado: estado as any,
                      estadoVisita: undefined as any,
                      notasVisita: undefined as any,
                    }
                  })

                  visitasCobradorRef.current = next as any
                  return next as any
                });
              }
              showNotification('success', `${pagoActual.tipo === 'ABONO' ? 'Abono' : 'Pago'} registrado correctamente`, 'Éxito');

              // Refrescar desde cuotas/pagos reales para no mostrar una ruta parcialmente parcheada.
              setEnrichNonce((n) => n + 1)
              try {
                await onRutaRefresh?.(pagoActual.visita.prestamoId);
              } catch {}
            } catch (error) {
              console.error('Error registrando pago/abono:', error);
              const apiError = error as any;
              const isConflict = apiError?.isConflict || apiError?.statusCode === 409 || apiError?.error?.statusCode === 409;
              const mensaje = apiError?.message || apiError?.error?.message || 'No se pudo registrar el pago/abono';
              if (isConflict) {
                setEnrichNonce((n) => n + 1);
                try {
                  await onRutaRefresh?.(pagoVisita?.visita?.prestamoId);
                } catch {}
              }
              showNotification('error', mensaje, isConflict ? 'La cuota cambió' : 'Error');
            } finally {
              clearRegularizacionContext()
            }
          }}
        />
      )}

      {visitaReprogramar && (

        <ReprogramarModal

            visita={visitaReprogramar}

            onClose={() => {
              setVisitaReprogramar(null)
              clearRegularizacionContext()
            }}

            onConfirm={async (fecha, motivo, cuotaId) => {

              if (!visitaReprogramar) return;

              const formatearFechaISO = (iso: string) => {
                const [yyyy, mm, dd] = iso.split('-')
                if (!yyyy || !mm || !dd) return iso
                return `${dd}/${mm}`
              }

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
                if (!visitaReprogramar?.prestamoId) {
                  toast.error('La visita seleccionada no tiene un préstamo asociado.')
                  return;
                }

                if (!cuotaIdFinal) {
                  toast.error('No se pudo identificar la cuota a reprogramar.');
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

                setVisitasCobrador((prev) =>
                  prev.map((v) => {
                    if (v.id !== visitaReprogramar.id) return v
                    return {
                      ...v,
                      estado: 'reprogramado' as any,
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

                // Recalcular KPI inmediatamente
                setRutaStatsCards((prev) => {
                  const visitasActualizadas = visitasCobrador.map((v: any) => {
                    if (v.id !== visitaReprogramar.id) return v

                    return {
                      ...v,
                      estado: 'reprogramado',
                      proximaVisita: fecha,
                    }
                  })

                  const visitasParaMeta = visitasActualizadas
                    .filter((v: any) => shouldShowVisitaEnRutaHoy(v, hoyBogotaKey))
                    .filter((v: any) => !shouldExcludeVisitaFromOperationalMeta(v))

                  const statsHoy = computeRutaHoyUiStatsFromVisitas(visitasParaMeta, 0)
                  const recaudo = Number(prev.recaudo || 0)

                  return {
                    ...prev,
                    meta: statsHoy.meta,
                    pendiente: Math.max(0, statsHoy.meta - recaudo),
                    eficiencia:
                      statsHoy.meta > 0
                        ? Number(((recaudo / statsHoy.meta) * 100).toFixed(1))
                        : recaudo > 0
                          ? 100
                          : 0,
                  }
                })

                toast.success('Solicitud de reprogramación enviada exitosamente', {
                  description: `La cuota será revisada para reprogramarse al ${formatearFechaISO(fecha)}`,
                })

                setVisitaReprogramar(null)
                clearRegularizacionContext()

                try {
                  await onRutaRefresh?.();
                } catch {}

              } catch (error: any) {
                const message =
                  error?.response?.data?.message ??
                  error?.data?.message ??
                  error?.message ??
                  'No se pudo realizar la reprogramación.'

                console.error('Error reprogramando cuota (ruta admin):', {
                  message,
                  error,
                  response: error?.response,
                  data: error?.response?.data || error?.data,
                })

                toast.error(Array.isArray(message) ? message[0] : message)
              }

            }}

        />

      )}

      {showClienteSelector && (

        <SeleccionClienteModal

          visitas={visitasCobrador}

          onSelect={(visita) => {

            setShowClienteSelector(false)

            if (accionPendiente === 'PAGO') handleAbrirPago(visita)

            else if (accionPendiente === 'ABONO') handleAbrirAbono(visita)

            else if (accionPendiente === 'REPROGRAMAR') {
              clearRegularizacionContext()
              setVisitaReprogramar(visita)
            }

            else handleAbrirEstadoCuenta(visita) 

            setAccionPendiente(null)

          }}

          onClose={() => setShowClienteSelector(false)}

        />

      )}

      

      {detalleVisita && (
        (() => {
          const detalleActual = detalleVisita
          if (!detalleActual) return null
          return (
            <ClienteInfoModal
              visita={detalleActual}
              onClose={() => setDetalleVisita(null)}
              nextPagoMonto={resolveCuotaNormalOperativa(detalleActual)}
              nextPagoFecha={detalleActual.proximaVisita}
              recaudadoHoy={Number((detalleActual as any)?.recaudadoDelDia || 0)}
              formatFechaLargaUTC={formatShortDate}
            />
          )
        })()
      )}

      

      {showNewClientModal && (

        <NuevoClienteModal

          onClose={() => setShowNewClientModal(false)}

          onClienteCreado={async (nuevo) => {

            setShowNewClientModal(false)

            if (nuevo?.id) {

              try {

                if (initialRuta?.id && initialRuta?.cobradorId) {

                  await routesService.assignClient(initialRuta.id, nuevo.id, initialRuta.cobradorId)

                }

                setDefaultClienteId(nuevo.id)

                setShowCrearCreditoPrompt(true)

              } catch (e) {

                showNotification('warning', 'Cliente creado, pero no se pudo asignar automáticamente a la ruta', 'Aviso')

                setDefaultClienteId(nuevo.id)

                setShowCrearCreditoPrompt(true)

              }

            } else {

              showNotification('warning', 'Cliente creado, pero no se obtuvo el ID', 'Aviso')

            }

          }}

        />

      )}

      

      <ConfirmModal

        isOpen={showCrearCreditoPrompt}

        onClose={() => {

          setShowCrearCreditoPrompt(false)

          showNotification('success', 'Cliente creado correctamente', 'Éxito')

        }}

        onConfirm={async () => {

          setShowCrearCreditoPrompt(false)

          setShowCrearCreditoModal(true)

        }}

        title="Crear crédito para el cliente"

        message="¿Deseas crearle un crédito a este cliente ahora?"

        confirmText="Sí, crear crédito"

        cancelText="No, más tarde"

        variant="info"

      />

      

      {/* Modal de selección de caja principal removido en detalle de ruta */}

      

      {showCrearCreditoModal && (

        <CrearCreditoModal

          isOpen={showCrearCreditoModal}

          defaultClienteId={selectedClienteForCredito?.clienteId || defaultClienteId || undefined}

          onClose={() => {

            setShowCrearCreditoModal(false);

            setSelectedClienteForCredito(null);

            setDefaultClienteId(null);

          }}

          onConfirm={async (data: any) => {

            try {

              const payload = buildCrearPrestamoPayload(data, currentUser?.id)

              await prestamosService.crearPrestamo(payload)



              // Asignar cliente a la ruta automáticamente si estamos en el detalle de una ruta

              if (initialRuta?.id) {

                try {

                  await rutasService.asignarCliente(

                    initialRuta.id,

                    data.clienteCreditoId,

                    initialRuta.cobradorId || ''

                  );

                } catch (assignError) {

                  console.error('Error al asignar cliente a la ruta:', assignError);

                  // No bloqueamos el flujo principal si falla la asignación (puede que ya esté asignado)

                }

              }

              

              showNotification('success', 'Crédito creado (Pendiente de Aprobación) y cliente vinculado a la ruta', 'Operación completada');

              try {

                await onRutaRefresh?.();

              } catch {}

              setShowCrearCreditoModal(false);

              setSelectedClienteForCredito(null);

              setDefaultClienteId(null);

              router.refresh();

            } catch (error) {

              console.error('Error al crear crédito:', error);

              showNotification('error', 'No se pudo crear el crédito', 'Error');

            }

          }}

        />

      )}

      <CierrePendienteDetalleModal
        open={showDetalleCierre}
        onClose={() => setShowDetalleCierre(false)}
        detalle={detalle}
        loading={loadingDetalleCierre}
        onVerEstadoCuenta={(cliente, contextoRegularizacion) => {
          const visita = visitasCobrador.find((v: any) => v.clienteId === cliente.clienteId)
          if (!visita) {
            toast.error('No se encontró la visita del cliente.')
            return
          }

          setShowDetalleCierre(false)

          setTimeout(() => {
            handleAbrirEstadoCuenta(visita)
          }, 80)
        }}
        onRegistrarPago={(cliente, contextoRegularizacion) => {
          const visitaBase = visitasCobrador.find((v: any) => v.clienteId === cliente.clienteId)
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
            setPagoVisita({
              visita: target.visitaRegularizada as any,
              tipo: 'PAGO',
            })
          }, 80)
        }}
        onRegistrarAbono={(cliente, contextoRegularizacion) => {
          const visitaBase = visitasCobrador.find((v: any) => v.clienteId === cliente.clienteId)
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
            setPagoVisita({
              visita: target.visitaRegularizada as any,
              tipo: 'ABONO',
            })
          }, 80)
        }}
        onMarcarAusente={(cliente, contextoRegularizacion) => {
          const visita = visitasCobrador.find((v: any) => v.clienteId === cliente.clienteId)
          if (!visita) {
            toast.error('No se encontró la visita del cliente.')
            return
          }

          setShowDetalleCierre(false)

          setTimeout(() => {
            setRegularizacionContext(contextoRegularizacion)
            setVisitaAusente(visita)
          }, 80)
        }}
        onReprogramar={(cliente, contextoRegularizacion) => {
          const visitaBase = visitasCobrador.find((v: any) => v.clienteId === cliente.clienteId)
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
            setVisitaReprogramar(target.visitaRegularizada as any)
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
            await routesService.cerrarJornadaRegularizada(
              rutaId,
              fechaOperativa,
              observaciones || 'Jornada regularizada desde el módulo de cierre pendiente.',
            )

            toast.success('Jornada cerrada exitosamente.')
            setShowDetalleCierre(false)

            void Promise.allSettled([
              refreshCierrePendiente(),
              cargarDetalle(),
              onRutaRefresh?.(),
            ])
          } catch (error: any) {
            toast.error(
              error?.response?.data?.message || error?.message || 'No se pudo cerrar la jornada regularizada.',
            )
          }
        }}
        permissions={((): any => {
          const rolActual = String(currentUser?.rol || '').toUpperCase()
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

  )

}



const RutaClient = ({ initialRuta: initialRutaProp, rutaId }: RutaClientProps) => {

  const router = useRouter()

  const { user: currentUser } = useAuth()

  const pagosInFlightRef = useRef<Map<string, number>>(new Map())



  const [rutaData, setRutaData] = useState<RutaDetalleMock | null>(initialRutaProp)

  const [loadingRuta, setLoadingRuta] = useState(!initialRutaProp && !!rutaId)

  const [rutaCompletada, setRutaCompletada] = useState(!initialRutaProp?.activa)



  const refreshRuta = useCallback(async (prestamoIdToLock?: string) => {

    if (!rutaId) return;

    if (prestamoIdToLock) {
      pagosInFlightRef.current.set(String(prestamoIdToLock), Date.now())
    }

    try {

      const ruta = await rutasService.obtenerRutaPorId(rutaId);

      setRutaData(ruta as any);

      setRutaCompletada(!(ruta as any)?.activa);

    } catch (e) {

      console.error('Error refrescando ruta:', e);

    }
    finally {
      if (prestamoIdToLock) {
        pagosInFlightRef.current.delete(String(prestamoIdToLock))
      }
    }

  }, [rutaId]);



  useRealtimeData(['pagos_actualizados', 'rutas_actualizadas', 'prestamos_actualizados', 'jornadas_actualizadas'], async (payload?: any) => {

    const prestamoId = payload?.prestamoId || payload?.metadata?.prestamoId
    const inFlightTs = prestamoId ? pagosInFlightRef.current.get(String(prestamoId)) : undefined;
    if (inFlightTs !== undefined && Date.now() - inFlightTs < 3000) {
      return
    }
    if (prestamoId && inFlightTs !== undefined) {
      pagosInFlightRef.current.delete(String(prestamoId))
    }

    await refreshRuta()

  })



  useEffect(() => {

    if (rutaData || !rutaId) return



    const run = async () => {

      try {

        setLoadingRuta(true)

        const ruta = await rutasService.obtenerRutaPorId(rutaId)

        setRutaData(ruta as any)

        setRutaCompletada(!(ruta as any)?.activa)

      } catch (e) {

        setRutaData(null)

      } finally {

        setLoadingRuta(false)

      }

    }



    run()

  }, [rutaData, rutaId])



  const initialRuta = rutaData



  if (loadingRuta) {

    return (

      <div className="min-h-screen flex items-center justify-center bg-slate-50">

        <div className="flex items-center gap-2 text-slate-600 font-medium">

          <Loader2 className="w-5 h-5 animate-spin" />

          <span>Cargando detalle de ruta...</span>

        </div>

      </div>

    )

  }



  if (!initialRuta) {

    return (

      <div className="min-h-screen flex items-center justify-center bg-slate-50">

        <div className="text-center">

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 text-xs text-rose-700 font-bold border border-rose-200">

            <XCircle className="h-3.5 w-3.5" />

            <span>Ruta no encontrada</span>

          </div>

          <p className="mt-4 text-slate-500 font-medium">No se pudo cargar el detalle de la ruta.</p>

          <button

            onClick={() => router.back()}

            className="mt-4 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-50"

          >

            Volver

          </button>

        </div>

      </div>

    )

  }


  return (

    <RutaClientLoaded
      initialRuta={initialRuta}
      rutaData={rutaData as any}
      rutaId={rutaId}
      rutaCompletada={rutaCompletada}
      setRutaCompletada={setRutaCompletada}
      currentUser={currentUser}
      onRutaRefresh={(prestamoIdToLock?: string) => refreshRuta(prestamoIdToLock)}
    />

  )

}

// ...


/**

 * Formatea una fecha UTC para evitar saltos de día por zona horaria

 */

function formatDateUTC(dateStr: string) {
  if (!dateStr) return '---'
  try {
    const dateOnly = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    const [y, m, d] = dateOnly.split('-').map(Number);
    const date = new Date(y, m-1, d, 0, 0, 0, 0); 
    
    if (isNaN(date.getTime())) return '---';

    const day = date.getDate()
    const monthNames = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]
    const month = monthNames[date.getMonth()]
    const year = date.getFullYear()
    return `${day} de ${month} de ${year}`
  } catch {
    return '---'
  }
}



export default RutaClient






