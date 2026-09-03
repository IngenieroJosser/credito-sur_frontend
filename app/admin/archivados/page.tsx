'use client'

import { Archive, Search, Filter, RefreshCw, RotateCcw, Trash2, Eye, MapPin } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import { useRealtimeData } from '@/hooks/useRealtimeData'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { auditoriaService } from '@/services/auditoria-service'
import { archivadosService } from '@/services/archivados-service'
import { clientesService } from '@/services/clientes-service'
import { prestamosService } from '@/services/prestamos-service'
import { usuariosService } from '@/services/usuarios-service'
import { inventarioService } from '@/services/inventario-service'
import { toast } from 'sonner'
import ClientePortalModal from '@/components/cliente/ClientePortalModal'
import DetallePrestamoModal from '@/components/prestamos/DetallePrestamoModal'
import DetalleProductoModal from '@/components/articulos/DetalleProductoModal'

interface ArchivedItem {
  id: string
  entidadId: string
  tipo: string
  nombre: string
  fechaEliminacion: string
  motivo: string
  usuarioEliminador: string
  /** Ruta a la que pertenecia. Null cuando la entidad no tiene ruta. */
  ruta: string | null
}

export default function ArchivadosPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [tipoFiltro, setTipoFiltro] = useState('todos')
  // 'todas' | 'sin-ruta' | nombre de la ruta
  const [rutaFiltro, setRutaFiltro] = useState('todas')
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<ArchivedItem | null>(null)
  const [isHideModalOpen, setIsHideModalOpen] = useState(false)
  const [selectedHideItem, setSelectedHideItem] = useState<ArchivedItem | null>(null)
  const [detalleClienteId, setDetalleClienteId] = useState<string | null>(null)
  const [detallePrestamoId, setDetallePrestamoId] = useState<string | null>(null)
  const [detalleProductoId, setDetalleProductoId] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [items, setItems] = useState<ArchivedItem[]>([])
  const [loading, setLoading] = useState(true)
  // Permite que el boton 'Actualizar' vuelva a cargar los datos.
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    setMounted(true)
    const fetchItems = async () => {
      setLoading(true)
      try {
        const ocultos = await auditoriaService.obtenerOcultosArchivados().catch(() => [])
        const ocultosKey = new Set(
          (Array.isArray(ocultos) ? ocultos : []).map(
            (o: any) => `${String(o.entidad || '').toLowerCase()}::${String(o.entidadId || '')}`,
          ),
        )

        // El listado lo arma el backend leyendo las entidades archivadas, que
        // si conocen su ruta. Antes se deducia del registro de auditoria
        // buscando palabras en los nombres de las acciones: bastaba renombrar
        // una para que dejaran de aparecer registros, y una entrada de bitacora
        // no sabe a que ruta pertenecia el cliente.
        const archivados = await archivadosService.listar()
        const filas: ArchivedItem[] = (Array.isArray(archivados) ? archivados : [])
          .filter(
            (a) =>
              !ocultosKey.has(
                `${String(a.tipo || '').toLowerCase()}::${String(a.entidadId || '')}`,
              ),
          )
          .map((a) => ({
            id: a.id,
            entidadId: a.entidadId,
            tipo: a.tipo,
            nombre: a.nombre,
            fechaEliminacion: a.fechaEliminacion || '',
            motivo: a.motivo,
            usuarioEliminador: a.usuarioEliminador,
            ruta: a.ruta,
          }))

        setItems(filas)
      } catch (err) {
        console.error('Error cargando archivados:', err)
        setItems([])
      } finally {
        setLoading(false)
      }
    }
    
    // Función disponible globalmente para recargar
    (window as any).refreshArchivados = fetchItems;
    
    // Carga inicial
    fetchItems();
  }, [refreshKey])

  // Tiempo real: cuando se archive/elimine/restaure algo vía otro módulo, actualizar lista
  useRealtimeData(['prestamos_actualizados', 'clientes_actualizados', 'inventario_actualizado', 'usuarios_actualizados', 'dashboards_actualizados'], () => {
    if ((window as any).refreshArchivados) (window as any).refreshArchivados()
  })

  const handleRestore = async () => {
    if (!selectedItem) return
    
    setIsRestoreModalOpen(false)
    const toastId = toast.loading(`Restaurando ${selectedItem.tipo}...`)
    
    try {
      let result
      const { entidadId, tipo } = selectedItem
      
      switch (tipo) {
        case 'cliente':
          result = await clientesService.restaurar(entidadId)
          break
        case 'prestamo':
          result = await prestamosService.restaurarPrestamo(entidadId)
          break
        case 'producto':
          result = await inventarioService.restaurarProducto(entidadId)
          break
        case 'usuario':
          // result = await usuariosService.restaurar(entidadId) // Si se implementa después
          toast.error('Restauración de usuarios no implementada aún', { id: toastId })
          return
        default:
          toast.error(`Tipo de entidad desconocido: ${tipo}`, { id: toastId })
          return
      }
      
      toast.success(`${selectedItem.tipo.charAt(0).toUpperCase() + selectedItem.tipo.slice(1)} restaurado correctamente`, { id: toastId })
      setItems((prev) => prev.filter((item) => !(item.tipo === selectedItem.tipo && item.entidadId === selectedItem.entidadId)))
      
      // Recargar lista
      if ((window as any).refreshArchivados) {
        (window as any).refreshArchivados()
      }
    } catch (error: any) {
      console.error('Error al restaurar:', error)
      toast.error(error.message || 'Error al restaurar el elemento', { id: toastId })
    }
  }

  const handleHideArchived = async () => {
    if (!selectedHideItem) return

    setIsHideModalOpen(false)
    const toastId = toast.loading(`Quitando ${selectedHideItem.tipo} de archivados...`)

    try {
      const { entidadId, tipo } = selectedHideItem

      await auditoriaService.ocultarArchivado(tipo, entidadId)

      toast.success('Elemento quitado de archivados', { id: toastId })
      if ((window as any).refreshArchivados) {
        (window as any).refreshArchivados()
      }
    } catch (error: any) {
      const statusCode = error?.statusCode
      const rawMessage =
        error?.message ||
        error?.error?.message ||
        error?.error ||
        ''

      let extra = ''
      try {
        extra = JSON.stringify(error)
      } catch {
        extra = String(error)
      }

      console.error('Error al quitar de archivados:', {
        statusCode,
        message: rawMessage,
        error,
      })

      const msg = rawMessage
        ? (statusCode ? `[${statusCode}] ${rawMessage}` : String(rawMessage))
        : (statusCode ? `[${statusCode}] Error al quitar el elemento` : 'Error al quitar el elemento')

      toast.error(msg || extra || 'Error al quitar el elemento', { id: toastId })
    } finally {
      setSelectedHideItem(null)
    }
  }

  // Rutas presentes en lo archivado. Se sacan de los propios datos para no
  // ofrecer rutas que no filtrarian nada, y se ordenan alfabeticamente.
  const rutasDisponibles = Array.from(
    new Set(items.map(i => i.ruta).filter((r): r is string => !!r)),
  ).sort((a, b) => a.localeCompare(b))

  // Cuantos elementos no pertenecen a ninguna ruta (productos y usuarios nunca
  // la tienen). Se dice de forma explicita para que nadie crea que se perdieron.
  const sinRuta = items.filter(i => !i.ruta).length

  const filteredItems = items.filter(item => {
    const matchesSearch = item.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.motivo.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = tipoFiltro === 'todos' || item.tipo === tipoFiltro
    const matchesRuta =
      rutaFiltro === 'todas' ||
      (rutaFiltro === 'sin-ruta' ? !item.ruta : item.ruta === rutaFiltro)
    return matchesSearch && matchesType && matchesRuta
  })

  return (
    <div className="min-h-screen bg-slate-50 relative">
      {/* Fondo arquitectónico */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-slate-400 opacity-20 blur-[100px]"></div>
      </div>

      <div className="relative z-10 w-full px-6 md:px-8 py-8 space-y-8">
        {/* Header Standard */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-900 tracking-wide mb-2 border border-slate-200">
              <Archive className="h-3.5 w-3.5" />
              <span>Historial de Eliminaciones</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              <span className="text-blue-600">Elementos </span><span className="text-orange-500">Archivados</span>
            </h1>
            <p className="text-sm text-slate-500 font-medium leading-relaxed">
              Consulta y restaura registros que han sido eliminados del sistema.
            </p>
          </div>

          <div className="flex items-center gap-3">
             <button
              onClick={() => setRefreshKey((k) => k + 1)}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 hover:text-slate-900 transition-all disabled:opacity-60">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Actualizar</span>
            </button>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200 flex flex-col md:flex-row gap-4 items-center justify-between animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
          <div className="w-full md:w-96 buscador-3d">
            <Search className="icon h-4 w-4" />
            <input
              type="text"
              placeholder="Buscar por nombre o motivo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="buscador-3d-input"
            />
          </div>
          {/* Filtro por ruta. Solo aparece si hay rutas que ofrecer: en una
              lista de productos y usuarios archivados no filtraria nada. */}
          {rutasDisponibles.length > 0 && (
            <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-sm shrink-0">
              <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <select
                value={rutaFiltro}
                onChange={(e) => setRutaFiltro(e.target.value)}
                className="min-w-0 max-w-[13rem] truncate bg-transparent text-[11px] font-bold text-slate-600 outline-none"
              >
                <option value="todas">Todas las rutas</option>
                {rutasDisponibles.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
                {sinRuta > 0 && (
                  <option value="sin-ruta">Sin ruta ({sinRuta})</option>
                )}
              </select>
            </div>
          )}
          <div className="flex items-center gap-1.5 flex-wrap bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
            <Filter className="h-3.5 w-3.5 text-slate-400 shrink-0 mr-1" />
            
            {[ 
              { id: 'todos', label: 'Todos' },
              { id: 'cliente', label: 'Clientes' },
              { id: 'prestamo', label: 'Préstamos' },
              { id: 'producto', label: 'Productos' },
              { id: 'usuario', label: 'Usuarios' }
            ].map((filtro) => (
              <button
                key={filtro.id}
                onClick={() => setTipoFiltro(filtro.id)}
                className={`px-3 py-1.5 text-[11px] font-bold rounded-xl transition-all whitespace-nowrap ${
                  tipoFiltro === filtro.id 
                    ? 'bg-primary text-white shadow-md shadow-primary/20' 
                    : 'bg-slate-100/50 text-slate-600 hover:bg-slate-200/70 border border-slate-200'
                }`}
              >
                {filtro.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
          {filteredItems.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b border-slate-200">
                  <tr>
                    <th className="px-8 py-5 font-bold tracking-wider">Elemento</th>
                    <th className="px-6 py-5 font-bold tracking-wider">Tipo</th>
                    <th className="px-6 py-5 font-bold tracking-wider">Ruta</th>
                    <th className="px-6 py-5 font-bold tracking-wider">Fecha Eliminación</th>
                    <th className="px-6 py-5 font-bold tracking-wider">Motivo</th>
                    <th className="px-6 py-5 font-bold tracking-wider">Eliminado Por</th>
                    <th className="px-8 py-5 font-bold tracking-wider text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredItems.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-8 py-5 whitespace-nowrap">
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold shadow-sm border border-slate-200 transition-transform group-hover:scale-105",
                              item.tipo === 'cliente' && "bg-blue-50 text-blue-700",
                              item.tipo === 'prestamo' && "bg-emerald-50 text-emerald-700",
                              item.tipo === 'usuario' && "bg-amber-50 text-amber-700"
                            )}>
                              {item.nombre.charAt(0)}
                            </div>
                            <span className="text-sm font-bold text-slate-900">{item.nombre}</span>
                          </div>
                        </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <span className={cn(
                          "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold tracking-wide uppercase border",
                          item.tipo === 'cliente' && "bg-blue-50 text-blue-700 border-blue-100",
                          item.tipo === 'prestamo' && "bg-emerald-50 text-emerald-700 border-emerald-100",
                          item.tipo === 'usuario' && "bg-amber-50 text-amber-700 border-amber-100"
                        )}>
                          {item.tipo.charAt(0).toUpperCase() + item.tipo.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-slate-600 font-medium">
                        {item.ruta ? (
                          <span className="inline-flex max-w-[12rem] items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold">
                            <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
                            <span className="truncate">{item.ruta}</span>
                          </span>
                        ) : (
                          // Productos y usuarios no pertenecen a ninguna ruta.
                          <span className="text-xs font-medium text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-slate-600 font-medium">
                        {new Date(item.fechaEliminacion).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-5 text-slate-600 font-medium">
                        {item.motivo}
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                            {item.usuarioEliminador.charAt(0)}
                          </div>
                          <span className="text-sm text-slate-600 font-bold">{item.usuarioEliminador}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              if (item.tipo === 'cliente') setDetalleClienteId(item.entidadId)
                              else if (item.tipo === 'prestamo') setDetallePrestamoId(item.entidadId)
                              else if (item.tipo === 'producto') setDetalleProductoId(item.entidadId)
                            }}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Ver detalles"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => {
                              setSelectedItem(item)
                              setIsRestoreModalOpen(true)
                            }}
                            className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Restaurar"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => {
                              setSelectedHideItem(item)
                              setIsHideModalOpen(true)
                            }}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Quitar de archivados"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 px-4 text-center animate-in fade-in zoom-in-95 duration-500">
              <div className="bg-slate-50 p-6 rounded-full mb-6 border border-slate-100 shadow-sm">
                <Archive className="h-10 w-10 text-slate-300" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">No hay elementos archivados</h3>
              <p className="text-slate-500 max-w-sm font-medium">
                No se encontraron elementos que coincidan con los filtros actuales.
              </p>
              <button 
                onClick={() => {setSearchTerm(''); setTipoFiltro('todos')}}
                className="mt-8 px-6 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold shadow-lg shadow-slate-900/20 hover:bg-slate-800 hover:scale-105 transition-all"
              >
                Limpiar filtros
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Restore Confirmation Modal */}
      {mounted && isRestoreModalOpen && selectedItem && createPortal(
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-sm border border-slate-200 shadow-2xl p-8 transform scale-100 animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                <RotateCcw className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                ¿Restaurar elemento?
              </h3>
              <p className="text-sm text-slate-500 mb-6 font-medium">
                Se restaurará <span className="text-slate-900 font-bold">{selectedItem.nombre}</span> y volverá a estar disponible en el sistema.
              </p>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setIsRestoreModalOpen(false)}
                  className="flex-1 px-4 py-2.5 text-sm font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleRestore}
                  className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-lg shadow-emerald-600/20 transition-all transform active:scale-95"
                >
                  Restaurar
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {mounted && isHideModalOpen && selectedHideItem && createPortal(
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-sm border border-slate-200 shadow-2xl p-8 transform scale-100 animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
                <Trash2 className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                ¿Quitar de archivados?
              </h3>
              <p className="text-sm text-slate-500 mb-6 font-medium">
                Se quitará <span className="text-slate-900 font-bold">{selectedHideItem.nombre}</span> de la lista de archivados.
              </p>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setIsHideModalOpen(false)}
                  className="flex-1 px-4 py-2.5 text-sm font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleHideArchived}
                  className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-lg shadow-rose-600/20 transition-all transform active:scale-95"
                >
                  Quitar
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {detalleClienteId && (
        <ClientePortalModal
          clientId={detalleClienteId}
          onClose={() => setDetalleClienteId(null)}
          rolUsuario="admin"
        />
      )}

      {detallePrestamoId && (
        <DetallePrestamoModal
          id={detallePrestamoId}
          includeArchived={true}
          onClose={() => setDetallePrestamoId(null)}
        />
      )}

      {detalleProductoId && (
        <DetalleProductoModal
          id={detalleProductoId}
          onClose={() => setDetalleProductoId(null)}
        />
      )}
    </div>
  )
}
