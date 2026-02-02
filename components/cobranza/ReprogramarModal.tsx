'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { VisitaRuta } from '@/lib/types/cobranza'
import Portal, { MODAL_Z_INDEX } from '@/components/ui/Portal'

interface ReprogramarModalProps {
  visita: VisitaRuta
  onClose: () => void
  onConfirm: (fecha: string, motivo: string) => void
}

export default function ReprogramarModal({ visita, onClose, onConfirm }: ReprogramarModalProps) {
  const [reprogramFecha, setReprogramFecha] = useState('')
  const [reprogramMotivo, setReprogramMotivo] = useState('')

  const handleGuardar = () => {
    onConfirm(reprogramFecha, reprogramMotivo)
  }

  return (
    <Portal>
      <div
        className="fixed inset-0 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
        style={{ zIndex: MODAL_Z_INDEX }}
        onClick={onClose}
      >
        <div
          className="w-full max-w-md bg-white rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Reprogramar visita</h3>
                <p className="text-sm text-slate-500">{visita.cliente}</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors"
                type="button"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Nueva fecha</label>
                <input
                  type="date"
                  value={reprogramFecha}
                  onChange={(e) => setReprogramFecha(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Motivo</label>
                <textarea
                  value={reprogramMotivo}
                  onChange={(e) => setReprogramMotivo(e.target.value)}
                  rows={3}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900 resize-none"
                  placeholder="Ej: Cliente no estaba disponible"
                />
              </div>
              <button
                type="button"
                onClick={handleGuardar}
                className="w-full bg-orange-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-orange-500/20 hover:bg-orange-600 active:scale-[0.98] transition-all"
              >
                Guardar reprogramación
              </button>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  )
}
