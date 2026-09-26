'use client'

import { useState } from 'react'
import { X, Wallet, Save, AlertCircle, Loader2 } from 'lucide-react'
import { formatCOPInputValue } from '@/lib/utils'
import { Portal, MODAL_Z_INDEX } from '@/components/dashboards/shared/CobradorElements'
import Tooltip from '@/components/ui/Tooltip'
import { useModalDialog } from '@/hooks/use-modal-dialog'

interface BaseModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (data: { monto: number; descripcion: string }) => void | Promise<void>
}

export default function BaseModal({ isOpen, onClose, onConfirm }: BaseModalProps) {
  const [montoInput, setMontoInput] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  // Escape para salir y el foco en el primer campo al abrir. El hook lleva
  // una pila, asi que con modales anidados Escape cierra solo el de encima.
  useModalDialog({
    abierto: isOpen,
    onClose: () => handleReset(),
  })

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return;

    const monto = parseInt(montoInput.replace(/\D/g, '')) || 0
    setIsSubmitting(true)
    try {
      await onConfirm({ monto, descripcion })
      handleReset()
    } catch (error) {
      console.error('Error al solicitar base:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReset = () => {
    setMontoInput('')
    setDescripcion('')
    onClose()
  }

  return (
    <Portal>
      <div
        className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
        style={{ zIndex: MODAL_Z_INDEX }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex w-full flex-col overflow-hidden bg-white shadow-2xl animate-in zoom-in-95 duration-200 h-[100dvh] sm:h-auto sm:max-h-[90vh] rounded-none sm:rounded-3xl sm:max-w-md"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="shrink-0 px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div className="flex items-center gap-2">
              <div className="shrink-0 p-2 bg-emerald-100 rounded-lg text-emerald-600">
                <Wallet className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-lg text-slate-900">Pedir Base</h3>
            </div>
            <Tooltip texto="Cerrar">
              <button
                onClick={handleReset}
                className="shrink-0 p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>
            </Tooltip>
          </div>

          {/* Igual que en el de gastos: la columna la lleva el formulario, el
              cuerpo hace scroll y los botones se quedan abajo. */}
          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto p-6 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Monto Solicitado<span className="ml-1 text-red-500" aria-label="obligatorio">*</span></label>
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
              <label className="text-sm font-bold text-slate-700">Justificación<span className="ml-1 text-red-500" aria-label="obligatorio">*</span></label>
              <textarea
                required
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-medium text-slate-900 resize-none"
                placeholder="Indique por qué necesita la base..."
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
              />
            </div>

            <div className="shrink-0 p-4 bg-amber-50 rounded-2xl flex items-start gap-3 border border-amber-100">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-800 leading-relaxed font-medium">
                Esta solicitud será enviada al coordinador para su aprobación inmediata. Una vez aprobada, se sumará a su saldo de &quot;Base Disponible&quot;.
              </div>
            </div>

            </div>

            <div className="shrink-0 flex gap-3 border-t border-slate-100 p-6">
              <button
                type="button"
                onClick={handleReset}
                className="flex-1 px-4 py-4 bg-white border border-slate-200 text-slate-700 font-bold rounded-2xl hover:bg-slate-50 transition-colors text-xs uppercase tracking-widest"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-4 py-4 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 shadow-xl shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-widest disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {isSubmitting ? 'Solicitando...' : 'Solicitar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Portal>
  )
}
