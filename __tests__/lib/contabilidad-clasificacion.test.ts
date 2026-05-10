import {
  esCuotaInicialContable,
  esEgresoOperativoContable,
  getEntradaCajaFisica,
  getEtiquetaMovimientoContable,
  getSalidaCajaFisica,
  esIngresoOperativoContable,
} from '@/lib/contabilidad-clasificacion'

describe('clasificacion contable de movimientos', () => {
  it('no trata reversos de venta de articulo como egresos operativos', () => {
    expect(esEgresoOperativoContable({
      tipo: 'EGRESO',
      tipoReferencia: 'AJUSTE',
      monto: 500000,
      accountCode: '3.4',
      accountName: 'Ingresos por Artículos',
    })).toBe(false)
  })

  it('no trata desembolsos de prestamo como gastos operativos', () => {
    expect(esEgresoOperativoContable({
      tipo: 'EGRESO',
      tipoReferencia: 'DESEMBOLSO',
      monto: 5000000,
      accountCode: '1.1.1',
      accountName: 'Caja Oficina Central',
    })).toBe(false)
  })

  it('separa cuota inicial de ingresos operativos', () => {
    const movimiento = {
      tipo: 'INGRESO',
      tipoReferencia: 'CUOTA_INICIAL',
      monto: 500000,
      accountCode: '1.1.1',
    }

    expect(esCuotaInicialContable(movimiento)).toBe(true)
    expect(esIngresoOperativoContable(movimiento)).toBe(false)
  })

  it('trata restauraciones de cuota inicial como cuota inicial y no como ingreso operativo', () => {
    const movimiento = {
      tipo: 'INGRESO',
      tipoReferencia: 'RESTAURACION_CUOTA_INICIAL',
      monto: 500000,
      accountCode: '1.1.1',
    }

    expect(esCuotaInicialContable(movimiento)).toBe(true)
    expect(esIngresoOperativoContable(movimiento)).toBe(false)
  })

  it('trata reversos de cuota inicial como parte del historial de cuotas iniciales y no como gasto', () => {
    const movimiento = {
      tipo: 'EGRESO',
      tipoReferencia: 'REVERSO_CUOTA_INICIAL',
      monto: 500000,
      accountCode: '1.1.1',
    }

    expect(esCuotaInicialContable(movimiento)).toBe(true)
    expect(esEgresoOperativoContable(movimiento)).toBe(false)
    expect(getEtiquetaMovimientoContable(movimiento).label).toBe('REVERSO CUOTA')
  })

  it('solo clasifica ingresos externos reales como ingreso operativo', () => {
    expect(esIngresoOperativoContable({
      tipo: 'INGRESO',
      tipoReferencia: 'INGRESO',
      monto: 8000000,
      accountCode: '3.3',
      accountName: 'Otros Ingresos Oper.',
    })).toBe(true)
  })

  it('etiqueta movimientos de caja sin confundirlos con ingresos o gastos', () => {
    expect(getEtiquetaMovimientoContable({
      tipo: 'EGRESO',
      tipoReferencia: 'AJUSTE',
      concepto: 'Reverso venta de artículo por archivo',
      monto: 500000,
      accountCode: '3.4',
      accountName: 'Ingresos por Artículos',
      impactoCaja: -500000,
    }).label).toBe('AJUSTE')

    expect(getEtiquetaMovimientoContable({
      tipo: 'EGRESO',
      tipoReferencia: 'DESEMBOLSO',
      concepto: 'Desembolso préstamo #PRES-000002',
      monto: 5000000,
      accountCode: '1.1.1',
    }).label).toBe('DESEMBOLSO')

    expect(getEtiquetaMovimientoContable({
      tipo: 'INGRESO',
      tipoReferencia: 'VENTA_ARTICULO',
      monto: 500000,
      accountCode: '3.4',
      accountName: 'Ingresos por Artículos',
    }).label).toBe('CUOTA INICIAL')
  })

  it('firma ajustes por impacto real de caja', () => {
    expect(getEtiquetaMovimientoContable({
      tipo: 'INGRESO',
      tipoReferencia: 'AJUSTE',
      concepto: 'Restauración venta de artículo',
      monto: 500000,
      accountCode: '1.1.1',
      impactoCaja: 500000,
    }).positivo).toBe(true)

    expect(getEtiquetaMovimientoContable({
      tipo: 'EGRESO',
      tipoReferencia: 'AJUSTE',
      concepto: 'Reverso venta de artículo',
      monto: 500000,
      accountCode: '1.1.1',
      impactoCaja: -500000,
    }).positivo).toBe(false)
  })

  it('calcula entradas y salidas fisicas para arqueo desde impactoCaja', () => {
    expect(getEntradaCajaFisica({ impactoCaja: 8500000 })).toBe(8500000)
    expect(getEntradaCajaFisica({ impactoCaja: -5500000 })).toBe(0)
    expect(getSalidaCajaFisica({ impactoCaja: -5500000 })).toBe(5500000)
    expect(getSalidaCajaFisica({ impactoCaja: 8500000 })).toBe(0)
  })
})
