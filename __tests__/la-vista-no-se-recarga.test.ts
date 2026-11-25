import fs from 'fs'
import path from 'path'

/**
 * Ninguna pantalla recarga la vista para hacer su trabajo.
 *
 * ── Lo que lo motiva ───────────────────────────────────────────────────────
 *
 * Lo pidió el dueño: «de ser posible, en ninguna parte del sistema sea
 * necesario que se recargue la vista; eso es molesto». Una recarga tira el
 * scroll, los filtros, lo que hubiera a medio escribir y vuelve a descargar
 * toda la aplicación.
 *
 * El barrido encontró **once** sitios. Los que se arreglaron:
 *
 *   - `admin/notificaciones` y `admin/perfil`: el botón «Reintentar» hacía
 *     `window.location.reload()` para repetir UNA petición;
 *   - `admin/cuentas-mora/[id]` y `components/cuentas/DetalleCuentaVencida`:
 *     cambiaban de pantalla con `location.href` / `location.assign`. En el
 *     segundo, el comentario ya decía que se usaba el router y la línea de
 *     abajo seguía siendo `location.assign`: el arreglo estaba escrito y sin
 *     hacer;
 *   - `not-found`: volvía al inicio recargando.
 *
 * Y uno que no era una recarga pero sí un refresco inútil: `DashboardClient`
 * llamaba a `router.refresh()` —que re-renderiza componentes de servidor— en
 * un árbol donde los datos llegan como **prop desde una página cliente**. No
 * actualizaba nada, duplicaba la suscripción al socket que ya tiene el padre,
 * y provocaba un re-render visible. Ahora pide el refresco al padre, que es
 * quien tiene los datos.
 *
 * ── Las excepciones, y por qué cada una ───────────────────────────────────
 *
 * No todas las recargas sobran. Estas se quedan a propósito:
 */
const PERMITIDAS: Array<{ archivo: string; porque: string }> = [
  {
    archivo: 'app/contingencia/page.tsx',
    porque:
      'Es la pantalla de sin conexión: recargar es literalmente lo que se ' +
      'intenta para volver a estar en línea.',
  },
  {
    archivo: 'app/login/page.tsx',
    porque:
      'Tras entrar, una carga completa deja la aplicación limpia con la ' +
      'sesión nueva (sockets, cachés, permisos). Es la transición que la ' +
      'persona espera, no una pantalla que se recarga mientras trabaja.',
  },
  {
    archivo: 'lib/api/api.ts',
    porque:
      'Sesión caducada (401): se va a /login con una carga completa justo ' +
      'para no dejar estado viejo de la sesión anterior.',
  },
  {
    archivo: 'components/offline/OfflineIndicator.tsx',
    porque:
      'Después de BORRAR la copia local hay que repoblarla, y eso exige ' +
      'arrancar de cero. El botón ya avisa de que sin conexión te deja sin ' +
      'datos.',
  },
]

const RAIZ = process.cwd()
const CARPETAS = ['app', 'components', 'lib', 'hooks', 'services']

/** Igual que `sinComentarios`, pero también quita el texto de los strings. */
const codigoEfectivo = (fuente: string) =>
  fuente
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(new RegExp('\\/\\/[^\\n]*', 'g'), ' ')

const archivos: string[] = []
const recorrer = (dir: string) => {
  for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
    const completo = path.join(dir, entrada.name)
    if (entrada.isDirectory()) {
      if (entrada.name === 'node_modules' || entrada.name.startsWith('.')) continue
      recorrer(completo)
      continue
    }
    if (!/\.(ts|tsx)$/.test(entrada.name)) continue
    if (/\.(test|spec)\.tsx?$/.test(entrada.name)) continue
    archivos.push(completo)
  }
}
for (const carpeta of CARPETAS) {
  const dir = path.join(RAIZ, carpeta)
  if (fs.existsSync(dir)) recorrer(dir)
}

const RECARGA =
  /location\s*\.\s*reload\s*\(|location\s*\.\s*href\s*=|location\s*\.\s*assign\s*\(/

const hallazgos = archivos
  .map((completo) => ({
    archivo: path.relative(RAIZ, completo).replace(/\\/g, '/'),
    codigo: codigoEfectivo(fs.readFileSync(completo, 'utf8')),
  }))
  .filter((x) => RECARGA.test(x.codigo))
  .map((x) => x.archivo)

describe('ninguna pantalla recarga la vista para trabajar', () => {
  it('el barrido mira algo: hay archivos y alguna recarga permitida', () => {
    /*
     * Piso medido. Sin esto, un fallo al leer los archivos dejaría la lista
     * vacía y la prueba pasaría en verde sin haber mirado nada. Ya pasó varias
     * veces en este proyecto.
     */
    expect(archivos.length).toBeGreaterThan(300)
    expect(hallazgos.length).toBeGreaterThan(0)
  })

  it('solo recargan los sitios donde está justificado', () => {
    const permitidos = new Set(PERMITIDAS.map((p) => p.archivo))
    const inesperados = hallazgos.filter((a) => !permitidos.has(a))

    expect(inesperados).toEqual([])
  })

  it('y las excepciones siguen existiendo: la lista no se quedó obsoleta', () => {
    /*
     * Si una de las permitidas deja de recargar, hay que quitarla de la lista
     * en vez de dejar una excepción que ya no corresponde a nada.
     */
    for (const { archivo } of PERMITIDAS) {
      expect(fs.existsSync(path.join(RAIZ, archivo))).toBe(true)
      expect(hallazgos).toContain(archivo)
    }
  })
})

describe('el panel se refresca pidiendo los datos, no re-renderizando el servidor', () => {
  const CLIENTE = codigoEfectivo(
    fs.readFileSync(path.join(RAIZ, 'app', 'admin', 'dashboard-client.tsx'), 'utf8'),
  )

  it('ya no llama a `router.refresh()`', () => {
    /*
     * No actualizaba nada: `data` llega como prop desde una página que es
     * cliente entera, así que re-renderizar los componentes de servidor no
     * cambia el dato. Lo único que lograba era un re-render visible.
     */
    expect(CLIENTE.length).toBeGreaterThan(5_000)
    expect(CLIENTE).not.toMatch(/router\s*\.\s*refresh\s*\(/)
  })

  it('pide el refresco al padre, que es quien tiene los datos', () => {
    expect(CLIENTE).toMatch(/onDatosCambiados/)
  })

  it('y no se suscribe al socket por su cuenta: ya lo hace el padre', () => {
    // Tenerlo en los dos sitios era suscribirse dos veces al mismo evento.
    expect(CLIENTE).not.toMatch(/useRealtimeData/)
  })
})
