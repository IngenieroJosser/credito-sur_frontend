import { calcularResumenVentas } from '@/lib/creditos/ventas-resumen'

describe('calcularResumenVentas', () => {
  it('separa valor financiado, ventas contado y cuota inicial sin doble conteo', () => {
    const resumen = calcularResumenVentas([
      {
        tipo: 'CREDITO',
        monto: 1_200_000,
        cuotaInicial: 200_000,
      },
      {
        tipo: 'CONTADO',
        monto: 800_000,
        cuotaInicial: 800_000,
      },
      {
        tipo: 'CREDITO',
        monto: 600_000,
        cuotaInicial: 100_000,
      },
    ])

    expect(resumen).toEqual({
      totalFinanciado: 1_800_000,
      totalContado: 800_000,
      totalCuotaInicial: 300_000,
      totalOperaciones: 3,
    })
  })
})
