'use client'

/**
 * ============================================================================
 * MÓDULO DE REVISIONES - Centro de Aprobaciones
 * ============================================================================
 * 
 * @description
 * Vista centralizada para gestionar todas las solicitudes pendientes de aprobación.
 * Muestra las aprobaciones organizadas por categoría (Clientes, Créditos, Gastos, etc.)
 * con tabs para navegar entre ellas. El SuperAdmin además tiene acceso a una pestaña
 * especial de "Revisión SuperAdmin" donde decide sobre items rechazados/eliminados.
 * 
 * @roles ['SUPER_ADMINISTRADOR', 'ADMIN', 'COORDINADOR']
 */

import { useState, useEffect, useCallback } from 'react'
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
  ChevronRight,
  FileText,
  User,
  Ban,
  RotateCcw,
  ShieldAlert,
  Calendar,
  DollarSign,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { aprobacionesService, type Aprobacion, type PendingResponse, type SuperadminReviewResponse } from '@/services/aprobaciones-service'
import { TipoAprobacion } from '@/types/enums'
import { toast } from 'sonner'
import { useNotificaciones } from '@/components/providers/NotificacionesProvider'

// Configuración de categorías con meta visual
const CATEGORIAS: Record<string, { label: string; icon: any; color: string; bgColor: string; borderColor: string }> = {
  NUEVO_CLIENTE: {
    label: 'Clientes',
    icon: Users,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  NUEVO_PRESTAMO: {
    label: 'Créditos',
    icon: CreditCard,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
  },
  GASTO: {
    label: 'Gastos',
    icon: Wallet,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
  },
  SOLICITUD_BASE_EFECTIVO: {
    label: 'Base de Efectivo',
    icon: Landmark,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
  },
  PRORROGA_PAGO: {
    label: 'Prórrogas',
    icon: Clock,
    color: 'text-rose-600',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-200',
  },
  BAJA_POR_PERDIDA: {
    label: 'Bajas por pérdida',
    icon: AlertTriangle,
    color: 'text-slate-600',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-200',
  },
}

const formatFecha = (iso: string | null | undefined) => {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function RevisionesPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<PendingResponse | null>(null)
  const [superadminData, setSuperadminData] = useState<SuperadminReviewResponse | null>(null)
  const [activeTab, setActiveTab] = useState<string>('todos')
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [motivoRechazo, setMotivoRechazo] = useState('')
  const [showRejectModal, setShowRejectModal] = useState<Aprobacion | null>(null)
  const [showConfirmModal, setShowConfirmModal] = useState<{ item: Aprobacion; accion: 'CONFIRMAR' | 'REVERTIR' } | null>(null)
  const [notaSuperadmin, setNotaSuperadmin] = useState('')
  const [userRol, setUserRol] = useState<string>('')

  const { socket } = useNotificaciones()

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [pendientes, superadmin] = await Promise.allSettled([
        aprobacionesService.obtenerPendientes(),
        userRol === 'SUPER_ADMINISTRADOR' 
          ? aprobacionesService.obtenerRevisionSuperadmin()
          : Promise.resolve({ total: 0, items: [] }),
      ])

      if (pendientes.status === 'fulfilled') setData(pendientes.value)
      if (superadmin.status === 'fulfilled') setSuperadminData(superadmin.value)
    } catch (error) {
      console.error('Error cargando revisiones:', error)
      toast.error('Error al cargar las revisiones')
    } finally {
      setLoading(false)
    }
  }, [userRol])

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

  // Escuchar actualizaciones en tiempo real
  useEffect(() => {
    if (!socket) return
    const handler = () => { loadData() }
    socket.on('aprobaciones_actualizadas', handler)
    socket.on('clientes_actualizados', handler)
    socket.on('prestamos_actualizados', handler)
    return () => {
      socket.off('aprobaciones_actualizadas', handler)
      socket.off('clientes_actualizados', handler)
      socket.off('prestamos_actualizados', handler)
    }
  }, [socket, loadData])

  const handleAprobar = async (item: Aprobacion) => {
    setProcessingId(item.id)
    try {
      await aprobacionesService.aprobar(item.id, { type: item.tipoAprobacion as TipoAprobacion })
      toast.success('Solicitud aprobada exitosamente')
      await loadData()
    } catch (error: any) {
      toast.error(error?.message || 'Error al aprobar')
    } finally {
      setProcessingId(null)
    }
  }

  const handleRechazar = async () => {
    if (!showRejectModal) return
    setProcessingId(showRejectModal.id)
    try {
      await aprobacionesService.rechazar(showRejectModal.id, {
        type: showRejectModal.tipoAprobacion as TipoAprobacion,
        motivoRechazo: motivoRechazo || 'Rechazado sin motivo especificado',
      })
      toast.success('Solicitud rechazada')
      setShowRejectModal(null)
      setMotivoRechazo('')
      await loadData()
    } catch (error: any) {
      toast.error(error?.message || 'Error al rechazar')
    } finally {
      setProcessingId(null)
    }
  }

  const handleSuperadminAction = async () => {
    if (!showConfirmModal) return
    setProcessingId(showConfirmModal.item.id)
    try {
      await aprobacionesService.confirmarAccionSuperadmin(
        showConfirmModal.item.id,
        showConfirmModal.accion,
        notaSuperadmin || undefined,
      )
      toast.success(showConfirmModal.accion === 'CONFIRMAR'
        ? 'Eliminación confirmada'
        : 'Solicitud restaurada a pendiente')
      setShowConfirmModal(null)
      setNotaSuperadmin('')
      await loadData()
    } catch (error: any) {
      toast.error(error?.message || 'Error al procesar')
    } finally {
      setProcessingId(null)
    }
  }

  // Tabs dinámicos basados en los datos
  const tabs = [
    { id: 'todos', label: 'Todas', count: data?.total || 0 },
    ...Object.entries(data?.conteo || {}).map(([tipo, count]) => ({
      id: tipo,
      label: CATEGORIAS[tipo]?.label || tipo,
      count,
    })),
    ...(userRol === 'SUPER_ADMINISTRADOR' && (superadminData?.total || 0) > 0
      ? [{ id: 'superadmin', label: 'Revisión SuperAdmin', count: superadminData?.total || 0 }]
      : []),
  ]

  // Items filtrados según tab activo
  const getFilteredItems = (): Aprobacion[] => {
    if (!data) return []
    if (activeTab === 'todos') {
      return Object.values(data.items).flat()
    }
    if (activeTab === 'superadmin') {
      return superadminData?.items || []
    }
    return data.items[activeTab] || []
  }

  const filteredItems = getFilteredItems()

  const renderItemCard = (item: Aprobacion, isSuperadminReview = false) => {
    const cat = CATEGORIAS[item.tipoAprobacion] || CATEGORIAS.BAJA_POR_PERDIDA
    const Icon = cat.icon
    const datos = item.datosSolicitud || {}
    const isProcessing = processingId === item.id

    // Extraer info relevante según el tipo
    const getResumen = () => {
      switch (item.tipoAprobacion) {
        case 'NUEVO_CLIENTE':
          return {
            titulo: `${datos.nombres || ''} ${datos.apellidos || ''}`.trim() || 'Cliente nuevo',
            subtitulo: `DNI: ${datos.dni || 'N/A'} • Tel: ${datos.telefono || 'N/A'}`,
            monto: null,
          }
        case 'NUEVO_PRESTAMO':
          return {
            titulo: datos.cliente || 'Crédito nuevo',
            subtitulo: `${datos.tipo === 'ARTICULO' ? `Artículo: ${datos.articulo || 'N/A'}` : 'Préstamo efectivo'} • ${datos.cuotas || datos.numCuotas || '?'} cuotas`,
            monto: Number(datos.monto || datos.valorArticulo || item.montoSolicitud || 0),
          }
        case 'GASTO':
          return {
            titulo: datos.descripcion || 'Gasto operativo',
            subtitulo: `Tipo: ${datos.tipoGasto || 'N/A'}`,
            monto: Number(datos.monto || item.montoSolicitud || 0),
          }
        case 'SOLICITUD_BASE_EFECTIVO':
          return {
            titulo: 'Solicitud de Base de Efectivo',
            subtitulo: datos.descripcion || 'Sin descripción',
            monto: Number(datos.monto || item.montoSolicitud || 0),
          }
        case 'PRORROGA_PAGO':
          return {
            titulo: 'Prórroga de Pago',
            subtitulo: datos.razon || 'Sin razón especificada',
            monto: null,
          }
        default:
          return {
            titulo: item.tipoAprobacion.replace(/_/g, ' '),
            subtitulo: 'Pendiente de revisión',
            monto: Number(item.montoSolicitud || 0) || null,
          }
      }
    }

    const resumen = getResumen()

    return (
      <div
        key={item.id}
        className={`group bg-white rounded-2xl border ${isSuperadminReview ? 'border-rose-200' : 'border-slate-200'} shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 overflow-hidden`}
      >
        {/* Barra superior de color */}
        <div className={`h-1 ${isSuperadminReview ? 'bg-gradient-to-r from-rose-500 to-orange-500' : `bg-gradient-to-r ${cat.color === 'text-blue-600' ? 'from-blue-500 to-blue-400' : cat.color === 'text-emerald-600' ? 'from-emerald-500 to-emerald-400' : cat.color === 'text-amber-600' ? 'from-amber-500 to-amber-400' : cat.color === 'text-purple-600' ? 'from-purple-500 to-purple-400' : cat.color === 'text-rose-600' ? 'from-rose-500 to-rose-400' : 'from-slate-500 to-slate-400'}`}`} />

        <div className="p-5 md:p-6">
          {/* Header del card */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-start gap-3 min-w-0">
              <div className={`p-2.5 rounded-xl ${cat.bgColor} border ${cat.borderColor} shrink-0`}>
                <Icon className={`h-5 w-5 ${cat.color}`} />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-slate-900 text-sm md:text-base truncate">{resumen.titulo}</h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5 truncate">{resumen.subtitulo}</p>
              </div>
            </div>

            {resumen.monto !== null && resumen.monto > 0 && (
              <div className="text-right shrink-0">
                <p className="text-lg font-black text-slate-900">{formatCurrency(resumen.monto)}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Monto</p>
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-3 mb-4 text-xs text-slate-500 font-medium">
            <span className="inline-flex items-center gap-1.5">
              <User className="h-3 w-3" />
              {item.solicitante || 'Desconocido'}
            </span>
            <span className="w-1 h-1 rounded-full bg-slate-300" />
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${cat.bgColor} ${cat.color} ${cat.borderColor}`}>
              {cat.label}
            </span>
            <span className="w-1 h-1 rounded-full bg-slate-300" />
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatFecha(item.creadoEn)}
            </span>
          </div>

          {/* Info de rechazo (solo SuperAdmin review) */}
          {isSuperadminReview && (
            <div className="mb-4 p-3 bg-rose-50/50 rounded-xl border border-rose-100">
              <p className="text-xs font-bold text-rose-700 mb-1 flex items-center gap-1.5">
                <XCircle className="h-3.5 w-3.5" />
                Rechazado por: {item.rechazadoPor || 'Desconocido'}
              </p>
              {item.comentarios && (
                <p className="text-xs text-rose-600 font-medium">Motivo: {item.comentarios}</p>
              )}
            </div>
          )}

          {/* Botones de acción */}
          <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
            {!isSuperadminReview ? (
              <>
                <button
                  onClick={() => handleAprobar(item)}
                  disabled={isProcessing}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-sm shadow-emerald-600/20 disabled:opacity-50 active:scale-[0.98]"
                >
                  {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  Aprobar
                </button>
                <button
                  onClick={() => setShowRejectModal(item)}
                  disabled={isProcessing}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-white text-rose-600 text-xs font-bold rounded-xl hover:bg-rose-50 transition-all border border-rose-200 disabled:opacity-50 active:scale-[0.98]"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Rechazar
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setShowConfirmModal({ item, accion: 'CONFIRMAR' })}
                  disabled={isProcessing}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-rose-600 text-white text-xs font-bold rounded-xl hover:bg-rose-700 transition-all shadow-sm disabled:opacity-50 active:scale-[0.98]"
                >
                  <Ban className="h-3.5 w-3.5" />
                  Confirmar Eliminación
                </button>
                <button
                  onClick={() => setShowConfirmModal({ item, accion: 'REVERTIR' })}
                  disabled={isProcessing}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-all shadow-sm disabled:opacity-50 active:scale-[0.98]"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Restaurar
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 relative">
      {/* Fondo */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-blue-400 opacity-20 blur-[100px]" />
      </div>

      <div className="relative z-10 w-full space-y-6 md:space-y-8 p-4 md:p-8">
        {/* Header */}
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 self-start px-3 py-1 rounded-full bg-slate-100 text-xs text-slate-600 tracking-wide font-bold border border-slate-200">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Centro de Revisiones</span>
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight">
              <span className="text-blue-600">Aprobaciones</span>{' '}
              <span className="text-orange-500">Pendientes</span>
            </h1>
            <p className="text-sm md:text-base text-slate-500 mt-2 max-w-2xl font-medium leading-relaxed">
              Gestiona todas las solicitudes que requieren tu aprobación: clientes, créditos, gastos y más.
            </p>
          </div>

          <button
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-slate-700 text-xs font-bold rounded-xl border border-slate-200 hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </header>

        {/* Tabs */}
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
          <div className="inline-flex items-center gap-1 p-1.5 bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-sm min-w-max">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id
              const isSuperadmin = tab.id === 'superadmin'

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-2 whitespace-nowrap ${
                    isActive
                      ? isSuperadmin
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'bg-white text-slate-900 shadow-sm ring-1 ring-black/5'
                      : isSuperadmin
                        ? 'text-rose-500 hover:text-rose-700 hover:bg-rose-50'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  {isSuperadmin && <ShieldAlert className="h-3.5 w-3.5" />}
                  {tab.label}
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                    isActive
                      ? isSuperadmin ? 'bg-rose-700 text-white' : 'bg-blue-100 text-blue-600'
                      : isSuperadmin ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Contenido principal */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center space-y-4">
              <Loader2 className="h-8 w-8 text-blue-600 animate-spin mx-auto" />
              <p className="text-sm text-slate-500 font-medium">Cargando revisiones...</p>
            </div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center space-y-4 max-w-sm">
              <div className="w-20 h-20 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto border border-emerald-100">
                <CheckCircle2 className="h-10 w-10 text-emerald-500" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">¡Todo al día!</h3>
              <p className="text-sm text-slate-500 font-medium">
                {activeTab === 'superadmin'
                  ? 'No hay items rechazados que requieran tu decisión final.'
                  : 'No hay solicitudes pendientes de aprobación en esta categoría.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
            {filteredItems.map((item) =>
              renderItemCard(item, activeTab === 'superadmin')
            )}
          </div>
        )}

        {/* KPI Footer */}
        {data && !loading && (
          <div className="flex flex-wrap items-center gap-6 pt-6 border-t border-slate-200 text-sm font-medium text-slate-500">
            {Object.entries(data.conteo).map(([tipo, count]) => {
              const cat = CATEGORIAS[tipo]
              if (!cat) return null
              const Icon = cat.icon
              return (
                <div key={tipo} className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${cat.bgColor} border ${cat.borderColor}`}>
                    <Icon className={`h-3.5 w-3.5 ${cat.color}`} />
                  </div>
                  <span className="text-xs">
                    <span className="font-bold text-slate-900">{count}</span> {cat.label}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {/* Footer */}
        <div className="text-center pb-6">
          <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">
            Centro de Revisiones • CrediSur v1.0
          </p>
        </div>
      </div>

      {/* Modal de Rechazo */}
      {showRejectModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-rose-100">
                <XCircle className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2">Rechazar Solicitud</h3>
              <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                ¿Estás seguro de rechazar esta solicitud? Puedes agregar un motivo para que el solicitante lo sepa.
              </p>
              <textarea
                value={motivoRechazo}
                onChange={(e) => setMotivoRechazo(e.target.value)}
                placeholder="Motivo del rechazo (opcional)..."
                className="w-full h-24 p-4 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-rose-500/10 outline-none text-sm resize-none text-slate-900 font-medium mb-6"
              />
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleRechazar}
                  disabled={processingId === showRejectModal.id}
                  className="w-full rounded-2xl bg-rose-600 py-4 text-sm font-bold text-white hover:bg-rose-700 shadow-xl shadow-rose-600/20 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {processingId === showRejectModal.id ? 'Procesando...' : 'Confirmar Rechazo'}
                </button>
                <button
                  onClick={() => { setShowRejectModal(null); setMotivoRechazo('') }}
                  className="w-full rounded-2xl bg-slate-50 py-4 text-sm font-bold text-slate-500 hover:bg-slate-100 transition-all"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Decisión SuperAdmin */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 text-center">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 border ${
                showConfirmModal.accion === 'CONFIRMAR'
                  ? 'bg-rose-50 text-rose-600 border-rose-100'
                  : 'bg-blue-50 text-blue-600 border-blue-100'
              }`}>
                {showConfirmModal.accion === 'CONFIRMAR'
                  ? <Ban className="h-8 w-8" />
                  : <RotateCcw className="h-8 w-8" />
                }
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2">
                {showConfirmModal.accion === 'CONFIRMAR' ? 'Confirmar Eliminación' : 'Restaurar Solicitud'}
              </h3>
              <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                {showConfirmModal.accion === 'CONFIRMAR'
                  ? 'Esta acción eliminará definitivamente la solicitud. No se podrá deshacer.'
                  : 'La solicitud será restaurada a estado pendiente para que pueda ser re-evaluada.'}
              </p>
              <textarea
                value={notaSuperadmin}
                onChange={(e) => setNotaSuperadmin(e.target.value)}
                placeholder="Notas adicionales (opcional)..."
                className="w-full h-24 p-4 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500/10 outline-none text-sm resize-none text-slate-900 font-medium mb-6"
              />
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleSuperadminAction}
                  disabled={processingId === showConfirmModal.item.id}
                  className={`w-full rounded-2xl py-4 text-sm font-bold text-white shadow-xl transition-all active:scale-[0.98] disabled:opacity-50 ${
                    showConfirmModal.accion === 'CONFIRMAR'
                      ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                      : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'
                  }`}
                >
                  {processingId === showConfirmModal.item.id ? 'Procesando...' : (
                    showConfirmModal.accion === 'CONFIRMAR' ? 'Confirmar Eliminación Definitiva' : 'Restaurar a Pendiente'
                  )}
                </button>
                <button
                  onClick={() => { setShowConfirmModal(null); setNotaSuperadmin('') }}
                  className="w-full rounded-2xl bg-slate-50 py-4 text-sm font-bold text-slate-500 hover:bg-slate-100 transition-all"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
