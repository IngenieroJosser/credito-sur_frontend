'use client'

import { cn } from '@/lib/utils'

/**
 * Un grupo de chips de filtro, con el nombre de lo que filtra a la vista.
 *
 * ── Lo que pasaba ───────────────────────────────────────────────────────────
 *
 * «Hay filtros donde el botón Todos se repite 2 veces.»
 *
 * En `/admin/creditos-articulos` hay dos grupos de chips uno al lado del otro
 * —estado del crédito y nivel de riesgo— y los dos empezaban por un botón que
 * decía exactamente «Todos». Lo único que los distinguía era un icono gris de
 * 14 px al principio de cada grupo: un embudo en uno y un triángulo de aviso
 * en el otro. Para quien mira la pantalla hay dos botones «Todos» idénticos y
 * nada que diga cuál quita qué, así que el segundo parece un duplicado del
 * primero. Y pulsar el que no era no da ningún error: la lista cambia, pero
 * por otro motivo.
 *
 * El mismo bloque de marcado estaba copiado en tres pantallas
 * —`/admin/creditos-articulos`, `/admin/archivados` y el listado de
 * préstamos—, las tres con su propio `.map` y sus mismas clases a mano.
 *
 * ── Lo que hace ─────────────────────────────────────────────────────────────
 *
 * El nombre de la dimensión es OBLIGATORIO y se ve. Con eso, dos grupos
 * seguidos se leen «Estado: Todos · Activos…» y «Riesgo: Todos · Al día…», y
 * el «Todos» de cada uno ya dice qué quita. El icono se queda, pero como
 * adorno: ya no es lo único que informa.
 *
 * Además, lo que el marcado copiado no tenía:
 *
 *  - `role="group"` con su nombre, y `aria-pressed` en cada chip. Eran
 *    botones que guardan estado y no lo decían: un lector de pantalla leía
 *    cinco botones iguales sin señalar cuál está puesto.
 *  - área táctil de 44 px en pantallas de dedo. Medían 27 px de alto y van
 *    pegados, que es la combinación que hace fallar el pulgar.
 *  - el movimiento del resto del sistema al pulsar, en vez de un
 *    `transition-all` que anima también el color de fondo y el sombreado.
 */

export type OpcionDeFiltro = {
  /** El valor que se guarda en el estado. */
  id: string
  /** Lo que se lee en el chip. */
  label: string
  /** Para contar cuántos hay en esa categoría, si se sabe. */
  cuenta?: number
}

type Props = {
  /**
   * Qué filtra este grupo: «Estado», «Riesgo», «Tipo».
   *
   * Obligatorio a propósito. Es lo que faltaba el día de los dos «Todos».
   */
  nombre: string
  opciones: OpcionDeFiltro[]
  valor: string
  onChange: (id: string) => void
  /** El icono del grupo. Decorativo: el nombre ya está escrito. */
  icono?: React.ReactNode
  disabled?: boolean
  /** Para quien lo quiera sin la tarjeta blanca alrededor. */
  sinMarco?: boolean
  className?: string
}

export default function GrupoDeFiltros({
  nombre,
  opciones,
  valor,
  onChange,
  icono,
  disabled = false,
  sinMarco = false,
  className,
}: Props) {
  return (
    <div
      role="group"
      aria-label={`Filtrar por ${nombre.toLowerCase()}`}
      className={cn(
        'flex flex-wrap items-center gap-1.5',
        !sinMarco && 'rounded-xl border border-slate-200 bg-white p-2 shadow-sm',
        className,
      )}
    >
      {icono ? (
        <span aria-hidden className="shrink-0 text-slate-400">
          {icono}
        </span>
      ) : null}
      <span className="mr-0.5 shrink-0 text-[10px] font-black uppercase tracking-widest text-slate-400">
        {nombre}
      </span>
      {opciones.map((opcion) => {
        const elegida = valor === opcion.id
        return (
          <button
            key={opcion.id}
            type="button"
            onClick={() => onChange(opcion.id)}
            disabled={disabled}
            aria-pressed={elegida}
            className={cn(
              // 44 px con el dedo, 30 con el ratón: es la medida que hace que
              // el pulgar acierte entre chips pegados.
              'inline-flex min-h-[44px] items-center whitespace-nowrap rounded-xl px-3 text-[11px] font-bold',
              'sm:min-h-0 sm:py-1.5',
              'transition-colors duration-150 ease-out motion-reduce:transition-none',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
              'disabled:cursor-not-allowed disabled:opacity-50',
              elegida
                ? 'bg-primary text-white shadow-md shadow-primary/20'
                : 'border border-slate-200 bg-slate-100/50 text-slate-600 hover:bg-slate-200/70',
            )}
          >
            {opcion.label}
            {typeof opcion.cuenta === 'number' ? (
              <span
                className={cn(
                  'ml-1.5 rounded-md px-1.5 py-0.5 text-[10px] font-black',
                  elegida ? 'bg-white/20 text-white' : 'bg-white text-slate-500',
                )}
              >
                {opcion.cuenta}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
