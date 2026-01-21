'use client'

import { useState, useEffect } from 'react'
import {
  Package,
  DollarSign,
  Plus,
  Search,
  ChevronRight,
  Tag,
  Archive,
  LayoutGrid
} from 'lucide-react'
import Link from 'next/link'
import { formatCurrency, cn } from '@/lib/utils'

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
  const [mounted, setMounted] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('TODAS')
  const [productos, setProductos] = useState<Producto[]>([])

  useEffect(() => {
    // Usamos setTimeout para evitar advertencias de setState síncrono
    const timer = setTimeout(() => {
      setMounted(true)
      // Datos de ejemplo basados en el esquema
      const datosEjemplo: Producto[] = [
        {
          id: '1',
          codigo: 'TV-50-UHD',
          nombre: 'Televisor 50" UHD 4K',
          categoria: 'Electrodomésticos',
          marca: 'Samsung',
          modelo: 'AU7000',
          costo: 1500000,
          stock: 12,
          stockMinimo: 5,
          activo: true,
          precios: [
            { id: 'p1', meses: 6, precio: 1800000, activo: true },
            { id: 'p2', meses: 12, precio: 2200000, activo: true }
          ]
        },
        {
          id: '2',
          codigo: 'REF-14-FT',
          nombre: 'Refrigerador 14 pies',
          categoria: 'Línea Blanca',
          marca: 'Mabe',
          modelo: 'RMA14',
          costo: 1800000,
          stock: 2,
          stockMinimo: 3,
          activo: true,
          precios: [
            { id: 'p3', meses: 12, precio: 2500000, activo: true },
            { id: 'p4', meses: 18, precio: 2900000, activo: true }
          ]
        },
        {
          id: '3',
          codigo: 'LAV-14-KG',
          nombre: 'Lavadora Automática 14kg',
          categoria: 'Línea Blanca',
          marca: 'Whirlpool',
          modelo: 'WWI14',
          costo: 1200000,
          stock: 8,
          stockMinimo: 4,
          activo: true,
          precios: [
            { id: 'p5', meses: 10, precio: 1600000, activo: true }
          ]
        },
        {
          id: '4',
          codigo: 'LIC-PRO',
          nombre: 'Licuadora Profesional',
          categoria: 'Pequeños Electrodomésticos',
          marca: 'Oster',
          modelo: 'BLST',
          costo: 250000,
          stock: 15,
          stockMinimo: 10,
          activo: true,
          precios: [
            { id: 'p6', meses: 3, precio: 350000, activo: true }
          ]
        }
      ]
      setProductos(datosEjemplo)
    }, 0)

    return () => clearTimeout(timer)
  }, [])

  if (!mounted) return null

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

      <div className="relative z-10 max-w-7xl mx-auto p-6 md:p-12 space-y-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="space-y-4">
             <div className="inline-flex items-center gap-2 self-start px-3 py-1 rounded-full bg-[#08557f]/5 text-xs text-[#08557f] tracking-wide font-medium">
              <Package className="h-3.5 w-3.5" />
              <span>Inventario y Precios</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-light text-gray-900 tracking-tight">
              Catálogo de <span className="font-semibold text-[#08557f]">Artículos</span>
            </h1>
            <p className="text-lg text-gray-500 mt-2 max-w-2xl font-light leading-relaxed">
              Gestión centralizada de inventario, costos y planes de financiamiento.
            </p>
          </div>
          <Link
            href="/admin/articulos/nuevo"
            className="inline-flex items-center gap-2 rounded-xl bg-[#08557f] px-6 py-3 text-sm font-medium text-white shadow-lg shadow-[#08557f]/20 hover:bg-[#064364] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
          >
            <Plus className="h-4 w-4" />
            <span>Nuevo Artículo</span>
          </Link>
        </div>

        {/* Tarjetas de Resumen */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 group">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gray-50 rounded-xl group-hover:bg-[#08557f]/5 group-hover:text-[#08557f] transition-colors">
                <Tag className="h-6 w-6 text-gray-900 group-hover:text-[#08557f]" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Referencias</p>
              <h3 className="text-3xl font-light text-gray-900 tracking-tight">{totalReferencias}</h3>
            </div>
            <p className="text-xs text-gray-400 mt-3 font-medium flex items-center gap-1.5">
              <LayoutGrid className="h-3.5 w-3.5" />
              Productos activos en catálogo
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 group">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gray-50 rounded-xl group-hover:bg-[#08557f]/5 group-hover:text-[#08557f] transition-colors">
                <DollarSign className="h-6 w-6 text-gray-900 group-hover:text-[#08557f]" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Valor Inventario</p>
              <h3 className="text-3xl font-light text-gray-900 tracking-tight truncate" title={formatCurrency(totalValorInventario)}>
                {formatCurrency(totalValorInventario)}
              </h3>
            </div>
            <p className="text-xs text-gray-400 mt-3 font-medium">Costo base total</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 group">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gray-50 rounded-xl group-hover:bg-[#08557f]/5 group-hover:text-[#08557f] transition-colors">
                <Archive className="h-6 w-6 text-gray-900 group-hover:text-[#08557f]" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Por Reordenar</p>
              <h3 className="text-3xl font-light text-gray-900 tracking-tight">{productosBajoStock}</h3>
            </div>
            <p className={cn(
              "text-xs mt-3 font-medium flex items-center gap-1.5",
              productosBajoStock > 0 ? "text-amber-600" : "text-emerald-600"
            )}>
              {productosBajoStock > 0 ? 'Requiere atención inmediata' : 'Stock saludable'}
            </p>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white p-2 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, código o marca..."
              className="w-full pl-11 pr-4 py-3 rounded-xl border-none bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#08557f]/5 transition-all text-sm font-medium placeholder:text-gray-400"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-1 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 p-1 bg-gray-50 rounded-xl">
            {categorias.map(cat => (
              <button
                key={cat}
                onClick={() => setFiltroCategoria(cat)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all",
                  filtroCategoria === cat
                    ? 'bg-white text-[#08557f] shadow-sm ring-1 ring-black/5'
                    : 'text-gray-500 hover:text-[#08557f] hover:bg-[#08557f]/5'
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Grid de Productos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {productosFiltrados.map((producto) => (
            <div key={producto.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group flex flex-col overflow-hidden">
              <div className="p-6 flex-1">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gray-50 rounded-xl group-hover:bg-[#08557f] group-hover:text-white transition-all duration-300">
                      <Package className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 group-hover:text-[#08557f] transition-colors">{producto.nombre}</h3>
                      <p className="text-xs font-medium text-gray-500 mt-0.5">{producto.marca} • {producto.modelo}</p>
                    </div>
                  </div>
                  <span className={cn(
                    "px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase border",
                    producto.activo 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                      : 'bg-gray-50 text-gray-500 border-gray-100'
                  )}>
                    {producto.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </div>

                <div className="space-y-4 mb-6">
                  <div className="flex justify-between items-center text-sm p-3 bg-gray-50/50 rounded-lg">
                    <span className="text-gray-500 font-medium">Código</span>
                    <span className="font-mono text-gray-900 bg-white px-2 py-0.5 rounded border border-gray-100">{producto.codigo}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm p-3 bg-gray-50/50 rounded-lg">
                    <span className="text-gray-500 font-medium">Costo Base</span>
                    <span className="font-bold text-gray-900">{formatCurrency(producto.costo)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm p-3 bg-gray-50/50 rounded-lg">
                    <span className="text-gray-500 font-medium">Stock Disponible</span>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "font-bold",
                        producto.stock <= producto.stockMinimo ? "text-amber-600" : "text-gray-900"
                      )}>{producto.stock} u.</span>
                      {producto.stock <= producto.stockMinimo && (
                         <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-5">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Planes de Crédito</div>
                  <div className="space-y-2">
                    {producto.precios.map(precio => (
                      <div key={precio.id} className="flex justify-between items-center text-sm group/price hover:bg-gray-50 p-2 rounded-lg transition-colors -mx-2">
                        <span className="text-gray-600 pl-2">{precio.meses} Meses</span>
                        <span className="font-bold text-gray-900 pr-2">{formatCurrency(precio.precio)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex justify-between items-center group-hover:bg-[#08557f]/5 transition-colors">
                <span className="text-xs font-medium text-gray-500 bg-white px-2 py-1 rounded border border-gray-100">{producto.categoria}</span>
                <button className="text-sm font-medium text-[#08557f] hover:text-[#064364] flex items-center gap-1 transition-colors">
                  Editar <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {productosFiltrados.length === 0 && (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 border-dashed">
            <div className="inline-flex p-6 rounded-full bg-gray-50 mb-6">
              <Package className="h-10 w-10 text-gray-300" />
            </div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">No se encontraron artículos</h3>
            <p className="text-gray-500 max-w-sm mx-auto">
              No hay productos que coincidan con tu búsqueda. Intenta ajustar los filtros o términos.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default ArticulosPage
