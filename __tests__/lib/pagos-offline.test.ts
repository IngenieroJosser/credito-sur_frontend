/**
 * Registrar un pago sin conexion no inventa el desglose.
 *
 * Antes el camino offline devolvia un `descomposicion` con todo en cero y el
 * comentario "No se puede calcular offline". La pantalla de registrar pago lo
 * pintaba tal cual, asi que el cajero veia "Capital recuperado $0, Interes
 * recuperado $0, Saldo anterior $0, Nuevo saldo $0" sobre un credito con saldo
 * real, dentro de un panel verde titulado "Resumen del Pago".
 *
 * El reparto entre capital, interes y mora lo decide el backend al aplicar el
 * pago, asi que sin conexion no existe: la respuesta trae el pago optimista con
 * `esOffline` y sin desglose, y la pantalla dice que quedo en la cola.
 */
const enqueueOperation = jest.fn().mockResolvedValue({ id: 'q1' })
jest.mock('@/lib/offline/syncService', () => ({
  syncService: { enqueueOperation: (...a: unknown[]) => enqueueOperation(...a) },
}))

const apiRequest = jest.fn()
jest.mock('@/lib/api/api', () => ({
  apiRequest: (...a: unknown[]) => apiRequest(...a),
}))

import { pagosService } from '@/services/pagos-service'
import { MetodoPago } from '@/types/enums'

/** Lo que `apiRequest` lanza cuando no hay red: `statusCode` en 0. */
const errorDeRed = () => Object.assign(new Error('Network Error'), { statusCode: 0 })

const datosPago = {
  prestamoId: 'prestamo-1',
  clienteId: 'cliente-1',
  cobradorId: 'cobrador-1',
  montoTotal: 50_000,
  metodoPago: MetodoPago.EFECTIVO,
}

describe('pagosService.registrarPago sin conexion', () => {
  beforeEach(() => {
    enqueueOperation.mockClear()
    apiRequest.mockReset()
  })

  it('no devuelve un desglose inventado', async () => {
    apiRequest.mockRejectedValue(errorDeRed())

    const resultado = await pagosService.registrarPago(datosPago)

    expect(resultado.descomposicion).toBeUndefined()
  })

  it('marca la respuesta como offline para que la pantalla lo pueda decir', async () => {
    apiRequest.mockRejectedValue(errorDeRed())

    const resultado = await pagosService.registrarPago(datosPago)

    expect(resultado.esOffline).toBe(true)
  })

  it('devuelve el pago optimista con el monto y un id temporal', async () => {
    apiRequest.mockRejectedValue(errorDeRed())

    const resultado = await pagosService.registrarPago(datosPago)

    expect(resultado.pago).toMatchObject({
      montoTotal: 50_000,
      prestamoId: 'prestamo-1',
      clienteId: 'cliente-1',
      numeroPago: 'OFFLINE',
    })
    expect(resultado.pago?.id).toMatch(/^temp-pay-/)
  })

  it('encola el pago una sola vez', async () => {
    apiRequest.mockRejectedValue(errorDeRed())

    await pagosService.registrarPago(datosPago)

    expect(enqueueOperation).toHaveBeenCalledTimes(1)
    expect(enqueueOperation.mock.calls[0][0]).toBe('pago')
  })

  it('pone una clave de idempotencia para que el reintento no cobre dos veces', async () => {
    apiRequest.mockRejectedValue(errorDeRed())

    await pagosService.registrarPago(datosPago)

    const payloadEncolado = enqueueOperation.mock.calls[0][3] as { idempotencyKey?: string }
    expect(payloadEncolado.idempotencyKey).toBeTruthy()
  })

  it('respeta la clave que ya venia, no la reemplaza', async () => {
    apiRequest.mockRejectedValue(errorDeRed())

    await pagosService.registrarPago({ ...datosPago, idempotencyKey: 'clave-del-cierre' })

    const payloadEncolado = enqueueOperation.mock.calls[0][3] as { idempotencyKey?: string }
    expect(payloadEncolado.idempotencyKey).toBe('clave-del-cierre')
  })

  it('un error que no es de red se relanza y no se encola', async () => {
    apiRequest.mockRejectedValue(
      Object.assign(new Error('Monto mayor al saldo'), { statusCode: 400 }),
    )

    await expect(pagosService.registrarPago(datosPago)).rejects.toThrow('Monto mayor al saldo')
    expect(enqueueOperation).not.toHaveBeenCalled()
  })
})

describe('pagosService.registrarPago en linea', () => {
  beforeEach(() => {
    enqueueOperation.mockClear()
    apiRequest.mockReset()
  })

  it('pasa el desglose del backend tal como viene', async () => {
    const delBackend = {
      pago: { id: 'pago-1', montoTotal: 50_000 },
      descomposicion: {
        montoTotal: 50_000,
        capitalRecuperado: 40_000,
        interesRecuperado: 10_000,
        saldoAnterior: 500_000,
        saldoNuevo: 460_000,
        cuotasAfectadas: 1,
        prestamoQuedaPagado: false,
      },
    }
    apiRequest.mockResolvedValue(delBackend)

    const resultado = await pagosService.registrarPago(datosPago)

    expect(resultado.descomposicion).toEqual(delBackend.descomposicion)
    expect(resultado.esOffline).toBeUndefined()
    expect(enqueueOperation).not.toHaveBeenCalled()
  })

  it('acepta la respuesta de una transferencia que quedo en revision, sin desglose', async () => {
    // Segunda forma real de `POST /payments`: el pago no se aplico a ninguna
    // cuota todavia, asi que no hay nada que repartir.
    apiRequest.mockResolvedValue({
      pendingVerification: true,
      aprobacionId: 'apr-1',
      idempotentReplay: true,
      message: 'Pago por transferencia ya estaba enviado a revisiones.',
    })

    const resultado = await pagosService.registrarPago({
      ...datosPago,
      metodoPago: MetodoPago.TRANSFERENCIA,
    })

    expect(resultado.pendingVerification).toBe(true)
    expect(resultado.aprobacionId).toBe('apr-1')
    expect(resultado.descomposicion).toBeUndefined()
  })
})
