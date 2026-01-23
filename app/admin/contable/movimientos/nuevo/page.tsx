'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowUpRight,
  ArrowDownLeft,
  Save,
  Briefcase
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default function NuevoMovimientoPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  
  const [formData, setFormData] = useState({
    tipo: 'INGRESO', // INGRESO | EGRESO
    categoria: '',
    monto: '',
    concepto: '',
    referencia: '',
    cajaId: 'CAJA-MAIN'
  })

  const categoriasIngreso = [
    { id: 'APORTE_CAPITAL', label: 'Aporte de Capital' },
    { id: 'AJUSTE_POSITIVO', label: 'Ajuste de Caja (+)' },
    { id: 'OTROS_INGRESOS', label: 'Otros Ingresos' }
  ]

  const categoriasEgreso = [
    { id: 'GASTO_OPERATIVO', label: 'Gasto Operativo (Transporte, Comida)' },
    { id: 'GASTO_ADMINISTRATIVO', label: 'Gasto Administrativo (Papelería, Servicios)' },
    { id: 'BASE_COBRADOR', label: 'Entrega Base a Cobrador' },
    { id: 'RETIRO_UTILIDADES', label: 'Retiro de Utilidades' }
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    // Simular API
    await new Promise(resolve => setTimeout(resolve, 1000))
    setLoading(false)
    router.push('/admin/contable')
  }

  return (
    <div className="min-h-screen bg-slate-50 relative pb-20">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-blue-500 opacity-20 blur-[100px]"></div>
      </div>

      <div className="relative z-10 w-full p-6 md:p-8 space-y-8">
        <div className="flex items-center gap-4">
          <Link 
            href="/admin/contable"
            className="p-2 -ml-2 text-slate-400 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900">
              <span className="text-blue-600">Registrar</span> <span className="text-orange-500">Movimiento</span>
            </h1>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
          <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Selector de Tipo */}
            <div className="grid grid-cols-2 gap-4 lg:col-span-2">
              <button
                type="button"
                onClick={() => setFormData({...formData, tipo: 'INGRESO', categoria: ''})}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                  formData.tipo === 'INGRESO'
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-slate-100 bg-slate-50 text-slate-500 hover:bg-slate-100"
                )}
              >
                <div className="p-2 rounded-full bg-white shadow-sm">
                  <ArrowDownLeft className={cn("h-6 w-6", formData.tipo === 'INGRESO' ? "text-blue-600" : "text-slate-400")} />
                </div>
                <span className="font-bold">Ingreso</span>
              </button>

              <button
                type="button"
                onClick={() => setFormData({...formData, tipo: 'EGRESO', categoria: ''})}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                  formData.tipo === 'EGRESO'
                    ? "border-rose-500 bg-rose-50 text-rose-700"
                    : "border-slate-100 bg-slate-50 text-slate-500 hover:bg-slate-100"
                )}
              >
                <div className="p-2 rounded-full bg-white shadow-sm">
                  <ArrowUpRight className={cn("h-6 w-6", formData.tipo === 'EGRESO' ? "text-rose-600" : "text-slate-400")} />
                </div>
                <span className="font-bold">Egreso</span>
              </button>
            </div>

            {/* Categoría */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700">Categoría</label>
              <select
                required
                value={formData.categoria}
                onChange={(e) => setFormData({...formData, categoria: e.target.value})}
                className="w-full rounded-xl border-slate-300 py-3 text-sm text-slate-900 focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              >
                <option value="">Seleccione una categoría...</option>
                {(formData.tipo === 'INGRESO' ? categoriasIngreso : categoriasEgreso).map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.label}</option>
                ))}
              </select>
            </div>

            {/* Caja Afectada */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700">Caja Afectada</label>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3">
                <Briefcase className="h-5 w-5 text-slate-500" />
                <div>
                  <div className="font-bold text-slate-900">Caja Principal Oficina</div>
                  <div className="text-xs text-slate-500">Saldo: $5,200,000</div>
                </div>
              </div>
            </div>

            {/* Monto */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700">Monto</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span className="text-slate-400 font-bold">$</span>
                </div>
                <input
                  type="number"
                  required
                  value={formData.monto}
                  onChange={(e) => setFormData({...formData, monto: e.target.value})}
                  className="pl-8 w-full rounded-xl border-slate-300 py-3 text-lg font-bold text-slate-900 focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Referencia (Moved up) */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700">Referencia (Opcional)</label>
              <input
                type="text"
                value={formData.referencia}
                onChange={(e) => setFormData({...formData, referencia: e.target.value})}
                className="w-full rounded-xl border-slate-300 py-3 text-sm text-slate-900 focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                placeholder="Ej: Factura #1234, Recibo #55"
              />
            </div>

            {/* Concepto */}
            <div className="lg:col-span-2 space-y-2">
              <label className="block text-sm font-bold text-slate-700">Concepto / Descripción</label>
                <input
                  type="text"
                  required
                  value={formData.concepto}
                  onChange={(e) => setFormData({...formData, concepto: e.target.value})}
                  className="w-full rounded-xl border-slate-300 py-3 text-sm text-slate-900 focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  placeholder="Ej: Compra de resmas de papel"
                />
            </div>

            {/* Nota Informativa */}
            {formData.categoria === 'BASE_COBRADOR' && (
              <div className="lg:col-span-2 p-4 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700 flex gap-2">
                <div className="shrink-0 mt-0.5">ℹ️</div>
                <p>Este movimiento requiere aprobación del cobrador al recibir el dinero. Quedará en estado PENDIENTE hasta su confirmación.</p>
              </div>
            )}
          </div>

          <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
            <Link
              href="/admin/contable"
              className="px-6 py-3 text-sm font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 rounded-xl transition-colors"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-3 text-sm font-bold text-white hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 disabled:opacity-70"
            >
              <Save className="h-4 w-4" />
              {loading ? 'Guardando...' : 'Guardar Movimiento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
