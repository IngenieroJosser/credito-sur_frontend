import { getLoanAmounts } from '@/lib/loan-calculations'

/**
 * Las dos cifras de un crédito, que NO son lo mismo.
 *
 * El propio módulo avisa de que confundirlas "infla o desinfla la cartera en
 * pantalla", y hasta ahora no había nada que lo impidiera: lo usan el estado de
 * cuenta del cobrador y el detalle del préstamo, las dos pantallas donde se le
 * dice a alguien cuánto debe.
 *
 * La diferencia está solo en la cuota inicial de un crédito de artículo: el
 * cliente ya la pagó, así que no se financia (fuera de `totalFinanciado`) pero
 * sí es parte de lo que costó el artículo (dentro de `totalContrato`).
 *
 * Estas pruebas no cambian ningún cálculo: lo dejan fijado.
 */
describe('getLoanAmounts', () => {
  describe('crédito de artículo', () => {
    const articulo = {
      tipoPrestamo: 'ARTICULO',
      monto: 500_000,
      cuotaInicial: 200_000,
      interesTotal: 145_000,
    }

    it('no financia la cuota inicial: el cliente ya la pagó', () => {
      expect(getLoanAmounts(articulo).totalFinanciado).toBe(645_000)
    })

    it('sí la cuenta en el valor del negocio completo', () => {
      expect(getLoanAmounts(articulo).totalContrato).toBe(845_000)
    })

    it('la diferencia entre las dos cifras es exactamente la cuota inicial', () => {
      const { totalContrato, totalFinanciado, cuotaInicial } =
        getLoanAmounts(articulo)
      expect(totalContrato - totalFinanciado).toBe(cuotaInicial)
    })

    it('reconoce el tipo sin importar como venga escrito', () => {
      expect(getLoanAmounts({ ...articulo, tipoPrestamo: 'articulo' }).isArticulo).toBe(true)
      expect(getLoanAmounts({ ...articulo, tipoPrestamo: 'Articulo' }).isArticulo).toBe(true)
    })
  })

  describe('préstamo en efectivo', () => {
    const efectivo = {
      tipoPrestamo: 'EFECTIVO',
      monto: 500_000,
      cuotaInicial: 200_000,
      interesTotal: 145_000,
    }

    it('ignora la cuota inicial: en efectivo no existe', () => {
      const { totalFinanciado, totalContrato } = getLoanAmounts(efectivo)
      expect(totalFinanciado).toBe(645_000)
      expect(totalContrato).toBe(645_000)
    })

    it('las dos cifras coinciden, aunque venga una cuota inicial suelta', () => {
      const { totalContrato, totalFinanciado } = getLoanAmounts(efectivo)
      expect(totalContrato).toBe(totalFinanciado)
    })
  })

  describe('datos incompletos o mal formados', () => {
    it('trata los ausentes como cero, no como NaN', () => {
      const r = getLoanAmounts({})
      expect(r.monto).toBe(0)
      expect(r.totalFinanciado).toBe(0)
      expect(r.totalContrato).toBe(0)
      expect(r.isArticulo).toBe(false)
    })

    it('acepta numeros que llegan como texto, que es como vienen de la API', () => {
      const r = getLoanAmounts({
        tipoPrestamo: 'ARTICULO',
        monto: '500000',
        cuotaInicial: '200000',
        interesTotal: '145000',
      })
      expect(r.totalFinanciado).toBe(645_000)
      expect(r.totalContrato).toBe(845_000)
    })

    it('un valor que no es numero no contamina el total', () => {
      const r = getLoanAmounts({
        tipoPrestamo: 'EFECTIVO',
        monto: 500_000,
        interesTotal: 'no-es-un-numero',
      })
      expect(Number.isNaN(r.totalFinanciado)).toBe(false)
      expect(r.totalFinanciado).toBe(500_000)
    })

    it('null y undefined valen cero', () => {
      const r = getLoanAmounts({
        tipoPrestamo: null,
        monto: null,
        cuotaInicial: undefined,
        interesTotal: null,
      })
      expect(r.totalFinanciado).toBe(0)
      expect(r.totalContrato).toBe(0)
    })
  })
})
