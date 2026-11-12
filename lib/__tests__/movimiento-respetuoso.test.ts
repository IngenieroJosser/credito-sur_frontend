import * as fs from 'fs'
import * as path from 'path'

/**
 * Que la interfaz responda al toque, y que se pueda apagar.
 *
 * ── Por qué ────────────────────────────────────────────────────────────────
 *
 * Medido: el proyecto tiene ~686 botones y solo 73 llevaban `active:scale`.
 * Nueve de cada diez no daban ninguna señal al pulsarlos. En escritorio se
 * disimula con el `hover:`; en el teléfono del cobrador NO HAY hover, así que
 * se toca y hasta que la pantalla cambia no pasa nada visible. Esa pausa es
 * justo donde la gente vuelve a pulsar.
 *
 * La respuesta al toque vive en `app/globals.css`, en una capa que aplica a
 * todos los elementos interactivos a la vez. Tocar 686 botones habría sido una
 * migración que se desincroniza con el primer botón nuevo.
 *
 * ── Lo que se exige ────────────────────────────────────────────────────────
 *
 * Que esa capa siga ahí, y sobre todo que siga siendo APAGABLE: moverse es
 * una cortesía, y para quien marcó «reducir movimiento» en su sistema —por
 * mareo, por migraña, por epilepsia fotosensible— es una preferencia médica,
 * no un gusto.
 */

const CSS = path.join(__dirname, '..', '..', 'app', 'globals.css')

describe('el movimiento de la interfaz', () => {
  const fuente = fs.readFileSync(CSS, 'utf8')

  it('los tiempos y la curva salen de un solo sitio', () => {
    // Si cada animación elige su propio tiempo, la interfaz se mueve a
    // destiempo consigo misma y se nota aunque no se sepa por qué.
    expect(fuente).toMatch(/--mov-rapido:/)
    expect(fuente).toMatch(/--mov-normal:/)
    expect(fuente).toMatch(/--mov-suave:/)
  })

  it('el toque tiene acuse visible', () => {
    expect(fuente).toMatch(/:active\s*\{[^}]*transform:\s*scale\(0?\.9/)
  })

  it('el hover va detrás de `hover: hover`', () => {
    // Sin esta guarda, en una pantalla táctil el hover se queda PEGADO
    // después de tocar y el botón parece resaltado sin motivo.
    expect(fuente).toMatch(/@media \(hover: hover\)/)
  })

  it('se puede apagar entero con la preferencia del sistema', () => {
    const bloques = fuente.match(/@media \(prefers-reduced-motion: reduce\)/g) || []
    expect(bloques.length).toBeGreaterThanOrEqual(2)

    // Y el bloque de apagado tiene que neutralizar de verdad: sin esto podría
    // existir el `@media` y no quitar nada.
    const apagado = fuente.slice(fuente.lastIndexOf('prefers-reduced-motion: reduce'))
    expect(apagado).toMatch(/transition:\s*none/)
    expect(apagado).toMatch(/transform:\s*none/)
  })

  it('el foco se ve aunque el elemento no defina el suyo', () => {
    // Medido: 128 `outline-none` en el proyecto, 8 sin nada que los
    // reemplace. Esta es la red de abajo.
    expect(fuente).toMatch(/:focus-visible\s*\{[^}]*outline:/)
  })

  it('no se anima `all` en la capa de interacción', () => {
    // `transition: all` arrastra propiedades de maquetación y obliga al
    // navegador a recalcular posiciones en cada fotograma. Se nombran las
    // propiedades que se mueven, que además documenta la intención.
    const capa = fuente.slice(fuente.indexOf('--mov-rapido'))
    expect(capa).not.toMatch(/transition:\s*all/)
  })
})
