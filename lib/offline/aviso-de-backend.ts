/**
 * Cuándo decir que el servidor no responde.
 *
 * ── Lo que pasaba ───────────────────────────────────────────────────────────
 *
 * Lo reportó el dueño: la cápsula de arriba decía «Servidor no disponible —
 * Tienes conexión, pero el servidor no respondió» con el sistema funcionando
 * y cero operaciones en cola.
 *
 * Y no mentía del todo: un solo `GET /health` que tardara más de 4 segundos
 * ya lo disparaba. En Render, con el servicio dormido, el primer golpe tarda
 * de sobra; en un móvil cambiando de antena, un chequeo perdido es lo normal.
 * O sea que la alarma saltaba por lo que NO es una caída.
 *
 * Avisar de algo que se arregla solo en treinta segundos es peor que no
 * avisar: quien lo lee aprende a ignorar la cápsula, y el día que el servidor
 * se caiga de verdad no va a mirarla.
 *
 * ── La regla ────────────────────────────────────────────────────────────────
 *
 * Asimétrica a propósito: **lenta para alarmar, inmediata para recuperarse**.
 * Hacen falta dos fallos seguidos —con el sondeo de 30 s, cerca de un minuto
 * sin respuesta— para encender el aviso, y basta UN acierto para apagarlo.
 *
 * Lo que esto NO toca: la cola. Una petición que falla se encola igual, mire
 * lo que mire la cápsula. Esto decide solo lo que se le dice a la persona,
 * así que equivocarse hacia «todo bien» no pierde ni un peso; equivocarse
 * hacia «está caído» entrena a ignorar el aviso.
 */

/** Dos fallos seguidos ≈ un minuto sin respuesta, con el sondeo de 30 s. */
export const FALLOS_SEGUIDOS_PARA_AVISAR = 2

export type CuentaDeChequeos = {
  /** Fallos encadenados hasta ahora. */
  fallos: number
  /** Lo que la cápsula debe mostrar: `true` es «el servidor responde». */
  disponible: boolean
}

/**
 * Pasar un chequeo por la regla.
 *
 * Devuelve lo que hay que MOSTRAR, no lo que acaba de pasar.
 */
export function anotarChequeo(
  fallosPrevios: number,
  respondio: boolean,
  umbral: number = FALLOS_SEGUIDOS_PARA_AVISAR,
): CuentaDeChequeos {
  if (respondio) {
    // Un acierto limpia la cuenta: recuperarse es inmediato.
    return { fallos: 0, disponible: true }
  }
  const fallos = fallosPrevios + 1
  return { fallos, disponible: fallos < umbral }
}
