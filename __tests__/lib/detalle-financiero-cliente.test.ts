import { textoCuotasDePagoCliente } from '@/lib/clientes/detalle-financiero'
import type { PagoDeCliente } from '@/services/clientes-service'

const pago = (detalles: PagoDeCliente['detalles']): PagoDeCliente => ({
  id: 'pago-1',
  numeroPago: 'PAG-1',
  fechaPago: '2026-11-18T10:00:00-05:00',
  montoTotal: '50000',
  metodoPago: 'EFECTIVO',
  detalles,
})

describe('textoCuotasDePagoCliente', () => {
  it('muestra todas las cuotas afectadas por el pago', () => {
    expect(
      textoCuotasDePagoCliente(
        pago([{ cuota: { numeroCuota: 2 } }, { cuota: { numeroCuota: 3 } }]),
      ),
    ).toBe('2, 3')
  })

  it('no inventa la cuota uno cuando falta el vinculo', () => {
    expect(textoCuotasDePagoCliente(pago([]))).toBe('—')
  })
})
