'use client'

import { useState } from 'react'
import { X, Clock, AlertTriangle, CheckCircle2, Calendar, Loader2 } from 'lucide-react'
import { VisitaRuta } from '@/lib/types/cobranza'
import Portal, { MODAL_Z_INDEX } from '@/components/ui/Portal'

interface ReprogramarModalProps {
  visita: VisitaRuta
  onClose: () => void
  /** Al confirmar se pasa la fecha, motivo e ID de la cuota seleccionada */
  onConfirm: (fecha: string, motivo: string, cuotaId?: string) => void | Promise<void>
}

// Límites de días según frecuencia
const LIMITES_DIAS: Record<string, number> = {
  DIA: 1,
  SEMANA: 6,
  QUINCENA: 14,
  MES: 30,
}


export default function ReprogramarModal({ visita, onClose, onConfirm }: ReprogramarModalProps) {
  const [reprogramFecha, setReprogramFecha] = useState('')
  const [reprogramMotivo, setReprogramMotivo] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Validación de límite de días
  const limite = LIMITES_DIAS[visita.periodoRuta] ?? 30
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const maxFecha = new Date(hoy)
  maxFecha.setDate(maxFecha.getDate() + limite)
  const maxFechaStr = maxFecha.toISOString().split('T')[0]
  const minFechaStr = hoy.toISOString().split('T')[0]

  // Validar si la fecha seleccionada supera el límite
  const diasSeleccionados = reprogramFecha
    ? Math.round((new Date(reprogramFecha + 'T00:00:00').getTime() - hoy.getTime()) / 86_400_000)
    : 0
  const excedeLimite = reprogramFecha ? diasSeleccionados > limite : false
  const fechaAnteriorHoy = reprogramFecha ? diasSeleccionados < 0 : false

  const canSubmit = reprogramFecha && reprogramMotivo && !excedeLimite && !fechaAnteriorHoy && !isSubmitting

  const handleGuardar = async () => {
    if (!canSubmit) return
    setIsSubmitting(true)
    try {
      await onConfirm(reprogramFecha, reprogramMotivo)
    } catch (error) {
      console.error('Error al solicitar reprogramación:', error)
      setIsSubmitting(false)
    }
  }

  const periodLabel: Record<string, string> = {
    DIA: 'diario',
    SEMANA: 'semanal',
    QUINCENA: 'quincenal',
    MES: 'mensual',
  }

  return (
    <Portal>
      <div
        className="fixed inset-0 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
        style={{ zIndex: MODAL_Z_INDEX }}
        onClick={onClose}
      >
        <div
          className="w-full max-w-md bg-white rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 pt-6 pb-4 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-100 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Solicitar reprogramación</h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">{visita.cliente}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors"
                type="button"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-5">
            {/* Info banner */}
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
              <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 font-medium leading-relaxed">
                Los créditos <strong>{periodLabel[visita.periodoRuta] || visita.periodoRuta}</strong> solo pueden reprogramarse hasta <strong>{limite} día{limite !== 1 ? 's' : ''}</strong> desde hoy. La solicitud será enviada para aprobación del supervisor.
              </p>
            </div>


            {/* Nueva fecha */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Nueva fecha de pago
              </label>
              <input
                type="date"
                value={reprogramFecha}
                min={minFechaStr}
                max={maxFechaStr}
                onChange={(e) => setReprogramFecha(e.target.value)}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-0 font-medium text-slate-900 transition-colors ${
                  excedeLimite || fechaAnteriorHoy
                    ? 'border-red-400 bg-red-50 focus:border-red-500'
                    : 'border-slate-200 bg-slate-50 focus:border-orange-500'
                }`}
              />
              {excedeLimite && (
                <div className="flex items-center gap-1.5 mt-2 text-red-600 text-xs font-semibold">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Excede el límite de {limite} días para créditos {periodLabel[visita.periodoRuta] || ''}
                </div>
              )}
              {fechaAnteriorHoy && (
                <div className="flex items-center gap-1.5 mt-2 text-red-600 text-xs font-semibold">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  La fecha no puede ser anterior a hoy
                </div>
              )}
              {reprogramFecha && !excedeLimite && !fechaAnteriorHoy && (
                <div className="flex items-center gap-1.5 mt-2 text-emerald-600 text-xs font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {diasSeleccionados === 0 ? 'Para hoy' : `En ${diasSeleccionados} día${diasSeleccionados !== 1 ? 's' : ''}`}
                </div>
              )}
            </div>

            {/* Motivo */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Motivo</label>
              <textarea
                value={reprogramMotivo}
                onChange={(e) => setReprogramMotivo(e.target.value)}
                rows={3}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-orange-500 focus:ring-0 font-medium text-slate-900 resize-none transition-colors"
                placeholder="Ej: Cliente solicitó aplazar por viaje, se compromete al..."
              />
            </div>

            {/* Botones */}
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3.5 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all text-sm"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleGuardar}
                disabled={!canSubmit}
                className="flex-1 bg-orange-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-orange-500/20 hover:bg-orange-600 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed text-sm"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Calendar className="h-4 w-4" />
                )}
                {isSubmitting ? 'Enviando...' : 'Enviar al supervisor'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  )
}
