import * as fs from 'fs'
import * as path from 'path'
import { sinComentarios } from '@/lib/testing/sin-comentarios'

/**
 * El color de la empresa y el formato del dinero, cada uno en un solo sitio.
 *
 * ── Lo que pasaba ───────────────────────────────────────────────────────────
 *
 * `--primary: #08557f` está declarado en `globals.css` y `tailwind.config.ts`
 * lo expone como el color `primary`, así que `bg-[#08557f]` y `bg-primary`
 * pintan exactamente lo mismo. Pero el hex estaba escrito a mano **268 veces**
 * en clases, repartido en nueve prefijos distintos:
 *
 *   text-[#08557f]      82      ring-[#08557f]      10
 *   border-[#08557f]    65      via-[#08557f]        4
 *   bg-[#08557f]        59      border-t-[#08557f]   3
 *   shadow-[#08557f]    15      border-r-[#08557f]   2
 *   from-[#08557f]      12      y los de primary-dark
 *
 * No se veía mal: se ve exactamente igual. Lo que pasa es que el día que la
 * empresa cambie de color hay 268 sitios que tocar en vez de uno, y el que se
 * olvide uno lo descubre un cliente.
 *
 * Lo mismo con el dinero: `formatCOPInput` —un importe numérico a un campo,
 * con el cero como campo vacío— estaba escrita TRES veces idéntica, y
 * `parseCOP` era `parseCOPInputToNumber` otra vez. Es el mismo patrón que ya
 * costó cinco copias divergentes de la fórmula del crédito.
 *
 * ── Qué se exige ────────────────────────────────────────────────────────────
 *
 *  - Ninguna clase de Tailwind con el hex de la marca: va el token.
 *  - Ningún formateador de dinero declarado fuera de `lib/utils.ts`.
 *
 * ── El límite de la medición ────────────────────────────────────────────────
 *
 * El hex FUERA de una clase se deja pasar a propósito: en un `style`, en un
 * degradado escrito a mano o en la paleta de una gráfica la sustitución por
 * `var(--primary)` no da el mismo resultado en todos los casos —`color-mix` y
 * los degradados de SVG no leen igual una variable—, así que no se cambia a
 * ciegas. Quedan 23 así, y se cuentan abajo para que no crezcan.
 */

const RAIZ = path.join(__dirname, '..')
const CARPETAS = ['app', 'components']

/** Los colores de la marca, con el token que les corresponde. */
const COLORES: Array<[string, string]> = [
  ['#08557f', 'primary'],
  ['#063a58', 'primary-dark'],
  ['#0a6a9e', 'primary-light'],
]

function archivosTsx(dir: string): string[] {
  const salida: string[] = []
  for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entrada.name === 'node_modules' || entrada.name === '.next') continue
    const completo = path.join(dir, entrada.name)
    if (entrada.isDirectory()) salida.push(...archivosTsx(completo))
    else if (entrada.name.endsWith('.tsx')) salida.push(completo)
  }
  return salida
}

describe('el color de la empresa vive en un solo sitio', () => {
  it('ninguna clase de Tailwind lleva el hex a mano', () => {
    const aMano: string[] = []

    for (const carpeta of CARPETAS) {
      for (const archivo of archivosTsx(path.join(RAIZ, carpeta))) {
        const rel = path.relative(RAIZ, archivo).split(path.sep).join('/')
        const fuente = sinComentarios(fs.readFileSync(archivo, 'utf8'))

        for (const [hex, token] of COLORES) {
          // `bg-[#08557f]`, `text-[#08557f]/20`, `border-t-[#08557f]`…
          const clase = new RegExp(`[a-z]+(?:-[a-z])?-\\[${hex}\\](?:/\\d+)?`, 'gi')
          for (const hallado of fuente.matchAll(clase)) {
            const linea = fuente.slice(0, hallado.index).split('\n').length
            const sugerida = hallado[0]
              .replace(`[${hex}]`, token)
              .replace(/\[|\]/g, '')
            aMano.push(`${rel}:${linea} ${hallado[0]} -> ${sugerida}`)
          }
        }
      }
    }

    const informe = aMano.length
      ? [
          'Estas clases escriben el color de la empresa a mano:',
          '',
          ...aMano.map((a) => `  - ${a}`),
          '',
          'Usa el token: `bg-primary`, `text-primary`, `border-primary`. El',
          'hex vive en `--primary` de `globals.css` y `tailwind.config.ts` lo',
          'expone. Se ve igual; lo que cambia es que haya un sitio que tocar',
          'y no 268.',
        ].join('\n')
      : 'ninguna'

    expect(informe).toBe('ninguna')
  })

  it('el token sigue valiendo lo que dice el CSS', () => {
    // Si alguien cambia el hex en `globals.css` y no aquí, esta prueba lo
    // dice; y si cambia el color de la marca, el cambio es de una línea.
    const css = fs.readFileSync(path.join(RAIZ, 'app', 'globals.css'), 'utf8')
    for (const [hex, token] of COLORES) {
      const variable = token === 'primary' ? '--primary' : `--${token}`
      const declarado = new RegExp(`${variable}:\\s*(#[0-9a-f]{6})`, 'i').exec(css)
      expect({ token, valor: declarado?.[1]?.toLowerCase() }).toEqual({
        token,
        valor: hex,
      })
    }
  })

  it('y el hex fuera de una clase no crece', () => {
    /*
     * Estos NO se cambian: en un `style`, en un degradado escrito a mano o en
     * la paleta de una gráfica, `var(--primary)` no da el mismo resultado en
     * todos los casos. Lo que se vigila es que no se multipliquen.
     */
    let fuera = 0
    for (const carpeta of CARPETAS) {
      for (const archivo of archivosTsx(path.join(RAIZ, carpeta))) {
        const fuente = sinComentarios(fs.readFileSync(archivo, 'utf8'))
        for (const [hex] of COLORES) {
          for (const hallado of fuente.matchAll(new RegExp(hex, 'gi'))) {
            const antes = fuente.slice(
              Math.max(0, (hallado.index ?? 0) - 2),
              hallado.index,
            )
            if (!antes.endsWith('[')) fuera += 1
          }
        }
      }
    }
    // Medido el día que se escribió: 23.
    expect(fuera).toBeLessThanOrEqual(25)
  })
})

describe('el formato del dinero vive en un solo sitio', () => {
  it('ningún formateador de dinero se declara fuera de `lib/utils`', () => {
    const PROPIOS =
      /(?:const|function)\s+(format(?:COP|Currency|Miles|Moneda|Money)\w*|parseCOP\w*|formatear(?:Moneda|Pesos)\w*)\s*[=(]/g
    const culpables: string[] = []

    for (const carpeta of [...CARPETAS, 'hooks', 'services', 'lib']) {
      const dir = path.join(RAIZ, carpeta)
      if (!fs.existsSync(dir)) continue
      for (const archivo of archivosTsx(dir).concat(
        // `lib` tiene `.ts` además de `.tsx`.
        carpeta === 'lib' || carpeta === 'hooks' || carpeta === 'services'
          ? listarTs(dir)
          : [],
      )) {
        const rel = path.relative(RAIZ, archivo).split(path.sep).join('/')
        // El origen único es justamente este.
        if (rel === 'lib/utils.ts') continue
        const fuente = sinComentarios(fs.readFileSync(archivo, 'utf8'))
        for (const hallado of fuente.matchAll(PROPIOS)) {
          const linea = fuente.slice(0, hallado.index).split('\n').length
          culpables.push(`${rel}:${linea} -> ${hallado[1]}`)
        }
      }
    }

    const informe = culpables.length
      ? [
          'Estos formateadores de dinero están declarados fuera de',
          '`lib/utils.ts`:',
          '',
          ...culpables.map((c) => `  - ${c}`),
          '',
          'Llévalos a `lib/utils.ts` y úsalos desde ahí. `formatCOPInput`',
          'estaba escrita tres veces idéntica y `parseCOP` era',
          '`parseCOPInputToNumber` otra vez: es el mismo patrón que ya costó',
          'cinco copias divergentes de la fórmula del crédito.',
        ].join('\n')
      : 'ninguno'

    expect(informe).toBe('ninguno')
  })
})

function listarTs(dir: string): string[] {
  const salida: string[] = []
  for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entrada.name === 'node_modules' || entrada.name === '__tests__') continue
    const completo = path.join(dir, entrada.name)
    if (entrada.isDirectory()) salida.push(...listarTs(completo))
    else if (
      entrada.name.endsWith('.ts') &&
      !entrada.name.includes('.test.') &&
      !entrada.name.includes('.spec.')
    ) {
      salida.push(completo)
    }
  }
  return salida
}

describe('el lector de esta prueba mira de verdad', () => {
  it('encuentra los archivos y ve el token puesto', () => {
    let conToken = 0
    for (const carpeta of CARPETAS) {
      for (const archivo of archivosTsx(path.join(RAIZ, carpeta))) {
        const fuente = fs.readFileSync(archivo, 'utf8')
        conToken += (fuente.match(/(?:bg|text|border|ring)-primary\b/g) ?? [])
          .length
      }
    }
    // Medido tras migrar: más de 250 usos del token.
    expect(conToken).toBeGreaterThan(150)
  })

  it('ve el hex a mano cuando se le pone delante', () => {
    const comoEstaba = '<div className="bg-[#08557f] text-white shadow-[#08557f]/20" />'
    const comoEsta = '<div className="bg-primary text-white shadow-primary/20" />'
    const clase = /[a-z]+(?:-[a-z])?-\[#08557f\](?:\/\d+)?/gi

    expect({
      pillaElHex: (comoEstaba.match(clase) ?? []).length,
      dejaElToken: (comoEsta.match(clase) ?? []).length,
    }).toEqual({ pillaElHex: 2, dejaElToken: 0 })
  })
})
