import React, { useState } from 'react'
import { 
  X, 
  AlertCircle, 
  DollarSign, 
  Percent,
  Save,
  Ban,
  Calculator,
  Check
} from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'
import { createPortal } from 'react-dom'

interface CuentaVencida {
  id: string
  numeroPrestamo: string
  cliente: {
    nombre: string
    documento: string
  }
  fechaVencimiento: string
  diasVencidos: number
  saldoPendiente: number
  montoOriginal: number
  ruta: string
  nivelRiesgo: string
  interesAcumulado?: number
}

interface GestionarVencidaModalProps {
  cuenta: CuentaVencida
  onClose: () => void
  onConfirm: (data: { cobrarInteres: boolean; montoInteres: number }) => void
}

const MODAL_Z_INDEX = 50

function Portal({ children }: { children: React.ReactNode }) {
  if (typeof document === 'undefined') return null
  return createPortal(children, document.body)
}

export default function GestionarVencidaModal({ cuenta, onClose, onConfirm }: GestionarVencidaModalProps) {
  const [cobrarInteres, setCobrarInteres] = useState(false)
  const [montoInteres, setMontoInteres] = useState<string>('')
  
  const handleConfirm = () => {
    onConfirm({
      cobrarInteres,
      montoInteres: cobrarInteres ? Number(montoInteres) : 0
    })
    onClose()
  }

  return (
    <Portal>
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity z-[49]" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: MODAL_Z_INDEX }}>
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
          
          {/* Header */}
          <div className="bg-[#08557f] px-6 py-5 flex items-center justify-between relative overflow-hidden">
             
            <div className="absolute inset-0 opacity-20">
                <div className="absolute -right-4 -top-10 w-32 h-32 rounded-full bg-white blur-3xl"></div>
                <div className="absolute -left-4 -bottom-10 w-24 h-24 rounded-full bg-blue-400 blur-2xl"></div>
            </div>

            <div className="relative z-10">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-300" />
                Gestión de Cuenta Vencida
              </h2>
              <p className="text-blue-100 text-xs mt-1 font-medium">
                Prestamo: <span className="text-white font-mono bg-white/10 px-1.5 py-0.5 rounded">{cuenta.numeroPrestamo}</span>
              </p>
            </div>
            <button 
              onClick={onClose}
              className="relative z-10 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors border border-white/10"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            
            {/* Resumen */}
            <div className="flex items-center gap-4 p-4 bg-rose-50 rounded-2xl border border-rose-100">
              <div className="h-12 w-12 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 font-bold shrink-0">
                {cuenta.diasVencidos}d
              </div>
              <div>
                <div className="text-xs font-bold text-rose-600 uppercase tracking-wide">Saldo Vencido</div>
                <div className="text-2xl font-black text-slate-900">{formatCurrency(cuenta.saldoPendiente)}</div>
                <div className="text-sm text-slate-500 font-medium">{cuenta.cliente.nombre}</div>
              </div>
            </div>

            {/* Current Status Block */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-3">
               <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500 font-medium">Interés Acumulado Actual</span>
                  <span className="text-slate-900 font-bold">{formatCurrency(cuenta.interesAcumulado || 0)}</span>
               </div>
               <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500 font-medium">Capital Pendiente</span>
                  <span className="text-slate-900 font-bold">{formatCurrency(cuenta.saldoPendiente - (cuenta.interesAcumulado || 0))}</span>
               </div>
               <div className="h-px bg-slate-200 my-2"></div>
               <div className="flex justify-between items-center">
                  <span className="text-slate-900 font-bold text-sm">Deuda Total Actual</span>
                  <span className="text-slate-900 font-black text-lg">{formatCurrency(cuenta.saldoPendiente)}</span>
               </div>
            </div>

            {/* Configuración de Interés */}
            <div className="space-y-4">
              <label className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 hover:border-blue-200 cursor-pointer transition-all group bg-white shadow-sm">
                <div className={cn(
                  "h-6 w-6 rounded-lg border-2 flex items-center justify-center transition-colors",
                  cobrarInteres ? "bg-[#08557f] border-[#08557f]" : "border-slate-300 bg-slate-50 group-hover:border-blue-300"
                )}>
                   <input 
                      type="checkbox" 
                      className="hidden" 
                      checked={cobrarInteres} 
                      onChange={(e) => setCobrarInteres(e.target.checked)} 
                   />
                   {cobrarInteres && <Check className="w-4 h-4 text-white" />}
                </div>
                <div>
                   <div className="text-sm font-bold text-slate-900">Modificar / Agregar Interés</div>
                   <div className="text-xs text-slate-500">Ajustar el monto total de la deuda</div>
                </div>
              </label>


              <div className={cn("transition-all duration-300 ease-in-out overflow-hidden", cobrarInteres ? "max-h-[350px] opacity-100" : "max-h-0 opacity-50")}>
                  <div className="bg-blue-50/50 rounded-2xl p-4 border border-blue-100 space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-900 ml-1 uppercase tracking-wider">Porcentaje de Interés Nuevo</label>
                        <div className="relative">
                        <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input 
                            type="number" 
                            value={montoInteres}
                            onChange={(e) => setMontoInteres(e.target.value)}
                            placeholder="0"
                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-blue-200 bg-white font-bold text-slate-900 focus:ring-4 focus:ring-[#08557f]/10 focus:border-[#08557f] outline-none transition-all placeholder:text-slate-300"
                        />
                        </div>
                        {/* Display Calculated Amount */}
                         {montoInteres && !isNaN(Number(montoInteres)) && (
                            <div className="flex items-center gap-2 pl-1 mt-1">
                                <span className="text-xs font-bold text-slate-500">Valor calculado:</span>
                                <span className="text-sm font-black text-[#08557f]">
                                    {formatCurrency((cuenta.saldoPendiente - (cuenta.interesAcumulado || 0)) * (Number(montoInteres) / 100))}
                                </span>
                            </div>
                         )}
                    </div>

                    {/* Projection */}
                    <div className="bg-white rounded-xl p-3 border border-blue-100 shadow-sm">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-bold text-slate-400 uppercase">Proyección de Deuda</span>
                            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                {Number(montoInteres) > 0 ? 'Con Interés' : 'Sin Cambios'}
                            </span>
                        </div>
                        <div className="flex items-end justify-between">
                            <div className="flex flex-col">
                                <span className="text-[10px] uppercase font-bold text-slate-400">Actual</span>
                                <div className="text-sm font-bold text-slate-400 line-through decoration-slate-400">
                                    {formatCurrency(cuenta.saldoPendiente)}
                                </div>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-[10px] uppercase font-bold text-slate-400">Nueva Total</span>
                                <div className="text-2xl font-black text-slate-900">
                                    {formatCurrency(
                                        (cuenta.saldoPendiente - (cuenta.interesAcumulado || 0)) + 
                                        ((cuenta.saldoPendiente - (cuenta.interesAcumulado || 0)) * (Number(montoInteres) / 100))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                  </div>
              </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 mt-4">
               <button onClick={onClose} className="py-3.5 px-4 rounded-xl text-slate-600 font-bold bg-slate-100 hover:bg-slate-200 transition-colors">
                  Cancelar
               </button>
               <button 
                onClick={handleConfirm}
                className="py-3.5 px-4 rounded-xl text-white font-bold bg-[#08557f] hover:bg-[#063a58] transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95"
               >
                  <Save className="h-4 w-4" />
                  Actualizar Cuenta
               </button>
            </div>

          </div>
        </div>
      </div>
    </Portal>
  )
}
