'use client'


import Paginador from '@/components/ui/Paginador'
/**
 * ============================================================================
 * ARTÍCULOS / INVENTARIO - COMPONENTE COMPARTIDO
 * ============================================================================
 * 
 * @description
 * Componente reutilizable de gestión de artículos e inventario.
 * Usado por:
 * - /articulos (página unificada permission-based)
 * - /punto-de-venta (vista del rol PUNTO_DE_VENTA)
 * 
 * @permissions
 * - ARTICULOS_VIEW: Acceso al módulo (catálogo de consulta)
 * - ARTICULOS_CREAR: Crear nuevos artículos
 * - ARTICULOS_EDITAR: Editar artículos existentes
 * - ARTICULOS_ELIMINAR: Eliminar artículos
 * 
 * @roles
 * - ADMIN/SUPER_ADMIN/CONTADOR: CRUD completo, estadísticas con valor inventario
 * - COORDINADOR: Solo lectura (catálogo de consulta, sin crear/editar/eliminar)
 * - PUNTO_DE_VENTA: Solo lectura (catálogo de consulta)
 */

import { useState, useEffect, useMemo } from 'react'
import {
  Package,
  Search,
  Filter,
  Plus,
  Download,
  Trash2,
  AlertCircle,
  TrendingUp,
  Tag,
  DollarSign,
  Eye,
  Pencil,
  XCircle,
  Bell
} from 'lucide-react'
import { formatCOPInputValue, formatCurrency, parseCOPInputToNumber } from '@/lib/utils'
import { inventarioService, Producto as BackendProducto, EstadisticasInventario } from '@/services/inventario-service'
import { useNotification } from '@/components/providers/NotificationProvider'
import { useNotificaciones } from '@/components/providers/NotificacionesProvider'
import { categoriasService, Categoria } from '@/services/categorias-service'
import FieldLabel from '@/components/ui/FieldLabel'
import SelectCategoria from '@/components/ui/SelectCategoria'
import AnimacionCarga from '@/components/ui/AnimacionCarga'
import { usePermission } from '@/hooks/usePermission'
import { useRouter } from 'next/navigation'
import IngresoMercanciaModal from '@/components/articulos/IngresoMercanciaModal'
import { exportService } from '@/services/export-service'
import { formatErrorForComponent } from '@/lib/api/api'

// Interfaces
interface PrecioCuota {
  meses: number
  precio: number
}

interface Articulo {
  id: string
  nombre: string
  codigo: string
  descripcion?: string
  categoria: string
  categoriaId?: string
  marca: string
  modelo: string
  costo: number
  precioContado?: number
  stock: number
  stockMinimo: number
  estado: 'activo' | 'inactivo'
  precios: PrecioCuota[]
}

export default function ArticulosContent() {
  const { can, rol } = usePermission()

  // --- Permisos con fallback por rol ---
  const rolesGestion = ['SUPER_ADMINISTRADOR', 'ADMIN', 'CONTADOR']
  const puedeCrear = can('ARTICULOS_CREAR') || rolesGestion.includes(rol || '')
  const puedeEditar = can('ARTICULOS_EDITAR') || rolesGestion.includes(rol || '')
  const puedeEliminar = can('ARTICULOS_ELIMINAR') || rolesGestion.includes(rol || '')
  const esReadOnly = !puedeCrear && !puedeEditar && !puedeEliminar

  // --- Variaciones de UI por rol ---
  const headerLabel = esReadOnly ? 'Catálogo de Consulta' : 'Gestión de Inventario'
  const headerTitle = esReadOnly ? (
    <><span className="text-blue-600">Nuestros </span><span className="text-orange-500">Artículos</span></>
  ) : (
    <><span className="text-blue-600">Catálogo de </span><span className="text-orange-500">Artículos</span></>
  )
  const headerDescription = esReadOnly
    ? 'Consulta el catálogo disponible, existencias y precios de venta para clientes.'
    : 'Gestiona el inventario, costos y precios de venta.'

  const [articulos, setArticulos] = useState<Articulo[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [priorizarStockBajo, setPriorizarStockBajo] = useState(false)
  const [stockSort, setStockSort] = useState<'asc' | 'desc' | null>(null)
  const [page, setPage] = useState(1)
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [statsBase, setStatsBase] = useState<EstadisticasInventario | null>(null)
  const { showNotification } = useNotification()
  const { unreadCount, socket } = useNotificaciones()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [exportLoading, setExportLoading] = useState(false)

  useEffect(() => {
    const cargar = async () => {
      setLoading(true)
      try {
        const promises: Promise<any>[] = [fetchArticulos()]
        if (!esReadOnly) {
          promises.push(fetchCategorias(), fetchStats())
        }
        await Promise.all(promises)
      } finally {
        setLoading(false)
      }
    }
    cargar()
  }, [])

  useEffect(() => {
    if (!socket) return

    const handleUpdate = () => {
      fetchArticulos()
      if (!esReadOnly) {
        fetchStats()
      }
    }

    socket.on('inventario_actualizado', handleUpdate)

    return () => {
      socket.off('inventario_actualizado', handleUpdate)
    }
  }, [socket, esReadOnly])

  const fetchArticulos = async () => {
    try {
      const data = await inventarioService.obtenerProductos();
      const mapped: Articulo[] = data.map(p => {
        const precioContadoItem = p.precios?.find(pr => pr.meses === 0);
        const creditPrecios = p.precios?.filter(pr => pr.meses > 0) || [];
        
        return {
          id: p.id,
          nombre: p.nombre,
          codigo: p.codigo,
          descripcion: p.descripcion || undefined,
          categoria: p.categoria,
          categoriaId: p.categoriaId,
          marca: p.marca || '',
          modelo: p.modelo || '',
          costo: Number(p.costo),
          precioContado: precioContadoItem ? Number(precioContadoItem.precio) : undefined,
          stock: p.stock,
          stockMinimo: p.stockMinimo,
          estado: p.activo ? 'activo' : 'inactivo',
          precios: creditPrecios.map(cp => ({ ...cp, precio: Number(cp.precio) }))
        };
      });
      setArticulos(mapped);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      const errorMsg = formatErrorForComponent(error);
      showNotification('error', errorMsg, 'Error');
    }
  };

  const fetchCategorias = async () => {
    try {
      const data = await categoriasService.obtenerTodas('ARTICULO')
      setCategorias(data)
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const fetchStats = async () => {
    try {
      const data = await inventarioService.obtenerEstadisticas()
      setStatsBase(data)
    } catch (error) {
      console.error('Error fetching inventory stats:', error)
    }
  }

  const [showNuevoModal, setShowNuevoModal] = useState(false)
  const [showEditarModal, setShowEditarModal] = useState(false)
  const [showDetalleModal, setShowDetalleModal] = useState(false)
  const [showEliminarModal, setShowEliminarModal] = useState(false)
  const [showIngresoMercanciaModal, setShowIngresoMercanciaModal] = useState(false)
  const [articuloSeleccionado, setArticuloSeleccionado] = useState<Articulo | null>(null)

  const [formData, setFormData] = useState({
    nombre: '',
    codigo: '',
    descripcion: '',
    categoria: '',
    categoriaId: '',
    marca: '',
    modelo: '',
    costo: '',
    precioContado: '',
    stock: '',
    stockMinimo: '',
    precios: [] as PrecioCuota[],
  })

  const [nuevaCuota, setNuevaCuota] = useState({ meses: 1, precio: '' })

  const articulosFiltrados = articulos.filter((a) => {
    const q = busqueda.toLowerCase()
    const matchBusqueda =
      a.nombre.toLowerCase().includes(q) ||
      a.codigo.toLowerCase().includes(q) ||
      a.categoria.toLowerCase().includes(q)

    return matchBusqueda
  })

  const articulosOrdenados = useMemo(() => {
    const lista = [...articulosFiltrados]
    const sortMode = stockSort || (priorizarStockBajo ? 'asc' : null)
    if (!sortMode) return lista
    return lista.sort((a, b) => {
      const diff = Number(a.stock || 0) - Number(b.stock || 0)
      return sortMode === 'asc' ? diff : -diff
    })
  }, [articulosFiltrados, priorizarStockBajo, stockSort])

  // Cinco por pagina: las tarjetas del catalogo son altas y con diez habia
  // que bajar hasta el final para llegar al paginador.
  const pageSize = 5
  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(articulosOrdenados.length / pageSize))
  }, [articulosOrdenados.length])

  useEffect(() => {
    setPage(1)
  }, [busqueda, priorizarStockBajo, stockSort, articulos.length])

  const pagedArticulos = useMemo(() => {
    const safePage = Math.min(Math.max(1, page), totalPages)
    const start = (safePage - 1) * pageSize
    return articulosOrdenados.slice(start, start + pageSize)
  }, [articulosOrdenados, page, totalPages])

  const showingFrom = useMemo(() => {
    if (articulosOrdenados.length === 0) return 0
    return (Math.min(Math.max(1, page), totalPages) - 1) * pageSize + 1
  }, [articulosOrdenados.length, page, totalPages])

  const showingTo = useMemo(() => {
    if (articulosOrdenados.length === 0) return 0
    return Math.min(articulosOrdenados.length, Math.min(Math.max(1, page), totalPages) * pageSize)
  }, [articulosOrdenados.length, page, totalPages])

  const totalArticulos = articulosFiltrados.length
  const enStock = articulosFiltrados.filter(a => a.stock > 0).length
  const atencionStockBajo = articulosFiltrados.filter(a => a.stock <= a.stockMinimo).length
  const valorInventario = articulosFiltrados.reduce((acc, a) => {
    const costo = Number(a.costo)
    return acc + (costo * Number(a.stock))
  }, 0)

  const deltaInventarioPorcentaje = (() => {
    const baseField = (statsBase as any)?.totalValorInventario ?? statsBase?.valorTotalInventario
    if (!statsBase || baseField == null || Number(baseField) === 0) return null
    const base = Number(baseField)
    const actual = Number(valorInventario)
    const pct = Math.round(((actual - base) / base) * 100)
    return pct === 0 ? null : pct
  })()

  const handleEliminar = (articulo: Articulo) => {
    setArticuloSeleccionado(articulo)
    setShowEliminarModal(true)
  }

  const handleToggleStockBajo = () => {
    setPriorizarStockBajo((prev) => !prev)
    setStockSort(null)
  }

  const handleExportarInventario = async () => {
    if (exportLoading) return
    if (articulosFiltrados.length === 0) {
      showNotification('warning', 'No hay artículos para exportar con los filtros actuales.', 'Inventario')
      return
    }

    setExportLoading(true)
    try {
      await exportService.downloadFile(
        'inventory/export',
        { format: 'excel' },
        'inventario-importable.xlsx',
      )
      showNotification(
        'success',
        'Archivo compatible con importaciones generado.',
        'Exportación',
      )
    } catch (error) {
      console.error('Error exporting inventory:', error)
      showNotification('error', 'No se pudo exportar el inventario.', 'Error')
    } finally {
      setExportLoading(false)
    }
  }

  const confirmarEliminar = async () => {
    if (articuloSeleccionado) {
      try {
        await inventarioService.eliminarProducto(articuloSeleccionado.id)
        showNotification('success', 'El artículo ha sido archivado', 'Éxito')
        fetchArticulos()
      } catch (error) {
        console.error('Error deleting product', error)
        showNotification('error', 'No se pudo archivar el artículo', 'Error')
      } finally {
        setShowEliminarModal(false)
        setArticuloSeleccionado(null)
      }
    }
  }

  const openNuevo = () => {
    setArticuloSeleccionado(null)
    setFormData({
      nombre: '',
      codigo: '',
      descripcion: '',
      categoria: '',
      categoriaId: '',
      marca: '',
      modelo: '',
      costo: '',
      precioContado: '',
      stock: '',
      stockMinimo: '',
      precios: [],
    })
    setNuevaCuota({ meses: 1, precio: '' })
    setShowNuevoModal(true)
  }

  const openDetalle = (articulo: Articulo) => {
    setArticuloSeleccionado(articulo)
    setShowDetalleModal(true)
  }

  const openEditar = (articulo: Articulo) => {
    setArticuloSeleccionado(articulo)
    setFormData({
      nombre: articulo.nombre,
      codigo: articulo.codigo,
      descripcion: articulo.descripcion || '',
      categoria: articulo.categoria,
      categoriaId: articulo.categoriaId || '',
      marca: articulo.marca,
      modelo: articulo.modelo,
      costo: formatCOPInputValue(String(articulo.costo)),
      precioContado: articulo.precioContado ? formatCOPInputValue(String(articulo.precioContado)) : '',
      stock: String(articulo.stock),
      stockMinimo: String(articulo.stockMinimo),
      precios: [...articulo.precios],
    })
    setNuevaCuota({ meses: 1, precio: '' })
    setShowEditarModal(true)
  }

  const addPrecioCuota = () => {
    const precio = parseCOPInputToNumber(nuevaCuota.precio)
    if (nuevaCuota.meses > 0 && precio > 0) {
      setFormData((prev) => ({
        ...prev,
        precios: [...prev.precios, { meses: nuevaCuota.meses, precio }].sort((a, b) => a.meses - b.meses),
      }))
      setNuevaCuota({ meses: 1, precio: '' })
    }
  }

  const removePrecioCuota = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      precios: prev.precios.filter((_, i) => i !== index),
    }))
  }

  /**
   * Lo que la base exige de verdad, más el precio de contado, que es del que
   * sale la utilidad de contado y que la importación por Excel ya pedía.
   * Antes el modal mandaba lo que hubiera y el error llegaba del backend sin
   * decir qué campo faltaba.
   */
  const camposQueFaltan = () => {
    const faltan: string[] = []
    if (!formData.nombre.trim()) faltan.push('Nombre')
    if (!formData.codigo.trim()) faltan.push('Código')
    if (!formData.categoriaId && !formData.categoria) faltan.push('Categoría')
    if (parseCOPInputToNumber(formData.costo) <= 0) faltan.push('Costo')
    if (parseCOPInputToNumber(formData.precioContado) <= 0)
      faltan.push('Precio de Contado')
    return faltan
  }

  const handleGuardar = async () => {
    const faltan = camposQueFaltan()
    if (faltan.length > 0) {
      showNotification(
        'error',
        `Falta diligenciar: ${faltan.join(', ')}.`,
        'Datos incompletos',
      )
      return
    }

    const commonData = {
      nombre: formData.nombre,
      codigo: formData.codigo,
      descripcion: formData.descripcion || undefined,
      categoria: formData.categoria,
      categoriaId: formData.categoriaId || undefined,
      marca: formData.marca || undefined,
      modelo: formData.modelo || undefined,
      costo: parseCOPInputToNumber(formData.costo),
      stock: Number(formData.stock || '0'),
      stockMinimo: Number(formData.stockMinimo || '0'),
      precioContado: formData.precioContado ? parseCOPInputToNumber(formData.precioContado) : undefined,
      precios: formData.precios,
    }

    try {
      if (articuloSeleccionado) {
         await inventarioService.actualizarProducto(articuloSeleccionado.id, commonData)
         showNotification('success', 'Artículo actualizado correctamente', 'Éxito')
      } else {
         await inventarioService.crearProducto(commonData)
         showNotification('success', 'Artículo creado correctamente', 'Éxito')
      }
      fetchArticulos()
      setShowNuevoModal(false)
      setShowEditarModal(false)
      setArticuloSeleccionado(null)
    } catch (error: any) {
      console.error('Error saving:', error)
      const errorMsg = error.response?.data?.message || 'Error al guardar el artículo. Verifique el código o los datos.'
      showNotification('error', errorMsg, 'Error')
    }
  }

  if (loading) {
    return (
      <AnimacionCarga texto={esReadOnly ? "Cargando catálogo..." : "Cargando inventario..."} />
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 relative">
      {/* Fondo arquitectónico */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-primary opacity-20 blur-[100px]"></div>
      </div>

      <div className="relative z-10 px-6 md:px-8 py-8 space-y-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-xs text-slate-600 tracking-wide font-bold border border-slate-200 mb-2">
                <Package className="h-3.5 w-3.5" />
                <span>{headerLabel}</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                {headerTitle}
              </h1>
              <p className="text-slate-500 mt-2 font-medium">
                {headerDescription}
              </p>
            </div>
            {!esReadOnly && (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowIngresoMercanciaModal(true)}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-xl hover:border-slate-400 hover:bg-slate-50 transition-all duration-200 shadow-sm font-bold text-sm group"
                >
                  <Plus className="w-4 h-4 text-slate-500 group-hover:text-slate-900 transition-colors" />
                  <span>Ingreso de mercancía</span>
                </button>
                {puedeCrear && (
                  <button
                    type="button"
                    onClick={openNuevo}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-xl hover:border-slate-400 hover:bg-slate-50 transition-all duration-200 shadow-sm font-bold text-sm group"
                  >
                    <Plus className="w-4 h-4 text-slate-500 group-hover:text-slate-900 transition-colors" />
                    <span>Nuevo Artículo</span>
                  </button>
                )}
              </div>
            )}
        </header>

        <div className="space-y-8">
        {/* Stats Cards */}
        <div className={`grid grid-cols-1 ${esReadOnly ? 'md:grid-cols-3' : 'md:grid-cols-4'} gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100`}>
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 group">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-slate-50 text-slate-600 rounded-xl group-hover:scale-110 transition-transform duration-300">
                <Package className="w-6 h-6" />
              </div>
            </div>
            <p className="text-sm font-medium text-slate-500">{esReadOnly ? 'Total Referencias' : 'Total Artículos'}</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{totalArticulos}</h3>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 group">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl group-hover:scale-110 transition-transform duration-300">
                <Tag className="w-6 h-6" />
              </div>
              {!esReadOnly && (
                <span className="flex items-center text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                  Activos
                </span>
              )}
            </div>
            <p className="text-sm font-medium text-slate-500">{esReadOnly ? 'Disponibles' : 'En Stock'}</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{enStock}</h3>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 group">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl group-hover:scale-110 transition-transform duration-300">
                <AlertCircle className="w-6 h-6" />
              </div>
              {!esReadOnly && (
                <span className="flex items-center text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">
                  Atención
                </span>
              )}
            </div>
            <p className="text-sm font-medium text-slate-500">Stock Bajo</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{atencionStockBajo}</h3>
          </div>

          {!esReadOnly && (
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 group">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl group-hover:scale-110 transition-transform duration-300">
                  <DollarSign className="w-6 h-6" />
                </div>
                {deltaInventarioPorcentaje != null && (
                  <span className={`flex items-center text-xs font-bold px-2 py-1 rounded-lg ${
                    deltaInventarioPorcentaje >= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'
                  }`}>
                    <TrendingUp className={`w-3 h-3 mr-1 ${deltaInventarioPorcentaje < 0 ? 'rotate-180' : ''}`} />
                    {deltaInventarioPorcentaje >= 0 ? `+${deltaInventarioPorcentaje}%` : `${deltaInventarioPorcentaje}%`}
                  </span>
                )}
              </div>
              <p className="text-sm font-medium text-slate-500">Valor Inventario</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(valorInventario)}</h3>
            </div>
          )}
        </div>

        {/* Filters & Search */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="w-full md:w-96 buscador-3d">
              <Search className="icon h-4 w-4" />
              <input
                type="text"
                placeholder="Buscar por nombre, código o categoría..."
                className="buscador-3d-input"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
              {priorizarStockBajo && (
                <button
                  type="button"
                  onClick={() => setPriorizarStockBajo(false)}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 border border-amber-100"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Quitar orden por menor stock
                </button>
              )}
            </div>
            
            {!esReadOnly && (
              <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                <button
                  type="button"
                  onClick={handleToggleStockBajo}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 border rounded-xl transition-all text-sm font-medium whitespace-nowrap ${
                    priorizarStockBajo
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  Menor stock primero
                </button>
                <button
                  type="button"
                  onClick={handleExportarInventario}
                  disabled={exportLoading || articulosFiltrados.length === 0}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all text-sm font-medium whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className={`w-4 h-4 ${exportLoading ? 'animate-pulse' : ''}`} />
                  {exportLoading ? 'Exportando...' : 'Exportar'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Tabla - Desktop */}
        <div className="hidden md:block bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50/50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Artículo</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Categoría</th>
                  {!esReadOnly && (
                    <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Costo</th>
                  )}
                  <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">{esReadOnly ? 'Precio Contado' : 'Venta'}</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">{esReadOnly ? 'Venta Crédito' : 'Valor Inventario'}</th>
                  {esReadOnly && (
                    <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Valor Inventario</th>
                  )}
                  <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <button
                      type="button"
                      onClick={() =>
                        setStockSort((prev) => (prev === 'asc' ? 'desc' : prev === 'desc' ? null : 'asc'))
                      }
                      className="inline-flex items-center justify-center gap-2 w-full hover:text-slate-700"
                      title="Ordenar por stock"
                    >
                      Stock
                      <span className="text-[10px] font-black text-slate-400">
                        {stockSort === 'asc' ? '▲' : stockSort === 'desc' ? '▼' : ''}
                      </span>
                    </button>
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pagedArticulos.map((articulo) => (
                  <tr key={articulo.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                          <Package className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-900">{articulo.nombre}</div>
                          <div className="text-xs text-slate-500">{esReadOnly ? articulo.codigo : `SKU: ${articulo.codigo}`}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${esReadOnly ? 'text-slate-600' : 'bg-slate-100 text-slate-700'}`}>
                        {articulo.categoria}
                      </span>
                    </td>
                    {!esReadOnly && (
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-600">
                        <div className="font-medium">{formatCurrency(articulo.costo)}</div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Costo</div>
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm font-bold text-blue-600">
                        {formatCurrency(articulo.precioContado || 0)}
                      </div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        {esReadOnly ? 'Contado' : 'Precio Contado'}
                      </div>
                      {!esReadOnly && (
                        <div className="text-[10px] text-slate-500 font-medium mt-1">
                          {articulo.precios.length} opciones de crédito
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {esReadOnly ? (
                        <>
                          <div className="text-sm font-bold text-slate-900">
                            {articulo.precios.length > 0 ? formatCurrency(articulo.precios[0].precio) : 'N/A'}
                          </div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Base Crédito</div>
                        </>
                      ) : (
                        <>
                          <div className="text-sm font-bold text-slate-900">
                            {formatCurrency((Number(articulo.costo) * Number(articulo.stock)) || 0)}
                          </div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Valor Inventario</div>
                        </>
                      )}
                    </td>
                    {esReadOnly && (
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm font-bold text-slate-900">
                          {formatCurrency((Number(articulo.costo) * Number(articulo.stock)) || 0)}
                        </div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Valor Inventario</div>
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      articulo.stock <= articulo.stockMinimo
                        ? 'bg-rose-50 text-rose-700 border border-rose-100'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                    }`}>
                        {articulo.stock} un.
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className={`flex items-center justify-end gap-2 ${!esReadOnly ? 'opacity-0 group-hover:opacity-100' : ''} transition-opacity`}>
                        <button 
                          type="button"
                          onClick={() => openDetalle(articulo)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Ver detalle"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {puedeEditar && (
                          <button 
                            type="button"
                            onClick={() => openEditar(articulo)}
                            className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}
                        {puedeEliminar && (
                          <button 
                            onClick={() => handleEliminar(articulo)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Archivar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/30">
            <Paginador
              pagina={page}
              totalPaginas={totalPages}
              onCambiar={setPage}
              resumen={`Mostrando ${showingFrom} a ${showingTo} de ${articulosOrdenados.length} resultados`}
              className="mt-0"
            />
          </div>
        </div>

        {/* Vista de Cards - Móvil */}
        <div className="md:hidden space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
          {pagedArticulos.map((articulo) => (
            <div
              key={articulo.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-4 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all"
            >
              {/* Header */}
              <div className="flex items-start gap-3 mb-3 pb-3 border-b border-slate-100">
                <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 flex-shrink-0">
                  <Package className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-slate-900 truncate">{articulo.nombre}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{esReadOnly ? articulo.codigo : `SKU: ${articulo.codigo}`}</div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 mt-2">
                    {articulo.categoria}
                  </span>
                </div>
              </div>

              {/* Precios */}
              <div className="grid grid-cols-2 gap-3 mb-3 pb-3 border-b border-slate-100">
                {!esReadOnly && (
                  <div>
                    <div className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Costo</div>
                    <div className="text-sm font-medium text-slate-600">{formatCurrency(articulo.costo)}</div>
                  </div>
                )}
                <div className={!esReadOnly ? '' : 'col-span-2'}>
                  <div className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">
                    {esReadOnly ? 'Precio Contado' : 'Venta'}
                  </div>
                  <div className="text-lg font-bold text-blue-600">{formatCurrency(articulo.precioContado || 0)}</div>
                  {!esReadOnly && articulo.precios.length > 0 && (
                    <div className="text-xs text-slate-500 mt-0.5">{articulo.precios.length} opciones crédito</div>
                  )}
                </div>
              </div>

              {/* Valor Inventario y Stock */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <div className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">
                    {esReadOnly ? 'Venta Crédito' : 'Valor Inventario'}
                  </div>
                  {esReadOnly ? (
                    <div className="text-sm font-bold text-slate-900">
                      {articulo.precios.length > 0 ? formatCurrency(articulo.precios[0].precio) : 'N/A'}
                    </div>
                  ) : (
                    <div className="text-sm font-bold text-slate-900">
                      {formatCurrency(((articulo.precioContado !== undefined ? Number(articulo.precioContado) : Number(articulo.costo)) * Number(articulo.stock)) || 0)}
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Stock</div>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                    articulo.stock <= articulo.stockMinimo
                      ? 'bg-rose-50 text-rose-700 border border-rose-100'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                  }`}>
                    {articulo.stock} un.
                  </span>
                </div>
              </div>

              {/* Acciones */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button 
                  type="button"
                  onClick={() => openDetalle(articulo)}
                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Ver detalle"
                >
                  <Eye className="w-4 h-4" />
                </button>
                {puedeEditar && (
                  <button 
                    type="button"
                    onClick={() => openEditar(articulo)}
                    className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                )}
                {puedeEliminar && (
                  <button 
                    onClick={() => handleEliminar(articulo)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Archivar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Paginación Móvil */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-4">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-slate-500 font-medium">
              <span className="text-center">
                Mostrando {showingFrom} a {showingTo} de {articulosOrdenados.length}
              </span>
              <div className="flex gap-2 w-full sm:w-auto">
                <button 
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="flex-1 sm:flex-none px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-slate-700"
                >
                  Anterior
                </button>
                <button 
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="flex-1 sm:flex-none px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-slate-700"
                >
                  Siguiente
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* Modal Crear/Editar - Solo roles con permisos */}
      {(puedeCrear || puedeEditar) && (showNuevoModal || showEditarModal) && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
          onClick={() => {
            setShowNuevoModal(false)
            setShowEditarModal(false)
            setArticuloSeleccionado(null)
          }}
        >
          <div
            className="w-full max-w-4xl rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Inventario</p>
                <h3 className="text-lg font-bold text-slate-900">
                  {showEditarModal ? 'Editar Artículo' : 'Nuevo Artículo'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowNuevoModal(false)
                  setShowEditarModal(false)
                  setArticuloSeleccionado(null)
                }}
                className="p-2 rounded-xl hover:bg-slate-100 text-slate-500"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <FieldLabel required className="text-sm font-bold text-slate-700 mb-0">Nombre</FieldLabel>
                  <input
                    value={formData.nombre}
                    onChange={(e) => setFormData((p) => ({ ...p, nombre: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900"
                    placeholder='Ej: Televisor Smart TV 50"'
                  />
                </div>
                <div className="space-y-2">
                  <FieldLabel required className="text-sm font-bold text-slate-700 mb-0">Código</FieldLabel>
                  <input
                    value={formData.codigo}
                    onChange={(e) => setFormData((p) => ({ ...p, codigo: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900"
                    placeholder="SKU"
                  />
                </div>
                {/* Categoría: Replaced with SelectCategoria */}
                <div className="space-y-2">
                  <SelectCategoria
                    tipo="ARTICULO"
                    label="Categoría"
                    required
                    placeholder="Seleccionar..."
                    value={formData.categoriaId}
                    onChange={(val) => setFormData(p => ({ ...p, categoriaId: val, categoria: '' }))}
                    onCreated={(nueva) => {
                      setCategorias(prev => [...prev, nueva]);
                    }}
                  />
                  {!formData.categoriaId && formData.categoria && (
                      <p className="text-xs text-amber-600 font-medium">
                          Categoría actual: {formData.categoria} (Seleccione una nueva para actualizar)
                      </p>
                  )}
                </div>
                <div className="space-y-2">
                  <FieldLabel className="text-sm font-bold text-slate-700 mb-0">Marca</FieldLabel>
                  <input
                    value={formData.marca}
                    onChange={(e) => setFormData((p) => ({ ...p, marca: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900"
                    placeholder="Ej: Samsung"
                  />
                </div>
                <div className="space-y-2">
                  <FieldLabel className="text-sm font-bold text-slate-700 mb-0">Modelo</FieldLabel>
                  <input
                    value={formData.modelo}
                    onChange={(e) => setFormData((p) => ({ ...p, modelo: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900"
                    placeholder="Ej: UN50AU7000"
                  />
                </div>
                <div className="space-y-2">
                  <FieldLabel required className="text-sm font-bold text-slate-700 mb-0">Costo</FieldLabel>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formData.costo}
                      onChange={(e) => setFormData((p) => ({ ...p, costo: formatCOPInputValue(e.target.value) }))}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white font-bold text-slate-900"
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <FieldLabel required className="text-sm font-bold text-blue-700 mb-0">Precio de Contado</FieldLabel>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-blue-400" />
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formData.precioContado}
                      onChange={(e) => setFormData((p) => ({ ...p, precioContado: formatCOPInputValue(e.target.value) }))}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-blue-200 bg-blue-50/30 font-black text-blue-900 focus:ring-2 focus:ring-blue-500/20 outline-none"
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <FieldLabel className="text-sm font-bold text-slate-700 mb-0">Stock</FieldLabel>
                  <input
                    inputMode="numeric"
                    value={formData.stock}
                    onChange={(e) => setFormData((p) => ({ ...p, stock: e.target.value.replace(/\D/g, '') }))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900"
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <FieldLabel className="text-sm font-bold text-slate-700 mb-0">Stock mínimo</FieldLabel>
                  <input
                    inputMode="numeric"
                    value={formData.stockMinimo}
                    onChange={(e) => setFormData((p) => ({ ...p, stockMinimo: e.target.value.replace(/\D/g, '') }))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900"
                    placeholder="0"
                  />
                </div>
                {showEditarModal && (
                  <div className="md:col-span-2 space-y-2">
                    <FieldLabel className="text-sm font-bold text-slate-700 mb-0">Descripción</FieldLabel>
                    <textarea
                      value={formData.descripcion}
                      onChange={(e) => setFormData((p) => ({ ...p, descripcion: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 resize-none h-24"
                      placeholder="Detalles adicionales..."
                    />
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Precios a crédito</p>
                    <p className="text-sm font-bold text-slate-900">Opciones de cuotas</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={nuevaCuota.meses}
                      onChange={(e) => setNuevaCuota((p) => ({ ...p, meses: Number(e.target.value) }))}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-900"
                    >
                      {[1, 2, 3, 4, 5, 6, 9, 12, 18, 24].map((m) => (
                        <option key={m} value={m}>
                          {m} mes{m > 1 ? 'es' : ''}
                        </option>
                      ))}
                    </select>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <input
                        type="text"
                        inputMode="numeric"
                        value={nuevaCuota.precio}
                        onChange={(e) => setNuevaCuota((p) => ({ ...p, precio: formatCOPInputValue(e.target.value) }))}
                        className="w-44 pl-10 pr-4 py-2 rounded-xl border border-slate-200 bg-white font-bold text-slate-900"
                        placeholder="0"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={addPrecioCuota}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500 text-white text-sm font-bold hover:bg-orange-600"
                    >
                      <Plus className="h-4 w-4" />
                      Agregar
                    </button>
                  </div>
                </div>

                {formData.precios.length === 0 ? (
                  <div className="text-sm font-medium text-slate-500">Aún no hay precios por cuotas.</div>
                ) : (
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="divide-y divide-slate-100">
                      {formData.precios.map((p, idx) => (
                        <div key={`${p.meses}-${idx}`} className="flex items-center justify-between px-4 py-3">
                          <div className="text-sm font-bold text-slate-900">{p.meses} meses</div>
                          <div className="flex items-center gap-3">
                            <div className="text-sm font-bold text-slate-900">{formatCurrency(p.precio)}</div>
                            <button
                              type="button"
                              onClick={() => removePrecioCuota(idx)}
                              className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowNuevoModal(false)
                  setShowEditarModal(false)
                  setArticuloSeleccionado(null)
                }}
                className="px-5 py-3 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleGuardar}
                className="px-6 py-3 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Eliminar - Solo roles con permiso */}
      {puedeEliminar && showEliminarModal && articuloSeleccionado && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
          onClick={() => {
            setShowEliminarModal(false)
            setArticuloSeleccionado(null)
          }}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white border border-slate-200 shadow-2xl p-6 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-100">
              <Trash2 className="h-8 w-8 text-rose-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">¿Archivar artículo?</h3>
            <p className="text-slate-500 text-sm mb-6 font-medium">
              Estás a punto de archivar <span className="font-bold text-slate-900">{articuloSeleccionado.nombre}</span> del inventario.
              Podrá ser restaurado desde la sección de Archivados.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                type="button"
                onClick={() => {
                  setShowEliminarModal(false)
                  setArticuloSeleccionado(null)
                }}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all duration-200"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarEliminar}
                className="px-6 py-2.5 rounded-xl bg-rose-500 text-white text-sm font-bold hover:bg-rose-600 active:bg-rose-700 transition-all duration-200 shadow-sm shadow-rose-200"
              >
                Sí, archivar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detalle - Todos los roles */}
      {showDetalleModal && articuloSeleccionado && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
          onClick={() => {
            setShowDetalleModal(false)
            setArticuloSeleccionado(null)
          }}
        >
          <div
            className="w-full max-w-2xl rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{esReadOnly ? 'Catálogo' : 'Inventario'}</p>
                <h3 className="text-lg font-bold text-slate-900">{esReadOnly ? 'Detalles del Artículo' : 'Detalle del Artículo'}</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowDetalleModal(false)
                  setArticuloSeleccionado(null)
                }}
                className="p-2 rounded-xl hover:bg-slate-100 text-slate-500"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-500 uppercase">Artículo</div>
                  <div className="text-xl font-bold text-slate-900">{articuloSeleccionado.nombre}</div>
                  <div className="text-xs text-slate-500 font-mono">SKU: {articuloSeleccionado.codigo}</div>
                </div>
                {puedeEditar && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowDetalleModal(false)
                      openEditar(articuloSeleccionado)
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50"
                  >
                    <Pencil className="h-4 w-4" />
                    Editar
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                  <div className="text-xs font-bold text-slate-500 uppercase">Categoría</div>
                  <div className="mt-1 font-bold text-slate-900">{articuloSeleccionado.categoria}</div>
                </div>
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                  <div className="text-xs font-bold text-slate-500 uppercase">Marca / Modelo</div>
                  <div className="mt-1 font-bold text-slate-900">{articuloSeleccionado.marca} {articuloSeleccionado.modelo}</div>
                </div>
                <div className="p-4 rounded-xl border border-blue-200 bg-blue-50">
                  <div className="text-xs font-bold text-blue-500 uppercase">{esReadOnly ? 'Precio Contado' : 'Precio de Contado'}</div>
                  <div className="mt-1 font-black text-blue-900 text-lg">{formatCurrency(articuloSeleccionado.precioContado || 0)}</div>
                </div>
                {!esReadOnly && (
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                    <div className="text-xs font-bold text-slate-500 uppercase">Costo</div>
                    <div className="mt-1 font-bold text-slate-900">{formatCurrency(articuloSeleccionado.costo)}</div>
                  </div>
                )}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                  <div className="text-xs font-bold text-slate-500 uppercase">Stock Actual</div>
                  <div className="mt-1 font-bold text-slate-900">{articuloSeleccionado.stock} unidades</div>
                </div>
              </div>

              <div>
                <div className="text-xs font-bold text-slate-500 uppercase">{esReadOnly ? 'Opciones de Financiación Sugeridas' : 'Precios a crédito'}</div>
                {articuloSeleccionado.precios.length === 0 ? (
                  <div className="mt-2 text-sm font-medium text-slate-500">Sin opciones registradas.</div>
                ) : (
                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {articuloSeleccionado.precios.map((p, idx) => (
                      <div key={`${p.meses}-${idx}`} className={`p-4 rounded-xl border ${esReadOnly ? 'border-blue-100 shadow-sm bg-blue-50/50' : 'border-slate-200 bg-white'}`}>
                        <div className={`text-xs font-bold uppercase ${esReadOnly ? 'text-blue-600' : 'text-slate-500'}`}>{p.meses} {esReadOnly ? 'Meses' : 'meses'}</div>
                        <div className="mt-1 font-bold text-slate-900 text-lg">{formatCurrency(p.precio)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowDetalleModal(false)
                  setArticuloSeleccionado(null)
                }}
                className={`px-5 py-3 rounded-xl text-sm font-bold ${esReadOnly ? 'bg-slate-900 text-white active:scale-95' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'} transition-all`}
              >
                {esReadOnly ? 'Cerrar Consulta' : 'Cerrar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <IngresoMercanciaModal
        isOpen={showIngresoMercanciaModal}
        onClose={() => setShowIngresoMercanciaModal(false)}
        articulos={articulos.map((a) => ({ id: a.id, nombre: a.nombre, codigo: a.codigo, stock: a.stock }))}
        onSuccess={() => {
          fetchArticulos()
          fetchStats()
        }}
      />
    </div>
  )
}
