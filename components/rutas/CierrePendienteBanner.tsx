import { AlertTriangle, CalendarClock, User, RefreshCw } from 'lucide-react'
import type { CierrePendienteRuta } from '@/types/rutas/cierre-pendiente'

export function CierrePendienteBanner({
  cierrePendiente,
  variant = 'warning',
  onRefresh,
  onRegularizar,
  canRegularizar = false,
}: {
  cierrePendiente: CierrePendienteRuta | null
  variant?: 'warning' | 'danger'
  onRefresh?: () => void
  onRegularizar?: () => void
  canRegularizar?: boolean
}) {
  if (!cierrePendiente?.pendienteCierre) return null

  const isDanger = variant === 'danger'

  return (
    <div
      className={[
        'rounded-2xl border-2 p-4 shadow-sm',
        isDanger ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50',
      ].join(' ')}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle
          className={[
            'mt-0.5 h-5 w-5 shrink-0',
            isDanger ? 'text-red-600' : 'text-amber-600',
          ].join(' ')}
        />

        <div className="flex-1 space-y-3">
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
                <span>Fecha pendiente: {cierrePendiente.fechaOperativa}</span>
              </div>
            )}

            {cierrePendiente.fechaActivacion && (
              <div className="flex items-center gap-2">
                <CalendarClock className="h-3.5 w-3.5" />
                <span>Activada: {cierrePendiente.fechaActivacion}</span>
              </div>
            )}

            {typeof cierrePendiente.diasPendiente === 'number' && (
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>Días pendiente: {cierrePendiente.diasPendiente}</span>
              </div>
            )}

            {cierrePendiente.cobradorNombre && (
              <div className="flex items-center gap-2">
                <User className="h-3.5 w-3.5" />
                <span>Cobrador: {cierrePendiente.cobradorNombre}</span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Actualizar estado
              </button>
            )}

            {canRegularizar && onRegularizar && (
              <button
                type="button"
                onClick={onRegularizar}
                className="rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800"
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
