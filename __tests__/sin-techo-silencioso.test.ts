import * as fs from 'fs'
import * as path from 'path'

import { sinComentarios } from '@/lib/testing/sin-comentarios'

/**
 * Ninguna pantalla esconde datos sin decirlo.
 *
 * ── El defecto ──────────────────────────────────────────────────────────────
 *
 * Una pantalla pide al servidor una página con un límite fijo y luego pagina
 * EN LOCAL sobre lo que trajo. El paginador cuenta las filas cargadas, así que
 * con 800 morosos enseñaba 50, decía «10 páginas» y no había forma de llegar a
 * la fila 51. Ni un aviso.
 *
 * Hoy no se nota —41 cuentas en mora, 67 créditos, 1 ruta— y por eso llevaba
 * meses ahí. Se nota el día que el cliente importe su cartera, que es justo
 * cuando nadie va a estar mirando el código.
 *
 * ── Qué se exige ────────────────────────────────────────────────────────────
 *
 * Si una pantalla combina un límite fijo en la petición con un paginador local,
 * tiene que hacer UNA de estas dos cosas:
 *
 *   - decir en pantalla que lo que se ve es un tope, comparando lo recibido
 *     contra el total que manda el servidor; o
 *   - pedir la página al servidor de verdad, pasándole `pagina`.
 *
 * `CuentasMoraFeature` es el ejemplo de lo primero.
 *
 * ── La lista de deuda tolerada ──────────────────────────────────────────────
 *
 * Las pantallas de `DEUDA_TOLERADA` tienen el defecto y están pendientes. La
 * lista está aquí, y no en un comentario, para que hacerla más corta sea un
 * cambio de código: el día que se arregle una, se quita de aquí y la prueba
 * exige que siga arreglada. Y si alguien añade una pantalla nueva con el mismo
 * patrón, esta prueba se pone roja sin que nadie se acuerde de mirar.
 *
 * **No se añade nada a esta lista para que una prueba pase.** Si aparece algo
 * nuevo, es un defecto nuevo.
 */

const RAIZ = process.cwd()

/** Pantallas que piden un bloque al servidor y paginan en local, sin avisar. */
const DEUDA_TOLERADA = [
  'app/admin/pagos/historial/page.tsx', // limit: 500 (pagos y gastos), pagina de 20
  'components/prestamos/ListadoPrestamos.tsx', // limite: 500
  'app/admin/creditos-articulos/page.tsx', // limit: 100
  'components/rutas/RutasPageView.tsx', // limit: 100, pagina de 9
  'components/dashboards/PuntoDeVentaFloatingActions.tsx', // dos paginadores
  'components/dashboards/admin/SeguimientoPuntoVenta.tsx',
  'components/reportes/DetalleReporteFinancieroModal.tsx',
]

const OMITIR = new Set(['node_modules', '.next', 'dist', 'coverage', '__tests__', 'e2e'])

const recorrer = (dir: string, acc: string[] = []): string[] => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.') || OMITIR.has(e.name)) continue
    const completo = path.join(dir, e.name)
    if (e.isDirectory()) recorrer(completo, acc)
    else if (e.name.endsWith('.tsx')) acc.push(completo)
  }
  return acc
}

/**
 * `limite: 50`, `limit: 500` o `limite: LIMITE_DE_LA_PETICION`.
 *
 * La constante cuenta igual que el número: el tope sigue siendo fijo. Y hace
 * falta reconocerla, porque al arreglar la pantalla de mora el 50 se convirtió
 * en una constante con su explicación, y el lector dejó de verla: la prueba de
 * «mora ya lo dice» se puso roja y asi se descubrio el agujero del lector.
 */
const LIMITE_FIJO = /\b(limite|limit)\s*:\s*(\d+|[A-Z][A-Z_]{3,})/
/** Un paginador que cuenta las filas que ya tiene en memoria. */
const PAGINA_EN_LOCAL = /Math\.ceil\(\s*\w+\.length\s*\/\s*\w+/
/** Lo que hace que el tope no sea silencioso. */
const LO_DICE = /totalRegistros|hayTope|\btope\b|de \$\{total/

describe('ninguna pantalla esconde datos sin decirlo', () => {
  const archivos = recorrer(RAIZ)

  it('la centinela está leyendo el proyecto', () => {
    // Piso medido el 2026-11-18: 308 archivos .tsx.
    expect(archivos.length).toBeGreaterThan(280)
  })

  const conTecho = archivos
    .map((f) => ({ f, codigo: sinComentarios(fs.readFileSync(f, 'utf8')) }))
    .filter(({ codigo }) => LIMITE_FIJO.test(codigo) && PAGINA_EN_LOCAL.test(codigo))
    .map(({ f, codigo }) => ({
      rel: path.relative(RAIZ, f).split(path.sep).join('/'),
      loDice: LO_DICE.test(codigo),
    }))

  it('encuentra el patrón: hay pantallas con límite fijo y paginador local', () => {
    // Si esto baja a cero, el lector dejó de reconocer el patrón y la prueba
    // de abajo pasaría sin mirar nada.
    expect(conTecho.length).toBeGreaterThanOrEqual(5)
  })

  it('ninguna pantalla NUEVA cae en el patrón sin avisar', () => {
    const nuevas = conTecho
      .filter((p) => !p.loDice)
      .filter((p) => !DEUDA_TOLERADA.includes(p.rel))
      .map((p) => p.rel)

    expect(nuevas).toEqual([])
  })

  it('la pantalla de mora ya lo dice, y es el ejemplo a seguir', () => {
    const mora = conTecho.find((p) => p.rel === 'components/cuentas/CuentasMoraFeature.tsx')
    expect(mora).toBeDefined()
    expect(mora?.loDice).toBe(true)
  })

  it('la deuda tolerada no crece a escondidas: las 7 siguen ahí o ya están arregladas', () => {
    // Una entrada que ya no existe —archivo renombrado o borrado— también hay
    // que quitarla, o la lista protege a un fantasma.
    const inexistentes = DEUDA_TOLERADA.filter(
      (rel) => !fs.existsSync(path.join(RAIZ, rel)),
    )
    expect(inexistentes).toEqual([])
    expect(DEUDA_TOLERADA.length).toBeLessThanOrEqual(7)
  })
})
