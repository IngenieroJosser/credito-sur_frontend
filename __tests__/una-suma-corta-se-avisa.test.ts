import fs from 'fs'
import path from 'path'
import {
  avisoDeCifraIncompleta,
  faltanFilas,
} from '@/lib/contable/cifras-completas'
import { sinComentarios } from '@/lib/testing/sin-comentarios'

/**
 * Una suma hecha sobre una respuesta truncada no puede presentarse entera.
 *
 * ── El riesgo, medido ──────────────────────────────────────────────────────
 *
 * La pantalla contable calcula varias cifras de dinero sumando **en el
 * navegador** lo que devuelve una petición con `limit`:
 *
 *   - el saldo previo y el total del rango de una caja, sobre
 *     `getMovimientosLedger({ limit: 5000 })`;
 *   - los ingresos y egresos del día, sobre
 *     `getTransacciones({ limit: 500 })`.
 *
 * Si hay más filas que el tope, la suma sale **corta y sin decirlo**. Medido
 * contra la base de desarrollo:
 *
 *     asientos del libro de la caja más activa:   301  de 5.000   (lejos)
 *     transacciones de una caja en un día:        219  de   500   (44 %)
 *
 * El segundo crece con el número de cobradores, así que es cuestión de
 * tiempo. Y es la misma clase de fallo que el `take: 500` del tablero, que
 * decía 500 cuentas en mora habiendo 3.000: no falla, miente.
 *
 * ── Lo que se hizo, y lo que NO ───────────────────────────────────────────
 *
 * Lo correcto a futuro es que esas cifras las sume el servidor en SQL, sin
 * traer filas. **No se hizo esta vez**, y el motivo está escrito: el cálculo
 * tiene tres ramas distintas —rutas, cajas normales, y una con `omitRefs`
 * para la caja principal y la de banco—, y replicarlas en el servidor con
 * fidelidad no es un cambio pequeño. Hacerlo mal mostraría cifras equivocadas,
 * que es peor que la de hoy, correcta siempre que no se pase del tope.
 *
 * Lo que sí se quitó es el silencio: `meta.total` dice cuántas filas hay de
 * verdad, así que la truncación se detecta exacta y se avisa.
 */
describe('se detecta cuando la suma se quedó corta', () => {
  it('no avisa cuando llegaron todas', () => {
    const completa = { data: [1, 2, 3], meta: { total: 3 } }
    expect(faltanFilas(completa)).toBe(false)
    expect(avisoDeCifraIncompleta(completa)).toBeNull()
  })

  it('avisa cuando el total es mayor que lo traído', () => {
    const corta = { data: new Array(500).fill(0), meta: { total: 731 } }
    expect(faltanFilas(corta)).toBe(true)
    const aviso = avisoDeCifraIncompleta(corta)
    expect(aviso).toContain('500')
    expect(aviso).toContain('731')
  })

  it('dice los dos números, no un «puede estar incompleto»', () => {
    /*
     * «Se sumaron 500 de 731» es accionable —se acota el rango y se ve
     * entera—; «puede estar incompleto» no lo es.
     */
    const aviso = avisoDeCifraIncompleta({
      data: new Array(500).fill(0),
      meta: { total: 731 },
    })
    expect(aviso).toMatch(/acota el rango/i)
  })

  it('no afirma nada cuando el servidor no manda `meta.total`', () => {
    /*
     * Sin el dato no se puede saber si falta algo, y avisar «por si acaso»
     * sería la otra cara del mismo problema: un aviso que sale siempre deja
     * de leerse.
     */
    expect(faltanFilas({ data: [1, 2] })).toBe(false)
    expect(faltanFilas({ data: [1, 2], meta: { total: 0 } })).toBe(false)
    expect(faltanFilas(null)).toBe(false)
    expect(faltanFilas(undefined)).toBe(false)
  })

  it('una respuesta vacía con total > 0 también cuenta como corta', () => {
    // Pasa cuando la petición falla a medias y la suma daría 0: un cero que
    // no es un hueco.
    expect(faltanFilas({ data: [], meta: { total: 12 } })).toBe(true)
  })
})

describe('la pantalla contable lo muestra', () => {
  const FUENTE = sinComentarios(
    fs.readFileSync(
      path.join(process.cwd(), 'app', 'admin', 'contable', 'page.tsx'),
      'utf8',
    ),
  )

  it('comprueba la truncación en los tres sitios que suman dinero', () => {
    // Piso: si el archivo no se leyera, lo de abajo pasaría en vacío.
    expect(FUENTE.length).toBeGreaterThan(50_000)
    const veces = FUENTE.split('avisoDeCifraIncompleta(').length - 1
    // Tres llamadas: el libro del rango y las dos ramas de transacciones del
    // día. (La importación no cuenta porque se mira el nombre con paréntesis.)
    expect(veces).toBeGreaterThanOrEqual(3)
  })

  it('y pinta el aviso junto a las cifras, no en otro sitio', () => {
    const i = FUENTE.indexOf('Saldo Actual')
    expect(i).toBeGreaterThan(0)
    const bloque = FUENTE.slice(i, i + 1600)
    expect(bloque.length).toBeGreaterThan(900)
    expect(bloque).toMatch(/cifraIncompleta/)
  })

  it('se limpia al abrir otra caja', () => {
    // Sin esto, el aviso de una caja se quedaría colgado sobre las cifras de
    // la siguiente.
    expect(FUENTE).toMatch(/setCifraIncompleta\(null\)/)
  })
})
