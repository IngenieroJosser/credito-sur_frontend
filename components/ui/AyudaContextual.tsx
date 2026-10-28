'use client'

import { CircleHelp } from 'lucide-react'
import Tooltip from '@/components/ui/Tooltip'

interface AyudaContextualProps {
  texto: string
  etiqueta?: string
  className?: string
}

/** Ayuda explícita: el usuario ve el icono antes de intentar descubrirla. */
export default function AyudaContextual({
  texto,
  etiqueta = 'Más información',
  className = '',
}: AyudaContextualProps) {
  return (
    <Tooltip texto={texto} lado="abajo">
      <button
        type="button"
        aria-label={etiqueta}
        className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${className}`}
      >
        <CircleHelp className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </Tooltip>
  )
}
