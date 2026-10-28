import fs from 'fs'
import path from 'path'

/**
 * Que no se pinte "$ 0" cuando todavía no se sabe cuánto debe alguien.
 *
 * Un cero en una cifra de deuda se lee como un dato: "este cliente no debe
 * nada". Cuando el valor aún no ha llegado del servidor, significa lo contrario:
 * "todavía no se sabe". Pintarlo igual hace que alguien pase de largo un cliente
 * que sí debe.
 *
 * Ya pasó dos veces. La primera, el listado de clientes mostraba
 * `formatCurrency(cliente.montoTotal ?? 0)` mientras cargaba. Se arregló. La
 * segunda, el arreglo se había aplicado SOLO a la vista de tabla: la de
 * tarjetas —la que usa el cobrador en el móvil, donde más se consulta— seguía
 * con el cero. Nadie lo notó porque la tabla, que es lo que se mira en el
 * escritorio al revisar, estaba bien.
 *
 * Por eso esta prueba mira el código y no la pantalla: el fallo no está en una
 * vista concreta, está en que es fácil arreglar una copia y olvidar la otra.
 *
 * Qué se permite y qué no: un cero es correcto cuando de verdad vale cero
 * —"recaudado hoy: $ 0" es cierto si no ha recaudado nada— y cuando se suma
 * dentro de un `reduce`. Lo que no se permite es el cero por omisión en los
 * campos que representan una DEUDA, que son los que llegan tarde del servidor.
 */

const RAIZ = path.join(__dirname, '..')
const CARPETAS = ['app', 'components']
const OMITIR = new Set(['node_modules', '.next', 'dist', 'coverage', 'public'])

/**
 * Campos que representan lo que alguien debe. Son los que llegan en una segunda
 * petición y los que no pueden salir como cero mientras tanto.
 */
const CAMPOS_DE_DEUDA = [
  'montoTotal',
  'montoMora',
  'saldoPendiente',
  'saldoTotal',
  'deudaTotal',
  'montoVencido',
]

/**
 * Se pinta un cero por omisión: `formatCurrency(algo.campo ?? 0)`.
 * Busca la llamada a un formateador de moneda con un `?? 0` o `|| 0` dentro.
 */
const patron = (campo: string) =>
  new RegExp(
    `format(?:Currency|Miles\\w*|COP\\w*)\\s*\\(\\s*[\\w.?\\[\\]'"]*\\b${campo}\\b\\s*(?:\\?\\?|\\|\\|)\\s*0\\s*\\)`,
  )

/**
 * Excepciones, cada una con su motivo. Si una entra aquí es porque el cero es
 * verdad en ese sitio, no porque sea incómodo arreglarlo.
 *
 * Van por fragmento de código y no por número de línea: la línea se mueve al
 * primer cambio del archivo y la excepción pasaría a tapar otra cosa.
 */
const PERMITIDOS: { archivo: string; fragmento: string; motivo: string }[] = [
  {
    archivo: 'components/clientes/ClientesFeature.tsx',
    fragmento: 'Mora: {formatCurrency(cliente.montoMora ?? 0)}',
    motivo:
      'El bloque entero está dentro de `(cliente.montoMora ?? 0) > 0 &&`, así que ' +
      'si llega a pintarse es porque la mora es positiva: el cero de este `??` no ' +
      'se alcanza nunca.',
  },
  {
    archivo: 'components/cobranza/ClienteInfoModal.tsx',
    fragmento: 'formatCurrency(visita.saldoTotal ?? 0)',
    motivo:
      'Aquí el cero sí es un dato: `saldoTotal <= 0` es justo lo que marca una ' +
      'visita como pagada (lib/ruta-historial.ts). Y la visita no llega tarde —es ' +
      'una prop que los tres sitios que abren el modal construyen con ' +
      'ruta-historial, que siempre escribe el campo.',
  },
]

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

describe('Un cero en una cifra de deuda no puede ser un valor por omisión', () => {
  const archivos = CARPETAS.flatMap((c) => {
    const dir = path.join(RAIZ, c)
    return fs.existsSync(dir) ? archivosFuente(dir) : []
  })

  it('encuentra archivos que revisar', () => {
    // Si la búsqueda se rompe, el resto pasaría en vacío sin comprobar nada.
    expect(archivos.length).toBeGreaterThan(50)
  })

  it('no quedan excepciones muertas en la lista', () => {
    // Una excepción cuyo fragmento ya no existe deja de proteger nada y pasa a
    // ser una nota falsa: dice que en ese archivo hay un cero justificado que en
    // realidad ya se quitó. Peor, si alguien vuelve a escribir un cero en ese
    // archivo la excepción podría taparlo.
    const muertas = PERMITIDOS.filter(({ archivo, fragmento }) => {
      const completo = path.join(RAIZ, archivo)
      if (!fs.existsSync(completo)) return true
      return !fs.readFileSync(completo, 'utf8').includes(fragmento)
    }).map(({ archivo, fragmento }) => `${archivo}  ->  ${fragmento}`)

    expect(muertas.join('\n')).toBe('')
  })

  it.each(CAMPOS_DE_DEUDA)('`%s` nunca se pinta con un cero por omisión', (campo) => {
    const re = patron(campo)
    const infractores: string[] = []

    for (const archivo of archivos) {
      const relativo = path.relative(RAIZ, archivo).replace(/\\/g, '/')
      const exenciones = PERMITIDOS.filter((p) => p.archivo === relativo)

      const lineas = fs.readFileSync(archivo, 'utf8').split('\n')
      lineas.forEach((linea, i) => {
        if (!re.test(linea)) return
        if (exenciones.some((p) => linea.includes(p.fragmento))) return
        infractores.push(`${relativo}:${i + 1}  ${linea.trim()}`)
      })
    }

    // Jest no acepta un mensaje junto al `expect`, así que la explicación va
    // dentro del propio valor comparado: es lo que se lee al fallar.
    const informe = infractores.length
      ? [
          'Estas líneas pintan "$ 0" cuando el valor puede no haber llegado todavía.',
          'En su lugar, muestra un esqueleto mientras es null:',
          `  {x.${campo} == null ? <div className="h-5 w-24 animate-pulse rounded bg-slate-200/70" /> : formatCurrency(x.${campo})}`,
          '',
          ...infractores,
        ].join('\n')
      : ''

    expect(informe).toBe('')
  })
})
