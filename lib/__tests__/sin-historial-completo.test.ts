import * as fs from 'fs'
import * as path from 'path'
import { sinComentarios } from '@/lib/testing/sin-comentarios'

/**
 * Que ninguna pantalla se descargue el historial completo de pagos.
 *
 * ── Lo que pasaba ───────────────────────────────────────────────────────────
 *
 * `obtenerPagos({ limit: 5000 })` parece una petición; son veinticinco. El
 * servicio pide al backend de 200 en 200, así que con el historial lleno se
 * convierte en una ráfaga.
 *
 * Medido al entrar como cobrador con 64.088 pagos en la base de pruebas:
 *
 *     antes:  52 peticiones, 5.918 KB  (26 de ellas /payments?page=N)
 *     ahora:  28 peticiones,   220 KB
 *
 * En el teléfono del cobrador, con datos móviles, era el historial entero de
 * la financiera cada vez que abría la app, y crecía con cada pago registrado.
 *
 * Y era trabajo repetido: `getDailyVisits` ya cargaba los pagos de hoy de la
 * ruta para calcular su recaudo. Solo los agrupaba por cliente, y la pantalla
 * los necesita por crédito. Ahora el servidor los manda también por crédito,
 * en `prestamo.recaudadoHoy` y `prestamo.fechaUltimoPago`.
 *
 * ── Qué se exige ────────────────────────────────────────────────────────────
 *
 * Que una llamada a `obtenerPagos` con un límite grande venga acotada por
 * `prestamoId`, `clienteId`, `cobradorId`, `fechaOperativa` o `rutaId`. Pedir
 * muchos pagos DE UNA JORNADA o DE UN COBRADOR es razonable; pedir muchos
 * pagos de todo el sistema no.
 *
 * OJO con `rutaId`, que parece el filtro obvio y casi nunca lo es: la columna
 * `Pago.rutaId` se añadió en la migración `20260526190000_add_ruta_id_to_pago`
 * SIN relleno, así que todo pago anterior la tiene en NULL para siempre
 * —medido en la base de pruebas: 64.000 de 64.091—. `filterPagosDelDiaByRuta`
 * tiene un camino de respaldo por crédito justo para esos pagos; filtrar por
 * `rutaId` los escondería antes de que ese respaldo los viera, y el recaudo de
 * los días viejos saldría por debajo. Para acotar por jornada va
 * `fechaOperativa`, que el servidor cuenta igual que `daily-visits`.
 *
 * El límite de la medición, dicho explícitamente: esto lee el código, así que
 * solo ve las llamadas escritas como literal. Un filtro construido en tiempo
 * de ejecución no se distingue de ninguno.
 */

/**
 * Las dos llamadas que SIGUEN sin acotar, con el motivo.
 *
 * No son deuda por hacer: son los dos casos donde ningún filtro disponible da
 * el mismo número, y cambiarlos en silencio movería dinero en pantalla.
 *
 * Si se añade un agregado en el servidor que los cubra, se quitan de aquí.
 */
const EXCEPCIONES: Record<string, string> = {
  'components/dashboards/admin/SeguimientoPuntoVenta.tsx':
    'necesita la fecha del ÚLTIMO pago de cada crédito, que es de todo el ' +
    'historial y no de un día; y son créditos de punto de venta, que no ' +
    'tienen ruta.',
  // Anclada al ARCHIVO y no a la línea: estaba en `:544`, alguien añadió un
  // import arriba, la llamada bajó a la 545 y la excepción dejó de valer. La
  // prueba de más abajo lo cazó, que para eso está, pero el número de línea no
  // es un buen ancla para algo que vive meses.
  'app/coordinador/rutas/[id]/page.tsx':
    'la llamada de `pagosPorCliente` agrega el total pagado histórico por ' +
    'CLIENTE, no por crédito, así que no lo cubre `prestamo.recaudadoTotal` ' +
    'de `daily-visits`; acotar por cobrador o por día cambiaría ese total.',
}

const RAIZ = path.join(__dirname, '..', '..')

/** `obtenerPagos({ ... })`, con su objeto de filtros. */
const LLAMADA = /obtenerPagos\(\s*\{([^}]*)\}/g

/** Un límite que trae lo que haya: cualquier cosa por encima de 500. */
const LIMITE_GRANDE = /limit:\s*(\d+)/

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
  for (const base of ['app', 'components', 'lib', 'hooks', 'services']) {
    const dir = path.join(RAIZ, base)
    if (fs.existsSync(dir)) recorrer(dir)
  }
  return salida
}

describe('ninguna pantalla pide el historial completo de pagos', () => {
  it('toda petición de muchos pagos va acotada a una ruta, cliente o crédito', () => {
    const sinAcotar: string[] = []

    for (const archivo of fuentes()) {
      const fuente = sinComentarios(fs.readFileSync(archivo, 'utf8'))
      if (!fuente.includes('obtenerPagos(')) continue
      const relativo = path.relative(RAIZ, archivo).replace(/\\/g, '/')

      for (const hallado of fuente.matchAll(LLAMADA)) {
        const filtros = hallado[1]
        const limite = filtros.match(LIMITE_GRANDE)
        if (!limite || Number(limite[1]) <= 500) continue

        const acotada =
          /\brutaId\b/.test(filtros) ||
          /\bclienteId\b/.test(filtros) ||
          /\bprestamoId\b/.test(filtros) ||
          /\bcobradorId\b/.test(filtros) ||
          /\bfechaOperativa\b/.test(filtros)
        if (acotada) continue

        const linea = fuente.slice(0, hallado.index).split('\n').length
        if (EXCEPCIONES[relativo] || EXCEPCIONES[`${relativo}:${linea}`]) continue
        sinAcotar.push(`${relativo}:${linea} -> limit ${limite[1]} sin filtro`)
      }
    }

    const informe = sinAcotar.length
      ? [
          'Estas llamadas piden muchos pagos sin acotarlos. `obtenerPagos` pide',
          'al backend de 200 en 200, así que con el historial lleno son decenas',
          'de peticiones y megas de datos en el teléfono del cobrador:',
          '',
          ...sinAcotar.map((s) => `  - ${s}`),
          '',
          'Acota con `rutaId`, `clienteId` o `prestamoId`. Y si solo hacen falta',
          'el recaudo de hoy o la fecha del último pago, el servidor ya los',
          'manda por crédito en `prestamo.recaudadoHoy` y',
          '`prestamo.fechaUltimoPago` de `daily-visits`.',
        ].join('\n')
      : 'ninguna'

    expect(informe).toBe('ninguna')
  })

  it('cada excepción sigue correspondiendo a una llamada real sin acotar', () => {
    // Sin esto la lista de excepciones se podría quedar tapando llamadas que ya
    // no existen, y mañana taparía una nueva que cayera en la misma línea.
    const vistas = new Set<string>()

    for (const archivo of fuentes()) {
      const fuente = sinComentarios(fs.readFileSync(archivo, 'utf8'))
      if (!fuente.includes('obtenerPagos(')) continue
      const relativo = path.relative(RAIZ, archivo).replace(/\\/g, '/')

      for (const hallado of fuente.matchAll(LLAMADA)) {
        const filtros = hallado[1]
        const limite = filtros.match(LIMITE_GRANDE)
        if (!limite || Number(limite[1]) <= 500) continue
        const acotada =
          /\brutaId\b/.test(filtros) ||
          /\bclienteId\b/.test(filtros) ||
          /\bprestamoId\b/.test(filtros) ||
          /\bcobradorId\b/.test(filtros) ||
          /\bfechaOperativa\b/.test(filtros)
        if (acotada) continue

        const linea = fuente.slice(0, hallado.index).split('\n').length
        vistas.add(relativo)
        vistas.add(`${relativo}:${linea}`)
      }
    }

    const sobrantes = Object.keys(EXCEPCIONES).filter((k) => !vistas.has(k))
    const informe = sobrantes.length
      ? [
          'Estas excepciones ya no corresponden a ninguna llamada sin acotar.',
          'Quítalas de EXCEPCIONES: si se quedan, mañana tapan una nueva.',
          '',
          ...sobrantes.map((s) => `  - ${s}`),
        ].join('\n')
      : 'ninguna'

    expect(informe).toBe('ninguna')
  })

  it('no queda ningún console.table sobre la lista completa de pagos', () => {
    // Había uno con TODOS los pagos en la pantalla del cobrador. Con 64.088 en
    // la base son 64.088 filas a la consola del navegador en cada refresco de
    // la ruta, y el navegador se queda pegado: la consola guarda cada fila para
    // poder mostrarla. Era depuración que se quedó.
    //
    // Lo que se vigila es ESE caso: un `console.table` sobre una variable que
    // tiene el historial de pagos. Quedan otros `console.table` sobre listas
    // del tamaño de una ruta (visitas, cajas, kpiItems: decenas de filas), y no
    // los cuenta esta prueba porque no son lo que se midió. Son depuración que
    // viaja a producción, eso sí, y solo uno está detrás de un
    // `NODE_ENV !== 'production'`.
    const NOMBRES_DE_PAGOS =
      /console\.table\(\s*\(?\s*(pagos|todosPagos|pagosData|pagosRecientes|pagosDeLaRuta|pagosCache)\b/
    const culpables: string[] = []

    for (const archivo of fuentes()) {
      const fuente = sinComentarios(fs.readFileSync(archivo, 'utf8'))
      const relativo = path.relative(RAIZ, archivo).replace(/\\/g, '/')
      // Se busca sobre el texto entero y no línea a línea: la llamada suele
      // partirse en varias líneas, con la variable en la siguiente.
      for (const hallado of fuente.matchAll(new RegExp(NOMBRES_DE_PAGOS, 'g'))) {
        const linea = fuente.slice(0, hallado.index).split('\n').length
        culpables.push(`${relativo}:${linea} -> console.table(${hallado[1]})`)
      }
    }

    const informe = culpables.length
      ? `console.table sobre el historial de pagos en:\n${culpables
          .map((c) => `  - ${c}`)
          .join('\n')}`
      : 'ninguno'

    expect(informe).toBe('ninguno')
  })
})
