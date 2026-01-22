'use client'

import { useState } from 'react'
import {
  Package,
  Search,
  Filter,
  Plus,
  MoreVertical,
  Download,
  Trash2,
  Edit2,
  AlertCircle,
  TrendingUp,
  Tag,
  DollarSign,
  X,
  Save,
  Activity,
  Layers,
  Box,
  Pencil
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

// Mock Data
interface PrecioPlazo {
  meses: number
  precio: number
}

interface Articulo {
  id: string
  nombre: string
  codigo: string
  descripcion?: string
  categoria: string
  marca: string
  modelo: string
  costo: number
  stock: number
  stockMinimo: number
  estado: 'activo' | 'inactivo'
  precios: PrecioPlazo[]
}

const ARTICULOS_MOCK: Articulo[] = [
  {
    id: '1',
    nombre: 'Televisor Smart TV 50"',
    codigo: 'TV-50-SMART',
    descripcion: 'Televisor 4K UHD con Smart Hub',
    categoria: 'Electrónica',
    marca: 'Samsung',
    modelo: 'UN50AU7000',
    costo: 1200000,
    stock: 15,
    stockMinimo: 5,
    estado: 'activo',
    precios: [
      { meses: 1, precio: 1800000 },
      { meses: 3, precio: 2100000 },
      { meses: 6, precio: 2400000 }
    ]
  },
  {
    id: '2',
    nombre: 'Lavadora 18kg Carga Superior',
    codigo: 'LAV-18-CS',
    categoria: 'Hogar',
    marca: 'LG',
    modelo: 'WT18WP',
    costo: 1500000,
    stock: 8,
    stockMinimo: 3,
    estado: 'activo',
    precios: [
      { meses: 1, precio: 2300000 },
      { meses: 6, precio: 2900000 },
      { meses: 12, precio: 3500000 }
    ]
  },
  {
    id: '3',
    nombre: 'Celular Gama Media 128GB',
    codigo: 'CEL-GM-128',
    categoria: 'Tecnología',
    marca: 'Xiaomi',
    modelo: 'Redmi Note 12',
    costo: 600000,
    stock: 4,
    stockMinimo: 10,
    estado: 'activo',
    precios: [
      { meses: 1, precio: 950000 },
      { meses: 3, precio: 1100000 }
    ]
  }
]

export default function ArticulosPage() {
  const [articulos, setArticulos] = useState<Articulo[]>(ARTICULOS_MOCK)
  const [busqueda, setBusqueda] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  
  // Form State
  const initialFormState = {
    nombre: '',
    codigo: '',
    descripcion: '',
    categoria: '',
    marca: '',
    modelo: '',
    costo: 0,
    stock: 0,
    stockMinimo: 0,
    precios: [] as PrecioPlazo[]
  }
  const [formData, setFormData] = useState(initialFormState)
  const [nuevoPlazo, setNuevoPlazo] = useState({ meses: 1, precio: 0 })

  const handleOpenModal = (articulo?: Articulo) => {
    if (articulo) {
      setFormData({
        nombre: articulo.nombre,
        codigo: articulo.codigo,
        descripcion: articulo.descripcion || '',
        categoria: articulo.categoria,
        marca: articulo.marca,
        modelo: articulo.modelo,
        costo: articulo.costo,
        stock: articulo.stock,
        stockMinimo: articulo.stockMinimo,
        precios: [...articulo.precios]
      })
    } else {
      setFormData(initialFormState)
    }
    setModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    await new Promise(resolve => setTimeout(resolve, 1000))
    setLoading(false)
    setModalOpen(false)
    // Lógica de guardado real aquí
  }

  const addPrecioPlazo = () => {
    if (nuevoPlazo.meses > 0 && nuevoPlazo.precio > 0) {
      setFormData(prev => ({
        ...prev,
        precios: [...prev.precios, nuevoPlazo].sort((a, b) => a.meses - b.meses)
      }))
      setNuevoPlazo({ meses: 1, precio: 0 })
    }
  }

  const removePrecioPlazo = (index: number) => {
    setFormData(prev => ({
      ...prev,
      precios: prev.precios.filter((_, i) => i !== index)
    }))
  }

  const articulosFiltrados = articulos.filter(
    (a) =>
      a.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      a.codigo.toLowerCase().includes(busqueda.toLowerCase()) ||
      a.categoria.toLowerCase().includes(busqueda.toLowerCase())
  )

  const handleEliminar = (id: string) => {
    if (window.confirm('¿Estás seguro de eliminar este artículo?')) {
      setArticulos(articulos.filter((a) => a.id !== id))
    }
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
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-xs text-slate-600 tracking-wide font-bold border border-slate-200 mb-2">
                <Package className="h-3.5 w-3.5" />
                <span>Gestión de Inventario</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                <span className="text-blue-600">Catálogo de </span><span className="text-orange-500">Artículos</span>
              </h1>
              <p className="text-slate-500 mt-2 font-medium">
                Gestiona el inventario, costos y precios de venta.
              </p>
            </div>
            <button
              onClick={() => handleOpenModal()}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-xl hover:border-slate-400 hover:bg-slate-50 transition-all duration-200 shadow-sm font-bold text-sm group"
            >
              <Plus className="w-4 h-4 text-slate-500 group-hover:text-slate-900 transition-colors" />
              <span>Nuevo Artículo</span>
            </button>
        </header>

        <div className="space-y-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 group">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-slate-50 text-slate-600 rounded-xl group-hover:scale-110 transition-transform duration-300">
                <Package className="w-6 h-6" />
              </div>
              <span className="flex items-center text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                <TrendingUp className="w-3 h-3 mr-1" />
                +12%
              </span>
            </div>
            <p className="text-sm font-medium text-slate-500">Total Artículos</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">145</h3>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 group">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl group-hover:scale-110 transition-transform duration-300">
                <Tag className="w-6 h-6" />
              </div>
              <span className="flex items-center text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                Activos
              </span>
            </div>
            <p className="text-sm font-medium text-slate-500">En Stock</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">128</h3>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 group">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl group-hover:scale-110 transition-transform duration-300">
                <AlertCircle className="w-6 h-6" />
              </div>
              <span className="flex items-center text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">
                Atención
              </span>
            </div>
            <p className="text-sm font-medium text-slate-500">Stock Bajo</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">12</h3>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 group">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl group-hover:scale-110 transition-transform duration-300">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>
            <p className="text-sm font-medium text-slate-500">Valor Inventario</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">$45.2M</h3>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por nombre, código o categoría..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none text-sm transition-all"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
            
            <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
              <button className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-medium shadow-sm whitespace-nowrap">
                <Filter className="w-4 h-4" />
                Todos
              </button>
              <button className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all text-sm font-medium whitespace-nowrap">
                Stock Bajo
              </button>
              <button className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all text-sm font-medium whitespace-nowrap">
                <Download className="w-4 h-4" />
                Exportar
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50/50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Artículo</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Categoría</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Costo</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Precio Base (1 mes)</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Stock</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {articulosFiltrados.map((articulo) => (
                  <tr key={articulo.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                          <Package className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-900">{articulo.nombre}</div>
                          <div className="text-xs text-slate-500">SKU: {articulo.codigo}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                        {articulo.categoria}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-600">
                      {formatCurrency(articulo.costo)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm font-bold text-slate-900">
                        {articulo.precios.length > 0 
                          ? formatCurrency(articulo.precios[0].precio)
                          : '$0'}
                      </div>
                      <div className="text-xs text-slate-500 font-medium">
                        {articulo.precios.length} opciones de plazo
                      </div>
                    </td>
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
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Ver detalle"
                        >
                          <Activity className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleOpenModal(articulo)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleEliminar(articulo.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Eliminar"
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
          
          {/* Pagination */}
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/30 flex items-center justify-between">
            <div className="text-sm text-slate-500">
              Mostrando <span className="font-medium text-slate-900">1</span> a <span className="font-medium text-slate-900">{articulosFiltrados.length}</span> de <span className="font-medium text-slate-900">{articulos.length}</span> resultados
            </div>
            <div className="flex gap-2">
              <button className="px-3 py-1 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 text-slate-600" disabled>
                Anterior
              </button>
              <button className="px-3 py-1 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600">
                Siguiente
              </button>
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* Modal Nuevo/Editar Artículo */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div 
            className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm transition-opacity"
            onClick={() => setModalOpen(false)}
          />
          
          <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl ring-1 ring-slate-900/5 transform transition-all animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50 sticky top-0 z-10 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {formData.codigo ? 'Editar Artículo' : 'Nuevo Artículo'}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">Gestione la información del producto</p>
                </div>
              </div>
              <button 
                onClick={() => setModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-8">
              {/* Información General */}
              <div className="space-y-4">
                <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900 uppercase tracking-wider">
                  <Layers className="w-4 h-4 text-blue-600" />
                  Información Básica
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500">Nombre del Producto</label>
                    <input
                      type="text"
                      value={formData.nombre}
                      onChange={e => setFormData({...formData, nombre: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all font-medium text-slate-900"
                      placeholder="Ej: Televisor Smart TV 50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500">Código (SKU)</label>
                    <input
                      type="text"
                      value={formData.codigo}
                      onChange={e => setFormData({...formData, codigo: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all font-medium text-slate-900"
                      placeholder="Ej: TV-50-SMART"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500">Categoría</label>
                    <select
                      value={formData.categoria}
                      onChange={e => setFormData({...formData, categoria: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all font-medium text-slate-900"
                    >
                      <option value="">Seleccionar...</option>
                      <option value="Electrónica">Electrónica</option>
                      <option value="Hogar">Hogar</option>
                      <option value="Tecnología">Tecnología</option>
                      <option value="Muebles">Muebles</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500">Descripción</label>
                    <textarea
                      rows={2}
                      value={formData.descripcion}
                      onChange={e => setFormData({...formData, descripcion: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all font-medium text-slate-900 resize-none"
                      placeholder="Breve descripción del producto..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500">Marca</label>
                      <input
                        type="text"
                        value={formData.marca}
                        onChange={e => setFormData({...formData, marca: e.target.value})}
                        className="w-full px-4 py-2.5 rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all font-medium text-slate-900"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500">Modelo</label>
                      <input
                        type="text"
                        value={formData.modelo}
                        onChange={e => setFormData({...formData, modelo: e.target.value})}
                        className="w-full px-4 py-2.5 rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all font-medium text-slate-900"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="h-px bg-slate-100" />

              {/* Inventario y Costos */}
              <div className="space-y-4">
                <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900 uppercase tracking-wider">
                  <Box className="w-4 h-4 text-orange-500" />
                  Inventario y Costos
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500">Costo Unitario</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="number"
                        value={formData.costo}
                        onChange={e => setFormData({...formData, costo: Number(e.target.value)})}
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all font-medium text-slate-900"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500">Stock Actual</label>
                    <input
                      type="number"
                      value={formData.stock}
                      onChange={e => setFormData({...formData, stock: Number(e.target.value)})}
                      className="w-full px-4 py-2.5 rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all font-medium text-slate-900"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500">Stock Mínimo</label>
                    <input
                      type="number"
                      value={formData.stockMinimo}
                      onChange={e => setFormData({...formData, stockMinimo: Number(e.target.value)})}
                      className="w-full px-4 py-2.5 rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all font-medium text-slate-900"
                    />
                  </div>
                </div>
              </div>

              <div className="h-px bg-slate-100" />

              {/* Precios a Crédito */}
              <div className="space-y-4">
                <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900 uppercase tracking-wider">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  Precios de Venta a Crédito
                </h4>
                <div className="bg-slate-50 rounded-xl p-4 space-y-4">
                  <div className="flex gap-4 items-end">
                    <div className="space-y-2 flex-1">
                      <label className="text-xs font-bold text-slate-500">Plazo (Meses)</label>
                      <input
                        type="number"
                        min="1"
                        value={nuevoPlazo.meses}
                        onChange={e => setNuevoPlazo({...nuevoPlazo, meses: Number(e.target.value)})}
                        className="w-full px-4 py-2.5 rounded-xl border-slate-200 bg-white focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all font-medium text-slate-900"
                      />
                    </div>
                    <div className="space-y-2 flex-1">
                      <label className="text-xs font-bold text-slate-500">Precio Total</label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                          type="number"
                          value={nuevoPlazo.precio}
                          onChange={e => setNuevoPlazo({...nuevoPlazo, precio: Number(e.target.value)})}
                          className="w-full pl-9 pr-4 py-2.5 rounded-xl border-slate-200 bg-white focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all font-medium text-slate-900"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={addPrecioPlazo}
                      className="px-4 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all font-bold text-sm"
                    >
                      Agregar
                    </button>
                  </div>

                  {formData.precios.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
                      {formData.precios.map((precio, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl shadow-sm">
                          <div>
                            <div className="text-sm font-bold text-slate-900">{precio.meses} Meses</div>
                            <div className="text-xs text-emerald-600 font-bold">{formatCurrency(precio.precio)}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removePrecioPlazo(index)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors text-sm font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all text-sm font-bold flex items-center gap-2 shadow-lg shadow-slate-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      <span>Guardar Artículo</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
