'use client'

import { use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Package,
  Tag,
  DollarSign,
  Layers,
  Pencil,
  Calendar
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

// Mock Data (simulating fetch)
const ARTICULO_MOCK = {
  id: '1',
  nombre: 'Televisor Smart TV 50"',
  codigo: 'TV-SAM-50',
  descripcion: 'Televisor Samsung 4K UHD con procesador Crystal, HDR y Smart TV integrado.',
  categoria: 'Electrónica',
  marca: 'Samsung',
  modelo: 'UN50AU7000',
  costo: 1200000,
  stock: 15,
  stockMinimo: 5,
  estado: 'activo',
  fechaCreacion: '2024-01-15',
  precios: [
    { meses: 1, precio: 1500000 },
    { meses: 3, precio: 1800000 },
    { meses: 6, precio: 2200000 }
  ]
}

export default function DetalleArticuloPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  // Unwrap params using React.use()
  const { id } = use(params)
  const articulo = ARTICULO_MOCK // In real app, fetch by id

  return (
    <div className="min-h-screen bg-slate-50 relative">
      {/* Architectural Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-blue-500 opacity-20 blur-[100px]"></div>
      </div>

      <div className="relative z-10 p-6 md:p-8">
        {/* Header */}
        <div className="max-w-[1600px] mx-auto mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <button 
                onClick={() => router.back()}
                className="mb-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Volver al catálogo</span>
              </button>

              <div className="mb-2">
                <h1 className="text-4xl font-bold tracking-tight text-slate-900 mb-2">
                  <span className="text-blue-600">Detalle del</span> <span className="text-orange-500">Artículo</span>
                </h1>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-semibold text-slate-700">{articulo.nombre}</h2>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                    articulo.stock > articulo.stockMinimo 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                      : 'bg-amber-50 text-amber-700 border-amber-100'
                  }`}>
                    {articulo.stock > articulo.stockMinimo ? 'En Stock' : 'Stock Bajo'}
                  </span>
                </div>
              </div>
              <p className="text-slate-500 font-medium text-lg flex items-center gap-2">
                <Tag className="w-4 h-4" /> {articulo.categoria} • {articulo.marca} {articulo.modelo}
              </p>
            </div>
            
            <Link
              href={`/admin/articulos/${id}/editar`}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm font-bold"
            >
              <Pencil className="w-4 h-4" />
              <span>Editar Artículo</span>
            </Link>
          </div>
        </div>

        <div className="max-w-[1600px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
          
          {/* Main Info Column */}
          <div className="md:col-span-2 space-y-8">
            {/* General Info Card */}
            <div className="bg-white rounded-2xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-600" />
                Información General
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Código SKU</label>
                  <p className="text-lg font-medium text-slate-900">{articulo.codigo}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fecha de Registro</label>
                  <p className="text-lg font-medium text-slate-900 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    {articulo.fechaCreacion}
                  </p>
                </div>
                <div className="md:col-span-2 space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Descripción</label>
                  <p className="text-base text-slate-600 leading-relaxed">{articulo.descripcion}</p>
                </div>
              </div>
            </div>

            {/* Credit Prices Card */}
            <div className="bg-white rounded-2xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-orange-500" />
                Precios a Crédito
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {articulo.precios.map((precio, index) => (
                  <div key={index} className="flex flex-col p-4 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors">
                    <span className="text-sm font-medium text-slate-500 mb-1">{precio.meses} Meses</span>
                    <span className="text-xl font-bold text-slate-900">{formatCurrency(precio.precio)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar Column */}
          <div className="space-y-8">
            {/* Inventory Status */}
            <div className="bg-white rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Layers className="w-4 h-4 text-slate-500" />
                Estado de Inventario
              </h3>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 rounded-lg bg-slate-50">
                  <span className="text-sm text-slate-600 font-medium">Stock Actual</span>
                  <span className="text-lg font-bold text-slate-900">{articulo.stock}</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-slate-50">
                  <span className="text-sm text-slate-600 font-medium">Stock Mínimo</span>
                  <span className="text-sm font-bold text-slate-700">{articulo.stockMinimo}</span>
                </div>
                <div className="pt-2 border-t border-slate-100">
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-slate-500">Costo Unitario</span>
                    <span className="text-sm font-medium text-slate-900">{formatCurrency(articulo.costo)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-slate-500">Valor Total</span>
                    <span className="text-sm font-bold text-slate-900">{formatCurrency(articulo.costo * articulo.stock)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}