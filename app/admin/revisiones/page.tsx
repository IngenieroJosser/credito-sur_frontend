'use client'

/**
 * ============================================================================
 * MÓDULO DE REVISIONES - Centro de Aprobaciones
 * ============================================================================
 * 
 * @description
 * Vista centralizada para gestionar todas las solicitudes pendientes de aprobación.
 * Muestra las aprobaciones organizadas por categoría (Clientes, Créditos, Gastos, etc.)
 * con tabs para navegar entre ellas. SuperAdmin y Admin tienen acceso a una pestaña
 * especial de "Revisión Final" donde deciden sobre items rechazados/eliminados.
 * 
 * Reutiliza el NotificacionDetalleModal para mostrar el detalle completo de cada
 * solicitud (créditos, clientes, gastos) con la misma funcionalidad de edición.
 * 
 * @roles ['SUPER_ADMINISTRADOR', 'ADMIN', 'COORDINADOR']
 */

import { useState, useEffect, useCallback } from 'react'
import { logger } from '@/lib/logger'
import { useRealtimeData } from '@/hooks/useRealtimeData'
import {
  ShieldCheck,
  Users,
  CreditCard,
  Wallet,
  Landmark,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Eye,
  User,
  Ban,
  RotateCcw,
  Calendar,
  TrendingDown,
  Gavel,
  Filter,
  MapPin,
  X,
} from 'lucide-react'
import { formatCurrency, formatMilesCOP } from '@/lib/utils'
import { aprobacionesService, type Aprobacion, type PendingResponse, type SuperadminReviewResponse } from '@/services/aprobaciones-service'
import { alertasClientesService, type AlertaCliente } from '@/services/alertas-clientes-service'
import { prestamosService } from '@/services/prestamos-service'
import { rutasService, type Ruta } from '@/services/rutas-service'
import { TipoAprobacion } from '@/types/enums'
import { toast } from 'sonner'

import NotificacionDetalleModal from '@/components/dashboards/shared/NotificacionDetalleModal'
import AlertaClienteDetalleModal from '@/components/notificaciones/AlertaClienteDetalleModal'
import ProrrogaDetalleModal, { type ProrrogaData } from '@/components/revisiones/ProrrogaDetalleModal'
import ReprogramacionDetalleModal, { type ReprogramacionData } from '@/components/revisiones/ReprogramacionDetalleModal'
import ConfirmRejectModal from '@/components/ui/ConfirmRejectModal'

// Configuración de categorías con meta visual
const CATEGORIAS: Record<string, { label: string; icon: any; color: string; bgColor: string; borderColor: string; tipoNotif: string }> = {
  NUEVO_CLIENTE: {
    label: 'Clientes',
    icon: Users,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    tipoNotif: 'CLIENTE',
  },
  NUEVO_PRESTAMO: {
    label: 'Créditos',
    icon: CreditCard,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    tipoNotif: 'PRESTAMO',
  },
  GASTO: {
    label: 'Gastos',
    icon: Wallet,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    tipoNotif: 'GASTO',
  },
  SOLICITUD_BASE_EFECTIVO: {
    label: 'Base de Efectivo',
    icon: Landmark,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    tipoNotif: 'SOLICITUD_DINERO',
  },
  PAGO_TRANSFERENCIA: {
    label: 'Pagos por transferencia',
    icon: Landmark,
    color: 'text-sky-700',
    bgColor: 'bg-sky-50',
    borderColor: 'border-sky-200',
    tipoNotif: 'PAGO',
  },
  PRORROGA_PAGO: {
    label: 'Prórrogas',
    icon: Clock,
    color: 'text-rose-600',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-200',
    tipoNotif: 'SISTEMA',
  },
  BAJA_POR_PERDIDA: {
    label: 'Bajas por pérdida',
    icon: AlertTriangle,
    color: 'text-slate-600',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-200',
    tipoNotif: 'SISTEMA',
  },
  // ── Gestión Mora ──────────────────────────────────────────────────────
  ASIGNAR_MORA: {
    label: 'Intereses de Mora',
    icon: TrendingDown,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    tipoNotif: 'SISTEMA',
  },
  GESTION_VENCIDA: {
    label: 'Cuentas Vencidas',
    icon: Gavel,
    color: 'text-rose-700',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-200',
    tipoNotif: 'SISTEMA',
  },
  // ── Reprogramaciones ──────────────────────────────────────────────────
  REPROGRAMACION_CUOTA: {
    label: 'Reprogramaciones',
    icon: Calendar,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    tipoNotif: 'REPROGRAMACION',
  },
}

const formatFecha = (iso: string | null | undefined) => {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })
}

const toBogotaDateKey = (value: string | null | undefined) => {
  if (!value) return null
  const raw = String(value).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return null
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const get = (type: string) => parts.find((p) => p.type === type)?.value || ''
  const year = get('year')
  const month = get('month')
  const day = get('day')
  return year && month && day ? `${year}-${month}-${day}` : null
}

const formatFechaCortaBogota = (value: string | null | undefined) => {
  const key = toBogotaDateKey(value)
  if (!key) return '?'
  const date = new Date(`${key}T12:00:00-05:00`)
  return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
}

const textValue = (...values: any[]) => {
  for (const value of values) {
    if (value === null || value === undefined) continue
    const str = String(value).trim()
    if (str && str !== 'undefined' && str !== 'null' && str !== '—') return str
  }
  return ''
}

const getAlertaClienteNombre = (alerta: AlertaCliente) => {
  const snapshot = alerta.snapshotCliente || {}
  const cliente = snapshot.cliente || alerta.cliente || {}
  return textValue(
    cliente.nombreCompleto,
    `${cliente.nombres || ''} ${cliente.apellidos || ''}`,
    'Cliente sin nombre',
  )
}

const getAlertaMetricas = (alerta: AlertaCliente) => {
  const snapshot = alerta.snapshotCliente || {}
  const creditos = Array.isArray(snapshot.creditos) ? snapshot.creditos : []
  const esActiva = (credito: any) => {
    if (credito?.esCarteraActiva === true) return true
    if (credito?.esCarteraActiva === false) return false

    const estado = String(credito?.estado || '').toUpperCase()
    const estadoAprobacion = String(credito?.estadoAprobacion || '').toUpperCase()
    return (
      ['ACTIVO', 'EN_MORA', 'INCUMPLIDO'].includes(estado) &&
      !['PENDIENTE', 'RECHAZADO'].includes(estadoAprobacion)
    )
  }
  const saldoCarteraActiva = creditos
    .filter(esActiva)
    .reduce((sum: number, credito: any) => sum + Number(credito.saldoPendiente || 0), 0)
  const cuotasVencidas = creditos
    .filter(esActiva)
    .reduce((sum: number, credito: any) => sum + Number(credito.cuotasVencidas || 0), 0)
  const metricas = snapshot.metricas || {}
  const tieneDetalleCreditos = creditos.length > 0

  return {
    ...metricas,
    saldoPendienteTotal: tieneDetalleCreditos
      ? saldoCarteraActiva
      : (
      metricas.saldoPendienteCarteraActiva ??
      metricas.saldoCarteraActiva ??
      metricas.saldoPendienteTotal ??
      0
      ),
    cuotasVencidas: tieneDetalleCreditos
      ? cuotasVencidas
      : (metricas.cuotasVencidas ?? 0),
    creditosActivos: tieneDetalleCreditos
      ? creditos.filter(esActiva).length
      : (metricas.creditosActivos ?? 0),
    creditosPendientesRevision: tieneDetalleCreditos
      ? creditos.filter((credito: any) => !esActiva(credito)).length
      : (metricas.creditosPendientesRevision ?? 0),
  }
}

const resolveFechaOriginalReprogramacion = (datos: any, creadoEn?: string | null) => {
  const fechaGestion =
    toBogotaDateKey(datos?.fechaGestionOriginal) ||
    toBogotaDateKey(datos?.fechaOperativaRuta)
  if (fechaGestion) return fechaGestion

  const fechaCuota = toBogotaDateKey(datos?.fechaVencimientoOriginal)
  const fechaCreacion = toBogotaDateKey(creadoEn || null)
  if (fechaCuota && fechaCreacion && fechaCuota < fechaCreacion) {
    return fechaCreacion
  }

  return fechaCuota || datos?.fechaVencimientoOriginal || null
}

/**
 * Transforma un objeto de aprobación al formato que recibe NotificacionDetalleModal
 */
const aprobacionToNotificacion = (item: Aprobacion) => {
  const datos = item.datosSolicitud || {}
  const cat = CATEGORIAS[item.tipoAprobacion] || CATEGORIAS.BAJA_POR_PERDIDA

  // Construir titulo y mensaje ricos segun el tipo
  let titulo = cat.label
  let mensaje = `Solicitud de ${cat.label.toLowerCase()} por ${item.solicitante}`

  // Ajuste específico para gastos provisionales
  if (item.tipoAprobacion === 'GASTO' && (datos.esProvisional === true || datos.esProvisional === 'true')) {
    titulo = 'Gasto Provisional'
    mensaje = `Solicitud de gasto por ${item.solicitante}`
  } else if (item.tipoAprobacion === 'GASTO') {
    // Gasto legacy
    titulo = 'Solicitud de Gasto (Legacy)'
    mensaje = `Solicitud de gasto por ${item.solicitante} (sin impacto de caja)`
  }

  if (item.tipoAprobacion === 'PRORROGA_PAGO' || datos.tipo === 'GESTION_VENCIDA' || datos.tipo === 'ASIGNAR_MORA') {
    const clienteNombre = datos.cliente || datos.clienteNombre || '—'
    const decision = datos.decision || 'PRORROGAR'
    const DECISION_LABEL: Record<string, string> = {
      PRORROGAR: 'Prórroga de Plazo',
      CASTIGAR:  'Baja por Pérdida',
      JURIDICO:  'Cobro Jurídico',
      ASIGNAR_MORA: 'Asignación de Mora',
    }
    titulo = `${DECISION_LABEL[decision] || cat.label} — ${clienteNombre}`
    if (decision === 'PRORROGAR' && datos.diasGracia) {
      mensaje = `${item.solicitante} solicitó una prórroga de ${datos.diasGracia} días para ${clienteNombre}${datos.numeroPrestamo ? ` (${datos.numeroPrestamo})` : ''}. Saldo: ${datos.saldoPendiente ? `$${formatMilesCOP(Number(datos.saldoPendiente))}` : '—'}.`
    } else if (decision === 'ASIGNAR_MORA') {
      mensaje = `${item.solicitante} asignó $${formatMilesCOP(Number(datos.montoInteres || 0))} de mora a ${clienteNombre}${datos.numeroPrestamo ? ` (${datos.numeroPrestamo})` : ''}.`
    } else {
      mensaje = `${item.solicitante} solicitó ${(DECISION_LABEL[decision] || decision).toLowerCase()} para ${clienteNombre}${datos.numeroPrestamo ? ` (${datos.numeroPrestamo})` : ''}.`
    }
  } else if (item.tipoAprobacion === 'REPROGRAMACION_CUOTA') {
    const clienteNombre = datos.cliente || datos.clienteNombre || '—'
    titulo = `Reprogramaciones — ${clienteNombre}`
    mensaje = `Solicitud de reprogramación por ${item.solicitante}`
  }

  return {
    id: item.id,
    titulo,
    mensaje,
    tipo: cat.tipoNotif as any,
    creadoEn: item.creadoEn,
    leida: false,
    entidadId: item.id,
    estado: item.estado === 'PENDIENTE' ? 'PENDIENTE' : item.estado,
    solicitante: item.solicitante || 'Desconocido',
    approvalType: item.tipoAprobacion,
    detalles: datos,
    metadata: {
      ...datos,
      tipoAprobacion: item.tipoAprobacion,
      estadoAprobacion: item.estado,
      solicitadoPor: item.solicitante,
      revisadoPor: item.rechazadoPor,
      fechaRevision: item.revisadoEn,
      motivoRechazo: item.comentarios,
      monto: datos.monto || item.montoSolicitud,
    },
    motivoRechazo: item.comentarios,
    revisadoPor: item.rechazadoPor,
  }
}

export default function RevisionesPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<PendingResponse | null>(null)
  const [superadminData, setSuperadminData] = useState<SuperadminReviewResponse | null>(null)
  const [alertasCliente, setAlertasCliente] = useState<AlertaCliente[]>([])
  const [activeTab, setActiveTab] = useState<string>('todos')
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [resolvingAlertaId, setResolvingAlertaId] = useState<string | null>(null)
  const [motivoResolucionAlerta, setMotivoResolucionAlerta] = useState('')
  const [notaSuperadmin, setNotaSuperadmin] = useState('')
  const [userRol, setUserRol] = useState<string>('')
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'APPROVE' | 'REJECT' | 'CONFIRMAR' | 'REVERTIR' | 'APPROVE_GASTO_PROVISIONAL' | 'CREAR_DEUDA' | 'REINTEGRAR' | 'ANULAR_LEGACY';
    item: Aprobacion;
  } | null>(null)

  // Filtros
  const [rutas, setRutas] = useState<Ruta[]>([])
  const [filtroRuta, setFiltroRuta] = useState<string>('')
  const [filtroPuntoVenta, setFiltroPuntoVenta] = useState<boolean>(false)

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [selectedAlertaCliente, setSelectedAlertaCliente] = useState<AlertaCliente | null>(null)
  const [resolveAlertaCliente, setResolveAlertaCliente] = useState<AlertaCliente | null>(null)

  // Modal dedicado para prorrogas
  const [prorrogaModalOpen, setProrrogaModalOpen] = useState(false)
  const [selectedProrroga, setSelectedProrroga] = useState<ProrrogaData | null>(null)

  // Modal dedicado para reprogramaciones
  const [reprogramacionModalOpen, setReprogramacionModalOpen] = useState(false)
  const [selectedReprogramacion, setSelectedReprogramacion] = useState<ReprogramacionData | null>(null)



  const canReviewRejected = userRol === 'SUPER_ADMINISTRADOR' || userRol === 'ADMIN'

  const closeAllDetailModals = () => {
    setIsDetailModalOpen(false)
    setSelectedItem(null)
    setProrrogaModalOpen(false)
    setSelectedProrroga(null)
    setReprogramacionModalOpen(false)
    setSelectedReprogramacion(null)
    setSelectedAlertaCliente(null)
    setResolveAlertaCliente(null)
    setMotivoResolucionAlerta('')
  }

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [pendientes, superadmin, rutasData, alertasData] = await Promise.allSettled([
        aprobacionesService.obtenerPendientes(),
        canReviewRejected
          ? aprobacionesService.obtenerRevisionSuperadmin()
          : Promise.resolve({ total: 0, items: [] }),
        rutasService.getAll(),
        alertasClientesService.listar({ estado: 'ACTIVA' }),
      ])

      if (pendientes.status === 'fulfilled') setData(pendientes.value)
      if (superadmin.status === 'fulfilled') setSuperadminData(superadmin.value as any)
      if (rutasData.status === 'fulfilled') setRutas(rutasData.value)
      if (alertasData.status === 'fulfilled') setAlertasCliente(alertasData.value)
    } catch (error) {
      console.error('Error cargando revisiones:', error)
      toast.error('Error al cargar las revisiones')
    } finally {
      setLoading(false)
    }
  }, [canReviewRejected])

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      try {
        const user = JSON.parse(userData)
        setUserRol(user.rol || '')
      } catch { /* ignore */ }
    }
    const params = new URLSearchParams(window.location.search)
    if (params.get('tab') === 'alertas-clientes') {
      setActiveTab('alertas-clientes')
    }
  }, [])

  useEffect(() => {
    if (userRol) loadData()
  }, [userRol, loadData])

  useRealtimeData(
    ['aprobaciones_actualizadas', 'clientes_actualizados', 'prestamos_actualizados', 'dashboards_actualizados'],
    loadData,
  )

  // Helper para detectar si un item corresponde a una prorroga o gestion vencida
  const isProrrogaOrVencida = (item: Aprobacion) => {
    const datos = item.datosSolicitud || {} as any
    return (
      item.tipoAprobacion === 'PRORROGA_PAGO' ||
      datos.tipo === 'GESTION_VENCIDA' ||
      datos.tipo === 'ASIGNAR_MORA'
    )
  }

  // Helper para detectar si es un gasto provisional real
  const isGastoProvisional = (item: Aprobacion) => {
    const datos = item.datosSolicitud || {} as any
    return (
      item.tipoAprobacion === 'GASTO' &&
      (datos.esProvisional === true || datos.esProvisional === 'true')
    )
  }

  // Helper para detectar si es una solicitud legacy de gasto (sin impacto de caja)
  const isGastoProvisionalLegacy = (item: Aprobacion) => {
    const datos = item.datosSolicitud || {} as any
    return (
      item.tipoAprobacion === 'GASTO' &&
      !isGastoProvisional(item)
    )
  }

  const handleOpenDetail = (item: Aprobacion) => {
    const datos = (item.datosSolicitud || {}) as any
    if (item.tipoAprobacion === 'REPROGRAMACION_CUOTA') {
      setSelectedReprogramacion({
        id: item.id,
        solicitante: item.solicitante,
        creadoEn: item.creadoEn,
        estado: item.estado,
        cliente:                 datos.cliente || datos.clienteNombre,
        clienteNombre:           datos.clienteNombre || datos.cliente,
        numeroPrestamo:          datos.numeroPrestamo,
        montoCuota:              datos.montoCuota,
        fechaVencimientoOriginal: resolveFechaOriginalReprogramacion(datos, item.creadoEn),
        fechaGestionOriginal:     datos.fechaGestionOriginal || datos.fechaOperativaRuta,
        nuevaFechaVencimiento:   datos.nuevaFechaVencimiento || datos.nuevaFecha,
        motivo:                  datos.motivo || datos.comentarios,
        gestionadoPor:           datos.gestionadoPor || datos.asignadoPor || item.solicitante,
      })
      setReprogramacionModalOpen(true)
    } else if (isProrrogaOrVencida(item)) {
      // Abrir modal dedicado para prorrogas / gestion vencida
      setSelectedProrroga({
        id: item.id,
        solicitante: item.solicitante,
        creadoEn: item.creadoEn,
        estado: item.estado,
        decision:                datos.decision,
        cliente:                 datos.cliente || datos.clienteNombre,
        clienteNombre:           datos.clienteNombre || datos.cliente,
        numeroPrestamo:          datos.numeroPrestamo,
        saldoPendiente:          datos.saldoPendiente ?? item.montoSolicitud,
        montoInteres:            datos.montoInteres,
        diasGracia:              datos.diasGracia,
        fechaVencimientoOriginal: datos.fechaVencimientoOriginal,
        nuevaFechaVencimiento:   datos.nuevaFechaVencimiento,
        comentarios:             datos.comentarios,
        gestionadoPor:           datos.gestionadoPor || datos.asignadoPor || item.solicitante,
      })
      setProrrogaModalOpen(true)
    } else {
      // Modal generico para el resto
      const notifData = aprobacionToNotificacion(item)
      setSelectedItem(notifData)
      setIsDetailModalOpen(true)
    }
  }

  const handleOpenAlertaCliente = async (alerta: AlertaCliente) => {
    setSelectedAlertaCliente(alerta)
    try {
      const detalle = await alertasClientesService.obtenerDetalle(alerta.id)
      setSelectedAlertaCliente(detalle)
    } catch (error) {
      console.error('[Revisiones] Error cargando alerta de cliente:', error)
      toast.error('No se pudo cargar el detalle completo de la alerta')
    }
  }

  const handleResolverAlertaCliente = async () => {
    if (!resolveAlertaCliente) return
    const motivo = motivoResolucionAlerta.trim()
    if (!motivo) {
      toast.error('Indica el motivo de resolución de la alerta')
      return
    }

    setResolvingAlertaId(resolveAlertaCliente.id)
    try {
      await alertasClientesService.resolver(resolveAlertaCliente.id, {
        motivoResolucion: motivo,
      })
      toast.success('Alerta resuelta correctamente')
      setResolveAlertaCliente(null)
      setSelectedAlertaCliente(null)
      setMotivoResolucionAlerta('')
      await loadData()
    } catch (error: any) {
      toast.error(error?.message || 'Error al resolver la alerta')
    } finally {
      setResolvingAlertaId(null)
    }
  }

  const handleApproveFromModal = async (
    entityId: string,
    type?: string,
    editedDetails?: any,
  ) => {
    const item = Object.values(data?.items || {}).flat().find(i => i.id === entityId)
    if (!item) return
    
    setProcessingId(item.id)
    try {
      if (item.tipoAprobacion === TipoAprobacion.REPROGRAMACION_CUOTA) {
        await prestamosService.aprobarReprogramacion(item.id)
      } else {
        await aprobacionesService.aprobar(item.id, {
          type: (type || item.tipoAprobacion) as TipoAprobacion,
          editedData: editedDetails,
        })
      }
      toast.success('Solicitud aprobada correctamente')
      closeAllDetailModals()
      await loadData()
    } catch (error: any) {
      toast.error(error?.message || 'Error al aprobar')
    } finally {
      setProcessingId(null)
    }
  }

  const handleRejectFromModal = async (entityId: string) => {
    const item = Object.values(data?.items || {}).flat().find(i => i.id === entityId)
    if (item) handleRechazar(item)
  }

  const handleAprobar = (item: Aprobacion) => {
    closeAllDetailModals()
    setConfirmModal({ isOpen: true, type: 'APPROVE', item })
  }

  const handleConfirmAprobar = async () => {
    if (!confirmModal?.item) return
    const { item } = confirmModal
    setProcessingId(item.id)
    try {
      // Las reprogramaciones tienen su propio endpoint dedicado
      if (item.tipoAprobacion === TipoAprobacion.REPROGRAMACION_CUOTA) {
        await prestamosService.aprobarReprogramacion(item.id)
      } else {
        await aprobacionesService.aprobar(item.id, {
          type: item.tipoAprobacion as TipoAprobacion
        })
      }
      toast.success('Solicitud aprobada correctamente')
      setConfirmModal(null)
      await loadData()
    } catch (error: any) {
      toast.error(error?.message || 'Error al aprobar')
    } finally {
      setProcessingId(null)
    }
  }

  const handleRechazar = (item: Aprobacion) => {
    closeAllDetailModals()
    setConfirmModal({ isOpen: true, type: 'REJECT', item })
  }

  // Handlers específicos para gastos provisionales
  const handleAprobarGastoProvisional = (item: Aprobacion) => {
    closeAllDetailModals()
    setConfirmModal({ isOpen: true, type: 'APPROVE_GASTO_PROVISIONAL', item })
  }

  const handleCrearDeuda = (item: Aprobacion) => {
    closeAllDetailModals()
    setConfirmModal({ isOpen: true, type: 'CREAR_DEUDA', item })
  }

  const handleReintegrar = (item: Aprobacion) => {
    closeAllDetailModals()
    setConfirmModal({ isOpen: true, type: 'REINTEGRAR', item })
  }

  const handleAnularSolicitudLegacy = (item: Aprobacion) => {
    closeAllDetailModals()
    setConfirmModal({ isOpen: true, type: 'ANULAR_LEGACY', item })
  }

  const handleConfirmRechazar = async (reason: string) => {
    if (!confirmModal?.item) return
    const { item } = confirmModal
    setProcessingId(item.id)
    try {
      // Las reprogramaciones tienen su propio endpoint dedicado
      if (item.tipoAprobacion === TipoAprobacion.REPROGRAMACION_CUOTA) {
        await prestamosService.rechazarReprogramacion(item.id, reason || undefined)
      } else {
        await aprobacionesService.rechazar(item.id, {
          type: item.tipoAprobacion as TipoAprobacion,
          motivoRechazo: reason
        })
      }
      toast.success('Solicitud rechazada')
      setConfirmModal(null)
      await loadData()
    } catch (error: any) {
      toast.error(error?.message || 'Error al rechazar')
    } finally {
      setProcessingId(null)
    }
  }

  const handleSuperadminAction = async () => {
    if (!confirmModal || (confirmModal.type !== 'CONFIRMAR' && confirmModal.type !== 'REVERTIR')) return
    setProcessingId(confirmModal.item.id)
    try {
      await aprobacionesService.confirmarAccionSuperadmin(
        confirmModal.item.id,
        confirmModal.type as any,
        notaSuperadmin || undefined,
      )
      toast.success(confirmModal.type === 'CONFIRMAR' ? 'Eliminación confirmada' : 'Solicitud restaurada')
      setConfirmModal(null)
      setNotaSuperadmin('')
      await loadData()
    } catch (error: any) {
      toast.error(error?.message || 'Error al procesar')
    } finally {
      setProcessingId(null)
    }
  }

  const tabs = [
    { id: 'todos', label: 'Todas', count: data?.total || 0 },
    { id: 'alertas-clientes', label: 'Alertas cliente', count: alertasCliente.length },
    ...Object.entries(data?.conteo || {}).map(([tipo, count]) => ({
      id: tipo,
      label: CATEGORIAS[tipo]?.label || tipo,
      count,
    })),
    ...(canReviewRejected && (superadminData?.total || 0) > 0
      ? [{ id: 'revision-final', label: 'Revisión Final', count: superadminData?.total || 0 }]
      : []),
  ]

  const getFilteredItems = (): Aprobacion[] => {
    if (!data) return []
    let items: Aprobacion[] = []
    
    if (activeTab === 'todos') {
      items = Object.values(data.items).flat()
    } else if (activeTab === 'revision-final') {
      items = superadminData?.items || []
    } else {
      items = data.items[activeTab] || []
    }

    // Aplicar filtro de ruta
    if (filtroRuta) {
      items = items.filter(item => {
        const datos = item.datosSolicitud || {}
        const itemRutaId = datos.rutaId || datos.ruta?.id
        return itemRutaId === filtroRuta
      })
    }

    // Aplicar filtro de punto de venta (rol)
    if (filtroPuntoVenta) {
      items = items.filter(item => item.rolSolicitante === 'PUNTO_DE_VENTA')
    }

    return items
  }

  const filteredItems = getFilteredItems()
  const filteredAlertasCliente = alertasCliente.filter((alerta) => {
    if (!filtroRuta) return true
    return alerta.rutaId === filtroRuta || alerta.snapshotCliente?.ruta?.id === filtroRuta
  })

  const renderItemCard = (item: Aprobacion, isReviewMode = false) => {
    const cat = CATEGORIAS[item.tipoAprobacion] || CATEGORIAS.BAJA_POR_PERDIDA
    const Icon = cat.icon
    const datos = item.datosSolicitud || {}
    const isProcessing = processingId === item.id

    const getResumen = () => {
      // Detectar subtipo de mora/vencida primero
      if (datos.tipo === 'ASIGNAR_MORA') {
        return {
          titulo: datos.cliente || 'Cliente',
          subtitulo: `Préstamo ${datos.numeroPrestamo || 'N/A'} · ${datos.diasGracia} días de plazo · Asignado por ${datos.asignadoPor || 'N/A'}`,
          monto: Number(datos.montoInteres || 0),
        }
      }
      if (datos.tipo === 'GESTION_VENCIDA') {
        const LABEL_DECISION: Record<string, string> = {
          PRORROGAR: '📅 Prórroga', CASTIGAR: '🔴 Baja por pérdida', JURIDICO: '⚖️ Cobro jurídico',
        }
        return {
          titulo: datos.cliente || 'Cliente',
          subtitulo: `${LABEL_DECISION[datos.decision] || datos.decision} · Préstamo ${datos.numeroPrestamo || 'N/A'} · por ${datos.gestionadoPor || 'N/A'}`,
          monto: Number(datos.saldoPendiente || item.montoSolicitud || 0),
        }
      }
      switch (item.tipoAprobacion) {
        case 'NUEVO_CLIENTE':
          return {
            titulo: `${datos.nombres || ''} ${datos.apellidos || ''}`.trim() || 'Cliente nuevo',
            subtitulo: `CC: ${datos.dni || 'N/A'} • Tel: ${datos.telefono || 'N/A'}`,
            monto: null,
          }
        case 'NUEVO_PRESTAMO': {
          const isArticulo = datos.tipo === 'ARTICULO' || datos.tipoPrestamo === 'ARTICULO';
          const cuotaInicial = Number(datos.cuotaInicial || 0);
          const numCuotas = datos.cantidadCuotas || datos.cuotas || datos.numCuotas || '?';
          const freqLabel = datos.frecuenciaPago ? ` ${datos.frecuenciaPago}` : '';

          if (isArticulo) {
            const valorArticulo = Number(datos.valorArticulo || 0) || Number(item.montoSolicitud || 0);
            const aFinanciar = datos.monto != null && Number(datos.monto) > 0
              ? Number(datos.monto)
              : Math.max(0, valorArticulo - cuotaInicial);
            return {
              titulo: datos.cliente || 'Crédito nuevo',
              subtitulo: `Artículo: ${datos.articulo || 'N/A'} • ${numCuotas} cuotas${freqLabel}`,
              monto: valorArticulo,
              labelMonto: 'Valor artículo',
              montoSecundario: aFinanciar,
              labelSecundario: 'A financiar',
            }
          }

          const capital = Number(datos.monto || 0) || Number(item.montoSolicitud || 0);
          const porcentaje = Number(datos.porcentaje || datos.tasaInteres || 0);

          logger.log('[Revisiones][NUEVO_PRESTAMO] datos:', JSON.stringify({
            tipoAmortizacion: datos.tipoAmortizacion,
            monto: datos.monto,
            montoTotal: datos.montoTotal,
            interesTotal: datos.interesTotal,
            cantidadCuotas: datos.cantidadCuotas,
            tasaInteres: datos.tasaInteres,
            porcentaje: datos.porcentaje,
            plazoMeses: datos.plazoMeses,
          }));

          const totalDevolver = (() => {
            if (datos.montoTotal && Number(datos.montoTotal) > 0) return Number(datos.montoTotal);
            if (datos.interesTotal && Number(datos.interesTotal) > 0) return capital + Number(datos.interesTotal);
            if (String(datos.tipoAmortizacion || '').toUpperCase() === 'FRANCESA' && porcentaje > 0) {
              const r = porcentaje / 100;
              const n = Math.max(1, numCuotas);
              const cuotaFija = capital * r / (1 - Math.pow(1 + r, -n));
              return Math.round(cuotaFija * n);
            }
            if (porcentaje > 0) {
              const plazoMeses = Number(datos.plazoMeses || datos.plazo || 1);
              return capital + (capital * porcentaje * Math.max(1, plazoMeses)) / 100;
            }
            return capital;
          })();

          return {
            titulo: datos.cliente || 'Crédito nuevo',
            subtitulo: `${String(datos.tipoAmortizacion || '').toUpperCase() === 'FRANCESA' ? 'Amortizable' : 'Efectivo'} • ${numCuotas} cuotas${freqLabel}`,
            monto: capital,
            labelMonto: 'Capital',
            montoSecundario: totalDevolver > capital ? totalDevolver : null,
            labelSecundario: 'Total a devolver',
          }
        }
        case 'REPROGRAMACION_CUOTA': {
          const frecLabel: Record<string,string> = { SEMANAL:'Semanal', QUINCENAL:'Quincenal', MENSUAL:'Mensual', DIARIO:'Diario' }
          const fechaOrig = formatFechaCortaBogota(resolveFechaOriginalReprogramacion(datos, item.creadoEn))
          const fechaNueva = formatFechaCortaBogota(datos.nuevaFechaVencimiento || datos.nuevaFecha)
          return {
            titulo: datos.clienteNombre || 'Cliente',
            subtitulo: `${frecLabel[datos.frecuenciaPago]||datos.frecuenciaPago} · ${fechaOrig} → ${fechaNueva} · Motivo: ${datos.motivo || 'N/A'}`,
            monto: Number(datos.montoCuota || 0) || null,
          }
        }
        default:
          return {
            titulo: item.tipoAprobacion.replace(/_/g, ' '),
            subtitulo: 'Pendiente revisión',
            monto: Number(item.montoSolicitud || 0) || null,
          }
      }
    }

    const resumen = getResumen()

    return (
      <div key={item.id} className={`bg-white rounded-2xl border ${isReviewMode ? 'border-rose-200' : 'border-slate-200'} shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden`}>
        <div className="p-5">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${cat.bgColor} ${cat.color} border ${cat.borderColor}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 leading-tight">{resumen.titulo}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{resumen.subtitulo}</p>
              </div>
            </div>
            {resumen.monto !== null && (
              <div className="text-right flex flex-col items-end justify-center">
                {resumen.labelMonto && <span className="text-[9px] font-bold text-slate-400 tracking-wider uppercase mb-0.5">{resumen.labelMonto}</span>}
                <div className="font-black text-slate-900 leading-none">{formatCurrency(resumen.monto)}</div>
                
                {resumen.montoSecundario ? (
                  <div className="mt-1.5 flex flex-col items-end">
                    <span className="text-[9px] font-bold text-slate-400 tracking-wider uppercase mb-0.5">{resumen.labelSecundario}</span>
                    <div className="text-xs font-bold text-blue-600 leading-none bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">{formatCurrency(resumen.montoSecundario)}</div>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 mb-4 text-[11px] font-bold text-slate-400">
             <span className="flex items-center gap-1"><User className="h-3 w-3" /> {item.solicitante}</span>
             <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
             <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {formatFecha(item.creadoEn)}</span>
          </div>

          <div className="flex gap-2">
            <button onClick={() => handleOpenDetail(item)} disabled={isProcessing} className="shrink-0 p-2 border border-slate-200 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors">
              <Eye className="h-4 w-4" />
            </button>
            {!isReviewMode ? (
              isGastoProvisional(item) ? (
                <div className="flex-1 grid grid-cols-3 gap-1.5">
                  <button onClick={() => handleAprobarGastoProvisional(item)} disabled={isProcessing} className="py-2 bg-emerald-600 text-white rounded-lg text-[9px] font-bold hover:bg-emerald-700 transition-colors flex flex-col items-center justify-center gap-0.5">
                    {isProcessing ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                    <span className="leading-tight">Aprobar</span>
                  </button>
                  <button onClick={() => handleCrearDeuda(item)} disabled={isProcessing} className="py-2 border border-amber-200 text-amber-600 rounded-lg text-[9px] font-bold hover:bg-amber-50 transition-colors flex flex-col items-center justify-center gap-0.5">
                    <Ban className="h-3 w-3" />
                    <span className="leading-tight">Rechazar+Deuda</span>
                  </button>
                  <button onClick={() => handleReintegrar(item)} disabled={isProcessing} className="py-2 border border-blue-200 text-blue-600 rounded-lg text-[9px] font-bold hover:bg-blue-50 transition-colors flex flex-col items-center justify-center gap-0.5">
                    <RotateCcw className="h-3 w-3" />
                    <span className="leading-tight">Reintegro</span>
                  </button>
                </div>
              ) : isGastoProvisionalLegacy(item) ? (
                <button onClick={() => handleAnularSolicitudLegacy(item)} disabled={isProcessing} className="flex-1 py-2.5 bg-slate-600 text-white rounded-xl text-xs font-bold hover:bg-slate-700 transition-colors flex items-center justify-center gap-2">
                  {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ban className="h-3.5 w-3.5" />}
                  Anular solicitud
                </button>
              ) : (
                <>
                  <button onClick={() => handleAprobar(item)} disabled={isProcessing} className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2">
                    {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                    Aprobar
                  </button>
                  <button onClick={() => handleRechazar(item)} disabled={isProcessing} className="flex-1 py-2.5 border border-rose-200 text-rose-600 rounded-xl text-xs font-bold hover:bg-rose-50 transition-colors flex items-center justify-center gap-2">
                    <XCircle className="h-3.5 w-3.5" />
                    Rechazar
                  </button>
                </>
              )
            ) : (
              <>
                <button onClick={() => setConfirmModal({ isOpen: true, type: 'CONFIRMAR', item })} disabled={isProcessing} className="flex-1 py-2.5 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition-colors">Eliminar</button>
                <button onClick={() => setConfirmModal({ isOpen: true, type: 'REVERTIR', item })} disabled={isProcessing} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors">Restaurar</button>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  const renderAlertaClienteCard = (alerta: AlertaCliente) => {
    const snapshot = alerta.snapshotCliente || {}
    const metricas = getAlertaMetricas(alerta)
    const cliente = snapshot.cliente || alerta.cliente || {}
    const ruta = snapshot.ruta || {}
    const reportante = alerta.reportadoPor
      ? `${alerta.reportadoPor.nombres || ''} ${alerta.reportadoPor.apellidos || ''}`.trim()
      : 'Sistema'
    const isResolving = resolvingAlertaId === alerta.id

    return (
      <div key={alerta.id} className="overflow-hidden rounded-2xl border border-red-200 bg-white shadow-sm transition-all duration-300 hover:shadow-md">
        <div className="p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="rounded-xl border border-red-200 bg-red-50 p-2 text-red-600">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h3 className="truncate font-bold text-slate-900">
                  {getAlertaClienteNombre(alerta)}
                </h3>
                <p className="mt-0.5 truncate text-xs text-slate-500">
                  {textValue(cliente.dni, 'Sin documento')} · {textValue(ruta.nombre, 'Sin ruta')}
                </p>
              </div>
            </div>
            <span className="rounded-full bg-red-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-red-700">
              Activa
            </span>
          </div>

          <div className="mb-4 rounded-xl bg-red-50 px-3 py-3">
            <p className="text-xs font-black uppercase tracking-widest text-red-500">
              {String(alerta.motivo || 'CLIENTE NO UBICADO').replace(/_/g, ' ')}
            </p>
            <p className="mt-1 line-clamp-2 text-sm font-bold text-red-950">
              {alerta.descripcion || 'Sin descripción registrada.'}
            </p>
          </div>

          <div className="mb-4 grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Saldo activo</p>
              <p className="mt-1 truncate text-sm font-black text-slate-900">
                {formatCurrency(Number(metricas.saldoPendienteTotal || 0))}
              </p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
              <p className="text-[9px] font-black uppercase tracking-widest text-amber-500">Vencidas</p>
              <p className="mt-1 text-sm font-black text-amber-800">
                {Number(metricas.cuotasVencidas || 0)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Obligaciones</p>
              <p className="mt-1 text-sm font-black text-slate-900">
                {Array.isArray(snapshot.creditos) ? snapshot.creditos.length : 0}
              </p>
            </div>
          </div>
          {Number(metricas.creditosPendientesRevision || 0) > 0 ? (
            <p className="mb-4 rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500">
              {Number(metricas.creditosPendientesRevision || 0)} pendiente(s) de revisión no suman al saldo activo.
            </p>
          ) : null}

          <div className="mb-4 flex items-center gap-3 text-[11px] font-bold text-slate-400">
            <span className="flex items-center gap-1"><User className="h-3 w-3" /> {reportante || 'Sistema'}</span>
            <span className="h-1 w-1 rounded-full bg-slate-200"></span>
            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {formatFecha(alerta.creadoEn)}</span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => handleOpenAlertaCliente(alerta)}
              className="rounded-xl border border-slate-200 p-2 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600"
              title="Ver detalle"
            >
              <Eye className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                setResolveAlertaCliente(alerta)
                setMotivoResolucionAlerta('')
              }}
              disabled={isResolving}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
            >
              {isResolving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              Resolver alerta
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Revisiones</h1>
        <p className="text-slate-500 text-sm">Controle las solicitudes pendientes de aprobación en el sistema.</p>
      </header>

      <div className="flex gap-2 mb-8 overflow-x-auto pb-2 no-scrollbar">
        {tabs.map(t => (
          <button 
            key={t.id} 
            onClick={() => setActiveTab(t.id)} 
            className={`px-5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap border transition-all ${
              activeTab === t.id 
                ? 'bg-slate-900 text-white border-slate-900 shadow-md' 
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
            }`}
          >
            {t.label} <span className="ml-1.5 opacity-50">{t.count}</span>
          </button>
        ))}
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
          <div className="flex items-center gap-2 text-slate-400">
            <Filter className="h-4 w-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Filtros</span>
          </div>

          <div className="flex flex-wrap gap-3 flex-1">
            <div className="relative">
              <select
                value={filtroRuta}
                onChange={(e) => setFiltroRuta(e.target.value)}
                className="appearance-none pl-10 pr-8 py-2 rounded-xl text-xs font-medium border border-slate-200 bg-white text-slate-700 hover:border-slate-300 transition-colors cursor-pointer focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900/20"
              >
                <option value="">Todas las rutas</option>
                {rutas.map(ruta => (
                  <option key={ruta.id} value={ruta.id}>{ruta.nombre || ruta.codigo}</option>
                ))}
              </select>
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>

            <label className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium border border-slate-200 bg-white text-slate-700 hover:border-slate-300 transition-colors cursor-pointer hover:bg-slate-50">
              <input
                type="checkbox"
                checked={filtroPuntoVenta}
                onChange={(e) => setFiltroPuntoVenta(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
              />
              Solo Punto de Venta
            </label>

            {(filtroRuta || filtroPuntoVenta) && (
              <button
                onClick={() => {
                  setFiltroRuta('')
                  setFiltroPuntoVenta(false)
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
                Limpiar
              </button>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-500">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="font-medium">Cargando datos...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {activeTab === 'alertas-clientes' ? (
            filteredAlertasCliente.length > 0 ? (
              filteredAlertasCliente.map(renderAlertaClienteCard)
            ) : (
              <div className="col-span-full rounded-3xl border-2 border-dashed border-slate-200 bg-white py-20 text-center">
                <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-slate-200" />
                <p className="font-bold text-slate-500">No hay alertas activas de clientes en esta categoría</p>
              </div>
            )
          ) : filteredItems.length > 0 ? (
            filteredItems.map(i => renderItemCard(i, activeTab === 'revision-final'))
          ) : (
             <div className="col-span-full py-20 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200">
                <CheckCircle2 className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-500 font-bold">No hay solicitudes pendientes en esta categoría</p>
             </div>
          )}
        </div>
      )}

      <NotificacionDetalleModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        notificacion={selectedItem}
        onApprove={handleApproveFromModal}
        onReject={handleRejectFromModal}
        canApprove
        isLegacy={selectedItem ? isGastoProvisionalLegacy(selectedItem) : false}
        userRol={userRol}
      />

      {selectedAlertaCliente && (
        <AlertaClienteDetalleModal
          alerta={selectedAlertaCliente}
          onClose={() => setSelectedAlertaCliente(null)}
        />
      )}

      {/* Modal dedicado para prorrogas y gestion de cuentas vencidas */}
      <ProrrogaDetalleModal
        isOpen={prorrogaModalOpen}
        onClose={() => { setProrrogaModalOpen(false); setSelectedProrroga(null) }}
        data={selectedProrroga}
        canApprove={canReviewRejected || userRol === 'COORDINADOR' || userRol === 'SUPERVISOR'}
        isProcessing={!!processingId}
        onApprove={(id) => {
          handleApproveFromModal(id)
        }}
        onReject={(id) => {
          setProrrogaModalOpen(false)
          const item = Object.values(data?.items || {}).flat().find(i => i.id === id)
          if (item) handleRechazar(item)
        }}
      />

      {/* Modal dedicado para reprogramaciones de cuota */}
      <ReprogramacionDetalleModal
        isOpen={reprogramacionModalOpen}
        onClose={() => { setReprogramacionModalOpen(false); setSelectedReprogramacion(null) }}
        data={selectedReprogramacion}
        canApprove={canReviewRejected || userRol === 'COORDINADOR' || userRol === 'SUPERVISOR'}
        isProcessing={!!processingId}
        onApprove={(id) => {
          handleApproveFromModal(id)
        }}
        onReject={(id) => {
          setReprogramacionModalOpen(false)
          const item = Object.values(data?.items || {}).flat().find(i => i.id === id)
          if (item) handleRechazar(item)
        }}
      />

      {resolveAlertaCliente && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-5">
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">
                Resolver alerta operativa
              </p>
              <h3 className="mt-2 text-lg font-black text-slate-900">
                {getAlertaClienteNombre(resolveAlertaCliente)}
              </h3>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                La alerta quedará cerrada, pero seguirá en el historial del cliente.
              </p>
            </div>

            <label className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-500">
              Motivo de resolución <span className="text-red-500">*</span>
            </label>
            <textarea
              value={motivoResolucionAlerta}
              onChange={(event) => setMotivoResolucionAlerta(event.target.value)}
              rows={4}
              className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
              placeholder="Ej: Cliente ubicado, datos actualizados y cobrador notificado."
            />

            <div className="mt-5 flex gap-2">
              <button
                onClick={() => {
                  setResolveAlertaCliente(null)
                  setMotivoResolucionAlerta('')
                }}
                className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-500 transition hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleResolverAlertaCliente}
                disabled={resolvingAlertaId === resolveAlertaCliente.id}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60"
              >
                {resolvingAlertaId === resolveAlertaCliente.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Resolver
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmModal && confirmModal.type === 'REJECT' && (
        <ConfirmRejectModal 
          isOpen={true}
          onClose={() => setConfirmModal(null)}
          onConfirm={handleConfirmRechazar}
          title={`Rechazar Solicitud: ${confirmModal.item.solicitante}`}
        />
      )}

      {confirmModal && confirmModal.type !== 'REJECT' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
           <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl animate-in zoom-in-95 duration-200">
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                {confirmModal.type === 'APPROVE' ? 'Aprobar Solicitud' :
                 confirmModal.type === 'APPROVE_GASTO_PROVISIONAL' ? 'Aprobar Gasto Operativo' :
                 confirmModal.type === 'CREAR_DEUDA' ? 'Rechazar con Deuda' :
                 confirmModal.type === 'REINTEGRAR' ? 'Rechazar con Reintegro' :
                 confirmModal.type === 'ANULAR_LEGACY' ? 'Anular Solicitud Legacy' :
                 confirmModal.type === 'CONFIRMAR' ? 'Confirmar Eliminación' : 'Restaurar Solicitud'}
              </h3>
              <p className="text-sm text-slate-500 mb-6">
                {confirmModal.type === 'APPROVE_GASTO_PROVISIONAL' ? '¿Aprobar este gasto como gasto operativo? La caja no se moverá nuevamente.' :
                 confirmModal.type === 'CREAR_DEUDA' ? '¿Rechazar este gasto y crear deuda al cobrador? La caja no se moverá y el monto quedará como deuda.' :
                 confirmModal.type === 'REINTEGRAR' ? '¿Rechazar este gasto con reintegro? La caja aumentará nuevamente por el valor del gasto.' :
                 confirmModal.type === 'ANULAR_LEGACY' ? 'Esta solicitud fue creada antes del flujo de gasto provisional y no afectó caja. Solo puede anularse sin impacto financiero.' :
                 `¿Estás seguro de realizar esta acción para ${confirmModal.item.solicitante}?`}
              </p>

              <div className="flex flex-col gap-2">
                <button
                  onClick={() => {
                    if (confirmModal.type === 'APPROVE') handleConfirmAprobar();
                    else if (confirmModal.type === 'APPROVE_GASTO_PROVISIONAL') handleConfirmAprobar();
                    else if (confirmModal.type === 'CREAR_DEUDA') handleConfirmRechazar('Gasto rechazado, deuda creada al cobrador');
                    else if (confirmModal.type === 'REINTEGRAR') handleConfirmRechazar('Gasto rechazado con reintegro');
                    else if (confirmModal.type === 'ANULAR_LEGACY') handleConfirmRechazar('Solicitud legacy anulada sin impacto financiero');
                    else handleSuperadminAction();
                  }}
                  disabled={!!processingId}
                  className={`py-3 rounded-xl font-bold text-white ${
                    confirmModal.type === 'APPROVE' || confirmModal.type === 'APPROVE_GASTO_PROVISIONAL' ? 'bg-emerald-600' :
                    confirmModal.type === 'CREAR_DEUDA' ? 'bg-amber-600' :
                    confirmModal.type === 'REINTEGRAR' ? 'bg-blue-600' :
                    confirmModal.type === 'ANULAR_LEGACY' ? 'bg-slate-600' :
                    confirmModal.type === 'CONFIRMAR' ? 'bg-slate-900' : 'bg-blue-600'
                  }`}
                >
                  {processingId ? 'Procesando...' : 'Confirmar'}
                </button>
                <button onClick={() => setConfirmModal(null)} className="py-3 text-slate-400 font-bold hover:text-slate-600">
                  Cancelar
                </button>
              </div>
           </div>
        </div>
      )}
    </div>
  )
}
