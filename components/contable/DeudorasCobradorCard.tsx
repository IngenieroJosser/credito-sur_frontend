'use client'

import React, { useEffect, useState, useCallback } from 'react'
import {
  ChevronDown, ChevronUp, User, RefreshCw,
  ShieldAlert, AlertTriangle, Minus, Plus, Check, X, Eye, FileText
} from 'lucide-react'
import { formatCurrency, formatMilesCOP, cn } from '@/lib/utils'
import { getCajas, getDeudoresCobrador, registrarAbonoDeudaCobrador, type DeudaCobrador } from '@/services/contabilidad-service'
import { useAuth } from '@/hooks/useAuth'
import { useNotification } from '@/components/providers/NotificationProvider'

// Utilidades locales para inputs COP (sin importar las del lib para evitar circularidades)
function fmtCOPInput(val: string): string {
  const num = val.replace(/\D/g, '')
  if (!num) return ''
  return formatMilesCOP(Number(num))
}
function parseCOP(val: string): number {
  return Number(val.replace(/\D/g, '')) || 0
}

function formatFechaEventoDeuda(fecha: string): string {
  const date = new Date(fecha)
  if (Number.isNaN(date.getTime())) return fecha

  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date)
}

function getTipoEventoLabel(tipoReferencia: string): string {
  return String(tipoReferencia || '').replace(/_/g, ' ')
}

// ─── Modal de Abono ─────────────────────────────────────────────────────────

type AbonoModalProps = {
  cobrador: DeudaCobrador
  onClose: () => void
  cajas: Array<{ id: string; nombre: string; codigo?: string }>
  onConfirm: (cobradorId: string, monto: number, cajaIdDestino?: string) => Promise<void>
}

function AbonoModal({ cobrador, onClose, onConfirm, cajas }: AbonoModalProps) {
  const [valorInput, setValorInput] = useState('')
  const cajaPrincipal = cajas.find((c) => String(c.codigo || '').toUpperCase() === 'CAJA-PRINCIPAL')
  const [cajaIdDestino, setCajaIdDestino] = useState<string>(cajaPrincipal?.id || '')
  const [loading, setLoading] = useState(false)
  const monto = parseCOP(valorInput)
  const valido = monto > 0 && monto <= cobrador.totalDeuda

  const handleSubmit = async () => {
    if (!valido) return
    setLoading(true)
    try {
      await onConfirm(cobrador.cobradorId, monto, cajaIdDestino ? cajaIdDestino : undefined)
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-sm border border-slate-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
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

          {valido && (
            <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl border border-emerald-100">
              <span className="text-xs text-emerald-600 font-bold">Deuda restante</span>
              <span className="text-sm font-black text-emerald-700">{formatCurrency(cobrador.totalDeuda - monto)}</span>
            </div>
          )}

          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">
              Caja destino
            </label>
            <select
              value={cajaIdDestino}
              onChange={(e) => setCajaIdDestino(e.target.value)}
              disabled={!cajas.length}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-700 shadow-sm focus:border-emerald-400 focus:ring-4 focus:ring-emerald-300/20 outline-none transition-all"
            >
              {cajas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}{c.codigo ? ` (${c.codigo})` : ''}
                </option>
              ))}
            </select>
          </div>
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

// ─── Modal de Detalle de Deuda ──────────────────────────────────────────────

type DetalleDeudaModalProps = {
  cobrador: DeudaCobrador
  onClose: () => void
}

function DetalleDeudaModal({ cobrador, onClose }: DetalleDeudaModalProps) {
  const eventos = Array.isArray(cobrador.eventos) ? cobrador.eventos : []
  
  // Calcular el saldo acumulado para mostrar la historia (tanto a tanto)
  const eventosConSaldo = eventos.map((ev, index) => {
    const esAbono = ev.tipoReferencia === 'ABONO_DEUDA'
    const monto = Number(ev.monto)
    
    // Calcular el saldo anterior (todos los eventos antiguos)
    const eventosAnteriores = eventos.slice(0, index)
    let saldoAnterior = 0
    
    for (const evAnt of eventosAnteriores) {
      const esAbonoAnt = evAnt.tipoReferencia === 'ABONO_DEUDA'
      if (esAbonoAnt) {
        saldoAnterior = Math.max(0, saldoAnterior - Number(evAnt.monto))
      } else {
        saldoAnterior += Number(evAnt.monto)
      }
    }
    
    const saldoNuevo = esAbono 
      ? Math.max(0, saldoAnterior - monto) 
      : saldoAnterior + monto
    
    return {
      ...ev,
      saldoAnterior,
      saldoNuevo,
      esAbono
    }
  })

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-2xl border border-slate-100 overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 sm:px-6 pt-5 pb-4 flex items-start justify-between border-b border-slate-100 shrink-0">
          <div className="min-w-0">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Detalle de deuda</p>
            <h3 className="text-base sm:text-lg font-black text-slate-900 mt-0.5 truncate">{cobrador.nombreCobrador}</h3>
            <p className="text-xs font-bold text-slate-500 mt-1">{cobrador.rol.replace('_', ' ')} · {cobrador.totalEventos} evento(s)</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors shrink-0">
            <X className="h-5 w-5 text-slate-400" />
          </button>
        </div>

        <div className="px-5 sm:px-6 py-5 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-orange-50 border border-orange-100">
              <p className="text-[10px] text-orange-500 font-black uppercase tracking-widest mb-1">Adelantos</p>
              <p className="text-lg font-black text-orange-700">{formatCurrency(cobrador.gastosPersonales)}</p>
            </div>
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100">
              <p className="text-[10px] text-rose-500 font-black uppercase tracking-widest mb-1">Descuadres</p>
              <p className="text-lg font-black text-rose-700">{formatCurrency(cobrador.descuadres)}</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <p className="text-[10px] text-slate-300 font-black uppercase tracking-widest mb-1">Total a saldar</p>
              <p className="text-lg font-black text-white">{formatCurrency(cobrador.totalDeuda)}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-slate-700">
                <FileText className="h-4 w-4 text-slate-400" />
                <p className="text-xs font-black uppercase tracking-widest">Eventos recientes</p>
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-500">
                {eventos.length}
              </span>
            </div>

            {eventos.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center">
                <p className="text-sm font-black text-slate-500">Sin eventos recientes</p>
                <p className="text-xs font-bold text-slate-400 mt-1">No hay registros para detallar en este momento.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {eventosConSaldo.map((ev) => (
                  <div key={ev.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="min-w-0 space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={cn(
                            'text-[10px] font-black uppercase px-2 py-1 rounded-full',
                            ev.esAbono ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                          )}>
                            {getTipoEventoLabel(ev.tipoReferencia)}
                          </span>
                          <span className="text-[11px] font-bold text-slate-400">{formatFechaEventoDeuda(ev.fecha)}</span>
                        </div>
                        <p className="text-sm font-bold leading-relaxed text-slate-700 whitespace-pre-wrap break-words">
                          {ev.descripcion || 'Sin descripción'}
                        </p>
                        {ev.referenciaId && (
                          <p className="text-[10px] font-mono text-slate-400 break-all">Ref: {ev.referenciaId}</p>
                        )}
                      </div>
                      <div className="sm:text-right shrink-0 space-y-1">
                        <div className="flex flex-col sm:items-end">
                          <p className={cn(
                            'text-lg font-black',
                            ev.esAbono ? 'text-emerald-700' : 'text-rose-700'
                          )}>
                            {ev.esAbono ? '+ ' : '- '}{formatCurrency(ev.monto)}
                          </p>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            {ev.esAbono ? 'Abono' : 'Pendiente'}
                          </p>
                        </div>
                        <div className="mt-2 border-t border-dashed border-slate-200 pt-2">
                          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Historial del saldo</p>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-slate-500">{formatCurrency(ev.saldoAnterior)}</span>
                            <span className="text-slate-400">→</span>
                            <span className="font-black text-slate-700">{formatCurrency(ev.saldoNuevo)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="px-5 sm:px-6 pb-5 pt-3 border-t border-slate-100 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 rounded-2xl bg-slate-900 text-white font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all"
          >
            Cerrar
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
  const [cajas, setCajas] = useState<Array<{ id: string; nombre: string; codigo?: string }>>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(true)
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [modalAbono, setModalAbono] = useState<DeudaCobrador | null>(null)
  const [modalDetalle, setModalDetalle] = useState<DeudaCobrador | null>(null)
  const [ultimoAbono, setUltimoAbono] = useState<{
    cobradorId: string
    nombre: string
    monto: number
    saldoAnterior: number
    saldoNuevo: number
    cajaNombre?: string
  } | null>(null)

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

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const arr = await getCajas()
        if (!mounted) return
        setCajas((Array.isArray(arr) ? arr : []).map((c: any) => ({
          id: c.id,
          nombre: c.nombre,
          codigo: c.codigo,
        })))
      } catch {
        if (!mounted) return
        setCajas([])
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  const handleAbono = async (cobradorId: string, monto: number, cajaIdDestino?: string) => {
    try {
      const snapshot = deudores.find((d) => d.cobradorId === cobradorId)
      const saldoAnterior = Number(snapshot?.totalDeuda || 0)
      const saldoNuevo = Math.max(0, saldoAnterior - Number(monto || 0))
      const cajaNombre = cajaIdDestino
        ? (cajas.find((c) => c.id === cajaIdDestino)?.nombre || 'Caja')
        : (cajas.find((c) => String(c.codigo || '').toUpperCase() === 'CAJA-PRINCIPAL')?.nombre || 'Caja Principal')

      // Optimista: actualizar UI de inmediato (y si quedó en 0, sacarlo de la lista)
      setDeudores((prev) => {
        const next = prev
          .map((d) => (d.cobradorId === cobradorId ? { ...d, totalDeuda: saldoNuevo } : d))
          .filter((d) => Math.round(Number(d.totalDeuda || 0)) > 0)
        return next
      })

      await registrarAbonoDeudaCobrador(cobradorId, monto, '', cajaIdDestino);

      if (snapshot) {
        setUltimoAbono({
          cobradorId,
          nombre: snapshot.nombreCobrador,
          monto,
          saldoAnterior,
          saldoNuevo,
          cajaNombre,
        })
        window.setTimeout(() => setUltimoAbono(null), 6500)
      }

      showNotification('success', 'Abono registrado correctamente', 'Éxito');
      await cargar();
    } catch (error) {
      showNotification('error', 'Error al registrar el abono', 'Error');
    }
  }

  const deudoresActivos = deudores.filter((d) => Math.round(Number(d?.totalDeuda || 0)) > 0)
  const totalGlobal = deudoresActivos.reduce((sum, d) => sum + Number(d.totalDeuda || 0), 0)

  return (
    <>
      <div className="rounded-2xl bg-white/80 backdrop-blur-sm border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">

        {ultimoAbono && (
          <div className="px-6 py-4 border-b border-slate-100 bg-emerald-50/60">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 h-8 w-8 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center shrink-0">
                <Check className="h-4 w-4 text-emerald-700" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-black text-emerald-900 truncate">
                  {ultimoAbono.saldoNuevo <= 0 ? 'Deuda saldada' : 'Abono registrado'} — {ultimoAbono.nombre}
                </div>
                <div className="mt-0.5 text-[10px] font-bold text-emerald-800/80">
                  Abono: {formatCurrency(ultimoAbono.monto)} · Caja: {ultimoAbono.cajaNombre || 'Caja Principal'}
                </div>
                <div className="mt-0.5 text-[10px] font-bold text-slate-500">
                  Saldo: {formatCurrency(ultimoAbono.saldoAnterior)} → {formatCurrency(ultimoAbono.saldoNuevo)}
                </div>
              </div>
            </div>
          </div>
        )}

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
                Deudas reales de cobradores
              </p>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                {loading
                  ? 'Calculando...'
                  : deudoresActivos.length === 0
                  ? 'Sin deudas pendientes'
                  : `${deudoresActivos.length} colaborador(es) · Total: ${formatCurrency(totalGlobal)}`}
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
            ) : deudoresActivos.length === 0 ? (
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
                {deudoresActivos.map((d) => (
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

                        {/* Detalle de Eventos */}
                        {d.eventos && d.eventos.length > 0 && (
                          <div className="col-span-2 mt-2 pt-2 border-t border-slate-100">
                            <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5">
                              <div className="min-w-0">
                                <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Detalle Reciente</p>
                                <p className="text-xs font-bold text-slate-700 truncate mt-0.5">
                                  {d.eventos[0]?.descripcion || 'Sin descripción'}
                                </p>
                                <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                                  {formatFechaEventoDeuda(d.eventos[0]?.fecha || '')} · {d.eventos.length} evento(s)
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setModalDetalle(d) }}
                                className="shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 transition-all"
                                title="Ver detalle completo"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                Ver detalle
                              </button>
                            </div>
                          </div>
                        )}
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

      {/* Modal detalle deuda */}
      {modalDetalle && (
        <DetalleDeudaModal
          cobrador={modalDetalle}
          onClose={() => setModalDetalle(null)}
        />
      )}

      {/* Modal abono */}
      {modalAbono && (
        <AbonoModal
          cobrador={modalAbono}
          onClose={() => setModalAbono(null)}
          cajas={cajas}
          onConfirm={handleAbono}
        />
      )}
    </>
  )
}
