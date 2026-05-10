'use client'

import React, { useState } from 'react'
import {
  X,
  CheckCircle2,
  AlertCircle,
  Wallet,
  WifiOff,
  ArrowRight,
  ShieldCheck
} from 'lucide-react'
import { formatCOPInputValue, formatCurrency, parseCOPInputToNumber, cn } from '@/lib/utils'

interface ArqueoCajaModalProps {
  onClose: () => void
  cajaData: {
    nombre: string
    saldoSistema: number
    ingresosDia: number
    egresosDia: number
    responsable: string
  }
  hayColaOffline?: boolean // Mock para las alertas offline
}

export default function ArqueoCajaModal({ onClose, cajaData, hayColaOffline = false }: ArqueoCajaModalProps) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  
  const [form, setForm] = useState({
    efectivoReal: '',
    observaciones: ''
  })

  const real = form.efectivoReal ? parseCOPInputToNumber(form.efectivoReal) : 0
  const diferencia = real - cajaData.saldoSistema 

  const handleArqueo = async () => {
    setLoading(true)
    await new Promise(resolve => setTimeout(resolve, 1500))
    setLoading(false)
    setStep(3)
  }

  const StepIndicator = ({ current }: { current: number }) => (
    <div className="flex items-center gap-2 mb-8">
      <div className="flex items-center gap-2">
        <span className={cn("text-xs font-black uppercase tracking-widest", current === 1 ? "text-blue-600" : "text-slate-400")}>1. Conteo</span>
        <ArrowRight className="h-3 w-3 text-slate-300" />
        <span className={cn("text-xs font-black uppercase tracking-widest", current === 2 ? "text-blue-600" : "text-slate-400")}>2. Revisión</span>
        <ArrowRight className="h-3 w-3 text-slate-300" />
        <span className={cn("text-xs font-black uppercase tracking-widest", current === 3 ? "text-emerald-500" : "text-slate-400")}>3. Cierre</span>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-full bg-white shadow-2xl ring-1 ring-slate-900/5 overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col sm:flex-row h-auto max-h-[90vh] rounded-[2rem] sm:rounded-[2.5rem] max-w-4xl relative">
        
        {/* Lateral Fijo (Desktop) */}
        <div className="bg-slate-50/50 border-r border-slate-100 p-8 sm:w-[35%] flex flex-col justify-between hidden sm:flex">
          <div>
            <div className="w-12 h-12 bg-white shadow-sm ring-1 ring-slate-200/50 text-blue-600 rounded-[1rem] flex items-center justify-center mb-8">
              <Wallet className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-tight mb-2">Arqueo<br/>de Caja</h2>
            <p className="text-sm font-medium text-slate-500 mb-10">{cajaData.nombre}</p>

            <div className="space-y-6">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Responsable</p>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
                    {cajaData.responsable.charAt(0)}
                  </div>
                  <p className="text-sm font-bold text-slate-700">{cajaData.responsable}</p>
                </div>
              </div>
              
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50/50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 relative z-10">Saldo Esperado</p>
                <p className="text-2xl font-black text-slate-900 tracking-tight relative z-10">{formatCurrency(cajaData.saldoSistema)}</p>
              </div>
            </div>
          </div>
          
          {hayColaOffline && (
            <div className="bg-white border border-amber-100 shadow-sm rounded-2xl p-4 flex items-start gap-3 mt-8">
              <div className="p-2 bg-amber-50 rounded-xl shrink-0">
                <WifiOff className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-amber-900">Modo Offline</p>
                <p className="text-[10px] text-amber-700 mt-1 font-medium leading-relaxed">Hay movimientos en cola. El saldo podría cambiar al sincronizar.</p>
              </div>
            </div>
          )}
        </div>

        {/* Content Principal */}
        <div className="flex-1 flex flex-col h-[85vh] sm:h-auto bg-white">
          {/* Header Mobile Only */}
          <div className="flex sm:hidden items-center justify-between p-6 border-b border-slate-100">
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Arqueo de Caja</h2>
              <p className="text-xs font-medium text-slate-500 mt-0.5">{cajaData.nombre}</p>
            </div>
            <button onClick={onClose} className="p-2 bg-slate-50 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Close button Desktop Only */}
          <div className="hidden sm:flex justify-end p-6 pb-0 absolute top-0 right-0 z-10">
            <button onClick={onClose} className="p-2 bg-slate-50 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="overflow-y-auto flex-1 p-6 sm:p-12 custom-scrollbar">
              <StepIndicator current={step} />

              {step === 1 && (
                  <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
                      <div className="sm:hidden bg-slate-50 p-5 rounded-2xl border border-slate-100 mb-6">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Saldo Esperado</p>
                        <p className="text-2xl font-black text-slate-900">{formatCurrency(cajaData.saldoSistema)}</p>
                      </div>

                      <div>
                          <div className="mb-8">
                            <h3 className="text-xl font-black text-slate-900 mb-2">Ingresa el efectivo real</h3>
                            <p className="text-sm font-medium text-slate-500">Cuenta los billetes y monedas que hay físicamente en la caja e ingresa el total.</p>
                          </div>
                          
                          <div className="space-y-8">
                            <div>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
                                        <span className="text-slate-400 font-black text-2xl">$</span>
                                    </div>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        value={form.efectivoReal}
                                        onChange={(e) => setForm({ ...form, efectivoReal: formatCOPInputValue(e.target.value) })}
                                        className="pl-12 w-full rounded-[2rem] border-2 border-slate-100 bg-slate-50/50 py-6 text-4xl sm:text-5xl font-black tracking-tight text-slate-900 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                                        placeholder="0"
                                        autoFocus
                                    />
                                </div>
                            </div>

                            {form.efectivoReal && (
                                <div className={cn(
                                    "p-5 rounded-2xl flex items-start gap-4 transition-all duration-300 animate-in slide-in-from-bottom-2 opacity-100",
                                    diferencia === 0 
                                        ? "bg-emerald-50/50 text-emerald-800" 
                                        : diferencia > 0 
                                        ? "bg-blue-50/50 text-blue-800"
                                        : "bg-rose-50/50 text-rose-800"
                                )}>
                                    <div className={cn(
                                      "p-2 rounded-xl shrink-0 mt-0.5",
                                      diferencia === 0 ? "bg-emerald-100 text-emerald-600" : diferencia > 0 ? "bg-blue-100 text-blue-600" : "bg-rose-100 text-rose-600"
                                    )}>
                                      {diferencia === 0 ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                                    </div>
                                    <div>
                                        <div className="font-bold text-sm mb-0.5">
                                            {diferencia === 0 ? 'Cuadre Perfecto' : diferencia > 0 ? 'Sobrante detectado' : 'Faltante detectado'}
                                        </div>
                                        <div className="text-sm opacity-80 font-medium">
                                            {diferencia === 0 ? 'Los montos coinciden exactamente.' : `Existe una diferencia de ${formatCurrency(Math.abs(diferencia))}`}
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                                    Notas y Observaciones (opcional)
                                </label>
                                <textarea
                                    value={form.observaciones}
                                    onChange={(e) => setForm({...form, observaciones: e.target.value})}
                                    className="w-full rounded-2xl border border-slate-200 bg-white py-4 px-5 text-sm font-medium text-slate-700 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 min-h-[100px] resize-none outline-none transition-all shadow-sm"
                                    placeholder="Agrega cualquier comentario sobre el cuadre..."
                                />
                            </div>
                          </div>
                      </div>
                  </div>
              )}

              {step === 2 && (
                  <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
                      <div>
                        <div className="mb-8">
                          <h3 className="text-xl font-black text-slate-900 mb-2">Revisión de Cierre</h3>
                          <p className="text-sm font-medium text-slate-500">Confirma que los datos son correctos antes de asentar el arqueo definitivamente.</p>
                        </div>
                        
                        <div className="space-y-6">
                          <div className="grid grid-cols-2 gap-4">
                              <div className="bg-slate-50/50 border border-slate-100 p-5 rounded-[1.5rem]">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Sistema</p>
                                <p className="text-xl font-black text-slate-900">{formatCurrency(cajaData.saldoSistema)}</p>
                              </div>
                              <div className="bg-slate-50/50 border border-slate-100 p-5 rounded-[1.5rem]">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Físico</p>
                                <p className="text-xl font-black text-slate-900">{formatCurrency(real)}</p>
                              </div>
                          </div>

                          <div className={cn(
                              "p-6 rounded-[1.5rem] flex items-center justify-between border",
                              diferencia === 0 ? "bg-emerald-50/30 border-emerald-100" : "bg-rose-50/30 border-rose-100"
                          )}>
                              <div>
                                <p className={cn(
                                  "text-[10px] font-black uppercase tracking-widest mb-1",
                                  diferencia === 0 ? "text-emerald-600" : "text-rose-600"
                                )}>
                                  Diferencia Total
                                </p>
                                <p className={cn(
                                  "text-2xl font-black tracking-tight",
                                  diferencia === 0 ? "text-emerald-700" : "text-rose-700"
                                )}>
                                  {formatCurrency(diferencia)}
                                </p>
                              </div>
                              {diferencia === 0 && (
                                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                                  <ShieldCheck className="h-6 w-6" />
                                </div>
                              )}
                          </div>

                          {form.observaciones && (
                             <div className="bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-sm">
                               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Observaciones</p>
                               <p className="text-sm font-medium text-slate-700 leading-relaxed">{form.observaciones}</p>
                             </div>
                          )}
                        </div>
                      </div>
                  </div>
              )}

              {step === 3 && (
                  <div className="flex flex-col items-center justify-center py-16 px-6 text-center animate-in zoom-in duration-500">
                      <div className="relative mb-8">
                        <div className="absolute inset-0 bg-emerald-500 blur-2xl opacity-20 rounded-full"></div>
                        <div className="w-28 h-28 bg-white ring-1 ring-slate-900/5 text-emerald-500 rounded-[2rem] flex items-center justify-center shadow-xl relative z-10">
                            <CheckCircle2 className="h-14 w-14" />
                        </div>
                      </div>
                      <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Arqueo Exitoso</h2>
                      <p className="text-slate-500 font-medium text-sm max-w-xs mx-auto leading-relaxed">
                          La conciliación física de <strong>{cajaData.nombre}</strong> ha sido guardada en el Ledger.
                      </p>
                  </div>
              )}

          </div>

          {/* Footer Actions */}
          <div className="p-6 sm:px-12 pb-8 border-t border-slate-100 flex gap-3 justify-end flex-shrink-0 bg-white sm:rounded-br-[2.5rem]">
              {step === 1 && (
                  <>
                      <button onClick={onClose} className="px-6 py-3.5 text-sm font-bold text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-2xl transition-colors hidden sm:block">
                          Cancelar
                      </button>
                      <button 
                          onClick={() => setStep(2)}
                          disabled={!form.efectivoReal}
                          className="w-full sm:w-auto px-10 py-3.5 bg-slate-900 text-white text-sm font-bold rounded-2xl hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-xl shadow-slate-900/10"
                      >
                          Continuar
                      </button>
                  </>
              )}
              
              {step === 2 && (
                   <>
                      <button onClick={() => setStep(1)} className="px-6 py-3.5 text-sm font-bold text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-2xl transition-colors">
                          Modificar
                      </button>
                      <button 
                          onClick={handleArqueo}
                          disabled={loading}
                          className="w-full sm:w-auto px-10 py-3.5 bg-blue-600 text-white text-sm font-bold rounded-2xl hover:bg-blue-700 disabled:opacity-70 transition-all shadow-xl shadow-blue-600/20 flex items-center justify-center gap-2"
                      >
                          {loading && <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin"></div>}
                          {loading ? 'Asentando...' : 'Confirmar y Asentar'}
                      </button>
                  </>
              )}

              {step === 3 && (
                  <button 
                      onClick={onClose}
                      className="w-full sm:w-auto px-12 py-3.5 bg-slate-900 text-white text-sm font-bold rounded-2xl hover:bg-slate-800 shadow-xl shadow-slate-900/10 transition-all"
                  >
                      Finalizar
                  </button>
              )}
          </div>
        </div>
      </div>
    </div>
  )
}
