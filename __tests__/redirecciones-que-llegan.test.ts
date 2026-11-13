import * as fs from 'fs'
import * as path from 'path'
import { sinComentarios } from '@/lib/testing/sin-comentarios'

/**
 * Que una pantalla retirada lleve a algún sitio que exista.
 *
 * ── Lo que pasaba ───────────────────────────────────────────────────────────
 *
 * El sistema tiene 28 páginas que ya no hacen nada: formularios que se
 * reemplazaron por un modal, pantallas duplicadas por rol, vistas que
 * simulaban un resultado. No se borraron, y hay un motivo: la URL puede estar
 * guardada en el navegador de alguien o escrita en una notificación vieja, y
 * un 404 no explica nada. Son de 18 a 42 líneas con `@deprecated` y un
 * `router.replace` a donde se hace eso ahora.
 *
 * El problema es que una redirección a una ruta que NO existe no falla en
 * ninguna parte: compila, pasa el lint, pasa las pruebas, y solo se nota
 * cuando alguien entra por esa URL y acaba en un 404 —peor que antes, porque
 * ahora pasa por una pantalla en blanco primero—.
 *
 * ── Las tres formas en que una ruta existe ──────────────────────────────────
 *
 * Esto es lo que hay que saber para leer este archivo, y lo que casi me hizo
 * romper nueve redirecciones que funcionaban:
 *
 *   1. un `page.tsx` en su carpeta
 *   2. un `page.tsx` dentro de un GRUPO de rutas: las carpetas entre
 *      paréntesis no salen en la URL, así que `app/(auth)/contable/page.tsx`
 *      sirve `/contable`
 *   3. un `rewrites` de `next.config.ts`: ahí no hay ningún archivo. Doce
 *      URL limpias —`/clientes`, `/users`, `/prestamos/…`, `/rutas`…— se
 *      sirven desde `app/admin/…` sin que exista `app/clientes`
 *
 * La primera versión de esta prueba solo conocía las dos primeras, así que
 * señaló nueve redirecciones correctas como rotas. Las «arreglé» todas
 * apuntándolas a `/admin/…` antes de leer `next.config.ts`; una de ellas
 * mandaba al SUPERVISOR a una ruta de admin, que su propio control de acceso
 * le bloquea. Están revertidas.
 *
 * Lo que sí salió de mirar esto, y era un agujero de verdad: esas doce URL del
 * `rewrites` no estaban en la lista del armazón, así que diez de ellas se
 * pintaban sin cabecera y sin menú. Lo vigila
 * `__tests__/armazon-de-la-app.test.ts`.
 *
 * ── Qué se exige ────────────────────────────────────────────────────────────
 *
 * Que todo `router.replace` o `router.push` con una ruta escrita como literal
 * resuelva por una de las tres formas de arriba.
 *
 * ── El límite de la medición ────────────────────────────────────────────────
 *
 * Solo ve las rutas escritas como literal. Una construida con una variable
 * —`router.push(destino)`— no se distingue de ninguna.
 */

const RAIZ = path.join(__dirname, '..')
const APP = path.join(RAIZ, 'app')

/** `router.replace('/x')` y `router.push(\`/x/${id}\`)`. */
const NAVEGACION = /router\.(?:replace|push)\(\s*(?:'([^']*)'|`([^`]*)`)\s*\)/g

function paginas(dir: string): string[] {
  const salida: string[] = []
  for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
    const completo = path.join(dir, entrada.name)
    if (entrada.isDirectory()) salida.push(...paginas(completo))
    else if (entrada.name === 'page.tsx') salida.push(completo)
  }
  return salida
}

/**
 * Las rutas que el proyecto sirve de verdad, cada una con sus segmentos.
 *
 * Los grupos de rutas de Next —las carpetas entre paréntesis— no aparecen en
 * la URL: `app/(auth)/contable/page.tsx` sirve `/contable`. Y un segmento
 * `[id]` casa con cualquier valor.
 */
function rutasQueExisten(): string[][] {
  return paginas(APP).map((archivo) =>
    path
      .relative(APP, path.dirname(archivo))
      .split(path.sep)
      .filter((s) => s && !(s.startsWith('(') && s.endsWith(')'))),
  )
}

const RUTAS = rutasQueExisten()

/**
 * Las reescrituras de `next.config.ts`, que sirven una URL sin que exista
 * ningún archivo en esa carpeta.
 *
 * `{ source: '/clientes/:path*' }` cubre `/clientes/` y todo lo que siga, y
 * `{ source: '/clientes' }` solo la raíz.
 */
function reescrituras(): Array<{ raiz: string; conResto: boolean }> {
  const config = fs.readFileSync(path.join(RAIZ, 'next.config.ts'), 'utf8')
  const bloque = config.slice(config.indexOf('async rewrites()'))
  return [...bloque.matchAll(/source:\s*'(\/[^']*)'/g)].map((m) => {
    const fuente = m[1]
    return {
      raiz: fuente.replace(/\/:path\*$/, ''),
      conResto: fuente.endsWith('/:path*'),
    }
  })
}

const REESCRITURAS = reescrituras()

function resuelve(destino: string): boolean {
  // Lo que va después de `?` o `#` no elige la página.
  const limpio = destino.split('?')[0].split('#')[0]
  const partes = limpio.split('/').filter(Boolean)

  const porArchivo = RUTAS.some((ruta) => {
    if (ruta.length !== partes.length) return false
    return ruta.every((segmento, i) => {
      // `[id]` o `[...algo]` casan con cualquier valor; y un `${...}` del
      // literal de plantilla es justamente un valor.
      if (segmento.startsWith('[')) return true
      return segmento === partes[i]
    })
  })
  if (porArchivo) return true

  // Y por reescritura: `/clientes/abc` lo sirve `/clientes/:path*`.
  return REESCRITURAS.some(({ raiz, conResto }) =>
    conResto ? limpio.startsWith(`${raiz}/`) : limpio === raiz,
  )
}

type Hallazgo = { rel: string; linea: number; destino: string }

function navegacionesRotas(): Hallazgo[] {
  const salida: Hallazgo[] = []

  for (const archivo of paginas(APP)) {
    const rel = path.relative(RAIZ, archivo).split(path.sep).join('/')
    const fuente = sinComentarios(fs.readFileSync(archivo, 'utf8'))

    for (const hallado of fuente.matchAll(NAVEGACION)) {
      const destino = hallado[1] ?? hallado[2] ?? ''
      // Solo rutas internas escritas enteras.
      if (!destino.startsWith('/')) continue
      if (resuelve(destino)) continue
      salida.push({
        rel,
        linea: fuente.slice(0, hallado.index).split('\n').length,
        destino,
      })
    }
  }

  return salida
}

describe('una pantalla retirada lleva a algo que existe', () => {
  it('ninguna redirección cae en un 404', () => {
    const rotas = navegacionesRotas()

    const informe = rotas.length
      ? [
          'Estas redirecciones van a una ruta que no existe:',
          '',
          ...rotas.map((r) => `  - ${r.rel}:${r.linea} -> ${r.destino}`),
          '',
          'Una redirección a un 404 no falla en ninguna parte: compila, pasa',
          'el lint y pasa las pruebas. Solo se nota cuando alguien entra por',
          'esa URL, y entonces es peor que antes, porque pasa por una',
          'pantalla en blanco primero.',
        ].join('\n')
      : 'ninguna'

    expect(informe).toBe('ninguna')
  })

  it('cada redirección explica por qué redirige', () => {
    /*
     * Hay 37 páginas cuyo único trabajo es redirigir, y una de 14 líneas sin
     * explicación es un misterio para quien la encuentre dentro de seis meses:
     * no se sabe si se puede borrar, ni a dónde iba antes, ni por qué.
     *
     * Lo que se exige es la explicación, no la etiqueta `@deprecated`. No
     * todas están retiradas: `app/contador/page.tsx` redirige a la primera
     * pantalla de su rol, y eso es su función. Lo que no vale es que no se
     * entienda.
     *
     * Medido: de las 37, CUATRO no tenían ni un comentario.
     *
     *   coordinador/perfil
     *   supervisor/clientes/[id]/editar
     *   supervisor/cuentas-mora/[id]
     *   supervisor/cuentas-vencidas/[id]
     *
     * Las dos últimas, además, PIERDEN el id: mandan al listado filtrado y no
     * al detalle de esa cuenta, porque el supervisor no tiene ese detalle. Eso
     * no se podía adivinar leyendo las doce líneas que había.
     */
    const SUFICIENTE = 80
    const mudas: string[] = []

    for (const archivo of paginas(APP)) {
      const rel = path.relative(RAIZ, archivo).split(path.sep).join('/')
      const bruto = fs.readFileSync(archivo, 'utf8')
      const codigo = sinComentarios(bruto)
      // Una página que solo redirige se reconoce por lo que hace.
      const soloRedirige =
        /router\.(?:replace|push)\(/.test(codigo) &&
        /return null/.test(codigo) &&
        codigo.split('\n').filter((l) => l.trim()).length < 30
      if (!soloRedirige) continue

      const comentarios = [...bruto.matchAll(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g)]
        .map((m) => m[0].length)
        .reduce((a, b) => a + b, 0)
      if (comentarios < SUFICIENTE) mudas.push(`${rel} (${comentarios} car.)`)
    }

    const informe = mudas.length
      ? [
          'Estas páginas solo redirigen y no dicen por qué:',
          '',
          ...mudas.map((m) => `  - ${m}`),
          '',
          'Escribe de dónde viene esa URL y a dónde se hace eso ahora. Si la',
          'redirección pierde información —el id, un filtro—, dilo también:',
          'eso no se adivina leyendo doce líneas.',
        ].join('\n')
      : 'ninguna'

    expect(informe).toBe('ninguna')
  })
})

describe('el lector de esta prueba mira de verdad', () => {
  it('encuentra las páginas y las rutas del proyecto', () => {
    // Medido: 157 páginas. El piso va holgado para que no falle al borrar
    // pantallas, pero delata a un lector que se quedó a cero.
    expect(RUTAS.length).toBeGreaterThan(80)
  })

  it('reconoce las tres formas en que una ruta existe', () => {
    // Las tres cosas que harían a esta prueba acusar a rutas correctas, que es
    // justo lo que hizo su primera versión con nueve de ellas.
    expect({
      porArchivo: resuelve('/admin/clientes'),
      grupoDeRutas: resuelve('/contable'),
      dinamico: resuelve('/admin/prestamos/abc-123'),
      conPlantilla: resuelve('/admin/prestamos/${id}'),
      // Reescrituras: la raíz y con resto.
      reescrituraRaiz: resuelve('/users'),
      reescrituraConResto: resuelve('/pagos/registrar/abc-123'),
    }).toEqual({
      porArchivo: true,
      grupoDeRutas: true,
      dinamico: true,
      conPlantilla: true,
      reescrituraRaiz: true,
      reescrituraConResto: true,
    })
  })

  it('ve el destino roto cuando se le pone delante', () => {
    // Comprobada al revés. Y el caso que importa del medio: `/archivados` lo
    // reescribe SIN `:path*`, así que la raíz existe y un subcamino no.
    expect({
      inventada: resuelve('/esto-no-existe'),
      conUnSegmentoDeMas: resuelve('/admin/prestamos/abc/de/mas'),
      reescrituraSinResto: resuelve('/archivados'),
      subcaminoQueNadieSirve: resuelve('/archivados/algo'),
    }).toEqual({
      inventada: false,
      conUnSegmentoDeMas: false,
      reescrituraSinResto: true,
      subcaminoQueNadieSirve: false,
    })
  })
})
