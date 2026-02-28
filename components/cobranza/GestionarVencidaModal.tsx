'use client'

/**
 * GestionarVencidaModal — Gestionar una cuenta cuyo contrato ya venció
 *
 * Opciones:
 * - PRORROGAR: extender el plazo con opción de cobrar mora
 * - CASTIGAR:  marcar como pérdida contable
 * - JURIDICO:  escalar a cobro jurídico
 *
 * Diseño consistente con el sistema: header de gradiente, footer slate,
 * scroll interno, cierre al click fuera, loading state.
 */

import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import {
  X, AlertCircle, DollarSign, Save, Ban, Clock,
  CalendarClock, Check, Loader2, Scale, Info,
  ChevronRight
} from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'

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
    decision: 'CASTIGAR' | 'PRORROGAR'
    montoInteres: number
    diasGracia: number
    comentarios?: string
  }) => void
}

type Decision = 'PRORROGAR' | 'CASTIGAR'

const DECISION_CONFIG: Record<Decision, {
  label: string
  description: string
  icon: React.ReactNode
  activeColor: string
  activeBorder: string
  activeBg: string
}> = {
  PRORROGAR: {
    label: 'Prorrogar Plan',
    description: 'Extender plazo + cobrar mora opcional',
    icon: <Clock className="h-5 w-5" />,
    activeColor: 'text-[#08557f]',
    activeBorder: 'border-[#08557f]',
    activeBg: 'bg-blue-50/50',
  },
  CASTIGAR: {
    label: 'Reportar Pérdida',
    description: 'Castigar cartera como incobrable',
    icon: <Ban className="h-5 w-5" />,
    activeColor: 'text-rose-700',
    activeBorder: 'border-rose-500',
    activeBg: 'bg-rose-50/50',
  },
}

function Portal({ children }: { children: React.ReactNode }) {
  if (typeof document === 'undefined') return null
  return createPortal(children, document.body)
}

export default function GestionarVencidaModal({ cuenta, onClose, onConfirm }: GestionarVencidaModalProps) {
  const [decision, setDecision] = useState<Decision>('PRORROGAR')
  const [cobrarInteres, setCobrarInteres] = useState(true)
  const [montoInteres, setMontoInteres] = useState<string>('')
  const [diasGracia, setDiasGracia] = useState<string>('30')
  const [comentarios, setComentarios] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const cfg = DECISION_CONFIG[decision]

  const nuevaFecha = (() => {
    const d = new Date()
    d.setDate(d.getDate() + Number(diasGracia || 0))
    return d.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
  })()

  const montoInteresNum = cobrarInteres ? Number(montoInteres || 0) : 0

  const isValid = decision !== 'PRORROGAR' || (Number(diasGracia) >= 1)

  const handleConfirm = async () => {
    if (!isValid || isLoading) return
    setIsLoading(true)
    try {
      await onConfirm({
        decision,
        montoInteres: montoInteresNum,
        diasGracia: decision === 'PRORROGAR' ? Number(diasGracia) : 0,
        comentarios,
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Portal>
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
        style={{ zIndex: 2147483600 }}
        onClick={onClose}
      />
      <div
        className="fixed inset-0 flex items-center justify-center p-4"
        style={{ zIndex: 2147483601 }}
      >
        <div
          className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] border border-slate-100"
          onClick={e => e.stopPropagation()}
        >
          {/* ── Header ── */}
          <div className={cn(
            'px-7 py-5 relative overflow-hidden shrink-0 transition-colors duration-300',
            decision === 'PRORROGAR' ? 'bg-gradient-to-br from-[#08557f] to-blue-800'
            : decision === 'CASTIGAR'  ? 'bg-gradient-to-br from-rose-700 to-rose-900'
            : 'bg-gradient-to-br from-slate-700 to-slate-900'
          )}>
            <div className="absolute inset-0 opacity-10">
              <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white blur-3xl" />
            </div>
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/15 rounded-xl text-white">
                  <AlertCircle className="h-5 w-5 text-orange-300" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white tracking-tight">Gestión de Cuenta Vencida</h2>
                  <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mt-0.5">
                    {cuenta.numeroPrestamo} · {cuenta.cliente.nombre}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* ── Body ── */}
          <div className="overflow-y-auto flex-1 p-6 space-y-5">

            {/* Resumen del saldo */}
            <div className="flex items-center gap-4 p-4 bg-rose-50 rounded-2xl border border-rose-100">
              <div className="h-12 w-12 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-700 font-black text-sm shrink-0">
                {cuenta.diasVencidos}d
              </div>
              <div className="flex-1">
                <div className="text-[9px] font-black text-rose-500 uppercase tracking-widest">Saldo Vencido</div>
                <div className="text-2xl font-black text-slate-900">{formatCurrency(cuenta.saldoPendiente)}</div>
                <div className="text-xs text-slate-500 font-medium">{cuenta.cliente.nombre} · {cuenta.ruta || 'Sin ruta'}</div>
              </div>
            </div>

            {/* Selector de decisión */}
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-2">
                Tipo de acción
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(DECISION_CONFIG) as Decision[]).map(d => {
                  const c = DECISION_CONFIG[d]
                  const isActive = decision === d
                  return (
                    <button
                      key={d}
                      onClick={() => setDecision(d)}
                      className={cn(
                        'p-3 rounded-2xl border-2 transition-all text-left',
                        isActive ? cn(c.activeBorder, c.activeBg) : 'border-slate-100 bg-slate-50 hover:border-slate-200'
                      )}
                    >
                      <div className={cn('mb-1.5', isActive ? c.activeColor : 'text-slate-400')}>
                        {c.icon}
                      </div>
                      <div className={cn('text-xs font-black', isActive ? 'text-slate-900' : 'text-slate-600')}>
                        {c.label}
                      </div>
                      <div className="text-[9px] text-slate-400 font-medium mt-0.5 leading-tight">
                        {c.description}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Panel de PRORROGAR */}
            {decision === 'PRORROGAR' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                {/* Días */}
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-2">
                    Días de extensión
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 h-8 w-8 bg-blue-50 rounded-xl flex items-center justify-center border border-blue-100">
                      <CalendarClock className="h-4 w-4 text-blue-600" />
                    </div>
                    <input
                      type="number"
                      value={diasGracia}
                      onChange={e => setDiasGracia(e.target.value)}
                      placeholder="30"
                      min="1"
                      className="w-full pl-14 pr-4 py-4 rounded-2xl border border-slate-200 font-black text-xl text-slate-900 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 outline-none transition-all"
                    />
                  </div>
                  {Number(diasGracia) > 0 && (
                    <p className="text-[10px] text-blue-600 font-bold mt-1.5 flex items-center gap-1">
                      Nueva fecha límite: <span className="text-slate-900 ml-1">{nuevaFecha}</span>
                    </p>
                  )}
                </div>

                {/* Interés */}
                <div className="space-y-3">
                  <label
                    className="flex items-center gap-3 p-4 rounded-2xl border border-slate-200 hover:border-blue-200 cursor-pointer transition-all bg-white shadow-sm"
                    onClick={() => setCobrarInteres(!cobrarInteres)}
                  >
                    <div className={cn(
                      'h-6 w-6 rounded-lg border-2 flex items-center justify-center transition-colors shrink-0',
                      cobrarInteres ? 'bg-[#08557f] border-[#08557f]' : 'border-slate-300 bg-slate-50'
                    )}>
                      {cobrarInteres && <Check className="w-4 h-4 text-white" />}
                    </div>
                    <div>
                      <div className="text-sm font-black text-slate-900">Cobrar interés de mora adicional</div>
                      <div className="text-xs text-slate-500">Se sumará al saldo pendiente</div>
                    </div>
                  </label>

                  {cobrarInteres && (
                    <div className="space-y-2 animate-in zoom-in-95 duration-200">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] block">
                        Monto del interés ($)
                      </label>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 h-8 w-8 bg-amber-50 rounded-xl flex items-center justify-center border border-amber-100">
                          <DollarSign className="h-4 w-4 text-amber-600" />
                        </div>
                        <input
                          type="number"
                          value={montoInteres}
                          onChange={e => setMontoInteres(e.target.value)}
                          placeholder="0"
                          className="w-full pl-14 pr-4 py-4 rounded-2xl border border-amber-200 font-black text-xl text-slate-900 focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all"
                        />
                      </div>
                      {montoInteresNum > 0 && (
                        <div className="flex justify-between items-center px-4 py-3 bg-slate-50 rounded-2xl border border-slate-200 text-sm">
                          <span className="text-slate-500 font-medium">Nueva deuda total</span>
                          <span className="font-black text-slate-900">{formatCurrency(cuenta.saldoPendiente + montoInteresNum)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Panel de CASTIGAR */}
            {decision === 'CASTIGAR' && (
              <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-black text-rose-900">¿Reportar como pérdida?</h4>
                    <p className="text-xs text-rose-700 leading-relaxed mt-1">
                      Esta acción marcará el préstamo como pérdida contable.
                      El capital restante <strong>{formatCurrency(cuenta.saldoPendiente)}</strong> quedará registrado como cartera castigada.
                      Esta acción es <strong>irreversible</strong>.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Observaciones */}
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-2">
                Observaciones {decision !== 'CASTIGAR' ? '(opcional)' : '(requerido)'}
              </label>
              <textarea
                value={comentarios}
                onChange={e => setComentarios(e.target.value)}
                placeholder={
                  decision === 'PRORROGAR' ? 'Ej: El cliente se compromete a pagar...'
                  : 'Razón del castigo de cartera...'
                }
                rows={3}
                className="w-full p-4 rounded-2xl border border-slate-200 bg-white text-sm font-medium text-slate-700 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 outline-none transition-all resize-none placeholder:text-slate-300"
              />
            </div>
          </div>

          {/* ── Footer ── */}
          <div className="px-6 py-5 bg-slate-50 border-t border-slate-100 flex gap-3 shrink-0">
            <button
              onClick={onClose}
              className="flex-1 py-3.5 px-4 rounded-2xl text-slate-600 font-black text-[10px] uppercase tracking-widest bg-white border border-slate-200 hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={!isValid || isLoading || (decision === 'CASTIGAR' && !comentarios.trim())}
              className={cn(
                'flex-[2] py-3.5 px-4 rounded-2xl text-white font-black text-[10px] uppercase tracking-widest transition-all shadow-xl flex items-center justify-center gap-2',
                (!isValid || isLoading || (decision === 'CASTIGAR' && !comentarios.trim()))
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                  : decision === 'PRORROGAR'
                    ? 'bg-[#08557f] shadow-blue-900/20 hover:scale-[1.02] active:scale-95'
                    : 'bg-rose-600 shadow-rose-900/20 hover:bg-rose-700'
              )}
            >
              {isLoading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Procesando...</>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {decision === 'PRORROGAR' ? 'Confirmar Prórroga' : 'Confirmar Pérdida'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  )
}
