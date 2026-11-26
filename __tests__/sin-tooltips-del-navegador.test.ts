import fs from 'fs'
import path from 'path'

/**
 * Ninguna pantalla usa el tooltip amarillo del navegador.
 *
 * ── Lo que se veía ────────────────────────────────────────────────────────────
 *
 * Lo describió el dueño: «al dejar el cursor sobre el desactivar sale
 * desactivar pero con el estilo por defecto de Google, cosa que no pasa al
 * hacer lo mismo con el ver detalle». Exacto, y era peor de lo que parece: en
 * la MISMA fila del listado de usuarios convivían los dos. Cuatro botones
 * usaban el `Tooltip` del sistema y el de al lado el `title` nativo, así que
 * al recorrer la fila con el ratón cambiaban la fuente, el color y el retardo
 * de una casilla a la siguiente.
 *
 * Había 32 repartidos por 20 archivos. El propio componente `Tooltip` ya
 * explica por qué el `title` no sirve de sustituto: tarda un segundo largo en
 * salir, no se ve con el dedo —y el cobrador trabaja en el móvil— y no se
 * puede leer con el teclado.
 *
 * ── Lo que mide ───────────────────────────────────────────────────────────────
 *
 * Solo el `title` sobre una etiqueta HTML. `<Modal title="...">` es una PROP
 * de un componente React, no un tooltip, y hay varias: contarlas haría que
 * esta prueba pidiera cambios que no arreglan nada. La diferencia es la
 * mayúscula inicial de la etiqueta.
 *
 * Lee la apertura de la etiqueta contando llaves, no con una regex hasta el
 * primer `>`: un `onClick={() => f()}` lleva un `>` dentro y cortaría ahí,
 * dejando props sin mirar. Es la lección de la centinela que pasaba por no
 * mirar, pagada ya una vez aquí.
 *
 * Comprobada al revés: devolviendo un `title` a cualquier etiqueta, falla
 * nombrando archivo y línea.
 */
const RAIZ = process.cwd()
const CARPETAS = ['app', 'components']

/** El dueño del tooltip del sistema; dentro sí se nombra el atributo. */
const EXCEPCIONES = new Set(['components/ui/Tooltip.tsx'])

/** Una etiqueta HTML empieza en minúscula; un componente React, en mayúscula. */
const APERTURA = /<([a-z][a-zA-Z0-9-]*)\b/g

/** Dónde acaba la apertura de la etiqueta, saltándose las llaves de JSX. */
function finDeApertura(fuente: string, desde: number): number {
  let profundidad = 0
  for (let i = desde; i < fuente.length; i += 1) {
    const c = fuente[i]
    if (c === '{') profundidad += 1
    else if (c === '}') profundidad -= 1
    else if (c === '>' && profundidad === 0) return i
  }
  return -1
}

function archivos(): string[] {
  const salida: string[] = []
  const recorrer = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const completo = path.join(dir, e.name)
      if (e.isDirectory()) {
        if (e.name === 'node_modules' || e.name === '.next') continue
        recorrer(completo)
        continue
      }
      if (e.name.endsWith('.tsx')) {
        salida.push(path.relative(RAIZ, completo).split(path.sep).join('/'))
      }
    }
  }
  for (const c of CARPETAS) recorrer(path.join(RAIZ, c))
  return salida
}

const barrido = (() => {
  const nativos: string[] = []
  let etiquetasVistas = 0

  for (const rel of archivos()) {
    if (EXCEPCIONES.has(rel)) continue
    const fuente = fs.readFileSync(path.join(RAIZ, rel), 'utf8')
    for (const m of fuente.matchAll(APERTURA)) {
      const fin = finDeApertura(fuente, m.index! + m[0].length)
      if (fin < 0) continue
      etiquetasVistas += 1
      const props = fuente.slice(m.index! + m[0].length, fin)
      if (!/(^|\s)title\s*=/.test(props)) continue
      const linea = fuente.slice(0, m.index).split('\n').length
      nativos.push(`${rel}:${linea}  <${m[1]}>`)
    }
  }
  return { nativos, etiquetasVistas }
})()

describe('ningún control explica nada con el tooltip del navegador', () => {
  it('el barrido ve las etiquetas del frontend', () => {
    /*
     * Piso medido: hay más de veinte mil aperturas de etiqueta. Sin esto, un
     * fallo del recorrido dejaría la lista vacía y la prueba de abajo pasaría
     * sin haber abierto un archivo.
     */
    expect(barrido.etiquetasVistas).toBeGreaterThanOrEqual(5000)
  })

  it('ninguna etiqueta HTML usa el atributo `title`', () => {
    /*
     * Si esto falla con una línea tuya: envuelve el elemento en
     * `<Tooltip texto="…">`. Funciona con el dedo, se lee con el teclado y no
     * lo recorta el `overflow-hidden` de la tarjeta que lo contenga.
     */
    expect(barrido.nativos).toEqual([])
  })
})
