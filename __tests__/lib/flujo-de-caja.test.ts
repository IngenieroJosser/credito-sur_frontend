import { deltaDeCaja } from '@/lib/contable/flujo-de-caja'

describe('movimientos de una caja concreta', () => {
  it('usa el efecto del asiento en esa caja, no su tipo ni el nombre del movimiento', () => {
    expect(deltaDeCaja({ tipo: 'TRANSFERENCIA', monto: 15_000_000, impactoCaja: 15_000_000 })).toBe(15_000_000)
    expect(deltaDeCaja({ tipo: 'TRANSFERENCIA', monto: 15_000_000, impactoCaja: -15_000_000 })).toBe(-15_000_000)
    expect(deltaDeCaja({ tipo: 'INGRESO', monto: 800_000, impactoCaja: 0, direction: 'IN' })).toBe(0)
  })

  it('interpreta transacciones antiguas sin adivinar el sentido de una transferencia', () => {
    expect(deltaDeCaja({ tipo: 'TRANSFERENCIA', numero: 'TRX-IN-0001', monto: 100 })).toBe(100)
    expect(deltaDeCaja({ tipo: 'TRANSFERENCIA', numero: 'TRX-OUT-0001', monto: 100 })).toBe(-100)
    expect(deltaDeCaja({ tipo: 'TRANSFERENCIA', numero: 'CONS-0001', monto: 100 })).toBeNull()
    expect(deltaDeCaja({ tipo: 'EGRESO', monto: 6_700_000 })).toBe(-6_700_000)
  })
})
