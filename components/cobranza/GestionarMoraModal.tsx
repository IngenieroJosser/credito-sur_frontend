'use client'

/**
 * GestionarMoraModal — Asignar interés de mora manual
 *
 * Diseño consistente con el sistema (header de gradiente azul, footer slate,
 * scroll interno, cierre al click fuera).
 *
 * Flujo:
 * 1. El coordinador elige el porcentaje (con sugerencias) o un monto fijo
 * 2. Define cuántos días tiene el cliente para pagar
 * 3. Guarda → se envía al backend vía onConfirm
 */

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  X, DollarSign, Save, Percent, Info, TimerReset,
  Calendar, AlertTriangle, CheckCircle, Loader2,
  ChevronDown
} from 'lucide-react'
import { formatCurrency, cn, formatCOPDecimalTypingInputValue, formatCOPDecimalBlurInputValue, parseCOPDecimalInputToNumber } from '@/lib/utils'

interface GestionarMoraModalProps {
  cuenta: {
    id: string
    numeroPrestamo: string
    saldoPendiente: number
    montoOriginal: number
    diasMora: number
    nivelMora?: string
    nivelRiesgo?: string
    interesActual?: number
    plazoActual?: string
    cobradorNombre?: string
  }
  onClose: () => void
  onConfirm: (data: { montoInteres: number; diasGracia: number; comentarios?: string }) => void
}

export default function GestionarMoraModal({ cuenta, onClose, onConfirm }: GestionarMoraModalProps) {
  const nivel = cuenta.nivelMora || 'Leve'

  const [modoEntrada, setModoEntrada] = useState<'PORCENTAJE' | 'MANUAL'>('PORCENTAJE')
  const [porcentaje, setPorcentaje] = useState<string>('2')
  const [montoManual, setMontoManual] = useState<string>('')
  const [tipoBase, setTipoBase] = useState<'ACTUAL' | 'INICIAL'>('ACTUAL')
  const [diasGracia, setDiasGracia] = useState<string>('7')
  const [comentarios, setComentarios] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const base = tipoBase === 'ACTUAL' ? cuenta.saldoPendiente : cuenta.montoOriginal

  const montoCalculado = modoEntrada === 'PORCENTAJE'
    ? Math.round(base * (Number(porcentaje || 0) / 100))
    : parseCOPDecimalInputToNumber(montoManual)

  const nuevaFechaLimite = (() => {
    const d = new Date()
    d.setDate(d.getDate() + Number(diasGracia || 0))
    return d.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
  })()

  const isValid = montoCalculado > 0 && Number(diasGracia) >= 1

  const handleConfirm = async () => {
    if (!isValid || isLoading) return
    setIsLoading(true)
    try {
      await onConfirm({
        montoInteres: montoCalculado,
        diasGracia: Number(diasGracia),
        comentarios: comentarios || `Mora asignada — Nivel: ${nivel} — ${cuenta.diasMora}d vencido`,
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 z-[2147483601] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white w-full overflow-hidden shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200 flex flex-col h-[100dvh] sm:h-auto sm:max-h-[90vh] rounded-none sm:rounded-3xl sm:max-w-lg"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="px-7 py-5 bg-gradient-to-br from-[#08557f] to-blue-800 relative overflow-hidden shrink-0">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white blur-3xl" />
          </div>
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/15 rounded-xl">
                <AlertTriangle className="h-5 w-5 text-amber-300" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white tracking-tight">Asignar Interés de Mora</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-blue-200/80 text-[10px] font-bold uppercase tracking-widest">
                    {cuenta.numeroPrestamo}
                  </p>
                  {nivel && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black border bg-white/20 text-white border-white/30">
                      Nivel {nivel}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="overflow-y-auto flex-1 p-6 space-y-5">

          {/* Resumen del préstamo */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Días en Mora</p>
              <p className="text-xl font-black text-slate-900">{cuenta.diasMora}d</p>
            </div>
            <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
              <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1">Saldo Pendiente</p>
              <p className="text-xl font-black text-blue-800">{formatCurrency(cuenta.saldoPendiente)}</p>
            </div>
          </div>

          {/* Si ya tiene mora asignada */}
          {cuenta.interesActual && cuenta.interesActual > 0 && (
            <div className="flex items-center gap-3 p-3 bg-rose-50 rounded-2xl border border-rose-100">
              <Info className="h-4 w-4 text-rose-500 shrink-0" />
              <div className="text-xs text-rose-700 font-medium">
                Ya tiene <strong>{formatCurrency(cuenta.interesActual)}</strong> de mora asignada.
                {cuenta.plazoActual && ` Plazo: ${new Date(cuenta.plazoActual).toLocaleDateString('es-CO')}.`}
                {' '}Esta acción asignará una nueva mora adicional.
              </div>
            </div>
          )}

          {/* Modo de cálculo */}
          <div>
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-2">
              Cómo calcular el interés
            </label>
            <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl border border-slate-200">
              {([
                { key: 'PORCENTAJE', icon: <Percent className="h-3.5 w-3.5" />, label: 'Por porcentaje' },
                { key: 'MANUAL',    icon: <DollarSign className="h-3.5 w-3.5" />, label: 'Monto fijo' },
              ] as const).map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setModoEntrada(opt.key)}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-black transition-all',
                    modoEntrada === opt.key
                      ? 'bg-white text-[#08557f] shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  )}
                >
                  {opt.icon} {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Campo de entrada */}
          {modoEntrada === 'PORCENTAJE' ? (
            <div className="space-y-3">
              {/* Base de cálculo */}
              <div className="flex gap-2">
                {(['ACTUAL', 'INICIAL'] as const).map(op => (
                  <button
                    key={op}
                    onClick={() => setTipoBase(op)}
                    className={cn(
                      'flex-1 py-2 px-3 rounded-xl text-[10px] font-black border transition-all',
                      tipoBase === op
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                    )}
                  >
                    {op === 'ACTUAL'
                      ? `Saldo Actual (${formatCurrency(cuenta.saldoPendiente)})`
                      : `Monto Inicial (${formatCurrency(cuenta.montoOriginal)})`}
                  </button>
                ))}
              </div>

              {/* Input porcentaje */}
              <div className="relative">
                <input
                  type="number"
                  value={porcentaje}
                  onChange={e => setPorcentaje(e.target.value)}
                  placeholder="0"
                  min="0"
                  step="0.5"
                  className="w-full px-5 py-4 rounded-2xl border border-slate-200 font-black text-2xl text-slate-900 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all pr-12"
                />
                <span className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 font-black text-xl">%</span>
              </div>
            </div>
          ) : (
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-2">
                Monto de interés manual ($)
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 h-8 w-8 bg-amber-50 rounded-xl flex items-center justify-center border border-amber-100">
                  <DollarSign className="h-4 w-4 text-amber-600" />
                </div>
                <input
                  type="text"
                  inputMode="decimal"
                  value={montoManual}
                  onChange={e => setMontoManual(formatCOPDecimalTypingInputValue(e.target.value))}
                  onBlur={(e) => setMontoManual(formatCOPDecimalBlurInputValue(e.target.value))}
                  placeholder="0"
                  className="w-full pl-14 pr-4 py-4 rounded-2xl border border-amber-200 font-black text-2xl text-slate-900 focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all"
                />
              </div>
            </div>
          )}

          {/* Resumen de la nueva deuda */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 font-medium">Saldo actual</span>
              <span className="font-bold text-slate-700">{formatCurrency(cuenta.saldoPendiente)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-rose-500 font-medium">+ Interés de mora</span>
              <span className="font-black text-rose-600">{formatCurrency(montoCalculado)}</span>
            </div>
            <div className="border-t border-slate-200 pt-2 flex justify-between items-center">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Nueva deuda total</span>
              <span className="font-black text-lg text-slate-900">{formatCurrency(cuenta.saldoPendiente + montoCalculado)}</span>
            </div>
          </div>

          {/* Días de gracia */}
          <div>
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-2">
              Días para pagar
            </label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 h-8 w-8 bg-blue-50 rounded-xl flex items-center justify-center border border-blue-100">
                <TimerReset className="h-4 w-4 text-blue-600" />
              </div>
              <input
                type="number"
                value={diasGracia}
                onChange={e => setDiasGracia(e.target.value)}
                min={1}
                placeholder="7"
                className="w-full pl-14 pr-4 py-4 rounded-2xl border border-slate-200 font-black text-xl text-slate-900 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 outline-none transition-all"
              />
            </div>
            {Number(diasGracia) > 0 && (
              <div className="flex items-center gap-1.5 mt-2 text-blue-600 text-xs font-bold">
                <Calendar className="h-3.5 w-3.5" />
                Fecha límite: <span className="text-slate-900 ml-1">{nuevaFechaLimite}</span>
              </div>
            )}
          </div>

          {/* Observaciones */}
          <div>
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-2">
              Observaciones (opcional)
            </label>
            <textarea
              value={comentarios}
              onChange={e => setComentarios(e.target.value)}
              placeholder="Ej: El cliente se comprometió a pagar el viernes..."
              rows={2}
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm font-medium text-slate-700 focus:ring-4 focus:ring-slate-500/10 focus:border-slate-400 outline-none transition-all resize-none placeholder:text-slate-300"
            />
          </div>

          {/* Info box */}
          <div className="flex items-start gap-2 p-3 bg-blue-50/60 rounded-xl border border-blue-100">
            <Info className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-[10px] text-blue-700 font-medium leading-relaxed">
              El cliente tendrá <strong>{diasGracia || '?'} días</strong> para pagar{' '}
              <strong>{formatCurrency(cuenta.saldoPendiente + montoCalculado)}</strong>.
              Si no paga, podrás asignar una nueva mora.
            </p>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-5 bg-slate-50 border-t border-slate-100 flex gap-3 shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-[0.15em] text-slate-500 hover:text-slate-700 hover:bg-slate-200 transition-all border border-slate-200 bg-white"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!isValid || isLoading}
            className={cn(
              'flex-[2] py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-[0.15em] flex items-center justify-center gap-2 transition-all',
              isValid && !isLoading
                ? 'bg-[#08557f] text-white shadow-xl shadow-blue-900/20 hover:scale-[1.02] active:scale-95'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            )}
          >
            {isLoading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Aplicando...</>
            ) : (
              <><Save className="h-4 w-4" /> Aplicar · {formatCurrency(montoCalculado)}</>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
