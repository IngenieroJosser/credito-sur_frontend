'use client'

import { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, Wallet } from 'lucide-react'
import { formatCOPInputValue } from '@/lib/utils'

export default function EditarCajaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  // Mock data inicial (simulando carga)
  const [formData, setFormData] = useState({
    nombre: 'Caja Principal Oficina',
    responsable: 'Ana Admin',
    montoBase: '1000000',
    descripcion: 'Caja principal para operaciones diarias en oficina'
  })

  // Usuarios autorizados para ser responsables de caja (Roles: ADMIN, SUPER_ADMINISTRADOR, CONTADOR)
  const usuariosAutorizados = [
    { id: 'USR-001', nombre: 'María Rodríguez', rol: 'SUPER_ADMINISTRADOR' },
    { id: 'USR-002', nombre: 'Laura Sánchez', rol: 'CONTADOR' },
    { id: 'USR-003', nombre: 'Admin General', rol: 'ADMIN' },
    { id: 'USR-004', nombre: 'Ana Admin', rol: 'SUPER_ADMINISTRADOR' },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    
    // Simular API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    setSaving(false)
    router.push(`/admin/contable/cajas/${id}`)
  }

  return (
    <div className="min-h-screen bg-slate-50/50 p-8">
      {/* Background Pattern */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-blue-500 opacity-20 blur-[100px]"></div>
      </div>

      <div className="relative z-10 w-full p-6 md:p-8 space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.back()}
            className="p-2 hover:bg-white rounded-full transition-colors border border-transparent hover:border-slate-200 shadow-sm hover:shadow"
          >
            <ArrowLeft className="h-6 w-6 text-slate-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              <span className="text-blue-600">Editar</span> <span className="text-orange-500">Caja</span>
            </h1>
            <p className="text-slate-500">Modificar configuración de caja</p>
          </div>
        </div>

        {/* Formulario */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
          <form onSubmit={handleSubmit}>
            <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="lg:col-span-2 flex items-center gap-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
                <div className="p-3 bg-white rounded-lg shadow-sm">
                  <Wallet className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-blue-900">Configuración de Caja</h3>
                  <p className="text-sm text-blue-700">Los cambios se reflejarán inmediatamente en el sistema.</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700">Nombre de la Caja</label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                  className="w-full rounded-xl border-slate-300 py-3 text-sm text-slate-900 focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700">Responsable Principal</label>
                <select
                  value={formData.responsable}
                  onChange={(e) => setFormData({...formData, responsable: e.target.value})}
                  className="w-full rounded-xl border-slate-300 py-3 text-sm text-slate-900 focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                >
                  <option value="">Seleccionar responsable...</option>
                  {usuariosAutorizados.map((u) => (
                    <option key={u.id} value={u.nombre}>
                      {u.nombre} ({u.rol})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500">Usuario encargado de la custodia y arqueo de esta caja.</p>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700">Monto Base Sugerido</label>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-slate-400 font-bold">$</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formData.montoBase}
                    onChange={(e) => setFormData({ ...formData, montoBase: formatCOPInputValue(e.target.value) })}
                    className="w-full pl-8 rounded-xl border-slate-300 py-3 text-sm text-slate-900 focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  />
                </div>
                <p className="text-xs text-slate-500">Monto con el que debería iniciar la caja diariamente.</p>
              </div>

              <div className="lg:col-span-2 space-y-2">
                <label className="block text-sm font-bold text-slate-700">Descripción</label>
                <textarea
                  value={formData.descripcion}
                  onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                  rows={3}
                  className="w-full rounded-xl border-slate-300 py-3 text-sm text-slate-900 focus:ring-2 focus:ring-blue-600 focus:border-transparent resize-none"
                />
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-3 text-sm font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-3 text-sm font-bold text-white hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 disabled:opacity-70"
              >
                {saving ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Guardar Cambios</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
