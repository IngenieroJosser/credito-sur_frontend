import {
  buildRecaudosHoyMapByPrestamoId,
  isPagoCierrePendiente,
  sumMontoTotalPagosByBogotaDateKey,
} from '@/lib/ruta-recaudos'

describe('ruta-recaudos', () => {
  it('excluye pagos CIERRE_PENDIENTE del recaudo operativo de hoy por prestamo', () => {
    const pagos = [
      {
        prestamoId: 'prestamo-1',
        fechaPago: '2026-05-31T10:00:00-05:00',
        montoTotal: 10000,
        origenGestion: 'CIERRE_PENDIENTE',
      },
      {
        prestamoId: 'prestamo-1',
        fechaPago: '2026-05-31T11:00:00-05:00',
        montoTotal: 15000,
        origenGestion: 'RUTA_HOY',
      },
    ]

    expect(buildRecaudosHoyMapByPrestamoId(pagos, '2026-05-31')).toEqual({
      'prestamo-1': 15000,
    })
  })

  it('permite sumar recaudo financiero del dia incluyendo regularizados', () => {
    const pagos = [
      {
        fechaPago: '2026-05-31T10:00:00-05:00',
        montoTotal: 10000,
        origenGestion: 'CIERRE_PENDIENTE',
      },
      {
        fechaPago: '2026-05-31T11:00:00-05:00',
        montoTotal: 15000,
        origenGestion: 'RUTA_HOY',
      },
    ]

    expect(isPagoCierrePendiente(pagos[0])).toBe(true)
    expect(sumMontoTotalPagosByBogotaDateKey(pagos, '2026-05-31')).toBe(25000)
    expect(
      sumMontoTotalPagosByBogotaDateKey(pagos, '2026-05-31', {
        includeCierrePendiente: false,
      }),
    ).toBe(15000)
  })
})
