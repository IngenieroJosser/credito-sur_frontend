'use client'

import { AlertTriangle, RefreshCw } from 'lucide-react'
import { nombreDePeriodo, type TimeFilterPeriod } from '@/components/ui/TimeFilter'

/** Identifica las cifras conservadas mientras se carga el nuevo período. */
export function AvisoActualizando({
  periodo,
  mismoPeriodo = false,
  fallo = null,
  onReintentar,
}: {
  /** El periodo al que se está cambiando. */
  periodo: TimeFilterPeriod
  mismoPeriodo?: boolean
  /** Si la actualización falló, el motivo que dio el servidor. */
  fallo?: string | null
  onReintentar?: () => void
}) {
  const destino = nombreDePeriodo(periodo)

  if (fallo) {
    return (
      <div
        role="alert"
        aria-live="polite"
        className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-800"
      >
        <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="flex-1">
          {mismoPeriodo
            ? 'No se pudieron actualizar las cifras. Se muestran los últimos datos disponibles.'
            : `No se pudo actualizar a ${destino}: las cifras que ves son las del periodo anterior.`} {fallo}
        </span>
        {onReintentar ? (
          <button
            type="button"
            onClick={onReintentar}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-amber-800 px-3 text-xs font-bold text-white hover:bg-amber-900"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            Reintentar
          </button>
        ) : null}
      </div>
    )
  }

  return (
    <div
      aria-live="polite"
      className="mb-4 flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs font-bold text-blue-800"
    >
      <RefreshCw className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
      <span>
        {mismoPeriodo
          ? 'Actualizando… Se muestran los últimos datos disponibles.'
          : `Actualizando a ${destino}… las cifras de abajo son todavía las del periodo anterior.`}
      </span>
    </div>
  )
}

export default AvisoActualizando
