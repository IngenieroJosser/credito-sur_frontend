'use client'

/**
 * ReprogramacionDetalleModal
 * ─────────────────────────────────────────────────────────────────────────────
 * Modal dedicado para visualizar el detalle completo de una solicitud de
 * Reprogramación de Cuota en el módulo de Revisiones.
 */

import React from 'react'
import { createPortal } from 'react-dom'
import {
  X, User, Calendar, Clock, DollarSign,
  MessageSquare, CalendarClock, CheckCircle2, XCircle, Loader2
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

export interface ReprogramacionData {
  id: string
  solicitante?: string
  creadoEn?: string
  estado?: string

  cliente?: string
  clienteNombre?: string
  numeroPrestamo?: string
  montoCuota?: number
  fechaVencimientoOriginal?: string
  nuevaFechaVencimiento?: string
  motivo?: string
  gestionadoPor?: string
}

export interface ReprogramacionDetalleModalProps {
  isOpen: boolean
  onClose: () => void
  data: ReprogramacionData | null
  onApprove?: (id: string) => void
  onReject?: (id: string) => void
  canApprove?: boolean
  isProcessing?: boolean
}

function formatFecha(iso: string | null | undefined) {
  if (!iso) return '—'
  try {
    const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(iso.trim())
    const dateToParse = isDateOnly ? `${iso.trim()}T12:00:00` : iso

    return new Date(dateToParse).toLocaleDateString('es-CO', {
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

function Portal({ children }: { children: React.ReactNode }) {
  if (typeof document === 'undefined') return null
  return createPortal(children, document.body)
}

export default function ReprogramacionDetalleModal({
  isOpen,
  onClose,
  data,
  onApprove,
  onReject,
  canApprove = true,
  isProcessing = false,
}: ReprogramacionDetalleModalProps) {
  if (!isOpen || !data) return null

  const clienteNombre = data.cliente || data.clienteNombre || '—'
  const montoCuota = Number(data.montoCuota || 0)

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
        onClick={onClose}
      >
        <div
          className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-br from-orange-600 to-orange-800 px-7 py-5 relative overflow-hidden shrink-0">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white blur-3xl" />
            </div>
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/15 rounded-xl text-white">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white tracking-tight">
                    Reprogramación de Cuota
                  </h2>
                  <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mt-0.5">
                    {data.numeroPrestamo ? `${data.numeroPrestamo} · ` : ''}{clienteNombre}
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

          {/* Body */}
          <div className="overflow-y-auto flex-1 p-6 space-y-4">

            {/* Solicitante + fecha */}
            <div className="flex items-center gap-3 p-4 bg-orange-50 rounded-2xl border border-orange-100">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 shrink-0">
                <User className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[9px] font-black text-orange-600 uppercase tracking-widest">Solicitado por</p>
                <p className="text-sm font-black text-slate-900">{data.gestionadoPor || data.solicitante || '—'}</p>
                {data.creadoEn && (
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5 flex items-center gap-1">
                    <Clock className="h-3 w-3" />{formatFechaHora(data.creadoEn)}
                  </p>
                )}
              </div>
            </div>

            {/* Datos del cliente y préstamo */}
            <div className="rounded-2xl border bg-slate-50 border-slate-200 p-4 space-y-3">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-600">
                Información del Crédito
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 bg-white/70 rounded-xl p-3">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Cliente</p>
                  <p className="text-base font-black text-slate-900">{clienteNombre}</p>
                </div>
                {data.numeroPrestamo && (
                  <div className="bg-white/70 rounded-xl p-3">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">No. Préstamo</p>
                    <p className="text-sm font-black text-slate-900">{data.numeroPrestamo}</p>
                  </div>
                )}
                {montoCuota > 0 && (
                  <div className="bg-white/70 rounded-xl p-3">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Monto de la Cuota</p>
                    <p className="text-sm font-black text-orange-600">{formatCurrency(montoCuota)}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Datos específicos de la reprogramacion */}
            <div className="rounded-2xl border border-orange-200 bg-orange-50/40 p-4 space-y-3">
              <p className="text-[9px] font-black text-orange-700 uppercase tracking-widest">
                Modificación de Fechas
              </p>
              <div className="grid grid-cols-2 gap-3">
                {data.fechaVencimientoOriginal && (
                  <div className="bg-white rounded-xl p-3 text-center border border-orange-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Fecha Orig.</p>
                    <Calendar className="h-4 w-4 text-slate-400 mx-auto mb-1" />
                    <p className="text-[10px] font-black text-slate-700 leading-tight">
                      {formatFecha(data.fechaVencimientoOriginal)}
                    </p>
                  </div>
                )}
                {data.nuevaFechaVencimiento && (
                  <div className="bg-orange-100 rounded-xl p-3 text-center border border-orange-200">
                    <p className="text-[9px] font-black text-orange-600 uppercase tracking-widest mb-1">Nueva Fecha</p>
                    <CalendarClock className="h-4 w-4 text-orange-600 mx-auto mb-1" />
                    <p className="text-[10px] font-black text-orange-900 leading-tight">
                      {formatFecha(data.nuevaFechaVencimiento)}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Observaciones / Motivo */}
            {data.motivo && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="h-4 w-4 text-slate-400" />
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Motivo de Reprogramación</p>
                </div>
                <p className="text-sm text-slate-700 font-medium italic leading-relaxed border-l-4 border-slate-300 pl-3">
                  "{data.motivo}"
                </p>
              </div>
            )}

          </div>

          {/* Footer de acciones */}
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
