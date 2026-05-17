import {
  formatLoanTerm,
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

describe('formatLoanTerm', () => {
  it('muestra cuotas diarias como días, no como meses decimales', () => {
    expect(formatLoanTerm({
      plazoMeses: 0.4,
      cantidadCuotas: 12,
      frecuenciaPago: 'DIARIO',
    })).toBe('12 días')
  })

  it('muestra cuotas semanales y quincenales con su unidad natural', () => {
    expect(formatLoanTerm({
      plazoMeses: 0.75,
      cantidadCuotas: 3,
      frecuenciaPago: 'SEMANAL',
    })).toBe('3 semanas')

    expect(formatLoanTerm({
      plazoMeses: 1,
      cantidadCuotas: 2,
      frecuenciaPago: 'QUINCENAL',
    })).toBe('2 quincenas')
  })

  it('mantiene meses cuando la frecuencia es mensual', () => {
    expect(formatLoanTerm({
      plazoMeses: 6,
      cantidadCuotas: 6,
      frecuenciaPago: 'MENSUAL',
    })).toBe('6 meses')
  })
})
