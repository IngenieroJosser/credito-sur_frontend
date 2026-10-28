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
})
