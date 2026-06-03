import {
  buildRecaudosHoyMapByPrestamoId,
  isPagoCierrePendiente,
  mergeVisitasPreservingLocalRecaudo,
  sumMontoTotalPagosByBogotaDateKey,
} from '@/lib/ruta-recaudos'
import {
  computeRutaHoyUiStatsFromVisitas,
  shouldExcludeVisitaFromOperationalMeta,
} from '@/lib/rutas-core'

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

  it('preserva el recaudo local si un refresh llega antes de que pagos refleje el pago de un ausente', () => {
    const local = [
      {
        id: 'visita-1',
        prestamoId: 'prestamo-1',
        clienteId: 'cliente-1',
        estado: 'pagado',
        estadoVisita: undefined,
        montoCuota: 425335,
        montoCuotaPendiente: 425335,
        saldoTotal: 425335,
        recaudadoDelDia: 425335,
        recaudadoTotalClient: 425335,
      },
      {
        id: 'visita-2',
        prestamoId: 'prestamo-2',
        clienteId: 'cliente-2',
        estado: 'pendiente',
        montoCuota: 564998,
        montoCuotaPendiente: 564998,
        saldoTotal: 564998,
        recaudadoDelDia: 0,
      },
    ]

    const backendRefresh = [
      {
        id: 'visita-1',
        prestamoId: 'prestamo-1',
        clienteId: 'cliente-1',
        estado: 'ausente',
        estadoVisita: 'ausente',
        montoCuota: 425335,
        montoCuotaPendiente: 425335,
        saldoTotal: 425335,
        recaudadoDelDia: 0,
        recaudadoTotalClient: 0,
      },
      {
        id: 'visita-2',
        prestamoId: 'prestamo-2',
        clienteId: 'cliente-2',
        estado: 'pendiente',
        montoCuota: 564998,
        montoCuotaPendiente: 564998,
        saldoTotal: 564998,
        recaudadoDelDia: 0,
      },
    ]

    const merged = mergeVisitasPreservingLocalRecaudo(local, backendRefresh)
    const operativas = merged.filter((v) => !shouldExcludeVisitaFromOperationalMeta(v))
    const stats = computeRutaHoyUiStatsFromVisitas(operativas, 0)

    expect(merged[0].recaudadoDelDia).toBe(425335)
    expect(shouldExcludeVisitaFromOperationalMeta(merged[0])).toBe(false)
    expect(stats.recaudo).toBe(425335)
    expect(stats.pendiente).toBe(564998)
    expect(stats.meta).toBe(990333)
  })
})
