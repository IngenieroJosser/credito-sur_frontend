'use client'

import { useState, useEffect } from 'react'
import {
  Package,
  Search,
  Eye,
  XCircle,
  Tag,
  AlertCircle
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

// Reutilizamos el tipo y mock de la vista de admin
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
  marca: string
  modelo: string
  costo: number
  precioContado?: number
  stock: number
  stockMinimo: number
  estado: 'activo' | 'inactivo'
  precios: PrecioCuota[]
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
    precioContado: 1600000,
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
    precioContado: 2100000,
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
    precioContado: 850000,
    stock: 4,
    stockMinimo: 10,
    estado: 'activo',
    precios: [
      { meses: 1, precio: 950000 },
      { meses: 3, precio: 1100000 }
    ]
  }
]

export default function CatalogArticulosCoordinador() {
  const [articulos] = useState<Articulo[]>(ARTICULOS_MOCK)
  const [busqueda, setBusqueda] = useState('')
  const [showDetalleModal, setShowDetalleModal] = useState(false)
  const [articuloSeleccionado, setArticuloSeleccionado] = useState<Articulo | null>(null)
  const [mounted, setMounted] = useState(false) // Added for useEffect fix

  const articulosFiltrados = articulos.filter(
    (a) =>
      a.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      a.codigo.toLowerCase().includes(busqueda.toLowerCase()) ||
      a.categoria.toLowerCase().includes(busqueda.toLowerCase())
  )

  const openDetalle = (articulo: Articulo) => {
    setArticuloSeleccionado(articulo)
    setShowDetalleModal(true)
  }

  // Fix synchronous setState in useEffect
  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true)
    }, 0)
    return () => clearTimeout(timer)
  }, [])

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-slate-50 relative">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-blue-500 opacity-20 blur-[100px]"></div>
      </div>

      <div className="relative z-10 px-6 md:px-8 py-8 space-y-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-xs text-slate-600 tracking-wide font-bold border border-slate-200 mb-2">
              <Package className="h-3.5 w-3.5" />
              <span>Catálogo de Consulta</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              <span className="text-blue-600">Nuestros </span><span className="text-orange-500">Artículos</span>
            </h1>
            <p className="text-slate-500 mt-2 font-medium">
              Consulta el catálogo disponible, existencias y precios de venta para clientes.
            </p>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm group">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                <Package className="w-6 h-6" />
              </div>
            </div>
            <p className="text-sm font-medium text-slate-500">Total Referencias</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{articulos.length}</h3>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm group">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                <Tag className="w-6 h-6" />
              </div>
            </div>
            <p className="text-sm font-medium text-slate-500">Disponibles</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{articulos.filter(a => a.stock > 0).length}</h3>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm group">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                <AlertCircle className="w-6 h-6" />
              </div>
            </div>
            <p className="text-sm font-medium text-slate-500">Stock Bajo</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{articulos.filter(a => a.stock <= a.stockMinimo).length}</h3>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar artículos..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-sm"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50/50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Artículo</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Categoría</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Precio Contado</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Venta Crédito</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Stock</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {articulosFiltrados.map((articulo) => (
                  <tr key={articulo.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                          <Package className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-900">{articulo.nombre}</div>
                          <div className="text-xs text-slate-500">{articulo.codigo}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-slate-600">{articulo.categoria}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm font-bold text-blue-600">
                        {formatCurrency(articulo.precioContado || 0)}
                      </div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Contado</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm font-bold text-slate-900">
                        {articulo.precios.length > 0 ? formatCurrency(articulo.precios[0].precio) : 'N/A'}
                      </div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Base Crédito</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        articulo.stock <= articulo.stockMinimo ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                      }`}>
                        {articulo.stock} un.
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button 
                        onClick={() => openDetalle(articulo)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showDetalleModal && articuloSeleccionado && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Detalles del Artículo</h3>
              <button onClick={() => setShowDetalleModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <XCircle className="h-5 w-5 text-slate-400" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <p className="text-xs font-bold text-slate-500 uppercase">Nombre</p>
                  <p className="text-sm font-bold text-slate-900">{articuloSeleccionado.nombre}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <p className="text-xs font-bold text-slate-500 uppercase">Código</p>
                  <p className="text-sm font-bold text-slate-900">{articuloSeleccionado.codigo}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <p className="text-xs font-bold text-slate-500 uppercase">Marca / Modelo</p>
                  <p className="text-sm font-bold text-slate-900">{articuloSeleccionado.marca} / {articuloSeleccionado.modelo}</p>
                </div>
                <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
                  <p className="text-xs font-bold text-blue-500 uppercase tracking-wider">Precio Contado</p>
                  <p className="text-lg font-black text-blue-900">{formatCurrency(articuloSeleccionado.precioContado || 0)}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <p className="text-xs font-bold text-slate-500 uppercase">Stock Actual</p>
                  <p className="text-sm font-bold text-slate-900">{articuloSeleccionado.stock} unidades</p>
                </div>
              </div>
              
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase mb-3">Opciones de Financiación Sugeridas</p>
                <div className="grid grid-cols-2 gap-3">
                  {articuloSeleccionado.precios.map((p, idx) => (
                    <div key={idx} className="p-4 rounded-xl border border-blue-100 shadow-sm bg-blue-50/50">
                      <p className="text-xs font-bold text-blue-600 uppercase">{p.meses} Meses</p>
                      <p className="text-lg font-bold text-slate-900">{formatCurrency(p.precio)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button onClick={() => setShowDetalleModal(false)} className="px-6 py-2 bg-slate-900 text-white font-bold rounded-xl active:scale-95 transition-all">
                Cerrar Consulta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
