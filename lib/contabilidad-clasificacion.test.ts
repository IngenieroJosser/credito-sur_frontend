import { esIngresoContableGeneral } from './contabilidad-clasificacion'

describe('esIngresoContableGeneral', () => {
  it('incluye ingresos contables reales del panel contable', () => {
    expect(
      esIngresoContableGeneral({
        tipo: 'INGRESO',
        monto: 20000000,
        accountCode: '3.3',
        accountName: 'Otros Ingresos Oper.',
      }),
    ).toBe(true)

    expect(
      esIngresoContableGeneral({
        tipo: 'INGRESO',
        monto: 30517,
        accountCode: '3.1',
        accountName: 'Ingresos por Intereses',
      }),
    ).toBe(true)
  })

  it('excluye entradas de caja, cuotas iniciales y movimientos sin ingreso contable real', () => {
    expect(
      esIngresoContableGeneral({
        tipo: 'INGRESO',
        monto: 10000000,
        accountCode: '1.1.1',
        accountName: 'Caja Oficina Central',
      }),
    ).toBe(false)

    expect(
      esIngresoContableGeneral({
        tipo: 'INGRESO',
        tipoReferencia: 'CUOTA_INICIAL',
        monto: 500000,
        accountCode: '3.4',
        accountName: 'Ingresos por Artículos',
      }),
    ).toBe(false)

    expect(
      esIngresoContableGeneral({
        tipo: 'INGRESO',
        monto: 0,
        accountCode: '3.4',
        accountName: 'Ingresos por Artículos',
      }),
    ).toBe(false)

    expect(
      esIngresoContableGeneral({
        tipo: 'EGRESO',
        monto: 20000,
        accountCode: '4.1',
        accountName: 'Gastos de Ruta',
      }),
    ).toBe(false)
  })
})
