'use client'

import { CircleHelp } from 'lucide-react'
import Tooltip from '@/components/ui/Tooltip'
import { TEXTOS_DE_AYUDA, type ClaveDeAyuda } from '@/lib/ayudas/textos-de-ayuda'
import { cn } from '@/lib/utils'

/**
 * El `?` que explica una cifra, un campo o una zona de la pantalla.
 *
 * ── Qué cubre, y qué ya estaba cubierto ─────────────────────────────────────
 *
 * `Tooltip` explica un CONTROL: el lápiz es editar, el ojo es ver el
 * expediente. Eso ya estaba, con su hoja desde abajo en el móvil, su
 * `aria-describedby` y su cierre con Escape.
 *
 * Esto explica lo que NO es un control: «Saldo Pendiente», «Interés por
 * Mora», «Días de Atraso», «Tipo de Castigo». Son rótulos y cifras, no
 * botones, así que no hay nada a lo que pasarle el ratón. El `?` se pone al
 * lado del rótulo y dice qué es esa cifra, de dónde sale y —cuando importa—
 * qué NO incluye, que es lo que normalmente se malinterpreta.
 *
 * ── Lo que cambió ───────────────────────────────────────────────────────────
 *
 * El componente ya existía y se usaba en cuatro sitios, con el texto escrito
 * donde se usa. Medido: 94 rótulos del sistema nombran un concepto del
 * negocio y 86 no tenían ninguna explicación.
 *
 * Tres cosas que le faltaban para poder ponerlo en los 86:
 *
 *  - **El texto sale de un diccionario.** `lib/ayudas/textos-de-ayuda.ts`. El
 *    mismo concepto aparece en varias pantallas, y bifurcado por rol aparece
 *    dos y tres veces: «saldo pendiente» está en 17 sitios. Escrito en cada
 *    uno se desincroniza igual que se desincronizaron la fórmula del crédito
 *    —cinco copias, todas distintas— y la lista de plazos. Y aquí importa más:
 *    estos textos dicen qué significa una cifra de DINERO; si en una pantalla
 *    se explica «el total que debe» y en otra «el capital que falta», una de
 *    las dos miente sobre el mismo número. `texto` sigue estando para lo que
 *    es de una sola pantalla.
 *
 *  - **Se abre al pulsar.** Un `?` está ahí justamente para que lo pulsen.
 *    `Tooltip` usa un toque largo de 400 ms, que es lo correcto cuando la
 *    ayuda acompaña a un botón que hace otra cosa; en un `?` se siente como
 *    que no responde.
 *
 *  - **Se puede acertar con el pulgar.** El icono mide 20 px y va pegado a un
 *    rótulo. El área pulsable llega a 44 px con un pseudo-elemento, sin
 *    empujar la maquetación del rótulo.
 *
 * Y el nombre que oye un lector de pantalla pasa a decir DE QUÉ es la ayuda:
 * con ocho «más información» en la misma pantalla, no se distingue ninguna.
 *
 * El dibujo lo sigue haciendo `Tooltip`: en el móvil sale como hoja desde
 * abajo, con su barra de arrastre y respetando el área segura del teléfono,
 * igual que los demás diálogos del sistema.
 */

type Props = {
  /** La explicación, del diccionario compartido. */
  ayuda?: ClaveDeAyuda
  /** Una explicación propia de esta pantalla, que no es un concepto común. */
  texto?: string
  /**
   * De qué es la ayuda, para el lector de pantalla: «el saldo pendiente».
   * Se lee como «Qué es el saldo pendiente».
   */
  de?: string
  /** `pequeno` para rótulos de 10 u 11 px. */
  tamano?: 'pequeno' | 'normal'
  className?: string
}

export default function AyudaContextual({
  ayuda,
  texto,
  de,
  tamano = 'normal',
  className,
}: Props) {
  const explicacion = ayuda ? TEXTOS_DE_AYUDA[ayuda] : texto
  if (!explicacion) return null

  return (
    <Tooltip texto={explicacion} abrirAlPulsar lado="abajo">
      <button
        type="button"
        aria-label={de ? `Qué es ${de}` : 'Más información'}
        className={cn(
          // `align-middle` y el margen porque casi siempre va justo detrás de
          // un rótulo, dentro del mismo párrafo.
          'relative ml-1 inline-flex shrink-0 items-center justify-center rounded-full align-middle',
          'text-slate-400 transition-colors duration-150 ease-out',
          'hover:bg-slate-100 hover:text-primary',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
          'motion-reduce:transition-none',
          // El área pulsable, 44 px, sin empujar el rótulo de al lado.
          "after:absolute after:left-1/2 after:top-1/2 after:h-11 after:w-11 after:-translate-x-1/2 after:-translate-y-1/2 after:content-['']",
          tamano === 'pequeno' ? 'h-4 w-4' : 'h-5 w-5',
          className,
        )}
      >
        <CircleHelp
          className={tamano === 'pequeno' ? 'h-3 w-3' : 'h-3.5 w-3.5'}
          aria-hidden="true"
        />
      </button>
    </Tooltip>
  )
}
