'use client'

import React, { useState } from 'react'

// import Link from 'next/link'
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
  Eye,
  ClipboardList
} from 'lucide-react'
import FiltroRuta from '@/components/filtros/FiltroRuta'
import SolicitudDetalleModal, { SolicitudData } from '@/components/dashboards/shared/SolicitudDetalleModal'

// Mock Data
interface Notificacion {
  id: string
  titulo: string
  mensaje: string
  tipo: 'PAGO' | 'CLIENTE' | 'MORA' | 'SISTEMA' | 'SOLICITUD'
  fecha: string
  leida: boolean
  link?: string
  rutaId?: string
  solicitudDetails?: SolicitudData
}

const MOCK_NOTIFICACIONES: Notificacion[] = [
  {
    id: 'NOT-001',
    titulo: 'Pago Recibido',
    mensaje: 'Cliente #1456 ha realizado un pago de $50.000',
    tipo: 'PAGO',
    fecha: 'Hace 5 min',
    leida: false,
    link: '/supervisor',
    rutaId: 'RT-001'
  },
  {
    id: 'NOT-002',
    titulo: 'Nuevo Cliente',
    mensaje: 'Solicitud de registro pendiente para María González',
    tipo: 'CLIENTE',
    fecha: 'Hace 2 horas',
    leida: false,
    link: '/supervisor/clientes',
    rutaId: 'RT-002'
  },
  {
    id: 'NOT-003',
    titulo: 'Alerta de Mora',
    mensaje: '3 cuentas han entrado en mora hoy (Ruta Norte)',
    tipo: 'MORA',
    fecha: 'Hace 4 horas',
    leida: false,
    link: '/supervisor/clientes',
    rutaId: 'RT-002'
  },
  {
    id: 'NOT-004',
    titulo: 'Cierre Diario',
    mensaje: 'El cierre diario se ha completado exitosamente',
    tipo: 'SISTEMA',
    fecha: 'Ayer, 18:30',
    leida: true,
    link: '/supervisor'
  },
  {
    id: 'NOT-005',
    titulo: 'Solicitud Aprobada',
    mensaje: 'El préstamo P-1024 ha sido aprobado por Coordinación',
    tipo: 'SISTEMA',
    fecha: 'Ayer, 15:45',
    leida: true,
    link: '/supervisor'
  },
  {
    id: 'NOT-006',
    titulo: 'Solicitud de Gasto',
    mensaje: 'Juan Pérez solicita aprobación para gasto de gasolina ($25.000)',
    tipo: 'SOLICITUD',
    fecha: 'Hace 10 min',
    leida: false,
    link: undefined,
    solicitudDetails: {
      id: 'SOL-001',
      tipo: 'GASTO',
      titulo: 'Gasto de Gasolina - Ruta Norte',
      solicitante: 'Juan Pérez',
      fecha: '30 Ene 2024, 10:30 AM',
      monto: 25000,
      descripcion: 'Tanqueo de motocicleta para recorrido de la ruta norte. Se adjunta recibo en físico al llegar.',
      estado: 'PENDIENTE'
    }
  },
  {
    id: 'NOT-007',
    titulo: 'Solicitud de Base',
    mensaje: 'María González solicita base operativa ($200.000)',
    tipo: 'SOLICITUD',
    fecha: 'Hace 30 min',
    leida: false,
    link: undefined,
    solicitudDetails: {
      id: 'SOL-002',
      tipo: 'BASE',
      titulo: 'Base Operativa - Ruta Centro',
      solicitante: 'María González',
      fecha: '30 Ene 2024, 08:00 AM',
      monto: 200000,
      descripcion: 'Solicito base para inicio de operación y cambio sencillo para clientes.',
      estado: 'PENDIENTE'
    }
  }
]

export default function NotificacionesSupervisorPage() {
  const router = useRouter()
  const [filter, setFilter] = useState<'TODAS' | 'NO_LEIDAS' | 'LEIDAS'>('TODAS')
  const [tipoFilter, setTipoFilter] = useState<'TODOS' | Notificacion['tipo']>('TODOS')
  const [filterRuta, setFilterRuta] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [notificacionesState, setNotificacionesState] = useState<Notificacion[]>(MOCK_NOTIFICACIONES)
  const [selectedSolicitud, setSelectedSolicitud] = useState<SolicitudData | null>(null)

  // Reset state on mount can be handled by standard initialization or simpler logic.
  // Removing useEffect to fix lint error causing build block.

  const notificaciones = notificacionesState
    .filter((n) => {
      if (filter === 'TODAS') return true;
      if (filter === 'NO_LEIDAS') return !n.leida;
      if (filter === 'LEIDAS') return n.leida;
      return true;
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

  const getIcon = (tipo: string) => {
    switch (tipo) {
      case 'PAGO': return <Banknote className="h-5 w-5" />
      case 'CLIENTE': return <Users className="h-5 w-5" />
      case 'MORA': return <AlertCircle className="h-5 w-5" />
      case 'SOLICITUD': return <ClipboardList className="h-5 w-5" />
      default: return <Bell className="h-5 w-5" />
    }
  }

  const getColor = (tipo: string) => {
    switch (tipo) {
      case 'PAGO': return 'bg-blue-50 text-blue-700 border-blue-100'
      case 'CLIENTE': return 'bg-orange-50 text-orange-700 border-orange-100'
      case 'MORA': return 'bg-orange-50 text-orange-700 border-orange-100'
      case 'SOLICITUD': return 'bg-purple-50 text-purple-700 border-purple-100'
      default: return 'bg-white text-slate-700 border-slate-200'
    }
  }

  /* 
   * Adapter to convert any notification into a viewable object for the modal.
   * If it's a real Solicitud, it uses the details. Otherwise, creates a view-only representation.
   */
  const handleActionClick = (notif: Notificacion) => {
     let dataToView: SolicitudData;

     if (notif.solicitudDetails) {
       dataToView = notif.solicitudDetails;
     } else {
       // Construct generic view data for other notifications (PAGO, CLIENTE, etc)
       dataToView = {
         id: notif.id,
         tipo: notif.tipo, // e.g. 'PAGO'
         titulo: notif.titulo,
         solicitante: 'Sistema / Automático', // Default fallback
         fecha: notif.fecha,
         descripcion: notif.mensaje,
         estado: 'PENDIENTE' // Just for interface compliance, not used in readOnly
       };
     }
     
     setSelectedSolicitud(dataToView);
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
              {/* Force Rebuild Trigger: 2026-01-30 T21:18 */}
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                Notificaciones - Supervisor
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
                        { key: 'SOLICITUD' as const, label: 'Solicitudes' },
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
                          <h3 className={`text-base font-bold ${!notif.leida ? 'text-slate-900' : 'text-slate-700'}`}>
                            {notif.titulo}
                            {!notif.leida && (
                              <span className="ml-2 inline-flex w-2 h-2 rounded-full bg-orange-500"></span>
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

                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={() => handleActionClick(notif)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                            title="Ver Detalle"
                            type="button"
                        >
                            <Eye className="h-4 w-4" />
                        </button>
                        
                        <button
                          onClick={() =>
                            setNotificacionesState((prev) =>
                              prev.map((n) => (n.id === notif.id ? { ...n, leida: true } : n))
                            )
                          }
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                          title="Marcar como leída"
                          type="button"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
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
      
      {/* Modal - Modo solo lectura */}
      <SolicitudDetalleModal 
        isOpen={!!selectedSolicitud}
        onClose={() => setSelectedSolicitud(null)}
        solicitud={selectedSolicitud}
        onResolve={() => {}} // No-op, because readOnly hides actions
        readOnly={true}
      />
    </div>
  )
}
