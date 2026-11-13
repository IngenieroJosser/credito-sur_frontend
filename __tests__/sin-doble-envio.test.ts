import * as fs from 'fs'
import * as path from 'path'
import { sinComentarios } from '@/lib/testing/sin-comentarios'

/**
 * Que un botón que lanza algo que tarda se bloquee mientras corre.
 *
 * ── Lo que pasaba ───────────────────────────────────────────────────────────
 *
 * Dos toques seguidos lanzan la acción dos veces. En este sistema eso
 * significaba dos créditos de artículo con el mismo cliente y el mismo monto
 * —`CreacionCreditoArticulo`— y una ruta finalizada dos veces
 * —`FinalizarRutaModal`, que esperaba el socket con el botón activo—. Las dos
 * se arreglaron antes de escribir esta prueba.
 *
 * ── Lo que esta prueba midió, y la corrección que trajo ─────────────────────
 *
 * Mi primera cuenta de este problema fue de **29 botones**, hecha buscando
 * palabras en la etiqueta del botón: `async`, `guardar`, `registrar`,
 * `confirmar`. Con esa regla salían 18 en el código de hoy y los miré uno a
 * uno: todos menos uno eran la X de cerrar un modal, un «Cancelar», o un
 * botón que navega. Síncronos. Ninguno podía dispararse dos veces con
 * consecuencias.
 *
 * Resolviendo el manejador de verdad —si es `async` o si su cuerpo lleva un
 * `await`— quedaron **tres**, y ninguno de dinero: dos «Reintentar» y el
 * acceso sin conexión del login. Esos tres llevan ya su `disabled`.
 *
 * O sea: el número grande era mío y estaba inflado. Lo que sigue en pie es
 * mantenerlo en cero, que es lo que hace esta prueba.
 *
 * ── El límite de la medición ────────────────────────────────────────────────
 *
 * Resuelve el manejador dentro del MISMO archivo. Uno que venga por props o
 * de un hook no se puede seguir leyendo, así que no cuenta. Para esos está
 * `BotonAccion`, que lleva el bloqueo dentro.
 */

const RAIZ = path.join(__dirname, '..')
const CARPETAS = ['app', 'components']

/**
 * El único botón con acción asíncrona que puede quedarse sin `disabled`.
 *
 * TypeScript demuestra por qué: en esa rama del aviso `estado` solo puede
 * valer `'error'`, así que un `disabled={estado === 'activando'}` es código
 * muerto —da error de compilación por comparar dos literales sin solape—. Lo
 * que protege del doble toque es que `activar` empieza poniendo el estado en
 * `'activando'`, y con ese estado el aviso pinta otra rama: el botón deja de
 * existir.
 */
const EXCEPCIONES = new Map<string, string>([
  [
    'components/push/ActivarNotificacionesAviso.tsx',
    'El cambio de estado quita el botón de la pantalla, y TypeScript ' +
      'rechaza el `disabled` por comparar literales sin solape.',
  ],
])

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
 * El cuerpo de `const nombre = …` o `function nombre(…)`, y si es `async`.
 *
 * Se cuentan las llaves en vez de buscar el cierre con una expresión: el
 * cuerpo de un manejador lleva objetos, plantillas y funciones dentro, así
 * que la primera `}` no es la suya.
 */
function manejadorDe(
  fuente: string,
  nombre: string,
): { cuerpo: string; esAsync: boolean } | null {
  const escapado = nombre.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const declarado =
    new RegExp(`(?:const|let)\\s+${escapado}\\s*=\\s*(async\\s*)?\\(`).exec(
      fuente,
    ) ?? new RegExp(`(async\\s+)?function\\s+${escapado}\\s*\\(`).exec(fuente)
  if (!declarado) return null

  const esAsync = Boolean(declarado[1])
  const abre = fuente.indexOf('{', declarado.index + declarado[0].length)
  if (abre === -1) return { cuerpo: '', esAsync }

  let profundidad = 0
  let i = abre
  for (; i < fuente.length; i += 1) {
    if (fuente[i] === '{') profundidad += 1
    else if (fuente[i] === '}') {
      profundidad -= 1
      if (profundidad === 0) break
    }
  }
  return { cuerpo: fuente.slice(abre, i), esAsync }
}

type Hallazgo = { rel: string; linea: number; manejador: string }

function sinBloqueo(): Hallazgo[] {
  const salida: Hallazgo[] = []

  for (const carpeta of CARPETAS) {
    for (const archivo of archivosTsx(path.join(RAIZ, carpeta))) {
      const rel = path.relative(RAIZ, archivo).split(path.sep).join('/')
      const fuente = sinComentarios(fs.readFileSync(archivo, 'utf8'))

      for (const hallado of fuente.matchAll(/<button[^A-Za-z]/g)) {
        const inicio = hallado.index ?? 0
        const fin = cierreDeEtiqueta(fuente, inicio + hallado[0].length)
        if (fin < 0) continue

        const apertura = fuente.slice(inicio, fin + 1)
        if (apertura.includes('disabled')) continue
        // Props derramadas: el bloqueo puede venir de fuera.
        if (apertura.includes('{...')) continue

        let manejador: string | null = null
        let asincrono = false

        if (/onClick=\{\s*async/.test(apertura) || /onClick=\{[^}]*await/.test(apertura)) {
          manejador = 'en línea'
          asincrono = true
        } else {
          const porNombre =
            /onClick=\{\s*(?:\(\s*\)\s*=>\s*)?([A-Za-z_$][\w$]*)\s*(?:\(\s*\))?\s*\}/.exec(
              apertura,
            )
          if (!porNombre) continue
          manejador = porNombre[1]
          const resuelto = manejadorDe(fuente, manejador)
          // Un manejador que viene por props o de un hook no se puede seguir.
          if (!resuelto) continue
          asincrono = resuelto.esAsync || resuelto.cuerpo.includes('await ')
        }

        if (!asincrono) continue
        if (EXCEPCIONES.has(rel)) continue

        salida.push({
          rel,
          linea: fuente.slice(0, inicio).split('\n').length,
          manejador,
        })
      }
    }
  }

  return salida
}

describe('ningún botón puede dispararse dos veces', () => {
  it('todo botón con acción asíncrona se bloquea mientras corre', () => {
    const hallazgos = sinBloqueo()

    const informe = hallazgos.length
      ? [
          'Estos botones lanzan algo que tarda y no se bloquean:',
          '',
          ...hallazgos.map((h) => `  - ${h.rel}:${h.linea} (${h.manejador})`),
          '',
          'Ponle `disabled` con el estado que ya lleva la pantalla, o usa',
          '`BotonAccion`, que trae el bloqueo dentro. Dos toques seguidos en',
          'uno de dinero crean dos créditos o finalizan la ruta dos veces.',
        ].join('\n')
      : 'ninguno'

    expect(informe).toBe('ninguno')
  })

  it('cada excepción sigue correspondiendo a un botón real', () => {
    // Si la pantalla cambia y la excepción se queda, mañana tapa otro botón
    // del mismo archivo.
    const sobrantes = [...EXCEPCIONES.keys()].filter(
      (rel) => !fs.existsSync(path.join(RAIZ, rel)),
    )
    expect(sobrantes).toEqual([])
  })
})

describe('el lector de esta prueba mira de verdad', () => {
  it('encuentra los botones del sistema', () => {
    // El piso: si la lectura se rompe da cero y pasa. Medido: más de 700
    // botones en el sistema.
    let botones = 0
    for (const carpeta of CARPETAS) {
      for (const archivo of archivosTsx(path.join(RAIZ, carpeta))) {
        const fuente = fs.readFileSync(archivo, 'utf8')
        botones += (fuente.match(/<button[^A-Za-z]/g) ?? []).length
      }
    }
    expect(botones).toBeGreaterThan(300)
  })

  it('distingue un manejador asíncrono de uno que no lo es', () => {
    // Las dos caras del defecto. Si no distinguiera, esta prueba señalaría
    // las X de cerrar un modal, que es lo que hizo mi primera versión con 18
    // botones.
    const conAwait = `
      const guardarPago = async () => {
        await pagosService.registrar(datos)
      }
    `
    const sincrono = `
      const cerrarModal = () => {
        setAbierto(false)
      }
    `
    const conObjetoDentro = `
      const guardar = async () => {
        const datos = { a: { b: 1 } }
        await servicio.enviar(datos)
      }
    `

    expect({
      asincrono: manejadorDe(conAwait, 'guardarPago')?.esAsync,
      noAsincrono: manejadorDe(sincrono, 'cerrarModal')?.esAsync,
      // Y que contar llaves no se corte en el primer objeto anidado.
      cuerpoCompleto: manejadorDe(conObjetoDentro, 'guardar')?.cuerpo.includes(
        'servicio.enviar',
      ),
    }).toEqual({ asincrono: true, noAsincrono: false, cuerpoCompleto: true })
  })
})
