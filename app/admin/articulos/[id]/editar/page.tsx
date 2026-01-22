'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import {
  Save,
  ArrowLeft,
  Layers,
  Box,
  Tag,
  DollarSign,
  Plus,
  Trash2,
  AlertCircle
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

// Types (mirrored from main page for now)
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

// Mock Data (mirrored for initial load)
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

export default function EditarArticuloPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { id } = use(params)
  
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
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
  })
  const [nuevoPlazo, setNuevoPlazo] = useState({ meses: 1, precio: 0 })

  useEffect(() => {
    // Simular carga de datos
    const articulo = ARTICULOS_MOCK.find(a => a.id === id)
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
    }
  }, [id])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    // Simular guardado
    await new Promise(resolve => setTimeout(resolve, 1000))
    setLoading(false)
    router.push('/admin/articulos')
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

  return (
    <div className="min-h-screen bg-slate-50 relative">
      {/* Fondo arquitectónico */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-blue-500 opacity-20 blur-[100px]"></div>
      </div>

      <div className="relative z-10 p-6 md:p-8">
        {/* Header */}
        <div className="max-w-[1600px] mx-auto mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
        <div className="flex items-center justify-between">
          <div>
            <button 
              onClick={() => router.back()}
              className="flex items-center text-slate-500 hover:text-slate-900 mb-4 transition-colors group"
            >
              <div className="p-2 rounded-full bg-white border border-slate-200 shadow-sm group-hover:border-slate-300 mr-2">
                <ArrowLeft className="h-4 w-4" />
              </div>
              <span className="font-bold text-sm">Volver al catálogo</span>
            </button>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 mb-2">
              <span className="text-blue-600">Editar</span> <span className="text-orange-500">Artículo</span>
            </h1>
            <p className="text-slate-500 font-medium text-lg">
              Modifique los detalles del artículo y sus precios a crédito.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="max-w-[1600px] mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Columna Izquierda (Información Principal) */}
          <div className="xl:col-span-8 space-y-6">
            {/* Información Básica */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-8">
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3 pb-6 border-b border-slate-100 mb-8">
                  <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600">
                    <Layers className="h-6 w-6" />
                  </div>
                  Información Básica
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="md:col-span-2">
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  Nombre del Artículo
                </label>
                <input
                  type="text"
                  required
                  value={formData.nombre}
                  onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all font-medium text-slate-900 placeholder:text-slate-400"
                  placeholder="Ej: Televisor Smart TV 50"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  Código
                </label>
                <input
                  type="text"
                  required
                  value={formData.codigo}
                  onChange={e => setFormData({ ...formData, codigo: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all font-medium text-slate-900 placeholder:text-slate-400"
                  placeholder="Ej: TV-50-SMART"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  Categoría
                </label>
                <select
                  required
                  value={formData.categoria}
                  onChange={e => setFormData({ ...formData, categoria: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all font-medium text-slate-900"
                >
                  <option value="">Seleccionar...</option>
                  <option value="Electrónica">Electrónica</option>
                  <option value="Hogar">Hogar</option>
                  <option value="Muebles">Muebles</option>
                  <option value="Tecnología">Tecnología</option>
                  <option value="Vehículos">Vehículos</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  Marca
                </label>
                <input
                  type="text"
                  required
                  value={formData.marca}
                  onChange={e => setFormData({ ...formData, marca: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all font-medium text-slate-900 placeholder:text-slate-400"
                  placeholder="Ej: Samsung"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  Modelo
                </label>
                <input
                  type="text"
                  required
                  value={formData.modelo}
                  onChange={e => setFormData({ ...formData, modelo: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all font-medium text-slate-900 placeholder:text-slate-400"
                  placeholder="Ej: UN50AU7000"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  Descripción
                </label>
                <textarea
                  rows={3}
                  value={formData.descripcion}
                  onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all font-medium text-slate-900 placeholder:text-slate-400 resize-none"
                  placeholder="Detalles adicionales del producto..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* Precios a Crédito */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-8">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3 pb-6 border-b border-slate-100 mb-8">
              <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600">
                <Tag className="h-6 w-6" />
              </div>
              Precios a Crédito
            </h3>

            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">
                    Plazo (Meses)
                  </label>
                  <select
                    value={nuevoPlazo.meses}
                    onChange={e => setNuevoPlazo({ ...nuevoPlazo, meses: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 rounded-xl border-slate-200 bg-white focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all font-medium text-slate-900"
                  >
                    {[1, 2, 3, 4, 5, 6, 9, 12, 18, 24].map(m => (
                      <option key={m} value={m}>{m} Mes{m > 1 ? 'es' : ''}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">
                    Precio Total
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="number"
                      min="0"
                      value={nuevoPlazo.precio}
                      onChange={e => setNuevoPlazo({ ...nuevoPlazo, precio: Number(e.target.value) })}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border-slate-200 bg-white focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all font-medium text-slate-900 placeholder:text-slate-400"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={addPrecioPlazo}
                  className="px-6 py-2.5 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors font-bold flex items-center justify-center shadow-lg shadow-orange-500/20"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Precio
                </button>
              </div>
            </div>

            {formData.precios.length === 0 ? (
              <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                <p>No se han configurado precios a crédito</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-700 font-medium border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Plazo</th>
                      <th className="px-4 py-3">Precio Total</th>
                      <th className="px-4 py-3 text-right">Cuota Mensual (Aprox)</th>
                      <th className="px-4 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {formData.precios.map((p, index) => (
                      <tr key={index} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {p.meses} Mes{p.meses > 1 ? 'es' : ''}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {formatCurrency(p.precio)}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-500">
                          {formatCurrency(p.precio / p.meses)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => removePrecioPlazo(index)}
                            className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded-md transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Columna Derecha (Inventario y Costos) */}
      <div className="xl:col-span-4 space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden sticky top-6">
          <div className="p-8">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3 pb-6 border-b border-slate-100 mb-8">
              <div className="p-2.5 bg-orange-50 rounded-xl text-orange-600">
                <Box className="h-6 w-6" />
              </div>
              Inventario y Costos
            </h3>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Costo Unitario
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.costo}
                    onChange={e => setFormData({ ...formData, costo: Number(e.target.value) })}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all font-medium text-slate-900 placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Stock Actual
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={formData.stock}
                  onChange={e => setFormData({ ...formData, stock: Number(e.target.value) })}
                  className="w-full px-4 py-3 rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all font-medium text-slate-900 placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Stock Mínimo
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={formData.stockMinimo}
                  onChange={e => setFormData({ ...formData, stockMinimo: Number(e.target.value) })}
                  className="w-full px-4 py-3 rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all font-medium text-slate-900 placeholder:text-slate-400"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Action Buttons */}
        <div className="flex items-center justify-end gap-4 pt-6 border-t border-slate-200">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2.5 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex items-center px-8 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50"
          >
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </form>
      </div>
    </div>
  )
}





