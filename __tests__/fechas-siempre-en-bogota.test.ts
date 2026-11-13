import fs from 'fs'
import path from 'path'

/**
 * Ninguna fecha se formatea con el reloj del dispositivo.
 *
 * Aquí el riesgo es distinto al del backend: esto corre en el navegador, y el de
 * un cobrador en Colombia ya está en hora de Bogotá, así que `toLocaleDateString`
 * sin zona acierta casi siempre. Falla en dos casos, y los dos pasan:
 *
 *  - **El huso mal puesto.** Un Android barato recién formateado, o el de alguien
 *    que viajó. La fecha se corre y aquí las fechas son cobros.
 *  - **Las fechas operativas `YYYY-MM-DD`.** `new Date('2026-10-13')` se
 *    interpreta como medianoche UTC, que en Bogotá son las 7 p. m. del 12: la
 *    pantalla mostraba el día ANTERIOR. Esto falla **incluso con el huso bien
 *    puesto**, y es el caso que de verdad importaba.
 *
 * Había 75 llamadas sin zona con 22 combinaciones distintas de opciones. Hacer 22
 * ayudantes con nombre no tenía sentido —lo que cambia entre ellos es el formato,
 * y lo que todos necesitan igual es la zona—, así que cada sitio conserva sus
 * opciones y las pasa a `formatFechaBogota` / `formatHoraBogota`.
 *
 * Esta prueba mira el código fuente y no la pantalla porque el fallo no está en
 * un sitio: está en que escribir `toLocaleDateString` es más corto que importar
 * el ayudante, y en el portátil de quien programa da el mismo resultado.
 */

const RAIZ = path.join(__dirname, '..')
const CARPETAS = ['app', 'components', 'lib', 'services']
const OMITIR = new Set(['node_modules', '.next', 'dist', 'coverage', '__tests__'])

/**
 * Excepción única: el módulo que resuelve la zona para todos los demás.
 */
const PERMITIDOS = new Map<string, string>([
  [
    'lib/format-date.ts',
    'Es el módulo que fija la zona: aquí viven los ayudantes que usa el resto.',
  ],
])

function archivosFuente(dir: string, acc: string[] = []): string[] {
  for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
    if (OMITIR.has(entrada.name)) continue
    const completo = path.join(dir, entrada.name)
    if (entrada.isDirectory()) archivosFuente(completo, acc)
    else if (/\.(tsx|ts)$/.test(entrada.name) && !/\.(test|spec)\./.test(entrada.name)) {
      acc.push(completo)
    }
  }
  return acc
}

/** Índice del paréntesis que cierra el abierto en `i`. */
function cierre(texto: string, i: number): number {
  let prof = 0
  for (let j = i; j < texto.length; j++) {
    const ch = texto[j]
    if (ch === '(' || ch === '{' || ch === '[') prof++
    else if (ch === ')' || ch === '}' || ch === ']') {
      prof--
      if (prof === 0) return j
    }
  }
  return -1
}

describe('las fechas van siempre en hora de Bogota', () => {
  const archivos = CARPETAS.flatMap((c) => {
    const dir = path.join(RAIZ, c)
    return fs.existsSync(dir) ? archivosFuente(dir) : []
  })

  it('encuentra archivos que revisar', () => {
    // Si la búsqueda se rompe, el resto pasaría en vacío sin comprobar nada.
    expect(archivos.length).toBeGreaterThan(100)
  })

  it('no quedan excepciones muertas en la lista', () => {
    const muertas = [...PERMITIDOS.keys()].filter(
      (rel) => !fs.existsSync(path.join(RAIZ, rel)),
    )

    expect(muertas.join('\n')).toBe('')
  })

  it('ninguna llamada a toLocale*String se queda sin `timeZone`', () => {
    const infractores: string[] = []

    for (const archivo of archivos) {
      const relativo = path.relative(RAIZ, archivo).replace(/\\/g, '/')
      if (PERMITIDOS.has(relativo)) continue

      const texto = fs.readFileSync(archivo, 'utf8')
      const re = /\.\s*toLocale(?:Date|Time)String\s*\(/g
      let m: RegExpExecArray | null

      while ((m = re.exec(texto))) {
        const abre = texto.indexOf('(', m.index)
        const cie = cierre(texto, abre)
        // Se mira la llamada COMPLETA y no la línea: el objeto de opciones casi
        // siempre va en varias líneas, y el `timeZone` cae en otra.
        const llamada = cie > 0 ? texto.slice(abre, cie + 1) : texto.slice(abre)
        if (llamada.includes('timeZone')) continue

        const linea = texto.slice(0, m.index).split('\n').length
        infractores.push(`${relativo}:${linea}`)
      }
    }

    const informe = infractores.length
      ? [
          'Estas llamadas formatean con el reloj DEL DISPOSITIVO.',
          'Usa formatFechaBogota o formatHoraBogota de @/lib/format-date, que',
          'aceptan las mismas opciones y además arreglan las fechas YYYY-MM-DD',
          '(que con `new Date(...)` se muestran un día antes).',
          '',
          ...infractores,
        ].join('\n')
      : ''

    expect(informe).toBe('')
  })

  /**
   * El otro lado de la misma regla: el «hoy» que sale del reloj del aparato.
   *
   * Esta prueba empezó vigilando solo `toLocale*String`, y por eso no vio lo
   * que de verdad costaba dinero. Había CINCO sitios haciendo esto:
   *
   *     const hoy = new Date()
   *     hoy.setHours(0, 0, 0, 0)
   *
   * Eso es hoy según el DISPOSITIVO, no según Bogotá. Y de ahí salían:
   *
   *   los días vencidos de una cuenta        `(auth)/cuentas-vencidas`
   *   el límite para reprogramar un cobro    `ReprogramarModal`
   *   los días que le quedan a una prórroga  `CobradorElements`
   *   el inicio del periodo de la ruta       `VistaCobrador`, dos veces
   *
   * Con el huso mal puesto —un Android recién formateado, el de alguien que
   * viajó— o en el cambio de día, todas esas cifras salen corridas un día, y
   * deciden si se cobra hoy y con cuánto recargo.
   *
   * Lo que SÍ vale es normalizar una fecha concreta —`new Date(fecha)` con su
   * `setHours`— cuando el otro lado de la comparación se normaliza igual: el
   * desplazamiento se cancela y se comparan dos días del calendario. Lo que no
   * vale es que uno de los dos lados sea «ahora» del aparato.
   */
  const HOY_DEL_APARATO = /^\s*([A-Za-z_$][\w$]*)\.setHours\(\s*0,\s*0,\s*0,\s*0\s*\)/

  /** Si la variable del `setHours` se declaró como `new Date()` sin argumentos. */
  function esAhoraDelAparato(lineas: string[], i: number): string | null {
    const encontrado = HOY_DEL_APARATO.exec(lineas[i])
    if (!encontrado) return null
    const variable = encontrado[1]
    const antes = lineas.slice(Math.max(0, i - 6), i).join('\n')
    const declarada = new RegExp(
      `(?:const|let|var)\\s+${variable}\\s*=\\s*new Date\\(\\s*\\)`,
    ).test(antes)
    return declarada ? variable : null
  }

  it('ningún «hoy» sale del reloj del dispositivo', () => {
    const infractores: string[] = []

    for (const archivo of archivos) {
      const relativo = path.relative(RAIZ, archivo).replace(/\\/g, '/')
      if (PERMITIDOS.has(relativo)) continue

      const lineas = fs.readFileSync(archivo, 'utf8').split('\n')
      lineas.forEach((_, i) => {
        const variable = esAhoraDelAparato(lineas, i)
        if (variable) infractores.push(`${relativo}:${i + 1} -> ${variable}`)
      })
    }

    const informe = infractores.length
      ? [
          'Estos «hoy» salen del reloj DEL DISPOSITIVO:',
          '',
          ...infractores.map((i) => `  - ${i}`),
          '',
          'Usa `hoyEnBogota()` si necesitas un `Date` para sumar o restar',
          'días, `getBogotaNowKey()` si te basta la llave YYYY-MM-DD, o',
          '`diasEntreEnBogota(desde, hasta)` para una diferencia de días. Los',
          'tres están en `@/lib/rutas-core` y tienen pruebas con el huso del',
          'proceso cambiado.',
        ].join('\n')
      : ''

    expect(informe).toBe('')
  })

  it('y ese lector ve el defecto cuando se le pone delante', () => {
    // Comprobada al revés, con las dos formas: la que está mal y la que no.
    const mal = ['const hoy = new Date()', 'hoy.setHours(0, 0, 0, 0)']
    const bien = [
      'const limite = new Date(visita.fechaProrroga)',
      'limite.setHours(0, 0, 0, 0)',
    ]

    expect({
      elMalo: esAhoraDelAparato(mal, 1),
      elBueno: esAhoraDelAparato(bien, 1),
    }).toEqual({ elMalo: 'hoy', elBueno: null })
  })
})
