'use client'

import { cn } from '@/lib/utils'

/**
 * La tira de filtros de una pantalla, con su buscador.
 *
 * ── Lo que pasaba ───────────────────────────────────────────────────────────
 *
 * Lo describió el dueño con una captura del listado de clientes: una fila que
 * decía «ESTADO · Todos · Pendientes · Al día · Leve · Precaución · Moderado ·
 * Crítico · Lista Negra · Todas», con DOS pastillas oscuras. Ese último
 * «Todas» era del filtro de RUTA, no de Estado, pero al ir sin rótulo se leía
 * como una novena opción de estado.
 *
 * El rótulo se arregló en `GrupoDeFiltros` y en `FiltroRuta`. Lo que quedaba
 * era la COLOCACIÓN, y eso se repetía a mano en pantalla tras pantalla:
 *
 *   - los grupos metidos todos en un mismo `flex-wrap`, así que la fila se
 *     partía por donde le tocara y dejaba una opción huérfana en la línea de
 *     abajo, antes de que empezara el grupo siguiente;
 *   - un separador vertical entre grupos que, al envolver, quedaba de marca
 *     suelta al principio de la línea;
 *   - el buscador al lado, robándoles el ancho justo donde no sobra.
 *
 * ── Lo que la regla dice, medido ────────────────────────────────────────────
 *
 * En el navegador, en `/admin/clientes`: el grupo de Estado pide **713 px** y,
 * con el buscador al lado, tenía **627 a 1280** de ancho y **687 a 1366**. O
 * sea que se partía en cualquier portátil; entra a partir de 1440. Por eso:
 *
 *   1. **Cada grupo, su propia línea.** Así los ocho chips de Estado tienen
 *      todo el ancho y Ruta empieza siempre limpia.
 *   2. **Sin separadores.** Dos grupos en líneas distintas, cada uno con su
 *      nombre, ya están separados; un filete entre medias solo estorba.
 *   3. **El buscador comparte fila solo cuando cabe**, de `2xl` (1536) para
 *      arriba. Por debajo baja a su propia fila, con tope de ancho: suelto se
 *      iba a 1.086 px, y un campo de búsqueda de un metro no se lee mejor.
 *
 * Con eso la altura del grupo pasó de 49-85 px —dos y tres líneas— a 31 px en
 * todos los anchos probados.
 *
 * ── Por qué es un componente y no unas clases que copiar ────────────────────
 *
 * Porque copiarlas en dieciocho pantallas es exactamente la deuda que esto
 * viene a quitar: la regla volvería a divergir en cuanto alguien tocara una.
 * Aquí vive una vez, y `__tests__/los-filtros-caben-en-su-linea.test.ts`
 * comprueba que ninguna pantalla se la salte.
 */
export default function BarraDeFiltros({
  children,
  buscador,
  className,
}: {
  /** Los grupos de filtros. Cada uno va en su propia línea. */
  children: React.ReactNode
  /** El campo de búsqueda, si la pantalla tiene. */
  buscador?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)]',
        'sm:bg-white/80 sm:backdrop-blur-sm',
        buscador && '2xl:flex-row 2xl:items-center 2xl:justify-between',
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-2">{children}</div>

      {buscador && (
        <div className="relative w-full max-w-xl 2xl:w-80 2xl:max-w-none">
          {buscador}
        </div>
      )}
    </div>
  )
}
