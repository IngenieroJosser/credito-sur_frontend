'use client'

import { useState } from 'react'
import {
  Package,
  DollarSign,
  Plus,
  Search,
  ChevronRight,
  Tag,
  Archive
} from 'lucide-react'
import Link from 'next/link'

// Interfaces alineadas con Prisma (Producto + PrecioProducto)
interface PrecioProducto {
  id: string
  meses: number
  precio: number
  activo: boolean
}

interface Producto {
  id: string
  codigo: string
  nombre: string
  categoria: string
  marca: string
  modelo: string
  costo: number
  stock: number
  stockMinimo: number
  activo: boolean
  precios: PrecioProducto[]
}

const ArticulosPage = () => {
  const [busqueda, setBusqueda] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('TODAS')

  // Datos de ejemplo basados en el esquema
  const productos: Producto[] = [
    {
      id: '1',
      codigo: 'TV-50-UHD',
      nombre: 'Televisor 50" UHD 4K',
      categoria: 'Electrodomésticos',
      marca: 'Samsung',
      modelo: 'AU7000',
      costo: 350.00,
      stock: 12,
      stockMinimo: 5,
      activo: true,
      precios: [
        { id: 'p1', meses: 6, precio: 450.00, activo: true },
        { id: 'p2', meses: 12, precio: 520.00, activo: true }
      ]
    },
    {
      id: '2',
      codigo: 'REF-14-FT',
      nombre: 'Refrigerador 14 pies',
      categoria: 'Línea Blanca',
      marca: 'Mabe',
      modelo: 'RMA14',
      costo: 420.00,
      stock: 2,
      stockMinimo: 3,
      activo: true,
      precios: [
        { id: 'p3', meses: 12, precio: 690.00, activo: true },
        { id: 'p4', meses: 18, precio: 750.00, activo: true }
      ]
    },
    {
      id: '3',
      codigo: 'LAV-14-KG',
      nombre: 'Lavadora Automática 14kg',
      categoria: 'Línea Blanca',
      marca: 'Whirlpool',
      modelo: 'WWI14',
      costo: 280.00,
      stock: 8,
      stockMinimo: 4,
      activo: true,
      precios: [
        { id: 'p5', meses: 10, precio: 430.00, activo: true }
      ]
    },
    {
      id: '4',
      codigo: 'LIC-PRO',
      nombre: 'Licuadora Profesional',
      categoria: 'Pequeños Electrodomésticos',
      marca: 'Oster',
      modelo: 'BLST',
      costo: 85.00,
      stock: 15,
      stockMinimo: 10,
      activo: true,
      precios: [
        { id: 'p6', meses: 3, precio: 120.00, activo: true }
      ]
    }
  ]

  // Formateador de moneda (VES)
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: 'VES',
      minimumFractionDigits: 2
    }).format(amount)
  }

  const productosFiltrados = productos.filter((prod) => {
    const coincideBusqueda = 
      prod.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      prod.codigo.toLowerCase().includes(busqueda.toLowerCase()) ||
      prod.marca.toLowerCase().includes(busqueda.toLowerCase())
    
    const coincideCategoria = filtroCategoria === 'TODAS' || prod.categoria === filtroCategoria

    return coincideBusqueda && coincideCategoria
  })

  // Métricas
  const totalValorInventario = productos.reduce((acc, curr) => acc + (curr.costo * curr.stock), 0)
  const productosBajoStock = productos.filter(p => p.stock <= p.stockMinimo).length
  const totalReferencias = productos.length

  // Obtener categorías únicas
  const categorias = ['TODAS', ...Array.from(new Set(productos.map(p => p.categoria)))]

  return (
    <div className="min-h-screen bg-gray-50/50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-light text-gray-800">Catálogo de Artículos</h1>
            <p className="text-sm text-gray-500 mt-1">Gestión de inventario y precios de crédito</p>
          </div>
          <Link
            href="/admin/articulos/nuevo"
            className="inline-flex items-center px-4 py-2 bg-[#08557f] text-white rounded-lg hover:bg-[#063a58] transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            <span>Nuevo Artículo</span>
          </Link>
        </div>

        {/* Tarjetas de Resumen */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-50 text-[#08557f] rounded-lg">
                <Tag className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium text-gray-500">Total Referencias</span>
            </div>
            <div className="text-2xl font-semibold text-gray-900">{totalReferencias}</div>
            <p className="text-xs text-gray-400 mt-1">Productos activos en catálogo</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <DollarSign className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium text-gray-500">Valor Inventario</span>
            </div>
            <div className="text-2xl font-semibold text-gray-900">{formatCurrency(totalValorInventario)}</div>
            <p className="text-xs text-gray-400 mt-1">Costo base total</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
                <Archive className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium text-gray-500">Por Reordenar</span>
            </div>
            <div className="text-2xl font-semibold text-gray-900">{productosBajoStock}</div>
            <p className="text-xs text-orange-500 mt-1 font-medium">
              {productosBajoStock > 0 ? 'Requiere atención inmediata' : 'Stock saludable'}
            </p>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, código o marca..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
            {categorias.map(cat => (
              <button
                key={cat}
                onClick={() => setFiltroCategoria(cat)}
                className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
                  filtroCategoria === cat
                    ? 'bg-[#08557f] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Grid de Productos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {productosFiltrados.map((producto) => (
            <div key={producto.id} className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 group">
              <div className="p-5">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-50 text-[#08557f] rounded-lg group-hover:bg-[#08557f] group-hover:text-white transition-colors">
                      <Package className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 group-hover:text-[#08557f] transition-colors">{producto.nombre}</h3>
                      <p className="text-xs text-gray-500">{producto.marca} • {producto.modelo}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    producto.activo ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {producto.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Código</span>
                    <span className="font-mono text-gray-700">{producto.codigo}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Costo Base</span>
                    <span className="font-medium text-gray-900">{formatCurrency(producto.costo)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Stock Mínimo</span>
                    <span className="text-gray-700">{producto.stockMinimo} u.</span>
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-4">
                  <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Planes de Crédito</div>
                  <div className="space-y-2">
                    {producto.precios.map(precio => (
                      <div key={precio.id} className="flex justify-between items-center text-sm bg-gray-50 p-2 rounded-lg">
                        <span className="text-gray-600">{precio.meses} Meses</span>
                        <span className="font-medium text-[#08557f]">{formatCurrency(precio.precio)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="px-5 py-3 bg-gray-50 rounded-b-xl border-t border-gray-100 flex justify-between items-center">
                <span className="text-xs text-gray-500">{producto.categoria}</span>
                <button className="text-sm font-medium text-[#08557f] hover:text-[#063a58] flex items-center transition-colors">
                  Editar <ChevronRight className="h-4 w-4 ml-1" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {productosFiltrados.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-100 border-dashed">
            <div className="inline-flex p-4 rounded-full bg-gray-50 mb-4">
              <Package className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No se encontraron artículos</h3>
            <p className="text-gray-500">Intenta con otros términos de búsqueda o filtros.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default ArticulosPage
