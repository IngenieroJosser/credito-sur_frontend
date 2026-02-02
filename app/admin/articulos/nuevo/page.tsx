'use client'

import { useState } from 'react'
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
import { formatCOPInputValue, formatCurrency, parseCOPInputToNumber } from '@/lib/utils'

// Types
interface PrecioCuota {
  meses: number
  precio: number
}

export default function NuevoArticuloPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  
  const [formData, setFormData] = useState({
    nombre: '',
    codigo: '',
    descripcion: '',
    categoria: '',
    marca: '',
    modelo: '',
    costo: '',
    stock: '',
    stockMinimo: '',
    precios: [] as PrecioCuota[]
  })
  const [nuevaCuota, setNuevaCuota] = useState({ meses: 1, precio: '' })

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const payload = {
      ...formData,
      costo: parseCOPInputToNumber(formData.costo),
      stock: Number(formData.stock || '0'),
      stockMinimo: Number(formData.stockMinimo || '0'),
    }
    console.log('Guardar artículo:', payload)
    // Simular guardado
    await new Promise(resolve => setTimeout(resolve, 1000))
    setLoading(false)
    router.push('/admin/articulos')
  }

  const addPrecioCuota = () => {
    const precio = parseCOPInputToNumber(nuevaCuota.precio)
    if (nuevaCuota.meses > 0 && precio > 0) {
      setFormData(prev => ({
        ...prev,
        precios: [...prev.precios, { meses: nuevaCuota.meses, precio }].sort((a, b) => a.meses - b.meses)
      }))
      setNuevaCuota({ meses: 1, precio: '' })
    }
  }

  const removePrecioCuota = (index: number) => {
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
                className="mb-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Volver al catálogo</span>
              </button>

              <h1 className="text-4xl font-bold tracking-tight text-slate-900 mb-2">
                <span className="text-blue-600">Nuevo</span> <span className="text-orange-500">Artículo</span>
              </h1>
              <p className="text-slate-500 font-medium text-lg">
                Registre un nuevo producto en el inventario.
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
                          Cuotas
                        </label>
                        <select
                          value={nuevaCuota.meses}
                          onChange={e => setNuevaCuota({ ...nuevaCuota, meses: Number(e.target.value) })}
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
                            type="text"
                            inputMode="numeric"
                            value={nuevaCuota.precio}
                            onChange={e => setNuevaCuota({ ...nuevaCuota, precio: formatCOPInputValue(e.target.value) })}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border-slate-200 bg-white focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all font-medium text-slate-900 placeholder:text-slate-400"
                            placeholder="0"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={addPrecioCuota}
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
                            <th className="px-4 py-3">Cuotas</th>
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
                                  onClick={() => removePrecioCuota(index)}
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
                          type="text"
                          inputMode="numeric"
                          required
                          value={formData.costo}
                          onChange={e => setFormData({ ...formData, costo: formatCOPInputValue(e.target.value) })}
                          className="w-full pl-10 pr-4 py-3 rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all font-medium text-slate-900 placeholder:text-slate-400"
                          placeholder="0"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">
                        Stock Actual
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        required
                        value={formData.stock}
                        onChange={e => setFormData({ ...formData, stock: e.target.value.replace(/\D/g, '') })}
                        className="w-full px-4 py-3 rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all font-medium text-slate-900 placeholder:text-slate-400"
                        placeholder="0"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">
                        Stock Mínimo
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        required
                        value={formData.stockMinimo}
                        onChange={e => setFormData({ ...formData, stockMinimo: e.target.value.replace(/\D/g, '') })}
                        className="w-full px-4 py-3 rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all font-medium text-slate-900 placeholder:text-slate-400"
                        placeholder="0"
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
              {loading ? 'Guardando...' : 'Guardar Artículo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}