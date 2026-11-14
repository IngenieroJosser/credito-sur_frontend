/**
 * Qué visitas de una ruta se enseñan: el otro filtro, el que no se veía.
 *
 * ── Lo que pasaba ───────────────────────────────────────────────────────────
 *
 * Las tres pantallas que miran la ruta de un cobrador —la del cobrador, la del
 * supervisor y la del coordinador— decidían con TRES reglas distintas a qué
 * clientes enseñaba cada una, y ninguna lo decía en pantalla:
 *
 *   cobrador      isVisitaExigibleHoy(v, hoy)
 *   supervisor    Number(v.montoCuota) > 0 || isTodayOrMora(v.proximaVisita)
 *   coordinador   isTodayOrMora(v.proximaVisita)
 *
 * `isVisitaExigibleHoy` es la regla compartida y la más estricta: deja fuera
 * lo ya gestionado hoy, lo revertido o rechazado, lo que no tiene saldo y lo
 * que ya se cobró en esta pasada. `isTodayOrMora` solo pregunta por la fecha.
 *
 * Así que el supervisor y el coordinador veían clientes que el cobrador no
 * tenía en su lista —unos porque ya estaban cobrados, otros porque su fecha es
 * futura y solo tenían cuota—, y la diferencia no estaba escrita en ningún
 * sitio: era el resultado de que cada pantalla se escribió aparte.
 *
 * ── Por qué un filtro y no «la regla buena» ─────────────────────────────────
 *
 * Unificar sin más, con la regla del cobrador, escondía trabajo que el
 * supervisor SÍ tiene que ver: su responsabilidad es seguimiento y reportes
 * (`credisur.md`), y para eso necesita ver lo que ya se atendió hoy. Dejar la
 * regla ancha para él escondía lo contrario: que su lista no es la lista del
 * cobrador.
 *
 * Entonces la diferencia pasa a ser una decisión visible, con su botón, y el
 * valor por defecto es la lista del cobrador: lo que ve el supervisor al
 * entrar es lo que su cobrador tiene delante.
 *
 * La pantalla del cobrador NO lleva este filtro, y es a propósito: volver a
 * enseñarle un cliente que ya pagó hoy lo manda a cobrarle dos veces, que es
 * justo lo que `isVisitaExigibleHoy` quita.
 */

/** Qué parte de la jornada se enseña. */
export type AlcanceDeVisita = 'PENDIENTES' | 'ATENDIDAS' | 'TODAS'

/**
 * Por defecto, la lista del cobrador.
 *
 * Quien supervisa entra viendo lo mismo que tiene delante quien cobra; lo
 * demás está a un toque y con su nombre.
 */
export const ALCANCE_POR_DEFECTO: AlcanceDeVisita = 'PENDIENTES'

export const OPCIONES_DE_ALCANCE: Array<{ id: AlcanceDeVisita; label: string }> = [
  { id: 'PENDIENTES', label: 'Por cobrar hoy' },
  { id: 'ATENDIDAS', label: 'Ya atendidas hoy' },
  { id: 'TODAS', label: 'Todas' },
]

/**
 * Lo que llega de `GrupoDeFiltros` es un `string`; esto lo devuelve a la unión
 * sin inventarse valores, igual que `aPeriodoDeFiltro`.
 */
export function aAlcanceDeVisita(valor: string): AlcanceDeVisita {
  const encontrado = OPCIONES_DE_ALCANCE.find((o) => o.id === valor)
  return encontrado ? encontrado.id : ALCANCE_POR_DEFECTO
}
