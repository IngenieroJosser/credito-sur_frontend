'use client'

import React, { useState } from 'react'
import {
  X,
  CalendarClock,
  Banknote,
  Route,
  User,
  ReceiptText,
  ArrowRight,
  FileText,
  ShieldCheck,
  Clock,
} from 'lucide-react'
import { Portal } from '@/components/dashboards/shared/CobradorElements'
import { formatCurrency } from '@/lib/utils'
import PagoDetalleModal from '@/components/dashboards/shared/PagoDetalleModal'

export interface PagoRegularizadoNotifModalProps {
  isOpen: boolean
  onClose: () => void
  notificacion: any
}

const safeJsonParse = (value: any) => {
  if (!value) return {}
  if (typeof value === 'object') return value
  try {
    return JSON.parse(value)
  } catch {
    return {}
  }
}

const formatFechaHora = (raw: any, fallback = 'No disponible') => {
  if (!raw) return fallback
  try {
    const date = new Date(raw)
    if (Number.isNaN(date.getTime())) return String(raw)
    return date.toLocaleString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  } catch {
    return fallback
  }
}

const formatFechaOperativa = (raw: any) => {
  const key = String(raw || '').slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return raw || 'No disponible'
  try {
    return new Date(`${key}T12:00:00-05:00`).toLocaleDateString('es-CO', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return key
  }
}

const InfoCard = ({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
}) => (
  <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
    <div className="flex items-center gap-2 text-slate-400">
      {icon}
      <p className="text-[10px] font-black uppercase tracking-widest">{label}</p>
    </div>
    <div className="mt-2 text-sm font-black leading-snug text-slate-900 break-words">
      {value || 'No disponible'}
    </div>
  </div>
)

export default function PagoRegularizadoNotifModal({
  isOpen,
  onClose,
  notificacion,
}: PagoRegularizadoNotifModalProps) {
  const [showPagoDetalle, setShowPagoDetalle] = useState(false)

  if (!isOpen || !notificacion) return null

  const meta = safeJsonParse(notificacion.metadata)
  const monto = Number(meta.montoTotal || meta.monto || 0)
  const capital = Number(meta.capitalRecuperado || 0)
  const interes = Number(meta.interesRecuperado || 0)
  const saldoAnterior = Number(meta.saldoAnterior || 0)
  const saldoNuevo = Number(meta.saldoNuevo || 0)

  return (
    <Portal>
      <div
        className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200"
        style={{ zIndex: 9999 }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      >
        <div className="flex max-h-[100dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-slate-100 bg-white shadow-2xl sm:max-h-[92vh] sm:max-w-3xl sm:rounded-[2rem]">
          <div className="relative overflow-hidden bg-slate-950 px-6 pb-6 pt-7 text-white">
            <button
              onClick={onClose}
              className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-white/10">
                <CalendarClock className="h-6 w-6" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/30 bg-amber-400/15 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-amber-100">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Regularización
                </div>
                <h2 className="mt-2 text-xl font-black leading-tight">
                  Pago regularizado registrado
                </h2>
              </div>
            </div>

            <div className="mt-6">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/55">
                Monto recibido
              </p>
              <p className="mt-1 text-4xl font-black tabular-nums">
                {formatCurrency(monto)}
              </p>
              <p className="mt-2 text-xs font-semibold text-white/70">
                El dinero entra a caja en la fecha real del pago, pero se asocia operativamente a la jornada regularizada.
              </p>
            </div>
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto bg-slate-50 p-5">
            <section className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <InfoCard
                icon={<User className="h-4 w-4" />}
                label="Cliente"
                value={
                  <div>
                    <p>{meta.clienteNombre || meta.cliente || 'Cliente'}</p>
                    {meta.clienteDni && (
                      <p className="mt-0.5 text-xs font-bold text-slate-500">CC: {meta.clienteDni}</p>
                    )}
                  </div>
                }
              />
              <InfoCard
                icon={<Route className="h-4 w-4" />}
                label="Ruta"
                value={
                  <div>
                    <p>{meta.rutaNombre || 'Ruta'}</p>
                    {meta.rutaCodigo && (
                      <p className="mt-0.5 text-xs font-bold text-slate-500">{meta.rutaCodigo}</p>
                    )}
                  </div>
                }
              />
              <InfoCard
                icon={<CalendarClock className="h-4 w-4" />}
                label="Jornada regularizada"
                value={formatFechaOperativa(meta.fechaOperativaRuta)}
              />
              <InfoCard
                icon={<Clock className="h-4 w-4" />}
                label="Fecha real del pago"
                value={formatFechaHora(meta.fechaRealPago || notificacion.creadoEn)}
              />
              <InfoCard
                icon={<Banknote className="h-4 w-4" />}
                label="Cobrador de la ruta"
                value={meta.cobradorNombre || 'No disponible'}
              />
              <InfoCard
                icon={<ReceiptText className="h-4 w-4" />}
                label="Pago / préstamo"
                value={
                  <div>
                    <p>{meta.numeroPago || meta.pagoId || 'Pago'}</p>
                    {meta.numeroPrestamo && (
                      <p className="mt-0.5 text-xs font-bold text-slate-500">{meta.numeroPrestamo}</p>
                    )}
                  </div>
                }
              />
            </section>

            <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Impacto financiero
              </p>
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                  <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600">Capital</p>
                  <p className="mt-1 text-lg font-black text-emerald-700">{formatCurrency(capital)}</p>
                </div>
                <div className="rounded-xl border border-amber-100 bg-amber-50 p-3">
                  <p className="text-[9px] font-black uppercase tracking-widest text-amber-600">Interés</p>
                  <p className="mt-1 text-lg font-black text-amber-700">{formatCurrency(interes)}</p>
                </div>
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-3">
                  <p className="text-[9px] font-black uppercase tracking-widest text-blue-600">Cuotas afectadas</p>
                  <p className="mt-1 text-lg font-black text-blue-700">{Number(meta.cuotasAfectadas || 0)}</p>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                  Saldo del crédito
                </p>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400">Anterior</p>
                    <p className="text-base font-black text-slate-700">{formatCurrency(saldoAnterior)}</p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-slate-300" />
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400">Nuevo</p>
                    <p className="text-base font-black text-slate-900">{formatCurrency(saldoNuevo)}</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">
                Nota operativa
              </p>
              <p className="mt-2 text-sm font-semibold leading-relaxed text-amber-900">
                Este pago no debe subir el recaudo operativo de la ruta actual. Debe aparecer en la jornada antigua como regularizado después y en contabilidad como recaudo contable.
              </p>
            </section>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-100 bg-white p-5 sm:flex-row">
            {meta.pagoId && (
              <button
                onClick={() => setShowPagoDetalle(true)}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3.5 text-[11px] font-black uppercase tracking-widest text-white shadow-lg shadow-slate-900/15 transition-colors hover:bg-slate-800"
              >
                <FileText className="h-4 w-4" />
                Ver detalle del pago
              </button>
            )}
            <button
              onClick={onClose}
              className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-[11px] font-black uppercase tracking-widest text-slate-600 transition-colors hover:bg-slate-50"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>

      <PagoDetalleModal
        isOpen={showPagoDetalle}
        onClose={() => setShowPagoDetalle(false)}
        metadata={{
          pagoId: meta.pagoId,
          numeroPago: meta.numeroPago,
          numeroPrestamo: meta.numeroPrestamo,
          prestamoId: meta.prestamoId,
          metodoPago: meta.metodoPago,
          cliente: meta.clienteNombre,
          clienteId: meta.clienteId,
          clienteDni: meta.clienteDni,
          monto,
          capitalRecuperado: capital,
          interesRecuperado: interes,
          saldoNuevo,
          saldoAnterior,
          prestamoQuedaPagado: meta.prestamoQuedaPagado,
          cuotasAfectadas: meta.cuotasAfectadas,
        }}
      />
    </Portal>
  )
}
