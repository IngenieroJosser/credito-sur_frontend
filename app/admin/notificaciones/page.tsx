'use client'

import React, { useState, useEffect } from 'react'

import { useRouter } from 'next/navigation'
import { useNotificaciones } from '@/components/providers/NotificacionesProvider';
import { 
  Bell, 
  Search, 
  Banknote, 
  UserPlus,
  CreditCard,
  Receipt,
  DollarSign,
  AlertCircle, 
  CheckCircle2, 
  Clock,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Eye,
  AlertTriangle,
  Info
} from 'lucide-react'
import FiltroRuta from '@/components/filtros/FiltroRuta'
import { notificacionesService, type Notificacion } from '@/services/notificaciones-service'
import ConfirmModal from '@/components/ui/ConfirmModal'
import ConfirmApproveModal from '@/components/ui/ConfirmApproveModal'
import ConfirmRejectModal from '@/components/ui/ConfirmRejectModal'
import EditarPrestamoModal from '@/components/prestamos/EditarPrestamoModal'
import { aprobacionesService } from '@/services/aprobaciones-service'
import { TipoAprobacion } from '@/types/enums'
import NotificacionDetalleModal from '@/components/dashboards/shared/NotificacionDetalleModal'
import { formatCurrency, formatMilesCOP } from '@/lib/utils'

// MOCKS ELIMINADOS - La aplicación solo funciona con datos reales del backend

// Las notificaciones que requieren aprobación se identifican por metadata.tipoAprobacion
// o porque el backend las marcó explícitamente como de tipo APROBACION.
// Inferir tipo de aprobación a partir del título de la notificación (último recurso)
function inferirApprovalTypePorTitulo(titulo: string): string | undefined {
  const t = titulo.toLowerCase()
  if (t.includes('gasto')) return TipoAprobacion.GASTO
  if (t.includes('préstamo') || t.includes('prestamo')) return TipoAprobacion.NUEVO_PRESTAMO
  if (t.includes('base de efectivo') || t.includes('solicitud de base')) return TipoAprobacion.SOLICITUD_BASE_EFECTIVO
  if (t.includes('cliente')) return TipoAprobacion.NUEVO_CLIENTE
  if (t.includes('solicitud')) return TipoAprobacion.SOLICITUD_BASE_EFECTIVO
  return undefined
}

// Roles que pueden aprobar/rechazar solicitudes
const ROLES_APROBADORES = ['SUPER_ADMINISTRADOR', 'ADMIN', 'COORDINADOR']
// Roles que tienen acceso a filtro de rutas
const ROLES_CON_RUTAS = ['SUPER_ADMINISTRADOR', 'ADMIN', 'COORDINADOR', 'SUPERVISOR']

export default function NotificacionesPage() {
  const router = useRouter()

  // --- ROL DEL USUARIO ---
  // Para simplificar la UI y delegar la seguridad al backend (RolesGuard),
  // permitimos mostrar acciones de aprobación a cualquier usuario autenticado.
  const [userRol, setUserRol] = useState<string | null>(null)
  useEffect(() => {
    try {
      const userData = localStorage.getItem('user')
      if (userData) {
        const parsed = JSON.parse(userData)
        setUserRol(parsed.rol || null)
      }
    } catch { /* ignore */ }
  }, [])

  const canApprove = true
  const canFilterByRoute = userRol ? ROLES_CON_RUTAS.includes(userRol) : false

  // --- ESTADOS DE FILTROS ---
  const [filter, setFilter] = useState<'TODAS' | 'NO_LEIDAS' | 'LEIDAS' | 'APROBADAS' | 'RECHAZADAS'>('TODAS')
  const [tipoFilter, setTipoFilter] = useState<'TODOS' | Notificacion['tipo']>('TODOS')
  const [filterRuta, setFilterRuta] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'RECENT' | 'OLD' | 'CATEGORY' | 'STATUS'>('RECENT')
  
  // --- ESTADOS DE DATOS Y UI ---
  const [search, setSearch] = useState('')
  const [notificacionesState, setNotificacionesState] = useState<Notificacion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { notificaciones: globalNotifs } = useNotificaciones()

  useEffect(() => {
    const cargarNotificaciones = async () => {
      try {
        // Verificar si hay token antes de intentar cargar
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
        if (!token) {
          setError('No hay sesión activa. Por favor, inicia sesión.')
          setIsLoading(false)
          return
        }

        const notifs = globalNotifs
        
        const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null
        const user = userStr ? JSON.parse(userStr) as { rol?: string } : null
        const basePath = user?.rol === 'COBRADOR' ? '/cobranzas' : user?.rol === 'CONTADOR' ? '/contador' : user?.rol === 'COORDINADOR' ? '/coordinador' : '/admin'
        
        const notifsConLinks = notifs.map((n: Notificacion) => {
          const raw: any = n as any
          const metadata = raw.metadata || {}

          let link = undefined
          if (n.tipo === 'PAGO') link = basePath
          if (n.tipo === 'CLIENTE') link = user?.rol === 'COBRADOR' ? `${basePath}/clientes/nuevo` : undefined
          if (n.tipo === 'MORA') link = basePath
          if (n.tipo === 'SISTEMA') link = user?.rol === 'COBRADOR' ? `${basePath}/solicitudes` : undefined

          const fecha =
            raw.creadoEn
              ? new Date(raw.creadoEn).toLocaleString('es-CO', {
                  day: '2-digit',
                  month: '2-digit',
                  year: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : n.fecha

          const rutaId = n.rutaId || metadata.rutaId || undefined
          const entidadId = n.entidadId ?? raw.entidadId
          const entidad: string = raw.entidad || ''

          // Asegurar que las notificaciones tengan el tipo correcto basado en la entidad para los filtros
          let tipoFinal = n.tipo;
          if (entidad === 'PAGO' || entidad === 'Pago') tipoFinal = 'PAGO';
          if (entidad === 'CLIENTE' || entidad === 'Cliente') tipoFinal = 'CLIENTE';
          if (entidad === 'Prestamo' || entidad === 'PRESTAMO') tipoFinal = 'PRESTAMO';
          if (entidad === 'GASTO' || entidad === 'Gasto') tipoFinal = 'GASTO';

          // Normalizar MORA: a veces el backend la emite como SISTEMA.
          // Usamos señales robustas: metadata.tipo, metadata.tipoAprobacion, o texto.
          const metaTipo = String(metadata.tipo || '').toUpperCase()
          const metaTipoAprobacion = String(metadata.tipoAprobacion || '').toUpperCase()
          const texto = `${String(n.titulo || '')} ${String(n.mensaje || '')}`.toLowerCase()
          const pareceMora =
            metaTipo === 'ASIGNAR_MORA' ||
            metaTipoAprobacion === 'ASIGNAR_MORA' ||
            ('montoInteres' in metadata) ||
            texto.includes('mora') ||
            texto.includes('interés de mora') ||
            texto.includes('interes de mora')
          if (tipoFinal === 'SISTEMA' && pareceMora) tipoFinal = 'MORA'

          let approvalType: string | undefined = metadata.tipoAprobacion as string | undefined

          if (!approvalType && (n.tipo === 'APROBACION' || entidad === 'Aprobacion')) {
            if (n.titulo && (n.titulo.toLowerCase().includes('aprobación') || n.titulo.toLowerCase().includes('requiere'))) {
              approvalType = inferirApprovalTypePorTitulo(n.titulo)
            }
          }

          // Prevenir que las notificaciones puramente informativas traten de verse como si necesitaran acción
          if ((n.tipo as string) === 'EXITO' || (n.tipo as string) === 'ALERTA') {
            approvalType = undefined;
          }

          // Mapear estado real de la aprobación del backend
          const estadoAprobacionMap: Record<string, string> = {
            PENDIENTE: 'PENDIENTE',
            APROBADO: 'APROBADA',
            RECHAZADO: 'RECHAZADA',
          }
          const estadoReal = metadata.estadoAprobacion
            ? estadoAprobacionMap[metadata.estadoAprobacion] || metadata.estadoAprobacion
            : undefined
          
          let estado = estadoReal || n.estado || (approvalType ? 'PENDIENTE' : undefined)
          
          if ((n.tipo as string) === 'EXITO' || (n.tipo as string) === 'ALERTA') {
            estado = n.estado || 'LEIDA';
          }

          let detalles = n.detalles || (metadata.detalles as any) || {}

          // Enriquecer detalles de gastos (se puede venir como tipo GASTO o como entidad GASTO con tipo SISTEMA)
          if (n.tipo === 'GASTO' || entidad === 'GASTO' || approvalType === 'GASTO') {
            detalles = {
              ...detalles,
              monto: detalles.monto ?? metadata.monto,
              descripcion: metadata.descSolicitud || detalles.descripcion || metadata.descripcion || n.mensaje,
            }
          }

          // Extraer nombre del solicitante de múltiples fuentes posibles
          const solicitante =
            metadata.solicitadoPor ||
            metadata.solicitante ||
            metadata.usuario ||
            metadata.cobrador ||
            raw.solicitante ||
            undefined

          return {
            ...n,
            tipo: tipoFinal as any,
            link,
            fecha,
            rutaId,
            entidadId,
            estado,
            detalles,
            solicitante,
            metadata,
            revisadoPor: metadata.revisadoPor,
            motivoRechazo: metadata.motivoRechazo || n.motivoRechazo,
            ...(approvalType ? { approvalType } : {}),
          } as Notificacion & { approvalType?: string }
        })
        
        setNotificacionesState(notifsConLinks)
        setError(null)
      } catch (err) {
        console.error('Error cargando notificaciones:', err)
        setError('No se pudieron cargar las notificaciones. Verifica tu conexión o intenta más tarde.')
      } finally {
        setIsLoading(false)
      }
    }
    
    // We only load map logic if globalNotifs has data, and we don't spam if it's empty during init.
    // If it's validly empty, we show empty state.
    cargarNotificaciones()
  }, [globalNotifs])

  // Estados para modales y acciones
  const [selectedNotif, setSelectedNotif] = useState<Notificacion | null>(null)
  const [editedDetails, setEditedDetails] = useState<Notificacion['detalles']>({})
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isEditingMode, setIsEditingMode] = useState(false)
  const [showApproveModalList, setShowApproveModalList] = useState(false)
  const [showRejectModalList, setShowRejectModalList] = useState(false)
  const [showMarkAllReadConfirm, setShowMarkAllReadConfirm] = useState(false)
  const [prestamoModalOpen, setPrestamoModalOpen] = useState(false)
  const [selectedPrestamoId, setSelectedPrestamoId] = useState<string | null>(null)
  const [feedbackModal, setFeedbackModal] = useState<{titulo: string, mensaje: string, tipo: 'success' | 'danger'} | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  
  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // --- LÓGICA DE FILTRADO Y ORDENAMIENTO ---
  const notificaciones = notificacionesState
    .filter((n) => {
      if (filter === 'TODAS') return true
      if (filter === 'NO_LEIDAS') return !n.leida
      if (filter === 'LEIDAS') return n.leida
      if (filter === 'APROBADAS') return n.estado === 'APROBADA'
      if (filter === 'RECHAZADAS') return n.estado === 'RECHAZADA'
      return true
    })
    .filter((n) => (tipoFilter === 'TODOS' ? true : n.tipo === tipoFilter))
    .filter((n) => (!filterRuta || filterRuta === '' ? true : n.rutaId === filterRuta))
    .filter((n) => {
      const q = search.trim().toLowerCase()
      if (!q) return true
      return (
        n.titulo.toLowerCase().includes(q) ||
        n.mensaje.toLowerCase().includes(q) ||
        n.id.toLowerCase().includes(q)
      )
    })
    .sort((a, b) => {
      if (sortBy === 'RECENT') return new Date(b.creadoEn || 0).getTime() - new Date(a.creadoEn || 0).getTime()
      if (sortBy === 'OLD') return new Date(a.creadoEn || 0).getTime() - new Date(b.creadoEn || 0).getTime()
      if (sortBy === 'CATEGORY') return a.tipo.localeCompare(b.tipo)
      if (sortBy === 'STATUS') return (a.estado || '').localeCompare(b.estado || '')
      return 0
    })

  // Aplicar paginación después de filtrar
  const totalPages = Math.ceil(notificaciones.length / itemsPerPage);
  const paginatedNotificaciones = notificaciones.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Resetear página cuando cambian los filtros o el orden
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, tipoFilter, filterRuta, search, sortBy]);

  // Helper for formatted numeric inputs
  const formatCOPInput = (val: number | undefined) => {
    if (val === undefined || val === 0) return ''
    return formatMilesCOP(val)
  }

  const parseCOPInput = (val: string) => {
    return Number(val.replace(/\D/g, ''))
  }


  const getIcon = (tipo: string) => {
    switch (tipo) {
      case 'PAGO': return <Banknote className="h-5 w-5" />
      case 'CLIENTE': return <UserPlus className="h-5 w-5" />
      case 'PRESTAMO': return <CreditCard className="h-5 w-5" />
      case 'GASTO': return <Receipt className="h-5 w-5" />
      case 'SOLICITUD_DINERO': return <DollarSign className="h-5 w-5" />
      case 'MORA': return <AlertCircle className="h-5 w-5" />
      default: return <Bell className="h-5 w-5" />
    }
  }

  const getColor = (tipo: string) => {
    switch (tipo) {
      case 'PAGO': return 'bg-blue-50 text-blue-700 border-blue-100'
      case 'CLIENTE': return 'bg-purple-50 text-purple-700 border-purple-100'
      case 'PRESTAMO': return 'bg-indigo-50 text-indigo-700 border-indigo-100'
      case 'GASTO': return 'bg-orange-50 text-orange-700 border-orange-100'
      case 'SOLICITUD_DINERO': return 'bg-emerald-50 text-emerald-700 border-emerald-100'
      case 'MORA': return 'bg-rose-50 text-rose-700 border-rose-100'
      case 'APROBACION': return 'bg-emerald-50 text-emerald-700 border-emerald-100'
      default: return 'bg-white text-slate-700 border-slate-200'
    }
  }

  const handleOpenConfirm = (notif: Notificacion, action: 'APPROVE' | 'REJECT') => {
    setSelectedNotif(notif)
    setEditedDetails(notif.detalles || {})
    if (action === 'REJECT') {
      setShowRejectModalList(true)
    } else {
      setShowApproveModalList(true)
    }
  }

  const handleApproveConfirmList = async () => {
    if (!selectedNotif) return

    const anyNotif: any = selectedNotif
    const approvalType: string | undefined = anyNotif.approvalType
    const entidadId = selectedNotif.entidadId

    if (!approvalType || !entidadId) {
      setFeedbackModal({
        titulo: 'No se puede procesar',
        mensaje: 'Esta notificación no tiene la información necesaria para ser aprobada. Falta el tipo de aprobación o el ID de la entidad.',
        tipo: 'danger'
      })
      setShowApproveModalList(false)
      return
    }

    setIsProcessing(true)

    try {
      await aprobacionesService.aprobar(entidadId, {
        type: approvalType as any,
        notas: editedDetails ? JSON.stringify(editedDetails) : undefined,
      })

      setNotificacionesState(prev =>
        prev.map(n =>
          n.id === selectedNotif.id
            ? {
                ...n,
                estado: 'APROBADA',
                leida: true,
                detalles: { ...n.detalles, ...editedDetails },
              }
            : n,
        ),
      )

        setFeedbackModal({
          titulo: 'Solicitud Aprobada',
        mensaje: `La solicitud ha sido aprobada correctamente y se ha reflejado en el sistema.`,
          tipo: 'success'
        })
    } catch (err: any) {
      console.error('Error procesando aprobación/rechazo:', err)
      setFeedbackModal({
        titulo: 'Error al procesar',
        mensaje: err?.message || 'Ocurrió un error al procesar la solicitud. Verifique su conexión e intente de nuevo.',
        tipo: 'danger'
      })
    } finally {
      setIsProcessing(false)
    }

    setShowApproveModalList(false)
    setSelectedNotif(null)
  }

  const handleRejectConfirmList = async (reason: string) => {
    if (!selectedNotif) return
    const anyNotif: any = selectedNotif
    const approvalType: string | undefined = anyNotif.approvalType
    const entidadId = selectedNotif.entidadId
    if (!approvalType || !entidadId) {
      setFeedbackModal({
        titulo: 'No se puede procesar',
        mensaje: 'Esta notificación no tiene la información necesaria para ser rechazada.',
        tipo: 'danger'
      })
      setShowRejectModalList(false)
      return
    }
    setIsProcessing(true)
    try {
      await aprobacionesService.rechazar(entidadId, {
        type: approvalType as any,
        motivoRechazo: reason || 'Rechazado por el administrador',
      })
      setNotificacionesState(prev =>
        prev.map(n =>
          n.id === selectedNotif.id
            ? {
                ...n,
                estado: 'RECHAZADA',
                leida: true,
                motivoRechazo: reason,
              }
            : n,
        ),
      )
      setFeedbackModal({
        titulo: 'Solicitud Rechazada',
        mensaje: `La solicitud ha sido rechazada correctamente.`,
        tipo: 'danger'
      })
    } catch (err: any) {
      console.error('Error procesando rechazo:', err)
      setFeedbackModal({
        titulo: 'Error al procesar',
        mensaje: err?.message || 'Ocurrió un error al procesar el rechazo.',
        tipo: 'danger'
      })
    } finally {
      setIsProcessing(false)
      setShowRejectModalList(false)
      setSelectedNotif(null)
    }
  }

  const handleOpenDetail = (notif: Notificacion) => {
    setSelectedNotif(notif)
    setEditedDetails(notif.detalles || {})
    setIsDetailModalOpen(true)
  }

  const handleApproveFromModal = async (entityId: string, type: string, details: any) => {
    try {
      await aprobacionesService.aprobar(entityId, {
        type: type as any,
        notas: details ? JSON.stringify(details) : undefined,
      })

      setNotificacionesState(prev =>
        prev.map(n =>
          n.entidadId === entityId
            ? {
                ...n,
                estado: 'APROBADA',
                leida: true,
                detalles: { ...n.detalles, ...details },
              }
            : n,
        ),
      )

      setFeedbackModal({
        titulo: 'Solicitud Aprobada',
        mensaje: `La solicitud ha sido aprobada correctamente.`,
        tipo: 'success'
      })
    } catch (err: any) {
      console.error('Error in handleApproveFromModal:', err)
      throw err
    }
  }

  const handleRejectFromModal = async (entityId: string, type: string, reason: string) => {
    try {
      await aprobacionesService.rechazar(entityId, {
        type: type as any,
        motivoRechazo: reason || 'Rechazado por el administrador',
      })

      setNotificacionesState(prev =>
        prev.map(n =>
          n.entidadId === entityId
            ? {
                ...n,
                estado: 'RECHAZADA',
                leida: true,
                motivoRechazo: reason,
              }
            : n,
        ),
      )

      setFeedbackModal({
        titulo: 'Solicitud Rechazada',
        mensaje: `La solicitud ha sido rechazada correctamente.`,
        tipo: 'danger'
      })
    } catch (err: any) {
      console.error('Error in handleRejectFromModal:', err)
      throw err
    }
  }

  return (
    <div className="min-h-screen relative bg-white">
      {/* Fondo Arquitectónico */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
        <div className="absolute left-0 top-0 -z-10 h-[360px] w-[360px] rounded-full bg-blue-600 opacity-15 blur-[110px]" />
      </div>

      <div className="relative z-10 pb-20">
        {/* Header */}
        <div className="pb-8 pt-10 px-8 w-full">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <button
                type="button"
                onClick={() => router.back()}
                className="mb-3 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900"
              >
                <ChevronLeft className="h-4 w-4" />
                Volver
              </button>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-white shadow-sm rounded-lg border border-slate-100">
                  <CheckCircle2 className="h-6 w-6 text-orange-500" />
                </div>
                <span className="text-xs font-bold text-blue-600 tracking-wider uppercase bg-blue-50 border border-blue-100 px-3 py-1 rounded-full">
                  Centro de Control Unificado
                </span>
              </div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                Notificaciones
              </h1>
              <p className="text-slate-500 mt-2 text-lg">
                Gestiona alertas y avisos informativos del sistema.
              </p>
            </div>
            
            <div className="flex gap-3">
               <button
                 onClick={() => setShowMarkAllReadConfirm(true)}
                 className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-slate-50 hover:text-blue-600 transition-colors shadow-sm flex items-center gap-2"
               >
                 <CheckCircle2 className="h-4 w-4" />
                 Marcar todas como leídas
               </button>
            </div>
          </div>
        </div>

        <div className="w-full px-8">
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Tabs y Filtros */}
            <div className="border-b border-slate-100 p-4 flex flex-col gap-4">
              <div className="flex bg-slate-100/50 p-1 rounded-xl">
                <button
                  onClick={() => setFilter('TODAS')}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                    filter === 'TODAS' 
                      ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200' 
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Todas
                </button>
                <button
                  onClick={() => setFilter('NO_LEIDAS')}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                    filter === 'NO_LEIDAS' 
                      ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200' 
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  No leídas
                </button>
                <button
                  onClick={() => setFilter('LEIDAS')}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                    filter === 'LEIDAS' 
                      ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200' 
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Leídas
                </button>
                {canApprove && (
                  <button
                    onClick={() => setFilter('APROBADAS')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                      filter === 'APROBADAS' 
                        ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200' 
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Aprobadas
                  </button>
                )}
                {canApprove && (
                  <button
                    onClick={() => setFilter('RECHAZADAS')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                      filter === 'RECHAZADAS' 
                        ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200' 
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Rechazadas
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-6">
                {/* Tipo de Notificación */}
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 pl-1">Filtrar por Categoría</p>
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    {(
                      [
                        { key: 'TODOS' as const, label: 'Todas' },
                        { key: 'PRESTAMO' as const, label: 'Préstamos' },
                        { key: 'CLIENTE' as const, label: 'Clientes' },
                        { key: 'GASTO' as const, label: 'Gastos' },
                        { key: 'SOLICITUD_DINERO' as const, label: 'Bases' },
                        { key: 'PAGO' as const, label: 'Pagos' },
                        { key: 'MORA' as const, label: 'Mora' },
                        { key: 'SISTEMA' as const, label: 'Sistema' },
                      ]
                    ).map((t) => (
                      <button
                        key={t.key}
                        onClick={() => setTipoFilter(t.key)}
                        className={`px-5 py-2 rounded-xl text-xs font-bold transition-all border whitespace-nowrap ${
                          tipoFilter === t.key
                            ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-100'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Filtro de Ruta + Búsqueda */}
                  <div className={`flex flex-col lg:flex-row lg:items-end justify-between gap-6`}>
                    <div className="flex flex-col md:flex-row gap-4 flex-1">
                      {canFilterByRoute && (
                        <div className="flex-1 min-w-0">
                          <FiltroRuta 
                              onRutaChange={setFilterRuta} 
                              selectedRutaId={filterRuta}
                              layout="wrap"
                              showAllOption={true}
                              hideLabel={true}
                          />
                        </div>
                      )}
                      
                      <div className="md:w-48">
                        <select 
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value as any)}
                          className="w-full h-[42px] px-4 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 transition-all cursor-pointer"
                        >
                          <option value="RECENT">Más recientes</option>
                          <option value="OLD">Más antiguos</option>
                          <option value="CATEGORY">Por Categoría</option>
                          <option value="STATUS">Por Estado</option>
                        </select>
                      </div>
                    </div>

                    <div className={`relative w-full ${canFilterByRoute ? 'lg:w-80' : ''}`}>
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar notificación..."
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 text-sm text-slate-900 placeholder:text-slate-400 transition-all font-medium"
                      />
                    </div>
                  </div>
              </div>
            </div>

            {/* Lista */}
            <div className="divide-y divide-slate-100">
              {isLoading ? (
                <div className="p-16 text-center">
                  <div className="animate-spin mx-auto mb-4 h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
                  <p className="text-slate-500 text-sm font-medium">Cargando notificaciones...</p>
                </div>
              ) : error ? (
                <div className="p-16 text-center">
                  <AlertCircle className="mx-auto mb-4 h-12 w-12 text-rose-500" />
                  <h3 className="text-lg font-bold text-slate-900 mb-2">{error}</h3>
                  <p className="text-slate-500 text-sm mb-6">Por favor, verifica tu conexión o intenta más tarde.</p>
                  <button
                    onClick={() => window.location.reload()}
                    className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
                  >
                    Reintentar
                  </button>
                </div>
              ) : paginatedNotificaciones.length > 0 ? (
                paginatedNotificaciones.map((notif) => (
                  <div 
                    key={notif.id} 
                    className={`p-6 hover:bg-slate-50/80 transition-colors group ${!notif.leida ? 'bg-blue-50/30' : ''}`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-xl border ${getColor(notif.tipo)} shadow-sm group-hover:scale-105 transition-transform duration-300`}>
                        {getIcon(notif.tipo)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className={`text-base font-bold flex items-center gap-2 ${!notif.leida ? 'text-slate-900' : 'text-slate-700'}`}>
                            {notif.titulo}
                            {notif.estado === 'APROBADA' && (
                              <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200 uppercase font-black tracking-tighter">Aprobada</span>
                            )}
                            {notif.estado === 'RECHAZADA' && (
                              <span className="text-[10px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full border border-rose-200 uppercase font-black tracking-tighter">Rechazada</span>
                            )}
                            {!notif.leida && !notif.estado && (
                              <span className="inline-flex w-2 h-2 rounded-full bg-orange-500"></span>
                            )}
                          </h3>
                          <span className="text-xs font-medium text-slate-400 flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                            <Clock className="h-3 w-3" />
                            {notif.fecha}
                          </span>
                        </div>
                        <p className="text-slate-600 text-sm leading-relaxed">
                          {notif.mensaje}
                        </p>
                        {/* Nombre del solicitante */}
                        {notif.solicitante && notif.estado === 'PENDIENTE' && (
                          <div className="mt-2 inline-flex items-center gap-1.5 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-lg">
                            <div className="w-5 h-5 rounded-full bg-amber-200 flex items-center justify-center">
                              <span className="text-[9px] font-black text-amber-700">{(notif.solicitante as string).charAt(0).toUpperCase()}</span>
                            </div>
                            <span className="text-[10px] font-bold text-amber-700">Solicitado por: <span className="font-black">{notif.solicitante}</span></span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenDetail(notif)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                          title="Ver detalles"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        


                         {!notif.leida && (
                           <button
                             onClick={async () => {
                               try {
                                 await notificacionesService.marcarComoLeida(notif.id)
                                 setNotificacionesState((prev) =>
                                   prev.map((n) => (n.id === notif.id ? { ...n, leida: true } : n))
                                 )
                               } catch (error) {
                                 console.error('Error marcando notificación:', error)
                               }
                             }}
                             className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                             title="Marcar como leída"
                           >
                             <CheckCircle2 className="h-4 w-4" />
                           </button>
                         )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-16 text-center">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100 shadow-inner">
                    <Bell className="h-8 w-8 text-slate-300" />
                  </div>
                  <h3 className="text-slate-900 font-bold mb-1 text-lg">Sin notificaciones</h3>
                  <p className="text-slate-500 text-sm">No tienes notificaciones en esta categoría.</p>
                </div>
              )}
            </div>
            
            {/* Footer Paginación */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/30 flex justify-between items-center text-xs text-slate-500 font-medium">
              <span>Mostrando {paginatedNotificaciones.length} de {notificaciones.length} notificaciones</span>
              <div className="flex items-center gap-3">
                <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Página {currentPage} de {totalPages || 1}</span>
                <div className="flex gap-2">
                  <button 
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className="px-4 py-2 rounded-lg border border-slate-200 bg-white disabled:opacity-50 disabled:cursor-not-allowed font-bold flex items-center gap-1 hover:bg-slate-50 transition-colors shadow-sm"
                  >
                    <ChevronLeft className="h-3 w-3" /> Anterior
                  </button>
                  <button 
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className="px-4 py-2 rounded-lg border border-slate-200 bg-white disabled:opacity-50 disabled:cursor-not-allowed font-bold flex items-center gap-1 hover:bg-slate-50 transition-colors shadow-sm"
                  >
                    Siguiente <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Detalle Robusto */}
      <NotificacionDetalleModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        notificacion={selectedNotif}
        onApprove={handleApproveFromModal}
        onReject={handleRejectFromModal}
        canApprove={false}
      />

      <ConfirmRejectModal
        isOpen={showRejectModalList && !!selectedNotif}
        onClose={() => setShowRejectModalList(false)}
        onConfirm={(motivo) => handleRejectConfirmList(motivo)}
      />
      <ConfirmApproveModal
        isOpen={showApproveModalList && !!selectedNotif}
        onClose={() => setShowApproveModalList(false)}
        onConfirm={() => handleApproveConfirmList()}
      />

      {/* Modal de Confirmación - Marcar Todas como Leídas */}
      <ConfirmModal
        isOpen={showMarkAllReadConfirm}
        onClose={() => setShowMarkAllReadConfirm(false)}
        onConfirm={async () => {
          try {
            await notificacionesService.marcarTodasComoLeidas()
            setNotificacionesState((prev) => prev.map((n) => ({ ...n, leida: true })))
            setShowMarkAllReadConfirm(false)
          } catch (error) {
            console.error('Error marcando notificaciones:', error)
          }
        }}
        title="Marcar todas como leídas"
        message="¿Estás seguro de que deseas marcar todas las notificaciones como leídas? Esta acción no se puede deshacer."
        confirmText="Sí, marcar todas"
        cancelText="Cancelar"
        variant="info"
      />

      {/* Modal de Edición/Detalle de Préstamo */}
      {prestamoModalOpen && selectedPrestamoId && (
        <EditarPrestamoModal
          id={selectedPrestamoId}
          onClose={() => {
            setPrestamoModalOpen(false)
            setSelectedPrestamoId(null)
          }}
          onSuccess={() => {
            setPrestamoModalOpen(false)
            setSelectedPrestamoId(null)
          }}
        />
      )}

      {/* Modal de Feedback (Éxito/Error) */}
      {feedbackModal && (
        <ConfirmModal
          isOpen={!!feedbackModal}
          onClose={() => setFeedbackModal(null)}
          onConfirm={() => setFeedbackModal(null)}
          title={feedbackModal.titulo}
          message={feedbackModal.mensaje}
          confirmText="Entendido"
          cancelText={null}
          variant={feedbackModal.tipo === 'success' ? 'success' : 'danger'}
        />
      )}
    </div>
  )
}
