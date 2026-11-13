import * as fs from 'fs'
import * as path from 'path'
import { sinComentarios } from '@/lib/testing/sin-comentarios'

/**
 * Que lo que el cobrador toca con el pulgar mida 44 px.
 *
 * ── Lo que pasaba ───────────────────────────────────────────────────────────
 *
 * Medido sobre el sistema entero: 468 botones por debajo de 44 px de alto,
 * 364 de ellos a 36. Los que importan son los del cobrador, que trabaja en la
 * calle con el teléfono en una mano:
 *
 *   «Pago», «Abono», «Estado», «Repro.»   28 px, en fila y pegados, en la
 *                                         tarjeta de cada visita
 *   la barra de la ruta                   36 px, cinco botones
 *   las X de cerrar de sus siete modales  36 px
 *
 * «Pago» y «Abono» hacen cosas distintas con el dinero y están uno al lado del
 * otro a 28 px de alto. Eso es la combinación que hace fallar el pulgar.
 *
 * ── Por qué solo estas pantallas ────────────────────────────────────────────
 *
 * Los otros ~450 botones NO se tocaron, y el motivo es honesto: subirle el
 * alto a todos mueve la maquetación de cada pantalla del sistema, y el
 * servicio de PostgreSQL de esta máquina está parado, así que no puedo abrir
 * ninguna para ver el resultado. Cambiar a ciegas la densidad visual de 450
 * botones no es «dejarlo impecable», es apostar.
 *
 * Las del cobrador sí, porque ahí el criterio no es estético: son pantallas
 * que SOLO se usan con el dedo.
 *
 * ── Por qué no se agranda solo el área invisible ────────────────────────────
 *
 * El truco de `AyudaContextual` —un pseudo-elemento de 44 px centrado sobre un
 * icono de 20— sirve para un `?` suelto al lado de un rótulo. Aquí no: cuatro
 * botones de 28 px pegados tendrían sus áreas SOLAPADAS, y el pulgar acertaría
 * el que quedara encima en el apilamiento, que es peor que fallar. Así que se
 * agrandan de verdad, y `sm:` devuelve el tamaño de antes en escritorio, igual
 * que hace `GrupoDeFiltros`.
 *
 * ── El límite de la medición ────────────────────────────────────────────────
 *
 * El alto se calcula de las clases: `py-1.5` son 6 px arriba y abajo, un icono
 * `h-4` son 16. Un alto que venga de una variable o de un `cn()` con
 * condiciones no se puede calcular, y esos no cuentan.
 */

const RAIZ = path.join(__dirname, '..')

/** Lo que el cobrador usa en la calle. */
const ZONAS = [
  'components/dashboards/VistaCobrador.tsx',
  'components/dashboards/shared/CobradorElements.tsx',
  'components/cobranza',
]

/** Tailwind: cada unidad son 4 px. */
const PASO = 4
const MINIMO = 44

function archivos(): string[] {
  const salida: string[] = []
  for (const zona of ZONAS) {
    const completo = path.join(RAIZ, zona)
    if (!fs.existsSync(completo)) continue
    if (fs.statSync(completo).isDirectory()) {
      for (const entrada of fs.readdirSync(completo)) {
        if (entrada.endsWith('.tsx')) salida.push(path.join(completo, entrada))
      }
    } else {
      salida.push(completo)
    }
  }
  return salida
}

/** El `>` que cierra la etiqueta, contando llaves para no parar en un `=>`. */
function cierreDeEtiqueta(fuente: string, desde: number): number {
  let profundidad = 0
  for (let i = desde; i < fuente.length; i += 1) {
    const c = fuente[i]
    if (c === '{') profundidad += 1
    else if (c === '}') profundidad -= 1
    else if (c === '>' && profundidad === 0) return i
  }
  return -1
}

/**
 * El alto del botón en píxeles, o `null` si de las clases no se puede saber.
 *
 * Dos cosas que hay que saber para leer esto, y que la primera versión de esta
 * función hizo mal las dos:
 *
 *  - Las clases de Tailwind llevan FRACCIONES: `py-1.5` son 6 px por lado, no
 *    4. Leyendo solo `\d+` se queda con el «1» y da 4, que subestima el alto
 *    justo en los botones más pequeños, que son los que importan.
 *  - El `h-4` del icono va en el `<svg>`, no en el botón. Si aparece en las
 *    clases del BOTÓN es su propio alto y manda sobre el relleno.
 *
 * El orden: un `min-h-[44px]` manda sobre el relleno, y un alto explícito
 * manda sobre todo.
 */
function altoDe(clases: string): number | null {
  const unidades = (valor: string) => Number(valor) * PASO

  const enPixeles = /min-h-\[(\d+)px\]/.exec(clases)
  if (enPixeles) return Number(enPixeles[1])
  if (/(?<![\w-])min-h-11(?![\w-])/.test(clases)) return MINIMO

  const altoEnPixeles = /(?<![\w-])h-\[(\d+)px\]/.exec(clases)
  if (altoEnPixeles) return Number(altoEnPixeles[1])
  const explicito = /(?<![\w-])h-(\d+(?:\.\d+)?)(?![\w-])/.exec(clases)
  if (explicito) return unidades(explicito[1])

  const vertical =
    /(?<![\w-])py-(\d+(?:\.\d+)?)(?![\w-])/.exec(clases) ??
    /(?<![\w-])p-(\d+(?:\.\d+)?)(?![\w-])/.exec(clases)
  if (!vertical) return null

  // La línea de texto: `text-[11px]` ocupa unos 16 px con su interlineado; sin
  // tamaño declarado, el `text-sm` de por defecto ronda 20.
  const texto = /text-\[(\d+)px\]/.exec(clases)
  const contenido = texto ? Number(texto[1]) + 5 : 20
  return unidades(vertical[1]) * 2 + contenido
}

type Hallazgo = { rel: string; linea: number; alto: number }

function botonesPequenos(): Hallazgo[] {
  const salida: Hallazgo[] = []

  for (const archivo of archivos()) {
    const rel = path.relative(RAIZ, archivo).split(path.sep).join('/')
    const fuente = sinComentarios(fs.readFileSync(archivo, 'utf8'))

    for (const hallado of fuente.matchAll(/<button[^A-Za-z]/g)) {
      const inicio = hallado.index ?? 0
      const fin = cierreDeEtiqueta(fuente, inicio + hallado[0].length)
      if (fin < 0) continue

      const apertura = fuente.slice(inicio, fin + 1)
      const conClases =
        /className="([^"]*)"/.exec(apertura) ??
        /className=\{`([^`]*)`\}/.exec(apertura)
      if (!conClases) continue

      const alto = altoDe(conClases[1])
      if (alto === null || alto >= MINIMO) continue

      salida.push({
        rel,
        linea: fuente.slice(0, inicio).split('\n').length,
        alto,
      })
    }
  }

  return salida
}

describe('lo que el cobrador toca mide 44 px', () => {
  it('ningún botón de sus pantallas se queda por debajo', () => {
    const pequenos = botonesPequenos()

    const informe = pequenos.length
      ? [
          'Estos botones de las pantallas del cobrador son pequeños para un',
          'pulgar:',
          '',
          ...pequenos.map((p) => `  - ${p.rel}:${p.linea} (${p.alto} px)`),
          '',
          'Ponle `min-h-[44px] sm:min-h-0` y el relleno de antes detrás del',
          '`sm:`: 44 px con el dedo y lo de siempre con el ratón, como hace',
          '`GrupoDeFiltros`.',
          '',
          'No vale agrandar solo el área invisible con un pseudo-elemento: si',
          'los botones van pegados, las áreas se solapan y el pulgar acierta',
          'el que quede encima, que es peor que fallar.',
        ].join('\n')
      : 'ninguno'

    expect(informe).toBe('ninguno')
  })
})

describe('el lector de esta prueba mira de verdad', () => {
  it('encuentra los botones de esas pantallas', () => {
    // Medido: más de 60 botones en la zona del cobrador. Si la lectura se
    // rompe, da cero y pasa.
    let botones = 0
    for (const archivo of archivos()) {
      const fuente = fs.readFileSync(archivo, 'utf8')
      botones += (fuente.match(/<button[^A-Za-z]/g) ?? []).length
    }
    expect(botones).toBeGreaterThan(30)
  })

  it('calcula el alto como lo calcula el navegador', () => {
    expect({
      // 6 + 16 + 6: las clases exactas que tenían «Pago» y «Abono».
      pagoAntes: altoDe('px-3 py-1.5 rounded-lg text-[11px] font-bold'),
      // 8 + 20 + 8: la X de cerrar de los modales del cobrador.
      cerrarAntes: altoDe('p-2 bg-slate-100 rounded-full'),
      // El mínimo declarado manda sobre el relleno.
      conMinimo: altoDe('px-3 min-h-[44px] sm:py-1.5'),
      // Un alto explícito manda sobre todo.
      explicito: altoDe('h-12 py-1'),
      // Y la fracción cuenta: `py-1.5` son 6 px, no 4.
      conFraccion: altoDe('py-1.5'),
      // Y de unas clases sin nada de esto no se puede saber.
      sinDatos: altoDe('rounded-xl font-bold text-white'),
    }).toEqual({
      pagoAntes: 28,
      cerrarAntes: 36,
      conMinimo: 44,
      explicito: 48,
      conFraccion: 32,
      sinDatos: null,
    })
  })

  it('ve el botón pequeño cuando se le pone delante', () => {
    // Comprobada al revés con las clases exactas que tenían «Pago» y «Abono».
    const comoEstaba =
      'inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold'
    const comoEsta =
      'inline-flex min-h-[44px] items-center gap-1 rounded-lg px-3 sm:min-h-0 sm:py-1.5'

    expect({
      pillaElPequeno: (altoDe(comoEstaba) ?? 99) < MINIMO,
      dejaElArreglado: (altoDe(comoEsta) ?? 0) >= MINIMO,
    }).toEqual({ pillaElPequeno: true, dejaElArreglado: true })
  })
})
