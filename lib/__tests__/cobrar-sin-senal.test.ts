import * as fs from 'fs'
import * as path from 'path'

/**
 * Que el cobrador pueda cobrar en un arranque EN FRÍO sin señal.
 *
 * ── Lo que pasaba ───────────────────────────────────────────────────────────
 *
 * `VistaCobrador` reconstruye las visitas desde la copia de IndexedDB cuando no
 * hay red. Calculaba `proximaCuota` para sacar el monto, el estado y la fecha…
 * y no la devolvía en el objeto de la visita.
 *
 * Al cobrar, `resolveCuotaIdLocal` busca `cuotaId`, `cuotaObjetivoId`,
 * `cuotaObjetivo.id`, `proximaCuota.id` y `cuotaObjetivoPrestamoId`. No
 * encontraba ninguno de los cinco, devolvía cadena vacía, y la guarda del
 * registro de pago cortaba con:
 *
 *     «Cuota no identificada. Recarga la ruta e inténtalo de nuevo.»
 *
 * Un consejo imposible de seguir en la calle sin red. El cobrador no podía
 * cobrar, que es su único trabajo.
 *
 * Solo ocurría en arranque en frío: si la ruta se había cargado antes CON
 * señal, las visitas venían del servidor y sí traían la cuota. Por eso no lo
 * veía ninguna prueba: todas entran con red.
 *
 * ── El límite de la medición, dicho explícitamente ──────────────────────────
 *
 * Esto lee el código, no lo ejecuta: comprueba que la visita que se arma desde
 * la copia local incluye el campo. No prueba que el valor sea el correcto —eso
 * pide un navegador sin red, y está descrito en el plan como comprobación
 * manual—. Pero sí atrapa la regresión concreta que ocurrió: que el campo
 * desaparezca del objeto.
 */

const RAIZ = path.join(__dirname, '..', '..')
const VISTA = path.join(RAIZ, 'components', 'dashboards', 'VistaCobrador.tsx')

/** El bloque donde se arma la visita desde IndexedDB. */
function bloqueDeVisitaOffline(fuente: string): string {
  // Ancla estable: el id de estas visitas se marca con el prefijo `offline-`.
  const inicio = fuente.indexOf("id: `offline-${c.id}`")
  if (inicio === -1) return ''
  // Hasta el cierre del objeto, que es donde empieza `setVisitasBase`.
  const fin = fuente.indexOf('setVisitasBase', inicio)
  return fin === -1 ? fuente.slice(inicio) : fuente.slice(inicio, fin)
}

describe('el cobrador puede cobrar sin señal', () => {
  const fuente = fs.readFileSync(VISTA, 'utf8')

  it('la visita armada desde la copia local lleva su cuota', () => {
    const bloque = bloqueDeVisitaOffline(fuente)

    expect(bloque).not.toBe('')
    expect(bloque).toMatch(/cuotaId:/)
  })

  it('la cuota que se devuelve es la que se calculó, no una inventada', () => {
    // `proximaCuota` se calcula justo encima para el monto y el estado. Si
    // alguien pusiera ahí otra cosa —un id del cliente, una cadena fija— la
    // guarda pasaría pero el pago entraría contra la cuota equivocada, que es
    // peor que no cobrar.
    const bloque = bloqueDeVisitaOffline(fuente)

    expect(bloque).toMatch(/cuotaId:\s*proximaCuota\?\.id/)
  })

  it('la guarda que corta el cobro sigue existiendo', () => {
    // Si alguien la quitara para «arreglar» esto, el pago entraría sin cuota.
    // El arreglo es dar la cuota, no dejar de comprobarla.
    expect(fuente).toMatch(/Cuota no identificada/)
  })
})
