import * as fs from 'fs'
import * as path from 'path'

import { sinComentarios } from '@/lib/testing/sin-comentarios'

/**
 * La cola sin conexión no puede duplicar una operación de dinero.
 *
 * ── Cómo funciona, y por qué hace falta vigilarlo ───────────────────────────
 *
 * Cuando el cobrador está sin señal, la operación se guarda en IndexedDB y se
 * reenvía después. Si el primer intento llegó al servidor pero la respuesta se
 * perdió —lo normal con una señal mala—, el reintento la repite. Para que el
 * servidor sepa que es la misma, `enqueueOperation` estampa un
 * `idempotencyKey` **al encolar**, una sola vez, y todos los reintentos
 * mandan ese mismo. Esa es la razón de que exista la lista
 * `idempotentTypes`: si un tipo no está en ella, y su servicio tampoco genera
 * la clave, el reintento crea un duplicado.
 *
 * Y duplicar aquí no es un registro de más: es un pago contado dos veces, un
 * gasto que sale dos veces de la caja, o dos solicitudes de base aprobadas.
 *
 * ── Lo que se encontró midiendo ─────────────────────────────────────────────
 *
 * De los 49 tipos que alguien encola, 11 estaban marcados como idempotentes y
 * dos de esos 11 eran **fantasmas**: `cliente_crear` y `cliente_actualizar`, que
 * nadie encola nunca —los tipos de verdad son `cliente_create` y
 * `cliente_update`—. Una lista a mano con entradas que no existen es una lista
 * en la que nadie confía.
 *
 * Faltaba `prestamo_reprogramar`, que crea una APROBACIÓN: el backend ya la
 * deduplica por clave (`solicitarReprogramacion` busca
 * `aprobacion.findFirst({ where: { idempotencyKey } })` antes de crear) y las
 * cuatro pantallas que la llaman solo mandaban clave en el caso de cierre
 * pendiente.
 *
 * `base_solicitar` era §P10 y ya está cerrado: `solicitarBase` copió el patrón
 * del registro de gasto —busca la aprobación por `idempotencyKey` antes de
 * crearla— y el controlador declara el campo, que sin declarar no habría
 * llegado. Importa porque aprobar esa solicitud saca el monto de CAJA-OFICINA
 * y lo ingresa a la caja de ruta: duplicarla entrega la base dos veces.
 */

const RAIZ = process.cwd()
const SYNC = path.join(RAIZ, 'lib', 'offline', 'syncService.ts')

const fuenteSync = () => sinComentarios(fs.readFileSync(SYNC, 'utf8'))

/** Los tipos que la cola marca como idempotentes. */
const tiposMarcados = (): string[] => {
  const t = fuenteSync()
  const i = t.indexOf('const idempotentTypes')
  expect(i).toBeGreaterThan(0)
  const bloque = t.slice(i, t.indexOf(']', i))
  return [...bloque.matchAll(/'([^']+)'/g)].map((m) => m[1])
}

/** Los tipos que algún servicio encola de verdad. */
const tiposUsados = (): Map<string, string[]> => {
  const usados = new Map<string, string[]>()
  const OMITIR = new Set(['node_modules', '.next', 'dist', 'coverage', '__tests__', 'e2e'])

  const recorrer = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name.startsWith('.') || OMITIR.has(e.name)) continue
      const completo = path.join(dir, e.name)
      if (e.isDirectory()) recorrer(completo)
      else if (e.name.endsWith('.ts') || e.name.endsWith('.tsx')) {
        const codigo = sinComentarios(fs.readFileSync(completo, 'utf8'))
        for (const m of codigo.matchAll(/enqueueOperation\(\s*'([^']+)'/g)) {
          const rel = path.relative(RAIZ, completo).split(path.sep).join('/')
          usados.set(m[1], [...(usados.get(m[1]) || []), rel])
        }
      }
    }
  }
  recorrer(RAIZ)
  return usados
}

/**
 * Tipos que mueven dinero y NO necesitan estar en la lista, porque su propio
 * servicio ya genera la clave antes de encolar. Cada uno con dónde la genera,
 * para que se pueda comprobar.
 */
const GENERAN_SU_CLAVE: Record<string, string> = {
  pago: 'pagos-service.ts: `data.idempotencyKey || this.generarIdempotencyKey()`',
  caja_consolidar: 'contabilidad-service.ts: `buildRecolectarIdempotencyKey`',
  prestamo_create: 'prestamos-service.ts: `data.idempotencyKey || generarIdempotencyKey`',
}

/**
 * Lo que sigue pendiente, con su número de hallazgo. No se añade nada aquí para
 * que una prueba pase: si aparece un tipo nuevo, es un defecto nuevo.
 */
const PENDIENTE_CON_HALLAZGO: Record<string, string> = {
  /*
   * Estos dos NO están medidos como defecto, y por eso no se les estampó una
   * clave: el backend no la mira, así que ponerla no cambiaría ningún
   * resultado. Lo que falta es la medición, no el código:
   *
   *  - `arqueo_registrar`: un arqueo es el registro de un conteo de caja.
   *    Habría que ver si dos arqueos iguales descuadran algo o solo sobran.
   *  - `cierre_jornada_ruta`: cerrar dos veces la misma jornada. El servicio
   *    valida la ruta y el formato de la fecha, pero no se comprobó si rechaza
   *    una jornada ya cerrada.
   *
   * Si la medición dice que duplican algo, el camino es el mismo que se usó
   * para la reprogramación: clave en el backend primero, y luego aquí.
   */
  arqueo_registrar: 'P10b: sin medir si duplicarlo descuadra la caja',
  cierre_jornada_ruta: 'P10b: sin medir si rechaza una jornada ya cerrada',
}

describe('la cola sin conexión no duplica dinero', () => {
  it('la lista no tiene fantasmas: todo tipo marcado lo encola alguien', () => {
    const usados = tiposUsados()
    const fantasmas = tiposMarcados().filter((t) => !usados.has(t))

    // Eran dos, `cliente_crear` y `cliente_actualizar`, y por eso está esta
    // prueba: una lista con entradas que no existen no protege nada y hace
    // creer que sí.
    expect(fantasmas).toEqual([])
  })

  it('el lector está viendo la cola de verdad', () => {
    // Pisos medidos el 2026-11-19: 49 tipos encolados y 10 marcados.
    expect(tiposUsados().size).toBeGreaterThan(40)
    expect(tiposMarcados().length).toBeGreaterThan(8)
  })

  it('ningún tipo que mueve dinero se encola sin clave', () => {
    const PALABRAS_DE_DINERO = [
      'pago',
      'gasto',
      'base',
      'abono',
      'venta',
      'transacc',
      'consolid',
      'reprogram',
      'arqueo',
      'cierre',
    ]
    const marcados = new Set(tiposMarcados())
    const sinProteger: string[] = []

    for (const [tipo, donde] of tiposUsados()) {
      if (!PALABRAS_DE_DINERO.some((p) => tipo.toLowerCase().includes(p))) continue
      if (marcados.has(tipo)) continue
      if (GENERAN_SU_CLAVE[tipo]) continue
      if (PENDIENTE_CON_HALLAZGO[tipo]) continue
      sinProteger.push(`${tipo} (${donde[0]})`)
    }

    expect(sinProteger).toEqual([])
  })

  it('la reprogramación está protegida, que era la que faltaba', () => {
    expect(tiposMarcados()).toContain('prestamo_reprogramar')
  })
})
