'use client'

import type { ReactNode } from 'react'
import { X, type LucideIcon } from 'lucide-react'
import Tooltip from '@/components/ui/Tooltip'
import { cn } from '@/lib/utils'

export const tonosModal = {
  cielo: {
    superficie: 'border-sky-200 bg-sky-50',
    insignia: 'bg-sky-100 text-sky-800',
    texto: 'text-sky-950',
  },
  menta: {
    superficie: 'border-emerald-200 bg-emerald-50',
    insignia: 'bg-emerald-100 text-emerald-800',
    texto: 'text-emerald-950',
  },
  rosa: {
    superficie: 'border-rose-200 bg-rose-50',
    insignia: 'bg-rose-100 text-rose-800',
    texto: 'text-rose-950',
  },
  ambar: {
    superficie: 'border-amber-200 bg-amber-50',
    insignia: 'bg-amber-100 text-amber-900',
    texto: 'text-amber-950',
  },
}

type Props = {
  idTitulo?: string
  titulo: string
  subtitulo?: ReactNode
  icono: LucideIcon
  tono?: keyof typeof tonosModal
  onClose: () => void
  cerrarDeshabilitado?: boolean
}

export default function CabeceraModal({ idTitulo, titulo, subtitulo, icono: Icono, tono = 'cielo', onClose, cerrarDeshabilitado }: Props) {
  const paleta = tonosModal[tono]

  return (
    <header className={cn('flex shrink-0 items-center gap-3 border-b px-4 py-3 transition-colors motion-reduce:transition-none sm:px-6', paleta.superficie)}>
      <span className={cn('grid size-10 shrink-0 place-items-center rounded-lg', paleta.insignia)}>
        <Icono size={19} aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <h2 id={idTitulo} className={cn('break-words text-lg font-bold', paleta.texto)}>{titulo}</h2>
        {subtitulo && <div className="mt-0.5 break-words text-xs font-medium text-slate-600">{subtitulo}</div>}
      </div>
      <Tooltip texto="Cerrar">
        <button type="button" aria-label="Cerrar" onClick={onClose} disabled={cerrarDeshabilitado}
          className="grid size-11 shrink-0 place-items-center rounded-lg text-slate-600 transition-colors hover:bg-white hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 disabled:opacity-50">
          <X size={20} aria-hidden="true" />
        </button>
      </Tooltip>
    </header>
  )
}
