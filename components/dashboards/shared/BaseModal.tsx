'use client'

import { useState } from 'react'
import { X, Wallet, Save, AlertCircle } from 'lucide-react'
import { formatCOPInputValue } from '@/lib/utils'
import { Portal, MODAL_Z_INDEX } from '@/components/dashboards/shared/CobradorElements'

interface BaseModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (data: { monto: number; descripcion: string }) => void
}

export default function BaseModal({ isOpen, onClose, onConfirm }: BaseModalProps) {
  const [montoInput, setMontoInput] = useState('')
  const [descripcion, setDescripcion] = useState('')

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const monto = parseInt(montoInput.replace(/\D/g, '')) || 0
    onConfirm({ monto, descripcion })
    handleReset()
  }

  const handleReset = () => {
    setMontoInput('')
    setDescripcion('')
    onClose()
  }

  return (
    <Portal>
      <div
        className="fixed inset-0 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
        style={{ zIndex: MODAL_Z_INDEX }}
        onClick={handleReset}
      >
        <div
          className="w-full max-w-md bg-white rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
                <Wallet className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-lg text-slate-900">Pedir Base</h3>
            </div>
            <button
              onClick={handleReset}
              className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Monto Solicitado</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  className="w-full pl-8 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-black text-slate-900 text-xl"
                  placeholder="0"
                  value={montoInput}
                  onChange={(e) => setMontoInput(formatCOPInputValue(e.target.value))}
                />
              </div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider px-1">Efectivo para inicio de ruta o cambios</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Justificación</label>
              <textarea
                required
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-medium text-slate-900 resize-none"
                placeholder="Indique por qué necesita la base..."
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
              />
            </div>

            <div className="p-4 bg-amber-50 rounded-2xl flex items-start gap-3 border border-amber-100">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-800 leading-relaxed font-medium">
                Esta solicitud será enviada al coordinador para su aprobación inmediata. Una vez aprobada, se sumará a su saldo de &quot;Base Disponible&quot;.
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={handleReset}
                className="flex-1 px-4 py-4 bg-white border border-slate-200 text-slate-700 font-bold rounded-2xl hover:bg-slate-50 transition-colors text-xs uppercase tracking-widest"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-4 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 shadow-xl shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-widest"
              >
                <Save className="h-4 w-4" />
                Solicitar
              </button>
            </div>
          </form>
        </div>
      </div>
    </Portal>
  )
}
