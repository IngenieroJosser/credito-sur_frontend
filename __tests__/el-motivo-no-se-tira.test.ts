import * as fs from 'fs'
import * as path from 'path'
import { sinComentarios } from '@/lib/testing/sin-comentarios'

/**
 * Que el aviso de un fallo diga lo que el backend explicó.
 *
 * ── Lo que pasaba ───────────────────────────────────────────────────────────
 *
 * El backend se toma el trabajo de explicar por qué no pudo hacer algo —«El
 * artículo CEL-A15 tiene 4 plazos y la plantilla admite 3», «El cliente ya
 * tiene un crédito activo en otra ruta»— y la pantalla hacía
 * `catch { toast.error('No se pudo crear el crédito') }` y lo tiraba.
 *
 * El resultado para quien lo usa es el peor de los dos mundos: la operación no
 * se hizo y tampoco sabe por qué, así que vuelve a pulsar. Y en varios de esos
 * casos volver a pulsar no iba a funcionar nunca: hacía falta cambiar algo que
 * el sistema ya sabía desde el primer intento.
 *
 * Medido sobre los 632 `catch` del frontend:
 *
 *   avisan CON el motivo del backend      95
 *   avisan y TIRAN el motivo              62   ← esto
 *   solo lo registran en el log          255
 *   mudos, ni avisan ni registran        220
 *
 * Se migraron 51 a `mensajeDeError(error, 'el texto de antes')`, que devuelve
 * lo que dijo el backend y cae al texto de antes si no hay nada legible.
 *
 * Los 255 del log y los 220 mudos NO se tocaron: la mayoría son recargas de
 * fondo y lecturas opcionales, donde un aviso por cada fallo sería ruido. Eso
 * es otra medición y otra decisión.
 *
 * ── La excepción que importa, y por qué ─────────────────────────────────────
 *
 * `mensajeDeError` devuelve el mensaje del backend EN LUGAR del de respaldo.
 * Para un ÉXITO PARCIAL eso borra justo la parte que importa:
 *
 *     'El crédito quedó creado, pero no se pudo descargar el contrato'
 *
 * Envuelto, la persona leería solo «fallo de conexión» y volvería a crear el
 * crédito, que ya existe. Diez mensajes así se devolvieron a su texto
 * completo, y esta prueba los reconoce para no volver a pedirlos.
 *
 * ── El límite de la medición ────────────────────────────────────────────────
 *
 * Reconoce la llamada que avisa por su nombre —`toast.`, `showNotification`,
 * `setError`…—. Una envuelta en un helper propio no se distingue.
 */

const RAIZ = path.join(__dirname, '..')
const CARPETAS = ['app', 'components', 'lib', 'hooks', 'services']

/** Las formas de avisar a la persona que hay en el proyecto. */
const AVISA =
  /toast\.|showToast|showNotification|setError|setMensaje|mostrarAviso|setAviso/

/**
 * Un bloque `catch`, y NO el método `.catch(...)` de una promesa.
 *
 * El punto de delante importa: `\bcatch\b` casa igual con `.catch((e) => …)`,
 * y desde ahí el conteo de llaves se va a buscar el cierre a otra parte del
 * archivo. En `app/login/page.tsx` eso hizo que un `.catch` de la línea 118
 * «encontrara» un `setError` de la 132, catorce líneas más abajo y en otro
 * `useEffect`, con una variable que allí no existe.
 *
 * El `.catch(…)` de una promesa se maneja igual de bien —`mensajeDeError`
 * funciona dentro—, pero no es un bloque y esto no sabe leerlo.
 */
const BLOQUE_CATCH = /(?<![.\w])catch\b/g
/**
 * Que el aviso use el motivo se comprueba de la forma precisa: que la
 * variable del `catch` aparezca DENTRO de la llamada que avisa.
 *
 * Mi primera version era una lista de palabras —`mensajeDeError`, `.message`,
 * `String(error)`— y señalo cuatro avisos correctos: `setError(error)`, que
 * pasa el error entero al estado para que el componente lo formatee, y
 * `setError(formatErrorForComponent(err))`, que lo formatea con su propio
 * ayudante. Los dos usan el motivo y ninguno estaba en la lista.
 */
const LLAMADA_QUE_AVISA =
  /(?:toast\.\w+|showToast|showNotification|setError\w*|setMensaje|mostrarAviso|setAviso)\(([^;]*)/

function usaElMotivo(cuerpo: string, variable: string | null): boolean {
  if (!variable) return false
  const enElAviso = LLAMADA_QUE_AVISA.exec(cuerpo)
  if (!enElAviso) return false
  // La variable del `catch`, como palabra entera: `err` no casa con `error`.
  return new RegExp(`\\b${variable}\\b`).test(enElAviso[1])
}

/**
 * Lo que delata un ÉXITO PARCIAL: la operación se hizo y algo de después no.
 * Ahí el texto de la pantalla no se puede sustituir por el del backend.
 */
const EXITO_PARCIAL =
  /, pero no se pudo|creado\. (?:Error|No se pudo)|qued[oó] creado|se cre[oó], pero|se guardaron, pero|eliminado del cache/

function fuentes(): string[] {
  const salida: string[] = []
  const recorrer = (dir: string) => {
    for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entrada.name === 'node_modules' || entrada.name === '.next') continue
      const completo = path.join(dir, entrada.name)
      if (entrada.isDirectory()) {
        recorrer(completo)
        continue
      }
      if (!/\.tsx?$/.test(entrada.name)) continue
      if (entrada.name.includes('.test.') || entrada.name.includes('.spec.')) {
        continue
      }
      salida.push(completo)
    }
  }
  for (const carpeta of CARPETAS) {
    const dir = path.join(RAIZ, carpeta)
    if (fs.existsSync(dir)) recorrer(dir)
  }
  return salida
}

/**
 * El cuerpo de un `catch`, contando llaves.
 *
 * No con una expresión: el cuerpo lleva objetos, plantillas y funciones
 * dentro, así que la primera `}` no es la suya.
 */
function cuerpoDelCatch(fuente: string, desde: number): string {
  const abre = fuente.indexOf('{', desde)
  if (abre === -1) return ''
  let profundidad = 0
  let i = abre
  for (; i < fuente.length; i += 1) {
    if (fuente[i] === '{') profundidad += 1
    else if (fuente[i] === '}') {
      profundidad -= 1
      if (profundidad === 0) break
    }
  }
  return fuente.slice(abre, i)
}

type Hallazgo = { rel: string; linea: number; texto: string }

function tiranElMotivo(): Hallazgo[] {
  const salida: Hallazgo[] = []

  for (const archivo of fuentes()) {
    const rel = path.relative(RAIZ, archivo).split(path.sep).join('/')
    const fuente = sinComentarios(fs.readFileSync(archivo, 'utf8'))

    for (const hallado of fuente.matchAll(BLOQUE_CATCH)) {
      const inicio = hallado.index ?? 0
      const abre = fuente.indexOf('{', inicio + 5)
      const cuerpo = cuerpoDelCatch(fuente, inicio + 5)
      if (!AVISA.test(cuerpo)) continue

      // `catch (error)`, `catch (e)` o `catch` sin variable.
      const variable =
        /\(\s*([A-Za-z_$][\w$]*)/.exec(fuente.slice(inicio, abre))?.[1] ?? null
      // `mensajeDeError` o `formatErrorForComponent` en cualquier parte del
      // cuerpo cuentan: varios lo meten en una variable intermedia y pasan
      // esa, asi que la variable del `catch` no aparece dentro del aviso.
      if (/mensajeDeError|formatErrorForComponent/.test(cuerpo)) continue
      if (usaElMotivo(cuerpo, variable)) continue
      // Un éxito parcial no puede sustituir su texto por el del backend.
      if (EXITO_PARCIAL.test(cuerpo)) continue

      // El texto, con comillas simples o dobles: en `app/admin/users` y en
      // `ListaConflictos` están en dobles, y mi primera versión solo miraba
      // las simples, así que esos tres se le colaron.
      const conTexto = /(['"])((?:(?!\1)[^\\]|\\.)*)\1/.exec(cuerpo)
      salida.push({
        rel,
        linea: fuente.slice(0, inicio).split('\n').length,
        texto: (conTexto?.[2] ?? '').slice(0, 60),
      })
    }
  }

  return salida
}

describe('el aviso de un fallo dice lo que el backend explicó', () => {
  it('ningún catch avisa con un texto fijo tirando el motivo', () => {
    const hallazgos = tiranElMotivo()

    const informe = hallazgos.length
      ? [
          'Estos avisos tiran el motivo que manda el backend:',
          '',
          ...hallazgos.map((h) => `  - ${h.rel}:${h.linea} «${h.texto}»`),
          '',
          'Envuélvelo: `mensajeDeError(error, \'el texto de ahora\')`. Devuelve',
          'lo que dijo el backend y cae al texto de ahora si no hay nada',
          'legible. Sin eso, la persona no sabe por qué falló y vuelve a',
          'pulsar, que en varios de estos casos no iba a funcionar nunca.',
          '',
          'Si el aviso es de ÉXITO PARCIAL —«quedó creado, pero no se pudo',
          'descargar»— NO lo envuelvas: `mensajeDeError` sustituye el texto',
          'entero y se perdería lo que importa, que la operación sí se hizo.',
        ].join('\n')
      : 'ninguno'

    expect(informe).toBe('ninguno')
  })
})

describe('el lector de esta prueba mira de verdad', () => {
  const todos = () => {
    let n = 0
    for (const archivo of fuentes()) {
      const fuente = sinComentarios(fs.readFileSync(archivo, 'utf8'))
      n += (fuente.match(BLOQUE_CATCH) ?? []).length
    }
    return n
  }

  it('encuentra los catch del sistema', () => {
    // Medido: 632. El piso va a la mitad.
    expect(todos()).toBeGreaterThan(300)
  })

  it('y ve los que sí usan el motivo, no solo los que no', () => {
    // Si contara cero de los buenos, la lectura estaría rota y la prueba
    // pasaría por no mirar.
    let conMotivo = 0
    for (const archivo of fuentes()) {
      const fuente = sinComentarios(fs.readFileSync(archivo, 'utf8'))
      for (const hallado of fuente.matchAll(BLOQUE_CATCH)) {
        const cuerpo = cuerpoDelCatch(fuente, (hallado.index ?? 0) + 5)
        const abre = fuente.indexOf('{', (hallado.index ?? 0) + 5)
        const variable =
          /\(\s*([A-Za-z_$][\w$]*)/.exec(
            fuente.slice(hallado.index ?? 0, abre),
          )?.[1] ?? null
        const conHelper = /mensajeDeError|formatErrorForComponent/.test(cuerpo)
        if (AVISA.test(cuerpo) && (conHelper || usaElMotivo(cuerpo, variable)))
          conMotivo += 1
      }
    }
    expect(conMotivo).toBeGreaterThan(100)
  })

  it('distingue el fallo del éxito parcial', () => {
    const falloPelado = "{ toast.error('No se pudo crear el crédito') }"
    const exitoParcial =
      "{ toast.warning('El crédito quedó creado, pero no se pudo descargar el contrato') }"
    const yaMigrado =
      "{ toast.error(mensajeDeError(error, 'No se pudo crear el crédito')) }"

    expect({
      pillaElPelado:
        AVISA.test(falloPelado) &&
        !usaElMotivo(falloPelado, 'error') &&
        !EXITO_PARCIAL.test(falloPelado),
      dejaElParcial: EXITO_PARCIAL.test(exitoParcial),
      dejaElMigrado: usaElMotivo(yaMigrado, 'error'),
      // Los dos que mi primera version señalo por equivocacion.
      dejaElErrorEntero: usaElMotivo("{ setError(error) }", 'error'),
      dejaElFormateado: usaElMotivo(
        '{ setError(formatErrorForComponent(err)) }',
        'err',
      ),
    }).toEqual({
      pillaElPelado: true,
      dejaElParcial: true,
      dejaElMigrado: true,
      dejaElErrorEntero: true,
      dejaElFormateado: true,
    })
  })
})
