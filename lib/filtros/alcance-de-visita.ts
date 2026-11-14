/**
 * Qué visitas de una ruta se enseñan: el otro filtro, el que no se veía.
 *
 * ── Lo que pasaba ───────────────────────────────────────────────────────────
 *
 * Las tres pantallas que trabajan la ruta de un cobrador —la del cobrador, la
 * del supervisor y la del coordinador— decidían con TRES reglas distintas a qué
 * clientes enseñaba cada una, y ninguna lo decía en pantalla:
 *
 *   cobrador      isVisitaExigibleHoy(v, hoy)
 *   supervisor    Number(v.montoCuota) > 0 || isTodayOrMora(v.proximaVisita)
 *   coordinador   isTodayOrMora(v.proximaVisita)
 *
 * `isVisitaExigibleHoy` es la regla compartida y la más estricta: deja fuera lo
 * ya gestionado hoy, lo revertido o rechazado, lo que no tiene saldo y lo que
 * ya se cobró en esta pasada. `isTodayOrMora` solo pregunta por la fecha.
 *
 * ── Por qué importa más de lo que parecía ───────────────────────────────────
 *
 * Las tres son pantallas de TRABAJO, no de consulta. El supervisor y el
 * coordinador registran pagos desde ahí (`pagosService.registrarPago`), y el
 * supervisor además lo hace contra su propia caja —`SupervisorCobroView` lo
 * resuelve así de forma explícita, y `cajas.service.ts` le reconoce la caja de
 * la ruta que supervisa—. O sea que sale a cobrar a las rutas que lleva.
 *
 * Entonces no eran tres vistas del mismo trabajo con distinto detalle: eran dos
 * personas que pueden cobrar en la misma ruta el mismo día viendo dos listas
 * distintas de clientes, sin que ninguna de las dos pudiera saber en qué se
 * diferenciaban.
 *
 * ── Por qué un filtro y no «la regla buena» ─────────────────────────────────
 *
 * Unificar sin más con la regla estricta escondía lo que ya se atendió hoy, y
 * eso hace falta: para el seguimiento del supervisor (`credisur.md`) y para que
 * quien llega a una ruta ya empezada vea lo que se hizo. Dejar la regla ancha
 * escondía lo contrario: que la lista no es la de quien está cobrando.
 *
 * Así que la diferencia pasa a ser una decisión visible, con su botón, y el
 * valor por defecto es el trabajo del día: lo que queda por cobrar. Es lo mismo
 * que ve el cobrador en su pantalla, y lo demás está a un toque y con su
 * nombre, así que no esconde a nadie.
 *
 * La pantalla del cobrador NO lleva este filtro, y es a propósito: volver a
 * enseñarle un cliente que ya pagó hoy lo manda a cobrarle dos veces, que es
 * justo lo que `isVisitaExigibleHoy` quita.
 */

/** Qué parte de la jornada se enseña. */
export type AlcanceDeVisita = 'PENDIENTES' | 'ATENDIDAS' | 'TODAS'

/**
 * Por defecto, lo que queda por cobrar hoy.
 *
 * Es la misma lista que tiene delante el cobrador de la ruta; lo demás está a
 * un toque y con su nombre.
 */
export const ALCANCE_POR_DEFECTO: AlcanceDeVisita = 'PENDIENTES'

export const OPCIONES_DE_ALCANCE: Array<{ id: AlcanceDeVisita; label: string }> = [
  { id: 'PENDIENTES', label: 'Por cobrar hoy' },
  { id: 'ATENDIDAS', label: 'Ya atendidas hoy' },
  // «Todas» dice de qué: incluye las de fecha futura, que es justo lo que la
  // regla ancha del supervisor enseñaba sin decirlo.
  { id: 'TODAS', label: 'Toda la ruta' },
]

/**
 * Lo que llega de `GrupoDeFiltros` es un `string`; esto lo devuelve a la unión
 * sin inventarse valores, igual que `aPeriodoDeFiltro`.
 */
export function aAlcanceDeVisita(valor: string): AlcanceDeVisita {
  const encontrado = OPCIONES_DE_ALCANCE.find((o) => o.id === valor)
  return encontrado ? encontrado.id : ALCANCE_POR_DEFECTO
}
