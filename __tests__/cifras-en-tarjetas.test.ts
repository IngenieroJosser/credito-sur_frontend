import * as fs from 'fs'
import * as path from 'path'
import { sinComentarios } from '@/lib/testing/sin-comentarios'

/**
 * Que una cifra de dinero no vuelva a llevar un tamaño fijo grande.
 *
 * ── Lo que pasaba ───────────────────────────────────────────────────────────
 *
 * «Hay que arreglar algunas tarjetas donde se muestran precios porque el
 * precio pues llega a salirse de esas tarjetas.»
 *
 * Medido en Chromium con la tipografía Sora y el marcado real de las
 * tarjetas, a 390 px de teléfono y 1440 px de escritorio. De las 24
 * combinaciones de ancho e importe, se salía:
 *
 *   `text-3xl font-bold`                       6 de 24
 *   `text-2xl font-bold`                       3 de 24
 *   `whitespace-nowrap` + `clamp(…2.6vw…)`     4 de 24
 *
 * Con `text-3xl`, en un móvil con dos tarjetas por fila —123 px de hueco— un
 * préstamo de $ 900.000 pide 143 px. Con el `clamp` de los reportes
 * financieros se sale $ 1.170.000.
 *
 * El `clamp` con `vw` no bastaba porque `vw` es el ancho de la VENTANA y lo
 * que aprieta es el de la TARJETA: en un móvil de 390 px, una tarjeta a todo
 * el ancho tiene 342 px de hueco y dos por fila tienen 123, y `2.6vw` vale lo
 * mismo en las dos.
 *
 * ── Qué se exige ────────────────────────────────────────────────────────────
 *
 * Que una cifra de dinero de tamaño grande vaya por `Cifra`, que se trae su
 * propio contenedor de consulta y se mide contra el hueco que tiene de verdad.
 *
 * Quedan fuera las celdas de tabla (`<td>`, `<th>`): ahí `whitespace-nowrap`
 * es lo correcto —la tabla entera se desplaza en horizontal— y van en
 * `text-sm`, que no desborda.
 *
 * ── El límite de la medición ────────────────────────────────────────────────
 *
 * Lee el código: ve la clase escrita. Un tamaño calculado en tiempo de
 * ejecución no se distingue. Lo que de verdad mide los píxeles es
 * `e2e/cifras-que-no-se-salen.e2e.ts`, que corre en un navegador.
 */

const RAIZ = path.join(__dirname, '..')
const CARPETAS = ['app', 'components']

/** Las formas de pintar dinero que hay en el proyecto. */
const DINERO = /\b(?:formatCurrency|formatCOP|formatMoneda|formatearMoneda)\s*\(/
/** Un tamaño fijo a partir del cual una cifra no cabe en una tarjeta estrecha. */
const TAMANO_GRANDE = /text-(?:2xl|3xl|4xl|5xl|6xl|7xl)\b/
/** Un `clamp` con el ancho de la ventana: el intento que no funciona. */
// `\bvw\b` no vale: en `2.6vw` no hay frontera de palabra entre el `6` y la
// `v`, así que el primer intento no casaba con el caso real. Lo cazó la prueba
// de más abajo, que mete el defecto a mano.
const CLAMP_DE_VENTANA = /text-\[clamp\([^\]]*\d(?:vw|vmin|vmax)\b[^\]]*\)\]/

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

type Hallazgo = { rel: string; linea: number; texto: string; motivo: string }

function hallazgos(): Hallazgo[] {
  const salida: Hallazgo[] = []

  for (const carpeta of CARPETAS) {
    for (const archivo of archivosTsx(path.join(RAIZ, carpeta))) {
      const rel = path.relative(RAIZ, archivo).split(path.sep).join('/')
      // `Cifra` es quien define los tamaños: su propio archivo los nombra.
      if (rel === 'components/ui/Cifra.tsx') continue

      const lineas = sinComentarios(fs.readFileSync(archivo, 'utf8')).split(/\r?\n/)

      lineas.forEach((linea, i) => {
        /*
         * La cifra y su clase pueden estar en la misma línea o en dos:
         *
         *     <p className="text-3xl ...">
         *       {formatCurrency(x)}
         *     </p>
         *
         * Pero solo cuenta si la línea siguiente es ESA cifra y nada más. El
         * primer intento miraba las dos líneas sin más y señaló
         * `coordinador/reportes/[id]`, donde el `text-3xl` es un CONTADOR de
         * préstamos nuevos y la cifra de dinero está en la línea de abajo, en
         * `text-sm`.
         */
        const siguiente = lineas[i + 1] ?? ''
        const laSiguienteEsLaCifra =
          /^\s*\{(?:formatCurrency|formatCOP|formatMoneda|formatearMoneda)\([^{}]*\)\}\s*$/.test(
            siguiente,
          )
        const esDinero =
          DINERO.test(linea) || (/>\s*$/.test(linea) && laSiguienteEsLaCifra)
        if (!esDinero) return
        // La celda de una tabla no es una tarjeta.
        if (/<t[dh]\b/.test(linea)) return

        if (TAMANO_GRANDE.test(linea)) {
          salida.push({
            rel,
            linea: i + 1,
            texto: linea.trim().slice(0, 110),
            motivo: 'tamaño fijo grande',
          })
        } else if (CLAMP_DE_VENTANA.test(linea)) {
          salida.push({
            rel,
            linea: i + 1,
            texto: linea.trim().slice(0, 110),
            motivo: 'clamp con el ancho de la ventana',
          })
        }
      })
    }
  }

  return salida
}

describe('las cifras de dinero caben en su tarjeta', () => {
  it('ninguna lleva un tamaño fijo grande ni un clamp de ventana', () => {
    const encontrados = hallazgos()

    const informe = encontrados.length
      ? [
          'Estas cifras de dinero pueden salirse de su tarjeta:',
          '',
          ...encontrados.map(
            (h) => `  - ${h.rel}:${h.linea} (${h.motivo})\n      ${h.texto}`,
          ),
          '',
          'Va `Cifra` de `components/ui/Cifra`:',
          '',
          '    <Cifra valor={monto} tamano="grande" className="font-bold" />',
          '',
          'Se trae su propio contenedor, así que se mide contra el hueco que',
          'tiene de verdad y no contra el ancho de la ventana. Los píxeles los',
          'comprueba `e2e/cifras-que-no-se-salen.e2e.ts`.',
        ].join('\n')
      : 'ninguna'

    expect(informe).toBe('ninguna')
  })

  it('`Cifra` encoge con el contenedor, no con la ventana', () => {
    // Es la diferencia entre que funcione y que no. Con `vw` ya se había
    // intentado en los reportes financieros y seguía saliéndose.
    const fuente = fs.readFileSync(
      path.join(RAIZ, 'components', 'ui', 'Cifra.tsx'),
      'utf8',
    )
    expect(fuente).toContain('container-type:inline-size')
    expect(fuente).toMatch(/cqw/)
    expect(fuente).not.toMatch(/clamp\([^)]*\bvw\b/)
  })

  it('y no baja de donde se puede leer', () => {
    // El otro lado: encoger sin tope haría que cupiera todo y no se leyera
    // nada. El mínimo de los tres tamaños es 0.875rem, 14 px.
    const fuente = fs.readFileSync(
      path.join(RAIZ, 'components', 'ui', 'Cifra.tsx'),
      'utf8',
    )
    const minimos = [...fuente.matchAll(/clamp\((\d*\.?\d+)rem/g)].map((m) =>
      Number(m[1]),
    )
    expect(minimos.length).toBeGreaterThanOrEqual(3)
    for (const minimo of minimos) {
      expect(minimo).toBeGreaterThanOrEqual(0.875)
    }
  })
})

describe('el lector de esta prueba mira de verdad', () => {
  it('encuentra las cifras de dinero del sistema', () => {
    // El piso, medido: hay cientos de llamadas de formato de dinero. Si la
    // expresión se rompe, da cero y pasa.
    let cifras = 0
    for (const carpeta of CARPETAS) {
      for (const archivo of archivosTsx(path.join(RAIZ, carpeta))) {
        const fuente = fs.readFileSync(archivo, 'utf8')
        cifras += (fuente.match(new RegExp(DINERO, 'g')) ?? []).length
      }
    }
    expect(cifras).toBeGreaterThan(100)
  })

  it('ve el defecto cuando se le pone delante', () => {
    // Comprobada al revés con el marcado exacto que había.
    const comoEstaba =
      '<p className="text-3xl font-bold text-slate-900">{formatCurrency(saldo)}</p>'
    const conClampDeVentana =
      '<h3 className="whitespace-nowrap text-[clamp(1.35rem,2.6vw,1.5rem)] font-bold">{formatCurrency(x)}</h3>'
    const celdaDeTabla =
      '<td className="px-4 py-3 whitespace-nowrap text-sm font-bold">{formatCurrency(m)}</td>'
    const yaMigrado = '<Cifra valor={saldo} tamano="enorme" className="font-bold" />'

    expect({
      fijoGrande: TAMANO_GRANDE.test(comoEstaba) && DINERO.test(comoEstaba),
      clampDeVentana:
        CLAMP_DE_VENTANA.test(conClampDeVentana) && DINERO.test(conClampDeVentana),
      celdaFuera: /<t[dh]\b/.test(celdaDeTabla),
      migradoLimpio:
        !TAMANO_GRANDE.test(yaMigrado) && !CLAMP_DE_VENTANA.test(yaMigrado),
    }).toEqual({
      fijoGrande: true,
      clampDeVentana: true,
      celdaFuera: true,
      migradoLimpio: true,
    })
  })
})
