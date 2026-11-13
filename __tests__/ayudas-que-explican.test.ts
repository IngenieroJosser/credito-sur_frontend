import * as fs from 'fs'
import * as path from 'path'
import { sinComentarios } from '@/lib/testing/sin-comentarios'
import { TEXTOS_DE_AYUDA } from '@/lib/ayudas/textos-de-ayuda'

/**
 * Que las ayudas del sistema digan lo mismo en todas las pantallas.
 *
 * ── Lo que pasaba ───────────────────────────────────────────────────────────
 *
 * «Debes poner los tooltips bien, es decir, no solo que diga que un botón es
 * de editar sino que también por ejemplo dentro de un modal o una vista hay
 * varios elementos o botones o lo que sean con un signo de pregunta ? y
 * explique qué se hace ahí.»
 *
 * Había dos piezas y faltaba la tercera:
 *
 *   `Tooltip`           explica un CONTROL: el lápiz es editar, el ojo es ver
 *                       el expediente. Ya estaba, con su hoja desde abajo en
 *                       el móvil, su `aria-describedby` y su Escape
 *   `AyudaContextual`   el `?` que explica algo que no es un control. Ya
 *                       estaba también, pero usado en 4 sitios y con el texto
 *                       escrito donde se usa
 *
 * Medido: 94 rótulos del sistema nombran un concepto del negocio —«Saldo
 * Pendiente», «Interés por Mora», «Días de Atraso», «Tipo de Castigo»— y 86
 * no tenían ninguna explicación.
 *
 * ── Por qué un diccionario ──────────────────────────────────────────────────
 *
 * Porque el mismo concepto sale en varias pantallas, y bifurcado por rol sale
 * dos y tres veces: «saldo pendiente» está en 17 sitios. Escrito en cada uno,
 * se desincroniza igual que se desincronizaron la fórmula del crédito —cinco
 * copias, todas distintas— y la lista de plazos.
 *
 * Y aquí importa más que en otros sitios: estos textos dicen qué significa una
 * cifra de DINERO. Si en una pantalla se explica «el total que debe» y en otra
 * «el capital que falta», una de las dos miente sobre el mismo número.
 *
 * ── Qué se exige ────────────────────────────────────────────────────────────
 *
 *  - Ninguna ayuda con el texto escrito a mano si el concepto está en el
 *    diccionario.
 *  - Ninguna clave del diccionario sin usar: si sobra, es una explicación que
 *    nadie lee y que nadie va a mantener.
 *  - Cada `?` dice de qué es, para el lector de pantalla.
 */

const RAIZ = path.join(__dirname, '..')
const CARPETAS = ['app', 'components']

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

type Uso = { rel: string; linea: number; etiqueta: string }

function usos(): Uso[] {
  const salida: Uso[] = []
  for (const carpeta of CARPETAS) {
    for (const archivo of archivosTsx(path.join(RAIZ, carpeta))) {
      const rel = path.relative(RAIZ, archivo).split(path.sep).join('/')
      if (rel === 'components/ui/AyudaContextual.tsx') continue
      const fuente = sinComentarios(fs.readFileSync(archivo, 'utf8'))
      for (const hallado of fuente.matchAll(/<AyudaContextual\b([\s\S]*?)\/>/g)) {
        salida.push({
          rel,
          linea: fuente.slice(0, hallado.index).split('\n').length,
          etiqueta: hallado[1],
        })
      }
    }
  }
  return salida
}

const USOS = usos()

describe('las ayudas salen de un solo sitio', () => {
  it('ninguna escribe a mano un concepto que ya está en el diccionario', () => {
    /*
     * Los textos propios de UNA pantalla siguen valiendo —`texto` existe para
     * eso—, pero no para un concepto compartido. Se detecta por las palabras
     * con las que empieza el diccionario: si un `texto` a mano repite una de
     * las explicaciones casi literalmente, es que alguien volvió a escribirla.
     */
    const primerasPalabras = Object.entries(TEXTOS_DE_AYUDA).map(
      ([clave, valor]) => [clave, valor.slice(0, 40)] as const,
    )

    const repetidos: string[] = []
    for (const uso of USOS) {
      const conTexto = /texto=/.test(uso.etiqueta)
      if (!conTexto) continue
      for (const [clave, inicio] of primerasPalabras) {
        if (uso.etiqueta.includes(inicio)) {
          repetidos.push(`${uso.rel}:${uso.linea} repite «${clave}»`)
        }
      }
    }

    expect(repetidos.join('\n')).toBe('')
  })

  it('ninguna clave del diccionario se queda sin usar', () => {
    const texto = CARPETAS.flatMap((c) =>
      archivosTsx(path.join(RAIZ, c)).map((a) => fs.readFileSync(a, 'utf8')),
    ).join('\n')

    const sinUsar = Object.keys(TEXTOS_DE_AYUDA).filter(
      (clave) => !new RegExp(`ayuda=["']${clave}["']`).test(texto),
    )

    const informe = sinUsar.length
      ? [
          'Estas explicaciones no se usan en ninguna pantalla:',
          '',
          ...sinUsar.map((c) => `  - ${c}`),
          '',
          'Ponlas donde hagan falta o quítalas del diccionario: una ayuda que',
          'nadie lee es una que nadie va a mantener, y cuando por fin se use',
          'dirá algo que ya no es verdad.',
        ].join('\n')
      : 'ninguna'

    expect(informe).toBe('ninguna')
  })

  it('cada `?` dice de qué es', () => {
    // Con ocho ayudas en la misma pantalla, «más información» no distingue
    // ninguna para quien usa un lector de pantalla.
    const sinNombre = USOS.filter((u) => !/\bde=/.test(u.etiqueta)).map(
      (u) => `${u.rel}:${u.linea}`,
    )
    expect(sinNombre.join('\n')).toBe('')
  })
})

describe('el diccionario está escrito para quien usa el sistema', () => {
  const entradas = Object.entries(TEXTOS_DE_AYUDA)

  it('ninguna explicación nombra un campo, un endpoint ni un enum', () => {
    // «Días en mora», no `diasMora`. Si el texto dice el nombre técnico, no
    // explica nada a quien está delante de la pantalla.
    const tecnicos = entradas.filter(([, texto]) =>
      /[a-z][A-Z]|_[A-Z]|\/api-|`/.test(texto),
    )
    expect(tecnicos.map(([c]) => c).join(', ')).toBe('')
  })

  it('ninguna es tan corta que no explique nada', () => {
    // Un rótulo repetido con otras palabras no es una explicación.
    const cortas = entradas.filter(([, texto]) => texto.length < 40)
    expect(cortas.map(([c]) => c).join(', ')).toBe('')
  })

  it('y ninguna es un párrafo que nadie va a leer en un teléfono', () => {
    const largas = entradas.filter(([, texto]) => texto.length > 320)
    expect(largas.map(([c]) => c).join(', ')).toBe('')
  })
})

describe('el lector de esta prueba mira de verdad', () => {
  it('encuentra las ayudas puestas', () => {
    // Medido el día que se escribió: 63 ayudas en 31 archivos. El piso va a la
    // mitad para que no falle al borrar pantallas.
    const archivos = new Set(USOS.map((u) => u.rel))
    expect({
      ayudas: USOS.length > 30,
      archivos: archivos.size > 15,
      claves: Object.keys(TEXTOS_DE_AYUDA).length > 20,
    }).toEqual({ ayudas: true, archivos: true, claves: true })
  })

  it('ve una ayuda sin nombre cuando se le pone delante', () => {
    const sinNombre = '<AyudaContextual ayuda="saldoPendiente" />'
    const conNombre =
      '<AyudaContextual ayuda="saldoPendiente" de="el saldo pendiente" />'
    expect({
      pilla: !/\bde=/.test(sinNombre),
      dejaPasar: /\bde=/.test(conNombre),
    }).toEqual({ pilla: true, dejaPasar: true })
  })
})
