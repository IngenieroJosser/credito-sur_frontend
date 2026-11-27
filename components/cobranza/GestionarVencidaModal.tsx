'use client'
import { formatFechaBogota } from '@/lib/format-date'

/**
 * GestionarVencidaModal — Gestionar una cuenta cuyo contrato ya venció
 *
 * Opciones:
 * - PRORROGAR: extender el plazo con opción de cobrar mora
 * - DEJAR_QUIETO: seguimiento sin cobrar mora adicional
 * - CASTIGAR: marcar como pérdida contable
 */

import React, { useEffect, useId, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  AlertCircle, DollarSign, Save, Ban, Clock,
  CalendarClock, Check, Loader2, Scale, Info
} from 'lucide-react'
import { formatCurrency, cn, formatCOPDecimalTypingInputValue, formatCOPDecimalBlurInputValue, parseCOPDecimalInputToNumber } from '@/lib/utils'
import { DECISIONES_CUENTA_VENCIDA } from '@/lib/display-labels'
import { useModalDialog } from '@/hooks/use-modal-dialog'
import CabeceraModal, { type tonosModal } from '@/components/ui/CabeceraModal'
import FieldLabel from '@/components/ui/FieldLabel'
import Cifra from '@/components/ui/Cifra'
import AyudaContextual from '@/components/ui/AyudaContextual'
import {
  BARRA_DE_ARRASTRE,
  CUERPO_HOJA_MODAL,
  FONDO_HOJA_MODAL,
  PANEL_HOJA_MODAL,
  PIE_HOJA_MODAL,
} from '@/lib/ui/hoja-modal'

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
    decision: 'CASTIGAR' | 'PRORROGAR' | 'DEJAR_QUIETO'
    montoInteres: number
    diasGracia: number
    comentarios?: string
  }) => void
}

type Decision = 'PRORROGAR' | 'CASTIGAR' | 'DEJAR_QUIETO'

const DECISION_CONFIG: Record<Decision, {
  label: string
  description: string
  icon: React.ReactNode
  tono: keyof typeof tonosModal
  activeColor: string
  activeBorder: string
  activeBg: string
}> = {
  PRORROGAR: {
    label: DECISIONES_CUENTA_VENCIDA.PRORROGAR.label,
    description: DECISIONES_CUENTA_VENCIDA.PRORROGAR.efecto,
    icon: <Clock className="h-4 w-4" />,
    tono: 'cielo',
    activeColor: 'text-sky-700',
    activeBorder: 'border-sky-300 ring-1 ring-sky-200',
    activeBg: 'bg-sky-50/70',
  },
  DEJAR_QUIETO: {
    label: DECISIONES_CUENTA_VENCIDA.DEJAR_QUIETO.label,
    description: DECISIONES_CUENTA_VENCIDA.DEJAR_QUIETO.efecto,
    icon: <Ban className="h-4 w-4" />,
    tono: 'ambar',
    activeColor: 'text-amber-700',
    activeBorder: 'border-amber-300 ring-1 ring-amber-200',
    activeBg: 'bg-amber-50/70',
  },
  CASTIGAR: {
    label: DECISIONES_CUENTA_VENCIDA.CASTIGAR.label,
    description: DECISIONES_CUENTA_VENCIDA.CASTIGAR.efecto,
    icon: <Scale className="h-4 w-4" />,
    tono: 'rosa',
    activeColor: 'text-rose-700',
    activeBorder: 'border-rose-300 ring-1 ring-rose-200',
    activeBg: 'bg-rose-50/70',
  },
}

function Portal({ children }: { children: React.ReactNode }) {
  if (typeof document === 'undefined') return null
  return createPortal(children, document.body)
}

export default function GestionarVencidaModal({ cuenta, onClose, onConfirm }: GestionarVencidaModalProps) {
  const id = useId()
  const [decision, setDecision] = useState<Decision>('PRORROGAR')
  const [cobrarInteres, setCobrarInteres] = useState(true)
  const [montoInteres, setMontoInteres] = useState<string>('')
  const [diasGracia, setDiasGracia] = useState<string>('')
  const [comentarios, setComentarios] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const { contenedorRef, propsDialogo, alTocarElFondo, capa } = useModalDialog({
    onClose,
    enfocarAlAbrir: false,
  })

  useEffect(() => {
    const anterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = anterior }
  }, [])

  const hayDatosSinGuardar =
    montoInteres.trim() !== '' ||
    diasGracia.trim() !== '' ||
    comentarios.trim() !== ''

  const cfg = DECISION_CONFIG[decision]

  const nuevaFecha = (() => {
    const d = new Date()
    d.setDate(d.getDate() + Number(diasGracia || 0))
    return formatFechaBogota(d, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
  })()

  const montoInteresNum = cobrarInteres ? parseCOPDecimalInputToNumber(montoInteres) : 0
  const isValid = decision !== 'PRORROGAR' || Number(diasGracia) >= 1
  const requireComentario = decision === 'CASTIGAR'
  const deshabilitado = !isValid || isLoading || (requireComentario && !comentarios.trim())

  const handleConfirm = async () => {
    if (deshabilitado) return
    setIsLoading(true)
    try {
      await onConfirm({
        decision,
        montoInteres: decision === 'PRORROGAR' ? montoInteresNum : 0,
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
        className={FONDO_HOJA_MODAL}
        style={{ zIndex: capa }}
        onClick={(evento) => alTocarElFondo(evento, hayDatosSinGuardar)}
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
            titulo="Gestión de Cuenta Vencida"
            subtitulo={`${cuenta.numeroPrestamo} · ${cuenta.cliente.nombre}`}
            icono={AlertCircle}
            tono={cfg.tono}
            onClose={onClose}
            cerrarDeshabilitado={isLoading}
          />

          {/* ── Body limpio en flujo vertical cómodo ── */}
          <div className={`${CUERPO_HOJA_MODAL} px-5 py-5 sm:px-6 space-y-4`}>
            {/* Resumen horizontal de la cuenta */}
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-rose-200/80 bg-rose-50/50 px-4 py-3.5">
              <div className="flex flex-1 items-center gap-3.5 min-w-0">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-rose-200 bg-white text-sm font-bold text-rose-700">
                  {cuenta.diasVencidos}d
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-rose-700">
                    Saldo Vencido
                    <AyudaContextual ayuda="saldoPendiente" de="el saldo vencido" tamano="pequeno" />
                  </div>
                  <div className="text-xs font-medium text-slate-600 truncate">
                    {cuenta.cliente.nombre} · {cuenta.ruta || 'Sin asignar'}
                  </div>
                </div>
              </div>
              <div className="w-2/5 min-w-0 max-w-48 text-right">
                <Cifra valor={cuenta.saldoPendiente} tamano="grande" className="font-bold text-slate-900" />
              </div>
            </div>

            <fieldset className="min-w-0">
              <legend className="mb-2 text-sm font-semibold text-slate-700">Tipo de acción</legend>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                {(Object.keys(DECISION_CONFIG) as Decision[]).map(d => {
                  const c = DECISION_CONFIG[d]
                  const isActive = decision === d
                  return (
                    <button
                      key={d}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => setDecision(d)}
                      className={cn(
                        'rounded-xl border p-3.5 text-left transition-all',
                        isActive
                          ? cn(c.activeBorder, c.activeBg)
                          : 'border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-slate-50'
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn(isActive ? c.activeColor : 'text-slate-400')}>
                          {c.icon}
                        </span>
                        <span className={cn('text-xs font-bold', isActive ? 'text-slate-900' : 'text-slate-700')}>
                          {c.label}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-snug">
                        {c.description}
                      </p>
                    </button>
                  )
                })}
              </div>
            </fieldset>

            {/* Panel de PRORROGAR */}
            {decision === 'PRORROGAR' && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 space-y-3 animate-in fade-in duration-150">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <FieldLabel htmlFor={`${id}-dias`} required>Días de extensión</FieldLabel>
                    <div className="relative">
                      <CalendarClock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-sky-600" />
                      <input
                        id={`${id}-dias`}
                        type="number"
                        value={diasGracia}
                        onChange={e => setDiasGracia(e.target.value)}
                        placeholder="30"
                        min="1"
                        className="min-h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                      />
                    </div>
                    {Number(diasGracia) > 0 && (
                      <p className="mt-1.5 text-xs font-medium text-sky-700">
                        Nueva fecha límite: <span className="font-semibold text-slate-900">{nuevaFecha}</span>
                      </p>
                    )}
                  </div>

                  {cobrarInteres && (
                    <div>
                      <FieldLabel htmlFor={`${id}-interes`}>Monto del interés ($)</FieldLabel>
                      <div className="relative">
                        <DollarSign className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-600" />
                        <input
                          id={`${id}-interes`}
                          type="text"
                          inputMode="decimal"
                          value={montoInteres}
                          onChange={e => setMontoInteres(formatCOPDecimalTypingInputValue(e.target.value))}
                          onBlur={(e) => setMontoInteres(formatCOPDecimalBlurInputValue(e.target.value))}
                          placeholder="0"
                          className="min-h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                        />
                      </div>
                      {montoInteresNum > 0 && (
                        <p className="mt-1.5 text-xs font-medium text-slate-600">
                          Nueva deuda total:{' '}
                          <span className="font-bold text-slate-900">
                            {formatCurrency(cuenta.saldoPendiente + montoInteresNum)}
                          </span>
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <label
                  className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 cursor-pointer transition-colors hover:border-sky-200"
                  onClick={() => setCobrarInteres(!cobrarInteres)}
                >
                  <div className={cn(
                    'h-5 w-5 rounded-md border flex items-center justify-center transition-colors shrink-0',
                    cobrarInteres ? 'bg-sky-700 border-sky-700' : 'border-slate-300 bg-slate-50'
                  )}>
                    {cobrarInteres && <Check className="w-3.5 h-3.5 text-white" />}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900">Cobrar interés de mora adicional</div>
                    <div className="text-[11px] text-slate-500">Se sumará al saldo pendiente del crédito</div>
                  </div>
                </label>
              </div>
            )}

            {/* Panel DEJAR_QUIETO */}
            {decision === 'DEJAR_QUIETO' && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 animate-in fade-in duration-150">
                <div className="flex items-start gap-3">
                  <Info className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-amber-950">Sin cargo de mora por ahora</h4>
                    <p className="text-xs text-amber-900/80 leading-relaxed mt-1">
                      El cliente <strong>{cuenta.cliente.nombre}</strong> permanecerá en seguimiento
                      sin asignarle interés de mora en este momento. Podrás gestionarlo nuevamente
                      cuando sea necesario.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Panel CASTIGAR */}
            {decision === 'CASTIGAR' && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4 animate-in fade-in duration-150">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-rose-950">¿Reportar como pérdida contable?</h4>
                    <p className="text-xs text-rose-800 leading-relaxed mt-1">
                      El capital restante <strong>{formatCurrency(cuenta.saldoPendiente)}</strong> quedará
                      registrado como cartera castigada y saldrá de la cartera activa. Esta acción es{' '}
                      <strong>irreversible</strong>.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Observaciones */}
            <div>
              <FieldLabel htmlFor={`${id}-obs`} required={requireComentario}>
                Observaciones {requireComentario ? '' : '(opcional)'}
              </FieldLabel>
              <textarea
                id={`${id}-obs`}
                value={comentarios}
                onChange={e => setComentarios(e.target.value)}
                placeholder={
                  decision === 'PRORROGAR'
                    ? 'Ej: El cliente se compromete a pagar...'
                    : decision === 'DEJAR_QUIETO'
                      ? 'Ej: Motivo del seguimiento sin mora...'
                      : 'Razón del castigo de cartera...'
                }
                rows={2}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-800 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100 resize-none placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* ── Footer ── */}
          <div className={`${PIE_HOJA_MODAL} flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/80 px-5 py-3.5 sm:px-6`}>
            <button
              type="button"
              onClick={onClose}
              className="min-h-11 rounded-xl border border-slate-200 bg-white px-5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={deshabilitado}
              className={cn(
                'min-h-11 rounded-xl px-6 text-xs font-bold text-white transition-colors flex items-center justify-center gap-2',
                deshabilitado
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : decision === 'PRORROGAR'
                    ? 'bg-sky-700 hover:bg-sky-800'
                    : decision === 'DEJAR_QUIETO'
                      ? 'bg-amber-700 hover:bg-amber-800'
                      : 'bg-rose-600 hover:bg-rose-700'
              )}
            >
              {isLoading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Procesando…</>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {decision === 'PRORROGAR' ? 'Confirmar prórroga'
                    : decision === 'DEJAR_QUIETO' ? 'Confirmar seguimiento'
                    : 'Confirmar pérdida'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  )
}
