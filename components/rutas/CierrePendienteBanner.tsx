import { AlertTriangle, CalendarClock, User, RefreshCw } from 'lucide-react'
import type { CierrePendienteRuta } from '@/types/rutas/cierre-pendiente'
import {
  formatFechaCortaBogota,
  formatFechaHumanaBogota,
} from '@/lib/format-date'

export function CierrePendienteBanner({
  cierrePendiente,
  variant = 'warning',
  onRefresh,
  onRegularizar,
  onVerDetalles,
  canRegularizar = false,
}: {
  cierrePendiente: CierrePendienteRuta | null
  variant?: 'warning' | 'danger'
  onRefresh?: () => void
  onRegularizar?: (contexto: {
    rutaId?: string
    fechaOperativa?: string
    activacionId?: string
    origenGestion: 'CIERRE_PENDIENTE'
  }) => void
  onVerDetalles?: () => void
  canRegularizar?: boolean
}) {
  if (!cierrePendiente?.pendienteCierre) return null

  const isDanger = variant === 'danger'

  const contextoRegularizacion = {
    rutaId: cierrePendiente.rutaId,
    fechaOperativa: cierrePendiente.fechaOperativa,
    activacionId: cierrePendiente.activacionId,
    origenGestion: 'CIERRE_PENDIENTE' as const,
  }

  return (
    <div
      className={[
        'rounded-2xl border-2 p-4 shadow-sm',
        isDanger ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50',
      ].join(' ')}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <AlertTriangle
          className={[
            'mt-0.5 h-5 w-5 shrink-0',
            isDanger ? 'text-red-600' : 'text-amber-600',
          ].join(' ')}
        />

        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <h4
              className={[
                'text-sm font-bold',
                isDanger ? 'text-red-900' : 'text-amber-900',
              ].join(' ')}
            >
              Jornada pendiente de cierre
            </h4>

            <p
              className={[
                'mt-1 text-xs leading-relaxed',
                isDanger ? 'text-red-800' : 'text-amber-800',
              ].join(' ')}
            >
              {cierrePendiente.message ||
                'La ruta tiene una jornada anterior pendiente de cierre.'}
            </p>
          </div>

          <div className="grid gap-2 text-[11px] font-medium text-slate-700 md:grid-cols-2">
            {cierrePendiente.fechaOperativa && (
              <div className="flex items-center gap-2">
                <CalendarClock className="h-3.5 w-3.5" />
                <span className="break-words">
                  Fecha pendiente: {formatFechaCortaBogota(cierrePendiente.fechaOperativa)}
                </span>
              </div>
            )}

            {cierrePendiente.fechaActivacion && (
              <div className="flex items-center gap-2">
                <CalendarClock className="h-3.5 w-3.5" />
                <span className="break-words">
                  Activada: {formatFechaHumanaBogota(cierrePendiente.fechaActivacion)}
                </span>
              </div>
            )}

            {typeof cierrePendiente.diasPendiente === 'number' && (
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span className="break-words">
                  Tiempo pendiente: {cierrePendiente.diasPendiente}{' '}
                  {cierrePendiente.diasPendiente === 1 ? 'día' : 'días'}
                </span>
              </div>
            )}

            {cierrePendiente.cobradorNombre && (
              <div className="flex items-center gap-2">
                <User className="h-3.5 w-3.5" />
                <span className="break-words">
                  Cobrador: {cierrePendiente.cobradorNombre}
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
            {onVerDetalles && (
              <button
                type="button"
                onClick={onVerDetalles}
                className="w-full rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white transition active:scale-[0.99] hover:bg-slate-800 sm:w-auto"
              >
                Ver detalles
              </button>
            )}

            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 sm:w-auto"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Actualizar estado
              </button>
            )}

            {canRegularizar && onRegularizar && (
              <button
                type="button"
                onClick={() => onRegularizar(contextoRegularizacion)}
                className="w-full rounded-xl border border-amber-300 bg-white px-3 py-2 text-xs font-bold text-amber-800 hover:bg-amber-50 sm:w-auto"
              >
                Regularizar cierre
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
