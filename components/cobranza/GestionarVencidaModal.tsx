import React, { useState } from 'react'
import { 
  X, 
  AlertCircle, 
  DollarSign, 
  Percent,
  Save,
  Ban,
  Calculator,
  Check,
  Clock,
  CalendarClock
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
  onConfirm: (data: { 
    decision: 'CASTIGAR' | 'PRORROGAR'; 
    montoInteres: number; 
    diasGracia: number;
    comentarios?: string;
  }) => void
}

const MODAL_Z_INDEX = 50

function Portal({ children }: { children: React.ReactNode }) {
  if (typeof document === 'undefined') return null
  return createPortal(children, document.body)
}

export default function GestionarVencidaModal({ cuenta, onClose, onConfirm }: GestionarVencidaModalProps) {
  const [decision, setDecision] = useState<'CASTIGAR' | 'PRORROGAR'>('PRORROGAR')
  const [cobrarInteres, setCobrarInteres] = useState(true)
  const [montoInteres, setMontoInteres] = useState<string>('')
  const [diasGracia, setDiasGracia] = useState<string>('30')
  const [comentarios, setComentarios] = useState('')
  
  const handleConfirm = () => {
    onConfirm({
      decision,
      montoInteres: cobrarInteres ? Number(montoInteres) : 0,
      diasGracia: Number(diasGracia),
      comentarios
    })
    onClose()
  }

  // Calcular nueva fecha proyectada
  const getNuevaFecha = () => {
    const hoy = new Date()
    hoy.setDate(hoy.getDate() + Number(diasGracia || 0))
    return hoy.toLocaleDateString()
  }

  return (
    <Portal>
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity z-[49]" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center p-4 overflow-y-auto" style={{ zIndex: MODAL_Z_INDEX }}>
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 my-8">
          
          {/* Header */}
          <div className={cn(
            "px-6 py-5 flex items-center justify-between relative overflow-hidden transition-colors",
            decision === 'PRORROGAR' ? "bg-[#08557f]" : "bg-slate-800"
          )}>
             
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
                Préstamo: <span className="text-white font-mono bg-white/10 px-1.5 py-0.5 rounded">{cuenta.numeroPrestamo}</span>
              </p>
            </div>
            <button 
              onClick={onClose}
              className="relative z-10 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors border border-white/10"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
            
            {/* Resumen */}
            <div className="flex items-center gap-4 p-4 bg-rose-50 rounded-2xl border border-rose-100">
              <div className="h-12 w-12 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 font-bold shrink-0">
                {cuenta.diasVencidos}d
              </div>
              <div className="flex-1">
                <div className="text-xs font-bold text-rose-600 uppercase tracking-wide">Saldo Vencido</div>
                <div className="text-2xl font-black text-slate-900">{formatCurrency(cuenta.saldoPendiente)}</div>
                <div className="text-sm text-slate-500 font-medium">{cuenta.cliente.nombre}</div>
              </div>
            </div>

            {/* Tipo de Decisión */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setDecision('PRORROGAR')}
                className={cn(
                  "p-4 rounded-2xl border-2 transition-all text-left",
                  decision === 'PRORROGAR' 
                    ? "border-[#08557f] bg-blue-50/50" 
                    : "border-slate-100 bg-slate-50 hover:border-slate-200"
                )}
              >
                <Clock className={cn("h-5 w-5 mb-2", decision === 'PRORROGAR' ? "text-[#08557f]" : "text-slate-400")} />
                <div className="text-sm font-bold text-slate-900">Prorrogar Plan</div>
                <div className="text-[10px] text-slate-500 font-medium">Extender plazo de pago</div>
              </button>
              <button
                onClick={() => setDecision('CASTIGAR')}
                className={cn(
                  "p-4 rounded-2xl border-2 transition-all text-left",
                  decision === 'CASTIGAR' 
                    ? "border-rose-500 bg-rose-50/50" 
                    : "border-slate-100 bg-slate-50 hover:border-slate-200"
                )}
              >
                <Ban className={cn("h-5 w-5 mb-2", decision === 'CASTIGAR' ? "text-rose-500" : "text-slate-400")} />
                <div className="text-sm font-bold text-slate-900">Reportar Pérdida</div>
                <div className="text-[10px] text-slate-500 font-medium">Castigar cartera vencida</div>
              </button>
            </div>

            {decision === 'PRORROGAR' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                {/* Plazo / Tiempo */}
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1.5 block uppercase tracking-wider">Tiempo de Plazo (Días)</label>
                  <div className="relative">
                    <CalendarClock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input 
                      type="number" 
                      value={diasGracia}
                      onChange={(e) => setDiasGracia(e.target.value)}
                      placeholder="30"
                      min="1"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white font-bold text-slate-900 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 outline-none transition-all"
                    />
                  </div>
                  <p className="text-[10px] text-blue-600 font-bold mt-1.5 flex items-center gap-1">
                    Nueva fecha límite: <span className="text-slate-900">{getNuevaFecha()}</span>
                  </p>
                </div>

                {/* Interés de Mora */}
                <div className="space-y-3">
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
                       <div className="text-sm font-bold text-slate-900">Aplicar Interés de Mora</div>
                       <div className="text-xs text-slate-500 text-balance">Se sumará al saldo pendiente del cliente</div>
                    </div>
                  </label>

                  {cobrarInteres && (
                    <div className="space-y-1.5 animate-in zoom-in-95">
                        <label className="text-xs font-bold text-slate-900 ml-1 uppercase tracking-wider">Monto de Interés Manual ($)</label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <input 
                              type="number" 
                              value={montoInteres}
                              onChange={(e) => setMontoInteres(e.target.value)}
                              placeholder="0"
                              className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#08557f]/20 bg-white font-black text-slate-900 focus:ring-4 focus:ring-[#08557f]/10 focus:border-[#08557f] outline-none transition-all"
                          />
                        </div>
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 mt-3">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-500 font-medium">Nueva Deuda Total</span>
                            <span className="text-slate-900 font-black text-base">{formatCurrency(cuenta.saldoPendiente + Number(montoInteres || 0))}</span>
                          </div>
                        </div>
                    </div>
                  )}
                </div>

                {/* Comentarios */}
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1.5 block uppercase tracking-wider">Observaciones</label>
                  <textarea 
                    value={comentarios}
                    onChange={(e) => setComentarios(e.target.value)}
                    placeholder="Ej. El cliente se compromete a pagar..."
                    className="w-full p-4 rounded-xl border border-slate-200 bg-white text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 outline-none transition-all min-h-[100px] resize-none"
                  />
                </div>
              </div>
            )}

            {decision === 'CASTIGAR' && (
              <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100 space-y-3 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-rose-900">¿Desea reportar esta cuenta como pérdida?</h4>
                    <p className="text-xs text-rose-700 leading-relaxed mt-1">
                      Esta acción marcará el préstamo como incobrable y el capital restante {formatCurrency(cuenta.saldoPendiente)} será registrado como saldo negativo en el balance.
                    </p>
                  </div>
                </div>
                <textarea 
                    value={comentarios}
                    onChange={(e) => setComentarios(e.target.value)}
                    placeholder="Escriba la razón del castigo de cartera..."
                    className="w-full p-3 rounded-xl border border-rose-200 bg-white text-sm font-medium focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 outline-none transition-all min-h-[80px]"
                  />
              </div>
            )}

            {/* Actions */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 mt-4">
               <button onClick={onClose} className="py-3.5 px-4 rounded-xl text-slate-600 font-bold bg-slate-100 hover:bg-slate-200 transition-colors">
                  Cancelar
               </button>
               <button 
                onClick={handleConfirm}
                className={cn(
                  "py-3.5 px-4 rounded-xl text-white font-bold transition-all shadow-lg flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95",
                  decision === 'PRORROGAR' ? "bg-[#08557f] shadow-blue-900/20 hover:bg-[#063a58]" : "bg-rose-600 shadow-rose-900/20 hover:bg-rose-700"
                )}
               >
                  <Save className="h-4 w-4" />
                  {decision === 'PRORROGAR' ? 'Actualizar Cuenta' : 'Reportar Pérdida'}
               </button>
            </div>

          </div>
        </div>
      </div>
    </Portal>
  )
}
