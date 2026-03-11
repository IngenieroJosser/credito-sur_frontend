'use client'

/**
 * ProrrogaDetalleModal
 * ─────────────────────────────────────────────────────────────────────────────
 * Modal dedicado para visualizar el detalle completo de una solicitud de
 * Prórroga o Gestión de Cuenta Vencida (CASTIGAR / DEJAR_QUIETO) en el
 * módulo de Revisiones.
 *
 * Muestra: cliente, número de préstamo, saldo pendiente, tipo de decisión,
 * días de gracia, fecha original → nueva fecha, monto de interés adicional,
 * observaciones y quién lo solicitó.
 */

import React from 'react'
import { createPortal } from 'react-dom'
import {
  X, User, Calendar, Clock, DollarSign,
  MessageSquare, CalendarClock, CheckCircle2, XCircle, Loader2,
  TrendingDown, FileX
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

// ── Tipos ────────────────────────────────────────────────────────────────────

export interface ProrrogaData {
  // Identificación
  id: string
  solicitante?: string
  creadoEn?: string
  estado?: string

  // Datos de la solicitud (vienen de datosSolicitud del backend)
  decision?: 'PRORROGAR' | 'CASTIGAR' | 'DEJAR_QUIETO'
  cliente?: string
  clienteNombre?: string
  numeroPrestamo?: string
  saldoPendiente?: number
  montoInteres?: number
  diasGracia?: number
  fechaVencimientoOriginal?: string
  nuevaFechaVencimiento?: string
  comentarios?: string
  gestionadoPor?: string
}

export interface ProrrogaDetalleModalProps {
  isOpen: boolean
  onClose: () => void
  data: ProrrogaData | null
  onApprove?: (id: string) => void
  onReject?: (id: string) => void
  canApprove?: boolean
  isProcessing?: boolean
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatFecha(iso: string | null | undefined) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('es-CO', {
      day: '2-digit', month: 'short', year: 'numeric',
    })
  } catch { return '—' }
}

function formatFechaHora(iso: string | null | undefined) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('es-CO', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch { return '—' }
}

// ── Config visual por tipo de decisión ───────────────────────────────────────

const DECISION_CONFIG = {
  PRORROGAR: {
    label:   'Prórroga de Plazo',
    badge:   'bg-blue-100 text-blue-800 border-blue-200',
    header:  'from-[#08557f] to-blue-800',
    section: 'bg-blue-50/60 border-blue-200',
    text:    'text-blue-700',
    accent:  'border-blue-400',
    icon:    CalendarClock,
  },
  CASTIGAR: {
    label:   'Baja por Pérdida',
    badge:   'bg-rose-100 text-rose-800 border-rose-200',
    header:  'from-rose-700 to-rose-900',
    section: 'bg-rose-50/60 border-rose-200',
    text:    'text-rose-700',
    accent:  'border-rose-400',
    icon:    FileX,
  },
  DEJAR_QUIETO: {
    label:   'Sin Mora por Ahora',
    badge:   'bg-slate-100 text-slate-700 border-slate-200',
    header:  'from-slate-700 to-slate-900',
    section: 'bg-slate-50/60 border-slate-200',
    text:    'text-slate-600',
    accent:  'border-slate-400',
    icon:    TrendingDown,
  },
} as const

// ── Portal ────────────────────────────────────────────────────────────────────

function Portal({ children }: { children: React.ReactNode }) {
  if (typeof document === 'undefined') return null
  return createPortal(children, document.body)
}

// ── Componente principal ─────────────────────────────────────────────────────

export default function ProrrogaDetalleModal({
  isOpen,
  onClose,
  data,
  onApprove,
  onReject,
  canApprove = true,
  isProcessing = false,
}: ProrrogaDetalleModalProps) {
  if (!isOpen || !data) return null

  const decision = data.decision || 'PRORROGAR'
  const cfg = DECISION_CONFIG[decision] || DECISION_CONFIG.PRORROGAR
  const DecisionIcon = cfg.icon

  const clienteNombre = data.cliente || data.clienteNombre || '—'
  const saldoPendiente = Number(data.saldoPendiente || 0)
  const montoInteres   = Number(data.montoInteres   || 0)
  const diasGracia     = data.diasGracia ?? null
  const esProrroga     = decision === 'PRORROGAR'

  return (
    <Portal>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
        style={{ zIndex: 2147483600 }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="fixed inset-0 flex items-center justify-center p-4"
        style={{ zIndex: 2147483601 }}
        onClick={onClose}
      >
        <div
          className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
          onClick={e => e.stopPropagation()}
        >
          {/* ── Header ── */}
          <div className={`bg-gradient-to-br ${cfg.header} px-7 py-5 relative overflow-hidden shrink-0`}>
            <div className="absolute inset-0 opacity-10">
              <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white blur-3xl" />
            </div>
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/15 rounded-xl text-white">
                  <DecisionIcon className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white tracking-tight">
                    {cfg.label}
                  </h2>
                  <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mt-0.5">
                    {data.numeroPrestamo || 'Sin número'} · {clienteNombre}
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
          <div className="overflow-y-auto flex-1 p-6 space-y-4">

            {/* Solicitante + fecha */}
            <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-100">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                <User className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest">Solicitado por</p>
                <p className="text-sm font-black text-slate-900">{data.gestionadoPor || data.solicitante || '—'}</p>
                {data.creadoEn && (
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5 flex items-center gap-1">
                    <Clock className="h-3 w-3" />{formatFechaHora(data.creadoEn)}
                  </p>
                )}
              </div>
            </div>

            {/* Datos del cliente y préstamo */}
            <div className={`rounded-2xl border p-4 space-y-3 ${cfg.section}`}>
              <p className={`text-[9px] font-black uppercase tracking-widest ${cfg.text}`}>
                Información del Crédito
              </p>
              <div className="grid grid-cols-2 gap-3">
                {/* Cliente */}
                <div className="col-span-2 bg-white/70 rounded-xl p-3">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Cliente</p>
                  <p className="text-base font-black text-slate-900">{clienteNombre}</p>
                </div>
                {/* Préstamo */}
                {data.numeroPrestamo && (
                  <div className="bg-white/70 rounded-xl p-3">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">No. Préstamo</p>
                    <p className="text-sm font-black text-slate-900">{data.numeroPrestamo}</p>
                  </div>
                )}
                {/* Saldo */}
                {saldoPendiente > 0 && (
                  <div className="bg-white/70 rounded-xl p-3">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Saldo Pendiente</p>
                    <p className="text-sm font-black text-rose-600">{formatCurrency(saldoPendiente)}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Datos específicos de la prórroga */}
            {esProrroga && (
              <div className="rounded-2xl border border-blue-200 bg-blue-50/40 p-4 space-y-3">
                <p className="text-[9px] font-black text-blue-700 uppercase tracking-widest">
                  Condiciones de la Prórroga
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {diasGracia !== null && (
                    <div className="bg-white rounded-xl p-3 text-center border border-blue-100">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Días de Gracia</p>
                      <p className="text-3xl font-black text-blue-700">{diasGracia}</p>
                      <p className="text-[9px] text-slate-400 font-bold">días</p>
                    </div>
                  )}
                  {data.fechaVencimientoOriginal && (
                    <div className="bg-white rounded-xl p-3 text-center border border-blue-100">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Fecha Orig.</p>
                      <Calendar className="h-4 w-4 text-slate-400 mx-auto mb-1" />
                      <p className="text-[10px] font-black text-slate-700 leading-tight">
                        {formatFecha(data.fechaVencimientoOriginal)}
                      </p>
                    </div>
                  )}
                  {data.nuevaFechaVencimiento && (
                    <div className="bg-blue-100 rounded-xl p-3 text-center border border-blue-200">
                      <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-1">Nueva Fecha</p>
                      <CalendarClock className="h-4 w-4 text-blue-600 mx-auto mb-1" />
                      <p className="text-[10px] font-black text-blue-900 leading-tight">
                        {formatFecha(data.nuevaFechaVencimiento)}
                      </p>
                    </div>
                  )}
                </div>

                {/* Interés adicional */}
                {montoInteres > 0 && (
                  <div className="flex items-center justify-between bg-white rounded-xl p-3 border border-amber-100">
                    <div className="flex items-center gap-2 text-amber-700">
                      <DollarSign className="h-4 w-4" />
                      <p className="text-[10px] font-black uppercase tracking-widest">Interés / Mora adicional</p>
                    </div>
                    <p className="text-base font-black text-amber-700">{formatCurrency(montoInteres)}</p>
                  </div>
                )}
              </div>
            )}

            {/* Info para CASTIGAR */}
            {decision === 'CASTIGAR' && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-4 space-y-2">
                <p className="text-[9px] font-black text-rose-700 uppercase tracking-widest">Impacto Contable</p>
                <p className="text-sm text-rose-800 font-medium leading-relaxed">
                  De aprobarse, el préstamo será marcado como{' '}
                  <strong>pérdida contable</strong> y el capital restante{' '}
                  <strong>{formatCurrency(saldoPendiente)}</strong> quedará registrado como
                  cartera castigada. Esta acción es <strong>irreversible</strong>.
                </p>
              </div>
            )}

            {/* Observaciones */}
            {data.comentarios && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="h-4 w-4 text-slate-400" />
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Observaciones</p>
                </div>
                <p className="text-sm text-slate-700 font-medium italic leading-relaxed border-l-4 border-slate-300 pl-3">
                  "{data.comentarios}"
                </p>
              </div>
            )}

          </div>

          {/* ── Footer de acciones ── */}
          {canApprove && data.estado === 'PENDIENTE' && (
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex gap-3 shrink-0">
              <button
                onClick={() => onReject?.(data.id)}
                disabled={isProcessing}
                className="flex-1 py-3 border border-rose-200 text-rose-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <XCircle className="h-4 w-4" />
                Rechazar
              </button>
              <button
                onClick={() => onApprove?.(data.id)}
                disabled={isProcessing}
                className="flex-[2] py-3 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20 disabled:opacity-50"
              >
                {isProcessing
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Procesando...</>
                  : <><CheckCircle2 className="h-4 w-4" /> Aprobar Solicitud</>}
              </button>
            </div>
          )}
        </div>
      </div>
    </Portal>
  )
}
