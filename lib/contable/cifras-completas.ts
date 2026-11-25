/**
 * ¿La respuesta trajo TODAS las filas, o se quedó en el tope?
 *
 * ── Por qué hace falta ─────────────────────────────────────────────────────
 *
 * La pantalla contable calcula varias cifras de dinero sumando en el navegador
 * lo que devuelve una petición con `limit`. Si hay más filas que el tope, la
 * suma sale **incompleta y sin decirlo**: un saldo o unos ingresos menores de
 * los reales, con pinta de dato bueno.
 *
 * Es la misma clase de fallo que el `take: 500` del tablero, que decía 500
 * cuentas en mora habiendo 3.000. Medido aquí:
 *
 *   - asientos del libro por caja: **301** contra un tope de 5.000 (lejos);
 *   - transacciones de UNA caja en UN día: **219** contra un tope de 500
 *     —el 44%—, y eso crece con el número de cobradores.
 *
 * Lo correcto a futuro es que esas cifras las calcule el servidor con una
 * suma en SQL, sin traer filas. Mientras tanto, lo que no puede pasar es que
 * el número salga corto **en silencio**.
 *
 * `meta.total` dice cuántas filas hay de verdad, así que la comprobación es
 * exacta: si hay más de las que llegaron, la suma no las incluye.
 */
export type RespuestaConMeta = {
  data?: unknown[] | null
  meta?: { total?: number | null } | null
} | null | undefined

/** `true` cuando quedaron filas sin traer y por tanto la suma está corta. */
export function faltanFilas(respuesta: RespuestaConMeta): boolean {
  const traidas = Array.isArray(respuesta?.data) ? respuesta.data.length : 0
  const total = Number(respuesta?.meta?.total ?? 0)
  // Sin `meta.total` no se puede afirmar nada: no se avisa de lo que no se sabe.
  if (!Number.isFinite(total) || total <= 0) return false
  return total > traidas
}

/**
 * El aviso que se le enseña a la persona, o `null` si la cifra está completa.
 *
 * Dice los dos números a propósito: «se sumaron 500 de 731» es accionable
 * —se puede acotar el rango— y «puede estar incompleto» no lo es.
 */
export function avisoDeCifraIncompleta(
  respuesta: RespuestaConMeta,
): string | null {
  if (!faltanFilas(respuesta)) return null
  const traidas = Array.isArray(respuesta?.data) ? respuesta.data.length : 0
  const total = Number(respuesta?.meta?.total ?? 0)
  return (
    `Esta cifra está incompleta: se sumaron ${traidas.toLocaleString('es-CO')} ` +
    `de ${total.toLocaleString('es-CO')} movimientos. Acota el rango de fechas ` +
    `para verla completa.`
  )
}
