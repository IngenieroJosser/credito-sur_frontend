import * as fs from 'fs'
import * as path from 'path'

/**
 * Que toda ruta que el frontend pide exista en el backend.
 *
 * ── Lo que pasaba ───────────────────────────────────────────────────────────
 *
 * `rutas-service.ts` tenía `obtenerVisitasDelDiaEnLote`, que hace
 * `POST /routes/daily-visits/batch`. Ese endpoint NO existía. Medido contra el
 * servidor en marcha:
 *
 *     POST /api-credisur/routes/daily-visits/batch -> 404
 *     GET  /api-credisur/routes/:id/daily-visits   -> 401 (existe; lo frena el guard)
 *
 * El 404 contra el 401 es la prueba: la ruta declarada responde 401 porque el
 * guard la alcanza, y la del lote ni se mapeaba.
 *
 * Y no se notaba. `fetchDailySummaries` del listado de rutas se cortaba en esa
 * línea —después de haberse bajado 5.638 KB de pagos que ya no usaría— y las
 * tarjetas se quedaban con las cifras del LISTADO (`ruta.metaDelDia`,
 * `ruta.cobranzaDelDia`) mientras la pantalla de detalle mostraba las
 * operativas. La misma ruta con dos metas según dónde se mirara, sin un solo
 * aviso, porque la función no tenía `try/catch`.
 *
 * ── Qué se exige ────────────────────────────────────────────────────────────
 *
 * Que cada `apiRequest('METODO', '/ruta')` de los servicios tenga su
 * `@Get`/`@Post`/… en algún controller del backend. Al revés NO: el backend
 * puede declarar endpoints que ninguna pantalla use todavía.
 *
 * ── El límite de la medición, dicho explícitamente ──────────────────────────
 *
 * Esto lee el código de los dos repositorios, así que solo ve lo escrito como
 * literal. Una ruta armada en tiempo de ejecución —concatenada por partes, o
 * sacada de una variable— no se distingue de ninguna, y no se cuenta.
 *
 * Y necesita el backend al lado (`../credito-sur_backend`). Si no está, la
 * prueba se salta en vez de fallar: son dos repositorios separados y quien
 * clone solo el frontend no tiene por qué verla en rojo. Es el mismo trato que
 * `decisiones-cuenta-vencida.spec.ts` le da a su copia del frontend.
 */

const RAIZ = path.join(__dirname, '..', '..')
const BACKEND = path.join(RAIZ, '..', 'credito-sur_backend', 'src')

/**
 * El comienzo de una llamada: la palabra `apiRequest`.
 *
 * El genérico NO se describe aquí con `<[^>]*>`, y es una lección propia: así
 * estaba la primera versión, y `<[^>]*>` se corta en el primer `>`, de modo
 * que una llamada con genérico anidado —
 * `apiRequest<Record<string, DailyVisitsResponse>>(…)`, justo la del lote que
 * originó esta prueba— no coincidía y no se leía. La prueba pasaba por no
 * mirar, no por estar bien. Comprobado poniéndole una ruta inexistente a mano:
 * no la cazaba.
 *
 * Ahora el genérico se salta contando `<` y `>` en `leerLlamada`.
 */
const PETICION = /\bapiRequest\b/g

/** El método y la ruta de la llamada que empieza en `apiRequest`. */
function leerLlamada(
  fuente: string,
  desde: number,
): { metodo: string; ruta: string } | null {
  let j = desde
  const saltarEspacios = () => {
    while (j < fuente.length && /\s/.test(fuente[j])) j += 1
  }

  saltarEspacios()

  // El genérico, si lo hay, con sus `<>` anidados.
  if (fuente[j] === '<') {
    let profundidad = 0
    while (j < fuente.length) {
      if (fuente[j] === '<') profundidad += 1
      else if (fuente[j] === '>') {
        profundidad -= 1
        if (profundidad === 0) {
          j += 1
          break
        }
      }
      j += 1
    }
    saltarEspacios()
  }

  if (fuente[j] !== '(') return null
  j += 1
  saltarEspacios()

  const metodo = leerLiteralDeRuta(fuente, j)
  if (!metodo) return null
  if (!/^(GET|POST|PATCH|PUT|DELETE)$/.test(metodo.texto)) return null

  j = metodo.fin + 1
  saltarEspacios()
  if (fuente[j] !== ',') return null
  j += 1
  saltarEspacios()

  const ruta = leerLiteralDeRuta(fuente, j)
  if (!ruta) return null

  return { metodo: metodo.texto, ruta: ruta.texto }
}

/**
 * Lee el literal de la ruta que empieza en `i`, y devuelve su texto y dónde
 * termina.
 *
 * No vale una expresión regular: estas rutas llevan plantillas ANIDADAS, con
 * acentos graves y comillas dentro de la interpolación. La primera versión de
 * esta prueba usaba `[^\`']+` y cortaba en el acento grave interior, así que
 * acusó a tres rutas que sí existen:
 *
 *     `/accounting/cierres${qs ? `?${qs}` : ''}`
 *
 * Cada `${…}` se reemplaza por `*`, saltando su contenido con un contador de
 * llaves para no confundirse con el de dentro.
 */
function leerLiteralDeRuta(
  fuente: string,
  i: number,
): { texto: string; fin: number } | null {
  const comilla = fuente[i]
  if (comilla !== '`' && comilla !== "'" && comilla !== '"') return null

  let texto = ''
  let j = i + 1

  while (j < fuente.length) {
    const c = fuente[j]

    if (c === '\\') {
      texto += fuente[j + 1] ?? ''
      j += 2
      continue
    }
    if (c === comilla) return { texto, fin: j }

    if (comilla === '`' && c === '$' && fuente[j + 1] === '{') {
      let profundidad = 1
      j += 2
      while (j < fuente.length && profundidad > 0) {
        if (fuente[j] === '{') profundidad += 1
        else if (fuente[j] === '}') profundidad -= 1
        j += 1
      }
      texto += '*'
      continue
    }

    texto += c
    j += 1
  }

  return null
}

/** `@Controller('clients')` */
const CONTROLLER = /@Controller\(\s*'([^']*)'\s*\)/
/** `@Get('x')`, `@Post()`, … */
const HANDLER = /@(Get|Post|Patch|Put|Delete)\(\s*(?:'([^']*)')?\s*\)/g

/**
 * Deja la ruta comparable entre los dos lados.
 *
 * - `${id}` del frontend y `:id` del backend son lo mismo: un comodín.
 * - Un `*` pegado al final de un segmento es la cadena de consulta
 *   (`/approvals/pending${params}`), no un segmento más.
 * - `apiRequest` recibe algunas rutas sin la barra inicial.
 */
function normalizar(ruta: string): string {
  let salida = ruta.replace(/\$\{[^}]*\}/g, '*')
  salida = salida.replace(/:[A-Za-z_][A-Za-z0-9_]*/g, '*')
  salida = salida.replace(/\?.*$/, '')
  salida = salida.replace(/(?<=[a-zA-Z0-9])\*$/, '')
  if (!salida.startsWith('/')) salida = `/${salida}`
  return salida.replace(/\/+$/, '')
}

function archivos(dir: string, patron: RegExp): string[] {
  const salida: string[] = []
  const recorrer = (actual: string) => {
    for (const entrada of fs.readdirSync(actual, { withFileTypes: true })) {
      if (entrada.name === 'node_modules' || entrada.name === '.next') continue
      const completo = path.join(actual, entrada.name)
      if (entrada.isDirectory()) {
        recorrer(completo)
        continue
      }
      if (patron.test(entrada.name)) salida.push(completo)
    }
  }
  recorrer(dir)
  return salida
}

/** Lo que el backend declara: método + ruta completa. */
function declaradas(): Set<string> {
  const salida = new Set<string>()

  for (const archivo of archivos(BACKEND, /\.controller\.ts$/)) {
    const fuente = fs.readFileSync(archivo, 'utf8')
    const base = fuente.match(CONTROLLER)?.[1] ?? ''

    for (const hallado of fuente.matchAll(HANDLER)) {
      const metodo = hallado[1].toUpperCase()
      const sufijo = hallado[2] ?? ''
      const partes = [base, sufijo].filter(Boolean).join('/')
      salida.add(`${metodo} ${normalizar(partes)}`)
    }
  }

  return salida
}

/** Lo que el frontend pide, con el archivo y la línea para poder ir a mirar. */
function pedidas(): { clave: string; donde: string }[] {
  const salida: { clave: string; donde: string }[] = []

  for (const base of ['services', 'lib', 'hooks']) {
    const dir = path.join(RAIZ, base)
    if (!fs.existsSync(dir)) continue

    for (const archivo of archivos(dir, /\.tsx?$/)) {
      if (archivo.includes('.test.') || archivo.includes('.spec.')) continue
      const fuente = fs.readFileSync(archivo, 'utf8')
      if (!fuente.includes('apiRequest')) continue
      const relativo = path.relative(RAIZ, archivo).replace(/\\/g, '/')

      for (const hallado of fuente.matchAll(PETICION)) {
        const inicio = (hallado.index ?? 0) + hallado[0].length
        const llamada = leerLlamada(fuente, inicio)
        // La ruta no es un literal (viene en una variable), o esto no era una
        // llamada: no se puede comprobar, y es el límite declarado arriba.
        if (!llamada) continue

        const linea = fuente.slice(0, hallado.index).split('\n').length
        salida.push({
          clave: `${llamada.metodo.toUpperCase()} ${normalizar(llamada.ruta)}`,
          donde: `${relativo}:${linea}`,
        })
      }
    }
  }

  return salida
}

const hayBackend = fs.existsSync(BACKEND)
const describeSiHayBackend = hayBackend ? describe : describe.skip

describeSiHayBackend('toda ruta que el frontend pide existe en el backend', () => {
  it('ningún servicio llama a un endpoint que no está declarado', () => {
    const existentes = declaradas()
    const fantasmas = pedidas().filter((p) => !existentes.has(p.clave))

    const informe = fantasmas.length
      ? [
          'Estas rutas las pide el frontend y el backend no las declara. Una',
          'petición así devuelve 404, y si quien llama no lo atrapa, la pantalla',
          'se queda a medias sin decir nada —fue exactamente lo que pasó con',
          '`POST /routes/daily-visits/batch` en el listado de rutas—:',
          '',
          ...fantasmas.map((f) => `  - ${f.clave}   (${f.donde})`),
          '',
          'O se declara el endpoint en su controller, o se corrige la ruta que',
          'pide el servicio.',
        ].join('\n')
      : 'ninguna'

    expect(informe).toBe('ninguna')
  })

  it('la comparación de verdad está mirando algo', () => {
    // Si un cambio de formato rompiera los buscadores, la prueba de arriba
    // pasaría por VACÍA y no por correcta. Ya pasó una vez: con `<[^>]*>` para
    // el genérico se leían 134 llamadas en vez de 184, y la del lote —la que
    // originó todo esto— era una de las 50 que se perdían.
    //
    // Medido con el lector actual: 225 declaradas, 184 pedidas. El piso va
    // cerca de esas cifras, no en un número cómodo: con un piso flojo, una
    // regresión del lector a 134 seguiría pasando.
    expect(declaradas().size).toBeGreaterThan(200)
    expect(pedidas().length).toBeGreaterThan(170)
  })
})
