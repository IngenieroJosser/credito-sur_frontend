import { getBogotaRangeForFinancialPeriod } from './rutas-core'

describe('getBogotaRangeForFinancialPeriod', () => {
  it('calcula SEMANAL como últimos 7 días incluyendo hoy', () => {
    const now = new Date('2026-06-03T15:30:00-05:00')

    const range = getBogotaRangeForFinancialPeriod('SEMANAL', now)

    expect(range.inicio).toBe('2026-05-28T00:00:00.000-05:00')
    expect(range.fin).toBe('2026-06-03T15:30:00.000-05:00')
  })
})
