'use client'

import React, { useState } from 'react'
import { VisitaRuta } from '@/lib/types/cobranza'
import { Portal } from '@/components/dashboards/shared/CobradorElements'
import { X, CalendarX } from 'lucide-react'

interface AusenteModalProps {
  visita: VisitaRuta
  onClose: () => void
  onConfirm: (notas: string) => Promise<void>
}

export default function AusenteModal({ visita, onClose, onConfirm }: AusenteModalProps) {
  const [notas, setNotas] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!notas.trim()) {
      setError('Debes ingresar una nota o justificación.')
      return
    }

    setLoading(true)
    setError('')
    try {
      await onConfirm(notas)
    } catch (err: any) {
      setError(err.message || 'Error al registrar la visita')
      setLoading(false)
    }
  }

  return (
    <Portal>
      <div className="fixed inset-0 z-[2147483600] flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white sm:rounded-[2rem] rounded-t-[2rem] w-full sm:max-w-md shadow-2xl animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-rose-50/30">
            <h3 className="font-bold text-lg text-rose-900 flex items-center gap-2">
              <CalendarX className="h-5 w-5 text-rose-500" />
              Marcar como Ausente
            </h3>
            <button
              onClick={onClose}
              className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div>
              <p className="text-sm text-slate-600 mb-4">
                Estás a punto de marcar a <strong>{visita.cliente}</strong> como ausente. Esto excluirá la meta de hoy para este cliente, a menos que realice un pago más tarde en el día.
              </p>
              
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Notas / Justificación (Obligatorio) <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                rows={3}
                className="w-full p-3 rounded-xl border-2 border-slate-100 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 outline-none transition-all resize-none"
                placeholder="Ej. El cliente no se encontraba en el domicilio..."
              />
              {error && <p className="text-rose-500 text-xs font-bold mt-2">{error}</p>}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-4 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || !notas.trim()}
                className="flex-1 py-3 px-4 rounded-xl font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Guardando...' : 'Confirmar Ausencia'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Portal>
  )
}
