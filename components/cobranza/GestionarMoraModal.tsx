'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, Percent, Calendar as CalendarIcon, Save, DollarSign, MessageSquare, X } from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'

interface GestionarMoraModalProps {
  cuenta: {
    id: string
    numeroPrestamo: string
    saldoPendiente: number
    montoOriginal: number
    diasMora: number
  }
  onClose: () => void
  onConfirm: (data: { montoInteres: number; diasGracia: number; comentarios?: string }) => void
}

export default function GestionarMoraModal({ cuenta, onClose, onConfirm }: GestionarMoraModalProps) {
  const [montoInteres, setMontoInteres] = useState<string>('')
  const [diasGracia, setDiasGracia] = useState<string>('30')
  const [comentarios, setComentarios] = useState('')
  const [tipoBase, setTipoBase] = useState<'ACTUAL' | 'INICIAL'>('ACTUAL')
  const [porcentaje, setPorcentaje] = useState<string>('')

  // Sincronizar porcentaje con monto
  const handlePorcentajeChange = (val: string) => {
    setPorcentaje(val)
    if (val && !isNaN(Number(val))) {
      const base = tipoBase === 'ACTUAL' ? cuenta.saldoPendiente : cuenta.montoOriginal
      const calculado = Math.round(base * (Number(val) / 100))
      setMontoInteres(calculado.toString())
    } else {
      setMontoInteres('') // Clear montoInteres if percentage is invalid or empty
    }
  }

  // Recalcular si cambia la base
  useEffect(() => {
    if (porcentaje && !isNaN(Number(porcentaje))) {
      const base = tipoBase === 'ACTUAL' ? cuenta.saldoPendiente : cuenta.montoOriginal
      const calculado = Math.round(base * (Number(porcentaje) / 100))
      setMontoInteres(calculado.toString())
    }
  }, [tipoBase, porcentaje, cuenta.saldoPendiente, cuenta.montoOriginal]) // Added dependencies for useEffect

  const confirm = () => {
    const monto = Number(montoInteres || 0)
    const dias = Number(diasGracia || 0)
    onConfirm({ montoInteres: monto, diasGracia: dias, comentarios })
    onClose()
  }

  if (typeof document === 'undefined') return null

  return createPortal(
    <div className="fixed inset-0 z-[2147483601] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="bg-linear-to-br from-[#08557f] to-blue-700 px-8 py-7 flex items-center justify-between relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
              <div className="absolute -right-4 -top-10 w-32 h-32 rounded-full bg-white blur-3xl"></div>
          </div>
          
          <div className="relative z-10">
            <h3 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-amber-300" />
              Configurar Mora
            </h3>
            <p className="text-blue-100/80 text-[10px] font-black uppercase tracking-widest mt-1">
              Préstamo {cuenta.numeroPrestamo}
            </p>
          </div>
          <button onClick={onClose} className="relative z-10 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
          
          {/* Info Box - Balances */}
          <div className="grid grid-cols-2 gap-3">
             <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Saldo Inicial</p>
                <p className="text-sm font-black text-slate-700">{formatCurrency(cuenta.montoOriginal)}</p>
             </div>
             <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
                <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1">Saldo Actual</p>
                <p className="text-sm font-black text-blue-700">{formatCurrency(cuenta.saldoPendiente)}</p>
             </div>
          </div>

          <div className="space-y-5">
            
            {/* Opción de Base de Cálculo */}
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-2 block ml-1">Calcular interés sobre:</label>
              <div className="flex p-1 bg-slate-100 rounded-2xl border border-slate-200">
                <button 
                  onClick={() => setTipoBase('ACTUAL')}
                  className={cn(
                    "flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                    tipoBase === 'ACTUAL' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  Saldo Actual
                </button>
                <button 
                  onClick={() => setTipoBase('INICIAL')}
                  className={cn(
                    "flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                    tipoBase === 'INICIAL' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  Saldo Inicial
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {/* Porcentaje */}
              <div className="col-span-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-2 block ml-1">%</label>
                <div className="relative">
                  <input
                    type="number"
                    value={porcentaje}
                    onChange={(e) => handlePorcentajeChange(e.target.value)}
                    placeholder="0"
                    className="w-full px-4 py-4 rounded-2xl border border-slate-200 bg-white font-black text-lg text-slate-900 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-slate-300"
                  />
                </div>
              </div>

              {/* Monto de Interés Calculado/Manual */}
              <div className="col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-2 block ml-1">Monto de Mora ($)</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 h-8 w-8 bg-amber-50 rounded-xl flex items-center justify-center border border-amber-100">
                    <DollarSign className="h-4 w-4 text-amber-600" />
                  </div>
                  <input
                    type="number"
                    value={montoInteres}
                    onChange={(e) => setMontoInteres(e.target.value)}
                    placeholder="0"
                    className="w-full pl-14 pr-4 py-4 rounded-2xl border border-amber-200 bg-white font-black text-lg text-slate-900 focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all placeholder:text-slate-300"
                  />
                </div>
              </div>
            </div>

            {/* Días de Gracia */}
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-2 block ml-1">Días de Gracia</label>
              <div className="relative">
                 <div className="absolute left-4 top-1/2 -translate-y-1/2 h-8 w-8 bg-blue-50 rounded-xl flex items-center justify-center border border-blue-100">
                  <CalendarIcon className="h-4 w-4 text-blue-600" />
                </div>
                <input
                  type="number"
                  value={diasGracia}
                  onChange={(e) => setDiasGracia(e.target.value)}
                  placeholder="30"
                  min={0}
                  className="w-full pl-14 pr-6 py-4 rounded-2xl border border-slate-200 bg-white font-black text-lg text-slate-900 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 outline-none transition-all placeholder:text-slate-300"
                />
              </div>
            </div>

            {/* Observaciones */}
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-2 block ml-1">Observaciones</label>
              <div className="relative">
                <MessageSquare className="absolute left-4 top-4 h-4 w-4 text-slate-300" />
                <textarea
                  value={comentarios}
                  onChange={(e) => setComentarios(e.target.value)}
                  placeholder="Razón de la mora..."
                  className="w-full pl-12 pr-6 py-4 rounded-2xl border border-slate-200 bg-white font-medium text-xs text-slate-600 focus:ring-4 focus:ring-slate-500/10 focus:border-slate-400 outline-none transition-all placeholder:text-slate-300 min-h-[80px] resize-none"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex gap-3">
          <button 
            onClick={onClose} 
            className="flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.15em] text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-all border border-slate-200 bg-white"
          >
            Cerrar
          </button>
          <button 
            onClick={confirm} 
            className="flex-[2] py-4 rounded-2xl bg-[#08557f] text-white font-black text-[10px] uppercase tracking-[0.15em] shadow-xl shadow-blue-900/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Save className="h-4 w-4" />
            Aplicar Mora
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
