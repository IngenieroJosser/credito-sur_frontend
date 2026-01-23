'use client'

import Link from 'next/link'
import { useState } from 'react'
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
  Activity,
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
            <Link
              href="/admin/articulos/nuevo"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-xl hover:border-slate-400 hover:bg-slate-50 transition-all duration-200 shadow-sm font-bold text-sm group"
            >
              <Plus className="w-4 h-4 text-slate-500 group-hover:text-slate-900 transition-colors" />
              <span>Nuevo Artículo</span>
            </Link>
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
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none text-sm text-slate-900 placeholder:text-slate-400 transition-all"
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
                        <Link 
                          href={`/admin/articulos/${articulo.id}`}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Ver detalle"
                        >
                          <Activity className="w-4 h-4" />
                        </Link>
                        <Link 
                          href={`/admin/articulos/${articulo.id}/editar`}
                          className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </Link>
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


    </div>
  )
}
