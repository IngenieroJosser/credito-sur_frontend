import type { PeriodoRuta } from '@/lib/types/cobranza'

/**
 * El filtro de periodo de una ruta, en un solo sitio.
 *
 * ── Lo que pasaba ───────────────────────────────────────────────────────────
 *
 * Las mismas cinco opciones —Todo, Día, Semanal, Quincenal, Mensual— estaban
 * escritas CUATRO veces, una por cada pantalla que mira una ruta:
 *
 *     app/admin/rutas/[id]/ruta-client.tsx
 *     app/coordinador/rutas/[id]/page.tsx
 *     components/dashboards/SupervisorCobroView.tsx
 *     components/dashboards/VistaCobrador.tsx
 *
 * Y con ellas, cuatro veces el mismo `useState<'TODOS' | 'DIA' | ...>` escrito
 * a mano en vez de la unión `PeriodoRuta` que ya existe en
 * `lib/types/cobranza.ts`, y cuatro veces el color primario como hex
 * (`#08557f`) en vez del token.
 *
 * Son las mismas cuatro pantallas bifurcadas por rol que obligan a hacer cada
 * arreglo dos o tres veces. Aquí al menos la lista de periodos es una.
 */

/** El valor del filtro: un periodo, o todos. */
export type PeriodoDeFiltro = PeriodoRuta | 'TODOS'

export const PERIODO_POR_DEFECTO: PeriodoDeFiltro = 'TODOS'

/**
 * Las opciones tal como las pide `GrupoDeFiltros`.
 *
 * El orden es el de siempre: primero «Todo» y después de más corto a más
 * largo, que es como se lee un periodo.
 */
export const OPCIONES_DE_PERIODO: Array<{ id: PeriodoDeFiltro; label: string }> = [
  { id: 'TODOS', label: 'Todo' },
  { id: 'DIA', label: 'Día' },
  { id: 'SEMANA', label: 'Semanal' },
  { id: 'QUINCENA', label: 'Quincenal' },
  { id: 'MES', label: 'Mensual' },
]

/**
 * Lo que llega del grupo de filtros es un `string`; esto lo devuelve a la
 * unión sin inventarse valores.
 *
 * Un `as PeriodoDeFiltro` en cada una de las cuatro pantallas habría hecho lo
 * mismo a la vista y nada en realidad: si mañana se añade una opción con otro
 * id, el `as` se lo tragaría y aquí se cae al valor por defecto, que es lo que
 * la pantalla sabe pintar.
 */
export function aPeriodoDeFiltro(valor: string): PeriodoDeFiltro {
  const encontrado = OPCIONES_DE_PERIODO.find((o) => o.id === valor)
  return encontrado ? encontrado.id : PERIODO_POR_DEFECTO
}
