'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useMemo } from 'react'
import { useRealtimeData } from '@/hooks/useRealtimeData'
import { 
  Shield, 
  Search, 
  Clock, 
  User, 
  AlertCircle, 
  Calendar, 
  Eye, 
  ChevronLeft, 
  ChevronRight,
  X,
  Laptop
} from 'lucide-react'
import Paginador from '@/components/ui/Paginador'
import { auditoriaService, type RegistroAuditoria } from '@/services/auditoria-service'
import { routesService, type Route } from '@/services/routes-service'
import { cn } from '@/lib/utils'
import { exportService } from '@/services/export-service'
import { toast } from 'sonner'
import { ExportButton } from '@/components/ui/ExportButton'
import { usePermission } from '@/hooks/usePermission'

const AuditoriaSistemaPage = () => {
  const { can, canForPath } = usePermission()
  const permitido = useMemo(() => can('AUDIT_VIEW') || canForPath('/admin/auditoria') || canForPath('/auditoria'), [can, canForPath])
  const [busqueda, setBusqueda] = useState('')
  const [filtroNivel, setFiltroNivel] = useState<'TODOS' | 'INFORMATIVO' | 'ADVERTENCIA' | 'CRITICO'>('TODOS')
  const [selectedLog, setSelectedLog] = useState<LogItem | null>(null)
  const [logs, setLogs] = useState<LogItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filtroRuta, setFiltroRuta] = useState<string>('Todas')
  const [rutas, setRutas] = useState<Route[]>([])
  // Paginación
  const [pagina, setPagina] = useState(1)
  const [totalPaginas, setTotalPaginas] = useState(1)
  const [totalRegistros, setTotalRegistros] = useState(0)
  // Registros por pagina. El listado es de lectura y cada fila es ancha:
  // cinco caben sin desbordar la tarjeta ni obligar a desplazar la pagina.
  const LIMITE = 5

  interface LogItem {
    id: string
    usuario: string
    rol: string
    accion: string
    modulo: string
    detalle: string
    fecha: string
    ip: string
    nivel: 'INFORMATIVO' | 'ADVERTENCIA' | 'CRITICO'
    rutaNombre?: string
  }

  const deriveNivel = (accion: string): LogItem['nivel'] => {
    const a = (accion || '').toUpperCase()
    if (a.includes('FALLIDO') || a.includes('ERROR') || a.includes('RECHAZ')) return 'ADVERTENCIA'
    if (a.includes('APROBAR') || a.includes('ELIMINAR') || a.includes('CERRAR')) return 'CRITICO'
    return 'INFORMATIVO'
  }

  const cargarDatos = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const [registrosResp, rutasResp] = await Promise.all([
        auditoriaService.obtenerRegistrosPaginados(pagina, LIMITE),
        routesService.getAll({ limit: 1000 })
      ])
      const rutasList = rutasResp?.data || []
      setRutas(rutasList)
      const registros = (registrosResp as any).registros ?? registrosResp
      const total = (registrosResp as any).total ?? registros.length
      const totPag = (registrosResp as any).totalPaginas ?? 1
      setTotalRegistros(total)
      setTotalPaginas(totPag)
      const rutaMap = new Map<string, string>()
      rutasList.forEach((r: Route) => rutaMap.set(r.id, r.nombre))
      const items: LogItem[] = registros.map((r: RegistroAuditoria) => ({
        id: r.id,
        usuario: r.usuario ? `${r.usuario.nombres} ${r.usuario.apellidos}` : r.usuarioId,
        rol: r.usuario?.rol || 'DESCONOCIDO',
        accion: r.accion,
        modulo: r.entidad,
        detalle: r.endpoint ? `${r.endpoint}` : r.entidadId,
        fecha: r.creadoEn,
        ip: r.direccionIP || '',
        nivel: deriveNivel(r.accion),
        rutaNombre: r.entidad?.toLowerCase() === 'ruta' ? (rutaMap.get(r.entidadId) || '') : ''
      }))
      setLogs(items)
    } catch (e: any) {
      setError('No se pudo cargar auditoria')
    } finally {
      setLoading(false)
    }
  }, [pagina])

  useEffect(() => { cargarDatos() }, [cargarDatos])

  // Tiempo real: refrescar log cuando haya actividad en el sistema
  useRealtimeData(
    ['usuarios_actualizados', 'prestamos_actualizados', 'pagos_actualizados', 'clientes_actualizados', 'dashboards_actualizados'],
    cargarDatos,
  )

  const handleExportExcel = async () => {
    try {
      await exportService.exportAudit('excel')
      toast.success('Log de auditoría Excel descargado')
    } catch (e) {
      toast.error('Error al exportar log de auditoría')
    }
  }
  const handleExportPDF = async () => {
    try {
      await exportService.exportAudit('pdf')
      toast.success('Log de auditoría PDF descargado')
    } catch (e) {
      toast.error('Error al exportar log de auditoría')
    }
  }

  const logsFiltrados = logs.filter(log => {
    const coincideTexto = 
      log.usuario.toLowerCase().includes(busqueda.toLowerCase()) ||
      log.accion.toLowerCase().includes(busqueda.toLowerCase()) ||
      log.detalle.toLowerCase().includes(busqueda.toLowerCase())
    
    const coincideNivel = filtroNivel === 'TODOS' || log.nivel === filtroNivel
    const coincideRuta = filtroRuta === 'Todas' || (log.rutaNombre && log.rutaNombre === filtroRuta)

    return coincideTexto && coincideNivel && coincideRuta
  })

  const toLocalKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const todayStr = toLocalKey(new Date())
  const eventosHoy = logs.filter(l => {
    const raw = l.fecha;
    const f = raw ? (raw.includes('T') ? raw.split('T')[0] : raw) : '';
    return f === todayStr;
  }).length
  const alertasCriticas = logs.filter(l => l.nivel === 'CRITICO').length
  const usuariosActivos = new Set(logs.map(l => l.usuario)).size

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
      case 'CRITICO': return 'bg-rose-50 text-rose-700 border-rose-100'
      case 'ADVERTENCIA': return 'bg-amber-50 text-amber-700 border-amber-100'
      case 'INFORMATIVO': return 'bg-blue-50 text-blue-700 border-blue-100'
      default: return 'bg-slate-50 text-slate-700 border-slate-100'
    }
  }

  if (!permitido) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-xs text-slate-600 font-bold border border-slate-200">
            <Shield className="h-3.5 w-3.5" />
            <span>Acceso no autorizado</span>
          </div>
          <p className="mt-4 text-slate-500 font-medium">No tienes permisos para ver Auditoría.</p>
        </div>
      </div>
    )
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
              <div className="shrink-0 p-3 bg-blue-50 rounded-xl text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 border border-blue-100">
                <Clock className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Eventos Hoy</p>
                <h3 className="text-3xl font-bold text-slate-900 tracking-tight">{eventosHoy}</h3>
              </div>
            </div>
          </div>
          <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 group">
            <div className="flex items-center gap-4">
              <div className="shrink-0 p-3 bg-rose-50 rounded-xl text-rose-600 group-hover:bg-rose-600 group-hover:text-white transition-all duration-300 border border-rose-100">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Alertas Críticas</p>
                <h3 className="text-3xl font-bold text-slate-900 tracking-tight">{alertasCriticas}</h3>
              </div>
            </div>
          </div>
          <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 group">
            <div className="flex items-center gap-4">
              <div className="shrink-0 p-3 bg-purple-50 rounded-xl text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-all duration-300 border border-purple-100">
                <User className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Usuarios Activos</p>
                <h3 className="text-3xl font-bold text-slate-900 tracking-tight">{usuariosActivos}</h3>
              </div>
            </div>
          </div>
        </div>

        {/* Filtros y Tabla */}
        <section className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row gap-4 justify-between items-center">
            <div className="w-full md:w-96 buscador-3d">
              <Search className="icon h-4 w-4" />
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por usuario, acción o detalle..."
                className="buscador-3d-input"
              />
            </div>
            <div className="flex gap-1 w-full md:w-auto overflow-x-auto p-1 bg-slate-100 rounded-xl border border-slate-200">
              {(['TODOS', 'INFORMATIVO', 'ADVERTENCIA', 'CRITICO'] as const).map((nivel) => (
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
            <div className="flex gap-1 w-full md:w-auto overflow-x-auto p-1 bg-slate-100 rounded-xl border border-slate-200">
              {['Todas', 'Ruta Centro', 'Ruta Norte', 'Ruta Este', 'Ruta Sur - Expansión']
                .filter(label => label === 'Todas' || rutas.some(r => r.nombre === label))
                .map(label => (
                <button
                  key={label}
                  onClick={() => setFiltroRuta(label)}
                  className={cn(
                    "px-4 py-2 rounded-lg text-xs font-bold tracking-wide transition-all duration-300",
                    filtroRuta === label 
                      ? 'bg-white text-slate-900 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Tabla - Desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 font-bold tracking-wider">Fecha / Hora</th>
                  <th className="px-6 py-4 font-bold tracking-wider">Usuario</th>
                  <th className="px-6 py-4 font-bold tracking-wider">Módulo / Acción</th>
                  <th className="px-6 py-4 font-bold tracking-wider">ID</th>
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
                        <span className="text-xs text-slate-400 font-medium">{log.modulo}{log.rutaNombre ? ` · ${log.rutaNombre}` : ''}</span>
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
                        onClick={() => setSelectedLog(log)}
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
          </div>

          {/* Vista de Cards - Móvil */}
          <div className="md:hidden space-y-4 p-4">
            {logsFiltrados.map((log) => (
              <div
                key={log.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-4"
              >
                {/* Fecha y Usuario */}
                <div className="flex items-start justify-between mb-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 uppercase border border-slate-200 flex-shrink-0">
                      {log.usuario.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-900 truncate">{log.usuario}</div>
                      <div className="text-xs text-slate-500 font-medium">{log.rol}</div>
                    </div>
                  </div>
                  <span className={cn(
                    "inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase border flex-shrink-0 ml-2",
                    getNivelBadge(log.nivel)
                  )}>
                    {log.nivel}
                  </span>
                </div>

                {/* Módulo/Acción */}
                <div className="mb-3 pb-3 border-b border-slate-100">
                  <div className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Módulo / Acción</div>
                  <div className="font-bold text-slate-900">{log.accion.replace(/_/g, ' ')}</div>
                  <div className="text-xs text-slate-400 font-medium mt-0.5">{log.modulo}{log.rutaNombre ? ` · ${log.rutaNombre}` : ''}</div>
                </div>

                {/* Detalle */}
                <div className="mb-3 pb-3 border-b border-slate-100">
                  <div className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Detalle</div>
                  <div className="text-sm text-slate-600 font-medium break-words">{log.detalle}</div>
                </div>

                {/* Fecha y Acción */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    {formatDate(log.fecha)}
                  </div>
                  <button 
                    onClick={() => setSelectedLog(log)}
                    className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Ver
                  </button>
                </div>
              </div>
            ))}
          </div>
            
          {logsFiltrados.length === 0 && (
            <div className="py-16 text-center">
              <div className="inline-flex p-4 rounded-full bg-slate-50 mb-4 border border-slate-100">
                <Search className="h-8 w-8 text-slate-300" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">No se encontraron registros</h3>
              <p className="text-slate-500 mt-1 font-medium">Intenta ajustar los términos de búsqueda o filtros.</p>
            </div>
          )}
          
          <div className="p-4 border-t border-slate-100 bg-slate-50/30">
            <Paginador
              pagina={pagina}
              totalPaginas={totalPaginas}
              onCambiar={setPagina}
              cargando={loading}
              resumen={`Mostrando ${logs.length} de ${totalRegistros} registros`}
              className="mt-0"
            />
          </div>
        </section>
      </div>

      {/* Modal de Detalle */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-600" />
                <span className="text-blue-600">Detalle del</span>
                <span className="text-orange-500">Evento</span>
              </h3>
              <button 
                onClick={() => setSelectedLog(null)}
                className="p-2 hover:bg-slate-200/50 rounded-full transition-colors"
              >
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Info Usuario */}
              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="h-12 w-12 rounded-xl bg-white flex items-center justify-center text-lg font-bold text-slate-700 shadow-sm border border-slate-200 uppercase">
                  {selectedLog.usuario.charAt(0)}
                </div>
                <div>
                  <div className="font-bold text-slate-900">{selectedLog.usuario}</div>
                  <div className="text-xs text-slate-500 font-medium flex items-center gap-2">
                    <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-md text-[10px] uppercase tracking-wider font-bold">
                      {selectedLog.rol}
                    </span>
                    <span className="flex items-center gap-1">
                      <Laptop className="h-3 w-3" />
                      {selectedLog.ip}
                    </span>
                  </div>
                </div>
              </div>

              {/* Grid de Detalles */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Fecha y Hora</span>
                  <p className="font-medium text-slate-900 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    {formatDate(selectedLog.fecha)}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nivel</span>
                  <div>
                    <span className={cn(
                      "inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase border",
                      getNivelBadge(selectedLog.nivel)
                    )}>
                      {selectedLog.nivel}
                    </span>
                  </div>
                </div>
                <div className="space-y-1 col-span-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Módulo / Acción</span>
                  <p className="font-medium text-slate-900">
                    {selectedLog.modulo} <span className="text-slate-300">/</span> {selectedLog.accion}
                  </p>
                </div>
              </div>

              {/* Detalle Texto */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Detalle del Registro</span>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-sm text-slate-600 font-medium leading-relaxed">
                  {selectedLog.detalle}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end">
              <button 
                onClick={() => setSelectedLog(null)}
                className="px-6 py-2 rounded-xl bg-orange-500 text-white font-bold hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AuditoriaSistemaPage
