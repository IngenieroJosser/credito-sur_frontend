'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'

/**
 * Paginador unico de los listados.
 *
 * Antes cada listado dibujaba su propia pareja de botones, con estilos y
 * posiciones distintas: el usuario tenia que volver a buscar donde estaban en
 * cada pantalla. Aqui se fija una sola forma, abajo a la derecha, con botones
 * solidos en vez de texto suelto para que se vean sin buscarlos.
 */
interface PaginadorProps {
  pagina: number
  totalPaginas: number
  onCambiar: (pagina: number) => void
  /** Texto opcional a la izquierda, p. ej. "128 registros". */
  resumen?: string
  /** Desactiva los botones mientras se cargan los datos. */
  cargando?: boolean
  className?: string
}

export default function Paginador({
  pagina,
  totalPaginas,
  onCambiar,
  resumen,
  cargando = false,
  className = '',
}: PaginadorProps) {
  // Con una sola pagina el paginador no aporta nada y solo ocupa sitio.
  if (totalPaginas <= 1 && !resumen) return null

  const hayAnterior = pagina > 1 && !cargando
  const haySiguiente = pagina < totalPaginas && !cargando

  const estilo = (activo: boolean) =>
    [
      'inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2',
      'text-sm font-semibold transition-colors',
      activo
        ? 'border-slate-300 bg-white text-slate-700 hover:border-[#08557f] hover:bg-[#08557f] hover:text-white'
        : 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-300',
    ].join(' ')

  return (
    <div
      className={`mt-4 flex flex-wrap items-center justify-end gap-3 ${className}`}
    >
      {resumen && (
        <span className="mr-auto text-xs font-medium text-slate-500">
          {resumen}
        </span>
      )}

      {totalPaginas > 1 && (
        <>
          <span className="text-sm text-slate-500">
            Página <strong className="text-slate-800">{pagina}</strong> de{' '}
            <strong className="text-slate-800">{totalPaginas}</strong>
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onCambiar(Math.max(1, pagina - 1))}
              disabled={!hayAnterior}
              className={estilo(hayAnterior)}
            >
              <ChevronLeft className="h-4 w-4 shrink-0" />
              Anterior
            </button>
            <button
              type="button"
              onClick={() => onCambiar(Math.min(totalPaginas, pagina + 1))}
              disabled={!haySiguiente}
              className={estilo(haySiguiente)}
            >
              Siguiente
              <ChevronRight className="h-4 w-4 shrink-0" />
            </button>
          </div>
        </>
      )}
    </div>
  )
}
