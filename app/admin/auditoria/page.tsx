'use client'

import React, { useState } from 'react'
import { 
  Shield, 
  Search, 
  Clock, 
  User, 
  AlertCircle, 
  Calendar, 
  Download, 
  Eye, 
  ChevronLeft, 
  ChevronRight
} from 'lucide-react'
import { MOCK_LOGS, type LogAuditoria } from './data'
import { cn } from '@/lib/utils'

const AuditoriaSistemaPage = () => {
  const [busqueda, setBusqueda] = useState('')
  const [filtroNivel, setFiltroNivel] = useState<'TODOS' | 'INFO' | 'WARNING' | 'CRITICAL'>('TODOS')
  
  const [logs] = useState<LogAuditoria[]>(MOCK_LOGS);

  const logsFiltrados = logs.filter(log => {
    const coincideTexto = 
      log.usuario.toLowerCase().includes(busqueda.toLowerCase()) ||
      log.accion.toLowerCase().includes(busqueda.toLowerCase()) ||
      log.detalle.toLowerCase().includes(busqueda.toLowerCase())
    
    const coincideNivel = filtroNivel === 'TODOS' || log.nivel === filtroNivel

    return coincideTexto && coincideNivel
  })

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(date)
  }

  const getNivelBadge = (nivel: string) => {
    switch(nivel) {
      case 'CRITICAL': return 'bg-red-50 text-red-700 border-red-100'
      case 'WARNING': return 'bg-orange-50 text-orange-700 border-orange-100'
      default: return 'bg-blue-50 text-blue-700 border-blue-100'
    }
  }

  return (
    <div className="min-h-screen bg-white relative">
      {/* Fondo arquitectónico ultra sutil */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-white via-gray-50/50 to-white"></div>
        {/* Líneas de estructura */}
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(to right, #08557f 0.5px, transparent 0.5px)`,
          backgroundSize: '96px 1px',
          opacity: 0.03
        }}></div>
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(to bottom, #08557f 0.5px, transparent 0.5px)`,
          backgroundSize: '1px 96px',
          opacity: 0.03
        }}></div>
      </div>

      <div className="relative z-10 mx-auto max-w-7xl space-y-8 p-6 md:p-12">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 self-start px-3 py-1 rounded-full bg-[#08557f]/5 text-xs text-[#08557f] tracking-wide font-medium border border-[#08557f]/10">
              <Shield className="h-3.5 w-3.5" />
              <span>Auditoría del Sistema</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-light text-gray-900 tracking-tight">
              Trazabilidad de <span className="font-semibold text-[#08557f]">Eventos</span>
            </h1>
            <p className="text-lg text-gray-500 mt-2 max-w-2xl font-light leading-relaxed">
              Registro inmutable de todas las acciones críticas, cambios de configuración y movimientos financieros.
            </p>
          </div>
          <div className="flex gap-3">
            <button className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-medium text-gray-700 border border-gray-200 shadow-sm hover:bg-gray-50 hover:text-[#08557f] transition-all duration-300">
              <Download className="h-4 w-4" />
              <span>Exportar CSV</span>
            </button>
          </div>
        </header>

        {/* Tarjetas de Resumen */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 group">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-50 rounded-xl text-blue-600 group-hover:bg-[#08557f] group-hover:text-white transition-all duration-300">
                <Clock className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Eventos Hoy</p>
                <h3 className="text-3xl font-light text-gray-900 tracking-tight">24</h3>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 group">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-50 rounded-xl text-red-600 group-hover:bg-red-600 group-hover:text-white transition-all duration-300">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Alertas Críticas</p>
                <h3 className="text-3xl font-light text-gray-900 tracking-tight">2</h3>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 group">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-50 rounded-xl text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-all duration-300">
                <User className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Usuarios Activos</p>
                <h3 className="text-3xl font-light text-gray-900 tracking-tight">5</h3>
              </div>
            </div>
          </div>
        </div>

        {/* Filtros y Tabla */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-300">
          <div className="p-6 border-b border-gray-100 bg-gray-50/30 flex flex-col md:flex-row gap-4 justify-between items-center">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por usuario, acción o detalle..."
                className="w-full pl-11 pr-4 py-3 rounded-xl border-none bg-white shadow-sm ring-1 ring-gray-200 focus:ring-2 focus:ring-[#08557f]/10 transition-all text-sm font-medium text-gray-900 placeholder:text-gray-400"
              />
            </div>
            <div className="flex gap-1 w-full md:w-auto overflow-x-auto p-1 bg-gray-100/50 rounded-xl">
              {(['TODOS', 'INFO', 'WARNING', 'CRITICAL'] as const).map((nivel) => (
                <button
                  key={nivel}
                  onClick={() => setFiltroNivel(nivel)}
                  className={cn(
                    "px-4 py-2 rounded-lg text-xs font-bold tracking-wide transition-all duration-300",
                    filtroNivel === nivel 
                      ? 'bg-white text-[#08557f] shadow-sm' 
                      : 'text-gray-500 hover:text-[#08557f] hover:bg-gray-50'
                  )}
                >
                  {nivel}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50/50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 font-medium tracking-wider">Fecha / Hora</th>
                  <th className="px-6 py-4 font-medium tracking-wider">Usuario</th>
                  <th className="px-6 py-4 font-medium tracking-wider">Módulo / Acción</th>
                  <th className="px-6 py-4 font-medium tracking-wider">Detalle</th>
                  <th className="px-6 py-4 font-medium tracking-wider text-center">Nivel</th>
                  <th className="px-6 py-4 font-medium tracking-wider text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logsFiltrados.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/80 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                      <div className="flex items-center gap-2 font-mono text-xs">
                        <Calendar className="h-3.5 w-3.5 text-gray-400 group-hover:text-[#08557f] transition-colors" />
                        {formatDate(log.fecha)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600 group-hover:bg-[#08557f]/10 group-hover:text-[#08557f] transition-colors uppercase">
                          {log.usuario.charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{log.usuario}</div>
                          <div className="text-xs text-gray-500">{log.rol}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-800">{log.accion.replace(/_/g, ' ')}</span>
                        <span className="text-xs text-gray-400 font-medium">{log.modulo}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 max-w-xs truncate text-gray-600" title={log.detalle}>
                      {log.detalle}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={cn(
                        "inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase border",
                        getNivelBadge(log.nivel)
                      )}>
                        {log.nivel}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-gray-400 hover:text-[#08557f] p-2 hover:bg-[#08557f]/5 rounded-lg transition-all">
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {logsFiltrados.length === 0 && (
              <div className="py-16 text-center">
                <div className="inline-flex p-4 rounded-full bg-gray-50 mb-4">
                  <Search className="h-8 w-8 text-gray-300" />
                </div>
                <h3 className="text-lg font-medium text-gray-900">No se encontraron registros</h3>
                <p className="text-gray-500 mt-1">Intenta ajustar los términos de búsqueda o filtros.</p>
              </div>
            )}
          </div>
          
          <div className="p-4 border-t border-gray-100 bg-gray-50/30 flex justify-between items-center text-xs text-gray-500">
            <span className="font-medium">Mostrando {logsFiltrados.length} de {logs.length} eventos</span>
            <div className="flex gap-2">
              <button disabled className="px-4 py-2 rounded-lg border border-gray-200 bg-white opacity-50 cursor-not-allowed font-medium flex items-center gap-1">
                <ChevronLeft className="h-3 w-3" /> Anterior
              </button>
              <button className="px-4 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-medium transition-colors flex items-center gap-1">
                Siguiente <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default AuditoriaSistemaPage
