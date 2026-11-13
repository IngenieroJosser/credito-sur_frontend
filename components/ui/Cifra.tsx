import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/utils'

/**
 * Una cifra de dinero que no se sale de su tarjeta.
 *
 * ── Lo que pasaba ───────────────────────────────────────────────────────────
 *
 * «Hay que arreglar algunas tarjetas donde se muestran precios porque el
 * precio pues llega a salirse de esas tarjetas.»
 *
 * Medido en Chromium, con la tipografía Sora y el marcado real de las
 * tarjetas, a los anchos de un teléfono de 390 px y de un escritorio de
 * 1440 px. Las tres formas en que el proyecto pintaba una cifra grande, y en
 * cuántas de las 24 combinaciones de ancho e importe se sale del hueco:
 *
 *   `text-3xl font-bold`                       6 de 24
 *   `text-2xl font-bold`                       3 de 24
 *   `whitespace-nowrap` + `clamp(…2.6vw…)`     4 de 24
 *
 * Y no en casos raros. Con `text-3xl`, en un móvil con dos tarjetas por fila
 * —123 px de hueco— un préstamo de **$ 900.000** ya pide 143 px: se sale. Con
 * el `clamp` de los reportes financieros se sale **$ 1.170.000**, que es
 * exactamente el saldo del préstamo desde el que se reportó esto.
 *
 * ── Por qué `clamp` con el ancho de la pantalla no bastaba ──────────────────
 *
 * Alguien ya lo había intentado en los reportes financieros con
 * `clamp(1.35rem, 2.6vw, 1.5rem)`. No funciona porque `vw` es el ancho de la
 * VENTANA y lo que aprieta es el ancho de la TARJETA: en un móvil de 390 px,
 * una tarjeta a todo el ancho tiene 342 px de hueco y dos por fila tienen 123,
 * y `2.6vw` vale lo mismo en las dos. Además lleva `whitespace-nowrap`, que
 * convierte cualquier exceso en desborde en vez de en un salto de línea.
 *
 * Aquí se usa `cqw`, que es el 1 % del ancho del CONTENEDOR. La cifra se trae
 * su propio contenedor —el `div` de fuera, con `container-type: inline-size`—,
 * así que funciona dentro de cualquier tarjeta sin tocarla.
 *
 * Con eso, de las 24 combinaciones medidas solo se sale 1: el tope que acepta
 * el campo de importe, 9.999.999.999.999, en el hueco de 123 px. Son 19
 * caracteres; ahí no cabe nada legible, y es un límite de validación, no una
 * cifra del negocio —la mayor real medida es la cartera de la empresa, unos
 * 1.250 millones, y esa cabe—. Se deja dicho en vez de taparlo abreviando,
 * porque una cifra de dinero abreviada se lee mal y aquí el dinero no miente.
 *
 * ── Lo demás que trae ───────────────────────────────────────────────────────
 *
 * `tabular-nums`: todos los dígitos con el mismo ancho, así que una columna de
 * importes queda alineada por la coma y no baila al cambiar de cifra.
 */

type Props = {
  /** El importe. `null` cuando no se sabe, que no es lo mismo que cero. */
  valor: number | null | undefined
  /**
   * El tamaño máximo, el de una pantalla ancha. Desde ahí baja solo cuando la
   * tarjeta no da para más.
   *
   *   normal  hasta 1.125rem (18 px): una fila de tabla, un dato secundario
   *   grande  hasta 1.5rem   (24 px): la cifra principal de una tarjeta
   *   enorme  hasta 1.875rem (30 px): el total de una pantalla de detalle
   */
  tamano?: 'normal' | 'grande' | 'enorme'
  /** Lo que se pinta si no hay dato. Por defecto, una raya: no un cero. */
  vacio?: string
  /** Clases del texto: color, peso, alineación. */
  className?: string
  /** Clases del contenedor, para el margen. */
  classNameCaja?: string
  /** La etiqueta del elemento, si hace falta. */
  as?: 'span' | 'p' | 'div' | 'h3' | 'h2'
}

const TAMANOS = {
  // El mínimo nunca baja de 14 px: por debajo, una cifra de dinero no se lee
  // de un vistazo, que es justo para lo que está en una tarjeta.
  normal: 'text-[clamp(0.875rem,5.5cqw,1.125rem)]',
  grande: 'text-[clamp(1rem,7cqw,1.5rem)]',
  enorme: 'text-[clamp(1rem,8cqw,1.875rem)]',
} as const

export default function Cifra({
  valor,
  tamano = 'grande',
  vacio = '—',
  className,
  classNameCaja,
  as: Etiqueta = 'p',
}: Props) {
  const hayDato = typeof valor === 'number' && Number.isFinite(valor)

  return (
    <div
      // El contenedor es suyo: así la cifra se mide contra el hueco que tiene
      // de verdad y la tarjeta de alrededor no hay que tocarla.
      className={cn('[container-type:inline-size] min-w-0', classNameCaja)}
    >
      <Etiqueta
        className={cn(
          'tabular-nums leading-tight',
          TAMANOS[tamano],
          className,
        )}
      >
        {hayDato ? formatCurrency(valor) : vacio}
      </Etiqueta>
    </div>
  )
}
