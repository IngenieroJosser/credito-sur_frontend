import fs from 'fs'
import path from 'path'
import { sinComentarios } from '@/lib/testing/sin-comentarios'

/**
 * Lo que se toca con el dedo, y el zoom que nadie debería bloquear.
 *
 * ── De dónde salen estas dos reglas ────────────────────────────────────────
 *
 * Medido sobre el repo:
 *
 *   - de **671 botones, 458** declaran una altura por debajo de 44px, y solo
 *     **30** traen `min-h-[44px]` (los del cobrador, arreglados a mano);
 *   - **80 de 179** campos de texto están por debajo de 16px, y `globals.css`
 *     no fijaba el tamaño de ninguno.
 *
 * Lo segundo tiene una consecuencia que no se ve leyendo el CSS: Safari en iOS
 * hace zoom al enfocar un campo de menos de 16px y la página se queda
 * desplazada. Por eso el `viewport` llevaba `maximumScale: 1` — que lo tapaba
 * **bloqueando el zoom de pinza a todo el mundo**, incluido quien necesita
 * agrandar para leer una cifra. Se arregló la causa (16px en pantallas
 * táctiles) y se devolvió el zoom.
 *
 * ── Por qué una prueba que lee archivos ───────────────────────────────────
 *
 * Son reglas CSS y una exportación de Next: no hay función que llamar. Lo que
 * no puede volver es que desaparezcan, y eso se lee. Cada aserción está
 * comprobada al revés: con la regla quitada, falla.
 */
const RAIZ = process.cwd()
const CSS = fs.readFileSync(path.join(RAIZ, 'app', 'globals.css'), 'utf8')
/*
 * El layout SIN comentarios.
 *
 * La primera version de esto fallaba por mi propio comentario: explicaba por
 * que se quito `maximumScale` y la palabra seguia en el archivo. Para eso esta
 * `sinComentarios`, que ya usan las demas centinelas del repo.
 */
const LAYOUT = sinComentarios(
  fs.readFileSync(path.join(RAIZ, 'app', 'layout.tsx'), 'utf8'),
)

/** El bloque de `pointer: coarse`, para no acusar a otra media query. */
const bloqueTactil = (() => {
  const inicio = CSS.indexOf('@media (pointer: coarse)')
  expect(inicio).toBeGreaterThan(0)
  // Hasta el cierre de la media query: la llave de columna 0 que la cierra.
  const resto = CSS.slice(inicio)
  const fin = resto.indexOf('\n}')
  const bloque = fin > 0 ? resto.slice(0, fin) : resto
  // Piso: si el recorte sale corto, la prueba estaría mirando casi nada.
  expect(bloque.length).toBeGreaterThan(300)
  return bloque
})()

describe('el objetivo táctil mínimo existe y vale para toda la app', () => {
  it('los botones miden al menos 44px en pantallas que se tocan', () => {
    expect(bloqueTactil).toMatch(/button:not\(\.sin-objetivo-tactil\)/)
    expect(bloqueTactil).toMatch(/min-height:\s*44px/)
  })

  it('y los de un icono suelto también de ancho', () => {
    // A un botón con texto el ancho mínimo no le hace falta y en una fila
    // estrecha podría forzar scroll horizontal.
    expect(bloqueTactil).toMatch(/:has\(>\s*svg:only-child\)/)
    expect(bloqueTactil).toMatch(/min-width:\s*44px/)
  })

  it('va bajo `pointer: coarse`, no en todas las pantallas', () => {
    // En escritorio los 44px no aplican: es la guía táctil, y engordar las
    // tablas densas del administrador no mejora nada.
    expect(CSS).toMatch(/@media \(pointer: coarse\)/)
    expect(bloqueTactil).not.toMatch(/@media \(min-width/)
  })

  it('deja una salida declarada para lo que de verdad deba ser diminuto', () => {
    expect(bloqueTactil).toContain('.sin-objetivo-tactil')
  })
})

describe('los campos no disparan el zoom de iOS, y el de pinza se queda', () => {
  it('los campos de texto van a 16px en pantallas táctiles', () => {
    expect(bloqueTactil).toMatch(/font-size:\s*16px/)
    expect(bloqueTactil).toMatch(/textarea/)
    expect(bloqueTactil).toMatch(/select/)
  })

  it('las casillas y los radios quedan fuera: no les aplica', () => {
    expect(bloqueTactil).toMatch(/input:not\(\[type='checkbox'\]\)/)
  })

  it('el viewport NO limita la escala máxima', () => {
    /*
     * Es la aserción que importa de verdad: `maximumScale: 1` bloquea el zoom
     * de pinza, y eso es quitarle a una persona con poca visión la única forma
     * de leer una cifra en el teléfono. Si alguien lo vuelve a poner para tapar
     * el zoom de iOS, la causa está arreglada en `globals.css` y esto avisa.
     */
    expect(LAYOUT).not.toMatch(/maximumScale/)
    expect(LAYOUT).not.toMatch(/userScalable:\s*false/)
  })

  it('y sigue declarando el ancho del dispositivo', () => {
    // Sin esto no hay diseño adaptable y además vuelve el retardo de 300 ms al
    // toque, que es la razón por la que `touch-action: manipulation` no hace
    // falta en este proyecto.
    expect(LAYOUT).toMatch(/width:\s*["']device-width["']/)
  })
})
