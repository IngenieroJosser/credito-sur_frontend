'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Bell, 
  Banknote, 
  Users, 
  AlertCircle, 
  CheckCircle2, 
  Clock,
  ChevronLeft,
  ChevronRight,
  Search,
  ArrowRight
} from 'lucide-react'
import { notificacionesService, type Notificacion } from '@/services/notificaciones-service'
import { useNotificaciones } from '@/components/providers/NotificacionesProvider';

export default function NotificacionesCobranzasPage() {
  const router = useRouter()
  
  // --- ESTADOS DE FILTROS ---
  const [filter, setFilter] = useState<'TODAS' | 'NO_LEIDAS' | 'LEIDAS'>('TODAS')
  const [tipoFilter, setTipoFilter] = useState<'TODOS' | Notificacion['tipo']>('TODOS')
  const [search, setSearch] = useState('')
  
  // --- ESTADO DE DATOS ---
  const [isLoading, setIsLoading] = useState(false)
  
  const { 
    notificaciones: globalNotifs, 
    marcarTodasComoLeidas, 
    marcarComoLeida 
  } = useNotificaciones();

  // --- LÓGICA DE FILTRADO EN CLIENTE ---
  const notificaciones = globalNotifs
    .filter((n) => (filter === 'TODAS' ? true : !n.leida))
    .filter((n) => (tipoFilter === 'TODOS' ? true : n.tipo === tipoFilter))
    .filter((n) => {
      const q = search.trim().toLowerCase()
      if (!q) return true
      return (
        n.titulo.toLowerCase().includes(q) ||
        n.mensaje.toLowerCase().includes(q)
      )
    })

  // Helper para iconos según el tipo de notificación
  const getIcon = (tipo: string) => {
    switch (tipo) {
      case 'PAGO': return <Banknote className="h-5 w-5" />
      case 'CLIENTE': return <Users className="h-5 w-5" />
      case 'MORA': return <AlertCircle className="h-5 w-5" />
      default: return <Bell className="h-5 w-5" />
    }
  }

  // Helper para colores de fondo/borde
  const getColor = (tipo: string) => {
    switch (tipo) {
      case 'PAGO': return 'bg-blue-50 text-blue-700 border-blue-100'
      case 'CLIENTE': return 'bg-orange-50 text-orange-700 border-orange-100'
      case 'MORA': return 'bg-orange-50 text-orange-700 border-orange-100'
      default: return 'bg-white text-slate-700 border-slate-200'
    }
  }

  // --- PAGINACIÓN ---
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const totalPages = Math.ceil(notificaciones.length / itemsPerPage);
  const paginatedNotificaciones = notificaciones.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Resetear página cuando cambian los filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, tipoFilter, search]);

  return (
    <div className="min-h-screen relative bg-white">
      {/* Fondo Arquitectónico (Consistent with Admin Style) */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
        <div className="absolute left-0 top-0 -z-10 h-[360px] w-[360px] rounded-full bg-[#08557f] opacity-10 blur-[110px]" />
      </div>

      <div className="relative z-10 pb-20">
        {/* Header */}
        <div className="pb-8 pt-10 px-8 w-full">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <button
                type="button"
                onClick={() => router.back()}
                className="mb-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-900 group"
              >
                <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
                Volver al Inicio
              </button>
              
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-white shadow-sm rounded-lg border border-slate-100">
                  <Bell className="h-6 w-6 text-[#08557f]" />
                </div>
                <span className="text-[10px] font-black text-[#08557f] tracking-widest uppercase bg-blue-50 border border-blue-100 px-3 py-1 rounded-full">
                  Centro de Notificaciones
                </span>
              </div>
              
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                Mis Mensajes
              </h1>
              <p className="text-slate-500 mt-2 font-medium">
                Gestiona tus alertas de ruta y avisos operativos
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => marcarTodasComoLeidas()}
                className="px-5 py-3 bg-white border border-slate-200 rounded-xl text-slate-700 text-sm font-black hover:bg-slate-50 hover:text-[#08557f] transition-all shadow-sm flex items-center gap-2"
              >
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Marcar todas leídas
              </button>
            </div>
          </div>
        </div>

        {/* Content Wrapper */}
        <div className="px-8 w-full">
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
            
            {/* Filters Section */}
            <div className="border-b border-slate-100 p-6 flex flex-col gap-6">
              
              {/* Primary Tabs */}
              <div className="flex bg-slate-100/50 p-1.5 rounded-2xl max-w-xs">
                <button
                  onClick={() => setFilter('TODAS')}
                  className={`flex-1 px-4 py-2.5 rounded-xl text-xs font-black transition-all ${
                    filter === 'TODAS' 
                      ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-100' 
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  TODAS
                </button>
                <button
                  onClick={() => setFilter('NO_LEIDAS')}
                  className={`flex-1 px-4 py-2.5 rounded-xl text-xs font-black transition-all ${
                    filter === 'NO_LEIDAS' 
                      ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-100' 
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  SIN LEER
                </button>
              </div>

              <div className="flex flex-col gap-6">
                {/* Tipo de Notificación */}
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 pl-1">Filtrar por Categoría</p>
                  <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                    {(['TODOS', 'PAGO', 'CLIENTE', 'MORA', 'SISTEMA'] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setTipoFilter(t)}
                        className={`px-5 py-2.5 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all border whitespace-nowrap ${
                          tipoFilter === t
                            ? 'bg-[#08557f] text-white border-[#08557f] shadow-md shadow-[#08557f]/20'
                            : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                        }`}
                      >
                        {t === 'TODOS' ? 'TODAS' : t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Búsqueda */}
                <div className="w-full buscador-3d">
                  <Search className="icon h-4 w-4" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar mensaje..."
                    className="buscador-3d-input"
                  />
                </div>
              </div>
            </div>

            {/* List Section */}
            <div className="divide-y divide-slate-100">
              {paginatedNotificaciones.length > 0 ? (
                paginatedNotificaciones.map((notif) => (
                  <div 
                    key={notif.id} 
                    className={`p-6 hover:bg-slate-50/50 transition-all group relative ${!notif.leida ? 'bg-blue-50/20' : ''}`}
                  >
                    <div className="flex items-start gap-5">
                      {/* Icon Container */}
                      <div className={`p-4 rounded-2xl border ${getColor(notif.tipo)} shadow-sm group-hover:scale-105 transition-transform duration-300`}>
                        {getIcon(notif.tipo)}
                      </div>
                      
                      {/* Message Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className={`text-base font-black tracking-tight ${!notif.leida ? 'text-slate-900' : 'text-slate-700'}`}>
                            {notif.titulo}
                            {!notif.leida && (
                              <span className="ml-3 inline-flex w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse"></span>
                            )}
                          </h3>
                          <span className="text-[10px] font-black text-slate-400 flex items-center gap-1.5 bg-slate-100/50 px-2.5 py-1.5 rounded-xl border border-slate-100 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]">
                            <Clock className="h-3.5 w-3.5" />
                            {notif.fecha}
                          </span>
                        </div>
                        <p className="text-slate-600 text-sm leading-relaxed font-medium">
                          {notif.mensaje}
                        </p>

                        {/* Action Bar (Only shows when needed or hovered) */}
                        <div className="mt-4 flex items-center gap-3">
                           {notif.link && (
                             <button
                               onClick={() => router.push(notif.link!)}
                               className="text-[10px] font-black text-[#08557f] uppercase tracking-widest flex items-center gap-1.5 hover:underline"
                             >
                               Detalles <ArrowRight className="w-3.5 h-3.5" />
                             </button>
                           )}
                        </div>
                      </div>

                      {/* Desktop Quick Actions (Group Hover) */}
                      <div className="hidden md:flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!notif.leida && (
                          <button
                            onClick={() => marcarComoLeida(notif.id)}
                            className="p-3 bg-white text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-2xl border border-slate-100 shadow-sm transition-all"
                            title="Marcar como leída"
                          >
                            <CheckCircle2 className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-24 text-center">
                  <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-100 shadow-inner">
                    <Bell className="h-10 w-10 text-slate-200" />
                  </div>
                  <h3 className="text-slate-900 font-black mb-2 text-xl tracking-tight">Sin notificaciones</h3>
                  <p className="text-slate-500 font-medium text-sm">No tienes mensajes pendientes en esta categoría.</p>
                </div>
              )}
            </div>
            
            {/* Table Footer / Pagination */}
            <div className="px-6 py-5 border-t border-slate-100 bg-slate-50/30 flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <span>Mostrando {paginatedNotificaciones.length} de {notificaciones.length} Notificaciones</span>
              <div className="flex items-center gap-3">
                <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mr-2">Página {currentPage} de {totalPages || 1}</span>
                <div className="flex gap-2">
                  <button 
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className={`px-5 py-2.5 rounded-xl border border-slate-200 bg-white flex items-center gap-2 shadow-sm ${currentPage === 1 ? 'opacity-40 cursor-not-allowed text-slate-400' : 'hover:bg-slate-50 text-slate-700 transition-all'}`}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" /> Anterior
                  </button>
                  <button 
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className={`px-5 py-2.5 rounded-xl border border-slate-200 bg-white flex items-center gap-2 shadow-sm ${currentPage >= totalPages ? 'opacity-40 cursor-not-allowed text-slate-400' : 'hover:bg-slate-50 text-slate-700 transition-all'}`}
                  >
                    Siguiente <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
