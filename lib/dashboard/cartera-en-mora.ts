/**
 * Lo que dice la tarjeta «Cartera en Mora» debajo del importe.
 *
 * ── Qué decía antes, y por qué no se entendía ──────────────────────────────
 *
 * El texto salía de esto, escrito dos veces en `app/admin/page.tsx`:
 *
 *     const moraPercent = capitalPrestado > 0 && moraMonto > 0
 *       ? ((moraMonto / capitalPrestado) * 100).toFixed(1)
 *       : moraCount > 0 ? '> 0' : '0'
 *     subValue: `${moraCount} cuentas · ${moraPercent}% del capital`
 *
 * Y producía cosas como **«4 cuentas · > 0% del capital»**, que fue lo que el
 * dueño señaló: no se entiende. Mirándolo de cerca había tres problemas, no
 * uno:
 *
 *  1. **El «> 0»** era la forma de decir «hay mora pero no puedo calcular el
 *     porcentaje». Dicho así parece una cifra, y no lo es.
 *  2. **El denominador estaba mal.** `capitalPrestado` va filtrado POR
 *     PERIODO y la mora es un estado ACTUAL. Medido con la base de carga: con
 *     «hoy» el capital del periodo es 0 —de ahí el «> 0%»— y con mes o año
 *     salía **115,5 %**, que como «porcentaje del capital» no significa nada.
 *     Ahora se mide contra la **cartera pendiente**, que no depende del
 *     periodo y de la que la mora es un subconjunto: nunca pasa de 100.
 *  3. **El importe venía de una lista recortada.** `moraMonto` se sumaba
 *     sobre `delinquentAccounts`, que el servidor limita a DIEZ filas,
 *     mientras el contador traía el total real. Con más de diez cuentas en
 *     mora, las dos cifras de la misma tarjeta no se correspondían. Ahora el
 *     servidor manda el importe sumado con la misma regla del conteo.
 *
 * ── La regla de siempre en este proyecto ──────────────────────────────────
 *
 * Si el porcentaje no se puede calcular, no se inventa uno: se dice el número
 * de cuentas y ya. Un dato que falta se omite; no se sustituye por un símbolo
 * que parece un dato.
 */
export function textoDeCarteraEnMora({
  cuentas,
  monto,
  carteraPendiente,
}: {
  /** Cuántas cuentas están en mora. */
  cuentas: number
  /** Cuánto suman, con la misma regla que el conteo. */
  monto: number
  /** La cartera pendiente completa, que es contra lo que se mide. */
  carteraPendiente: number
}): string {
  const n = Number(cuentas) || 0
  if (n <= 0) return 'Sin cuentas en mora'

  const etiquetaCuentas = n === 1 ? '1 cuenta' : `${n.toLocaleString('es-CO')} cuentas`

  const total = Number(carteraPendiente) || 0
  const enMora = Number(monto) || 0
  if (total <= 0 || enMora <= 0) {
    // No hay con qué comparar. Se dice lo que se sabe y nada más.
    return etiquetaCuentas
  }

  const porcentaje = (enMora / total) * 100
  const formateado = porcentaje.toLocaleString('es-CO', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })
  return `${etiquetaCuentas} · ${formateado}% de la cartera`
}
