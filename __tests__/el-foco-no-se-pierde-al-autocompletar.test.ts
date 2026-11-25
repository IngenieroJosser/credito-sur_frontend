import fs from 'fs'
import path from 'path'

/**
 * Un campo que el navegador autocompletó tiene que seguir mostrando el foco.
 *
 * ── El defecto, que lo introdujo el arreglo anterior ───────────────────────
 *
 * Para tapar el fondo amarillo con que Chrome marca lo autocompletado, la única
 * forma de ganarle al `!important` de la hoja del navegador es una **sombra
 * interior** enorme. Eso se hizo, y funcionaba.
 *
 * Pero el anillo de foco de este proyecto **también es `box-shadow`**: son las
 * clases `focus:ring-*` de Tailwind. Medido sobre el repo: **22 campos de texto
 * en 12 archivos** las usan, y hay **99 `outline-none`** repartidos. Así que la
 * sombra del autofill reemplazaba el anillo y, al enfocar un campo que el
 * navegador había rellenado, **no quedaba ningún indicador de foco**.
 *
 * Y pasa justo donde más: en el formulario de entrar, que es el que todo el
 * mundo tiene autocompletado. Quien navega con el teclado se queda sin saber
 * dónde está.
 *
 * Lo dice la guía de Google Chrome (`autofill-highlight-inputs`) con estas
 * palabras: «The rule replaces any other `box-shadow` on the field (e.g. a
 * focus ring done with `box-shadow`)».
 *
 * ── El arreglo, y por qué así ─────────────────────────────────────────────
 *
 * El indicador de foco pasa a `outline`, que no es `box-shadow` y por tanto no
 * entra en conflicto. La especificidad alcanza para ganarle a
 * `focus:outline-none`: `input` + `:is(:autofill, …)` + `:focus-visible` da
 * (0,2,1) contra el (0,2,0) de una clase con `:focus`.
 *
 * ── Por qué una prueba que lee el archivo ─────────────────────────────────
 *
 * Son reglas CSS: no hay función que llamar, y jsdom no resuelve `:autofill`
 * —ningún navegador headless autocompleta por su cuenta—. Lo que no puede
 * volver es que el foco se quede sin indicador, y eso se lee. Comprobada al
 * revés: con el `outline` quitado, cae.
 */
const CSS = fs.readFileSync(
  path.join(process.cwd(), 'app', 'globals.css'),
  'utf8',
)

/** El bloque del foco en campos autocompletados, para no mirar otra regla. */
const bloqueFoco = (() => {
  const i = CSS.indexOf(':-webkit-autofill):focus-visible')
  expect(i).toBeGreaterThan(0)
  const resto = CSS.slice(i)
  const fin = resto.indexOf('\n}')
  const bloque = fin > 0 ? resto.slice(0, fin) : resto
  // Piso: si el recorte sale corto la prueba estaría mirando casi nada.
  expect(bloque.length).toBeGreaterThan(60)
  return bloque
})()

describe('el autofill no se come el anillo de foco', () => {
  it('el foco de un campo autocompletado se pinta con `outline`', () => {
    /*
     * La aserción que importa. Con `box-shadow` volvería el defecto, porque la
     * regla del relleno usa esa misma propiedad y la última gana.
     */
    expect(bloqueFoco).toMatch(/outline:\s*2px solid/)
    expect(bloqueFoco).not.toMatch(/box-shadow/)
  })

  it('y se separa del campo para que se vea sobre el relleno', () => {
    expect(bloqueFoco).toMatch(/outline-offset/)
  })

  it('usa `:focus-visible`, no `:focus`', () => {
    // Con `:focus` el anillo saldría también al hacer clic con el ratón, que es
    // exactamente lo que `:focus-visible` existe para evitar.
    expect(CSS).toMatch(/:-webkit-autofill\):focus-visible/)
  })
})

describe('el relleno del autofill sigue bien puesto', () => {
  const bloqueRelleno = (() => {
    const i = CSS.indexOf('input:is(:autofill, :-webkit-autofill),')
    expect(i).toBeGreaterThan(0)
    const resto = CSS.slice(i)
    const fin = resto.indexOf('\n}')
    const bloque = fin > 0 ? resto.slice(0, fin) : resto
    expect(bloque.length).toBeGreaterThan(300)
    return bloque
  })()

  it('declara el nombre estándar `:autofill`, no solo el de WebKit', () => {
    /*
     * `:autofill` es el estándar; `:-webkit-autofill` es lo que entienden
     * Chrome anterior a 110 y Safari anterior a 15. Van los dos dentro de un
     * `:is()` a propósito: suelto, un navegador que no reconozca uno de los dos
     * nombres **invalida la regla entera**.
     */
    expect(bloqueRelleno).toContain(':is(:autofill, :-webkit-autofill)')
  })

  it('el relleno llega hasta el borde en cualquier pantalla', () => {
    // `1000px` se podía quedar corto en una pantalla muy grande.
    expect(bloqueRelleno).toMatch(/inset 0 0 0 100vmax/)
    expect(bloqueRelleno).not.toMatch(/inset 0 0 0 1000px/)
  })

  it('NO deja un anillo de color alrededor del campo', () => {
    /*
     * Esta aserción estaba al revés y se cambió a petición del dueño.
     *
     * La guía de Chrome recomienda dejar una señal no basada en color de que
     * el navegador rellenó el campo, y se había puesto un borde interior de
     * 2px. En pantalla eso se veía como un borde azul claro alrededor de los
     * campos de entrar, y el dueño lo pidió quitar.
     *
     * Manda eso: la recomendación era para no perder la pista del
     * autocompletado, no una regla de corrección, y el fondo blanco uniforme
     * es lo que hace casi todo el mundo. Lo que SÍ se queda es el relleno
     * —que es lo que tapa el amarillo— y el foco visible, que es la parte de
     * accesibilidad.
     */
    expect(bloqueRelleno).not.toMatch(/inset 0 0 0 2px/)
    expect(bloqueRelleno).toMatch(/inset 0 0 0 100vmax/)
  })

  it('el color del relleno es opaco', () => {
    /*
     * Se pinta encima del color del navegador, no del fondo de la página: con
     * un color translúcido se vería el amarillo por debajo.
     */
    const token = CSS.match(/--relleno-autofill:\s*([^;]+);/)
    expect(token).not.toBeNull()
    const valor = (token?.[1] ?? '').trim()
    expect(valor).toMatch(/^#(?:[0-9a-f]{6}|[0-9a-f]{8})$/i)
    // Un hex de 8 dígitos con alfa por debajo de FF sería translúcido.
    if (valor.length === 9) expect(valor.slice(7).toLowerCase()).toBe('ff')
  })

  it('no toca propiedades que muevan el diseño', () => {
    /*
     * El estado se enciende y se apaga según lo que haga la persona: cambiar
     * `padding` o `border-width` ahí haría saltar el contenido.
     */
    expect(bloqueRelleno).not.toMatch(/\bpadding:/)
    expect(bloqueRelleno).not.toMatch(/\bborder-width:/)
  })
})
