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

import { rutasService } from '@/services/rutas-service'

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

import { prestamosService } from '@/services/prestamos-service'

import { pagosService } from '@/services/pagos-service'

import { FrecuenciaPago } from '@/types/enums'

import { obtenerSaldoDisponibleRuta } from '@/services/contabilidad-service'

import RutaHeader from '@/components/rutas/RutaHeader'

import RutaKpiSection from '@/components/dashboards/shared/RutaKpiSection'

import { HistorialDia, mapNivelRiesgo, mapFrecuenciaToPeriodo } from '@/lib/types/cobranza'

import { exportService } from '@/services/export-service'

import { toast } from 'sonner'

import { useRealtimeData } from '@/hooks/useRealtimeData'
import { useRutaHistorial } from '@/hooks/useRutaHistorial'
import ClienteInfoModal from '@/components/cobranza/ClienteInfoModal'
import { formatShortDate } from '@/lib/utils/format'
import { computeMontoExigibleHastaHoyFromCuotas, computeMontoNominalHastaHoyFromCuotas, computeRutaHoyUiStatsFromVisitas, getBogotaDateKey, getBogotaRangeByPeriod, getPagoBogotaDateKey, isCuotaNoPagada, isTodayOrPastBogota, isVisitaExigibleHoy, normalizeDateKey, resolveFechaEfectivaCuota, shouldMarkVisitaAsPagado, shouldShowVisitaEnRutaHoy, toBogotaDateTimeOffsetIso, resolveProximaCuotaFromPrestamo, computeDiasMoraFromCuotas } from '@/lib/rutas-core'

import { mapAsignacionesToVisitasLite } from '@/lib/ruta-visitas-mapper'
import { buildRecaudosHoyMapByPrestamoId, indexPagosByPrestamoId, sumMontoTotalPagosByBogotaDateKey } from '@/lib/ruta-recaudos'
import { mapWithConcurrency, memoizePromiseByKey } from '@/lib/async-utils'
import { buildHistorialDiaFromBackend } from '@/lib/ruta-historial'

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

  const [showHistory, setShowHistory] = useState(false)
  const [showMisClientes, setShowMisClientes] = useState(false)
  const [enrichNonce, setEnrichNonce] = useState(0)
  
  const [visitaAusente, setVisitaAusente] = useState<VisitaRuta | null>(null)

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

      const toKey = (raw: string): string => getPagoBogotaDateKey(raw)

      let pagosDelDia: any[] = []
      try {
        const pagosResp = await pagosService.obtenerPagos({ limit: 5000 })
        const pagosData = (pagosResp as any)?.pagos || pagosResp || []
        pagosDelDia = (Array.isArray(pagosData) ? pagosData : []).filter((p: any) => {
          const raw = p.fechaPago || p.creadoEn
          if (!raw) return false
          const cobradorMatch = rutaData?.cobradorId ? (p?.cobradorId === rutaData.cobradorId) : true
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
    if (!showHistory) return
    const hoy = hoyBogotaKey
    const dayData = (historialRutasRef.current as any)?.[hoy]
    if (!dayData?.loaded) return
    void enriquecerHistorialDiaConCuotas(hoy)
  }, [showHistory, hoyBogotaKey, enriquecerHistorialDiaConCuotas])

  useEffect(() => {
    if (!showHistory) return
    if (!selectedHistoryDate) return
    void enriquecerHistorialDiaConCuotas(selectedHistoryDate)
  }, [showHistory, selectedHistoryDate, enriquecerHistorialDiaConCuotas])



  useEffect(() => {

    if (!showHistory || !initialRuta?.id) return;

    const hoy = hoyBogotaKey;
    const existing = (historialRutas || {})[hoy];

    if (!existing || (!existing.loaded)) {

      cargarHistorialFecha(hoy);

    }

  }, [showHistory, rutaId, historialRutas, cargarHistorialFecha]);  // === Mapeo de asignaciones a modelo de UI (VisitaRuta) ===
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
      return [
        {
          ...v,
          // Ajuste de forma admin: mantiene el mismo shape que usaba antes.
          cobradorId: initialRuta?.cobradorId || '',
        },
      ]
    })

    const clientesConPrestamo = new Set(firstPass.filter((v: any) => v.prestamoId).map((v: any) => v.clienteId))
    return firstPass.filter((v: any) => {
      if (!v.prestamoId && clientesConPrestamo.has(v.clienteId)) return false
      return true
    }) as VisitaRuta[]
  }, [initialRuta?.cobradorId]);

  const [visitasCobrador, setVisitasCobrador] = useState<VisitaRuta[]>(() => mapearAsignacionesAVisitas(initialRuta));

  useEffect(() => {
    visitasCobradorRef.current = visitasCobrador
  }, [visitasCobrador])

  // Mantener visitas actualizadas cuando cambian los datos de la ruta (WebSocket)
  useEffect(() => {
    if (rutaData) {
      const nextList = mapearAsignacionesAVisitas(rutaData)
      const prevList = visitasCobradorRef.current
      const prevById = new Map<string, any>((Array.isArray(prevList) ? prevList : []).map((v: any) => [String(v?.id || ''), v]))

      const merged = (Array.isArray(nextList) ? nextList : []).map((v: any) => {
        const id = String(v?.id || '')
        const local = prevById.get(id)
        if (!local) return v

        const localRecaudoDia = Number(local?.recaudadoDelDia || 0)
        const nextRecaudoDia = Number(v?.recaudadoDelDia || 0)
        const recaudadoDelDia = Math.max(localRecaudoDia, nextRecaudoDia)

        const localRecaudoTotal = Number(local?.recaudadoTotalClient || 0)
        const nextRecaudoTotal = Number(v?.recaudadoTotalClient || 0)
        const localHasRecaudoTotal = local?.recaudadoTotalClient !== undefined && local?.recaudadoTotalClient !== null
        const nextHasRecaudoTotal = v?.recaudadoTotalClient !== undefined && v?.recaudadoTotalClient !== null
        const recaudadoTotalClient = (localHasRecaudoTotal || nextHasRecaudoTotal)
          ? Math.max(localRecaudoTotal, nextRecaudoTotal)
          : undefined

        const estadoLocal = String(local?.estado || '')
        const estadoBackend = String(v?.estado || '')
        const saldoBackend = Number(v?.saldoTotal || 0)
        const proxBackend = String(v?.proximaVisita || '')
        const proxLocal = String(local?.proximaVisita || '')
        const esNuevaCuota = !!proxBackend && !!proxLocal && proxBackend !== proxLocal

        const localTienePagoHoy =
          Number(local?.recaudadoDelDia || 0) > 0 ||
          Number(v?.recaudadoDelDia || 0) > 0

        // Preservar el estado local si es 'pagado' o 'ausente' (evitar que el backend lo sobreescriba
        // antes de que el siguiente ciclo de enriquecimiento lo valide con pagos reales)
        const estadoProtegidoLocalmente =
          (estadoLocal === 'pagado' && !esNuevaCuota && saldoBackend > 0) ||
          (estadoLocal === 'ausente' && !localTienePagoHoy)
        const estado = estadoProtegidoLocalmente
          ? estadoLocal
          : (estadoBackend as any)

        // Si el estado quedó protegido como 'ausente', asegurar que estadoVisita también lo refleje
        const estadoVisita =
          estadoLocal === 'ausente' && !localTienePagoHoy
            ? 'ausente'
            : v?.estadoVisita

        return {
          ...v,
          recaudadoDelDia,
          recaudadoTotalClient,
          estado,
          estadoVisita,
        }
      })

      setVisitasCobrador(merged as any);
    }
  }, [rutaData, mapearAsignacionesAVisitas]);





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

      const recaudosHoyMap = buildRecaudosHoyMapByPrestamoId(todosPagos as any, hoyBogota)

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

              montoCuotaReal = exigibleNominal > 0 ? exigibleNominal : (montoPendiente > 0 ? montoPendiente : montoCuotaReal)
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
            const cobroSuficiente = totalHoy >= (cuotaComparar - 1);

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
                montoCuotaExigible: v.montoCuota,
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
              montoCuotaPendiente: montoCuotaPendienteReal,
              proximaVisita: fechaReal,
              cuotaActual,
              cuotasTotales,
              estado: nuevoEstado 
            };
          } catch (error) {
            console.error("Error en enriquecerConPagos (Admin):", error);
            return { ...v, recaudadoDelDia: 0, recaudadoTotalClient: 0, fechaUltimoPago: 0 };
          }
        },
        6,
      );

      setVisitasCobrador(actualizadas);
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
  }, [visitasCobrador, searchQuery, periodoRutaFiltro, showHistory, showMisClientes, initialRuta?.id]);



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

      case 'ausente': return 'bg-orange-50 text-orange-700 border-orange-500/30'

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

  const refreshActivacionHoy = useCallback(async () => {
    if (!initialRuta?.id) return
    try {
      const resp = await routesService.getActivacionHoy(initialRuta.id)
      setRutaActivadaHoy(Boolean(resp?.activadaHoy))
    } catch (e) {
      // ignore
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
      setRutaActivadaHoy(Boolean(resp?.activadaHoy))
      showNotification('success', resp?.message || 'Ruta activada para hoy correctamente', 'Éxito')
    } catch (error) {
      console.error('Error activando ruta del día:', error)
      showNotification('error', 'No se pudo activar la ruta para hoy', 'Error')
    } finally {
      setLoadingActivacionHoy(false)
    }
  }

  const rutaOperable = rutaActivadaHoy && !rutaCompletada



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

  const nivelRiesgo = (rutaData as any)?.nivelRiesgo || initialRuta.nivelRiesgo;

  const porcentajeProgreso = estadisticas?.avanceDiario || 0;

  useEffect(() => {
    const run = async () => {
      try {
        const { inicio, fin } = getDatesByPeriod(periodoCards)
        const saldo: any = await obtenerSaldoDisponibleRuta(initialRuta.id, undefined, inicio, fin)

        const recaudo = Number(saldo?.cobranzaDelDia ?? saldo?.recaudoDelDia ?? estadisticas?.cobranzaDelDia ?? 0)

        const isAusente = (v: any) => {
          const estadoVisita = String(v?.estadoVisita || '').toLowerCase()
          const estado = String(v?.estado || '').toLowerCase()
          return estadoVisita === 'ausente' || estado === 'ausente'
        }

        const visitasParaMeta = Array.isArray(visitasCobrador)
          ? visitasCobrador.filter((v: any) => !isAusente(v))
          : []
        const statsHoy = computeRutaHoyUiStatsFromVisitas(visitasParaMeta, recaudo)

        const metaBackendRaw = estadisticas?.metaDelDia
        const hasMetaBackend = metaBackendRaw !== null && metaBackendRaw !== undefined
        const metaBackend = hasMetaBackend ? Number(metaBackendRaw) : null

        const meta = periodoCards === 'HOY'
          ? Number(statsHoy.meta || 0)
          : Number(metaBackend ?? 0)

        const recaudoFinal = Number(statsHoy.recaudo ?? recaudo ?? 0)

        const pendienteHoy = periodoCards === 'HOY'
          ? Math.max(0, meta - recaudoFinal)
          : undefined

        const eficiencia = meta > 0
          ? Math.min(100, Math.max(0, Number(((recaudo / meta) * 100).toFixed(1))))
          : Number(estadisticas?.avanceDiario ?? 0)

        setRutaStatsCards({
          recaudo,
          meta,
          eficiencia,
          pendiente: pendienteHoy,
          gastos: Number(saldo?.gastosDelDia ?? 0),
          base: Number(saldo?.saldoCaja ?? saldo?.baseEfectivo ?? 0)
        } as any)
      } catch {
        const recaudo = Number(estadisticas?.cobranzaDelDia ?? 0)

        const isAusente = (v: any) => {
          const estadoVisita = String(v?.estadoVisita || '').toLowerCase()
          const estado = String(v?.estado || '').toLowerCase()
          return estadoVisita === 'ausente' || estado === 'ausente'
        }

        const visitasParaMeta = Array.isArray(visitasCobrador)
          ? visitasCobrador.filter((v: any) => !isAusente(v))
          : []
        const statsHoy = computeRutaHoyUiStatsFromVisitas(visitasParaMeta, recaudo)

        const metaBackendRaw = estadisticas?.metaDelDia
        const hasMetaBackend = metaBackendRaw !== null && metaBackendRaw !== undefined
        const metaBackend = hasMetaBackend ? Number(metaBackendRaw) : null

        const meta = periodoCards === 'HOY'
          ? Number(statsHoy.meta || 0)
          : Number(metaBackend ?? 0)

        const recaudoFinal = Number(statsHoy.recaudo ?? recaudo ?? 0)

        const pendienteHoy = periodoCards === 'HOY'
          ? Math.max(0, meta - recaudoFinal)
          : undefined

        const eficiencia = meta > 0
          ? Math.min(100, Math.max(0, Number(((recaudo / meta) * 100).toFixed(1))))
          : Number(estadisticas?.avanceDiario ?? 0)
        setRutaStatsCards((prev) => ({
          ...prev,
          recaudo,
          meta,
          eficiencia,
          pendiente: periodoCards === 'HOY' ? pendienteHoy : prev.pendiente,
        }))
      }
    }

    if (!initialRuta?.id) return
    void run()
  }, [estadisticas?.cobranzaDelDia, estadisticas?.metaDelDia, estadisticas?.avanceDiario, getDatesByPeriod, initialRuta?.id, periodoCards, visitasCobrador])



  const [misCreditos, setMisCreditos] = useState<VisitaRuta[]>([])

  const [loadingMisCreditos, setLoadingMisCreditos] = useState(false)



  const cargarMisCreditos = useCallback(async () => {
    const cobradorId = rutaData?.cobradorId || initialRuta?.cobradorId
    if (!cobradorId) return
    try {
      setLoadingMisCreditos(true)
      const resp = await rutasService.obtenerCreditosAsignadosACobrador(cobradorId)
      const raw = (resp as any)?.data
      const filas = Array.isArray(raw) ? raw : []
      if (!Array.isArray(raw)) {
        console.warn('Mis clientes: respuesta inesperada en obtenerCreditosAsignadosACobrador', resp)
      }

      // Enriquecer cada préstamo con cuotas reales para cálculo de mora del administrador
      const mapped = await Promise.all(filas.map(async (row: any, idx: number) => {
        const c = row?.cliente || {}
        const p = row?.prestamo || {}
        const hoyBogotaKey = getBogotaDateKey(new Date())
        
        let cuotaActual = 1;
        let cuotasTotales = Number(p.cantidadCuotas || 0);
        let montoCuota = Number(p.montoCuota || 0);
        let proximaVisitaV = p.fechaEfectiva || getBogotaDateKey(new Date());
        let estadoCalculado: EstadoVisita = 'pendiente';
        let ultimoPagoDate = 0;
        let diasMora = 0;

        const toNivel = (nivel: string) => {
          if (nivel === 'VERDE') return 'bajo'
          if (nivel === 'AMARILLO') return 'precaucion'
          if (nivel === 'ROJO') return 'moderado'
          if (nivel === 'LISTA_NEGRA') return 'critico'
          return 'bajo'
        }

        const esArticulo = p?.tipo === 'ARTICULO' || p?.tipoPrestamo === 'ARTICULO';

        if (p.id) {
          try {
            // 1. Consultar cuotas
            const rawCuotas = await prestamosService.obtenerCuotas(p.id);
            const cuotas = rawCuotas.sort((a, b) => 
               new Date(a.fechaVencimiento).getTime() - new Date(b.fechaVencimiento).getTime()
            );

            diasMora = computeDiasMoraFromCuotas(cuotas as any, hoyBogotaKey, p?.frecuenciaPago || 'DIARIO');

            // 2. Consultar pagos para obtener fecha de último
            try {
              const { pagosService } = await import('@/services/pagos-service');
              const resPagos = await pagosService.obtenerPagos({ prestamoId: p.id });
              if (resPagos && Array.isArray(resPagos.pagos)) {
                resPagos.pagos.forEach((pg: any) => {
                  const d = new Date(pg.fechaPago || pg.creadoEn).getTime();
                  if (!isNaN(d) && d > ultimoPagoDate) ultimoPagoDate = d;
                });
              }
            } catch (ep) { /* ignore */ }

            const pendiente = cuotas.find(cuo => cuo.estado !== 'PAGADA');
            if (pendiente) {
              cuotaActual = pendiente.numeroCuota;
              const montoCuotaBruto = Number(pendiente.monto || (pendiente.montoCapital + pendiente.montoInteres) || 0);
              const montoCuotaPagado = Number(pendiente.montoPagado || 0);
              montoCuota = Math.max(0, montoCuotaBruto - montoCuotaPagado);
              proximaVisitaV = pendiente.fechaVencimiento;

              const tieneMora = cuotas.some((cuo: any) => {
                if (!cuo || !isCuotaNoPagada(cuo)) return false
                const vtoRaw = resolveFechaEfectivaCuota(cuo) || String(cuo?.fechaVencimiento || '')
                const vtoKey = normalizeDateKey(vtoRaw)
                return !!vtoKey && !!hoyBogotaKey && vtoKey < hoyBogotaKey
              })

              estadoCalculado = tieneMora ? 'en_mora' : 'pendiente'
            } else {
               estadoCalculado = 'pagado';
            }
            cuotasTotales = cuotas.length;
          } catch (e) {
            console.warn('Error enriqueciendo Mis Clientes (Admin):', e);
          }
        }

        return {
          id: `${row?.asignacionId || 'asig'}-${p?.id || idx}`,
          cliente: `${c?.nombres || ''} ${c?.apellidos || ''}`.trim() || 'Cliente',
          direccion: c?.direccion || 'Sin dirección registrada',
          telefono: c?.telefono || '',
          horaSugerida: '08:00 AM',
          montoCuota,
          saldoTotal: estadoCalculado === 'pagado' ? 0 : montoCuota,
          estado: estadoCalculado,
          proximaVisita: proximaVisitaV,
          ordenVisita: Number(row?.ordenVisita || idx + 1),
          prioridad: 'media' as any,
          nivelRiesgo: toNivel(c?.nivelRiesgo || 'VERDE') as any,
          diasMora,
          cobradorId: rutaData?.cobradorId || initialRuta.cobradorId,
          periodoRuta: (() => {
            const f = p?.frecuenciaPago || 'DIARIO'
            if (f === 'DIARIO') return 'DIA'
            if (f === 'SEMANAL') return 'SEMANA'
            if (f === 'QUINCENAL') return 'QUINCENA'
            if (f === 'MENSUAL') return 'MES'
            return 'DIA'
          })() as any,
          clienteId: c?.id || '',
          prestamoId: p?.id || '',
          tipoPrestamo: esArticulo ? 'ARTICULO' : 'EFECTIVO',
          articuloNombre: esArticulo ? (p?.articulo || 'Artículo') : 'Préstamo',
          cuotaActual,
          cuotasTotales,
          fechaUltimoPago: ultimoPagoDate
        } as VisitaRuta
      }))

      const seen = new Set<string>()
      const uniques = mapped.filter((v: any) => {
        const key = String(v?.prestamoId || v?.clienteId || v?.id || '')
        if (!key) return true
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })

      const finales = uniques.sort((a: any, b: any) => {
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
      console.error('Error cargando mis clientes (ruta admin):', e)
      toast.error('No se pudieron cargar los clientes asignados.')
    } finally {
      setLoadingMisCreditos(false)
    }
  }, [initialRuta?.cobradorId])



  useEffect(() => {

    if (!showMisClientes) return

    cargarMisCreditos()

  }, [showMisClientes, cargarMisCreditos])

  // Tiempo real: actualización optimista para visitas registradas
  useRealtimeData(['pagos_actualizados', 'rutas_actualizadas', 'prestamos_actualizados'], async (payload?: any) => {
    // Manejo focalizado de visitas registradas (ausente, etc.)
    const accionVisita = payload?.accion || payload?.metadata?.accion;
    const clienteIdVisita = payload?.clienteId || payload?.metadata?.clienteId;
    const estadoVisitaPayload = payload?.estadoVisita || payload?.metadata?.estadoVisita;

    if (accionVisita === 'VISITA_REGISTRADA' && clienteIdVisita && estadoVisitaPayload) {
      setVisitasCobrador((prev: VisitaRuta[]) =>
        prev.map((v) =>
          v.clienteId === clienteIdVisita
            ? { ...v, estado: estadoVisitaPayload as any, estadoVisita: estadoVisitaPayload as any }
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

                    <span className="hidden md:inline">Ver Ruta Actual</span>

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



                  {!rutaCompletada && !showHistory && (

                    <button 

                      type="button"

                      onClick={handleActivarRuta}

                      disabled={loadingActivacionHoy || rutaActivadaHoy}

                      className={`px-4 py-2 border rounded-xl flex items-center gap-2 font-bold shadow-sm transition-colors ${
                        loadingActivacionHoy || rutaActivadaHoy
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 cursor-not-allowed'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}

                    >

                      <CheckCircle2 className="h-4 w-4" />

                      <span className="hidden md:inline">{rutaActivadaHoy ? 'Ruta activada hoy' : (loadingActivacionHoy ? 'Activando...' : 'Activar Ruta')}</span>

                    </button>

                  )}



                  {(currentUser?.rol === 'SUPER_ADMINISTRADOR' || currentUser?.rol === 'ADMIN') && !showHistory && (

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

              {!showHistory && !showMisClientes && (

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

            

            {showHistory ? (

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

                                                    <div className="text-[11px] text-slate-400">Recaudo: <b>${formatMilesCOP((dayData?.resumen?.recaudo || 0) as any)}</b>{dayData?.loaded && dayData.visitas.length > 0 && <span className="ml-2">· {dayData.visitas.length} clientes</span>}</div>

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

                             const isCompleted = data.visitas.length > 0 && (data.resumen.efectividad >= 95 || data.visitas.every((v: any) => v.estado === 'pagado'));

                             return (

                               <div key={date} className={`rounded-2xl border transition-all overflow-hidden bg-white border-slate-200 ${isExpanded ? 'ring-1 ring-slate-300 shadow-md' : 'shadow-sm'}`}>

                                 <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => {
                                   setSelectedHistoryDate(isExpanded ? null : date)
                                   if (!isExpanded && !data.loaded) { void cargarHistorialFecha(date) }
                                 }}>

                                   <div className="flex items-center gap-3">

                                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shadow-sm ${isExpanded ? 'bg-[#08557f] text-white' : 'bg-slate-100 text-slate-600'}`}>{d}</div>

                                      <div>

                                         <div className="font-bold text-slate-900 capitalize flex items-center gap-2">{dayName}{isCompleted && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold uppercase border border-emerald-200">Completada</span>}</div>

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

                                          <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 text-center"><div className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Visitados</div><div className="text-xs font-black text-blue-600">{data.resumen.visitados}/{data.resumen.total}</div></div>

                                       </div>

                                       <div className="space-y-3">

                                          <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase px-1"><span>Clientes Gestionados</span><span>Estado</span></div>

                                           {!data.loaded ? (

                                             <div className="flex flex-col items-center justify-center py-8 text-slate-400"><Loader2 className="w-6 h-6 animate-spin mb-2 opacity-20" /><span className="text-xs font-medium">Cargando detalles...</span></div>

                                           ) : (() => {

                                             const filtradas = data.visitas.filter((v: any) => {
                                               // Filtrar por frecuencia
                                               if (historyFrecuenciaFiltro !== 'TODOS' && v.periodoRuta !== historyFrecuenciaFiltro) return false;
                                               
                                               // Ocultar saldados (pagado y saldo 0) que NO tuvieron actividad (pago o ausente) en este día
                                               const isSaldado = String(v.estado || '').toLowerCase() === 'pagado' && Number(v.saldoTotal || 0) <= 0;
                                               const tuvoActividad = Number(v.recaudadoDelDia || 0) > 0 || v.estadoVisita === 'ausente';
                                               if (isSaldado && !tuvoActividad) return false;

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

            ) : showMisClientes ? (

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
                          allowClick={false}
                          onVerCliente={handleAbrirClienteInfo}
                          getEstadoClasses={getEstadoClasses}
                          getPrioridadColor={getPrioridadColor}
                          actions={
                            <>
                              <button
                                onClick={(e) => { e.stopPropagation(); if (visita.pendienteAprobacion || !rutaOperable) return; handleAbrirPago(visita); }}
                                disabled={visita.pendienteAprobacion || !rutaOperable}
                                title={visita.pendienteAprobacion ? 'Crédito pendiente de aprobación' : !rutaOperable ? (rutaCompletada ? 'Ruta completada' : 'Ruta pendiente de activación') : 'Registrar Pago'}
                                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all font-bold text-[11px] shadow-sm ${visita.pendienteAprobacion || !rutaOperable ? 'bg-slate-50 text-slate-300 border border-slate-100 opacity-50 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'}`}
                              >
                                <DollarSign className="h-3.5 w-3.5" />
                                Pago
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); if (visita.pendienteAprobacion || !rutaOperable) return; handleAbrirAbono(visita); }}
                                disabled={visita.pendienteAprobacion || !rutaOperable}
                                title={visita.pendienteAprobacion ? 'Crédito pendiente de aprobación' : !rutaOperable ? (rutaCompletada ? 'Ruta completada' : 'Ruta pendiente de activación') : 'Registrar Abono'}
                                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all font-bold text-[11px] shadow-sm ${visita.pendienteAprobacion || !rutaOperable ? 'bg-slate-50 text-slate-300 border border-slate-100 opacity-50 cursor-not-allowed' : 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95'}`}
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
                                  if (!visita.enProrroga || isProrrogaVencida) setVisitaReprogramar(visita); 
                                }}
                                disabled={!rutaOperable || (!!visita.enProrroga && !(visita.fechaProrroga && new Date(visita.fechaProrroga).getTime() < Date.now()))}
                                title={!rutaOperable ? (rutaCompletada ? 'Ruta completada' : 'Ruta pendiente de activación') : (visita.enProrroga && !(visita.fechaProrroga && new Date(visita.fechaProrroga).getTime() < Date.now()) ? 'No se puede reprogramar con prorroga activa' : 'Solicitar reprogramacion')}
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
                                                  title={visita.pendienteAprobacion ? 'Crédito pendiente de aprobación' : !rutaOperable ? (rutaCompletada ? 'Ruta completada' : 'Ruta pendiente de activación') : 'Registrar Pago'}
                                                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all font-bold text-[11px] shadow-sm ${visita.pendienteAprobacion || !rutaOperable ? 'bg-slate-50 text-slate-300 border border-slate-100 opacity-50 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'}`}
                                                >
                                                  <DollarSign className="h-3.5 w-3.5" />
                                                  Pago
                                                </button>
                                                <button
                                                  onClick={(e) => { e.stopPropagation(); if (visita.pendienteAprobacion || !rutaOperable) return; handleAbrirAbono(visita); }}
                                                  disabled={visita.pendienteAprobacion || !rutaOperable}
                                                  title={visita.pendienteAprobacion ? 'Crédito pendiente de aprobación' : !rutaOperable ? (rutaCompletada ? 'Ruta completada' : 'Ruta pendiente de activación') : 'Registrar Abono'}
                                                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all font-bold text-[11px] shadow-sm ${visita.pendienteAprobacion || !rutaOperable ? 'bg-slate-50 text-slate-300 border border-slate-100 opacity-50 cursor-not-allowed' : 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95'}`}
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
                                                    setVisitaAusente(visita);
                                                  }}
                                                  disabled={!rutaOperable || visita.estadoVisita === 'ausente' || visita.estado === 'ausente'}
                                                  title={!rutaOperable ? (rutaCompletada ? 'Ruta completada' : 'Ruta pendiente de activación') : (visita.estadoVisita === 'ausente' || visita.estado === 'ausente' ? 'Cliente ya marcado como ausente' : 'Marcar como ausente')}
                                                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border transition-all font-bold text-[11px] shadow-sm ${!rutaOperable || visita.estadoVisita === 'ausente' || visita.estado === 'ausente' ? 'bg-slate-50 text-slate-300 border-slate-100 opacity-50 cursor-not-allowed' : 'bg-white text-rose-700 border-rose-200 hover:bg-rose-50 active:scale-95'}`}
                                                >
                                                  <XCircle className="h-3.5 w-3.5" />
                                                  Ausente
                                                </button>
                                                <button
                                                  onClick={(e) => { 
                                                    e.stopPropagation(); 
                                                    if (!rutaOperable) return;
                                                    const isProrrogaVencida = visita.enProrroga && visita.fechaProrroga && new Date(visita.fechaProrroga).getTime() < Date.now();
                                                    if (!visita.enProrroga || isProrrogaVencida) setVisitaReprogramar(visita); 
                                                  }}
                                                  disabled={!rutaOperable || (!!visita.enProrroga && !(visita.fechaProrroga && new Date(visita.fechaProrroga).getTime() < Date.now()))}
                                                  title={!rutaOperable ? (rutaCompletada ? 'Ruta completada' : 'Ruta pendiente de activación') : (visita.enProrroga && !(visita.fechaProrroga && new Date(visita.fechaProrroga).getTime() < Date.now()) ? 'No se puede reprogramar con prorroga activa' : 'Solicitar reprogramacion')}
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
          onClose={() => setVisitaAusente(null)}
          onConfirm={async (notas) => {
            if (!initialRuta?.id || !visitaAusente?.clienteId) return;
            await rutasService.marcarVisitaAusente(initialRuta.id, visitaAusente.clienteId, {
              estadoVisita: 'ausente',
              notas,
            });
            // Actualización optimista: marcar el cliente como ausente en el estado local
            // inmediatamente para que el UI refleje el cambio sin esperar al enrich.
            const clienteIdAusente = visitaAusente.clienteId;
            setVisitasCobrador((prev) =>
              (prev || []).map((v) =>
                v.clienteId === clienteIdAusente
                  ? { ...v, estado: 'ausente' as any, estadoVisita: 'ausente' as any }
                  : v
              )
            );
            showNotification('success', 'Cliente marcado como ausente', 'Éxito');
            setVisitaAusente(null);
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
          onClose={() => setPagoVisita(null)}
          onConfirm={async (monto, metodo, comprobante, contexto) => {
            try {
              const pagoActual = pagoVisita

              // Cerrar inmediatamente para UX
              setPagoVisita(null)

              if (!pagoActual?.visita?.clienteId || !pagoActual?.visita?.prestamoId) {
                showNotification('error', 'No se pudo registrar el pago: falta cliente o préstamo', 'Error');
                return;
              }

              await pagosService.registrarPago({
                clienteId: pagoActual.visita.clienteId,
                prestamoId: pagoActual.visita.prestamoId,
                cobradorId: initialRuta.cobradorId,
                montoTotal: monto,
                metodoPago: metodo,
                comprobante: comprobante,
                tipoRegistro: contexto?.tipoRegistro || pagoActual.tipo,
                cuotaNumeroEsperada: contexto?.cuotaNumeroEsperada,
                montoCuotaEsperado: contexto?.montoCuotaEsperado,
              } as any);

              // Actualización optimista: quitar estado de ausente si el cliente estaba marcado
              const clienteIdPago = pagoActual.visita.clienteId;
              setVisitasCobrador((prev) =>
                (prev || []).map((v: any) => {
                  if (v.clienteId !== clienteIdPago) return v

                  const estadoActual = String(v?.estado || '').toLowerCase()

                  const estadoSinAusente =
                    estadoActual === 'ausente'
                      ? (
                          Number(v?.diasMora || 0) > 0 || Boolean(v?.enMoraHistorico)
                            ? 'en_mora'
                            : 'pendiente'
                        )
                      : v.estado

                  return {
                    ...v,
                    estado: estadoSinAusente,
                    estadoVisita: undefined as any,
                    notasVisita: undefined as any,
                  }
                })
              );

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
            }
          }}
        />
      )}

      {visitaReprogramar && (

        <ReprogramarModal

            visita={visitaReprogramar}

            onClose={() => setVisitaReprogramar(null)}

            onConfirm={async (fecha, motivo, cuotaId) => {

              if (!visitaReprogramar) return;
              if (!fecha || !motivo) return;

              const formatearFechaISO = (iso: string) => {
                const [yyyy, mm, dd] = iso.split('-')
                if (!yyyy || !mm || !dd) return iso
                return `${dd}/${mm}`
              }

              try {
                if (!visitaReprogramar?.prestamoId) {
                  toast.error('La visita seleccionada no tiene un préstamo asociado.')
                  return;
                }

                if (cuotaId) {
                  await prestamosService.solicitarReprogramacionCuota({
                    prestamoId: visitaReprogramar.prestamoId,
                    cuotaId,
                    nuevaFecha: fecha,
                    motivo,
                  } as any)
                } else {
                  await prestamosService.reprogramarPrestamo(visitaReprogramar.prestamoId, {
                    fecha,
                    motivo,
                    cobradorId: currentUser?.id || '',
                  } as any)
                }

                setVisitasCobrador((prev) =>
                  prev.map((v) => {
                    if (v.id !== visitaReprogramar.id) return v
                    return {
                      ...v,
                      estado: 'reprogramado' as any,
                      proximaVisita: formatearFechaISO(fecha),
                    }
                  })
                )

                toast.success('Solicitud de reprogramación enviada exitosamente', {
                  description: `La cuota será revisada para reprogramarse al ${formatearFechaISO(fecha)}`,
                })

                setVisitaReprogramar(null)

                try {
                  await onRutaRefresh?.();
                } catch {}

              } catch (error: any) {
                console.error('Error reprogramando cuota (ruta admin):', error)
                toast.error(error?.message || 'No se pudo realizar la reprogramación.')
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

            else if (accionPendiente === 'REPROGRAMAR') setVisitaReprogramar(visita)

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
              nextPagoMonto={Number((detalleActual as any)?.montoCuotaPendiente ?? detalleActual.montoCuota ?? 0)}
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

              const esContado = Boolean((data as any).ventaContado)
              const isArticulo = data.creditType === 'articulo'
              const freq = esContado ? 'MENSUAL' : (data.frecuenciaPago || 'DIARIO')

              const payload: any = {
                clienteId: data.clienteCreditoId,
                tipoPrestamo: isArticulo ? 'ARTICULO' : 'EFECTIVO',
                monto: data.monto || 0,
                tasaInteres: esContado ? 0 : (data.tasaInteres || 0),
                tasaInteresMora: 2.0,
                plazoMeses: data.plazoMeses || 1,
                cantidadCuotas: data.cantidadCuotas || data.cuotas || data.cuotasTotales || (isArticulo ? data.numCuotas : 0),
                cuotas: data.cuotas || data.cantidadCuotas || (isArticulo ? data.numCuotas : 0),
                frecuenciaPago: freq,
                fechaInicio: data.fechaInicio || toBogotaDateTimeOffsetIso(new Date()),
                fechaPrimerCobro: esContado ? undefined : data.fechaPrimerCobro,
                creadoPorId: currentUser?.id || '',
                cuotaInicial: data.cuotaInicialArticulo || 0,
                notas: isArticulo
                  ? `${esContado ? 'Venta de contado' : 'Crédito de artículo'}: ${data.articuloNombre || ''}`
                  : (data.notas || ''),
                tipoAmortizacion: isArticulo ? 'INTERES_SIMPLE' : (data.tipoInteres || 'INTERES_SIMPLE'),
                esContado: esContado,
              }

              if (isArticulo) {
                payload.productoId = data.articuloId
                payload.precioProductoId = esContado ? undefined : data.precioProductoId
              }

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

    </div>

  )

}



const RutaClient = ({ initialRuta: initialRutaProp, rutaId }: RutaClientProps) => {

  const router = useRouter()

  const { user: currentUser } = useAuth()

  const pagosInFlightRef = useRef<Set<string>>(new Set())



  const [rutaData, setRutaData] = useState<RutaDetalleMock | null>(initialRutaProp)

  const [loadingRuta, setLoadingRuta] = useState(!initialRutaProp && !!rutaId)

  const [rutaCompletada, setRutaCompletada] = useState(!initialRutaProp?.activa)



  const refreshRuta = useCallback(async (prestamoIdToLock?: string) => {

    if (!rutaId) return;

    if (prestamoIdToLock) {
      pagosInFlightRef.current.add(String(prestamoIdToLock))
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



  useRealtimeData(['pagos_actualizados', 'rutas_actualizadas', 'prestamos_actualizados'], async (payload?: any) => {

    const prestamoId = payload?.prestamoId || payload?.metadata?.prestamoId
    if (prestamoId && pagosInFlightRef.current.has(String(prestamoId))) return

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

