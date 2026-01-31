'use client'

import { useState } from 'react'
import { X, Receipt, Save, Banknote, Camera } from 'lucide-react'
import { formatCOPInputValue } from '@/lib/utils'
import { Portal, MODAL_Z_INDEX } from '@/components/dashboards/shared/CobradorElements'

interface GastoModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (data: { tipo: string; descripcion: string; valor: number; comprobante: File | null }) => void
}

export default function GastoModal({ isOpen, onClose, onConfirm }: GastoModalProps) {
  const [tipo, setTipo] = useState('OPERATIVO')
  const [descripcion, setDescripcion] = useState('')
  const [valorInput, setValorInput] = useState('')
  const [comprobante, setComprobante] = useState<File | null>(null)

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const valor = parseInt(valorInput.replace(/\D/g, '')) || 0
    onConfirm({ tipo, descripcion, valor, comprobante })
    handleReset()
  }

  const handleReset = () => {
    setTipo('OPERATIVO')
    setDescripcion('')
    setValorInput('')
    setComprobante(null)
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
              <div className="p-2 bg-rose-100 rounded-lg text-rose-600">
                <Receipt className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-lg text-slate-900">Registrar Gasto</h3>
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
              <label className="text-sm font-bold text-slate-700">Tipo de Gasto</label>
              <select
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-rose-500/10 focus:border-rose-500 transition-all font-bold text-slate-700"
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
              >
                <option value="REPARACIOONES">Reparaciones</option>
                <option value="TRANSPORTE">Gasolina</option>
                <option value="PERSONAL">Gasto Personal</option>
                <option value="OTRO">Otro</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Descripción</label>
              <textarea
                required
                rows={2}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-rose-500/10 focus:border-rose-500 transition-all font-medium text-slate-900 resize-none"
                placeholder="Ej: Gasolina para la moto..."
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Valor</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  className="w-full pl-8 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-rose-500/10 focus:border-rose-500 transition-all font-black text-slate-900 text-lg"
                  placeholder="0"
                  value={valorInput}
                  onChange={(e) => setValorInput(formatCOPInputValue(e.target.value))}
                />
              </div>
            </div>

            <div className="space-y-2">
               <label className="text-sm font-bold text-slate-700">Comprobante (Opcional)</label>
               <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-slate-200 border-dashed rounded-2xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition-all">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Camera className="w-6 h-6 text-slate-400 mb-1" />
                      <p className="text-xs text-slate-500 font-bold">
                        {comprobante ? comprobante.name : 'Capturar o subir foto'}
                      </p>
                    </div>
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*" 
                      onChange={(e) => setComprobante(e.target.files?.[0] || null)}
                    />
                  </label>
               </div>
            </div>

            <div className="p-3 bg-blue-50 rounded-xl flex items-start gap-3 border border-blue-100">
              <div className="p-1.5 bg-blue-100 rounded-lg text-blue-600 mt-0.5">
                <Banknote className="h-4 w-4" />
              </div>
              <div className="text-[10px] text-blue-800 leading-tight">
                <p className="font-bold mb-0.5 uppercase tracking-wider">Aviso</p>
                <p>Este gasto requiere aprobación del coordinador antes de descargar del recaudo.</p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleReset}
                className="flex-1 px-4 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-2xl hover:bg-slate-50 transition-colors text-xs uppercase tracking-widest"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-3 bg-rose-600 text-white font-bold rounded-2xl hover:bg-rose-700 shadow-lg shadow-rose-600/20 transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-widest"
              >
                <Save className="h-4 w-4" />
                Guardar
              </button>
            </div>
          </form>
        </div>
      </div>
    </Portal>
  )
}
