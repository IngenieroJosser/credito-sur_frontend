/**
 * La copia offline de un prestamo guardaba ceros y cadenas vacias.
 *
 * `syncManager.downloadPrestamos` corre en cada login y reemplaza el almacen local de
 * prestamos. Su mapeo leia claves que `GET /loans` no manda, asi que cuatro campos
 * quedaban SIEMPRE en cero o vacios, y descartaba una veintena que si venian.
 *
 * Se veia en tres pantallas, todas sin conexion:
 *
 *  - Cuentas vencidas: `saldoPendiente` y `montoOriginal` en $0 en toda la lista.
 *  - La ruta del cobrador: cuota y saldo en $0 en todos los clientes.
 *  - El listado de prestamos: cliente en blanco, pendiente en $0 y en VERDE (como si
 *    estuviera pagado) y "undefined/undefined cuotas".
 *
 * Estas pruebas fijan el mapeo contra la fila real del endpoint.
 */
jest.mock('@/lib/offline/offlineDb', () => ({
  offlineStore: {},
}))
jest.mock('@/lib/offline/offlineQueue', () => ({ offlineQueue: {} }))
jest.mock('@/lib/offline/offlineAnalytics', () => ({ trackOfflineEvent: jest.fn() }))
jest.mock('@/lib/offline/idRemap', () => ({
  remapearEndpoint: jest.fn(),
  remapearProfundo: jest.fn(),
  registrarMapeo: jest.fn(),
  extraerIdReal: jest.fn(),
  limpiarMapeos: jest.fn(),
  contieneTempIdSinResolver: jest.fn(),
}))
jest.mock('@/lib/api/api', () => ({ apiRequest: jest.fn() }))
jest.mock('@/lib/api/apiClient', () => ({ apiClient: {} }))
jest.mock('@/lib/auth/offlineAuth', () => ({ restoreOfflineSession: jest.fn() }))

import { mapearCuotaDescargada, mapearPrestamoDescargado } from '@/lib/offline/syncManager'

/**
 * Una fila tal como la arma `loans.service.ts:1960-1997`. Lo importante son los
 * nombres: `cliente` es TEXTO ya compuesto, el capital se llama `montoPrestado` (no
 * `monto`), el saldo `montoPendiente` (no `saldoPendiente`) y el total de cuotas
 * `cuotasTotales` (no `cantidadCuotas`).
 */
const filaDelListado = {
  id: 'prestamo-1',
  numeroPrestamo: 'PR-0001',
  clienteId: 'cliente-1',
  cliente: 'Ana Muñoz',
  clienteDni: '1098765432',
  clienteTelefono: '3001234567',
  producto: 'Nevera 220L',
  tipoProducto: 'articulo',
  tipoPrestamo: 'ARTICULO',
  montoTotal: 1_300_000,
  montoPrestado: 1_000_000,
  interesTotal: 300_000,
  montoPendiente: 780_000,
  montoPagado: 520_000,
  cuotaInicial: 100_000,
  valorCuota: 65_000,
  tasaInteres: 30,
  frecuenciaPago: 'SEMANAL',
  moraAcumulada: 15_000,
  cuotasPagadas: 8,
  cuotasTotales: 20,
  cuotasVencidas: 2,
  estado: 'ACTIVO',
  riesgo: 'AMARILLO',
  ruta: 'R-01',
  rutaNombre: 'Ruta Centro',
  vendedor: 'Luis',
  vendedorRol: 'COBRADOR',
  creadoPorRol: 'COBRADOR',
  fechaInicio: '2026-01-15',
  fechaFin: '2026-06-15',
  creadoEn: '2026-01-15T10:00:00.000Z',
  progreso: 40,
}

describe('mapearPrestamoDescargado: lo que estaba en cero', () => {
  it('el capital sale de montoPrestado, no de una clave que no llega', () => {
    // Antes: `Number(p.monto) || 0`, y la fila no trae `monto`.
    expect(filaDelListado).not.toHaveProperty('monto')
    expect(mapearPrestamoDescargado(filaDelListado).monto).toBe(1_000_000)
  })

  it('el saldo sale de montoPendiente, no de saldoPendiente', () => {
    // Antes: `Number(p.saldoPendiente) || 0`, y la fila no trae esa clave.
    expect(filaDelListado).not.toHaveProperty('saldoPendiente')
    const local = mapearPrestamoDescargado(filaDelListado)
    expect(local.saldoPendiente).toBe(780_000)
    // Se guardan los dos nombres: cada pantalla lee uno.
    expect(local.montoPendiente).toBe(780_000)
  })

  it('el total de cuotas sale de cuotasTotales, no de cantidadCuotas', () => {
    expect(filaDelListado).not.toHaveProperty('cantidadCuotas')
    const local = mapearPrestamoDescargado(filaDelListado)
    expect(local.cantidadCuotas).toBe(20)
    expect(local.cuotasTotales).toBe(20)
  })

  it('el nombre del cliente llega como texto, no como objeto', () => {
    // Antes: `p.cliente.nombres`, y `p.cliente` es un string. `'Ana Muñoz'.nombres`
    // es undefined, asi que quedaba cadena vacia en TODOS los prestamos.
    expect(typeof filaDelListado.cliente).toBe('string')
    const local = mapearPrestamoDescargado(filaDelListado)
    expect(local.clienteNombre).toBe('Ana Muñoz')
    expect(local.cliente).toBe('Ana Muñoz')
  })
})

describe('mapearPrestamoDescargado: lo que se descartaba', () => {
  const local = mapearPrestamoDescargado(filaDelListado)

  it('conserva las cuotas y el avance que el listado ya calculo', () => {
    expect(local.cuotasPagadas).toBe(8)
    expect(local.cuotasVencidas).toBe(2)
    expect(local.progreso).toBe(40)
  })

  it('conserva las cifras que las pantallas offline muestran', () => {
    expect(local.montoPagado).toBe(520_000)
    expect(local.interesTotal).toBe(300_000)
    expect(local.moraAcumulada).toBe(15_000)
    expect(local.valorCuota).toBe(65_000)
    expect(local.cuotaInicial).toBe(100_000)
    expect(local.montoTotal).toBe(1_300_000)
  })

  it('conserva el producto, el riesgo y la ruta', () => {
    expect(local.producto).toBe('Nevera 220L')
    expect(local.tipoProducto).toBe('articulo')
    expect(local.tipoPrestamo).toBe('ARTICULO')
    expect(local.riesgo).toBe('AMARILLO')
    expect(local.ruta).toBe('R-01')
    expect(local.rutaNombre).toBe('Ruta Centro')
  })

  it('conserva el documento y el telefono del cliente', () => {
    expect(local.clienteDni).toBe('1098765432')
    expect(local.clienteTelefono).toBe('3001234567')
  })
})

describe('mapearPrestamoDescargado: bordes', () => {
  it('una fila vacia no produce NaN ni "undefined"', () => {
    const local = mapearPrestamoDescargado({})
    for (const [clave, valor] of Object.entries(local)) {
      if (typeof valor === 'number') expect(Number.isNaN(valor)).toBe(false)
      if (typeof valor === 'string') expect(valor).not.toContain('undefined')
      expect(clave).toBeTruthy()
    }
    expect(local.monto).toBe(0)
    expect(local.clienteNombre).toBe('')
  })

  it('acepta tambien el cliente como objeto, por si otro origen alimenta el almacen', () => {
    const local = mapearPrestamoDescargado({
      ...filaDelListado,
      cliente: { nombres: 'Ana', apellidos: 'Muñoz' },
    })
    expect(local.clienteNombre).toBe('Ana Muñoz')
  })

  it('un objeto con otra forma no deja "[object Object]" en el nombre', () => {
    const local = mapearPrestamoDescargado({ ...filaDelListado, cliente: { razonSocial: 'X' } })
    expect(local.clienteNombre).toBe('')
  })

  it('los valores por omision son los de antes', () => {
    const local = mapearPrestamoDescargado({ id: 'p' })
    expect(local.frecuenciaPago).toBe('MENSUAL')
    expect(local.estado).toBe('PENDIENTE')
  })

  it('plazoMeses se queda en 0: el listado no lo manda', () => {
    expect(filaDelListado).not.toHaveProperty('plazoMeses')
    expect(mapearPrestamoDescargado(filaDelListado).plazoMeses).toBe(0)
  })
})

/**
 * El almacen local de cuotas NUNCA se llenaba.
 *
 * El bucle que lo llenaba leia `p.cuotas` de cada fila de `GET /loans`, y ese arreglo no
 * existe: el listado solo manda los conteos ya calculados. Asi que `allCuotas` quedaba
 * vacio, mientras el `saveMany('prestamos', ..., true)` del mismo metodo SI borra el
 * almacen `cuotas` en cada login. El detalle de prestamo sin conexion mostraba la tabla
 * de cuotas vacia siempre.
 *
 * Ahora se bajan de `/loans/:id/cuotas`, que devuelve las filas crudas de Prisma.
 */
describe('mapearCuotaDescargada', () => {
  /** Una fila tal como la devuelve `getLoanCuotas` (columnas de `model Cuota`). */
  const fila = {
    id: 'cuota-9',
    prestamoId: 'prestamo-1',
    numeroCuota: 9,
    fechaVencimiento: '2026-04-20',
    monto: 65_000,
    montoCapital: 50_000,
    montoInteres: 15_000,
    montoInteresMora: 1_200,
    estado: 'PARCIAL',
    montoPagado: 20_000,
    fechaPago: null,
    fechaVencimientoProrroga: '2026-04-27',
  }

  it('copia las columnas de la cuota', () => {
    const local = mapearCuotaDescargada(fila, 'prestamo-1')
    expect(local.id).toBe('cuota-9')
    expect(local.numeroCuota).toBe(9)
    expect(local.monto).toBe(65_000)
    expect(local.montoCapital).toBe(50_000)
    expect(local.montoInteres).toBe(15_000)
    expect(local.montoInteresMora).toBe(1_200)
    expect(local.estado).toBe('PARCIAL')
    expect(local.montoPagado).toBe(20_000)
    expect(local.fechaVencimiento).toBe('2026-04-20')
  })

  it('el prestamoId viene del argumento, no de la fila', () => {
    // `/loans/:id/cuotas` devuelve las cuotas de UN credito; el id lo sabe quien pide.
    const local = mapearCuotaDescargada({ ...fila, prestamoId: 'otro' }, 'prestamo-1')
    expect(local.prestamoId).toBe('prestamo-1')
  })

  it('guarda la fecha de prorroga: de ella depende el distintivo de prorroga', () => {
    expect(mapearCuotaDescargada(fila, 'p').fechaVencimientoProrroga).toBe('2026-04-27')
    expect(
      mapearCuotaDescargada({ ...fila, fechaVencimientoProrroga: null }, 'p')
        .fechaVencimientoProrroga,
    ).toBeNull()
  })

  it('una cuota sin pagar deja fechaPago en null, no en undefined', () => {
    expect(mapearCuotaDescargada(fila, 'p').fechaPago).toBeNull()
  })

  it('una fila vacia no produce NaN ni "undefined"', () => {
    const local = mapearCuotaDescargada({}, 'p')
    for (const valor of Object.values(local)) {
      if (typeof valor === 'number') expect(Number.isNaN(valor)).toBe(false)
      if (typeof valor === 'string') expect(valor).not.toContain('undefined')
    }
    expect(local.estado).toBe('PENDIENTE')
    expect(local.monto).toBe(0)
  })
})
