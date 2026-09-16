'use client'

import { useId, type ReactNode } from 'react'
import { X } from 'lucide-react'

export const BOTON_AVISO_PRINCIPAL =
  'inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-primary-dark disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40'
export const BOTON_AVISO_SECUNDARIO =
  'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40'

interface AvisoFlotanteProps {
  icono: ReactNode
  titulo: string
  children?: ReactNode
  acciones?: ReactNode
  onCerrar: () => void
}

/**
 * Aviso pequeño fijo abajo. No es un modal: no oscurece ni bloquea la pantalla,
 * se puede seguir trabajando con él visible.
 *
 * Va a 6,5rem del borde inferior para no tapar lo que ya vive abajo: la barra
 * de navegación inferior del layout de admin en móvil (mide cerca de 5,5rem
 * más el área segura) y el menú flotante de acciones de los dashboards (abajo
 * a la derecha, a 1,5rem). En móvil ocupa el ancho con márgenes; desde `sm` es
 * una tarjeta angosta a la derecha.
 */
export default function AvisoFlotante({ icono, titulo, children, acciones, onCerrar }: AvisoFlotanteProps) {
  const idTitulo = useId()

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby={idTitulo}
      className="fixed inset-x-3 bottom-[calc(6.5rem+env(safe-area-inset-bottom))] z-[60] animate-in fade-in slide-in-from-bottom-4 duration-300 motion-reduce:animate-none sm:inset-x-auto sm:right-4 sm:w-[23rem] lg:right-6"
    >
      <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-3 pr-2 shadow-xl shadow-slate-900/10">
        <div className="shrink-0">{icono}</div>
        <div className="min-w-0 flex-1">
          <p id={idTitulo} className="text-sm font-bold text-slate-900">
            {titulo}
          </p>
          {children && <div className="mt-0.5 text-xs leading-relaxed text-slate-600">{children}</div>}
          {acciones && <div className="mt-2.5 flex flex-wrap items-center gap-1.5">{acciones}</div>}
        </div>
        <button
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar aviso"
          className="shrink-0 rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
