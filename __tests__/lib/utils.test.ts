import {
  formatMilesCOP,
  getDisplayedCOPInteger,
  isSameDisplayedCOPAmount,
  parseCOPInputToNumber,
} from '@/lib/utils'

describe('utilidades COP', () => {
  it('compara pagos contra el mismo entero COP mostrado al usuario', () => {
    const cuotaInterna = 63333.333333333336

    expect(formatMilesCOP(cuotaInterna)).toBe('63.333')
    expect(getDisplayedCOPInteger(cuotaInterna)).toBe(63333)
    expect(parseCOPInputToNumber('63.333')).toBe(63333)
    expect(isSameDisplayedCOPAmount(63333, cuotaInterna)).toBe(true)
  })

  it('mantiene rechazo para valores diferentes al pago esperado mostrado', () => {
    const cuotaInterna = 63333.333333333336

    expect(isSameDisplayedCOPAmount(63334, cuotaInterna)).toBe(false)
    expect(isSameDisplayedCOPAmount(63332, cuotaInterna)).toBe(false)
  })
})
