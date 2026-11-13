import * as fs from 'fs'
import * as path from 'path'
import { sinComentarios } from '@/lib/testing/sin-comentarios'

/**
 * Que de toda pantalla se pueda salir.
 *
 * ── Lo que pasaba ───────────────────────────────────────────────────────────
 *
 * Mi primera medición decía «0 migas de pan en 157 páginas» y lo apuntó como
 * algo que había que arreglar en todas. Medido de verdad, el problema no era
 * ese.
 *
 * De las 113 pantallas que pintan algo, 53 están a tres niveles o más. De esas
 * 53, cuarenta y nueve se alcanzan DESDE EL MENÚ lateral, y ahí el menú es
 * cómo se sale: unas migas de pan encima no añadirían nada.
 *
 * Las cuatro que sí eran un problema no estaban en el menú de ningún rol y
 * tampoco tenían ninguna forma de volver en toda su cadena de componentes:
 *
 *     /admin/pagos/registro               se llega con `?prestamoId=…`
 *     /coordinador/rutas/asignacion
 *     /coordinador/sistema/sincronizacion
 *     /supervisor/reportes/operativos
 *
 * De esas cuatro solo se salía con el botón atrás del navegador, que en la app
 * instalada como PWA no siempre está a la vista.
 *
 * Así que lo que se arregló fueron cuatro pantallas, no 113. Poner migas en
 * todas habría sido trabajo para tapar un problema que tenían cuatro.
 *
 * ── Qué se exige ────────────────────────────────────────────────────────────
 *
 * Que una pantalla de tres niveles o más esté en el menú de algún rol, o tenga
 * una forma de volver en su cadena.
 *
 * ── El límite de la medición ────────────────────────────────────────────────
 *
 * «Estar en el menú» se comprueba contra las rutas escritas en
 * `lib/permissions.tsx`, contando las URL limpias que sirve el `rewrites`. Un
 * módulo que el backend mande en el `sidebar` dinámico y no esté ahí no se ve.
 */

const RAIZ = path.join(__dirname, '..')
const APP = path.join(RAIZ, 'app')
const SALTOS = 3

/** Las formas de volver que hay en el proyecto, que son tres. */
const HAY_SALIDA = /router\.back\(\)|VolverAtras|>\s*Volver|<ArrowLeft|<ChevronLeft/

function paginas(dir: string): string[] {
  const salida: string[] = []
  for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
    const completo = path.join(dir, entrada.name)
    if (entrada.isDirectory()) salida.push(...paginas(completo))
    else if (entrada.name === 'page.tsx') salida.push(completo)
  }
  return salida
}

function resolver(especificador: string, desde: string): string | null {
  let base: string
  if (especificador.startsWith('@/')) base = path.join(RAIZ, especificador.slice(2))
  else if (especificador.startsWith('.')) base = path.resolve(path.dirname(desde), especificador)
  else return null
  for (const sufijo of ['.tsx', '.ts', '/index.tsx', '/index.ts']) {
    if (fs.existsSync(base + sufijo)) return base + sufijo
  }
  return null
}

function enLaCadena(
  archivo: string,
  texto: RegExp,
  profundidad = 0,
  visto = new Set<string>(),
): boolean {
  if (profundidad > SALTOS || visto.has(archivo) || !fs.existsSync(archivo)) {
    return false
  }
  visto.add(archivo)
  const fuente = sinComentarios(fs.readFileSync(archivo, 'utf8'))
  if (texto.test(fuente)) return true
  for (const hallado of fuente.matchAll(/from\s+'([^']+)'/g)) {
    const destino = resolver(hallado[1], archivo)
    if (!destino) continue
    const rel = path.relative(RAIZ, destino)
    if (!rel.startsWith('components') && !rel.startsWith('app')) continue
    if (enLaCadena(destino, texto, profundidad + 1, visto)) return true
  }
  return false
}

/** Las rutas que el menú lateral de algún rol ofrece. */
function rutasDelMenu(): Set<string> {
  const permisos = fs.readFileSync(
    path.join(RAIZ, 'lib', 'permissions.tsx'),
    'utf8',
  )
  const rutas = new Set<string>()
  for (const hallado of permisos.matchAll(/'(\/[a-z0-9/_-]+)'/g)) {
    rutas.add(hallado[1])
  }
  // Las URL limpias del `rewrites` son la misma pantalla: `/contable` sirve
  // `app/admin/contable`, así que una entrada de menú a `/contable` cubre la
  // ruta con prefijo de rol.
  const config = fs.readFileSync(path.join(RAIZ, 'next.config.ts'), 'utf8')
  const bloque = config.slice(config.indexOf('async rewrites()'))
  for (const hallado of bloque.matchAll(
    /source:\s*'(\/[^']*)'\s*,\s*destination:\s*'(\/[^']*)'/g,
  )) {
    const fuente = hallado[1].replace('/:path*', '')
    const destino = hallado[2].replace('/:path*', '')
    if (rutas.has(fuente)) rutas.add(destino)
    if (rutas.has(destino)) rutas.add(fuente)
  }
  return rutas
}

describe('de toda pantalla se puede salir', () => {
  it('ninguna pantalla honda se queda sin menú y sin volver', () => {
    const menu = rutasDelMenu()
    const sinSalida: string[] = []

    for (const archivo of paginas(APP)) {
      const rel = path.relative(RAIZ, archivo).split(path.sep).join('/')
      /*
       * Una página retirada no es una pantalla.
       *
       * Se comprueba en la CADENA y no solo en el `page.tsx`: los dos detalles
       * de reporte financiero son re-exportaciones de una página legacy, así
       * que su `router.replace` está en el archivo importado. Mirando solo el
       * `page.tsx` los señalaba como pantallas sin salida, y no son pantallas.
       */
      if (
        enLaCadena(archivo, /router\.(?:replace|push)\(/) &&
        enLaCadena(archivo, /return null/)
      ) {
        continue
      }
      if (rel === 'app/test/page.tsx') continue

      const segmentos = path
        .dirname(rel)
        .split('/')
        .slice(1)
        .filter((s) => s && !(s.startsWith('(') && s.endsWith(')')))
      if (segmentos.length < 3) continue

      const ruta = `/${segmentos.join('/')}`
      const limpia = `/${segmentos.slice(1).join('/')}`
      if (menu.has(ruta) || menu.has(limpia)) continue
      if (enLaCadena(archivo, HAY_SALIDA)) continue

      sinSalida.push(rel)
    }

    const informe = sinSalida.length
      ? [
          'De estas pantallas no se puede salir:',
          '',
          ...sinSalida.map((s) => `  - ${s}`),
          '',
          'No están en el menú lateral de ningún rol y no tienen forma de',
          'volver, así que solo se sale con el botón atrás del navegador, que',
          'en la app instalada no siempre está a la vista.',
          '',
          'Pon `<VolverAtras destino="/donde-corresponda" />`. El destino es',
          'obligatorio a propósito: `router.back()` solo no sirve si se llega',
          'por una URL directa o al arrancar la app ahí, porque entonces no',
          'hay historial.',
        ].join('\n')
      : 'ninguna'

    expect(informe).toBe('ninguna')
  })

  it('`VolverAtras` exige el destino', () => {
    // Es lo que lo distingue de los veinte `router.back()` sueltos que ya
    // había: sin destino, el botón no hace nada cuando no hay historial.
    const fuente = fs.readFileSync(
      path.join(RAIZ, 'components', 'ui', 'VolverAtras.tsx'),
      'utf8',
    )
    expect(fuente).toMatch(/\n\s*destino:\s*string\n/)
    expect(fuente).not.toMatch(/destino\?:/)
    // Y que de verdad mire si hay historial antes de usarlo.
    expect(fuente).toContain('window.history.length')
  })
})

describe('el lector de esta prueba mira de verdad', () => {
  it('encuentra las rutas del menú y las pantallas hondas', () => {
    const menu = rutasDelMenu()
    let hondas = 0
    for (const archivo of paginas(APP)) {
      const rel = path.relative(RAIZ, archivo).split(path.sep).join('/')
      const segmentos = path.dirname(rel).split('/').slice(1).filter(Boolean)
      if (segmentos.length >= 3) hondas += 1
    }
    expect({
      rutasDeMenu: menu.size > 20,
      pantallasHondas: hondas > 20,
    }).toEqual({ rutasDeMenu: true, pantallasHondas: true })
  })

  it('cuenta como salida cualquiera de las tres formas que hay', () => {
    // El sistema tiene veinte `router.back()`, dieciocho `<ArrowLeft>` y
    // veintiséis `<ChevronLeft>`. Si esto solo reconociera una, la prueba
    // acusaría a pantallas que sí tienen salida.
    expect({
      back: HAY_SALIDA.test('onClick={() => router.back()}'),
      flecha: HAY_SALIDA.test('<ArrowLeft className="h-4 w-4" />'),
      chevron: HAY_SALIDA.test('<ChevronLeft className="h-4 w-4" />'),
      componente: HAY_SALIDA.test('<VolverAtras destino="/admin" />'),
      nada: HAY_SALIDA.test('<div>una pantalla cualquiera</div>'),
    }).toEqual({
      back: true,
      flecha: true,
      chevron: true,
      componente: true,
      nada: false,
    })
  })
})
