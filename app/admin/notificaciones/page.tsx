'use client'

import React, { useState } from 'react'

import { useRouter } from 'next/navigation'
import { 
  Bell, 
  Search, 
  Banknote, 
  Users, 
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

// Mock Data
interface Notificacion {
  id: string
  titulo: string
  mensaje: string
  tipo: 'PAGO' | 'CLIENTE' | 'MORA' | 'SISTEMA'
  fecha: string
  leida: boolean
  link?: string
  rutaId?: string
  estado?: 'PENDIENTE' | 'APROBADA' | 'RECHAZADA'
  detalles?: {
    monto?: number
    cuotas?: number
    porcentaje?: number
    cliente?: string
    cedula?: string
    telefono?: string
    direccion?: string
    ocupacion?: string
    articulo?: string
    valorArticulo?: number
    cuotaInicial?: number
    beneficiario?: string
    categoria?: string
    frecuenciaPago?: 'DIARIO' | 'SEMANAL' | 'QUINCENAL' | 'MENSUAL'
  }
  motivoRechazo?: string
}

const MOCK_NOTIFICACIONES: Notificacion[] = [
  {
    id: 'NOT-LP-001',
    titulo: 'Solicitud de Préstamo - Juan Cobrador',
    mensaje: 'Solicitud de préstamo en efectivo: $500,000 para cliente nuevo.',
    tipo: 'SISTEMA',
    fecha: 'Hace 2 min',
    leida: false,
    rutaId: 'RT-002',
    estado: 'PENDIENTE',
    detalles: {
      monto: 500000,
      cuotas: 20,
      porcentaje: 20,
      cliente: 'Roberto Gómez',
      cedula: '1.098.765.432',
      telefono: '312 456 7890',
      direccion: 'Calle 45 #12-34, Barrio El Centro',
      ocupacion: 'Comerciante Independiente',
      frecuenciaPago: 'DIARIO'
    }
  },
  {
    id: 'NOT-CR-002',
    titulo: 'Crédito de Artículo - Juan Cobrador',
    mensaje: 'Solicitud de crédito para Lavadora Samsung 19kg.',
    tipo: 'SISTEMA',
    fecha: 'Hace 15 min',
    leida: false,
    rutaId: 'RT-002',
    estado: 'PENDIENTE',
    detalles: {
      articulo: 'Lavadora Samsung 19kg',
      valorArticulo: 1800000,
      cuotaInicial: 200000,
      cuotas: 12,
      porcentaje: 15,
      cliente: 'Lucía Fernández',
      cedula: '52.345.678',
      telefono: '300 987 6543',
      direccion: 'Carrera 10 #5-20, Edificio Los Pinos',
      ocupacion: 'Docente'
    }
  },
  {
    id: 'NOT-001',
    titulo: 'Pago Recibido',
    mensaje: 'Cliente #1456 ha realizado un pago de $50.000',
    tipo: 'PAGO',
    fecha: 'Hace 5 min',
    leida: false,
    rutaId: 'RT-001',
    estado: 'PENDIENTE'
  },
  {
    id: 'NOT-002',
    titulo: 'Solicitud de Préstamo',
    mensaje: 'El cobrador Juan Pérez ha solicitado un préstamo para un nuevo cliente',
    tipo: 'SISTEMA',
    fecha: 'Hace 2 horas',
    leida: false,
    rutaId: 'RT-002',
    estado: 'PENDIENTE',
    detalles: {
      monto: 500000,
      cuotas: 24,
      porcentaje: 20,
      cliente: 'Carlos Rodríguez'
    }
  },
  {
    id: 'NOT-003',
    titulo: 'Registro de Gasto',
    mensaje: 'Gasto reportado por mantenimiento de motocicleta',
    tipo: 'SISTEMA',
    fecha: 'Hace 4 horas',
    leida: false,
    rutaId: 'RT-002',
    estado: 'PENDIENTE',
    detalles: {
      monto: 45000,
      categoria: 'Mantenimiento Vehículo',
      beneficiario: 'Taller El Rayo'
    }
  },
  {
    id: 'NOT-004',
    titulo: 'Cierre Diario',
    mensaje: 'El cierre diario se ha completado exitosamente',
    tipo: 'SISTEMA',
    fecha: 'Ayer, 18:30',
    leida: true,
    estado: 'APROBADA'
  }
]

export default function NotificacionesPage() {
  const router = useRouter()
  const [filter, setFilter] = useState<'TODAS' | 'NO_LEIDAS' | 'LEIDAS' | 'APROBADAS' | 'RECHAZADAS'>('TODAS')
  const [tipoFilter, setTipoFilter] = useState<'TODOS' | Notificacion['tipo']>('TODOS')
  const [filterRuta, setFilterRuta] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [notificacionesState, setNotificacionesState] = useState<Notificacion[]>(() => {
    if (typeof window === 'undefined') return MOCK_NOTIFICACIONES
    try {
      const userStr = localStorage.getItem('user')
      if (!userStr) return MOCK_NOTIFICACIONES
      const user = JSON.parse(userStr) as { rol?: string }
      const basePath = user.rol === 'COBRADOR' ? '/cobranzas' : user.rol === 'CONTADOR' ? '/contador' : user.rol === 'COORDINADOR' ? '/coordinador' : '/admin'
      return MOCK_NOTIFICACIONES.map((n) => {
        let link = undefined
        if (n.tipo === 'PAGO') link = basePath
        if (n.tipo === 'CLIENTE') link = user.rol === 'COBRADOR' ? `${basePath}/clientes/nuevo` : undefined
        if (n.tipo === 'MORA') link = basePath
        if (n.tipo === 'SISTEMA') link = user.rol === 'COBRADOR' ? `${basePath}/solicitudes` : undefined
        return { ...n, link }
      })
    } catch {
      return MOCK_NOTIFICACIONES
    }
  })

  const [selectedNotif, setSelectedNotif] = useState<Notificacion | null>(null)
  const [editedDetails, setEditedDetails] = useState<Notificacion['detalles']>({})
  const [rejectionReason, setRejectionReason] = useState('')
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isEditingMode, setIsEditingMode] = useState(false)
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)
  const [confirmAction, setConfirmAction] = useState<'APPROVE' | 'REJECT' | null>(null)

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

  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined) return '---'
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  // Helper for formatted numeric inputs
  const formatCOPInput = (val: number | undefined) => {
    if (val === undefined || val === 0) return ''
    return val.toLocaleString('es-CO')
  }

  const parseCOPInput = (val: string) => {
    return Number(val.replace(/\D/g, ''))
  }


  const getIcon = (tipo: string) => {
    switch (tipo) {
      case 'PAGO': return <Banknote className="h-5 w-5" />
      case 'CLIENTE': return <Users className="h-5 w-5" />
      case 'MORA': return <AlertCircle className="h-5 w-5" />
      default: return <Bell className="h-5 w-5" />
    }
  }

  const getColor = (tipo: string) => {
    switch (tipo) {
      case 'PAGO': return 'bg-blue-50 text-blue-700 border-blue-100'
      case 'CLIENTE': return 'bg-purple-50 text-purple-700 border-purple-100'
      case 'MORA': return 'bg-rose-50 text-rose-700 border-rose-100'
      case 'APROBACION': return 'bg-emerald-50 text-emerald-700 border-emerald-100'
      default: return 'bg-white text-slate-700 border-slate-200'
    }
  }

  const handleOpenConfirm = (notif: Notificacion, action: 'APPROVE' | 'REJECT') => {
    setSelectedNotif(notif)
    setEditedDetails(notif.detalles || {})
    setRejectionReason('')
    setConfirmAction(action)
    setIsConfirmModalOpen(true)
  }

  const handleConfirmAction = () => {
    if (!selectedNotif || !confirmAction) return

    if (confirmAction === 'APPROVE') {
      setNotificacionesState(prev => prev.map(n => n.id === selectedNotif.id ? { 
        ...n, 
        estado: 'APROBADA', 
        leida: true,
        detalles: { ...n.detalles, ...editedDetails } 
      } : n))
      // API call logic with editedDetails...
    } else if (confirmAction === 'REJECT') {
      setNotificacionesState(prev => prev.map(n => n.id === selectedNotif.id ? { 
        ...n, 
        estado: 'RECHAZADA', 
        leida: true,
        motivoRechazo: rejectionReason 
      } : n))
      // API call logic with rejectionReason...
    }

    setIsConfirmModalOpen(false)
    setSelectedNotif(null)
    setConfirmAction(null)
  }

  const handleOpenDetail = (notif: Notificacion) => {
    setSelectedNotif(notif)
    setEditedDetails(notif.detalles || {})
    setIsEditingMode(false)
    setIsDetailModalOpen(true)
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
                  <Bell className="h-6 w-6 text-orange-500" />
                </div>
                <span className="text-xs font-bold text-blue-600 tracking-wider uppercase bg-blue-50 border border-blue-100 px-3 py-1 rounded-full">
                  Centro de Mensajes
                </span>
              </div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                Notificaciones
              </h1>
              <p className="text-slate-500 mt-2 text-lg">
                Gestiona tus alertas y avisos del sistema
              </p>
            </div>
            
            <div className="flex gap-3">
               <button
                 onClick={() => setNotificacionesState((prev) => prev.map((n) => ({ ...n, leida: true })))}
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
              </div>

              <div className="flex flex-col gap-6">
                {/* Tipo de Notificación */}
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 pl-1">Filtrar por Categoría</p>
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    {(
                      [
                        { key: 'TODOS' as const, label: 'Todas' },
                        { key: 'PAGO' as const, label: 'Pagos' },
                        { key: 'CLIENTE' as const, label: 'Clientes' },
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

                {/* Filtro de Ruta */}
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                  <div className="flex-1 min-w-0">
                    <FiltroRuta 
                        onRutaChange={setFilterRuta} 
                        selectedRutaId={filterRuta}
                        showAllOption={true}
                    />
                  </div>

                  <div className="relative w-full lg:w-80">
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
              {notificaciones.length > 0 ? (
                notificaciones.map((notif) => (
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
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleOpenDetail(notif)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                          title="Ver detalles"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        
                        {notif.estado === 'PENDIENTE' && (
                          <>
                            <button
                              onClick={() => handleOpenConfirm(notif, 'REJECT')}
                              className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                              title="Rechazar"
                            >
                              <X className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleOpenConfirm(notif, 'APPROVE')}
                              className="p-2 text-emerald-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors"
                              title="Aprobar"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                          </>
                        )}

                        {!notif.leida && (
                          <button
                            onClick={() =>
                              setNotificacionesState((prev) =>
                                prev.map((n) => (n.id === notif.id ? { ...n, leida: true } : n))
                              )
                            }
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
              <span>Mostrando {notificaciones.length} notificaciones</span>
              <div className="flex gap-2">
                <button disabled className="px-4 py-2 rounded-lg border border-slate-200 bg-white opacity-50 cursor-not-allowed font-bold flex items-center gap-1">
                  <ChevronLeft className="h-3 w-3" /> Anterior
                </button>
                <button className="px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold transition-colors flex items-center gap-1 shadow-sm">
                  Siguiente <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Detalle */}
      {isDetailModalOpen && selectedNotif && (
        <div 
          onClick={() => setIsDetailModalOpen(false)}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100"
          >
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
              <h3 className="text-xs font-black text-slate-900 flex items-center gap-2 uppercase tracking-widest">
                <Info className="h-4 w-4 text-blue-600" />
                {selectedNotif.detalles?.categoria ? 'Gasto' : 'Solicitud'}
              </h3>
              <button 
                onClick={() => setIsDetailModalOpen(false)}
                className="p-1.5 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="p-5 space-y-4 max-h-[85vh] overflow-y-auto custom-scrollbar">
              <div className="flex items-center gap-3 p-3 bg-slate-50/50 rounded-2xl border border-slate-100">
                <div className={`p-2 rounded-xl border ${getColor(selectedNotif.tipo)} shadow-sm`}>
                  {getIcon(selectedNotif.tipo)}
                </div>
                <div className="min-w-0">
                  <div className="font-black text-slate-900 text-[13px] uppercase tracking-tight leading-tight truncate">{selectedNotif.titulo}</div>
                  <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1 mt-0.5">
                    <Clock className="h-3 w-3" />
                    {selectedNotif.fecha}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {(!selectedNotif.detalles || !selectedNotif.detalles.categoria) && (
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block pl-1">Mensaje en la Alerta</label>
                    <p className="text-slate-600 text-xs font-medium bg-white p-3 rounded-xl border border-slate-100 italic leading-relaxed">
                      &quot;{selectedNotif.mensaje}&quot;
                    </p>
                  </div>
                )}

                {selectedNotif.detalles && (
                  <div className="space-y-4">
                    {/* SI ES GASTO - MODAL COMPACTO */}
                    {selectedNotif.detalles.categoria ? (
                      <div className="bg-slate-50/50 rounded-2xl border border-slate-100 p-4 space-y-3">
                        <div className="text-center pb-2 border-b border-slate-100">
                           <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-0.5">Monto del Gasto</p>
                           <h4 className="text-2xl font-black text-slate-900 tabular-nums">{formatCurrency(editedDetails?.monto)}</h4>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-black text-slate-500 uppercase">Categoría</span>
                            <span className="text-[9px] font-black text-blue-700 bg-blue-100/50 px-2 py-0.5 rounded-full uppercase">{editedDetails?.categoria}</span>
                          </div>
                          <div className="pt-1">
                             <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Descripción</p>
                             <p className="text-[11px] text-slate-700 font-medium leading-normal italic border-l-2 border-blue-400 pl-2">
                               {selectedNotif.mensaje}
                             </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* SI ES CRÉDITO/ARTÍCULO - DISEÑO COMPACTO */
                      <div className="space-y-3">
                        <div className="flex items-center justify-between px-1">
                           <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none">Análisis de Cartera</p>
                           <button 
                             onClick={() => setIsEditingMode(!isEditingMode)}
                             className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest transition-all ${
                               isEditingMode 
                                 ? 'bg-orange-500 text-white shadow-sm' 
                                 : 'bg-blue-600 text-white shadow-sm hover:bg-blue-700'
                             }`}
                           >
                             {isEditingMode ? 'Bloquear' : 'Editar'}
                           </button>
                        </div>

                        <div className="space-y-3">
                          {/* Bloque Cliente */}
                          <div className={`p-4 rounded-2xl border transition-all duration-300 ${isEditingMode ? 'bg-white border-orange-200 shadow-lg' : 'bg-slate-50/50 border-slate-100'}`}>
                            <p className="text-[8px] font-black uppercase tracking-widest text-slate-500 mb-3 block border-b border-slate-200/50 pb-1">Información Cliente</p>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                               <div className="col-span-2">
                                 <label className="text-[8px] text-slate-500 uppercase font-bold block mb-0.5">Nombre</label>
                                 {isEditingMode ? (
                                   <input 
                                     value={editedDetails?.cliente || ''}
                                     onChange={(e) => setEditedDetails({...(editedDetails || {}), cliente: e.target.value})}
                                     className="w-full bg-white border border-slate-200 rounded-md px-2 py-1 text-xs font-bold text-slate-900 outline-none"
                                   />
                                 ) : (
                                   <p className="text-[13px] font-black text-slate-900 leading-none">{editedDetails?.cliente}</p>
                                 )}
                               </div>
                               <div>
                                 <label className="text-[8px] text-slate-500 uppercase font-bold block mb-0.5">Cédula</label>
                                 {isEditingMode ? (
                                   <input 
                                     value={editedDetails?.cedula || ''}
                                     onChange={(e) => setEditedDetails({...(editedDetails || {}), cedula: e.target.value})}
                                     className="w-full bg-white border border-slate-200 rounded-md px-2 py-1 text-[10px] font-bold text-slate-900 outline-none"
                                   />
                                 ) : (
                                   <p className="text-[11px] font-black text-slate-800">{editedDetails?.cedula}</p>
                                 )}
                               </div>
                               <div>
                                 <label className="text-[8px] text-slate-500 uppercase font-bold block mb-0.5">Teléfono</label>
                                 {isEditingMode ? (
                                   <input 
                                     value={editedDetails?.telefono || ''}
                                     onChange={(e) => setEditedDetails({...(editedDetails || {}), telefono: e.target.value})}
                                     className="w-full bg-white border border-slate-200 rounded-md px-2 py-1 text-[10px] font-bold text-slate-900 outline-none"
                                   />
                                 ) : (
                                   <p className="text-[11px] font-black text-slate-800">{editedDetails?.telefono}</p>
                                 )}
                               </div>
                            </div>
                          </div>

                          {/* Bloque Financiero */}
                          <div className={`p-4 rounded-2xl border transition-all duration-300 ${isEditingMode ? 'bg-white border-blue-200 shadow-lg' : 'bg-blue-50/70 border-blue-100'}`}>
                            <p className="text-[8px] font-black uppercase tracking-widest text-blue-700/70 mb-3 block border-b border-blue-200 pb-1">Condiciones Financieras</p>
                            <div className="space-y-3">
                               {editedDetails?.articulo && (
                                 <div>
                                   <label className="text-[8px] text-blue-700 uppercase font-bold block mb-0.5">Artículo</label>
                                   <p className="text-[11px] font-black text-blue-900 italic leading-none">{editedDetails?.articulo}</p>
                                 </div>
                               )}
                               <div className="flex items-center justify-between">
                                 <div>
                                   <label className="text-[8px] text-blue-700 uppercase font-bold block mb-0.5">{editedDetails?.articulo ? 'Valor Art.' : 'Capital'}</label>
                                   {isEditingMode ? (
                                     <input 
                                       type="text"
                                       value={formatCOPInput(editedDetails?.articulo ? editedDetails.valorArticulo : editedDetails?.monto)}
                                       onChange={(e) => {
                                         const val = parseCOPInput(e.target.value)
                                         setEditedDetails({
                                           ...(editedDetails || {}), 
                                           [editedDetails?.articulo ? 'valorArticulo' : 'monto']: val
                                         })
                                       }}
                                       className="w-full bg-white border border-blue-200 text-slate-900 rounded-md px-2 py-1 text-xs font-black outline-none"
                                     />
                                   ) : (
                                     <p className="text-2xl font-black text-slate-900 tabular-nums tracking-tighter leading-none">{formatCurrency(editedDetails?.articulo ? (editedDetails?.valorArticulo || 0) : (editedDetails?.monto || 0))}</p>
                                   )}
                                 </div>
                               </div>
                               
                               <div className="grid grid-cols-2 gap-4 pt-2 border-t border-blue-200/50">
                                 <div>
                                   <label className="text-[8px] text-blue-700 uppercase font-bold block mb-0.5">Cuotas</label>
                                   {isEditingMode ? (
                                      <input 
                                        type="number"
                                        value={editedDetails?.cuotas || ''}
                                        onChange={(e) => setEditedDetails({...(editedDetails || {}), cuotas: Number(e.target.value)})}
                                        className="w-full bg-white border border-blue-200 text-slate-900 rounded-md px-2 py-1 text-xs font-black outline-none"
                                      />
                                   ) : (
                                      <p className="text-base font-black text-slate-900 leading-none">{editedDetails?.cuotas} <span className="text-[9px] font-black text-slate-500">MESES</span></p>
                                   )}
                                 </div>
                                 <div>
                                   <label className="text-[8px] text-blue-700 uppercase font-bold block mb-0.5">Interés (%)</label>
                                   {isEditingMode ? (
                                      <input 
                                        type="number"
                                        value={editedDetails?.porcentaje || ''}
                                        onChange={(e) => setEditedDetails({...(editedDetails || {}), porcentaje: Number(e.target.value)})}
                                        className="w-full bg-white border border-blue-200 text-slate-900 rounded-md px-2 py-1 text-xs font-black outline-none"
                                      />
                                   ) : (
                                      <p className="text-base font-black text-slate-900 leading-none">{editedDetails?.porcentaje}%</p>
                                   )}
                                 </div>
                                 <div className="col-span-2">
                                   <label className="text-[8px] text-blue-700 uppercase font-bold block mb-0.5">Frecuencia de Pago</label>
                                   {isEditingMode ? (
                                      <select 
                                        value={editedDetails?.frecuenciaPago || 'DIARIO'}
                                        onChange={(e) => setEditedDetails({...(editedDetails || {}), frecuenciaPago: e.target.value as any})}
                                        className="w-full bg-white border border-blue-200 text-slate-900 rounded-md px-2 py-1 text-xs font-black outline-none"
                                      >
                                        <option value="DIARIO">DIARIO</option>
                                        <option value="SEMANAL">SEMANAL</option>
                                        <option value="QUINCENAL">QUINCENAL</option>
                                        <option value="MENSUAL">MENSUAL</option>
                                      </select>
                                   ) : (
                                      <p className="text-sm font-black text-blue-800 uppercase italic">{editedDetails?.frecuenciaPago || 'DIARIO'}</p>
                                   )}
                                 </div>
                               </div>

                               {/* Resumen Automático del Cálculo */}
                               <div className="mt-4 p-3 bg-emerald-50 rounded-xl border border-emerald-100 border-dashed">
                                  <p className="text-[8px] font-black text-emerald-600 uppercase mb-2 tracking-widest">Plan de Pago Proyectado</p>
                                  <div className="grid grid-cols-2 gap-4">
                                     <div>
                                        <label className="text-[7px] text-emerald-500 uppercase font-bold block">Cobro por Cuota</label>
                                        <p className="text-sm font-black text-emerald-900">
                                          {formatCurrency(
                                            ((editedDetails?.articulo ? (editedDetails?.valorArticulo || 0) : (editedDetails?.monto || 0)) * (1 + (editedDetails?.porcentaje || 0) / 100)) / (editedDetails?.cuotas || 1)
                                          )}
                                        </p>
                                     </div>
                                     <div>
                                        <label className="text-[7px] text-emerald-500 uppercase font-bold block">Total a Recaudar</label>
                                        <p className="text-sm font-black text-emerald-900">
                                          {formatCurrency(
                                            (editedDetails?.articulo ? (editedDetails?.valorArticulo || 0) : (editedDetails?.monto || 0)) * (1 + (editedDetails?.porcentaje || 0) / 100)
                                          )}
                                        </p>
                                     </div>
                                  </div>
                               </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {selectedNotif.motivoRechazo && (
                  <div className="bg-rose-50 rounded-xl p-3 border border-rose-100">
                    <label className="text-[8px] font-black text-rose-500 uppercase tracking-widest block mb-0.5 text-center">Rechazado por:</label>
                    <p className="text-[11px] text-rose-700 font-bold italic text-center leading-tight">&quot;{selectedNotif.motivoRechazo}&quot;</p>
                  </div>
                )}

                {selectedNotif.rutaId && (
                  <div className="flex items-center justify-center pt-2">
                    <div className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-1.5 rounded-full shadow-lg shadow-blue-500/30 font-black text-[10px] uppercase tracking-[0.2em]">
                      <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      RUTA: {selectedNotif.rutaId}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
              {selectedNotif.estado === 'PENDIENTE' && (
                <>
                  <button 
                    onClick={() => {
                      setIsDetailModalOpen(false)
                      handleOpenConfirm(selectedNotif, 'REJECT')
                    }}
                    className="flex-1 py-3 bg-white border border-rose-200 text-rose-600 font-black text-[11px] uppercase tracking-widest rounded-xl hover:bg-rose-50 transition-colors shadow-sm"
                  >
                    Rechazar
                  </button>
                  <button 
                    onClick={() => {
                      setIsDetailModalOpen(false)
                      handleOpenConfirm(selectedNotif, 'APPROVE')
                    }}
                    className="flex-1 py-3 bg-emerald-600 text-white font-black text-[11px] uppercase tracking-widest rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 transition-colors"
                  >
                    Aprobar
                  </button>
                </>
              )}
              {selectedNotif.estado !== 'PENDIENTE' && (
                <button 
                  onClick={() => setIsDetailModalOpen(false)}
                  className="w-full py-3 bg-slate-900 text-white font-black text-[11px] uppercase tracking-widest rounded-xl hover:bg-slate-800 transition-colors shadow-lg"
                >
                  Cerrar
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación */}
      {isConfirmModalOpen && selectedNotif && confirmAction && (
        <div 
          onClick={() => {
            setIsConfirmModalOpen(false)
            setConfirmAction(null)
          }}
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-[2.5rem] shadow-2xl p-8 max-w-sm w-full text-center space-y-6 animate-in zoom-in-95 duration-200"
          >
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto shadow-inner ${
              confirmAction === 'APPROVE' ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
            }`}>
              {confirmAction === 'APPROVE' ? (
                <CheckCircle2 className="h-10 w-10" />
              ) : (
                <AlertTriangle className="h-10 w-10" />
              )}
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2 text-center">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                  {confirmAction === 'APPROVE' ? 'Confirmar Aprobación' : 'Confirmar Rechazo'}
                </h3>
              </div>

              {confirmAction === 'APPROVE' && editedDetails && editedDetails.monto !== undefined && (
                <div className="p-4 bg-slate-50 rounded-[1.5rem] border border-slate-100 space-y-4 text-left">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ajustar parámetros finales</p>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <label className="text-[10px] font-bold text-slate-500 mb-1 ml-1 block">Monto Solicitado</label>
                        <input 
                          type="text" 
                          value={formatCOPInput(editedDetails?.monto)}
                          onChange={(e) => setEditedDetails({...(editedDetails || {}), monto: parseCOPInput(e.target.value)})}
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-black text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 mb-1 ml-1 block">Cuotas</label>
                        <input 
                          type="number" 
                          value={editedDetails?.cuotas || ''}
                          onChange={(e) => setEditedDetails({...(editedDetails || {}), cuotas: Number(e.target.value)})}
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 mb-1 ml-1 block">Interés (%)</label>
                        <input 
                          type="number" 
                          value={editedDetails?.porcentaje || ''}
                          onChange={(e) => setEditedDetails({...(editedDetails || {}), porcentaje: Number(e.target.value)})}
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {confirmAction === 'REJECT' && (
                <div className="space-y-3 text-left">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Razón del rechazo</label>
                  <textarea 
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Escriba el motivo (ej: este gasto no es de la empresa)..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-medium text-slate-700 h-24 outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 resize-none"
                  />
                </div>
              )}
            </div>
            
            <div className="flex gap-3 pt-2">
              <button 
                onClick={() => {
                  setIsConfirmModalOpen(false)
                  setConfirmAction(null)
                }}
                className="flex-1 py-4 bg-slate-100 text-slate-600 font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-slate-200 transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={handleConfirmAction}
                className={`flex-1 py-4 font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg transition-all text-white ${
                  confirmAction === 'APPROVE' 
                    ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/30" 
                    : "bg-rose-600 hover:bg-rose-700 shadow-rose-500/30"
                }`}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
