'use client'

import React, { useState } from 'react'
import { 
  Shield, 
  Search, 
  Clock, 
  User, 
  AlertCircle, 
  Calendar, 
  Eye, 
  ChevronLeft, 
  ChevronRight
} from 'lucide-react'
import { MOCK_LOGS, type LogAuditoria } from './data'
import { cn } from '@/lib/utils'
import { ExportButton } from '@/components/ui/ExportButton'

const AuditoriaSistemaPage = () => {
  const [busqueda, setBusqueda] = useState('')
  const [filtroNivel, setFiltroNivel] = useState<'TODOS' | 'INFO' | 'WARNING' | 'CRITICAL'>('TODOS')
  
  const [logs] = useState<LogAuditoria[]>(MOCK_LOGS);

  const handleExportExcel = () => {
    console.log('Exporting Excel...')
  }

  const handleExportPDF = () => {
    console.log('Exporting PDF...')
  }

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
      case 'CRITICAL': return 'bg-rose-50 text-rose-700 border-rose-100'
      case 'WARNING': return 'bg-amber-50 text-amber-700 border-amber-100'
      case 'INFO': return 'bg-blue-50 text-blue-700 border-blue-100'
      default: return 'bg-slate-50 text-slate-700 border-slate-100'
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 relative">
      {/* Fondo arquitectónico standard */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-slate-400 opacity-20 blur-[100px]"></div>
      </div>

      <div className="relative z-10 w-full px-6 md:px-8 py-8 space-y-8">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 self-start px-3 py-1 rounded-full bg-slate-100 text-xs text-slate-600 tracking-wide font-bold border border-slate-200">
              <Shield className="h-3.5 w-3.5" />
              <span>Auditoría del Sistema</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">
              <span className="text-blue-600">Trazabilidad de </span><span className="text-orange-500">Eventos</span>
            </h1>
            <p className="text-slate-500 mt-2 font-medium text-sm max-w-2xl">
              Registro inmutable de todas las acciones críticas, cambios de configuración y movimientos financieros.
            </p>
          </div>
          <div className="flex gap-3">
            <ExportButton 
              label="Exportar " 
              onExportExcel={handleExportExcel} 
              onExportPDF={handleExportPDF} 
            />
          </div>
        </header>

        {/* Tarjetas de Resumen */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 group">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-50 rounded-xl text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 border border-blue-100">
                <Clock className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Eventos Hoy</p>
                <h3 className="text-3xl font-bold text-slate-900 tracking-tight">24</h3>
              </div>
            </div>
          </div>
          <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 group">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-rose-50 rounded-xl text-rose-600 group-hover:bg-rose-600 group-hover:text-white transition-all duration-300 border border-rose-100">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Alertas Críticas</p>
                <h3 className="text-3xl font-bold text-slate-900 tracking-tight">2</h3>
              </div>
            </div>
          </div>
          <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 group">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-50 rounded-xl text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-all duration-300 border border-purple-100">
                <User className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Usuarios Activos</p>
                <h3 className="text-3xl font-bold text-slate-900 tracking-tight">5</h3>
              </div>
            </div>
          </div>
        </div>

        {/* Filtros y Tabla */}
        <section className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row gap-4 justify-between items-center">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por usuario, acción o detalle..."
                className="w-full pl-11 pr-4 py-3 rounded-xl border-none bg-white shadow-sm ring-1 ring-slate-200 focus:ring-2 focus:ring-slate-900 transition-all text-sm font-medium text-slate-900 placeholder:text-slate-400"
              />
            </div>
            <div className="flex gap-1 w-full md:w-auto overflow-x-auto p-1 bg-slate-100 rounded-xl border border-slate-200">
              {(['TODOS', 'INFO', 'WARNING', 'CRITICAL'] as const).map((nivel) => (
                <button
                  key={nivel}
                  onClick={() => setFiltroNivel(nivel)}
                  className={cn(
                    "px-4 py-2 rounded-lg text-xs font-bold tracking-wide transition-all duration-300",
                    filtroNivel === nivel 
                      ? 'bg-white text-slate-900 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                  )}
                >
                  {nivel}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 font-bold tracking-wider">Fecha / Hora</th>
                  <th className="px-6 py-4 font-bold tracking-wider">Usuario</th>
                  <th className="px-6 py-4 font-bold tracking-wider">Módulo / Acción</th>
                  <th className="px-6 py-4 font-bold tracking-wider">Detalle</th>
                  <th className="px-6 py-4 font-bold tracking-wider text-center">Nivel</th>
                  <th className="px-6 py-4 font-bold tracking-wider text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {logsFiltrados.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap text-slate-500">
                      <div className="flex items-center gap-2 font-mono text-xs font-medium">
                        <Calendar className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-600 transition-colors" />
                        {formatDate(log.fecha)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 group-hover:bg-slate-900 group-hover:text-white transition-colors uppercase border border-slate-200">
                          {log.usuario.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{log.usuario}</div>
                          <div className="text-xs text-slate-500 font-medium">{log.rol}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900">{log.accion.replace(/_/g, ' ')}</span>
                        <span className="text-xs text-slate-400 font-medium">{log.modulo}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 max-w-xs truncate text-slate-600 font-medium" title={log.detalle}>
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
                      <button 
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Ver Detalle"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {logsFiltrados.length === 0 && (
              <div className="py-16 text-center">
                <div className="inline-flex p-4 rounded-full bg-slate-50 mb-4 border border-slate-100">
                  <Search className="h-8 w-8 text-slate-300" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">No se encontraron registros</h3>
                <p className="text-slate-500 mt-1 font-medium">Intenta ajustar los términos de búsqueda o filtros.</p>
              </div>
            )}
          </div>
          
          <div className="p-4 border-t border-slate-100 bg-slate-50/30 flex justify-between items-center text-xs text-slate-500 font-medium">
            <span>Mostrando {logsFiltrados.length} de {logs.length} eventos</span>
            <div className="flex gap-2">
              <button disabled className="px-4 py-2 rounded-lg border border-slate-200 bg-white opacity-50 cursor-not-allowed font-bold flex items-center gap-1">
                <ChevronLeft className="h-3 w-3" /> Anterior
              </button>
              <button className="px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold transition-colors flex items-center gap-1">
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
