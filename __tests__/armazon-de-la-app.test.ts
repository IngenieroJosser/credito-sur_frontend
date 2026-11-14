import * as fs from 'fs'
import * as path from 'path'
import {
  RAICES_CON_ARMAZON,
  llevaArmazon,
} from '@/components/layout/ArmazonDeLaApp'
import { sinComentarios } from '@/lib/testing/sin-comentarios'

/**
 * Que el armazón se monte una vez, y que su lista no se quede corta.
 *
 * ── Lo que pasaba ───────────────────────────────────────────────────────────
 *
 * «Algunas veces al pasar o seleccionar otro módulo en el aside la pantalla
 * entera se recarga.» No se recargaba: se desmontaba y se volvía a montar.
 *
 * Había SIETE archivos de layout —`(auth)`, `admin`, `cobranzas`, `contador`,
 * `coordinador`, `punto-de-venta`, `supervisor`— y los siete devolvían el
 * mismo `AdminLayout`. Next.js guarda el estado de un layout por ARCHIVO, no
 * por el componente que devuelve, así que cruzar de uno a otro tiraba el árbol
 * entero: el telón blanco de entrada volvía a empezar —300 ms tapando la
 * pantalla y 1 s desvaneciéndose—, el menú lateral se reconstruía, se perdía
 * el scroll y los submenús abiertos, y se volvían a pedir las aprobaciones
 * pendientes.
 *
 * Medido sobre los menús laterales de los siete roles, antes del arreglo:
 *
 *   ADMIN                3 de 16 entradas cruzaban de layout
 *   SUPER_ADMINISTRADOR  3 de 20
 *   COBRADOR             1 de 3
 *   los otros cuatro     ninguna
 *
 * Ahora el armazón vive en el layout raíz, que es el padre común de los siete
 * árboles y lo único que ningún enlace puede desmontar.
 *
 * ── Qué se exige ────────────────────────────────────────────────────────────
 *
 * Que ningún archivo de `app/**\/layout.tsx` vuelva a montar el armazón —si
 * uno lo hace, esas pantallas tienen dos cabeceras y vuelve el desmontaje— y
 * que la lista de rutas con armazón cubra todo lo que existe: una carpeta
 * nueva en `app/(auth)` que no esté en la lista sale sin cabecera ni menú.
 */

const RAIZ = path.join(__dirname, '..')
const APP = path.join(RAIZ, 'app')

function layouts(dir: string): string[] {
  const salida: string[] = []
  for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
    const completo = path.join(dir, entrada.name)
    if (entrada.isDirectory()) salida.push(...layouts(completo))
    else if (entrada.name === 'layout.tsx') salida.push(completo)
  }
  return salida
}

describe('el armazón se monta una sola vez', () => {
  it('ningún layout de `app` vuelve a montarlo', () => {
    const culpables: string[] = []

    for (const archivo of layouts(APP)) {
      const rel = path.relative(RAIZ, archivo).split(path.sep).join('/')
      // El layout raíz es justo quien debe montarlo.
      if (rel === 'app/layout.tsx') continue
      // Sin esto, el comentario que cuenta que este layout YA NO monta el
      // armazon cuenta como que lo monta. Van cuatro centinelas con el
      // mismo tropiezo.
      const fuente = sinComentarios(fs.readFileSync(archivo, 'utf8'))
      if (/ArmazonAdmin|ArmazonDeLaApp|AdminLayout/.test(fuente)) {
        culpables.push(rel)
      }
    }

    const informe = culpables.length
      ? [
          'Estos layouts montan el armazón otra vez:',
          '',
          ...culpables.map((c) => `  - ${c}`),
          '',
          'Lo monta `app/layout.tsx` con `ArmazonDeLaApp`. Si además lo pone',
          'un layout de rol, esas pantallas llevan dos cabeceras y vuelve el',
          'desmontaje al cruzar de un árbol a otro, que es la «recarga» que',
          'todo esto vino a quitar. Un layout de rol se queda solo con lo que',
          'es suyo.',
        ].join('\n')
      : 'ninguno'

    expect(informe).toBe('ninguno')
  })

  it('lo monta el layout raíz', () => {
    const raiz = fs.readFileSync(path.join(APP, 'layout.tsx'), 'utf8')
    expect(raiz).toContain('ArmazonDeLaApp')
  })
})

describe('la lista de rutas con armazón está completa', () => {
  it('cada carpeta de `app/(auth)` está en la lista', () => {
    // `(auth)` es un grupo de rutas: sus carpetas son rutas de primer nivel,
    // así que se añaden una por una. Una nueva que no esté aquí sale sin
    // cabecera ni menú, y eso no falla por su cuenta en ninguna parte.
    const grupo = path.join(APP, '(auth)')
    const carpetas = fs
      .readdirSync(grupo, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => `/${e.name}`)

    const faltan = carpetas.filter((c) => !RAICES_CON_ARMAZON.includes(c as never))
    expect(faltan).toEqual([])
  })

  it('cada árbol de rol está en la lista', () => {
    // Un árbol de rol se reconoce por tener su propio `layout.tsx` en el
    // primer nivel de `app`.
    const arboles = fs
      .readdirSync(APP, { withFileTypes: true })
      .filter(
        (e) =>
          e.isDirectory() &&
          !e.name.startsWith('(') &&
          e.name !== 'api' &&
          fs.existsSync(path.join(APP, e.name, 'layout.tsx')),
      )
      .map((e) => `/${e.name}`)

    const faltan = arboles.filter((a) => !RAICES_CON_ARMAZON.includes(a as never))
    expect(faltan).toEqual([])
  })

  /**
   * Las URL limpias del `rewrites`, que es el agujero que esta lista tenía.
   *
   * `next.config.ts` sirve `/clientes` desde `app/admin/clientes`, `/users`
   * desde `app/admin/users`, y así con doce rutas. Son URL de verdad —las usan
   * las redirecciones de las pantallas retiradas y hay enlaces de
   * notificaciones viejas— pero no existe ningún `page.tsx` en `app/clientes`,
   * así que buscándolas por archivo no aparecen.
   *
   * Y `usePathname()` devuelve lo que ve el navegador, `/clientes`, no el
   * destino reescrito: una que falte en la lista se pinta sin cabecera y sin
   * menú lateral. Faltaban diez.
   */
  const raicesDelRewrites = (): string[] => {
    const config = fs.readFileSync(path.join(RAIZ, 'next.config.ts'), 'utf8')
    const bloque = config.slice(config.indexOf('async rewrites()'))
    const fuentes = [...bloque.matchAll(/source:\s*'(\/[^']*)'/g)].map(
      (m) => `/${m[1].split('/')[1]}`,
    )
    return [...new Set(fuentes)]
  }

  it('cada URL limpia del `rewrites` está en la lista', () => {
    const faltan = raicesDelRewrites().filter(
      (f) => !RAICES_CON_ARMAZON.includes(f as never),
    )

    const informe = faltan.length
      ? [
          'Estas URL las sirve el `rewrites` y se pintarían sin armazón:',
          '',
          ...faltan.map((f) => `  - ${f}`),
          '',
          'Añádelas a RAICES_CON_ARMAZON en `ArmazonDeLaApp`.',
        ].join('\n')
      : 'ninguna'

    expect(informe).toBe('ninguna')
  })

  it('no sobra ninguna ruta en la lista', () => {
    // Si se borra una pantalla y su entrada se queda, mañana tapa otra cosa.
    // Una entrada vale si existe su carpeta O si el `rewrites` la sirve.
    const delRewrites = new Set(raicesDelRewrites())

    const existe = (raiz: string) => {
      const nombre = raiz.replace(/^\//, '')
      return (
        fs.existsSync(path.join(APP, nombre)) ||
        fs.existsSync(path.join(APP, '(auth)', nombre)) ||
        delRewrites.has(raiz)
      )
    }
    const sobran = RAICES_CON_ARMAZON.filter((r) => !existe(r))
    expect(sobran).toEqual([])
  })
})

describe('las pantallas públicas salen desnudas', () => {
  it('el login, la recuperación, la contingencia y la raíz no llevan armazón', () => {
    // `AdminLayout` manda al login a quien no tenga sesión. Si el login
    // llevara armazón, sería un rebote contra sí mismo; y un 404 visto sin
    // sesión diría «vete al login» en vez de «esa página no existe».
    expect({
      raiz: llevaArmazon('/'),
      login: llevaArmazon('/login'),
      recuperar: llevaArmazon('/recuperar-contrasena'),
      contingencia: llevaArmazon('/contingencia'),
      inventada: llevaArmazon('/esto-no-existe'),
    }).toEqual({
      raiz: false,
      login: false,
      recuperar: false,
      contingencia: false,
      inventada: false,
    })
  })

  it('las pantallas de trabajo sí lo llevan, también las anidadas', () => {
    expect({
      admin: llevaArmazon('/admin'),
      clientesDeAdmin: llevaArmazon('/admin/clientes'),
      contable: llevaArmazon('/contable'),
      cierre: llevaArmazon('/contable/cierre-caja'),
      historial: llevaArmazon('/pagos/historial'),
      cobranzas: llevaArmazon('/cobranzas'),
      notificaciones: llevaArmazon('/notificaciones'),
    }).toEqual({
      admin: true,
      clientesDeAdmin: true,
      contable: true,
      cierre: true,
      historial: true,
      cobranzas: true,
      notificaciones: true,
    })
  })

  it('un nombre que empieza igual que una raíz no cuela', () => {
    // `/admin-cosas` no es `/admin`, y `/contabler` no es `/contable`.
    expect({
      adminCosas: llevaArmazon('/admin-cosas'),
      contabler: llevaArmazon('/contabler'),
    }).toEqual({ adminCosas: false, contabler: false })
  })
})

/**
 * Las secciones plegables del menú dicen si están abiertas, y cerradas no
 * atrapan el tabulador.
 *
 * ── Cómo salió esto ────────────────────────────────────────────────────────
 *
 * Corriendo por primera vez `e2e/armazon-no-se-remonta.e2e.ts` —hasta hoy la
 * base de datos estaba parada y nunca se había podido ejecutar—. El clic en
 * «Movimientos» fallaba porque el enlace estaba en una sección cerrada: la
 * sección se cerraba solo con `max-h-0 opacity-0`, que la esconde a la vista
 * pero deja sus enlaces enfocables y en el árbol de accesibilidad.
 *
 * Para quien usa el sistema con teclado eso es un menú invisible por el que el
 * tabulador se pasea; para un lector de pantalla, enlaces que no están. Y el
 * botón de la sección no decía `aria-expanded`, siendo el único desplegable
 * del sistema sin decirlo: `Selector` y `CampoFecha` ya lo llevaban.
 */
describe('el menú lateral dice lo que está abierto', () => {
  const fuente = sinComentarios(
    fs.readFileSync(
      path.join(__dirname, '..', 'components', 'layout', 'ArmazonAdmin.tsx'),
      'utf8',
    ),
  )

  it('el botón de sección declara si está abierta', () => {
    expect(fuente).toContain('aria-expanded={isOpen}')
  })

  it('y dice qué sección controla', () => {
    // Sin `aria-controls` el estado se anuncia sin decir de qué.
    expect(fuente).toContain('aria-controls={`seccion-${item.id}`}')
    expect(fuente).toContain('id={`seccion-${item.id}`}')
  })

  it('la sección cerrada sale del tabulador y del lector', () => {
    expect(fuente).toContain('inert={!isOpen}')
    expect(fuente).toContain('aria-hidden={!isOpen}')
  })

  it('y ese lector ve el defecto cuando se le pone delante', () => {
    // Comprobada al revés: lo que está solo en un comentario no cuenta.
    expect(sinComentarios('const x = inert={!isOpen}')).toContain('inert={!isOpen}')
    expect(sinComentarios('// antes no tenia inert={!isOpen}')).not.toContain(
      'inert={!isOpen}',
    )
  })
})
