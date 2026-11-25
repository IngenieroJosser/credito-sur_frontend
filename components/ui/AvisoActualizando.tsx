'use client'

import { AlertTriangle, RefreshCw } from 'lucide-react'
import { nombreDePeriodo, type TimeFilterPeriod } from '@/components/ui/TimeFilter'

/**
 * Lo que se muestra mientras una pantalla cambia de periodo, sin vaciarla.
 *
 * ── El problema ────────────────────────────────────────────────────────────
 *
 * Los dos paneles —`/admin` y `/coordinador`— hacían `dashboardData: null` al
 * cambiar de «mes» a «año», con este motivo escrito al lado: «borrar datos
 * anteriores para no mostrar datos de otro período». El motivo es bueno; la
 * solución, no: la pantalla entera se iba al esqueleto hasta que llegara la
 * respuesta. Medido con 2.000 clientes, `/dashboard` tarda entre 2,7 y 3,8
 * segundos, así que cambiar un filtro costaba varios segundos de pantalla en
 * blanco.
 *
 * Medido también lo contrario: de las **ocho** vistas que usan el selector de
 * periodo, solo esas dos se vaciaban. Las otras seis ya conservaban sus datos.
 *
 * ── Y por qué no basta con «no borrar» ────────────────────────────────────
 *
 * Porque entonces se verían las cifras de MES mientras el selector ya dice
 * AÑO, y eso es una cifra que miente —la regla de siempre en este proyecto—.
 * Así que los datos se quedan, pero se dicen dos cosas: que lo que hay en
 * pantalla es del periodo anterior, y a cuál se está cambiando. El contenedor
 * además se atenúa y deja de recibir clics, para que nadie actúe sobre una
 * cifra que está a punto de cambiar.
 *
 * La variante `fallo` es para cuando la actualización no llegó: ahí lo que no
 * puede pasar es que se queden las cifras viejas pareciendo las nuevas.
 */
export function AvisoActualizando({
  periodo,
  fallo = null,
  onReintentar,
}: {
  /** El periodo al que se está cambiando. */
  periodo: TimeFilterPeriod
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
          No se pudo actualizar a {destino}: las cifras que ves son las del
          periodo anterior. {fallo}
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
        Actualizando a {destino}… las cifras de abajo son todavía las del
        periodo anterior.
      </span>
    </div>
  )
}

export default AvisoActualizando
