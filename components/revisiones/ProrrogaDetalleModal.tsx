'use client'
import { formatFechaBogota } from '@/lib/format-date'

/**
 * ProrrogaDetalleModal
 * ─────────────────────────────────────────────────────────────────────────────
 * Modal dedicado para visualizar el detalle completo de una solicitud de
 * Prórroga o Gestión de Cuenta Vencida (CASTIGAR / DEJAR_QUIETO) en el
 * módulo de Revisiones.
 */

import React, { useId } from 'react'
import { createPortal } from 'react-dom'
import {
  User, Calendar, Clock, DollarSign,
  MessageSquare, CalendarClock, CheckCircle2, XCircle, Loader2,
  TrendingDown, FileX
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { DECISIONES_CUENTA_VENCIDA } from '@/lib/display-labels'
import { useModalDialog } from '@/hooks/use-modal-dialog'
import CabeceraModal, { type tonosModal } from '@/components/ui/CabeceraModal'
import {
  BARRA_DE_ARRASTRE,
  CUERPO_HOJA_MODAL,
  FONDO_HOJA_MODAL,
  PANEL_HOJA_MODAL,
  PIE_HOJA_MODAL,
} from '@/lib/ui/hoja-modal'
import AyudaContextual from '@/components/ui/AyudaContextual'

// ── Tipos ────────────────────────────────────────────────────────────────────

export interface ProrrogaData {
  id: string
  solicitante?: string
  creadoEn?: string
  estado?: string
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
    const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(iso.trim())
    const dateToParse = isDateOnly ? `${iso.trim()}T12:00:00` : iso

    return formatFechaBogota(dateToParse, {
      day: '2-digit', month: 'short', year: 'numeric',
    })
  } catch { return '—' }
}

function formatFechaHora(iso: string | null | undefined) {
  if (!iso) return '—'
  try {
    return formatFechaBogota(iso, {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
      hour12: true,
    })
  } catch { return '—' }
}

// ── Config visual por tipo de decisión ───────────────────────────────────────

const DECISION_CONFIG: Record<'PRORROGAR' | 'CASTIGAR' | 'DEJAR_QUIETO', {
  label: string
  tono: keyof typeof tonosModal
  section: string
  text: string
  icon: typeof CalendarClock
}> = {
  PRORROGAR: {
    label:   DECISIONES_CUENTA_VENCIDA.PRORROGAR.label,
    tono:    'cielo',
    section: 'bg-sky-50/60 border-sky-200',
    text:    'text-sky-800',
    icon:    CalendarClock,
  },
  CASTIGAR: {
    label:   DECISIONES_CUENTA_VENCIDA.CASTIGAR.label,
    tono:    'rosa',
    section: 'bg-rose-50/60 border-rose-200',
    text:    'text-rose-800',
    icon:    FileX,
  },
  DEJAR_QUIETO: {
    label:   DECISIONES_CUENTA_VENCIDA.DEJAR_QUIETO.label,
    tono:    'ambar',
    section: 'bg-amber-50/60 border-amber-200',
    text:    'text-amber-800',
    icon:    TrendingDown,
  },
}

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
  const id = useId()
  const { contenedorRef, propsDialogo, capa } = useModalDialog({
    abierto: isOpen,
    onClose: onClose,
    enfocarAlAbrir: false,
  })

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
      <div
        className={FONDO_HOJA_MODAL}
        style={{ zIndex: capa }}
        onClick={onClose}
      >
        <div
          ref={contenedorRef}
          {...propsDialogo}
          aria-labelledby={`${id}-titulo`}
          className={`${PANEL_HOJA_MODAL} max-w-2xl border border-slate-200`}
          onClick={e => e.stopPropagation()}
        >
          <div className={BARRA_DE_ARRASTRE} aria-hidden="true" />

          <CabeceraModal
            idTitulo={`${id}-titulo`}
            titulo={cfg.label}
            subtitulo={`${data.numeroPrestamo ? `${data.numeroPrestamo} · ` : ''}${clienteNombre}`}
            icono={DecisionIcon}
            tono={cfg.tono}
            onClose={onClose}
            cerrarDeshabilitado={isProcessing}
          />

          {/* ── Body ── */}
          <div className={`${CUERPO_HOJA_MODAL} p-5 sm:p-6 space-y-4`}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Solicitante + fecha */}
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-800 shrink-0">
                  <User className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Solicitado por</p>
                  <p className="text-sm font-bold text-slate-900 truncate">{data.gestionadoPor || data.solicitante || '—'}</p>
                  {data.creadoEn && (
                    <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                      <Clock className="h-3 w-3 shrink-0" />{formatFechaHora(data.creadoEn)}
                    </p>
                  )}
                </div>
              </div>

              {/* Datos del cliente y préstamo */}
              <div className={`rounded-2xl border p-4 space-y-2 ${cfg.section}`}>
                <p className={`text-[10px] font-bold uppercase tracking-wider ${cfg.text}`}>
                  Información del Crédito
                </p>
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-slate-600 font-medium">Cliente</span>
                  <span className="font-bold text-slate-900 text-right truncate">{clienteNombre}</span>
                </div>
                {data.numeroPrestamo && (
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-slate-600 font-medium">No. Préstamo</span>
                    <span className="font-mono font-bold text-slate-900">{data.numeroPrestamo}</span>
                  </div>
                )}
                {saldoPendiente > 0 && (
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-slate-600 font-medium flex items-center gap-1">
                      Saldo pendiente
                      <AyudaContextual ayuda="saldoPendiente" de="el saldo pendiente" tamano="pequeno" />
                    </span>
                    <span className="font-bold text-rose-700 tabular-nums">{formatCurrency(saldoPendiente)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Datos específicos de la prórroga */}
            {esProrroga && (
              <div className="rounded-2xl border border-sky-200 bg-sky-50/40 p-4 space-y-3">
                <p className="text-[10px] font-bold text-sky-800 uppercase tracking-wider">
                  Condiciones de la Prórroga
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {diasGracia !== null && (
                    <div className="bg-white rounded-xl p-3 text-center border border-sky-100">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Días de Gracia</p>
                      <p className="text-2xl font-bold text-sky-800 tabular-nums">{diasGracia} <span className="text-xs font-medium text-slate-500">días</span></p>
                    </div>
                  )}
                  {data.fechaVencimientoOriginal && (
                    <div className="bg-white rounded-xl p-3 text-center border border-slate-200">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Fecha Orig.</p>
                      <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-slate-800 mt-1">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        {formatFecha(data.fechaVencimientoOriginal)}
                      </div>
                    </div>
                  )}
                  {data.nuevaFechaVencimiento && (
                    <div className="bg-sky-50 rounded-xl p-3 text-center border border-sky-200">
                      <p className="text-[10px] font-bold text-sky-700 uppercase tracking-wider mb-1">Nueva Fecha</p>
                      <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-sky-950 mt-1">
                        <CalendarClock className="h-3.5 w-3.5 text-sky-700" />
                        {formatFecha(data.nuevaFechaVencimiento)}
                      </div>
                    </div>
                  )}
                </div>

                {montoInteres > 0 && (
                  <div className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-amber-200">
                    <div className="flex items-center gap-2 text-amber-800">
                      <DollarSign className="h-4 w-4" />
                      <p className="text-xs font-bold uppercase tracking-wider">Interés / Mora adicional</p>
                    </div>
                    <p className="text-base font-bold text-amber-900 tabular-nums">{formatCurrency(montoInteres)}</p>
                  </div>
                )}
              </div>
            )}

            {/* Info para CASTIGAR */}
            {decision === 'CASTIGAR' && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-4 space-y-1.5">
                <p className="text-[10px] font-bold text-rose-800 uppercase tracking-wider">Impacto Contable</p>
                <p className="text-sm text-rose-900 leading-relaxed">
                  De aprobarse, el préstamo será marcado como{' '}
                  <strong>pérdida contable</strong> y el capital restante{' '}
                  <strong>{formatCurrency(saldoPendiente)}</strong> quedará registrado como
                  cartera castigada. Esta acción es <strong>irreversible</strong>.
                </p>
              </div>
            )}

            {/* Observaciones */}
            {data.comentarios && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <MessageSquare className="h-4 w-4 text-slate-400" />
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Observaciones</p>
                </div>
                <p className="text-sm text-slate-700 italic leading-relaxed border-l-2 border-slate-300 pl-3">
                  &ldquo;{data.comentarios}&rdquo;
                </p>
              </div>
            )}
          </div>

          {/* ── Footer de acciones ── */}
          {canApprove && data.estado === 'PENDIENTE' && (
            <div className={`${PIE_HOJA_MODAL} px-5 py-3.5 sm:px-6 bg-slate-50/80 border-t border-slate-100 flex justify-end gap-3`}>
              <button
                type="button"
                onClick={() => onReject?.(data.id)}
                disabled={isProcessing}
                className="min-h-11 px-5 border border-rose-200 bg-white text-rose-700 rounded-xl text-xs font-bold hover:bg-rose-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <XCircle className="h-4 w-4" />
                Rechazar
              </button>
              <button
                type="button"
                onClick={() => onApprove?.(data.id)}
                disabled={isProcessing}
                className="min-h-11 px-6 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isProcessing
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Procesando…</>
                  : <><CheckCircle2 className="h-4 w-4" /> Aprobar Solicitud</>}
              </button>
            </div>
          )}
        </div>
      </div>
    </Portal>
  )
}
