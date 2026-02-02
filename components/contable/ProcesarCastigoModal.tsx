'use client'

import React, { useState } from 'react'
import { X, Archive, AlertTriangle, FileText, CheckCircle, Calculator } from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'
import { createPortal } from 'react-dom'

interface CastigoData {
  cuentaId: string
  motivo: string
  tipoCastigo: string
  fecha: string
}

interface ProcesarCastigoModalProps {
  cuenta: {
    id: string
    numeroPrestamo: string
    cliente: {
      nombre: string
      documento: string
    }
    saldoPendiente: number
    diasVencidos: number
  }
  onClose: () => void
  onConfirm: (data: CastigoData) => void
}

const MODAL_Z_INDEX = 2147483647

function Portal({ children }: { children: React.ReactNode }) {
  if (typeof document === 'undefined') return null
  return createPortal(children, document.body)
}

export default function ProcesarCastigoModal({ cuenta, onClose, onConfirm }: ProcesarCastigoModalProps) {
  const [motivo, setMotivo] = useState('')
  const [tipoCastigo, setTipoCastigo] = useState('TOTAL')

  const handleConfirm = () => {
    onConfirm({
      cuentaId: cuenta.id,
      motivo,
      tipoCastigo,
      fecha: new Date().toISOString()
    })
    onClose()
  }

  return (
    <Portal>
      <div
        className="fixed inset-0 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
        style={{ zIndex: MODAL_Z_INDEX }}
        onClick={onClose}
      >
        <div
          className="w-full max-w-lg bg-white rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-900 rounded-xl">
                <Archive className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Procesar Castigo</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Contabilidad de Cartera</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 bg-white border border-slate-200 rounded-full text-slate-400 hover:text-slate-700 transition-all active:scale-95 shadow-sm"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Resumen de la cuenta */}
            <div className="p-5 bg-rose-50 rounded-2xl border border-rose-100">
               <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-1">Saldo a Castigar</div>
                    <div className="text-3xl font-black text-rose-700">{formatCurrency(cuenta.saldoPendiente)}</div>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-rose-400 opacity-50" />
               </div>
               <div className="grid grid-cols-2 gap-4 pt-4 border-t border-rose-200/50">
                  <div>
                     <p className="text-[10px] font-bold text-rose-500 uppercase">Préstamo</p>
                     <p className="font-bold text-rose-900">{cuenta.numeroPrestamo}</p>
                  </div>
                  <div>
                     <p className="text-[10px] font-bold text-rose-500 uppercase">Días Vencidos</p>
                     <p className="font-bold text-rose-900">{cuenta.diasVencidos} días</p>
                  </div>
               </div>
            </div>

            {/* Opciones de Castigo */}
            <div className="space-y-4">
               <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 block">Tipo de Castigo</label>
                  <div className="grid grid-cols-2 gap-3">
                     <button 
                        onClick={() => setTipoCastigo('TOTAL')}
                        className={cn(
                           "p-4 rounded-2xl border-2 transition-all text-left group",
                           tipoCastigo === 'TOTAL' 
                           ? "border-blue-600 bg-blue-50/50" 
                           : "border-slate-100 hover:border-slate-200"
                        )}
                     >
                        <div className={cn("p-2 rounded-lg mb-3 inline-block", tipoCastigo === 'TOTAL' ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400")}>
                           <CheckCircle className="w-4 h-4" />
                        </div>
                        <p className={cn("font-bold text-sm", tipoCastigo === 'TOTAL' ? "text-blue-900" : "text-slate-600")}>Castigo Total</p>
                        <p className="text-[10px] text-slate-400 mt-1">100% de la deuda</p>
                     </button>
                     <button 
                        onClick={() => setTipoCastigo('PARCIAL')}
                        className={cn(
                           "p-4 rounded-2xl border-2 transition-all text-left group",
                           tipoCastigo === 'PARCIAL' 
                           ? "border-blue-600 bg-blue-50/50" 
                           : "border-slate-100 hover:border-slate-200"
                        )}
                     >
                        <div className={cn("p-2 rounded-lg mb-3 inline-block", tipoCastigo === 'PARCIAL' ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400")}>
                           <Calculator className="w-4 h-4" />
                        </div>
                        <p className={cn("font-bold text-sm", tipoCastigo === 'PARCIAL' ? "text-blue-900" : "text-slate-600")}>Castigo Parcial</p>
                        <p className="text-[10px] text-slate-400 mt-1">Ajuste manual</p>
                     </button>
                  </div>
               </div>

               <div>
                 <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Motivo del Castigo</label>
                 <textarea 
                    className="w-full h-24 p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500/10 outline-none text-sm text-slate-900 resize-none font-medium"
                    placeholder="Justificación contable..."
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                 />
               </div>
            </div>

            {/* Footer de Acciones */}
            <div className="pt-2 flex gap-3">
                <button 
                  onClick={onClose}
                  className="flex-1 px-6 py-4 bg-white border border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-50 transition-all text-xs uppercase tracking-widest"
                >
                    Cancelar
                </button>
                <button 
                  onClick={handleConfirm}
                  disabled={!motivo}
                  className="flex-2 px-8 py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 shadow-xl shadow-slate-200 transition-all text-xs uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <FileText className="w-4 h-4" />
                    Confirmar Castigo
                </button>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  )
}
