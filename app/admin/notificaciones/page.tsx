'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Bell, 
  Search, 
  Filter, 
  Banknote, 
  Users, 
  AlertCircle, 
  CheckCircle2, 
  Clock,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Trash2,
  Eye,
  ArrowRight
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

// Mock Data
interface Notificacion {
  id: string
  titulo: string
  mensaje: string
  tipo: 'PAGO' | 'CLIENTE' | 'MORA' | 'SISTEMA'
  fecha: string
  leida: boolean
  link?: string
}

const MOCK_NOTIFICACIONES: Notificacion[] = [
  {
    id: 'NOT-001',
    titulo: 'Pago Recibido',
    mensaje: 'Cliente #1456 ha realizado un pago de $50.000',
    tipo: 'PAGO',
    fecha: 'Hace 5 min',
    leida: false,
    link: '/admin/cobranzas'
  },
  {
    id: 'NOT-002',
    titulo: 'Nuevo Cliente',
    mensaje: 'Solicitud de registro pendiente para María González',
    tipo: 'CLIENTE',
    fecha: 'Hace 2 horas',
    leida: false,
    link: '/admin/clientes'
  },
  {
    id: 'NOT-003',
    titulo: 'Alerta de Mora',
    mensaje: '3 cuentas han entrado en mora hoy (Ruta Norte)',
    tipo: 'MORA',
    fecha: 'Hace 4 horas',
    leida: false,
    link: '/admin/reportes/operativos'
  },
  {
    id: 'NOT-004',
    titulo: 'Cierre Diario',
    mensaje: 'El cierre diario se ha completado exitosamente',
    tipo: 'SISTEMA',
    fecha: 'Ayer, 18:30',
    leida: true,
    link: '/admin/contable'
  },
  {
    id: 'NOT-005',
    titulo: 'Solicitud Aprobada',
    mensaje: 'El préstamo P-1024 ha sido aprobado por Coordinación',
    tipo: 'SISTEMA',
    fecha: 'Ayer, 15:45',
    leida: true,
    link: '/admin/prestamos'
  }
]

export default function NotificacionesPage() {
  const router = useRouter()
  const [filter, setFilter] = useState<'TODAS' | 'NO_LEIDAS'>('TODAS')
  
  const notificaciones = filter === 'TODAS' 
    ? MOCK_NOTIFICACIONES 
    : MOCK_NOTIFICACIONES.filter(n => !n.leida)

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
      case 'PAGO': return 'bg-emerald-50 text-emerald-600 border-emerald-100'
      case 'CLIENTE': return 'bg-blue-50 text-blue-600 border-blue-100'
      case 'MORA': return 'bg-orange-50 text-orange-600 border-orange-100'
      default: return 'bg-slate-50 text-slate-600 border-slate-100'
    }
  }

  return (
    <div className="min-h-screen relative bg-slate-50/50">
      {/* Fondo Arquitectónico */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
        <div className="absolute left-0 top-0 -z-10 h-[310px] w-[310px] rounded-full bg-blue-400 opacity-20 blur-[100px]" />
      </div>

      <div className="relative z-10 pb-20">
        {/* Header */}
        <div className="pb-8 pt-10 px-8 w-full">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
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
               <button className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-slate-50 hover:text-blue-600 transition-colors shadow-sm flex items-center gap-2">
                 <CheckCircle2 className="h-4 w-4" />
                 Marcar todas como leídas
               </button>
            </div>
          </div>
        </div>

        <div className="w-full px-8">
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Tabs y Filtros */}
            <div className="border-b border-slate-100 p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
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
              </div>
              
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input 
                  type="text"
                  placeholder="Buscar notificación..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-white/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm text-slate-900 placeholder:text-slate-400 transition-all"
                />
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
                        {notif.link && (
                          <button 
                            onClick={() => router.push(notif.link!)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors" 
                            title="Ir a detalle"
                          >
                            <ArrowRight className="h-4 w-4" />
                          </button>
                        )}
                        <button className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-xl transition-colors" title="Marcar como leída">
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                        <button className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors" title="Eliminar">
                          <Trash2 className="h-4 w-4" />
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
    </div>
  )
}