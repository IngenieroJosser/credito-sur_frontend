'use client'

import React from 'react'
import { 
  X, 
  AlertCircle, 
  MapPin, 
  ShieldAlert, 
  User,
  MessageSquare,
  ChevronRight
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
          className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-slate-100 flex items-start justify-between sticky top-0 bg-white z-10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-50 rounded-xl">
                <AlertCircle className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Detalle de Mora</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Préstamo {cuenta.numeroPrestamo}</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 bg-slate-50 border border-slate-200 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Info Cliente & Riesgo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Cliente Deudor</div>
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-lg">{cuenta.cliente.nombre}</div>
                    <div className="text-sm font-medium text-slate-500 font-mono">{cuenta.cliente.documento}</div>
                    
                    {onVerCliente && (
                      <button 
                        onClick={() => onVerCliente(cuenta.id)}
                        className="mt-2 text-[10px] font-black text-blue-600 hover:text-blue-700 uppercase tracking-widest flex items-center gap-1 group/btn"
                      >
                        Ver Perfil Completo 
                        <ChevronRight className="w-3 h-3 transition-transform group-hover/btn:translate-x-0.5" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    {cuenta.cliente.direccion}
                  </div>
                </div>
              </div>

              <div className={cn("p-5 rounded-2xl border flex flex-col justify-between", getRiesgoColor(cuenta.nivelRiesgo))}>
                <div className="flex justify-between items-start mb-2">
                  <div className="text-[10px] font-black uppercase tracking-widest opacity-70">Nivel de Riesgo</div>
                  <ShieldAlert className="w-5 h-5 opacity-50" />
                </div>
                <div className="text-2xl font-black">{cuenta.nivelRiesgo}</div>
                <div className="text-xs font-bold mt-2 opacity-80 uppercase tracking-tight">Requiere Gestión Inmediata</div>
              </div>
            </div>

            {/* Resumen Financiero */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Días Mora</div>
                        <div className="text-2xl font-black text-rose-600">{cuenta.diasMora}</div>
                    </div>
                    <div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Cuotas Venc.</div>
                        <div className="text-2xl font-black text-rose-600">{cuenta.cuotasVencidas}</div>
                    </div>
                    <div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Monto en Mora</div>
                        <div className="text-xl font-black text-slate-900">{formatCurrency(cuenta.montoMora)}</div>
                    </div>
                    <div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Deuda Total</div>
                        <div className="text-xl font-black text-slate-900">{formatCurrency(cuenta.montoTotalDeuda)}</div>
                    </div>
                </div>
            </div>

            {/* Detalles Operativos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Ruta</div>
                    <div className="font-bold text-slate-900">{cuenta.ruta}</div>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200">
                    <MapPin className="w-4 h-4 text-blue-500" />
                  </div>
               </div>
               <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Cobrador Responsable</div>
                    <div className="font-bold text-slate-900">{cuenta.cobrador}</div>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200">
                    <User className="w-4 h-4 text-blue-500" />
                  </div>
               </div>
            </div>

            {/* Notas Rápidas */}
            <div className="space-y-3">
               <h4 className="font-bold text-slate-900 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-slate-400" />
                  Gestión Reciente
               </h4>
               <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 italic text-sm text-slate-600">
                  &ldquo;El cliente indica que realizará el pago el próximo viernes. Se le recordó que el interés por mora sigue aumentando.&rdquo;
               </div>
            </div>

            <div className="pt-4 flex gap-3">
                <button 
                  onClick={onClose}
                  className="flex-1 px-6 py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition-all text-sm uppercase tracking-widest shadow-lg shadow-slate-200"
                >
                    Cerrar Detalle
                </button>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  )
}
