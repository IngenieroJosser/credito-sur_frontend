import * as fs from 'fs'
import * as path from 'path'
import { sinComentarios } from '@/lib/testing/sin-comentarios'

/**
 * Que cada pantalla tenga un nombre, y que se pueda leer.
 *
 * Una pantalla sin `<h1>` no tiene nombre para un lector de pantalla: quien la
 * recorre con el teclado oye los botones y las tablas, pero nunca dónde está.
 * Es la primera cosa que se busca al llegar a una página.
 *
 * ── La corrección que trajo medir esto bien ─────────────────────────────────
 *
 * Mi primera cuenta decía «49 de 157 páginas con `<h1>`», y estaba mal porque
 * contaba al nivel equivocado: buscaba `<h1` en `page.tsx`, y en este proyecto
 * casi todas las páginas son envoltorios de doce líneas.
 *
 *     export default function ArticulosPage() {
 *       return (
 *         <ProtectedPage permiso="ARTICULOS_VIEW" roles={[…]}>
 *           <ArticulosContent />
 *         </ProtectedPage>
 *       )
 *     }
 *
 * El título vive en `ArticulosContent`. Siguiendo la cadena de imports, de las
 * 114 pantallas que pintan algo había **4** sin `<h1>**, no 108. Y de esas
 * cuatro, dos eran páginas retiradas que mi detector de redirecciones no
 * reconoció porque devolvían un `<div>` vacío en vez de `null`.
 *
 * La real era la vista de cobro del supervisor: su título más grande era el
 * `<h2>` con su propio nombre, que no dice dónde está.
 *
 * ── El límite de la medición ────────────────────────────────────────────────
 *
 * Sigue los imports hasta tres saltos y solo los del propio proyecto. Un
 * título que venga de un componente cargado de forma diferida con una ruta
 * calculada no se puede seguir.
 */

const RAIZ = path.join(__dirname, '..')
const APP = path.join(RAIZ, 'app')

/** Hasta dónde seguir la cadena de imports. */
const SALTOS = 3

/** Con su motivo, como el resto de las excepciones del proyecto. */
const EXCEPCIONES = new Map<string, string>([
  [
    'app/test/page.tsx',
    'Es la pantalla de pruebas del propio proyecto, no una del sistema.',
  ],
])

function paginas(dir: string): string[] {
  const salida: string[] = []
  for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
    const completo = path.join(dir, entrada.name)
    if (entrada.isDirectory()) salida.push(...paginas(completo))
    else if (entrada.name === 'page.tsx') salida.push(completo)
  }
  return salida
}

/** El archivo al que apunta un `from '...'`, si es del proyecto. */
function resolver(especificador: string, desde: string): string | null {
  let base: string
  if (especificador.startsWith('@/')) {
    base = path.join(RAIZ, especificador.slice(2))
  } else if (especificador.startsWith('.')) {
    base = path.resolve(path.dirname(desde), especificador)
  } else {
    return null
  }
  for (const sufijo of ['.tsx', '.ts', '/index.tsx', '/index.ts']) {
    if (fs.existsSync(base + sufijo)) return base + sufijo
  }
  return null
}

/** Si el archivo, o algo de lo que importa, contiene `texto`. */
function enLaCadena(
  archivo: string,
  texto: RegExp,
  profundidad = 0,
  visto = new Set<string>(),
): boolean {
  if (profundidad > SALTOS || visto.has(archivo)) return false
  if (!fs.existsSync(archivo)) return false
  visto.add(archivo)

  const fuente = sinComentarios(fs.readFileSync(archivo, 'utf8'))
  if (texto.test(fuente)) return true

  for (const hallado of fuente.matchAll(/from\s+'([^']+)'/g)) {
    const destino = resolver(hallado[1], archivo)
    if (!destino) continue
    // Solo componentes y páginas del proyecto.
    const rel = path.relative(RAIZ, destino)
    if (!rel.startsWith('components') && !rel.startsWith('app')) continue
    if (enLaCadena(destino, texto, profundidad + 1, visto)) return true
  }
  return false
}

/** Una página retirada no pinta nada, así que no necesita nombre. */
function soloRedirige(archivo: string): boolean {
  return (
    enLaCadena(archivo, /router\.(?:replace|push)\(/) &&
    enLaCadena(archivo, /return null/)
  )
}

describe('cada pantalla dice cómo se llama', () => {
  it('ninguna se queda sin `<h1>`', () => {
    const sinNombre: string[] = []

    for (const archivo of paginas(APP)) {
      const rel = path.relative(RAIZ, archivo).split(path.sep).join('/')
      if (EXCEPCIONES.has(rel)) continue
      if (soloRedirige(archivo)) continue
      if (enLaCadena(archivo, /<h1[\s>]/)) continue
      sinNombre.push(rel)
    }

    const informe = sinNombre.length
      ? [
          'Estas pantallas no tienen `<h1>` en ninguna parte de su cadena:',
          '',
          ...sinNombre.map((s) => `  - ${s}`),
          '',
          'Una pantalla sin `<h1>` no tiene nombre para un lector de',
          'pantalla. Si la cabecera ya enseña de qué va y no quieres cambiar',
          'nada de lo que se ve, vale un `<h1 className="sr-only">`.',
        ].join('\n')
      : 'ninguna'

    expect(informe).toBe('ninguna')
  })

  it('cada excepción sigue existiendo', () => {
    const sobrantes = [...EXCEPCIONES.keys()].filter(
      (rel) => !fs.existsSync(path.join(RAIZ, rel)),
    )
    expect(sobrantes).toEqual([])
  })
})

describe('el lector de esta prueba mira de verdad', () => {
  it('encuentra las pantallas del sistema', () => {
    // Medido: 157 páginas, 114 que pintan algo. El piso va holgado.
    expect(paginas(APP).length).toBeGreaterThan(80)
  })

  it('sigue la cadena de imports, que es lo que la primera versión no hacía', () => {
    /*
     * La prueba de esto: `app/(auth)/articulos/page.tsx` son doce líneas que
     * solo montan `ArticulosContent`. Mirando solo el `page.tsx` parecería
     * que no tiene título; siguiendo la cadena, sí lo tiene.
     *
     * Si esto fallara, la prueba de arriba acusaría a casi todas las
     * pantallas del sistema, que es exactamente lo que hizo mi primera
     * medición.
     */
    const envoltorio = path.join(APP, '(auth)', 'articulos', 'page.tsx')
    expect(fs.existsSync(envoltorio)).toBe(true)

    const suPropioTexto = sinComentarios(fs.readFileSync(envoltorio, 'utf8'))
    expect({
      enElPropioArchivo: /<h1[\s>]/.test(suPropioTexto),
      enSuCadena: enLaCadena(envoltorio, /<h1[\s>]/),
    }).toEqual({ enElPropioArchivo: false, enSuCadena: true })
  })

  it('y reconoce una página retirada aunque redirija desde otro archivo', () => {
    // Los tres detalles de reporte financiero son re-exportaciones de una
    // página legacy que redirige: el `router.replace` está en el archivo
    // importado, no en el `page.tsx`.
    const reexportacion = path.join(
      APP,
      '(auth)',
      'reportes',
      'financieros',
      'detalle',
      '[id]',
      'page.tsx',
    )
    if (!fs.existsSync(reexportacion)) return
    expect(soloRedirige(reexportacion)).toBe(true)
  })
})
