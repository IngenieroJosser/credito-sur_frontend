'use client'

import { AlertTriangle, RefreshCw } from 'lucide-react'

/**
 * Lo que se muestra cuando una pantalla no pudo cargar sus datos.
 *
 * ── Por qué existe ─────────────────────────────────────────────────────────
 *
 * Los dos paneles principales —`/admin` y `/coordinador`— hacían
 * `if (!state.dashboardData) return null`: ante un error de carga la pantalla
 * quedaba **en blanco**, sin decir nada y sin forma de reintentar.
 *
 * Eso tapaba el problema de verdad, que estaba en el servidor: `/dashboard`
 * devolvía «datos de fallback» —`recaudo: 0`, `delinquentAccounts: 0`, la
 * gráfica vacía— cuando una consulta fallaba. O sea que el dueño veía un
 * negocio sin cartera y sin cobranza, y no había manera de distinguirlo de un
 * día tranquilo. Ahora el servidor falla de verdad, y hacía falta algo que
 * contara el fallo en vez de una pantalla vacía.
 *
 * Es la misma regla de siempre en este proyecto: un cero no es un hueco. Si no
 * se sabe, se dice que no se sabe.
 */
export function PanelDeError({
  titulo = 'No se pudieron cargar los datos',
  mensaje,
  onReintentar,
  reintentando = false,
}: {
  titulo?: string
  /** El motivo que dio el servidor. Se pinta tal cual: ya viene traducido. */
  mensaje?: string | null
  onReintentar?: () => void
  reintentando?: boolean
}) {
  return (
    <div
      role="alert"
      aria-live="polite"
      className="mx-auto flex min-h-[60vh] w-full max-w-xl flex-col items-center justify-center gap-4 px-4 text-center"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
        <AlertTriangle className="h-7 w-7" aria-hidden="true" />
      </div>

      <div className="space-y-1">
        <h2 className="text-lg font-bold text-slate-900">{titulo}</h2>
        {/*
          El motivo, cuando el servidor lo manda. Sin esto el aviso diría que
          algo falló sin decir qué, que es la mitad del problema: hay 35 sitios
          en este repo que tiran el motivo del backend y escriben un texto
          genérico.
        */}
        {mensaje ? (
          <p className="text-sm font-medium text-slate-500">{mensaje}</p>
        ) : null}
        <p className="text-xs font-medium text-slate-400">
          No se está mostrando información incompleta a propósito: es mejor no
          ver una cifra que verla equivocada.
        </p>
      </div>

      {onReintentar ? (
        <button
          type="button"
          onClick={onReintentar}
          disabled={reintentando}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-bold text-white transition-colors hover:bg-slate-800 disabled:opacity-60"
        >
          <RefreshCw
            className={`h-4 w-4 ${reintentando ? 'animate-spin' : ''}`}
            aria-hidden="true"
          />
          {reintentando ? 'Reintentando…' : 'Reintentar'}
        </button>
      ) : null}
    </div>
  )
}

export default PanelDeError
