import React, { useState } from 'react'
import { 
  X, 
  AlertCircle, 
  MapPin, 
  ShieldAlert, 
  User,
  MessageSquare,
  ChevronRight,
  Banknote,
  Check,
  Clock,
  Percent,
  CalendarClock,
  Phone
} from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'
import { createPortal } from 'react-dom'

interface DetalleMoraModalProps {
  cuenta: {
    id: string
    numeroPrestamo: string
    cliente: {
      nombre: string
      documento: string
      telefono: string
      direccion: string
    }
    diasMora: number
    montoMora: number
    montoTotalDeuda: number
    cuotasVencidas: number
    ruta: string
    cobrador: string
    nivelRiesgo: string
    fechaInicio?: string
    fechaMora?: string
    fechaVencimiento?: string
  }
  onClose: () => void
  onVerCliente?: (id: string) => void
}

const MODAL_Z_INDEX = 2147483647

function Portal({ children }: { children: React.ReactNode }) {
  if (typeof document === 'undefined') return null
  return createPortal(children, document.body)
}

export default function DetalleMoraModal({ cuenta, onClose, onVerCliente }: DetalleMoraModalProps) {
  const [moraAction, setMoraAction] = useState<'COBRAR' | 'TERMINAR' | 'DEJAR' | null>(null)
  const [moraInterest, setMoraInterest] = useState<number>(0)
  const [moraTerm, setMoraTerm] = useState<number>(0)

  const handleMoraAction = () => {
    console.log('Procesando mora:', {
      account: cuenta,
      action: moraAction,
      interest: moraInterest,
      term: moraTerm
    })
    onClose()
  }

  const getRiesgoColor = (riesgo: string) => {
    switch (riesgo) {
      case 'VERDE': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'AMARILLO': return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'ROJO': return 'bg-rose-50 text-rose-700 border-rose-100';
      case 'LISTA_NEGRA': return 'bg-slate-900 text-white border-slate-700';
      default: return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  }

  return (
    <Portal>
      <div
        className="fixed inset-0 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
        style={{ zIndex: MODAL_Z_INDEX }}
        onClick={onClose}
      >
        <div
          className="w-full max-w-3xl bg-white rounded-[2.5rem] shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-8 bg-linear-to-br from-slate-50 to-white border-b border-slate-100 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-rose-50 rounded-2xl border border-rose-100">
                <ShieldAlert className="w-6 h-6 text-rose-500" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Detalle de Mora</h3>
                <p className="text-xs font-black text-[#08557f] mt-1 uppercase tracking-widest">Préstamo {cuenta.numeroPrestamo}</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="overflow-y-auto custom-scrollbar p-8 space-y-8">
            
            {/* Top Banner: Financials & Risk */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-rose-50 rounded-[2rem] border border-rose-100 shadow-sm">
                <div className="space-y-1">
                  <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest">Días Atraso</p>
                  <p className="text-xl font-black text-rose-800 flex items-center gap-2">
                    {cuenta.diasMora} 
                    <span className={cn("text-[9px] px-2 py-0.5 rounded-full border", getRiesgoColor(cuenta.nivelRiesgo))}>{cuenta.nivelRiesgo}</span>
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest">Cuotas Venc.</p>
                  <p className="text-lg font-black text-rose-700">{cuenta.cuotasVencidas}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest">Mora Total</p>
                  <p className="text-lg font-black text-rose-600">{formatCurrency(cuenta.montoMora)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Deuda Total</p>
                  <p className="text-lg font-black text-slate-700">{formatCurrency(cuenta.montoTotalDeuda)}</p>
                </div>
            </div>

            {/* Main Grid: Client Info & Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Left Column: Client Details */}
              <div className="space-y-6">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Información del Cliente</h3>
                
                <div className="flex items-start gap-4 p-5 bg-slate-50/50 rounded-[2rem] border border-slate-100">
                  <div className="w-12 h-12 bg-[#08557f] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-900/10">
                    <User className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-black text-slate-900 text-lg">{cuenta.cliente.nombre}</div>
                    <div className="text-xs font-bold text-slate-500 mb-2">{cuenta.cliente.documento}</div>
                    
                    <div className="grid grid-cols-1 gap-2 my-4 bg-white p-3 rounded-xl border border-slate-100">
                      <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-200">
                         <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Inicio</span>
                         <span className="text-[10px] font-bold text-slate-700">{cuenta.fechaInicio || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between items-center bg-rose-50 p-2 rounded-lg border border-rose-100">
                         <span className="text-[9px] font-black uppercase text-rose-400 tracking-wider">Entró en Mora</span>
                         <span className="text-[10px] font-bold text-rose-700">{cuenta.fechaMora || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-200">
                         <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Vencimiento</span>
                         <span className="text-[10px] font-bold text-slate-700">{cuenta.fechaVencimiento || 'N/A'}</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2 mt-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                        <Phone className="w-3.5 h-3.5 text-emerald-500" />
                        {cuenta.cliente.telefono}
                      </div>
                      <div className="flex items-start gap-2 text-xs font-medium text-slate-500">
                        <MapPin className="w-3.5 h-3.5 text-blue-500 mt-0.5 shrink-0" />
                        <span className="leading-tight">{cuenta.cliente.direccion}</span>
                      </div>
                    </div>

                    {onVerCliente && (
                      <button 
                        onClick={() => onVerCliente(cuenta.id)}
                        className="mt-4 text-[10px] font-black text-[#08557f] hover:underline uppercase tracking-widest flex items-center gap-1"
                      >
                        Ver Perfil
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-5 bg-slate-50 rounded-[2rem] border border-slate-100">
                  <h4 className="font-black text-slate-900 text-xs uppercase tracking-wider mb-3 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-blue-500" />
                    Gestión Reciente
                  </h4>
                  <div className="text-sm text-slate-600 italic leading-relaxed">
                    “El cliente indica que realizará el pago el próximo viernes. Se le recordó que el interés por mora sigue aumentando.”
                  </div>
                </div>
              </div>

              {/* Right Column: Actions */}
              <div className="space-y-6">
                 <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-black text-[#08557f] uppercase tracking-[0.2em] ml-1">Acciones de Gestión</h3>
                    <div className="px-3 py-1 bg-blue-50 rounded-full border border-blue-100 text-[9px] font-black text-[#08557f] uppercase">Requerido</div>
                 </div>

                 <div className="space-y-4 p-6 bg-[#08557f]/[0.03] rounded-[2.5rem] border border-[#08557f]/10">
                    
                    <div className="grid grid-cols-1 gap-3">
                       <button 
                        onClick={() => setMoraAction('COBRAR')}
                        className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${
                          moraAction === 'COBRAR' ? 'border-emerald-500 bg-white shadow-lg shadow-emerald-900/10' : 'border-white bg-white/60 hover:border-slate-200'
                        }`}
                      >
                        <div className={`p-2.5 rounded-xl ${moraAction === 'COBRAR' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                          <Banknote className="h-5 w-5" />
                        </div>
                        <div className="text-left">
                          <span className={`block text-xs font-black uppercase tracking-wider ${moraAction === 'COBRAR' ? 'text-emerald-700' : 'text-slate-600'}`}>Cobrar Mora</span>
                          <span className="text-[10px] font-medium text-slate-400">Aplicar pago parcial o total</span>
                        </div>
                      </button>

                      <button 
                        onClick={() => setMoraAction('TERMINAR')}
                        className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${
                          moraAction === 'TERMINAR' ? 'border-orange-500 bg-white shadow-lg shadow-orange-900/10' : 'border-white bg-white/60 hover:border-slate-200'
                        }`}
                      >
                        <div className={`p-2.5 rounded-xl ${moraAction === 'TERMINAR' ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                          <Check className="h-5 w-5" />
                        </div>
                         <div className="text-left">
                          <span className={`block text-xs font-black uppercase tracking-wider ${moraAction === 'TERMINAR' ? 'text-orange-700' : 'text-slate-600'}`}>Terminar Cuenta</span>
                          <span className="text-[10px] font-medium text-slate-400">Dar por finalizada la gestión</span>
                        </div>
                      </button>

                      <button 
                        onClick={() => setMoraAction('DEJAR')}
                        className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${
                          moraAction === 'DEJAR' ? 'border-[#08557f] bg-white shadow-lg shadow-blue-900/10' : 'border-white bg-white/60 hover:border-slate-200'
                        }`}
                      >
                        <div className={`p-2.5 rounded-xl ${moraAction === 'DEJAR' ? 'bg-[#08557f] text-white' : 'bg-slate-100 text-slate-400'}`}>
                          <Clock className="h-5 w-5" />
                        </div>
                         <div className="text-left">
                          <span className={`block text-xs font-black uppercase tracking-wider ${moraAction === 'DEJAR' ? 'text-[#08557f]' : 'text-slate-600'}`}>Dejarlo ahí</span>
                          <span className="text-[10px] font-medium text-slate-400">Posponer acción por ahora</span>
                        </div>
                      </button>
                    </div>


                 </div>
              </div>
            </div>
          </div>

          <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4 shrink-0">
             <button 
                onClick={onClose}
                className="flex-1 py-4 px-6 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-500 hover:bg-slate-200 transition-all border border-slate-200 bg-white shadow-sm"
              >
                Cerrar
              </button>
              <button 
                onClick={handleMoraAction}
                disabled={!moraAction}
                className={`flex-[2] py-4 px-6 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl flex items-center justify-center gap-3 ${
                  !moraAction 
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' 
                    : 'bg-[#08557f] text-white shadow-blue-900/30 hover:scale-[1.02] active:scale-95'
                }`}
              >
                Procesar Gestión
                <ChevronRight className="h-4 w-4" />
              </button>
          </div>
        </div>
      </div>
    </Portal>
  )
}
