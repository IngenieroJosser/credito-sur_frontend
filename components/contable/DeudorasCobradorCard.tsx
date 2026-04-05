'use client'

import React, { useEffect, useState, useCallback } from 'react'
import {
  ChevronDown, ChevronUp, User, RefreshCw,
  ShieldAlert, AlertTriangle, Minus, Plus, Check, X
} from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'
import { getDeudoresCobrador, registrarAbonoDeudaCobrador, type DeudaCobrador } from '@/services/contabilidad-service'
import { useAuth } from '@/hooks/useAuth'
import { useNotification } from '@/components/providers/NotificationProvider'

// Utilidades locales para inputs COP (sin importar las del lib para evitar circularidades)
function fmtCOPInput(val: string): string {
  const num = val.replace(/\D/g, '')
  if (!num) return ''
  return Number(num).toLocaleString('es-CO')
}
function parseCOP(val: string): number {
  return Number(val.replace(/\D/g, '')) || 0
}

// ─── Modal de Abono ─────────────────────────────────────────────────────────

type AbonoModalProps = {
  cobrador: DeudaCobrador
  onClose: () => void
  onConfirm: (cobradorId: string, monto: number, nota: string) => Promise<void>
}

function AbonoModal({ cobrador, onClose, onConfirm }: AbonoModalProps) {
  const [valorInput, setValorInput] = useState('')
  const [nota, setNota] = useState('')
  const [loading, setLoading] = useState(false)
  const monto = parseCOP(valorInput)
  const valido = monto > 0 && monto <= cobrador.totalDeuda

  const handleSubmit = async () => {
    if (!valido) return
    setLoading(true)
    try {
      await onConfirm(cobrador.cobradorId, monto, nota)
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm border border-slate-100 overflow-hidden">
        <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b border-slate-100">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Registrar Abono</p>
            <h3 className="text-sm font-black text-slate-900 mt-0.5">{cobrador.nombreCobrador}</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X className="h-4 w-4 text-slate-400" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="flex items-center justify-between p-3 bg-rose-50 rounded-xl border border-rose-100">
            <span className="text-xs text-rose-600 font-bold">Deuda actual</span>
            <span className="text-sm font-black text-rose-700">- {formatCurrency(cobrador.totalDeuda)}</span>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">
              Monto del Abono
            </label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="$ 0"
              value={valorInput}
              onChange={e => setValorInput(fmtCOPInput(e.target.value))}
              className="w-full text-2xl font-black text-slate-900 border border-slate-200 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400 transition-all bg-slate-50"
            />
            {monto > cobrador.totalDeuda && (
              <p className="text-[10px] text-rose-500 font-bold mt-1 ml-1">El abono no puede superar la deuda actual</p>
            )}
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">
              Concepto / Nota (Opcional)
            </label>
            <input
              type="text"
              placeholder="Ej: Descuento nómina semana 14..."
              value={nota}
              onChange={e => setNota(e.target.value)}
              className="w-full text-sm text-slate-700 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald-300 transition-all bg-slate-50"
            />
          </div>

          {valido && (
            <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl border border-emerald-100">
              <span className="text-xs text-emerald-600 font-bold">Deuda restante</span>
              <span className="text-sm font-black text-emerald-700">{formatCurrency(cobrador.totalDeuda - monto)}</span>
            </div>
          )}
        </div>

        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl border border-slate-200 text-slate-600 font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!valido || loading}
            className="flex-1 py-3 rounded-2xl bg-emerald-600 text-white font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            Confirmar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Componente principal ────────────────────────────────────────────────────

export default function DeudorasCobradorCard() {
  const { user } = useAuth()
  const { showNotification } = useNotification()
  const rol = user?.rol as string | undefined
  const puedeAbonar = ['SUPER_ADMINISTRADOR', 'ADMIN', 'COORDINADOR', 'CONTADOR'].includes(rol ?? '')

  const [deudores, setDeudores] = useState<DeudaCobrador[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(true)
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [modalAbono, setModalAbono] = useState<DeudaCobrador | null>(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getDeudoresCobrador()
      setDeudores(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const handleAbono = async (cobradorId: string, monto: number, nota: string) => {
    try {
      await registrarAbonoDeudaCobrador(cobradorId, monto, nota);
      showNotification('success', 'Abono registrado correctamente', 'Éxito');
      await cargar();
    } catch (error) {
      showNotification('error', 'Error al registrar el abono', 'Error');
    }
  }

  const totalGlobal = deudores.reduce((sum, d) => sum + d.totalDeuda, 0)

  return (
    <>
      <div className="rounded-2xl bg-white/80 backdrop-blur-sm border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">

        {/* Header */}
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          className="w-full flex items-center justify-between px-6 py-5 hover:bg-slate-50/60 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-50 text-rose-600 border border-rose-100 shrink-0">
              <ShieldAlert className="h-4 w-4" />
            </div>
            <div className="text-left">
              <p className="text-xs font-black text-slate-700 uppercase tracking-wider">
                Deudas de Cobradores
              </p>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                {loading
                  ? 'Calculando...'
                  : deudores.length === 0
                  ? 'Sin deudas pendientes'
                  : `${deudores.length} colaborador(es) · Total: ${formatCurrency(totalGlobal)}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div
              role="button"
              tabIndex={0}
              onClick={e => { e.stopPropagation(); cargar() }}
              onKeyDown={e => e.key === 'Enter' && cargar()}
              className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-300 cursor-pointer"
              title="Actualizar"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
            </div>
            {expanded
              ? <ChevronUp className="h-4 w-4 text-slate-400" />
              : <ChevronDown className="h-4 w-4 text-slate-400" />}
          </div>
        </button>

        {/* Cuerpo */}
        {expanded && (
          <div className="border-t border-slate-100 px-6 py-5">
            {loading ? (
              <div className="flex items-center justify-center py-8 gap-2 text-slate-300">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span className="text-xs font-bold">Cargando deudas...</span>
              </div>
            ) : deudores.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                  <ShieldAlert className="h-7 w-7 text-emerald-400" />
                </div>
                <p className="text-sm font-black text-slate-500">Todos los cobradores están al día</p>
                <p className="text-xs text-slate-400 text-center max-w-xs">
                  No hay adelantos de nómina ni descuadres de cierre de ruta registrados.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {deudores.map((d) => (
                  <div key={d.cobradorId} className="border border-slate-100 rounded-xl overflow-hidden">

                    {/* Fila del cobrador */}
                    <div
                      className="flex items-center gap-3 px-4 py-3 bg-slate-50/60 hover:bg-slate-100/50 transition-colors cursor-pointer select-none"
                      onClick={() => setExpandedRow(expandedRow === d.cobradorId ? null : d.cobradorId)}
                    >
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200">
                        <User className="h-3.5 w-3.5 text-slate-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-slate-900 truncate">{d.nombreCobrador}</p>
                        <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                          {d.rol.replace('_', ' ')} · {d.totalEventos} evento(s)
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <p className="text-sm font-black text-rose-600 flex items-center gap-0.5">
                            <Minus className="h-3 w-3 stroke-[3]" />
                            {formatCurrency(d.totalDeuda)}
                          </p>
                          <p className="text-[9px] text-rose-400 font-black uppercase tracking-widest text-right">DEBE</p>
                        </div>

                        {puedeAbonar && (
                          <button
                            type="button"
                            onClick={e => { e.stopPropagation(); setModalAbono(d) }}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-all"
                            title="Registrar abono"
                          >
                            <Plus className="h-3 w-3 stroke-[3]" />
                            Abono
                          </button>
                        )}

                        {expandedRow === d.cobradorId
                          ? <ChevronUp className="h-4 w-4 text-slate-300" />
                          : <ChevronDown className="h-4 w-4 text-slate-300" />}
                      </div>
                    </div>

                    {/* Desglose */}
                    {expandedRow === d.cobradorId && (
                      <div className="grid grid-cols-2 gap-2 px-4 py-3 bg-white border-t border-slate-100">
                        <div className="p-3 rounded-xl bg-orange-50 border border-orange-100">
                          <p className="text-[9px] text-orange-500 font-black uppercase tracking-widest mb-1">Adelantos Personales</p>
                          <p className="text-base font-black text-orange-700">{formatCurrency(d.gastosPersonales)}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-rose-50 border border-rose-100">
                          <p className="text-[9px] text-rose-500 font-black uppercase tracking-widest mb-1">Descuadres de Ruta</p>
                          <p className="text-base font-black text-rose-700">{formatCurrency(d.descuadres)}</p>
                        </div>
                        <div className="col-span-2 flex justify-between items-center px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-100">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total a Saldar</span>
                          <span className="text-base font-black text-rose-700 flex items-center gap-0.5">
                            <Minus className="h-3 w-3 stroke-[3]" />{formatCurrency(d.totalDeuda)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Total global */}
                <div className="flex justify-between items-center px-4 py-3 mt-1 rounded-xl border border-slate-200 bg-slate-50">
                  <div className="flex items-center gap-2 text-slate-500">
                    <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Deuda Total del Equipo</span>
                  </div>
                  <span className="text-base font-black text-rose-700 flex items-center gap-0.5">
                    <Minus className="h-3.5 w-3.5 stroke-[3]" />{formatCurrency(totalGlobal)}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal abono */}
      {modalAbono && (
        <AbonoModal
          cobrador={modalAbono}
          onClose={() => setModalAbono(null)}
          onConfirm={handleAbono}
        />
      )}
    </>
  )
}
