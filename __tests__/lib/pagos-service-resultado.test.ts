import {
  debeReflejarPagoEnRuta,
  pagoQuedoPendienteRevision,
  type ResultadoPago,
} from '@/services/pagos-service'

describe('resultado de registro de pago en una ruta', () => {
  it('no refleja una transferencia que espera aprobacion', () => {
    const resultado: ResultadoPago = {
      pendingVerification: true,
      aprobacionId: 'aprobacion-1',
    }

    expect(pagoQuedoPendienteRevision(resultado)).toBe(true)
    expect(debeReflejarPagoEnRuta(resultado, false)).toBe(false)
  })

  it('refleja un pago aplicado y no una regularizacion de cierre en la ruta actual', () => {
    const resultado = { pago: { id: 'pago-1' } } as ResultadoPago

    expect(debeReflejarPagoEnRuta(resultado, false)).toBe(true)
    expect(debeReflejarPagoEnRuta(resultado, true)).toBe(false)
  })
})
