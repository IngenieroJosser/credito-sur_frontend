import * as fs from 'fs'
import * as path from 'path'
import { sinComentarios } from '@/lib/testing/sin-comentarios'

/**
 * Que un cambio en tiempo real no recargue la pantalla entera.
 *
 * ── Lo que pasaba ───────────────────────────────────────────────────────────
 *
 * «Algunas veces al pasar o seleccionar otro módulo en el aside la pantalla
 * entera se recarga… todo deben ser transiciones suaves.»
 *
 * Eso tenía dos causas distintas, y esta es la segunda. La primera era el
 * armazón, que se montaba una vez por carpeta de rutas; ya está. La otra
 * estaba dentro de las pantallas:
 *
 *     useRealtimeData(['pagos_actualizados'], () => window.location.reload())
 *
 * Cuatro pantallas hacían eso. Cada vez que CUALQUIER cobrador de la empresa
 * registraba un pago, la pantalla que estuvieras mirando se recargaba de cero:
 * el scroll perdido, todas las peticiones repetidas y el telón de entrada otra
 * vez. En la del supervisor, además, con diecinueve campos de un formulario a
 * medio escribir.
 *
 * Una de las cuatro era pura duplicación: `/coordinador/creditos` recargaba la
 * página, y el `ListadoPrestamos` que monta dentro ya trae su propio
 * `useRealtimeData` con un refresco silencioso y un `usePageFocusRefresh`.
 * Hacía lo mismo pero tirando la pantalla.
 *
 * ── Qué se exige ────────────────────────────────────────────────────────────
 *
 * Que dentro de un manejador de `useRealtimeData` no haya un
 * `window.location.reload()`. Lo que toca es volver a pedir los datos.
 *
 * ── Lo que SÍ puede recargar, y por qué ─────────────────────────────────────
 *
 * Quedan cuatro recargas en el sistema y las cuatro son correctas, porque las
 * pide la persona o porque no hay otra forma:
 *
 *   `contingencia`              la pantalla de sin conexión: recargar ES el
 *                               reintento
 *   `OfflineIndicator`          tras borrar la copia local, hace falta
 *                               arrancar de cero
 *   `notificaciones`, `perfil`  un botón «Reintentar» que pulsa la persona
 *
 * La diferencia es quién decide: un refresco que llega por el socket no lo ha
 * pedido nadie.
 */

const RAIZ = path.join(__dirname, '..')
const CARPETAS = ['app', 'components', 'hooks']

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
 * El argumento del manejador de `useRealtimeData`, contando paréntesis.
 *
 * No con una expresión: el manejador lleva llaves, objetos y flechas dentro,
 * y pararse en el primer `)` cortaría a la mitad.
 */
function manejadoresDeTiempoReal(fuente: string): Array<{
  cuerpo: string
  indice: number
}> {
  const salida: Array<{ cuerpo: string; indice: number }> = []

  for (const hallado of fuente.matchAll(/useRealtimeData\s*\(/g)) {
    const abre = (hallado.index ?? 0) + hallado[0].length - 1
    let profundidad = 0
    let i = abre
    for (; i < fuente.length; i += 1) {
      if (fuente[i] === '(') profundidad += 1
      else if (fuente[i] === ')') {
        profundidad -= 1
        if (profundidad === 0) break
      }
    }
    salida.push({ cuerpo: fuente.slice(abre, i), indice: hallado.index ?? 0 })
  }

  return salida
}

describe('un cambio en tiempo real no recarga la pantalla', () => {
  it('ningún manejador de `useRealtimeData` llama a `location.reload()`', () => {
    const culpables: string[] = []

    for (const archivo of fuentes()) {
      const rel = path.relative(RAIZ, archivo).split(path.sep).join('/')
      const fuente = sinComentarios(fs.readFileSync(archivo, 'utf8'))
      if (!fuente.includes('useRealtimeData')) continue

      for (const { cuerpo, indice } of manejadoresDeTiempoReal(fuente)) {
        if (!/location\s*\.\s*reload\s*\(/.test(cuerpo)) continue
        const linea = fuente.slice(0, indice).split('\n').length
        culpables.push(`${rel}:${linea}`)
      }
    }

    const informe = culpables.length
      ? [
          'Estas pantallas se recargan enteras cuando llega un cambio:',
          '',
          ...culpables.map((c) => `  - ${c}`),
          '',
          'Vuelve a pedir los datos en vez de recargar: saca la carga a un',
          '`useCallback` y llámalo desde el manejador. Recargar pierde el',
          'scroll, repite todas las peticiones y vuelve a pintar el telón de',
          'entrada, y lo dispara cualquier cobrador de la empresa al',
          'registrar un pago.',
          '',
          'Y comprueba antes si hace falta: una de las cuatro que había era',
          'redundante, porque el componente de dentro ya se refrescaba solo.',
        ].join('\n')
      : 'ninguno'

    expect(informe).toBe('ninguno')
  })

  it('las recargas que quedan son las que pide la persona', () => {
    /*
     * El otro lado: que no se cuelen más. Las cuatro legítimas están en la
     * pantalla de contingencia, en la cápsula de sin conexión y en dos
     * botones «Reintentar». Si aparece una quinta, que se mire.
     */
    const permitidas = [
      'app/contingencia/page.tsx',
      'components/offline/OfflineIndicator.tsx',
      'app/admin/notificaciones/page.tsx',
      'app/admin/perfil/page.tsx',
    ]

    const encontradas: string[] = []
    for (const archivo of fuentes()) {
      const rel = path.relative(RAIZ, archivo).split(path.sep).join('/')
      const fuente = sinComentarios(fs.readFileSync(archivo, 'utf8'))
      for (const _ of fuente.matchAll(/location\s*\.\s*reload\s*\(/g)) {
        void _
        encontradas.push(rel)
      }
    }

    const inesperadas = encontradas.filter((rel) => !permitidas.includes(rel))
    expect(inesperadas).toEqual([])
  })
})

describe('el lector de esta prueba mira de verdad', () => {
  it('encuentra los manejadores de tiempo real del sistema', () => {
    let manejadores = 0
    for (const archivo of fuentes()) {
      const fuente = sinComentarios(fs.readFileSync(archivo, 'utf8'))
      manejadores += manejadoresDeTiempoReal(fuente).length
    }
    // Medido: más de veinte pantallas escuchan eventos del socket.
    expect(manejadores).toBeGreaterThan(10)
  })

  it('lee el manejador entero, no hasta el primer paréntesis', () => {
    // El manejador lleva llaves y flechas dentro. Si el lector se cortara
    // antes, no vería el `reload` y la prueba pasaría sin mirar.
    const conReload = `
      useRealtimeData(['pagos_actualizados'], () => {
        const algo = calcular({ a: 1 })
        if (typeof window !== 'undefined') {
          window.location.reload()
        }
      })
    `
    const conRefresco = `
      useRealtimeData(['pagos_actualizados'], () => {
        void cargarDetalle({ conEsqueleto: false })
      })
    `

    const [primero] = manejadoresDeTiempoReal(conReload)
    const [segundo] = manejadoresDeTiempoReal(conRefresco)

    expect({
      veElReload: /location\s*\.\s*reload\s*\(/.test(primero?.cuerpo ?? ''),
      dejaElRefresco: /location\s*\.\s*reload\s*\(/.test(segundo?.cuerpo ?? ''),
      // Y que de verdad llegó hasta el final del manejador.
      leyoTodo: (primero?.cuerpo ?? '').includes('}'),
    }).toEqual({ veElReload: true, dejaElRefresco: false, leyoTodo: true })
  })
})
