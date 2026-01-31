'use client'

import React, { useState } from 'react'
import {
  X,
  CheckCircle2,
  AlertCircle,
  Wallet
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
}

export default function ArqueoCajaModal({ onClose, cajaData }: ArqueoCajaModalProps) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  
  const [form, setForm] = useState({
    efectivoReal: '',
    observaciones: ''
  })

  // Calcular diferencia
  const real = form.efectivoReal ? parseCOPInputToNumber(form.efectivoReal) : 0
  const diferencia = real - cajaData.saldoSistema 

  const handleArqueo = async () => {
    setLoading(true)
    // Simular API call
    await new Promise(resolve => setTimeout(resolve, 1500))
    setLoading(false)
    setStep(3)
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Arqueo de Caja</h2>
            <p className="text-sm text-slate-500">{cajaData.nombre}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Scrollable */}
        <div className="overflow-y-auto flex-1">
            
            {step === 1 && (
                <div className="p-6 space-y-6">
                    {/* Resumen */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                            <div className="text-xs font-bold text-slate-500 uppercase mb-1">Saldo Sistema</div>
                            <div className="text-lg font-bold text-slate-900">{formatCurrency(cajaData.saldoSistema)}</div>
                        </div>
                        <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                            <div className="text-xs font-bold text-emerald-600 uppercase mb-1">Ingresos Hoy</div>
                            <div className="text-lg font-bold text-slate-900">+{formatCurrency(cajaData.ingresosDia)}</div>
                        </div>
                        <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100">
                            <div className="text-xs font-bold text-rose-600 uppercase mb-1">Egresos Hoy</div>
                            <div className="text-lg font-bold text-slate-900">-{formatCurrency(cajaData.egresosDia)}</div>
                        </div>
                    </div>

                    {/* Formulario */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">
                                Efectivo Real en Caja
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <span className="text-slate-400 font-bold">$</span>
                                </div>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    value={form.efectivoReal}
                                    onChange={(e) => setForm({ ...form, efectivoReal: formatCOPInputValue(e.target.value) })}
                                    className="pl-8 w-full rounded-xl border border-slate-300 py-3 text-lg font-bold text-slate-900 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none"
                                    placeholder="0"
                                    autoFocus
                                />
                            </div>
                        </div>

                        {form.efectivoReal && (
                            <div className={cn(
                                "p-4 rounded-xl border flex items-start gap-3 transition-all",
                                diferencia === 0 
                                    ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
                                    : diferencia > 0 
                                    ? "bg-blue-50 border-blue-200 text-blue-800"
                                    : "bg-rose-50 border-rose-200 text-rose-800"
                            )}>
                                {diferencia === 0 ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : <AlertCircle className="h-5 w-5 shrink-0" />}
                                <div>
                                    <div className="font-bold">
                                        {diferencia === 0 ? 'Cuadre Perfecto' : diferencia > 0 ? 'Sobrante detectado' : 'Faltante detectado'}
                                    </div>
                                    <div className="text-sm opacity-90">
                                        Diferencia de {formatCurrency(Math.abs(diferencia))}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">
                                Observaciones
                            </label>
                            <textarea
                                value={form.observaciones}
                                onChange={(e) => setForm({...form, observaciones: e.target.value})}
                                className="w-full rounded-xl border border-slate-300 py-3 px-4 text-sm text-slate-900 focus:ring-2 focus:ring-blue-600 focus:border-transparent min-h-[100px] resize-none outline-none"
                                placeholder="Notas del arqueo..."
                            />
                        </div>
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className="p-8 space-y-6">
                    <div className="text-center">
                        <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Wallet className="h-8 w-8" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900">Confirmar Arqueo</h3>
                        <p className="text-slate-500 text-sm mt-1">Verifique los valores registrados.</p>
                    </div>

                    <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <div className="flex justify-between items-center py-2 border-b border-slate-200">
                            <span className="text-slate-500 font-medium text-sm">Saldo Sistema</span>
                            <span className="font-bold text-slate-900">{formatCurrency(cajaData.saldoSistema)}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-slate-200">
                            <span className="text-slate-500 font-medium text-sm">Efectivo Contado</span>
                            <span className="font-bold text-slate-900">{formatCurrency(real)}</span>
                        </div>
                        <div className="flex justify-between items-center py-2">
                            <span className="text-slate-500 font-medium text-sm">Diferencia</span>
                            <span className={cn(
                                "font-bold px-2 py-0.5 rounded text-sm",
                                diferencia === 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                            )}>
                                {formatCurrency(diferencia)}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {step === 3 && (
                <div className="flex flex-col items-center justify-center py-12 px-6 text-center animate-in zoom-in duration-300">
                    <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-emerald-500/20">
                        <CheckCircle2 className="h-10 w-10" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">¡Arqueo Registrado!</h2>
                    <p className="text-slate-500 mb-8 text-sm max-w-xs mx-auto">
                        El arqueo se ha guardado correctamente.
                    </p>
                </div>
            )}

        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3 justify-end flex-shrink-0">
            {step === 1 && (
                <>
                    <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors">
                        Cancelar
                    </button>
                    <button 
                        onClick={() => setStep(2)}
                        disabled={!form.efectivoReal}
                        className="px-6 py-2 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        Continuar
                    </button>
                </>
            )}
            
            {step === 2 && (
                 <>
                    <button onClick={() => setStep(1)} className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors">
                        Volver
                    </button>
                    <button 
                        onClick={handleArqueo}
                        disabled={loading}
                        className="px-6 py-2 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-600/20 disabled:opacity-70 transition-all"
                    >
                        {loading ? 'Guardando...' : 'Confirmar Arqueo'}
                    </button>
                </>
            )}

            {step === 3 && (
                <button 
                    onClick={onClose}
                    className="w-full px-6 py-2 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all"
                >
                    Cerrar
                </button>
            )}
        </div>

      </div>
    </div>
  )
}
