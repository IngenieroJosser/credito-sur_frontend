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
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { aprobacionesService, type Aprobacion, type PendingResponse, type SuperadminReviewResponse } from '@/services/aprobaciones-service'
import { prestamosService } from '@/services/prestamos-service'
import { TipoAprobacion } from '@/types/enums'
import { toast } from 'sonner'

import NotificacionDetalleModal from '@/components/dashboards/shared/NotificacionDetalleModal'
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
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
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
      mensaje = `${item.solicitante} solicitó una prórroga de ${datos.diasGracia} días para ${clienteNombre}${datos.numeroPrestamo ? ` (${datos.numeroPrestamo})` : ''}. Saldo: ${datos.saldoPendiente ? `$${Number(datos.saldoPendiente).toLocaleString('es-CO')}` : '—'}.`
    } else if (decision === 'ASIGNAR_MORA') {
      mensaje = `${item.solicitante} asignó $${Number(datos.montoInteres || 0).toLocaleString('es-CO')} de mora a ${clienteNombre}${datos.numeroPrestamo ? ` (${datos.numeroPrestamo})` : ''}.`
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
  const [activeTab, setActiveTab] = useState<string>('todos')
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [notaSuperadmin, setNotaSuperadmin] = useState('')
  const [userRol, setUserRol] = useState<string>('')
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'APPROVE' | 'REJECT' | 'CONFIRMAR' | 'REVERTIR';
    item: Aprobacion;
  } | null>(null)

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<any>(null)

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
  }

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [pendientes, superadmin] = await Promise.allSettled([
        aprobacionesService.obtenerPendientes(),
        canReviewRejected
          ? aprobacionesService.obtenerRevisionSuperadmin()
          : Promise.resolve({ total: 0, items: [] }),
      ])

      if (pendientes.status === 'fulfilled') setData(pendientes.value)
      if (superadmin.status === 'fulfilled') setSuperadminData(superadmin.value as any)
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
        fechaVencimientoOriginal: datos.fechaVencimientoOriginal,
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

  const handleApproveFromModal = async (entityId: string) => {
    const item = Object.values(data?.items || {}).flat().find(i => i.id === entityId)
    if (item) handleAprobar(item)
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
    if (activeTab === 'todos') return Object.values(data.items).flat()
    if (activeTab === 'revision-final') return superadminData?.items || []
    return data.items[activeTab] || []
  }

  const filteredItems = getFilteredItems()

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
          const valorTotal = Number(datos.valorArticulo || 0) || Number(item.montoSolicitud || 0);
          const cuotaInicial = Number(datos.cuotaInicial || 0);
          // "A financiar" = valorTotal - cuotaInicial, o datos.monto si está disponible
          const aFinanciar = datos.monto != null && Number(datos.monto) > 0
            ? Number(datos.monto)
            : Math.max(0, valorTotal - cuotaInicial);
          const numCuotas = datos.cantidadCuotas || datos.cuotas || datos.numCuotas || '?';
          const freqLabel = datos.frecuenciaPago ? ` ${datos.frecuenciaPago}` : '';
          return {
            titulo: datos.cliente || 'Crédito nuevo',
            subtitulo: `${isArticulo ? `Artículo: ${datos.articulo || 'N/A'}` : 'Efectivo'} • ${numCuotas} cuotas${freqLabel}`,
            monto: isArticulo ? valorTotal : aFinanciar,
            labelMonto: isArticulo ? 'Valor total' : undefined,
            montoSecundario: isArticulo ? aFinanciar : undefined,
            labelSecundario: isArticulo ? 'A financiar' : undefined,
          }
        }
        case 'REPROGRAMACION_CUOTA': {
          const frecLabel: Record<string,string> = { SEMANAL:'Semanal', QUINCENAL:'Quincenal', MENSUAL:'Mensual', DIARIO:'Diario' }
          const fechaOrig = datos.fechaVencimientoOriginal ? new Date(datos.fechaVencimientoOriginal).toLocaleDateString('es-CO',{day:'2-digit',month:'short'}) : '?'
          const fechaNueva = datos.nuevaFecha ? new Date(datos.nuevaFecha.includes('T') ? datos.nuevaFecha : datos.nuevaFecha+'T12:00:00').toLocaleDateString('es-CO',{day:'2-digit',month:'short'}) : '?'
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
            <button onClick={() => handleOpenDetail(item)} className="p-2 border border-slate-200 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors">
              <Eye className="h-4 w-4" />
            </button>
            {!isReviewMode ? (
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

      {loading ? (
        <div className="py-20 text-center text-slate-500">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="font-medium">Cargando datos...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.length > 0 ? (
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
      />

      {/* Modal dedicado para prorrogas y gestion de cuentas vencidas */}
      <ProrrogaDetalleModal
        isOpen={prorrogaModalOpen}
        onClose={() => { setProrrogaModalOpen(false); setSelectedProrroga(null) }}
        data={selectedProrroga}
        canApprove={canReviewRejected || userRol === 'COORDINADOR' || userRol === 'SUPERVISOR'}
        isProcessing={!!processingId}
        onApprove={(id) => {
          setProrrogaModalOpen(false)
          const item = Object.values(data?.items || {}).flat().find(i => i.id === id)
          if (item) handleAprobar(item)
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
          setReprogramacionModalOpen(false)
          const item = Object.values(data?.items || {}).flat().find(i => i.id === id)
          if (item) handleAprobar(item)
        }}
        onReject={(id) => {
          setReprogramacionModalOpen(false)
          const item = Object.values(data?.items || {}).flat().find(i => i.id === id)
          if (item) handleRechazar(item)
        }}
      />

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
                 confirmModal.type === 'CONFIRMAR' ? 'Confirmar Eliminación' : 'Restaurar Solicitud'}
              </h3>
              <p className="text-sm text-slate-500 mb-6">¿Estás seguro de realizar esta acción para {confirmModal.item.solicitante}?</p>
              
              <div className="flex flex-col gap-2">
                <button 
                  onClick={() => {
                    if (confirmModal.type === 'APPROVE') handleConfirmAprobar();
                    else handleSuperadminAction();
                  }} 
                  disabled={!!processingId} 
                  className={`py-3 rounded-xl font-bold text-white ${
                    confirmModal.type === 'APPROVE' ? 'bg-emerald-600' : 
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
