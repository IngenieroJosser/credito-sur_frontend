import { calcularInteresPlano, calcularInteresSimple } from '@/lib/interes'

describe('Cálculo de interés (debe coincidir con el backend)', () => {
  describe('no pierde un peso por el error binario al truncar', () => {
    // Regresión: 29/100 se guarda como 0.28999999999999998, así que
    // 100 * (29/100) daba 28.999999999996 y al truncar quedaba en 28.
    it('capital 100 al 29% da 29, no 28', () => {
      expect(calcularInteresPlano(100, 29)).toBe(29)
      expect(calcularInteresSimple(100, 29, 1)).toBe(29)
    })

    it('otros casos que caen justo sobre un entero', () => {
      expect(calcularInteresPlano(1000, 2.3)).toBe(23)
      expect(calcularInteresPlano(500000, 29)).toBe(145000)
      expect(calcularInteresPlano(300, 33.33)).toBe(99) // exacto 99.99 -> trunca
    })
  })

  describe('interés plano: la tasa se aplica una sola vez', () => {
    it('no depende del plazo', () => {
      expect(calcularInteresPlano(500000, 10)).toBe(50000)
    })

    it('trunca los decimales en vez de redondear', () => {
      // 650.000 * 33,33% = 216.645 exacto
      expect(calcularInteresPlano(650000, 33.33)).toBe(216645)
      // 1000 * 2,35% = 23,5 -> trunca a 23, no redondea a 24
      expect(calcularInteresPlano(1000, 2.35)).toBe(23)
    })
  })

  describe('interés simple: la tasa se aplica por mes', () => {
    it('multiplica por los meses de plazo', () => {
      expect(calcularInteresSimple(500000, 10, 2)).toBe(100000)
    })

    it('cuenta mínimo un mes aunque el plazo venga en 0', () => {
      expect(calcularInteresSimple(500000, 10, 0)).toBe(50000)
    })
  })

  describe('bordes', () => {
    it('capital en 0 o negativo no genera interés', () => {
      expect(calcularInteresPlano(0, 29)).toBe(0)
      expect(calcularInteresSimple(-100, 29, 3)).toBe(0)
    })

    it('tasa en 0 no genera interés', () => {
      expect(calcularInteresPlano(500000, 0)).toBe(0)
      expect(calcularInteresSimple(500000, 0, 6)).toBe(0)
    })
  })
})
