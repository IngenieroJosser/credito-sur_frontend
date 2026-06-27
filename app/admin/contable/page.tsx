'use client'
import { logger } from '@/lib/logger'

/**
 * ============================================================================
 * MÓDULO DE GESTIÓN CONTABLE Y FINANCIERA
 * ============================================================================
 * 
 * @description
 * Dashboard financiero centralizado para la administración de flujos de efectivo.
 * Permite gestionar múltiples "Cajas" (Principal y de Rutas), registrar ingresos/egresos
 * manuales, y supervisar el cierre diario de operaciones (Cuadre de Caja).
 * 
 * @roles ['CONTADOR', 'ADMIN', 'SUPER_ADMINISTRADOR']
 * 
 * @features
 * - Multi-caja: Soporte para cajas independientes por ruta y caja fuerte principal.
 * - Auditoría: Registro inmutable de cierres (Cuadrada vs Descuadrada).
 * - Categorización: Movimientos tipificados para facilitar reportes P&L (Ganancias y Pérdidas).
 */

import React, { useState, Suspense, useEffect, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useNotification } from '@/components/providers/NotificationProvider'
import { Rol } from '@/lib/permissions'
import { usuariosService, type Usuario } from '@/services/usuarios-service';
import { getBogotaDateKey, normalizeDateKey } from '@/lib/rutas-core'
import {
  esCuotaInicialContable,
  esEgresoOperativoContable,
  esIngresoContableGeneral,
  getEtiquetaMovimientoContable,
} from '@/lib/contabilidad-clasificacion'
import { useRealtimeData } from '@/hooks/useRealtimeData'
import { formatRoleLabel } from '@/lib/display-labels'

import {
  DollarSign,
  TrendingUp,
  TrendingDown,

  ArrowUpRight,
  ArrowDownLeft,
  Briefcase,
  Wallet,
  XCircle,
  Eye,
  Edit2,
  Plus,
  Receipt,
  Zap,
  CreditCard,
  BarChart3,
  Clock,
  History,
  CheckCircle2,
  X,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ArrowRightLeft,
  Search,
} from 'lucide-react'

import { formatCOPInputValue, formatCurrency, parseCOPInputToNumber, cn, formatMilesCOP } from '@/lib/utils'
import MoneyAmount from '@/components/contable/MoneyAmount'
import { ExportButton } from '@/components/ui/ExportButton'
import FiltroRuta from '@/components/filtros/FiltroRuta'
import { 
  getCajas, 
  getTransacciones, 
  getResumenFinanciero, 
  createCaja as apiCreateCaja,
  updateCaja,
  createTransaccion as apiCreateTransaccion,
  getMovimientosLedger,
  type Caja as ApiCaja,
  type Transaccion as ApiTransaccion,
  type MovimientoLedger as ApiMovimientoLedger,
  type ResumenFinanciero as ApiResumen,
  getHistorialCierres,
  consolidarCaja,
  obtenerSaldoDisponibleRuta,
  type SaldoDisponibleRuta
} from '@/services/contabilidad-service'
import { toast } from 'sonner'
import { rutasService, type Ruta as ApiRuta } from '@/services/rutas-service'
import { exportService } from '@/services/export-service'
import SelectCategoria from '@/components/ui/SelectCategoria'
import AnimacionCarga from '@/components/ui/AnimacionCarga'
import Link from 'next/link'
import DeudorasCobradorCard from '@/components/contable/DeudorasCobradorCard'
import FieldLabel from '@/components/ui/FieldLabel'

// --- TIPOS DE DATOS ---
// Definimos la estructura de nuestras "Cajas".
// Una caja puede ser la PRINCIPAL (Caja fuerte de la oficina) o DE RUTA (La billetera del cobrador).
interface Caja {
  id: string
  codigo?: string
  nombre: string
  tipo: 'PRINCIPAL' | 'RUTA'
  rutaId?: string // Si es de tipo RUTA, aquí guardamos a cuál pertenece
  responsable: string // Quién responde por la plata
  responsableId?: string
  saldo: number
  estado: 'ABIERTA' | 'CERRADA'
  recaudoEsperado?: number
  eficiencia?: number
  ultimaActualizacion: string
  rutasSupervisadas?: Array<{ id: string; nombre: string; codigo: string }>
}

// Forzar actualización de TypeScript
type CajaWithRutas = Caja & {
  rutasSupervisadas?: Array<{ id: string; nombre: string; codigo: string }>
}

// Historial de cuando se cierra la caja (El famoso "Cuadre")
interface HistorialCierre {
  id: string
  fecha: string
  caja: string
  responsable: string
  saldoSistema: number // Lo que el software dice que debe haber
  saldoReal: number    // Lo que se contó físicamente (billete sobre billete)
  diferencia: number   // Si sobra (+) o falta (-) plata
  estado: 'CUADRADA' | 'DESCUADRADA'
}

type OrigenMovimientoContable = 'TODOS' | 'EMPRESA' | 'COBRADOR' | 'CLIENTE' | 'SISTEMA'

// Cada movimiento de dinero que entra o sale
interface MovimientoContable {
  id: string
  numero?: string // TRX-IN... TRX-OUT...
  fecha: string
  concepto: string
  tipo: 'INGRESO' | 'EGRESO' | 'TRANSFERENCIA' | 'DEUDA_COBRADOR'
  monto: number
  categoria: string // Ej: 'Transporte', 'Papelería', 'Aporte Capital'
  responsable: string
  origen: Exclude<OrigenMovimientoContable, 'TODOS'> // Quién generó el movimiento
  estado: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO'
  referencia?: string // Número de recibo, factura, etc.
  rutaId?: string
  cajaId: string
  cajaOrigenId?: string
  tipoReferencia?: string
  referenciaId?: string
  caja?: string
  accountCode?: string
  accountName?: string
  direction?: 'IN' | 'OUT'
  impactoCaja?: number
  origenGestion?: string | null
  fechaOperativaRuta?: string | null
}

// Resumen general para los indicadores de arriba (KPIs)
interface ResumenFinanciero {
  ingresosHoy: number
  egresosHoy: number
  cuotaInicialHoy: number
  utilidadNeta: number
  margenArticulosHoy?: number
  deudaCobradorHoy?: number
  capitalEnCalle: number // Dinero prestado que aún no ha regresado
  cajaActual: number // Dinero disponible ya mismo
  porcentajeIngresosVsAyer: number | null
  porcentajeEgresosVsAyer: number | null
  porcentajeCuotaInicialVsAyer?: number | null
  esIngresoPositivo: boolean
  esEgresoPositivo: boolean
  rutasTotales: number
  rutasAbiertas: number
  rutasPendientesConsolidacion: number
  consolidacionesHoy: number
  porcentajeCierre: number
}

type RutaResumen = {
  id: string
  nombre: string
  responsable: string
}

// ─── Helper: mapea ApiTransaccion → MovimientoContable ───────────────────────
// Centraliza la lógica que antes estaba duplicada 3 veces en fetchData,
// loadMovimientosDetalle y loadMovimientosGlobalPorTipo.
const mapTransaccion = (t: ApiTransaccion): MovimientoContable => {
  const tipoRefRaw = String((t as any).tipoReferencia || '').toUpperCase()
  const origenBackend = (t as any).origen

  const origenInferido = (() => {
    // Abonos de deuda del cobrador: el origen real es el COBRADOR.
    if (tipoRefRaw.includes('ABONO_DEUDA')) return 'COBRADOR'

    // Pagos de clientes: el origen real es el CLIENTE.
    if (['PAGO', 'ABONO', 'CUOTA_INICIAL', 'RESTAURACION_CUOTA_INICIAL'].includes(tipoRefRaw)) return 'CLIENTE'

    // Si el backend manda origen explícito (y no es un fallback genérico), respetarlo.
    if (origenBackend && String(origenBackend).toUpperCase() !== 'EMPRESA') return origenBackend

    return 'EMPRESA'
  })()

  return {
    id: t.id,
    numero: t.numero,
    fecha: t.fecha,
    concepto: t.descripcion,
    tipo: t.tipo,
    monto: t.monto,
    categoria: t.categoria || 'GENERAL',
    responsable: t.responsable,
    origen: origenInferido as Exclude<OrigenMovimientoContable, 'TODOS'>,
    estado: (t.estado as any) || 'APROBADO',
    rutaId: (t as any).rutaId,
    cajaId: (t as any).cajaId,
    cajaOrigenId: (t as any).cajaOrigenId,
    tipoReferencia: (t as any).tipoReferencia,
    referenciaId: (t as any).referenciaId,
    caja: (t as any).caja,
    accountCode: (t as any).accountCode,
    accountName: (t as any).accountName,
    direction: (t as any).direction,
    impactoCaja: (t as any).impactoCaja,
    origenGestion: (t as any).origenGestion ?? null,
    fechaOperativaRuta: (t as any).fechaOperativaRuta ?? null,
  }
}

const mapMovimientoLedger = (m: ApiMovimientoLedger): MovimientoContable => {
  const impactoCaja = Number(m.impactoCaja || 0)
  const tipoLedger = String(m.tipo || '').toUpperCase()
  const esVentaArticulo = tipoLedger === 'VENTA_ARTICULO'
  const esVentaArticuloFinanciada = esVentaArticulo && impactoCaja === 0
  const tipo: MovimientoContable['tipo'] =
    tipoLedger === 'CONSOLIDACION' || tipoLedger === 'TRANSFERENCIA' || esVentaArticuloFinanciada
      ? 'TRANSFERENCIA'
      : impactoCaja < 0
        ? 'EGRESO'
        : 'INGRESO'
  const montoCaja = Math.abs(impactoCaja)
  const montoContable = Math.abs(Number(m.totalDebito || m.totalCredito || 0))

  return {
    id: m.id,
    numero: m.referenciaId,
    fecha: m.fecha,
    concepto: esVentaArticuloFinanciada
      ? `Venta de artículo financiado — ${m.descripcion || 'asiento contable sin entrada de caja'}`
      : m.descripcion || m.tipo,
    tipo,
    monto: esVentaArticulo ? montoCaja : Math.abs(impactoCaja || montoContable),
    categoria: esVentaArticuloFinanciada ? 'Asiento contable de venta' : (m.accountName || m.tipo || 'GENERAL'),
    responsable: m.creadoPorId || 'Sistema',
    origen: tipoLedger === 'PAGO'
      ? 'CLIENTE'
      : tipoLedger === 'CONSOLIDACION' || tipoLedger === 'TRANSFERENCIA'
        ? 'COBRADOR'
        : 'EMPRESA',
    estado: 'APROBADO',
    referenciaId: m.referenciaId,
    tipoReferencia: m.tipo,
    cajaId: m.cajaId || m.lineas.find((linea) => linea.cajaId)?.cajaId || '',
    caja: m.caja || m.lineas.find((linea) => linea.caja)?.caja || undefined,
    accountCode: m.accountCode || undefined,
    accountName: m.accountName || undefined,
    direction: m.direction,
    impactoCaja,
    origenGestion: m.origenGestion || null,
    fechaOperativaRuta: m.fechaOperativaRuta || null,
  }
}

const esMovimientoPagoRegularizado = (m: Pick<MovimientoContable, 'origenGestion' | 'tipoReferencia'> | ApiMovimientoLedger) => {
  const origenGestion = String((m as any).origenGestion || '').toUpperCase()
  const tipo = String((m as any).tipo || '').toUpperCase()
  const tipoReferencia = String((m as any).tipoReferencia || '').toUpperCase()
  return origenGestion === 'CIERRE_PENDIENTE' && (tipo === 'PAGO' || tipoReferencia === 'PAGO')
}

const formatFechaOperativaRuta = (fecha?: string | null) => {
  const key = String(fecha || '').slice(0, 10)
  if (!key) return 'sin fecha'
  return new Date(`${key}T00:00:00-05:00`).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const mapMovimientoLedgerResultado = (m: ApiMovimientoLedger, tipoResultado: 'INGRESO' | 'EGRESO'): MovimientoContable => {
  const prefix = tipoResultado === 'INGRESO' ? '3.' : '4.'
  const montoResultado = (m.lineas || [])
    .filter((linea) => {
      const accountCode = String(linea.accountCode || '')
      if (tipoResultado === 'INGRESO' && accountCode.startsWith('3.4')) return false
      return accountCode.startsWith(prefix)
    })
    .reduce((acc, linea) => {
      const debito = Number(linea.debitAmount || 0)
      const credito = Number(linea.creditAmount || 0)
      return acc + (tipoResultado === 'INGRESO' ? credito - debito : debito - credito)
    }, 0)
  const base = mapMovimientoLedger(m)

  return {
    ...base,
    tipo: tipoResultado,
    monto: Math.max(0, montoResultado),
    categoria: base.accountName || base.categoria,
    tipoReferencia: m.tipo,
  }
}

const esPagoClienteEnPanelContable = (m: Pick<MovimientoContable, 'tipoReferencia'> | ApiMovimientoLedger) => {
  const tipo = String((m as any).tipo || '').toUpperCase()
  const tipoReferencia = String((m as any).tipoReferencia || '').toUpperCase()
  return tipo === 'PAGO' || tipoReferencia === 'PAGO'
}

const ocultarPagosClientePanelContable = <T extends Pick<MovimientoContable, 'tipoReferencia'> | ApiMovimientoLedger>(movimientos: T[]) => {
  return movimientos.filter((m) => !esPagoClienteEnPanelContable(m))
}

const esRecepcionConsolidacion = (m: Pick<MovimientoContable, 'tipo' | 'tipoReferencia' | 'direction' | 'impactoCaja'>) => {
  const ref = String(m.tipoReferencia || '').toUpperCase()
  return (
    (String(m.tipo || '').toUpperCase() === 'TRANSFERENCIA' || ref === 'CONSOLIDACION') &&
    (m.direction === 'IN' || Number(m.impactoCaja || 0) > 0)
  )
}

const normalizarConceptoContable = (concepto: string, movimiento?: MovimientoContable | null) => {
  const limpio = String(concepto || '')
    .replace(/^Entrada desde .*?: |^Salida hacia .*?: |^Consolidación .*?: /i, '')
    .replace(/^Transferencia enviada a .*?: |^Transferencia recibida de .*?: /i, '')
    .replace(/^Reversa de asiento\s+DESEMBOLSO\b/i, 'Reversa de desembolso')
    .replace(/\(Entrada\)|\(Salida\)/gi, '')
    .trim()

  if (movimiento && esRecepcionConsolidacion(movimiento)) {
    return limpio.replace(/^Consolidación\b/i, 'Recepción')
  }

  return limpio
}

const ModuloContableContent = () => {
  // --- AUTENTICACIÓN Y PERMISOS ---
  // Identificamos quién está usando el módulo para mostrar/ocultar botones sensibles
  const [userRole, setUserRole] = useState<Rol | null>(null)
  
  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      try {
        const user = JSON.parse(userData)
        setUserRole(user.rol)
      } catch (e) {
        console.error('Error al leer datos del usuario', e)
      }
    }
  }, [])

  // --- ESTADOS DE LA INTERFAZ (UI) ---
  const [showCrearCajaModal, setShowCrearCajaModal] = useState(false)
  const { showNotification } = useNotification()
  
  // Filtros para la tabla de movimientos
  const [busqueda, setBusqueda] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<'TODOS' | 'INGRESO' | 'EGRESO' | 'TRANSFERENCIA' | 'DEUDA_COBRADOR'>('TODOS')
  const [filtroOrigen, setFiltroOrigen] = useState<OrigenMovimientoContable>('TODOS')
  const [filtroEstado, setFiltroEstado] = useState<'TODOS' | MovimientoContable['estado']>('TODOS')
  const [filtroRuta, setFiltroRuta] = useState<string>('TODOS')

  // Control de todos los modales (ventanas emergentes)
  const [showEditarCajaModal, setShowEditarCajaModal] = useState(false)
  const [showVerArqueoModal, setShowVerArqueoModal] = useState(false)
  const [arqueoSeleccionado, setArqueoSeleccionado] = useState<HistorialCierre | null>(null)
  const [showRegistrarMovimientoModal, setShowRegistrarMovimientoModal] = useState(false)
  const [showVerMovimientoModal, setShowVerMovimientoModal] = useState(false)
  const [showVerCajaModal, setShowVerCajaModal] = useState(false)
  const [cajaSeleccionada, setCajaSeleccionada] = useState<Caja | null>(null)
  const [verCajaRangoStats, setVerCajaRangoStats] = useState<{
    totalRegistrado: number
    saldoPrevio: number
    inicio: string
    fin: string
  } | null>(null)
  const [saldoRutaSeleccionada, setSaldoRutaSeleccionada] = useState<SaldoDisponibleRuta | null>(null)
  const [cajaHoyStats, setCajaHoyStats] = useState<{ ingresos: number; egresos: number } | null>(null)
  const [movimientoSeleccionado, setMovimientoSeleccionado] = useState<MovimientoContable | null>(null)

  const [showDetalleModal, setShowDetalleModal] = useState(false)
  const [detalleTipo, setDetalleTipo] = useState<'INGRESOS' | 'EGRESOS' | 'CUOTAS_INICIALES' | 'UTILIDAD' | 'CIERRES' | 'CIERRES_RUTA' | 'CAJA_TODOS' | null>(null)
  const [detalleCajaFocus, setDetalleCajaFocus] = useState<'RECAUDO' | 'GASTOS' | null>(null)

  const [resumenUtilidadModal, setResumenUtilidadModal] = useState<{
    totalUtilidad: number
    utilidadOperativa: number
    interes: number
    mora: number
    margen: number
    egresosOperativos: number
    utilidadFinanciera: number
    provisionTotal: number
    provisionEnMora: number
    provisionIncumplida: number
    provisionPerdida: number
    saldoEnMora: number
    saldoIncumplido: number
    saldoPerdida: number
  } | null>(null)

  const esReferenciaCobranza = (m: any) => {
    const ref = String(m?.tipoReferencia || '').toUpperCase()
    return ref === 'PAGO' || ref === 'ABONO' || ref === 'CUOTA_INICIAL' || ref === 'RESTAURACION_CUOTA_INICIAL'
  }

  const esTransferenciaSalida = (m: any) => {
    if (String(m?.tipo || '').toUpperCase() !== 'TRANSFERENCIA') return false
    const numero = String((m as any)?.numero || (m as any)?.numeroTransaccion || '')
    return numero.toUpperCase().startsWith('TRX-OUT')
  }

  const esTransferenciaEntrada = (m: any) => {
    if (String(m?.tipo || '').toUpperCase() !== 'TRANSFERENCIA') return false
    const numero = String((m as any)?.numero || (m as any)?.numeroTransaccion || '')
    return numero.toUpperCase().startsWith('TRX-IN')
  }

  const esCajaSupervisor = (caja?: Caja | null) => {
    return caja?.tipo === 'RUTA' && !caja?.rutaId;
  }

  const esIngresoContable = (m: any) => {
    return esIngresoContableGeneral(m)
  }

  const esEgresoOperativo = (m: any) => {
    return esEgresoOperativoContable(m)
  }

  // Estados para Paginación de Listas Locales (Máximo 3 por vista)
  const [currentPageMovimientos, setCurrentPageMovimientos] = useState(0)
  const [currentPageArqueos, setCurrentPageArqueos] = useState(0)



  // Usuarios del sistema para asignar responsables
  const [usuariosList, setUsuariosList] = useState<Usuario[]>([])
  // Rutas disponibles (cargadas del backend)
  const [rutasDisponibles, setRutasDisponibles] = useState<ApiRuta[]>([])

  // --- ESTADOS DE DATOS (DATA) ---
  const [cajas, setCajas] = useState<Caja[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchTransaccionesAll = useCallback(
    async (params: Parameters<typeof getTransacciones>[0]) => {
      const first = await getTransacciones({ ...params, page: 1, limit: params?.limit ?? 500 })
      const data = [...(first?.data || [])]
      const totalPages = Number(first?.meta?.totalPages || 1)

      for (let page = 2; page <= totalPages; page++) {
        const resp = await getTransacciones({ ...params, page, limit: params?.limit ?? 500 })
        if (resp?.data?.length) data.push(...resp.data)
      }

      return data
    },
    [],
  )

  // Formularios controlados
  const [crearCajaForm, setCrearCajaForm] = useState({
    tipo: 'PRINCIPAL' as Caja['tipo'],
    nombre: '',
    rutaId: '',
    responsableId: '',
    saldoInicialInput: '',
  })

  const cajasOrdenadas = useMemo(() => {
    const prioridadCodigo: Record<string, number> = {
      'CAJA-PRINCIPAL': 0,
      'CAJA-BANCO': 1,
      'CAJA-OFICINA': 2,
    }

    return [...cajas].sort((a, b) => {
      const pa = a.codigo ? (prioridadCodigo[a.codigo] ?? 99) : 99
      const pb = b.codigo ? (prioridadCodigo[b.codigo] ?? 99) : 99
      if (pa !== pb) return pa - pb
      return a.nombre.localeCompare(b.nombre)
    })
  }, [cajas])

  const [editarCajaForm, setEditarCajaForm] = useState({
    nombre: '',
    responsableId: '',
    estado: 'ABIERTA' as Caja['estado'],
    saldoInput: '',
    rutaId: '',
    responsableNombre: '', // Auxiliar para mostrar nombre si falla carga
  })

  // Historial de Cierres 
  const [historialCierres, setHistorialCierres] = useState<HistorialCierre[]>([])

  // Filtros para el modal de detalles (Histórico)
  const [fechaInicioModal, setFechaInicioModal] = useState<string>('')
  const [fechaFinModal, setFechaFinModal] = useState<string>('')

  const getDefaultDetalleModalRange = (tipo: 'INGRESOS' | 'EGRESOS') => {
    const hoy = getBogotaDateKey(new Date())

    const base = movimientos
      .filter((m) => {
        if (!cajaSeleccionada && m.categoria === 'CONSOLIDACION') return false

        if (tipo === 'INGRESOS') {
          return esIngresoContable(m)
        }

        return esEgresoOperativo(m)
      })
      .filter((m) => {
        const est = String(m.estado || '').toUpperCase()
        return est !== 'ANULADO' && est !== 'RECHAZADO'
      })
      .filter((m) => {
        if (!cajaSeleccionada) return true
        return m.cajaId === cajaSeleccionada.id
      })

    let min: string | null = null
    for (const m of base) {
      const d = normalizeDateKey(m.fecha)
      if (!min || d < min) min = d
    }

    return { inicio: min ?? hoy, fin: hoy }
  }

  const loadMovimientosDetalle = async (opts?: { cajaId?: string; fechaInicio?: string; fechaFin?: string }) => {
    const cajaId = opts?.cajaId ?? cajaSeleccionada?.id
    if (!cajaId) {
      setMovimientosDetalle([])
      return
    }
    try {
      const params: any = { cajaId, limit: 500 }
      const inicio = opts?.fechaInicio ?? fechaInicioModal
      const fin = opts?.fechaFin ?? fechaFinModal
      if (inicio) params.fechaInicio = inicio
      if (fin) params.fechaFin = fin
      const resp = await getMovimientosLedger(params)
      if (resp && Array.isArray(resp.data)) {
        let next = resp.data.map(mapMovimientoLedger)

        if (next.length === 0) {
          const legacyResp = await getTransacciones(params)
          next = Array.isArray(legacyResp?.data) ? legacyResp.data.map(mapTransaccion) : []
        }

        const codigoCaja = String((cajaSeleccionada as any)?.codigo || '').toUpperCase()
        if (codigoCaja === 'CAJA-PRINCIPAL' || codigoCaja === 'CAJA-BANCO') {
          next = next.filter((m: any) => {
            const ref = String(m?.tipoReferencia || '').toUpperCase()
            return ref !== 'CUOTA_INICIAL' && ref !== 'RESTAURACION_CUOTA_INICIAL' && ref !== 'ABONO_DEUDA'
          })
        }

        setMovimientosDetalle(next)
      } else {
        setMovimientosDetalle([])
      }
    } catch {
      setMovimientosDetalle([])
    }
  }

  // Carga movimientos globales filtrados por tipo para el historial sin filtro de caja
  const loadMovimientosGlobalPorTipo = async (tipo: 'INGRESO' | 'EGRESO' | 'TRANSFERENCIA', fechaInicio?: string, fechaFin?: string) => {
    try {
      if (tipo === 'INGRESO' || tipo === 'EGRESO') {
        const resp = await getMovimientosLedger({
          accountPrefix: tipo === 'INGRESO' ? '3.' : '4.',
          fechaInicio,
          fechaFin,
          limit: 500,
        })
        setMovimientosModalGlobal(
          Array.isArray(resp?.data)
            ? ocultarPagosClientePanelContable(resp.data).map((m) => mapMovimientoLedgerResultado(m, tipo))
            : [],
        )
        return
      }

      const params: any = { tipo, limit: 500 }
      if (fechaInicio) params.fechaInicio = fechaInicio
      if (fechaFin) params.fechaFin = fechaFin
      const resp = await getTransacciones(params)
      if (resp && Array.isArray(resp.data)) {
        setMovimientosModalGlobal(resp.data.map(mapTransaccion))
      } else {
        setMovimientosModalGlobal([])
      }
    } catch {
      setMovimientosModalGlobal([])
    }
  }

  const loadCuotasInicialesGlobal = async (fechaInicio?: string, fechaFin?: string) => {
    try {
      const [ingresosResp, egresosResp] = await Promise.all([
        getTransacciones({
          tipo: 'INGRESO',
          fechaInicio,
          fechaFin,
          limit: 500,
        }),
        getTransacciones({
          tipo: 'EGRESO',
          fechaInicio,
          fechaFin,
          limit: 500,
        }),
      ])
      const transacciones = ([] as any[])
        .concat(Array.isArray(ingresosResp?.data) ? ingresosResp.data : [])
        .concat(Array.isArray(egresosResp?.data) ? egresosResp.data : [])

      setMovimientosModalGlobal(
        transacciones
          .map(mapTransaccion)
          .filter((m) => {
              const tipoReferencia = String(m.tipoReferencia || '').toUpperCase()
              return ['CUOTA_INICIAL', 'RESTAURACION_CUOTA_INICIAL', 'REVERSO_CUOTA_INICIAL'].includes(tipoReferencia)
            })
          .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()),
      )
    } catch {
      setMovimientosModalGlobal([])
    }
  }

  const loadMovimientosGlobalUtilidad = async (fechaInicio?: string, fechaFin?: string) => {
    try {
      const [transIngresos, transEgresos] = await Promise.all([
        fetchTransaccionesAll({
          tipo: 'TRANSFERENCIA',
          fechaInicio,
          fechaFin,
          limit: 500,
        }),
        fetchTransaccionesAll({
          tipo: 'EGRESO',
          fechaInicio,
          fechaFin,
          limit: 500,
        }),
      ])

      const merged = ([] as any[]).concat(transIngresos || [], transEgresos || [])
      setMovimientosModalGlobal(merged.map(mapTransaccion))
    } catch {
      setMovimientosModalGlobal([])
    }
  }

  const handleExportExcel = async () => {
    try {
      await exportService.exportAccounting('excel')
      toast.success('Reporte contable Excel descargado')
    } catch (e) {
      toast.error('Error al exportar reporte contable')
    }
  }

  const handleExportPDF = async () => {
    try {
      await exportService.exportAccounting('pdf')
      toast.success('Reporte contable PDF descargado')
    } catch (e) {
      toast.error('Error al exportar reporte contable')
    }
  }

  // Resumen financiero global
  const [resumenData, setResumenData] = useState<ResumenFinanciero>({
    ingresosHoy: 0,
    egresosHoy: 0,
    cuotaInicialHoy: 0,
    utilidadNeta: 0,
    margenArticulosHoy: 0,
    capitalEnCalle: 0,
    cajaActual: 0,
    porcentajeIngresosVsAyer: null,
    porcentajeEgresosVsAyer: null,
    porcentajeCuotaInicialVsAyer: null,
    esIngresoPositivo: true,
    esEgresoPositivo: true,
    rutasTotales: 0,
    rutasAbiertas: 0,
    rutasPendientesConsolidacion: 0,
    consolidacionesHoy: 0,
    porcentajeCierre: 0
  })

  const [movimientos, setMovimientos] = useState<MovimientoContable[]>([])
  const [movimientosDetalle, setMovimientosDetalle] = useState<MovimientoContable[]>([])
  // Movimientos globales filtrados por tipo (para el historial de ingresos/egresos sin caja seleccionada)
  const [movimientosModalGlobal, setMovimientosModalGlobal] = useState<MovimientoContable[]>([])

  // --- CARGA DE DATOS (REUSABLE) ---
  const fetchData = async () => {
    setIsLoading(true);
    try {
      // 1. Usuarios se cargan en un useEffect separado (solo para ADMIN/SUPER_ADMINISTRADOR)

      // 2. Traemos las cajas configuradas
      const cajasData = await getCajas();

      // 2b. Traemos las rutas (solo roles con permiso: ADMIN, SUPER_ADMIN, COORDINADOR, SUPERVISOR)
      const rolActual = (() => {
        try { return JSON.parse(localStorage.getItem('user') || '{}').rol } catch { return null }
      })()
      if (rolActual !== 'CONTADOR') {
        try {
          const rutasData = await rutasService.obtenerRutas({ limit: 100, activa: true });
          setRutasDisponibles(rutasData);
        } catch (err) {
          logger.warn('No se pudo cargar rutas (permiso insuficiente)');
        }
      }

      if (cajasData && Array.isArray(cajasData)) {
        setCajas(cajasData.map(c => ({
          id: c.id,
          codigo: c.codigo,
          nombre: c.nombre,
          tipo: c.tipo,
          rutaId: c.rutaId,
          responsable: c.responsable, // Nombre completo que viene del backend
          responsableId: c.responsableId, // ID real
          saldo: c.saldo,
          estado: c.estado,
          ultimaActualizacion: c.ultimaActualizacion,
          rutasSupervisadas: (c as any).rutasSupervisadas
        })));
      }

      // 3. Traemos los números del día (KPIs HOY)
      const fechaHoy = getBogotaDateKey(new Date());
      const resumen = await getResumenFinanciero(fechaHoy, fechaHoy);
      const ingresosPanelResp = await getMovimientosLedger({
        accountPrefix: '3.',
        fechaInicio: fechaHoy,
        fechaFin: fechaHoy,
        limit: 1000,
      }).catch(() => null)
      const ingresosPanelContable = Array.isArray(ingresosPanelResp?.data)
        ? ocultarPagosClientePanelContable(ingresosPanelResp.data)
            .map((m) => mapMovimientoLedgerResultado(m, 'INGRESO'))
            .reduce((sum, m) => sum + Number(m.monto || 0), 0)
        : Number(resumen?.ingresosHoy || 0)
      if (resumen) {
        setResumenData({
          ingresosHoy: ingresosPanelContable,
          egresosHoy: resumen.egresosHoy,
          cuotaInicialHoy: Number((resumen as any).cuotaInicialHoy || 0),
          utilidadNeta: Number((resumen as any).utilidadReal ?? resumen.gananciaNeta ?? 0),
          margenArticulosHoy: Number((resumen as any).margenArticulosHoy ?? 0),
          deudaCobradorHoy: Number((resumen as any).deudaCobradorHoy ?? 0),
          capitalEnCalle: resumen.capitalEnCalle,
          cajaActual: resumen.saldoCajas,
          porcentajeIngresosVsAyer: resumen.porcentajeIngresosVsAyer ?? null,
          porcentajeEgresosVsAyer: resumen.porcentajeEgresosVsAyer ?? null,
          porcentajeCuotaInicialVsAyer: (resumen as any).porcentajeCuotaInicialVsAyer ?? null,
          esIngresoPositivo: resumen.esIngresoPositivo ?? true,
          esEgresoPositivo: resumen.esEgresoPositivo ?? true,
          rutasTotales: resumen.rutasTotales || 0,
          rutasAbiertas: resumen.rutasAbiertas || 0,
          rutasPendientesConsolidacion: resumen.rutasPendientesConsolidacion || 0,
          consolidacionesHoy: resumen.consolidacionesHoy || 0,
          porcentajeCierre: resumen.porcentajeCierre || 0
        });
      }

      // 4. Traemos la lista de movimientos recientes
      const transaccionesResp = await getMovimientosLedger({ limit: 50 });
      if (transaccionesResp && transaccionesResp.data) {
        setMovimientos(ocultarPagosClientePanelContable(transaccionesResp.data.map(mapMovimientoLedger)));
      }

      // 5. Historial de Cierres (Real)
      const cierresResp = await getHistorialCierres();
      if (Array.isArray(cierresResp)) {
        setHistorialCierres(cierresResp.map((c: any) => ({
             id: c.id,
             fecha: c.fecha,
             caja: c.caja || 'Desconocida',
             responsable: c.responsable || 'Sistema',
             saldoSistema: Number(c.saldoSistema),
             saldoReal: Number(c.saldoReal),
             diferencia: Number(c.diferencia),
             estado: c.estado || (Number(c.diferencia) === 0 ? 'CUADRADA' : 'DESCUADRADA'),
             tipo: c.tipo || 'CONSOLIDACION',
             efectividad: c.efectividad,
             clientesFaltantes: c.clientesFaltantes,
             cajaId: c.cajaId,
             deudaFisica: Number(c.deudaFisica || 0),
        })));
      }
    } catch (error) {
      console.error('Error cargando datos contables:', error);
      toast.error('Hubo un problema cargando la información financiera.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Tiempo real: refrescar módulo contable cuando cambien pagos, créditos, cajas o rutas
  useRealtimeData(['pagos_actualizados', 'prestamos_actualizados', 'dashboards_actualizados', 'rutas_actualizadas'], fetchData)

  // Cargar movimientos globales por tipo cuando se abre el modal de historial
  useEffect(() => {
    if (showDetalleModal && !cajaSeleccionada) {
      if (detalleTipo === 'INGRESOS') {
        loadMovimientosGlobalPorTipo('INGRESO', fechaInicioModal || undefined, fechaFinModal || undefined)
      } else if (detalleTipo === 'EGRESOS') {
        loadMovimientosGlobalPorTipo('EGRESO', fechaInicioModal || undefined, fechaFinModal || undefined)
      } else if (detalleTipo === 'CUOTAS_INICIALES') {
        loadCuotasInicialesGlobal(fechaInicioModal || undefined, fechaFinModal || undefined)
      } else if (detalleTipo === 'UTILIDAD') {
        loadMovimientosGlobalUtilidad(fechaInicioModal || undefined, fechaFinModal || undefined)
      }
    } else if (!showDetalleModal) {
      setMovimientosModalGlobal([])
      setResumenUtilidadModal(null)
      setDetalleCajaFocus(null)
    }
  }, [detalleTipo, showDetalleModal, fechaInicioModal, fechaFinModal, cajaSeleccionada])

  // Modal de caja: al cambiar fechas, recargar transacciones de esa caja.
  useEffect(() => {
    if (!showDetalleModal) return
    if (!cajaSeleccionada) return
    if (!fechaInicioModal || !fechaFinModal) return

    let cancelled = false

    ;(async () => {
      try {
        await loadMovimientosDetalle({
          cajaId: cajaSeleccionada.id,
          fechaInicio: fechaInicioModal,
          fechaFin: fechaFinModal,
        })
      } catch {
        if (cancelled) return
      }
    })()

    return () => {
      cancelled = true
    }
  }, [showDetalleModal, cajaSeleccionada?.id, fechaInicioModal, fechaFinModal])

  useEffect(() => {
    if (!showDetalleModal) return
    if (cajaSeleccionada) return
    if (detalleTipo !== 'UTILIDAD') {
      setResumenUtilidadModal(null)
      return
    }
    if (!fechaInicioModal || !fechaFinModal) return

    let cancelled = false

    ;(async () => {
      try {
        const resumen = await getResumenFinanciero(fechaInicioModal, fechaFinModal)
        if (cancelled) return

        const totalUtilidad     = Number((resumen as any).utilidadReal ?? (resumen as any).gananciaNeta ?? 0)
        const utilidadOperativa  = Number((resumen as any).utilidadOperativa ?? 0)
        const margen             = Number((resumen as any).margenArticulosHoy ?? 0)
        const egresosOperativos  = Number((resumen as any).egresosHoy ?? 0)
        const interes            = Number((resumen as any).interesHoy ?? 0)
        const mora               = Number((resumen as any).moraHoy ?? 0)
        const utilidadFinanciera = interes + mora
        const provisionTotal     = Number((resumen as any).provisionCarteraTotal ?? 0)
        const provisionEnMora    = Number((resumen as any).provisionCarteraEnMora ?? 0)
        const provisionIncumplida= Number((resumen as any).provisionCarteraIncumplida ?? 0)
        const provisionPerdida   = Number((resumen as any).provisionCarteraPerdida ?? 0)
        const saldoEnMora        = Number((resumen as any).saldoCarteraEnMora ?? 0)
        const saldoIncumplido    = Number((resumen as any).saldoCarteraIncumplida ?? 0)
        const saldoPerdida       = Number((resumen as any).saldoCarteraPerdida ?? 0)

        setResumenUtilidadModal({
          totalUtilidad,
          utilidadOperativa,
          interes,
          mora,
          margen,
          egresosOperativos,
          utilidadFinanciera,
          provisionTotal,
          provisionEnMora,
          provisionIncumplida,
          provisionPerdida,
          saldoEnMora,
          saldoIncumplido,
          saldoPerdida,
        })
      } catch {
        if (cancelled) return
        setResumenUtilidadModal(null)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [showDetalleModal, detalleTipo, cajaSeleccionada, fechaInicioModal, fechaFinModal])

  // Cargar usuarios solo cuando el rol está disponible y es admin
  useEffect(() => {
    if (userRole && ['ADMIN', 'SUPER_ADMINISTRADOR'].includes(userRole)) {
      usuariosService.obtenerTodos()
        .then(data => setUsuariosList(data))
        .catch(() => {})
    }
  }, [userRole]);

  /* Estado para movimientos */
  const [movimientoForm, setMovimientoForm] = useState({
    tipo: 'INGRESO' as MovimientoContable['tipo'],
    categoria: '',
    categoriaId: '',
    montoInput: '',
    concepto: '',
    referencia: '',
    cajaId: '',
    origen: 'EMPRESA' as 'EMPRESA' | 'COBRADOR',
    estado: 'PENDIENTE' as MovimientoContable['estado'],
    responsableId: '', // Debe seleccionarse un usuario válido
    cajaOrigenId: '', // Para cuando origen es COBRADOR
    accountCode: '', // Cuenta contable contrapartida
  })

  // Filtrado de movimientos
  const movimientosFiltrados = movimientos.filter((mov) => {
    const textoBusqueda = busqueda.trim().toLowerCase()

    const cumpleBusqueda =
      !textoBusqueda ||
      [
        mov.numero,
        mov.concepto,
        mov.responsable,
        mov.categoria,
        mov.origen,
        mov.estado,
        mov.referencia,
        mov.referenciaId,
        mov.tipoReferencia,
        mov.caja,
        mov.accountCode,
        mov.accountName,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(textoBusqueda))
    
    // Movimientos recientes (global) ahora muestra solo TRANSFERENCIA entre cajas.
    // Aun así dejamos el filtro para consistencia visual.
    let cumpleTipo = filtroTipo === 'TODOS';
    if (!cumpleTipo) {
      if (filtroTipo === 'DEUDA_COBRADOR' as any) {
        cumpleTipo = mov.tipoReferencia === 'DEUDA_COBRADOR' || mov.tipoReferencia === 'ABONO_DEUDA';
      } else if (filtroTipo === 'TRANSFERENCIA') {
        cumpleTipo = mov.tipo === 'TRANSFERENCIA' && mov.tipoReferencia !== 'DEUDA_COBRADOR';
      } else if (filtroTipo === 'INGRESO') {
        cumpleTipo = esIngresoContable(mov);
      } else if (filtroTipo === 'EGRESO') {
        cumpleTipo = esEgresoOperativo(mov);
      } else {
        cumpleTipo = mov.tipo === filtroTipo;
      }
    }

    const cumpleOrigen = filtroOrigen === 'TODOS' || mov.origen === filtroOrigen
    const cumpleEstado = filtroEstado === 'TODOS' || mov.estado === filtroEstado
    const cajaRutaId = filtroRuta === 'TODOS'
      ? null
      : (cajas.find((c: any) => c?.rutaId === filtroRuta)?.id ?? null)

    const rutaObj = filtroRuta === 'TODOS' ? null : (rutasDisponibles.find((r: any) => r?.id === filtroRuta) as any)
    const cajaRuta = filtroRuta === 'TODOS' ? null : (cajas.find((c: any) => c?.rutaId === filtroRuta) as any)
    const rutaKeywordRaw = String(
      rutaObj?.nombre ||
      (cajaRuta as any)?.rutaNombre ||
      (cajaRuta as any)?.nombre ||
      ''
    )
    const rutaKeyword = rutaKeywordRaw
      .replace(/^caja\s+/i, '')
      .replace(/^ruta\s+/i, '')
      .replace(/^caja\s+ruta\s+/i, '')
      .trim()
      .toUpperCase()

    const cumpleRuta =
      filtroRuta === 'TODOS' ||
      mov.rutaId === filtroRuta ||
      (cajaRutaId != null && (mov.cajaId === cajaRutaId || mov.cajaOrigenId === cajaRutaId)) ||
      (rutaKeyword.length > 2 && String(mov?.concepto || '').toUpperCase().includes(rutaKeyword))

    return cumpleBusqueda && cumpleTipo && cumpleOrigen && cumpleEstado && cumpleRuta
  })



  const handleCrearCaja = async () => {
    const saldo = parseCOPInputToNumber(crearCajaForm.saldoInicialInput)
    const ruta = rutasDisponibles.find((r) => r.id === crearCajaForm.rutaId)
    const respId = crearCajaForm.responsableId;

    if (!respId) {
        showNotification('error', 'Debe seleccionar un responsable válido', 'Error');
        return;
    }

    try {
      await apiCreateCaja({
        nombre: crearCajaForm.nombre.trim() || (crearCajaForm.tipo === 'PRINCIPAL' ? 'Caja Principal' : `Caja ${ruta?.nombre ?? 'Ruta'}`),
        tipo: crearCajaForm.tipo,
        rutaId: crearCajaForm.tipo === 'RUTA' ? (crearCajaForm.rutaId || undefined) : undefined,
        responsableId: respId,
        saldoInicial: saldo
      })

      fetchData()
      setShowCrearCajaModal(false)
      showNotification('success', 'La caja ha sido creada correctamente', 'Caja Creada')
    } catch (error) {
      console.error('Error creating caja:', error)
      showNotification('error', 'No se pudo crear la caja', 'Error')
    }
  }

  const openEditarCaja = (caja: Caja) => {
    setCajaSeleccionada(caja)
    // Buscamos el ID del responsable basado en el nombre (fallback si no tenemos el ID directo en la interfaz)
    // Idealmente Caja debería tener responsableId. He actualizado la carga de datos para incluirlo.
    const cajaConId = caja as any; // Cast temporal si la interfaz Caja no tiene responsableId aún
    
    setEditarCajaForm({
      nombre: caja.nombre,
      responsableId: cajaConId.responsableId || '', 
      responsableNombre: caja.responsable,
      estado: caja.estado,
      saldoInput: caja.saldo ? formatMilesCOP(caja.saldo) : '',
      rutaId: caja.rutaId ?? '',
    })
    setShowEditarCajaModal(true)
  }

  const handleEditarCaja = async () => {
    if (!cajaSeleccionada) return
    const saldo = parseCOPInputToNumber(editarCajaForm.saldoInput)
    const respId = editarCajaForm.responsableId

    if (!respId) {
        showNotification('error', 'Debe asignar un responsable', 'Validación');
        return;
    }

    try {
      await updateCaja(cajaSeleccionada.id, {
        nombre: editarCajaForm.nombre,
        responsableId: respId,
        
      })

      fetchData()
      setShowEditarCajaModal(false)
      setCajaSeleccionada(null)
      showNotification('success', 'La información de la caja ha sido actualizada', 'Caja Actualizada')
    } catch (error) {
      console.error('Error updating caja:', error)
      showNotification('error', 'No se pudo actualizar la caja', 'Error')
    }
  }

  const openRegistrarMovimiento = () => {
    // Buscamos el ID real de la caja principal para el admin.
    // Importante: Caja Banco también puede ser PRINCIPAL. Preferimos CAJA-PRINCIPAL si existe.
    const cajaPrincipal = cajas.find((c: any) => c.codigo === 'CAJA-PRINCIPAL') || cajas.find(c => c.tipo === 'PRINCIPAL');
    const defaultCaja = (userRole === 'ADMIN' || userRole === 'SUPER_ADMINISTRADOR') 
        ? (cajaPrincipal?.id || '') 
        : (cajas.find(c => c.tipo === 'RUTA')?.id || '')
    
    setMovimientoForm({
      tipo: 'INGRESO',
      categoria: '',
      categoriaId: '',
      montoInput: '',
      concepto: '',
      referencia: '',
      cajaId: defaultCaja,
      origen: 'EMPRESA',
      estado: 'PENDIENTE',
      responsableId: '',
      cajaOrigenId: '',
      accountCode: '',
    })
    setShowRegistrarMovimientoModal(true)
  }

  const openRegistrarTransferencia = () => {
    // Buscamos el ID real de la caja principal para el admin.
    // Importante: Caja Banco también puede ser PRINCIPAL. Preferimos CAJA-PRINCIPAL si existe.
    const cajaPrincipal = cajas.find((c: any) => c.codigo === 'CAJA-PRINCIPAL') || cajas.find(c => c.tipo === 'PRINCIPAL');
    const defaultCaja = (userRole === 'ADMIN' || userRole === 'SUPER_ADMINISTRADOR') 
        ? (cajaPrincipal?.id || '') 
        : (cajas.find(c => c.tipo === 'RUTA')?.id || '')
    
    setMovimientoForm({
      tipo: 'INGRESO',
      categoria: 'TRANSFERENCIA', // Pre-seleccionamos que es transferencia
      categoriaId: '',
      montoInput: '',
      concepto: 'Transferencia entre cajas manual',
      referencia: '',
      cajaId: defaultCaja,
      origen: 'COBRADOR', // Esto activa el selector de caja origen/destino en el modal
      estado: 'PENDIENTE',
      responsableId: '',
      cajaOrigenId: '',
      accountCode: '',
    })
    setShowRegistrarMovimientoModal(true)
  }

  const handleRegistrarMovimiento = async () => {
    const monto = parseCOPInputToNumber(movimientoForm.montoInput)
    if (monto <= 0) {
        showNotification('error', 'El monto debe ser mayor a 0', 'Validación');
        return;
    }
    if (!movimientoForm.cajaId) {
        showNotification('error', 'Debe seleccionar una caja', 'Validación');
        return;
    }
    // For movements, we relax the requirement for 'responsableId' if it's not strictly needed by the backend for manual entry
    // or if the backend infers it from the session.
    // if (!movimientoForm.responsableId) { ... } // Removed validation as per request

    try {
      const tipoReferencia = (movimientoForm.categoriaId || movimientoForm.categoria || '').trim() || undefined;
      const referenciaId = movimientoForm.referencia?.trim() ? movimientoForm.referencia.trim() : undefined;

      // Usar apiCreateTransaccion con los datos del form
      // Si es EGRESO con cobrador, invertimos los roles: 
      // La oficina (cajaId) es el origen y el cobrador (cajaOrigenId) es el destino.
      const isEgresoConsolidacion = movimientoForm.tipo === 'EGRESO' && movimientoForm.origen === 'COBRADOR';
      
      const tipoEnvio = movimientoForm.origen === 'COBRADOR'
        ? 'TRANSFERENCIA'
        : (movimientoForm.tipo as any)

      await apiCreateTransaccion({
        cajaId: isEgresoConsolidacion ? movimientoForm.cajaOrigenId : movimientoForm.cajaId,
        tipo: tipoEnvio,
        monto: monto,
        // Eliminamos la lógica mágica de descripción automática para transferencias manuales
        // para que el usuario siempre vea lo que escribió o un default claro.
        descripcion: movimientoForm.concepto || (movimientoForm.origen === 'COBRADOR' ? (movimientoForm.tipo === 'INGRESO' ? 'Recepción de Ruta (Entrada)' : 'Entrega de Base a Ruta (Salida)') : 'Movimiento de Caja'),
        tipoReferencia,
        referenciaId,
        cajaOrigenId: isEgresoConsolidacion ? movimientoForm.cajaId : (movimientoForm.origen === 'COBRADOR' ? movimientoForm.cajaOrigenId : undefined),
        accountCode: movimientoForm.accountCode || undefined
      })
      
      fetchData()
      setShowRegistrarMovimientoModal(false)

      showNotification('success', 'El movimiento contable ha sido registrado', 'Movimiento Registrado')
    } catch (error: any) {
      console.error('Error creating transaccion:', error)
      const msg =
        error?.message ||
        error?.response?.message ||
        (Array.isArray(error?.response?.message) ? error.response.message.join(', ') : undefined) ||
        'No se pudo registrar el movimiento'
      showNotification('error', String(msg), 'Error')
    }
  }

  const renderInPortal = (node: React.ReactNode) => {
    if (typeof document === 'undefined') return null
    return createPortal(node, document.body)
  }



  if (isLoading) {
    return <AnimacionCarga texto="Cargando módulo contable..." />
  }

  return (
    <div className="min-h-screen bg-slate-50 relative">
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 9999px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
        .custom-scrollbar { scrollbar-width: thin; scrollbar-color: #e2e8f0 transparent; }
      `}</style>
      {/* Fondo arquitectónico standard */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/40 via-slate-50 to-orange-50/30" />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-blue-100/30 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-orange-100/20 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full p-4 md:p-8 space-y-6 md:space-y-8">
        {/* Header Ultra Clean */}
        <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between mb-8">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 ring-1 ring-slate-200">
              <Wallet className="h-3.5 w-3.5" />
              <span>Gestión Financiera</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              <span className="text-blue-600">Gestión </span>
              <span className="text-orange-500">Contable</span>
            </h1>
            <p className="text-base text-slate-500 max-w-xl font-medium">
              Administración centralizada de Cajas, Saldos y Recursos.
            </p>
          </div>

          <div className="flex items-start gap-3">
            <ExportButton
              label="Exportar"
              onExportExcel={handleExportExcel}
              onExportPDF={handleExportPDF}
            />
            <Link
              href="/pagos/historial"
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
            >
              Ver cobranzas
            </Link>
            <button
              type="button"
              onClick={() => setShowCrearCajaModal(true)}
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 transform active:scale-95"
            >
              <Plus className="h-4 w-4" />
              Crear Caja
            </button>
          </div>
        </header>

        {/* Tarjetas de Resumen — Fila financiera + Fila operativa */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">

          {/* 1 · Total Ingresos */}
          <div
            onClick={() => {
              const hoy = getBogotaDateKey(new Date())
              setCajaSeleccionada(null)
              setSaldoRutaSeleccionada(null)
              setMovimientosDetalle([])
              setFechaInicioModal(hoy)
              setFechaFinModal(hoy)
              setDetalleTipo('INGRESOS')
              setShowDetalleModal(true)
            }}
            className="cursor-pointer group relative overflow-hidden rounded-2xl bg-white/80 backdrop-blur-sm p-5 border border-slate-200 shadow-[0_4px_20px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-0.5 transition-all"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Ingresos</div>
              <div className="flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border bg-slate-50 text-slate-500 border-slate-200">Hoy</span>
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <TrendingUp className="h-3.5 w-3.5" />
                </div>
              </div>
            </div>
            <div className="min-w-0 w-full">
              <MoneyAmount
                value={resumenData.ingresosHoy}
                amountClassName="text-[clamp(1rem,2vw,1.5rem)] font-black text-slate-900 leading-none"
              />
            </div>
            {resumenData.porcentajeIngresosVsAyer != null && resumenData.porcentajeIngresosVsAyer !== 0 && resumenData.ingresosHoy > 0 && (
              <div className={cn(
                "mt-2 flex items-center text-[11px] font-bold w-fit px-2 py-0.5 rounded-full",
                resumenData.esIngresoPositivo ? "text-emerald-600 bg-emerald-50" : "text-rose-600 bg-rose-50"
              )}>
                {resumenData.esIngresoPositivo ? <ArrowUpRight className="mr-1 h-3 w-3" /> : <TrendingDown className="mr-1 h-3 w-3" />}
                {resumenData.porcentajeIngresosVsAyer > 0 ? '+' : ''}{resumenData.porcentajeIngresosVsAyer}% vs Ayer
              </div>
            )}
          </div>

          {/* 2 · Total Gastos */}
          <div
            onClick={() => {
              const hoy = getBogotaDateKey(new Date())
              setCajaSeleccionada(null)
              setSaldoRutaSeleccionada(null)
              setMovimientosDetalle([])
              setFechaInicioModal(hoy)
              setFechaFinModal(hoy)
              setDetalleTipo('EGRESOS')
              setShowDetalleModal(true)
            }}
            className="cursor-pointer group relative overflow-hidden rounded-2xl bg-white/80 backdrop-blur-sm p-5 border border-slate-200 shadow-[0_4px_20px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-0.5 transition-all"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Gastos</div>
              <div className="flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border bg-slate-50 text-slate-500 border-slate-200">Hoy</span>
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-50 text-rose-600 border border-rose-100">
                  <TrendingDown className="h-3.5 w-3.5" />
                </div>
              </div>
            </div>
            <div className="min-w-0 w-full">
              <MoneyAmount
                value={resumenData.egresosHoy}
                meaning="expense"
                amountClassName="text-[clamp(1rem,2vw,1.5rem)] font-black text-slate-900 leading-none"
              />
            </div>
            {resumenData.porcentajeEgresosVsAyer != null && resumenData.porcentajeEgresosVsAyer !== 0 && resumenData.egresosHoy > 0 && (
              <div className={cn(
                "mt-2 text-[11px] font-bold w-fit px-2 py-0.5 rounded-full flex items-center",
                resumenData.esEgresoPositivo ? "text-emerald-600 bg-emerald-50" : "text-rose-600 bg-rose-50",
              )}>
                {resumenData.esEgresoPositivo ? <ArrowDownLeft className="mr-1 h-3 w-3" /> : <ArrowUpRight className="mr-1 h-3 w-3" />}
                {resumenData.porcentajeEgresosVsAyer > 0 ? '+' : ''}{resumenData.porcentajeEgresosVsAyer}% vs Ayer
              </div>
            )}
          </div>

          {/* 3 · Cuotas Iniciales */}
          <div
            onClick={() => {
              const hoy = getBogotaDateKey(new Date())
              setCajaSeleccionada(null)
              setSaldoRutaSeleccionada(null)
              setMovimientosDetalle([])
              setFechaInicioModal(hoy)
              setFechaFinModal(hoy)
              setDetalleTipo('CUOTAS_INICIALES')
              setShowDetalleModal(true)
            }}
            className="cursor-pointer group relative overflow-hidden rounded-2xl bg-white/80 backdrop-blur-sm p-5 border border-slate-200 shadow-[0_4px_20px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-0.5 transition-all"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Cuotas Iniciales</div>
              <div className="flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border bg-slate-50 text-slate-500 border-slate-200">Hoy</span>
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                  <CreditCard className="h-3.5 w-3.5" />
                </div>
              </div>
            </div>
            <div className="min-w-0 w-full">
              <MoneyAmount
                value={resumenData.cuotaInicialHoy || 0}
                amountClassName="text-[clamp(1rem,2vw,1.5rem)] font-black text-slate-900 leading-none"
              />
            </div>
            <div className="mt-2 text-[11px] text-slate-400 font-medium">Abono a capital (no ingreso)</div>
          </div>

          {/* 4 · Capital Prestado */}
          <div className="group relative overflow-hidden rounded-2xl bg-white/80 backdrop-blur-sm p-5 border border-slate-200 shadow-[0_4px_20px_rgb(0,0,0,0.04)] transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Cartera Activa</div>
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                <CreditCard className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="min-w-0 w-full">
              <MoneyAmount
                value={resumenData.capitalEnCalle}
                amountClassName="text-[clamp(1rem,2vw,1.5rem)] font-black text-slate-900 leading-none"
              />
            </div>
            <div className="mt-2 text-[11px] text-slate-400 font-medium">En cartera activa</div>
          </div>

          {/* 5 · Cajas Abiertas */}
          <div className="group relative overflow-hidden rounded-2xl bg-white/80 backdrop-blur-sm p-5 border border-slate-200 shadow-[0_4px_20px_rgb(0,0,0,0.04)] transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Cajas Abiertas</div>
              <div className="flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border bg-slate-50 text-slate-500 border-slate-200">Hoy</span>
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-50 text-violet-600 border border-violet-100">
                  <Briefcase className="h-3.5 w-3.5" />
                </div>
              </div>
            </div>
            <div className="text-[clamp(1rem,2vw,1.5rem)] font-black text-slate-900 leading-none">
              {cajas.filter((c) => c.estado === 'ABIERTA').length}
            </div>
            <div className="mt-2 text-[11px] text-slate-400 font-medium">Operativas hoy</div>
          </div>

        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sección Movimientos Recientes (Restaurada) */}
          <section className="space-y-8">
            <div className="rounded-2xl bg-white/80 backdrop-blur-sm border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
            <div className="p-5 border-b border-slate-100 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-black text-slate-900 tracking-tight">Panel Contable</h1>
                  <p className="text-slate-500 mt-1 font-medium">Control total de movimientos, cajas y cierres.</p>
                </div>
                <button
                  type="button"
                  onClick={openRegistrarTransferencia}
                  className="inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20 active:scale-95"
                >
                  <ArrowRightLeft className="h-4 w-4" />
                  Movimientos
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="space-y-1.5 md:col-span-3">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Clase de movimiento
                  </div>
                  <select
                    value={filtroTipo}
                    onChange={(e) => setFiltroTipo(e.target.value as typeof filtroTipo)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                  >
                    <option value="TODOS">Todas las clases</option>
                    <option value="INGRESO">Ingresos contables</option>
                    <option value="EGRESO">Egresos</option>
                    <option value="TRANSFERENCIA">Transferencias / recepción entre cajas</option>
                    <option value="DEUDA_COBRADOR">Deudas de cobradores</option>
                  </select>
                </div>

                <div className="space-y-1.5 md:col-span-3">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Origen / Fuente
                  </div>
                  <select
                    value={filtroOrigen}
                    onChange={(e) => setFiltroOrigen(e.target.value as OrigenMovimientoContable)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                  >
                    <option value="TODOS">Todas las fuentes</option>
                    <option value="EMPRESA">Empresa / Oficina</option>
                    <option value="COBRADOR">Cobrador / Ruta</option>
                    <option value="CLIENTE">Cliente</option>
                    <option value="SISTEMA">Sistema</option>
                  </select>
                </div>

                <div className="space-y-1.5 md:col-span-3">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Ruta / Caja
                  </div>
                  <FiltroRuta
                    onRutaChange={(r: string | null) => setFiltroRuta(r || 'TODOS')}
                    selectedRutaId={filtroRuta === 'TODOS' ? null : filtroRuta}
                    layout="wrap"
                    hideLabel={true}
                  />
                </div>

                <div className="space-y-1.5 md:col-span-3">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Búsqueda rápida
                  </div>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={busqueda}
                      onChange={(e) => setBusqueda(e.target.value)}
                      placeholder="Buscar escribiendo..."
                      className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-9 pr-9 text-xs font-bold text-slate-700 shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                    />

                    {busqueda.trim() && (
                      <button
                        type="button"
                        onClick={() => setBusqueda('')}
                        className="absolute right-2 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                        title="Limpiar búsqueda"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto w-full custom-scrollbar max-h-[520px]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] text-slate-500 uppercase tracking-wider font-bold">
                    <th className="px-4 py-2.5 text-left">Tipo</th>
                    <th className="px-4 py-2.5 text-left">Fecha</th>
                    <th className="px-4 py-2.5 text-left">Referencia / Concepto</th>
                    <th className="px-4 py-2.5 text-left">Caja</th>
                    <th className="px-4 py-2.5 text-left">Cuenta Contable</th>
                    <th className="px-4 py-2.5 text-left">Usuario</th>
                    <th className="px-4 py-2.5 text-right">Monto</th>
                    <th className="px-4 py-2.5 text-center">Detalle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {movimientosFiltrados.map((m) => {
                    const etiqueta = getEtiquetaMovimientoContable(m)
                    let montoMostrar = m.monto
                    if (m.tipo === 'TRANSFERENCIA' && m.impactoCaja) montoMostrar = Math.abs(m.impactoCaja)
                    const cajaName = m.caja || 'Caja Central'
                    let conceptoLimpio = normalizarConceptoContable(m.concepto, m);

                    if (m.tipo === 'DEUDA_COBRADOR') {
                      if (m.tipoReferencia === 'DESCUADRE_CAJA') conceptoLimpio = 'Descuadre de Caja'
                      if (m.tipoReferencia === 'GASTO_PERSONAL') conceptoLimpio = 'Gasto Personal'
                      const matches = m.concepto.match(/\$?([\d.,]+)/);
                      if (matches && matches[1]) {
                        montoMostrar = parseFloat(matches[1].replace(/\./g, '').replace(',', '.'));
                      }
                    }

                    const tipoBadge = etiqueta.label;

                    return (
                      <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-2 align-middle">
                          <span className={cn(
                            "text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-wider",
                            etiqueta.className
                          )}>
                            {tipoBadge}
                          </span>
                        </td>
                        <td className="px-4 py-2 align-middle whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-700">
                              {new Date(m.fecha).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">
                              {new Date(m.fecha).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true })}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-2 align-middle">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-900 truncate max-w-[200px]" title={conceptoLimpio || m.concepto}>
                              {String(conceptoLimpio || m.concepto).replace(/\$(\d+)/g, (match, p1) => formatCurrency(Number(p1)))}
                            </span>
                            {(m.referencia || m.referenciaId) && (
                              <span className="text-[10px] text-slate-400 font-medium">
                                Ref: {m.referencia || m.referenciaId}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2 align-middle">
                          <span className="text-xs font-medium text-slate-600 truncate max-w-[150px] block">
                            {cajaName}
                          </span>
                        </td>
                        <td className="px-4 py-2 align-middle">
                          {m.accountCode ? (
                            <div className="flex flex-col">
                              <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded w-fit">
                                {m.accountCode}
                              </span>
                              <span className="text-[10px] text-slate-500 truncate max-w-[150px]" title={m.accountName}>
                                {m.accountName}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">No asignada</span>
                          )}
                        </td>
                        <td className="px-4 py-2 align-middle">
                          <span className="text-xs font-medium text-slate-700 truncate max-w-[120px] block" title={m.responsable}>
                            {(() => {
                              const r = m.responsable || '';
                              if (r === 'Sistema') return r;
                              if (!r.includes('-')) return r;
                              const user = usuariosList.find(u => u.id === r);
                              return user ? `${user.nombres} ${user.apellidos}` : r;
                            })()}
                          </span>
                        </td>
                        <td className="px-4 py-2 align-middle text-right">
                          <MoneyAmount
                            value={montoMostrar}
                            meaning={etiqueta.positivo ? 'signed' : 'expense'}
                            amountClassName={cn(
                              'text-sm font-black tracking-tight',
                              etiqueta.positivo ? 'text-emerald-700' : 'text-rose-700',
                            )}
                          />
                        </td>
                        <td className="px-4 py-2 align-middle text-center">
                          <button
                            onClick={() => {
                              setMovimientoSeleccionado(m)
                              setShowVerMovimientoModal(true)
                            }}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors inline-flex"
                            title="Ver Asiento Contable"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                  {movimientosFiltrados.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-sm font-medium text-slate-500">
                        No se encontraron movimientos registrados
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          </div>
          </section>

        {/* Sección Cajas Registradas (Restaurada) */}
        <section className="w-full">
          <div className="rounded-2xl bg-white/80 backdrop-blur-sm border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-orange-500" />
                <div className="text-sm font-extrabold text-slate-900">Cajas Registradas</div>
              </div>
              <button
                type="button"
                onClick={() => setShowCrearCajaModal(true)}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                <Plus className="h-4 w-4" />
                Crear
              </button>
            </div>
            <div className="divide-y divide-slate-100 max-h-[520px] overflow-y-auto">
              {cajasOrdenadas.map((c) => (
                <div
                  key={c.id}
                  className="w-full text-left p-5 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-sm font-extrabold text-slate-900 truncate">{c.nombre}</div>
                      <div className="mt-1 text-xs text-slate-500 font-medium">{c.responsable}</div>
                      {c.rutaId && (
                        <div 
                          className="mt-1 text-[10px] text-blue-600 font-bold bg-blue-50 inline-block px-1.5 py-0.5 rounded border border-blue-100"
                          title="Caja asociada a Ruta"
                        >
                          Ruta
                        </div>
                      )}
                      {c.recaudoEsperado && (
                        <div className="mt-2 flex items-center gap-3">
                           <div className="text-[10px] font-bold text-slate-400 uppercase">Goal: <MoneyAmount value={c.recaudoEsperado} amountClassName="text-[10px] font-bold text-slate-400 uppercase" /></div>
                           <div className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">{c.eficiencia}% Efficiency</div>
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0 flex flex-col items-end gap-2">
                      <div className={cn(
                        'inline-flex items-center rounded-full px-2 py-1 text-[10px] font-extrabold border',
                        c.estado === 'ABIERTA'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      )}>
                        {c.estado}
                      </div>
                      <MoneyAmount value={c.saldo} amountClassName="text-sm font-extrabold text-slate-900" />
                      <div className="flex items-center gap-2">
                        <button
                          onClick={async () => {
                            setCajaSeleccionada(c)
                            setVerCajaRangoStats(null)
                            try {
                              const inicioKey = fechaInicioModal || ''
                              const finKey = fechaFinModal || ''

                              const respLedgerCaja = await getMovimientosLedger({ cajaId: c.id, limit: 5000 })
                              const movimientosLedgerCaja = Array.isArray(respLedgerCaja?.data)
                                ? respLedgerCaja.data
                                : []

                              const deltaCaja = (entry: ApiMovimientoLedger) => {
                                return (entry.lineas || [])
                                  .filter((linea) => linea.cajaId === c.id)
                                  .reduce((acc, linea) => {
                                    return acc + Number(linea.debitAmount || 0) - Number(linea.creditAmount || 0)
                                  }, 0)
                              }

                              const saldoPrevio = movimientosLedgerCaja.reduce((acc, entry) => {
                                if (!inicioKey) return acc
                                const fechaM = normalizeDateKey(entry.fecha)
                                return fechaM < inicioKey ? acc + deltaCaja(entry) : acc
                              }, 0)

                              const totalRegistrado = movimientosLedgerCaja.reduce((acc, entry) => {
                                const fechaM = normalizeDateKey(entry.fecha)
                                if (inicioKey && fechaM < inicioKey) return acc
                                if (finKey && fechaM > finKey) return acc
                                return acc + deltaCaja(entry)
                              }, 0)

                              setVerCajaRangoStats({
                                totalRegistrado,
                                saldoPrevio,
                                inicio: inicioKey || 'HISTÓRICO',
                                fin: finKey || 'HISTÓRICO',
                              })
                            } catch {
                              setVerCajaRangoStats(null)
                            }

                            if (c.tipo === 'RUTA') {
                              if (c.rutaId) {
                                try {
                                  const hoy = getBogotaDateKey(new Date())
                                  const saldoRuta = await obtenerSaldoDisponibleRuta(c.rutaId, hoy)

                                  setSaldoRutaSeleccionada(saldoRuta || null)
                                  setCajaHoyStats(null)
                                } catch {
                                  setSaldoRutaSeleccionada(null)
                                  setCajaHoyStats(null)
                                }
                              } else {
                                // Caja propia de supervisor: no tiene rutaId, se calcula por transacciones de la caja.
                                setSaldoRutaSeleccionada(null)

                                try {
                                  const hoyClave = getBogotaDateKey(new Date())

                                  const resp = await getTransacciones({
                                    cajaId: c.id,
                                    fechaInicio: hoyClave,
                                    fechaFin: hoyClave,
                                    limit: 500,
                                  })

                                  const movimientosCaja = Array.isArray(resp?.data)
                                    ? resp.data.map(mapTransaccion)
                                    : []

                                  const ingresos = movimientosCaja
                                    .filter((m: any) => {
                                      const tipo = String(m.tipo || '').toUpperCase()
                                      const numero = String((m.numero || m.numeroTransaccion || '')).toUpperCase()

                                      if (tipo === 'INGRESO') return true
                                      if (tipo === 'TRANSFERENCIA') return numero.startsWith('TRX-IN')

                                      return false
                                    })
                                    .reduce((acc: number, m: any) => acc + Number(m.monto || 0), 0)

                                  const egresos = movimientosCaja
                                    .filter((m: any) => {
                                      const tipo = String(m.tipo || '').toUpperCase()
                                      const numero = String((m.numero || m.numeroTransaccion || '')).toUpperCase()

                                      if (tipo === 'EGRESO') return true
                                      if (tipo === 'TRANSFERENCIA') return numero.startsWith('TRX-OUT')

                                      return false
                                    })
                                    .reduce((acc: number, m: any) => acc + Number(m.monto || 0), 0)

                                  setCajaHoyStats({ ingresos, egresos })
                                } catch {
                                  setCajaHoyStats({ ingresos: 0, egresos: 0 })
                                }
                              }
                            } else {
                              setSaldoRutaSeleccionada(null)
                              setCajaHoyStats(null)
                              try {
                                const hoyClave = getBogotaDateKey(new Date())

                                const params = { cajaId: c.id, fechaInicio: hoyClave, limit: 500 }
                                const resp = await getTransacciones(params)
                                if (resp && Array.isArray(resp.data)) {
                                  const codigoCaja = String((c as any)?.codigo || '').toUpperCase()
                                  const omitRefs = codigoCaja === 'CAJA-PRINCIPAL' || codigoCaja === 'CAJA-BANCO'

                                  const base = resp.data.filter((m: any) => {
                                    if (!omitRefs) return true
                                    const ref = String(m?.tipoReferencia || '').toUpperCase()
                                    return ref !== 'CUOTA_INICIAL' && ref !== 'RESTAURACION_CUOTA_INICIAL' && ref !== 'ABONO_DEUDA'
                                  })

                                  const ingresos = base
                                    .filter((m: any) => m.tipo === 'INGRESO' || m.tipo === 'TRANSFERENCIA')
                                    .filter((m: any) => {
                                      if (m.tipo === 'TRANSFERENCIA') {
                                        const num = String(m.numeroTransaccion || '').toUpperCase()
                                        return num.startsWith('TRX-IN')
                                      }
                                      return true
                                    })
                                    .reduce((acc: number, m: any) => acc + Number(m.monto), 0)

                                  const egresos = base
                                    .filter((m: any) => m.tipo === 'EGRESO' || m.tipo === 'TRANSFERENCIA')
                                    .filter((m: any) => {
                                      if (m.tipo === 'TRANSFERENCIA') {
                                        const num = String(m.numeroTransaccion || '').toUpperCase()
                                        return num.startsWith('TRX-OUT')
                                      }
                                      return true
                                    })
                                    .reduce((acc: number, m: any) => acc + Number(m.monto), 0)

                                  setCajaHoyStats({ ingresos, egresos })
                                } else {
                                  setCajaHoyStats(null)
                                }
                              } catch {
                                setCajaHoyStats(null)
                              }
                            }

                            setShowVerCajaModal(true)
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold hover:bg-slate-200 transition-colors"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Ver
                        </button>
                        <button
                          onClick={() => openEditarCaja(c)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold hover:bg-blue-100 transition-colors"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                          Editar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
        </div>



        {showCrearCajaModal && renderInPortal(
          <div className="fixed inset-0 z-[2147483646] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setShowCrearCajaModal(false)}>
            <div className="w-full max-w-xl rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cajas</p>
                  <h3 className="text-lg font-bold text-slate-900">Crear Caja</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCrearCajaModal(false)}
                  className="p-2 rounded-2xl hover:bg-slate-100 text-slate-500"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6 space-y-5">
                <div className="grid grid-cols-1 gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setCrearCajaForm((p) => ({
                        ...p,
                        tipo: 'PRINCIPAL',
                        rutaId: '',
                      }))
                    }
                    className={cn(
                      'px-4 py-3 rounded-2xl border text-sm font-bold transition-colors w-full',
                      'bg-blue-600 text-white border-blue-600'
                    )}
                  >
                    Caja Principal
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <FieldLabel required>Nombre</FieldLabel>
                    <input
                      value={crearCajaForm.nombre}
                      onChange={(e) => setCrearCajaForm((p) => ({ ...p, nombre: e.target.value }))}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900"
                      placeholder={crearCajaForm.tipo === 'PRINCIPAL' ? 'Caja Principal Oficina' : 'Caja Ruta Norte'}
                    />
                  </div>

                  <div className="space-y-2">
                    <FieldLabel required>Responsable</FieldLabel>
                    <select
                      value={crearCajaForm.responsableId}
                      onChange={(e) => setCrearCajaForm((p) => ({ ...p, responsableId: e.target.value }))}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900"
                    >
                      <option value="">Seleccionar responsable...</option>
                      {usuariosList.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.nombres} {u.apellidos} ({formatRoleLabel(u.rol)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <FieldLabel required>Saldo inicial</FieldLabel>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <input
                        type="text"
                        inputMode="numeric"
                        value={crearCajaForm.saldoInicialInput}
                        onChange={(e) =>
                          setCrearCajaForm((p) => ({
                            ...p,
                            saldoInicialInput: formatCOPInputValue(e.target.value),
                          }))
                        }
                        className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 bg-white font-bold text-slate-900"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCrearCajaModal(false)}
                  className="px-5 py-3 rounded-2xl border border-slate-200 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleCrearCaja}
                  className="px-6 py-3 rounded-2xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700"
                >
                  Crear Caja
                </button>
              </div>
            </div>
          </div>
        )}

        {showEditarCajaModal && cajaSeleccionada && renderInPortal(
          <div className="fixed inset-0 z-[2147483646] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setShowEditarCajaModal(false)}>
            <div className="w-full max-w-xl rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cajas</p>
                  <h3 className="text-lg font-bold text-slate-900">Editar Caja</h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditarCajaModal(false)
                    setCajaSeleccionada(null)
                  }}
                  className="p-2 rounded-2xl hover:bg-slate-100 text-slate-500"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <FieldLabel required>Nombre</FieldLabel>
                    <input
                      value={editarCajaForm.nombre}
                      onChange={(e) => setEditarCajaForm((p) => ({ ...p, nombre: e.target.value }))}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900"
                    />
                  </div>
                  <div className="space-y-2">
                    <FieldLabel required>Responsable</FieldLabel>
                    <select
                      value={editarCajaForm.responsableId}
                      onChange={(e) => setEditarCajaForm((p) => ({ ...p, responsableId: e.target.value }))}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900"
                    >
                      <option value="">Seleccionar responsable...</option>
                      {usuariosList.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.nombres} {u.apellidos} ({formatRoleLabel(u.rol)})
                        </option>
                      ))}
                    </select>
                  </div>

                  {cajaSeleccionada.tipo === 'RUTA' && (
                    <div className="space-y-2 md:col-span-2">
                      <FieldLabel required>Ruta</FieldLabel>
                      <select
                        value={editarCajaForm.rutaId}
                        onChange={(e) => setEditarCajaForm((p) => ({ ...p, rutaId: e.target.value }))}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900"
                      >
                        <option value="">Seleccionar ruta...</option>
                        {(Array.isArray(rutasDisponibles) ? rutasDisponibles : []).map((r) => {
                          const responsableNombre = usuariosList.find(u => u.id === r.cobradorId)?.nombres || 'Sin asignar';
                          return (
                            <option key={r.id} value={r.id}>
                                {r.nombre} • {responsableNombre}
                            </option>
                          )
                        })}
                      </select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <FieldLabel required>Estado</FieldLabel>
                    <select
                      value={editarCajaForm.estado}
                      onChange={(e) =>
                        setEditarCajaForm((p) => ({
                          ...p,
                          estado: e.target.value as Caja['estado'],
                        }))
                      }
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900"
                    >
                      <option value="ABIERTA">ABIERTA</option>
                      <option value="CERRADA">CERRADA</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 flex justify-between">
                        Saldo
                        <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide bg-slate-100 px-2 py-0.5 rounded">Solo Lectura</span>
                    </label>
                    <div className="relative opacity-60">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <input
                        type="text"
                        readOnly
                        disabled
                        value={editarCajaForm.saldoInput}
                        className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 font-bold text-slate-500 cursor-not-allowed"
                        placeholder="0"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 px-1">
                        Para ajustar el saldo, debe registrar un Movimiento de Ingreso o Egreso (Ajuste de Caja).
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditarCajaModal(false)
                    setCajaSeleccionada(null)
                  }}
                  className="px-5 py-3 rounded-2xl border border-slate-200 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleEditarCaja}
                  className="px-6 py-3 rounded-2xl bg-amber-600 text-white text-sm font-bold hover:bg-amber-700"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        )}

        {showRegistrarMovimientoModal && renderInPortal(
          <div className="fixed inset-0 z-[2147483646] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setShowRegistrarMovimientoModal(false)}>
            <div className="w-full max-w-2xl rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Movimientos</p>
                  <h3 className="text-lg font-bold text-slate-900">Registrar Movimiento</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRegistrarMovimientoModal(false)}
                  className="p-2 rounded-2xl hover:bg-slate-100 text-slate-500"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6 space-y-5">
                {/* Tipo de Movimiento */}
                <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                     setMovimientoForm((p) => ({ ...p, tipo: 'INGRESO', categoria: 'INGRESO', concepto: '', referencia: '', cajaOrigenId: '', origen: 'EMPRESA' }));
                     // Limpiamos los campos que podrían causar confusión
                  }}
                  className={cn(
                    'flex items-center justify-center gap-2 py-3 rounded-2xl border text-sm font-bold transition-colors shadow-sm',
                    movimientoForm.tipo === 'INGRESO'
                      ? 'bg-emerald-600 text-white border-emerald-600 ring-2 ring-emerald-100 ring-offset-2'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  )}
                >
                  <ArrowDownLeft className="h-4 w-4" />
                  Ingreso
                </button>
                <button
                  type="button"
                  onClick={() => {
                     setMovimientoForm((p) => ({ ...p, tipo: 'EGRESO', categoria: 'EGRESO', concepto: '', referencia: '', cajaOrigenId: '', origen: 'EMPRESA' }));
                     // Limpiamos los campos
                  }}
                  className={cn(
                    'flex items-center justify-center gap-2 py-3 rounded-2xl border text-sm font-bold transition-colors shadow-sm',
                    movimientoForm.tipo === 'EGRESO'
                      ? 'bg-rose-600 text-white border-rose-600 ring-2 ring-rose-100 ring-offset-2'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  )}
                >
                  <ArrowUpRight className="h-4 w-4" />
                  Egreso
                </button>
                </div>

                {/* Caja y Origen */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <FieldLabel required className="text-xs font-black text-slate-500 uppercase ml-1 mb-1.5">
                        {movimientoForm.origen === 'COBRADOR' 
                           ? (movimientoForm.tipo === 'INGRESO' ? 'Caja Destino (Recibe)' : 'Caja Origen (Entrega)')
                           : 'Caja Afectada'}
                    </FieldLabel>
                    <div className="relative">
                        <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <select
                          value={movimientoForm.cajaId}
                          onChange={(e) => setMovimientoForm((p) => ({ ...p, cajaId: e.target.value }))}
                          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm font-semibold text-slate-700 focus:bg-white transition-all shadow-sm"
                        >
                          <option value="">Seleccionar caja destino...</option>
                          {cajasOrdenadas
                            .map(c => (
                              <option key={c.id} value={c.id}>{c.nombre} (Saldo: {formatCurrency(Math.abs(Number(c.saldo || 0)))})</option>
                          ))}
                        </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <FieldLabel required className="text-xs font-black text-slate-500 uppercase ml-1 mb-1.5">Origen del Capital</FieldLabel>
                    <div className="relative">
                        <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <select
                          value={movimientoForm.origen}
                          onChange={(e) => {
                            const val = e.target.value as 'EMPRESA' | 'COBRADOR';
                            setMovimientoForm((p) => ({ ...p, origen: val }));
                          }}
                          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm font-semibold text-slate-700 focus:bg-white transition-all shadow-sm"
                        >
                          <option value="EMPRESA">Externo (Gasto/Ingreso)</option>
                          <option value="COBRADOR">Transferencia entre Cajas</option>
                        </select>
                    </div>
                  </div>
                </div>

                {/* Caso Especial: Consolidación / Transferencia entre Cajas */}
                {movimientoForm.origen === 'COBRADOR' && (
                  <div className="p-4 rounded-2xl bg-orange-50 border border-orange-100 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center gap-2 text-orange-800">
                       <Zap className="h-4 w-4" />
                       <span className="text-xs font-black uppercase tracking-tight">
                         {movimientoForm.tipo === 'INGRESO' ? 'Caja que Entrega Capital' : 'Caja que Recibe Capital'}
                       </span>
                    </div>
                    <div className="space-y-1.5">
                      <FieldLabel required className="text-[10px] font-bold text-orange-700 uppercase ml-1 mb-1.5">
                        {movimientoForm.tipo === 'INGRESO' ? '¿De qué caja sale el dinero?' : '¿A qué caja va el dinero?'}
                      </FieldLabel>
                      <select
                          value={movimientoForm.cajaOrigenId}
                          onChange={(e) => setMovimientoForm((p) => ({ ...p, cajaOrigenId: e.target.value }))}
                          className="w-full px-4 py-2.5 rounded-xl border border-orange-200 bg-white text-sm font-bold text-slate-900 shadow-sm focus:ring-2 focus:ring-orange-200 transition-all font-mono"
                      >
                          <option value="">--- SELECCIONAR CAJA ---</option>
                          {cajasOrdenadas
                            .map(c => (
                            <option key={c.id} value={c.id} disabled={c.id === movimientoForm.cajaId}>
                              {c.nombre}
                              {c.id === movimientoForm.cajaId ? ' (Seleccionada como destino)' : ''}
                              {` (Saldo: ${formatCurrency(Math.abs(Number(c.saldo || 0)))})`}
                            </option>
                          ))}
                      </select>
                    </div>
                    <p className="text-[10px] text-orange-600/80 font-medium italic">
                      {movimientoForm.tipo === 'INGRESO' 
                        ? 'Al guardar, se restará el monto de la caja seleccionada arriba y se sumará a la caja afectada.' 
                        : 'Al guardar, se restará el monto de la caja afectada y se sumará a la caja seleccionada arriba.'}
                    </p>
                  </div>
                )}

                {/* Detalles Financieros */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5 flex flex-col justify-end">
                    <SelectCategoria
                        tipo={movimientoForm.tipo === 'INGRESO' ? 'INGRESO' : 'GASTO'}
                        label="Categoría"
                        required
                        placeholder="Seleccionar..."
                        value={movimientoForm.categoriaId}
                        onChange={(val) => setMovimientoForm(p => ({ ...p, categoriaId: val, categoria: '' }))}
                        // Forzamos un valor por defecto visual si no hay selección (aunque SelectCategoria maneja su estado)
                        // La idea es que el componente SelectCategoria debería permitir seleccionar "INGRESO" o "EGRESO" base
                    />
                  </div>

                  <div className="space-y-1.5">
                    <FieldLabel required className="text-xs font-bold text-slate-500 uppercase ml-1 mb-1.5">Monto de Operación</FieldLabel>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <input
                        type="text"
                        inputMode="numeric"
                        value={movimientoForm.montoInput}
                        onChange={(e) => setMovimientoForm((p) => ({ ...p, montoInput: formatCOPInputValue(e.target.value) }))}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-900 placeholder:text-slate-300 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-xs font-semibold text-blue-800">
                  La cuenta contable se asigna automáticamente por el sistema según el tipo de movimiento, caja y categoría.
                </div>

                {/* Alerta de fondos insuficientes */}
                {(() => {
                    const montoValue = parseCOPInputToNumber(movimientoForm.montoInput);
                    const isTransfer = movimientoForm.origen === 'COBRADOR';
                    let sourceCajaId = '';
                    if (movimientoForm.tipo === 'EGRESO') {
                        sourceCajaId = movimientoForm.cajaId;
                    } else if (isTransfer && movimientoForm.tipo === 'INGRESO') {
                        sourceCajaId = movimientoForm.cajaOrigenId;
                    }

                    const sourceCaja = cajas.find(c => c.id === sourceCajaId);
                    if (sourceCajaId && sourceCaja && montoValue > sourceCaja.saldo) {
                        return (
                            <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-100 flex items-center gap-2 animate-pulse">
                                <AlertTriangle className="h-4 w-4 text-red-600" />
                                <span className="text-xs font-bold text-red-600 uppercase tracking-tight leading-none">
                                    Fondos Insuficientes en {sourceCaja.nombre}
                                </span>
                            </div>
                        );
                    }
                    return null;
                })()}
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowRegistrarMovimientoModal(false)}
                  className="px-5 py-3 rounded-2xl border border-slate-200 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleRegistrarMovimiento}
                  disabled={(() => {
                    const montoValue = parseCOPInputToNumber(movimientoForm.montoInput);
                    const isTransfer = movimientoForm.origen === 'COBRADOR';
                    let sourceCajaId = '';
                    if (movimientoForm.tipo === 'EGRESO') {
                        sourceCajaId = movimientoForm.cajaId;
                    } else if (isTransfer && movimientoForm.tipo === 'INGRESO') {
                        sourceCajaId = movimientoForm.cajaOrigenId;
                    }
                    const sourceCaja = cajas.find(c => c.id === sourceCajaId);
                    const hasInsufficientFunds = sourceCajaId && sourceCaja ? (montoValue > sourceCaja.saldo) : false;
                    return (
                        montoValue <= 0 ||
                        (!movimientoForm.categoria && !movimientoForm.categoriaId) ||
                        (isTransfer && !movimientoForm.cajaOrigenId) ||
                        hasInsufficientFunds
                    );
                  })()}
                  className="px-6 py-3 rounded-2xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        )}


        {showVerMovimientoModal && movimientoSeleccionado && renderInPortal(
          <div className="fixed inset-0 z-[2147483646] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setShowVerMovimientoModal(false)}>
            <div className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Detalle de Movimiento</h3>
                  {/* ID Oculto por solicitud del usuario */}
                </div>
                <button
                  onClick={() => setShowVerMovimientoModal(false)}
                  className="p-2 rounded-2xl hover:bg-slate-100 text-slate-500"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6 space-y-5">
                <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Monto Operación</div>
                    <MoneyAmount value={movimientoSeleccionado.monto} amountClassName="text-2xl font-black text-slate-900" />
                  </div>
                  <div className="text-right">
                    <div className={cn(
                      "inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border",
                      movimientoSeleccionado.tipo === 'INGRESO'
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-rose-50 text-rose-700 border-rose-200",
                    )}>
                      {movimientoSeleccionado.tipo}
                    </div>
                  </div>
                </div>

                {esMovimientoPagoRegularizado(movimientoSeleccionado) && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center rounded-full border border-amber-300 bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-amber-700">
                        Pago regularizado
                      </span>
                      <span className="text-xs font-bold text-amber-800">
                        Asociado a la jornada {formatFechaOperativaRuta(movimientoSeleccionado.fechaOperativaRuta)}
                      </span>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-y-5 gap-x-4">
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Fecha Registro</div>
                    <div className="font-semibold text-slate-900 text-sm">{new Date(movimientoSeleccionado.fecha).toLocaleString('es-CO')}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Estado</div>
                    <div className="font-semibold text-slate-900 text-sm">{movimientoSeleccionado.estado}</div>
                  </div>

                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Categoría</div>
                    <div className="font-semibold text-slate-900 text-sm bg-slate-100 px-2 py-0.5 rounded w-fit">
                      {movimientoSeleccionado.categoria}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                      {movimientoSeleccionado.tipo === 'TRANSFERENCIA' || movimientoSeleccionado.categoria === 'CONSOLIDACION'
                        ? (movimientoSeleccionado.tipo === 'INGRESO' ? 'Recibido De' : 'Enviado A')
                        : 'Origen'}
                    </div>
                    <div className="font-semibold text-slate-900 text-sm">
                      {(() => {
                        if (movimientoSeleccionado.tipo === 'TRANSFERENCIA' || movimientoSeleccionado.categoria === 'CONSOLIDACION') {
                          const desc = movimientoSeleccionado.concepto
                          const matchHacia = desc.match(/(?:hacia|a)\s+(.*?)(?::|\(|\)|$)/i)
                          const matchDesde = desc.match(/(?:desde|de)\s+(.*?)(?::|\(|\)|$)/i)
                          if (movimientoSeleccionado.tipo === 'EGRESO' || desc.includes('Salida') || desc.includes('hacia')) {
                            if (matchHacia && matchHacia[1]) return matchHacia[1].trim()
                          }
                          if (movimientoSeleccionado.tipo === 'INGRESO' || desc.includes('Entrada') || desc.includes('desde')) {
                            if (matchDesde && matchDesde[1]) return matchDesde[1].trim()
                          }
                        }
                        return movimientoSeleccionado.origen
                      })()}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Responsable</div>
                  <div className="font-bold text-slate-900 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] text-slate-600">
                      {(() => {
                        const r = movimientoSeleccionado.responsable || '';
                        if (r === 'Sistema') return 'S';
                        if (!r.includes('-')) return r.charAt(0);
                        const user = usuariosList.find(u => u.id === r);
                        return user ? user.nombres.charAt(0) : r.charAt(0);
                      })()}
                    </div>
                    {(() => {
                        const r = movimientoSeleccionado.responsable || '';
                        if (r === 'Sistema') return r;
                        if (!r.includes('-')) return r;
                        const user = usuariosList.find(u => u.id === r);
                        return user ? `${user.nombres} ${user.apellidos}` : r;
                    })()}
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Concepto / Descripción</div>
                  <div className="font-medium text-slate-800 text-sm leading-relaxed">
                    {(() => {
                      let conceptoMostrar = normalizarConceptoContable(
                        movimientoSeleccionado.concepto,
                        movimientoSeleccionado,
                      )

                      if (movimientoSeleccionado.tipo === 'TRANSFERENCIA' || movimientoSeleccionado.categoria === 'CONSOLIDACION') {
                        const isIngreso =
                          movimientoSeleccionado.tipo === 'INGRESO' ||
                          movimientoSeleccionado.categoria.includes('INGRESO') ||
                          movimientoSeleccionado.concepto.includes('Entrada') ||
                          movimientoSeleccionado.concepto.includes('recibida')

                        if (isIngreso) {
                          const origen =
                            movimientoSeleccionado.concepto.match(/desde (.*?)[:\(]/i)?.[1] ||
                            movimientoSeleccionado.concepto.match(/de (.*?)($|[:\(])/i)?.[1] ||
                            'Caja Origen'
                          conceptoMostrar = `Ingreso de: ${origen}`
                        } else {
                          const destino =
                            movimientoSeleccionado.concepto.match(/hacia (.*?)[:\(]/i)?.[1] ||
                            movimientoSeleccionado.concepto.match(/a (.*?)($|[:\(])/i)?.[1] ||
                            'Caja Destino'
                          conceptoMostrar = `Egreso a: ${destino}`
                        }

                        conceptoMostrar = conceptoMostrar.replace('Caja Caja', 'Caja')
                      }

                      if (conceptoMostrar.includes('undefined') || conceptoMostrar.length < 5) {
                        conceptoMostrar = normalizarConceptoContable(
                          movimientoSeleccionado.concepto,
                          movimientoSeleccionado,
                        )
                      }

                      return conceptoMostrar.replace(/\$(\d+)/g, (match, p1) => formatCurrency(Number(p1)))
                    })()}
                  </div>
                </div>

                {movimientoSeleccionado.referencia && (
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Referencia Externa</div>
                    <div className="font-mono text-slate-700 text-sm bg-slate-50 px-2 py-1 rounded border border-slate-100 w-fit">
                      {movimientoSeleccionado.referencia}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end">
                <button
                  onClick={() => setShowVerMovimientoModal(false)}
                  className="px-6 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all text-sm"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}


        {showVerCajaModal && cajaSeleccionada && renderInPortal(
          <div className="fixed inset-0 z-[2147483646] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setShowVerCajaModal(false)}>
            <div className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold text-slate-900">Detalle de Caja</h3>
                    {/* <p className="text-xs font-bold text-slate-500">{cajaSeleccionada.id}</p> */}
                </div>
                <button
                  onClick={() => setShowVerCajaModal(false)}
                  className="p-2 rounded-2xl hover:bg-slate-100 text-slate-500"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>
              <div className="p-6 space-y-6">
                <div className="flex flex-col items-center justify-center py-4 bg-slate-50 rounded-2xl border border-slate-100 mb-6">
                    <div className="text-slate-500 text-sm font-bold uppercase mb-1">Saldo Actual</div>
                    <MoneyAmount
                      value={cajaSeleccionada.saldo}
                      className="text-4xl font-extrabold"
                      amountClassName="text-4xl font-extrabold text-slate-900"
                      badgeClassName="text-[10px] px-3 py-1 tracking-widest"
                    />
                    {verCajaRangoStats && (
                      <div className="mt-3 w-full flex flex-col items-center gap-1">
                        <p className="text-xs font-medium text-slate-500">Total registrado ({verCajaRangoStats.inicio} → {verCajaRangoStats.fin})</p>
                        <MoneyAmount value={verCajaRangoStats.totalRegistrado} meaning="signed" amountClassName="text-sm font-bold text-slate-900" />
                        <p className="text-xs font-medium text-slate-500">Saldo previo al rango</p>
                        <MoneyAmount value={verCajaRangoStats.saldoPrevio} amountClassName="text-sm font-bold text-slate-900" />
                      </div>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Nombre Caja</label>
                        <div className="font-bold text-slate-900 text-lg">{cajaSeleccionada.nombre}</div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Tipo / Ruta</label>
                        <div>
                            {cajaSeleccionada.tipo === 'RUTA' && !cajaSeleccionada.rutaId ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                    Supervisor
                                </span>
                            ) : cajaSeleccionada.tipo === 'RUTA' ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    Ruta
                                </span>
                            ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                    Principal
                                </span>
                            )}
                        </div>
                    </div>
                    {esCajaSupervisor(cajaSeleccionada) && (
                        <div className="md:col-span-2">
                            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Rutas Supervisadas</label>
                            {Array.isArray((cajaSeleccionada as any).rutasSupervisadas) &&
                            (cajaSeleccionada as any).rutasSupervisadas.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {(cajaSeleccionada as any).rutasSupervisadas.map((ruta: any) => (
                                        <span key={ruta.id} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                            {ruta.nombre} ({ruta.codigo})
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-xs font-medium text-slate-400">
                                    Este supervisor no tiene rutas asignadas.
                                </div>
                            )}
                        </div>
                    )}
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Responsable</label>
                        <div className="font-medium text-slate-700 flex items-center gap-2">
                             <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs text-slate-600 font-bold">
                                {cajaSeleccionada.responsable.charAt(0)}
                             </div>
                             {cajaSeleccionada.responsable}
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Estado</label>
                        <span className={cn(
                            "inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border",
                            cajaSeleccionada.estado === 'ABIERTA' 
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                                : "bg-slate-50 text-slate-700 border-slate-200"
                        )}>
                            {cajaSeleccionada.estado}
                        </span>
                    </div>
                </div>
              </div>

              {/* Información Operativa y de Rendimiento */}
              <div className="px-6 pb-6">
                 <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                    <BarChart3 className="w-3.5 h-3.5" />
                    Rendimiento
                    <span className="ml-auto text-[9px] font-bold text-blue-500 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">HOY</span>
                 </h4>
                 
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Recaudado */}
                      <div 
                        onClick={async () => {
                            const hoy = getBogotaDateKey(new Date())
                            setFechaInicioModal(hoy)
                            setFechaFinModal(hoy)
                            setDetalleTipo('CAJA_TODOS');
                            setDetalleCajaFocus('RECAUDO')
                            setShowDetalleModal(true);
                            void loadMovimientosDetalle({ cajaId: cajaSeleccionada.id, fechaInicio: hoy, fechaFin: hoy });
                        }}
                        className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 cursor-pointer hover:bg-emerald-100/80 transition-colors group"
                      >
                         <div className="text-[10px] font-bold text-emerald-600 uppercase mb-1 flex items-center gap-1 justify-between">
                             <div className="flex items-center gap-1">
                                <TrendingUp className="w-3 h-3" />
                                {cajaSeleccionada.tipo === 'RUTA' ? 'Recaudado' : 'Entradas'}
                             </div>
                             <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                         </div>
                         <div className="font-extrabold text-emerald-800 text-lg">
                           {(() => {
                             if (saldoRutaSeleccionada) {
                               const valor = saldoRutaSeleccionada.recaudoDelDia ?? saldoRutaSeleccionada.saldoCaja ?? cajaSeleccionada?.saldo ?? 0
                               return (
                                 <MoneyAmount
                                   value={valor}
                                   amountClassName="font-extrabold text-emerald-800 text-lg"
                                 />
                               )
                             }

                             if (cajaHoyStats != null) {
                               return (
                                 <MoneyAmount
                                   value={cajaHoyStats.ingresos}
                                   amountClassName="font-extrabold text-emerald-800 text-lg"
                                 />
                               )
                             }

                             return (
                               <div className="text-emerald-700 font-semibold text-xs mt-1">Cargando…</div>
                             )
                           })()}
                         </div>
                    </div>

                    {/* Gastado/Invertido */}
                    <div 
                      onClick={async () => {
                          const hoy = getBogotaDateKey(new Date())
                          setFechaInicioModal(hoy)
                          setFechaFinModal(hoy)
                          setDetalleTipo('CAJA_TODOS');
                          setDetalleCajaFocus('GASTOS')
                          setShowDetalleModal(true);
                          void loadMovimientosDetalle({ cajaId: cajaSeleccionada.id, fechaInicio: hoy, fechaFin: hoy });
                      }}
                      className="bg-rose-50 p-4 rounded-2xl border border-rose-100 cursor-pointer hover:bg-rose-100/80 transition-colors group"
                    >
                       <div className="text-[10px] font-bold text-rose-600 uppercase mb-1 flex items-center gap-1 justify-between">
                           <div className="flex items-center gap-1">
                              <TrendingDown className="w-3 h-3" />
                              {cajaSeleccionada.tipo === 'RUTA' ? 'Egresos' : 'Salidas'}
                           </div>
                           <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                       </div>
                       <div className="font-extrabold text-rose-800 text-lg">
                            {(() => {
                               if (saldoRutaSeleccionada) {
                                 return (
                                   <MoneyAmount
                                     value={saldoRutaSeleccionada.gastosDelDia}
                                     meaning="expense"
                                     amountClassName="text-lg font-extrabold text-rose-800"
                                   />
                                 )
                               }
                               if (cajaHoyStats != null) {
                                 return (
                                   <MoneyAmount
                                     value={cajaHoyStats.egresos}
                                     meaning="expense"
                                     amountClassName="text-lg font-extrabold text-rose-800"
                                   />
                                 )
                               }
                               return (
                                 <div className="text-rose-700 font-semibold text-xs mt-1">Cargando...</div>
                               )
                              })()}
                         </div>
                      </div>
                 </div>

                 {cajaSeleccionada?.tipo === 'RUTA' && cajaSeleccionada?.rutaId && (
                   <div className="mt-4">
                     <div
                       onClick={async () => {
                         setDetalleTipo('CIERRES_RUTA')
                         setFechaInicioModal('')
                         setFechaFinModal('')
                         setMovimientosDetalle([])
                         setShowDetalleModal(true)
                       }}
                       className="bg-slate-50 p-4 rounded-2xl border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors group"
                     >
                       <div className="text-[10px] font-bold text-slate-600 uppercase mb-1 flex items-center gap-1 justify-between">
                         <div className="flex items-center gap-1">
                           <History className="w-3 h-3" />
                           Cierres de Ruta
                         </div>
                         <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                       </div>
                       <div className="font-extrabold text-slate-900 text-lg">
                         {historialCierres.filter((c: any) => c.tipo === 'CIERRE_RUTA' && c.cajaId === cajaSeleccionada.id).length}
                         <span className="text-slate-400 font-bold text-sm"> registro(s)</span>
                       </div>
                     </div>
                   </div>
                 )}
              </div>



              <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end">

                <button
                  onClick={() => {
                    setShowVerCajaModal(false)
                    setSaldoRutaSeleccionada(null)
                  }}
                  className="px-6 py-2 rounded-2xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Modal de Detalle */}
        {showDetalleModal && renderInPortal(
          <div className="fixed inset-0 z-[2147483647] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => { setShowDetalleModal(false); setMovimientosDetalle([]); setCajaSeleccionada(null); setSaldoRutaSeleccionada(null); }}>
            <div className="w-full max-w-2xl rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div>
                   <h3 className="text-lg font-bold text-slate-900">
                      {detalleTipo === 'INGRESOS'
                        ? 'Historial de Ingresos'
                        : detalleTipo === 'EGRESOS'
                          ? 'Historial de Egresos'
                          : detalleTipo === 'CUOTAS_INICIALES'
                            ? 'Historial de Cuotas Iniciales'
                            : detalleTipo === 'UTILIDAD'
                              ? 'Detalle de Utilidad Operativa'
                              : detalleTipo === 'CAJA_TODOS'
                                ? 'Movimientos de Caja'
                          : detalleTipo === 'CIERRES_RUTA'
                            ? 'Historial de Cierres de Ruta'
                            : 'Historial de Cierres'}
                   </h3>
                    <p className="text-xs font-bold text-blue-600 mt-1 uppercase tracking-widest flex items-center gap-1.5">
                       <History className="w-3.5 h-3.5" />
                       Consulta detallada
                    </p>
                </div>
                <button
                  onClick={() => { setShowDetalleModal(false); setMovimientosDetalle([]); setCajaSeleccionada(null); setSaldoRutaSeleccionada(null); }}
                  className="p-2 rounded-2xl hover:bg-slate-100 text-slate-500 transition-colors"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto custom-scrollbar">
                  <div className="space-y-6">
                    {/* Resumen Total Header */}
                    {detalleTipo === 'CIERRES' ? (
                        <div className="rounded-xl border p-5 flex justify-between items-center transition-colors shadow-sm border-orange-100 bg-orange-50/50">
                            <div className="flex flex-col">
                                <span className="text-xs font-bold uppercase tracking-wider mb-1 text-orange-600">
                                  Consolidaciones Automáticas
                                </span>
                                <span className="text-3xl font-black tracking-tight text-orange-800">
                                  {historialCierres.length} registros
                                </span>
                            </div>
                            <div className="p-4 rounded-full border shadow-sm bg-white border-orange-100 text-orange-600">
                                <History className="w-6 h-6"/>
                            </div>
                        </div>
                    ) : detalleTipo === 'CIERRES_RUTA' ? (
                      <div className="rounded-xl border p-5 flex justify-between items-center transition-colors shadow-sm border-slate-200 bg-slate-50/50">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold uppercase tracking-wider mb-1 text-slate-600">
                            Cierres Registrados
                          </span>
                          <span className="text-3xl font-black tracking-tight text-slate-900">
                            {(() => {
                              const cajaId = cajaSeleccionada?.id
                              if (!cajaId) return 0
                              return historialCierres.filter((c: any) => c.tipo === 'CIERRE_RUTA' && c.cajaId === cajaId).length
                            })()} registros
                          </span>
                        </div>
                        <div className="p-4 rounded-full border shadow-sm bg-white border-slate-200 text-slate-700">
                          <History className="w-6 h-6" />
                        </div>
                      </div>
                    ) : (
                        <div className={cn(
                          "rounded-xl border p-5 flex justify-between items-center transition-colors shadow-sm",
                          detalleTipo === 'INGRESOS'
                            ? "border-emerald-100 bg-emerald-50/50"
                            : detalleTipo === 'EGRESOS'
                              ? "border-red-100 bg-red-50/50"
                              : detalleTipo === 'CUOTAS_INICIALES'
                                ? "border-amber-100 bg-amber-50/50"
                                : "border-indigo-100 bg-indigo-50/50"
                        )}>
                           <div className="flex flex-col">
                               <span className={cn(
                                 "text-xs font-bold uppercase tracking-wider mb-1",
                                 detalleTipo === 'INGRESOS'
                                   ? "text-emerald-600"
                                   : detalleTipo === 'EGRESOS'
                                     ? "text-red-600"
                                     : detalleTipo === 'CUOTAS_INICIALES'
                                       ? "text-amber-700"
                                       : "text-indigo-700"
                               )}>
                                 {detalleCajaFocus === 'RECAUDO'
                                   ? 'Entradas del rango'
                                   : detalleCajaFocus === 'GASTOS'
                                     ? 'Salidas del rango'
                                     : detalleTipo === 'CAJA_TODOS'
                                       ? 'Neto del rango'
                                       : 'Total registrado'}
                               </span>
                               <span className={cn(
                                 "text-3xl font-black tracking-tight",
                                 detalleTipo === 'INGRESOS'
                                   ? "text-emerald-800"
                                   : detalleTipo === 'EGRESOS'
                                     ? "text-red-800"
                                     : detalleTipo === 'CUOTAS_INICIALES'
                                       ? "text-amber-800"
                                       : "text-indigo-800"
                               )}>
                                 {(() => {
                                    const hoyKey = getBogotaDateKey(new Date())
                                    const source = cajaSeleccionada ? movimientosDetalle : movimientosModalGlobal
                                    const filtered = source
                                        .filter(m => {
                                            if (!cajaSeleccionada && m.categoria === 'CONSOLIDACION') return false;
                                            return true;
                                        })
                                        .filter(m => {
                                            if (cajaSeleccionada && detalleCajaFocus) {
                                              const conc = String((m as any).descripcion || m.concepto || '').toUpperCase()
                                              const ref = String(m.tipoReferencia || '').toUpperCase()
                                              const tipoMovimiento = String(m.tipo || '').toUpperCase()
                                              const esTransferencia = tipoMovimiento === 'TRANSFERENCIA'
                                              const esIngreso = tipoMovimiento === 'INGRESO'
                                              const esEgreso = tipoMovimiento === 'EGRESO'

                                              const esTransferenciaEntrada =
                                                esTransferencia &&
                                                ((ref === 'RECOLECCION' && conc.includes('RECIBIDA')) ||
                                                  (ref === 'TRANSFERENCIA_INTERNA' && conc.includes('RECIBIDA')))

                                              const esTransferenciaSalida =
                                                esTransferencia &&
                                                (conc.includes('SALIDA') || conc.includes('ENVIADA A') || conc.includes('EGRESO'))

                                              if (detalleCajaFocus === 'RECAUDO') {
                                                return esIngreso || esTransferenciaEntrada
                                              }

                                              if (detalleCajaFocus === 'GASTOS') {
                                                if (ref === 'DEUDA_COBRADOR') return false
                                                return esEgreso || esTransferenciaSalida
                                              }
                                            }

                                            if (detalleTipo === 'CAJA_TODOS') {
                                              return true
                                            } else if (detalleTipo === 'INGRESOS') {
                                              return esIngresoContable(m);
                                            } else if (detalleTipo === 'CUOTAS_INICIALES') {
                                              return esCuotaInicialContable(m)
                                            } else if (detalleTipo === 'UTILIDAD') {
                                              const esIngresoRecoleccion =
                                                m.tipo === 'TRANSFERENCIA' &&
                                                String(m.tipoReferencia || '').toUpperCase() === 'RECOLECCION' &&
                                                String((m as any).descripcion || m.concepto || '').toUpperCase().includes('RECIBIDA')
                                              return esIngresoRecoleccion || esEgresoOperativo(m)
                                            } else {
                                              return esEgresoOperativo(m);
                                            }
                                        })
                                        .filter(m => {
                                            if (fechaInicioModal || fechaFinModal) {
                                                const fechaM = normalizeDateKey(m.fecha);
                                                if (fechaInicioModal && fechaM < fechaInicioModal) return false;
                                                if (fechaFinModal && fechaM > fechaFinModal) return false;
                                                return true;
                                            }
                                            return true;
                                        });
                                    const total = (() => {
                                      if (
                                        !cajaSeleccionada &&
                                        fechaInicioModal === hoyKey &&
                                        fechaFinModal === hoyKey
                                      ) {
                                        if (detalleTipo === 'CUOTAS_INICIALES') return Number(resumenData.cuotaInicialHoy || 0)
                                        if (detalleTipo === 'UTILIDAD') return Number(resumenData.utilidadNeta || 0)
                                      }

                                      if (detalleCajaFocus === 'RECAUDO' || detalleCajaFocus === 'GASTOS') {
                                        return filtered.reduce((acc, m) => acc + Number(m.monto || 0), 0)
                                      }

                                      if (detalleTipo === 'CAJA_TODOS') {
                                        return filtered.reduce((acc, m) => {
                                          const monto = Number(m.monto || 0)
                                          const tipo = String((m as any)?.tipo || '').toUpperCase()
                                          const numero = String((m as any)?.numero || (m as any)?.numeroTransaccion || '')
                                          if (tipo === 'INGRESO') return acc + monto
                                          if (tipo === 'EGRESO') return acc - monto
                                          if (tipo === 'TRANSFERENCIA') {
                                            return numero.toUpperCase().startsWith('TRX-OUT') ? acc - monto : acc + monto
                                          }
                                          return acc
                                        }, 0)
                                      }

                                      if (detalleTipo !== 'UTILIDAD') {
                                        return filtered.reduce((acc, m) => acc + m.monto, 0)
                                      }
                                      const ingresos = filtered
                                        .filter((m) =>
                                          m.tipo === 'TRANSFERENCIA' &&
                                          String(m.tipoReferencia || '').toUpperCase() === 'RECOLECCION' &&
                                          String((m as any).descripcion || m.concepto || '').toUpperCase().includes('RECIBIDA')
                                        )
                                        .reduce((acc, m) => acc + m.monto, 0)
                                      const egresos = filtered
                                        .filter((m) => esEgresoOperativo(m))
                                        .reduce((acc, m) => acc + m.monto, 0)
                                      return ingresos - egresos
                                    })()

                                    if (cajaSeleccionada?.tipo === 'RUTA' && saldoRutaSeleccionada && total === 0) {
                                      if (detalleTipo === 'INGRESOS') {
                                        const valor = saldoRutaSeleccionada.recaudoDelDia ||
                                                      saldoRutaSeleccionada.saldoCaja ||
                                                      cajaSeleccionada.saldo;
                                        if (valor > 0) return formatCurrency(valor);
                                      } else {
                                        const valor = saldoRutaSeleccionada.gastosDelDia;
                                        if (valor > 0) return formatCurrency(valor);
                                      }
                                    }

                                    return formatCurrency(total);
                                 })()}
                               </span>
                           </div>
                           <div className={cn(
                               "p-4 rounded-full border shadow-sm",
                               detalleTipo === 'INGRESOS'
                                 ? "bg-white border-emerald-100 text-emerald-600"
                                 : detalleTipo === 'EGRESOS'
                                   ? "bg-white border-red-100 text-red-600"
                                   : detalleTipo === 'CUOTAS_INICIALES'
                                     ? "bg-white border-amber-100 text-amber-700"
                                     : "bg-white border-indigo-100 text-indigo-700"
                           )}>
                               {detalleTipo === 'INGRESOS'
                                 ? <TrendingUp className="w-6 h-6"/>
                                 : detalleTipo === 'EGRESOS'
                                   ? <TrendingDown className="w-6 h-6"/>
                                   : detalleTipo === 'CUOTAS_INICIALES'
                                     ? <CreditCard className="w-6 h-6"/>
                                     : <Zap className="w-6 h-6"/>}
                           </div>
                        </div>
                    )}

                    {detalleTipo === 'UTILIDAD' && resumenUtilidadModal && (
                      <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 space-y-3">
                        <div className="text-xs font-black uppercase tracking-widest text-indigo-700">
                          Estado de Resultados
                        </div>

                        {/* Ingresos */}
                        <div className="space-y-1.5">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ingresos Operativos</div>
                          {[
                            { label: 'Intereses cobrados', val: resumenUtilidadModal.interes },
                            { label: 'Intereses por mora', val: resumenUtilidadModal.mora },
                            { label: 'Margen artículos', val: resumenUtilidadModal.margen },
                          ].map(({ label, val }) => (
                            <div key={label} className="flex items-center justify-between">
                              <div className="text-xs text-slate-600">{label}</div>
                              <MoneyAmount value={val} amountClassName="text-xs font-bold text-emerald-700" />
                            </div>
                          ))}
                        </div>

                        {/* Gastos */}
                        <div className="space-y-1.5 pt-2 border-t border-indigo-100">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Gastos Operativos</div>
                          <div className="flex items-center justify-between">
                            <div className="text-xs text-slate-600">Gastos y costos (4.x / 5.x)</div>
                            <MoneyAmount value={resumenUtilidadModal.egresosOperativos} meaning="expense" amountClassName="text-xs font-bold text-rose-700" />
                          </div>
                        </div>

                        {/* UAII */}
                        <div className="pt-2 border-t border-indigo-200 flex items-center justify-between">
                          <div className="text-xs font-black text-indigo-800">Utilidad Operativa (UAII)</div>
                          <MoneyAmount value={resumenUtilidadModal.utilidadOperativa} amountClassName="text-xs font-black text-indigo-800" />
                        </div>

                        {/* Provisión */}
                        <div className="space-y-1.5 pt-2 border-t border-amber-100">
                          <div className="text-[10px] font-bold text-amber-600 uppercase tracking-widest flex items-center gap-1">
                            <span>Provisión de Cartera</span>
                            <span className="ml-auto text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">Reserva estimada</span>
                          </div>
                          {resumenUtilidadModal.saldoEnMora > 0 && (
                            <div className="flex items-center justify-between">
                              <div className="text-xs text-slate-600">En Mora (20% de <span className="font-medium">{resumenUtilidadModal.saldoEnMora.toLocaleString('es-CO', {style:'currency',currency:'COP',maximumFractionDigits:0})}</span>)</div>
                              <MoneyAmount value={resumenUtilidadModal.provisionEnMora} meaning="expense" amountClassName="text-xs font-bold text-amber-700" />
                            </div>
                          )}
                          {resumenUtilidadModal.saldoIncumplido > 0 && (
                            <div className="flex items-center justify-between">
                              <div className="text-xs text-slate-600">Incumplido (60% de <span className="font-medium">{resumenUtilidadModal.saldoIncumplido.toLocaleString('es-CO', {style:'currency',currency:'COP',maximumFractionDigits:0})}</span>)</div>
                              <MoneyAmount value={resumenUtilidadModal.provisionIncumplida} meaning="expense" amountClassName="text-xs font-bold text-orange-700" />
                            </div>
                          )}
                          {resumenUtilidadModal.saldoPerdida > 0 && (
                            <div className="flex items-center justify-between">
                              <div className="text-xs text-slate-600">Pérdida (100% de <span className="font-medium">{resumenUtilidadModal.saldoPerdida.toLocaleString('es-CO', {style:'currency',currency:'COP',maximumFractionDigits:0})}</span>)</div>
                              <MoneyAmount value={resumenUtilidadModal.provisionPerdida} meaning="expense" amountClassName="text-xs font-bold text-red-700" />
                            </div>
                          )}
                          {resumenUtilidadModal.provisionTotal === 0 && (
                            <div className="text-xs text-slate-400 italic">Sin cartera en mora — provisión $0</div>
                          )}
                        </div>

                        {/* Utilidad Neta */}
                        <div className="pt-2 border-t-2 border-indigo-300 flex items-center justify-between">
                          <div className="text-sm font-black text-indigo-900">UTILIDAD NETA</div>
                          <MoneyAmount value={resumenUtilidadModal.totalUtilidad} amountClassName="text-sm font-black text-indigo-900" />
                        </div>
                      </div>
                    )}

                    {/* Lista de Movimientos / Arqueos */}
                    <div className="space-y-3">
                      {detalleTipo !== 'CIERRES' && detalleTipo !== 'CIERRES_RUTA' && (
                        <div className="flex gap-2 mb-4 bg-slate-50 p-2 rounded-xl">
                            <div className="flex-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Desde</label>
                                <input 
                                    type="date" 
                                    value={fechaInicioModal}
                                    onChange={(e) => setFechaInicioModal(e.target.value)}
                                    className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-blue-100 outline-none"
                                />
                            </div>
                            <div className="flex-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Hasta</label>
                                <input 
                                    type="date" 
                                    value={fechaFinModal}
                                    onChange={(e) => setFechaFinModal(e.target.value)}
                                    className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-blue-100 outline-none"
                                />
                            </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                           <h4 className="text-sm font-bold text-slate-700">
                             {detalleTipo === 'CIERRES' 
                       ? 'Listado de Consolidaciones'
                               : detalleTipo === 'CIERRES_RUTA'
                                 ? 'Listado de Cierres de Ruta'
                                 : 'Historial de Movimientos'}
                           </h4>
                           <span className="text-xs font-medium text-slate-400">
                              {detalleTipo === 'CIERRES'
                                 ? historialCierres.length
                                 : detalleTipo === 'CIERRES_RUTA'
                                   ? (() => {
                                        const cajaId = cajaSeleccionada?.id
                                        if (!cajaId) return 0
                                        return historialCierres.filter((c: any) => c.tipo === 'CIERRE_RUTA' && c.cajaId === cajaId).length
                                      })()
                                  : (() => {
                                      const base = cajaSeleccionada ? movimientosDetalle : movimientosModalGlobal;
                                     const filtrados = base
                                       .filter(m => {
                                         if (!cajaSeleccionada && m.categoria === 'CONSOLIDACION') return false;
                                         return true;
                                       })
                                       .filter(m => {
                                         if (cajaSeleccionada && detalleCajaFocus) {
                                          const conc = String((m as any).descripcion || m.concepto || '').toUpperCase();
                                          const ref = String(m.tipoReferencia || '').toUpperCase();

                                          const esTransferencia = String(m.tipo || '').toUpperCase() === 'TRANSFERENCIA'
                                          const esIngreso = String(m.tipo || '').toUpperCase() === 'INGRESO'
                                          const esEgreso = String(m.tipo || '').toUpperCase() === 'EGRESO'

                                          const esTransferenciaEntrada =
                                            esTransferencia &&
                                            ((ref === 'RECOLECCION' && conc.includes('RECIBIDA')) ||
                                              (ref === 'TRANSFERENCIA_INTERNA' && conc.includes('RECIBIDA')))

                                          const esTransferenciaSalida =
                                            esTransferencia &&
                                            (conc.includes('SALIDA') || conc.includes('ENVIADA A') || conc.includes('EGRESO'))

                                          if (detalleCajaFocus === 'RECAUDO') {
                                            return esIngreso || esTransferenciaEntrada
                                          }

                                          if (detalleCajaFocus === 'GASTOS') {
                                            if (ref === 'DEUDA_COBRADOR') return false
                                            return esEgreso || esTransferenciaSalida
                                          }
                                        }

                                        if (detalleTipo === 'CAJA_TODOS') {
                                          return true
                                        }
                                        if (detalleTipo === 'INGRESOS') {
                                          return esIngresoContable(m);
                                        } else if (detalleTipo === 'CUOTAS_INICIALES') {
                                          return esCuotaInicialContable(m)
                                        } else if (detalleTipo === 'UTILIDAD') {
                                          const esIngresoRecoleccion =
                                            m.tipo === 'TRANSFERENCIA' &&
                                            String(m.tipoReferencia || '').toUpperCase() === 'RECOLECCION' &&
                                            String((m as any).descripcion || m.concepto || '').toUpperCase().includes('RECIBIDA')
                                           return esIngresoRecoleccion || esEgresoOperativo(m)
                                         } else {
                                           return esEgresoOperativo(m);
                                         }
                                       })
                                       .filter(m => {
                                         const est = String(m.estado || '').toUpperCase()
                                         return est !== 'ANULADO' && est !== 'RECHAZADO'
                                       })
                                       .filter(m => {
                                         if (fechaInicioModal || fechaFinModal) {
                                           const fechaM = normalizeDateKey(m.fecha);
                                           if (fechaInicioModal && fechaM < fechaInicioModal) return false;
                                           if (fechaFinModal && fechaM > fechaFinModal) return false;
                                           return true;
                                         }
                                         return true;
                                       });
                                     return filtrados.length;
                                   })()} {detalleTipo === 'CIERRES' ? 'consolidaciones' : detalleTipo === 'CIERRES_RUTA' ? 'cierres' : 'registros'}
                          </span>
                       </div>
                       
                       {detalleTipo === 'CIERRES' ? (
                           <div className="space-y-3">
                               {historialCierres.map(c => (
                                   <div key={c.id} className="p-4 border border-slate-200 bg-white rounded-xl hover:bg-slate-50 transition-all flex items-center justify-between">
                                       <div className="flex flex-col">
                                           <span className="text-xs font-black text-slate-900 uppercase">
                                              {new Date(c.fecha).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}
                                           </span>
                                           <span className="text-[10px] font-bold text-slate-500 uppercase">{c.caja}</span>
                                       </div>
                                       <div className="flex items-center gap-4">
                                           <div className="text-right">
                                               <div className="text-[10px] font-bold text-slate-400 uppercase leading-none mb-1 text-right">Monto Consolidado</div>
                                               <div className="text-sm font-black text-slate-900 leading-none text-right">{formatCurrency(c.saldoSistema)}</div>
                                           </div>
                                           <span className={cn(
                                               "px-2 py-0.5 rounded text-[8px] font-black uppercase border",
                                               "bg-blue-50 text-blue-600 border-blue-100"
                                           )}>
                                               AUTOMÁTICO
                                           </span>
                                           <button 
                                              onClick={() => {
                                                  setArqueoSeleccionado(c);
                                                  setShowVerArqueoModal(true);
                                              }}
                                              className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-colors"
                                              title="Ver Detalles de Consolidación"
                                           >
                                               <Eye className="w-4 h-4" />
                                           </button>
                                       </div>
                                   </div>
                               ))}
                               {historialCierres.length === 0 && (
                                   <div className="py-10 text-center text-slate-400 font-bold text-sm">No hay arqueos en el historial</div>
                               )}
                           </div>
                       ) : detalleTipo === 'CIERRES_RUTA' ? (
                         <div className="space-y-3">
                           {(() => {
                             const cajaId = cajaSeleccionada?.id
                             if (!cajaId) return null
                             const cierresDeEstaRuta = historialCierres
                               .filter((c: any) => c.tipo === 'CIERRE_RUTA' && c.cajaId === cajaId)
                               .sort((a: any, b: any) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
                             if (cierresDeEstaRuta.length === 0) {
                               return (
                                 <div className="py-10 text-center text-slate-400 font-bold text-sm">
                                   No hay cierres de ruta registrados
                                 </div>
                               )
                             }
                             return cierresDeEstaRuta.map((c: any) => {
                               const esDescuadre = c.estado === 'DESCUADRADA'
                               return (
                                 <div
                                   key={c.id}
                                   className="p-4 border border-slate-200 bg-white rounded-xl hover:bg-slate-50 transition-all flex items-center justify-between gap-4"
                                 >
                                   <div className="flex flex-col min-w-0">
                                     <span className="text-xs font-black text-slate-900 uppercase">
                                       {new Date(c.fecha).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                     </span>
                                     <span className="text-[10px] font-bold text-slate-500 truncate">{c.responsable}</span>
                                     {c.clientesFaltantes > 0 && (
                                       <span className="text-[10px] font-bold text-amber-700">
                                         {c.clientesFaltantes} cliente{c.clientesFaltantes > 1 ? 's' : ''} sin cobrar
                                       </span>
                                     )}
                                   </div>
                                   <div className="flex items-center gap-4 shrink-0">
                                     <span
                                       className={cn(
                                         "px-2 py-0.5 rounded text-[8px] font-black uppercase border",
                                         esDescuadre
                                           ? "bg-red-50 text-red-600 border-red-100"
                                           : "bg-emerald-50 text-emerald-600 border-emerald-100",
                                       )}
                                     >
                                       {esDescuadre ? 'DESCUADRE' : 'CUADRADA'}
                                     </span>
                                     <div className="text-right">
                                       <div className="text-[10px] font-bold text-slate-400 uppercase leading-none mb-1 text-right">
                                         Recaudo / Meta
                                       </div>
                                       <div className="text-sm font-black text-slate-900 leading-none text-right">
                                         {formatCurrency(Number(c.saldoReal))}
                                         <span className="text-slate-400 font-bold"> / {formatCurrency(Number(c.saldoSistema))}</span>
                                       </div>
                                       {c.efectividad != null && (
                                         <div
                                           className={cn(
                                             "text-[10px] font-bold mt-1",
                                             c.efectividad >= 100
                                               ? "text-emerald-700"
                                               : c.efectividad >= 75
                                                 ? "text-blue-700"
                                                 : "text-amber-700",
                                           )}
                                         >
                                           {c.efectividad}% META
                                         </div>
                                       )}
                                     </div>
                                   </div>
                                 </div>
                               )
                             })
                           })()}
                         </div>
                       ) : (
                         <>
                          {(cajaSeleccionada ? movimientosDetalle : movimientosModalGlobal)
                            .filter(m => {
                              if (!cajaSeleccionada && m.categoria === 'CONSOLIDACION') return false;
                              if (cajaSeleccionada && detalleCajaFocus) {
                                const conc = String((m as any).descripcion || m.concepto || '').toUpperCase();
                                const ref = String(m.tipoReferencia || '').toUpperCase();

                                const esTransferencia = String(m.tipo || '').toUpperCase() === 'TRANSFERENCIA'
                                const esIngreso = String(m.tipo || '').toUpperCase() === 'INGRESO'
                                const esEgreso = String(m.tipo || '').toUpperCase() === 'EGRESO'

                                const esTransferenciaEntrada =
                                  esTransferencia &&
                                  ((ref === 'RECOLECCION' && conc.includes('RECIBIDA')) ||
                                    (ref === 'TRANSFERENCIA_INTERNA' && conc.includes('RECIBIDA')))

                                const esTransferenciaSalida =
                                  esTransferencia &&
                                  (conc.includes('SALIDA') || conc.includes('ENVIADA A') || conc.includes('EGRESO'))

                                if (detalleCajaFocus === 'RECAUDO') {
                                  return esIngreso || esTransferenciaEntrada
                                }

                                if (detalleCajaFocus === 'GASTOS') {
                                  if (ref === 'DEUDA_COBRADOR') return false
                                  return esEgreso || esTransferenciaSalida
                                }
                              }
                             if (detalleTipo === 'CAJA_TODOS') {
                               return true
                             }
                             if (detalleTipo === 'INGRESOS') {
                                return esIngresoContable(m);
                              } else if (detalleTipo === 'CUOTAS_INICIALES') {
                                return esCuotaInicialContable(m)
                              } else if (detalleTipo === 'UTILIDAD') {
                                const esIngresoRecoleccion =
                                  m.tipo === 'TRANSFERENCIA' &&
                                  String(m.tipoReferencia || '').toUpperCase() === 'RECOLECCION' &&
                                  String((m as any).descripcion || m.concepto || '').toUpperCase().includes('RECIBIDA')
                                return esIngresoRecoleccion || esEgresoOperativo(m)
                              } else {
                                return esEgresoOperativo(m);
                              }
                            })
                            .filter(m => {
                              const est = String(m.estado || '').toUpperCase()
                              return est !== 'ANULADO' && est !== 'RECHAZADO'
                            })
                            .filter(m => {
                              if (cajaSeleccionada) {
                                return m.cajaId === cajaSeleccionada.id;
                              }
                              
                              if (fechaInicioModal || fechaFinModal) {
                                const fechaM = normalizeDateKey(m.fecha);
                                if (fechaInicioModal && fechaM < fechaInicioModal) return false;
                                if (fechaFinModal && fechaM > fechaFinModal) return false;
                                return true;
                              }
                              
                              return true;
                            })
                            .filter(m => {
                              if (detalleTipo === 'INGRESOS' || detalleTipo === 'EGRESOS') {
                                if (m.tipo === 'TRANSFERENCIA') {
                                  const ref = String(m.tipoReferencia || '').toUpperCase()
                                  if (ref === 'TRANSFERENCIA_INTERNA') return true
                                  const conc = String((m as any).descripcion || m.concepto || '').toUpperCase()
                                  if (detalleTipo === 'INGRESOS') {
                                    return conc.includes('RECIBIDA')
                                  }
                                  return conc.includes('SALIDA') || conc.includes('ENVIADA A') || conc.includes('EGRESO')
                                }
                                return true
                              }
                              return true
                            })
                            .map((m) => {
                              let conceptoMostrar = normalizarConceptoContable(m.concepto, m);
                              const esRegularizado = esMovimientoPagoRegularizado(m)

                              const esIngresoRecoleccion =
                                m.tipo === 'TRANSFERENCIA' &&
                                String(m.tipoReferencia || '').toUpperCase() === 'RECOLECCION' &&
                                String((m as any).descripcion || m.concepto || '').toUpperCase().includes('RECIBIDA')

                              const isPositivo = (() => {
                                if (detalleTipo === 'INGRESOS') return true
                                if (detalleTipo === 'CUOTAS_INICIALES') {
                                  return String(m.tipoReferencia || '').toUpperCase() !== 'REVERSO_CUOTA_INICIAL'
                                }
                                if (detalleTipo === 'EGRESOS') return false
                                if (detalleTipo === 'UTILIDAD') return esIngresoRecoleccion
                                if (detalleTipo === 'CAJA_TODOS') {
                                  if (m.tipo === 'EGRESO') return false
                                  if (m.tipo === 'TRANSFERENCIA') {
                                    const numero = String((m as any).numero || '')
                                    const esSalida = numero.toUpperCase().startsWith('TRX-OUT')
                                    return !esSalida
                                  }
                                  return true
                                }
                                return false
                              })()
                              
                              if (m.tipo === 'TRANSFERENCIA' || m.categoria === 'CONSOLIDACION') {
                                if (detalleTipo === 'INGRESOS' || detalleTipo === 'CUOTAS_INICIALES') {
                                  conceptoMostrar = `Ingreso de: ${m.concepto.match(/desde (.*?)[:\(]/i)?.[1] || m.concepto.match(/de (.*?)($|[:\(])/i)?.[1] || 'Caja Origen'}`;
                                } else if (detalleTipo === 'UTILIDAD' && isPositivo) {
                                  conceptoMostrar = `Ingreso de: ${m.concepto.match(/desde (.*?)[:\(]/i)?.[1] || m.concepto.match(/de (.*?)($|[:\(])/i)?.[1] || 'Caja Origen'}`;
                                } else {
                                  conceptoMostrar = `Egreso a: ${m.concepto.match(/hacia (.*?)[:\(]/i)?.[1] || m.concepto.match(/a (.*?)($|[:\(])/i)?.[1] || 'Caja Destino'}`;
                                }
                                conceptoMostrar = conceptoMostrar.replace('Caja Caja', 'Caja'); 
                              }
                              
                              if (conceptoMostrar.includes('undefined') || conceptoMostrar.length < 5) {
                                conceptoMostrar = normalizarConceptoContable(m.concepto, m);
                              }
                              
                              return (
                                <div key={m.id} className="group p-4 border border-slate-200 bg-white rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm">
                                  <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-start gap-3">
                                      <div className={cn(
                                        "mt-1.5 w-2.5 h-2.5 rounded-full ring-2 ring-offset-2",
                                        isPositivo ? "bg-emerald-500 ring-emerald-100" : "bg-rose-500 ring-rose-100"
                                      )} />
                                      <div>
                                        <div className="font-bold text-slate-900 text-base leading-snug">
                                          {conceptoMostrar.replace(/\$(\d+)/g, (match, p1) => formatCurrency(Number(p1)))}
                                        </div>
                                        {esRegularizado && (
                                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                            <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-700">
                                              Pago regularizado
                                            </span>
                                            <span className="text-[10px] font-bold text-slate-500">
                                              Jornada {formatFechaOperativaRuta(m.fechaOperativaRuta)}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    <div className={cn(
                                      "font-black text-lg tabular-nums tracking-tight whitespace-nowrap",
                                      isPositivo ? "text-emerald-700" : "text-rose-700"
                                    )}>
                                      {isPositivo ? '+' : '-'}{formatCurrency(m.monto)}
                                    </div>
                                  </div>
                                  
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-3 gap-x-2 pt-3 border-t border-slate-100 mt-3">
                                    <div>
                                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Fecha y Hora</span>
                                      <div className="flex flex-col">
                                        <span className="text-[11px] font-black text-slate-900 uppercase leading-tight">
                                          {new Date(m.fecha).toLocaleDateString('es-CO', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' })}
                                        </span>
                                        <div className="flex items-center gap-1 mt-0.5 text-blue-600 font-bold">
                                          <Clock className="w-2.5 h-2.5" />
                                          <span className="text-[10px] uppercase">
                                            {new Date(m.fecha).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    <div>
                                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Categoría</span>
                                      <span className="inline-block truncate max-w-full text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                        {m.categoria.replace(/_/g, ' ')}
                                      </span>
                                    </div>

                                    <div>
                                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Responsable</span>
                                      <div className="flex items-center gap-1.5">
                                        <div className="w-5 h-5 rounded-full bg-indigo-50 flex items-center justify-center text-[9px] font-bold text-indigo-700 border border-indigo-100 shrink-0">
                                          {(() => {
                                            const raw = cajaSeleccionada ? cajaSeleccionada.responsable : (m.responsable || 'A');
                                            if (raw === 'Sistema') return 'S';
                                            if (!raw.includes('-')) return raw.charAt(0);
                                            const user = usuariosList.find(u => u.id === raw);
                                            return user ? user.nombres.charAt(0) : raw.charAt(0);
                                          })()}
                                        </div>
                                        <span className="text-xs font-medium text-slate-700 truncate">
                                          {(() => {
                                            const raw = cajaSeleccionada ? cajaSeleccionada.responsable : (m.responsable || 'Admin');
                                            if (raw === 'Sistema') return raw;
                                            if (!raw.includes('-')) return raw;
                                            const user = usuariosList.find(u => u.id === raw);
                                            return user ? `${user.nombres} ${user.apellidos}` : raw;
                                          })()}
                                        </span>
                                      </div>
                                    </div>

                                    <div>
                                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Origen</span>
                                      {(() => {
                                        const refCuota = String(m.tipoReferencia || '').toUpperCase()
                                        const isCuotaInicial = refCuota === 'CUOTA_INICIAL' || refCuota === 'RESTAURACION_CUOTA_INICIAL'
                                        const label = (detalleTipo === 'CUOTAS_INICIALES' && isCuotaInicial) ? 'CLIENTE' : m.origen
                                        const color = (detalleTipo === 'CUOTAS_INICIALES' && isCuotaInicial)
                                          ? "bg-orange-50 text-orange-700 border-orange-100"
                                          : m.origen === 'COBRADOR'
                                            ? "bg-orange-50 text-orange-700 border-orange-100"
                                            : "bg-blue-50 text-blue-700 border-blue-100"
                                        return (
                                          <span className={cn(
                                            "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase border w-fit",
                                            color,
                                          )}>
                                            <Briefcase className="w-2.5 h-2.5" />
                                            {label}
                                          </span>
                                        )
                                      })()}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                         </>
                       )}
                    </div>
                  </div>
              </div>
            </div>
          </div>
        )}
        {/* Modal: Ver Detalle Arqueo */}
        {showVerArqueoModal && arqueoSeleccionado && renderInPortal(
          <div className="fixed inset-0 z-[2147483647] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setShowVerArqueoModal(false)}>
            <div className="w-full max-w-xl rounded-[2.5rem] bg-white border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
                <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-200 ring-4 ring-blue-50">
                            <History className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-900 leading-none">Detalle de Consolidación</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-2 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                Registro Automático: {arqueoSeleccionado.id}
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setShowVerArqueoModal(false)} 
                        className="p-2.5 rounded-full hover:bg-slate-100 text-slate-400 transition-all active:scale-90"
                    >
                        <XCircle className="h-7 w-7" />
                    </button>
                </div>
                
                <div className="p-8 space-y-10">
                    <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-2">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Clock className="w-3 h-3" />
                                Momento del Cierre
                            </span>
                            <div className="space-y-1">
                                <div className="font-black text-slate-900 text-base uppercase tracking-tight">
                                    {new Date(arqueoSeleccionado.fecha).toLocaleDateString('es-CO', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                                </div>
                                <div className="inline-flex items-center px-2 py-0.5 rounded-lg bg-blue-50 text-blue-600 text-xs font-black">
                                    {new Date(arqueoSeleccionado.fecha).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase()}
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo de Operación</span>
                            <div>
                                <span className={cn(
                                    "inline-flex items-center px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-widest border shadow-sm",
                                    "bg-blue-50 text-blue-700 border-blue-200 shadow-blue-100"
                                )}>
                                    Consolidación Automática
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-5 rounded-[1.5rem] bg-slate-50 border border-slate-100 flex flex-col items-center justify-center gap-1 group hover:bg-white transition-colors duration-300">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Monto Consolidado</span>
                            <span className="text-base font-black text-slate-900">{formatCurrency(Math.abs(arqueoSeleccionado.saldoSistema))}</span>
                        </div>
                        <div className="p-5 rounded-[1.5rem] border border-blue-100 bg-blue-50 flex flex-col items-center justify-center gap-1">
                            <span className="text-[9px] font-bold text-blue-600 uppercase tracking-tighter">Estado</span>
                            <span className="text-base font-black text-blue-800">AUTOMÁTICO</span>
                        </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-[2rem] p-6 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center font-black text-white text-xl shadow-lg shadow-blue-200">
                                {arqueoSeleccionado.responsable.charAt(0)}
                            </div>
                            <div>
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Responsable de Auditoría</div>
                                <div className="text-lg font-black text-slate-900">{arqueoSeleccionado.responsable}</div>
                            </div>
                        </div>
                        <div className="h-10 w-[1px] bg-slate-200 mx-4" />
                        <div className="text-right">
                           <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Caja Origen</div>
                           <div className="text-sm font-bold text-slate-600">{arqueoSeleccionado.caja.toUpperCase()}</div>
                        </div>
                    </div>
                </div>

                <div className="p-8 border-t border-slate-100 bg-slate-50/30 flex justify-end">
                    <button 
                        onClick={() => setShowVerArqueoModal(false)}
                        className="w-full sm:w-auto px-12 py-4 rounded-2xl bg-blue-600 text-white font-black hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/30 active:scale-95 text-sm uppercase tracking-widest"
                    >
                        Confirmar Lectura
                    </button>
                </div>
            </div>
          </div>
        )}

      </div>

      {/* =============================================
          DEUDAS REALES DE COBRADORES — Tarjeta al fondo
      ============================================= */}
      <div className="px-6 pb-8">
        <DeudorasCobradorCard />
      </div>

    </div>
  )
}

// Wrap in Suspense to avoid de-opting entire page
const ModuloContablePage = () => {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <ModuloContableContent />

    </Suspense>
  )
}

export default ModuloContablePage



