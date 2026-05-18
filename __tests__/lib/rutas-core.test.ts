import {
  computeRutaHoyUiStatsFromVisitas,
  resolveCobradorIdForRouteAction,
  shouldShowVisitaEnRutaHoy,
} from '@/lib/rutas-core'

describe('shouldShowVisitaEnRutaHoy', () => {
  it('oculta visitas futuras aunque pertenezcan al cobrador', () => {
    expect(
      shouldShowVisitaEnRutaHoy(
        {
          estado: 'pendiente',
          periodoRuta: 'DIA',
          proximaVisita: '2026-05-10',
          saldoTotal: 1900000,
          montoCuota: 63334,
        },
        '2026-05-09',
      ),
    ).toBe(false)
  })

  it('oculta visitas cuya cuota del dia ya quedo cubierta', () => {
    expect(
      shouldShowVisitaEnRutaHoy(
        {
          estado: 'pagado',
          periodoRuta: 'DIA',
          proximaVisita: '2026-05-09',
          saldoTotal: 1836666,
          montoCuota: 63334,
          recaudadoDelDia: 63334,
        },
        '2026-05-09',
      ),
    ).toBe(false)
  })

  it('mantiene visibles cuotas de hoy o vencidas con saldo pendiente', () => {
    expect(
      shouldShowVisitaEnRutaHoy(
        {
          estado: 'pendiente',
          periodoRuta: 'DIA',
          proximaVisita: '2026-05-09',
          saldoTotal: 1900000,
          montoCuota: 63334,
        },
        '2026-05-09',
      ),
    ).toBe(true)
  })

  it('mantiene visible una cuota parcialmente pagada si aun falta saldo de la cuota', () => {
    expect(
      shouldShowVisitaEnRutaHoy(
        {
          estado: 'en_mora',
          periodoRuta: 'DIA',
          proximaVisita: '2026-05-09',
          saldoTotal: 282000,
          montoCuota: 92000,
          montoCuotaPendiente: 2000,
          recaudadoDelDia: 90000,
        },
        '2026-05-09',
      ),
    ).toBe(true)
  })
})

describe('resolveCobradorIdForRouteAction', () => {
  it('usa el cobrador de la ruta para acciones hechas desde supervisor', () => {
    expect(resolveCobradorIdForRouteAction('cobrador-ruta', 'supervisor-1')).toBe('cobrador-ruta')
  })

  it('usa la sesion como respaldo cuando la ruta no tiene cobrador cargado', () => {
    expect(resolveCobradorIdForRouteAction(undefined, 'cobrador-1')).toBe('cobrador-1')
  })
})

describe('computeRutaHoyUiStatsFromVisitas', () => {
  it('calcula meta como pendiente visible mas recaudo del dia', () => {
    const stats = computeRutaHoyUiStatsFromVisitas(
      [
        { estado: 'pendiente', montoCuota: 180000, saldoTotal: 1180000 },
        { estado: 'pendiente', montoCuota: 180000, saldoTotal: 580000 },
        { estado: 'pendiente', montoCuota: 92000, saldoTotal: 282000 },
        { estado: 'pendiente', montoCuota: 4780000, saldoTotal: 5240000 },
        { estado: 'pendiente', montoCuota: 270000, saldoTotal: 1170000 },
      ],
      100000,
    )

    expect(stats.pendiente).toBe(5502000)
    expect(stats.recaudo).toBe(100000)
    expect(stats.meta).toBe(5602000)
  })

  it('no resta dos veces pagos cuando la cuota pendiente ya viene recalculada', () => {
    const stats = computeRutaHoyUiStatsFromVisitas([
      { estado: 'pendiente', montoCuotaPendiente: 80000, montoCuota: 180000, saldoTotal: 1180000, recaudadoDelDia: 100000 },
    ])

    expect(stats.pendiente).toBe(80000)
    expect(stats.recaudo).toBe(100000)
    expect(stats.meta).toBe(180000)
  })

  /**
   * Regresión: bug de objetivo inflado en el listado de rutas (2026-05-18).
   *
   * Causa raíz: el listado recalculaba metaDelDia desde visitas usando esta
   * función. Pero cuando cuota.montoPagado en BD aún no refleja el pago del día
   * (el backend lo actualiza de forma asíncrona), montoCuotaPendiente devuelto por
   * computeMontoExigibleHastaHoyFromCuotas incluye el monto ya cobrado, inflando la meta.
   *
   * Ejemplo real: pago de $822.000 procesado pero montoCuotaPendiente = $5.603.666
   * (sin descontar) → meta = $5.603.666 + $822.000 = $6.425.666 (incorrecto).
   * El backend en findAll usaba $5.603.666 (correcto).
   *
   * Solución: el listado usa r.metaDelDia del backend como fuente de verdad
   * y NO recalcula la meta desde visitas. Este test documenta la divergencia
   * para prevenir que se vuelva a agregar esa lógica.
   */
  it('produce meta inflada cuando montoCuotaPendiente incluye el pago del dia sin descontar', () => {
    const recaudadoDelDia = 822_000
    // montoCuotaPendiente NO descuenta aún el pago porque cuota.montoPagado no se actualizó
    const montoCuotaPendienteInflado = 5_603_666
    const saldoTotal = 5_240_000
    // La función limita cuotaUI = min(cuotaPendiente, saldoTotal)
    const pendienteEsperado = Math.min(montoCuotaPendienteInflado, saldoTotal) // 5.240.000
    const metaEsperada = pendienteEsperado + recaudadoDelDia // 6.062.000

    const stats = computeRutaHoyUiStatsFromVisitas([
      {
        estado: 'en_mora',
        montoCuota: montoCuotaPendienteInflado,
        montoCuotaPendiente: montoCuotaPendienteInflado,
        saldoTotal,
        recaudadoDelDia,
      },
    ])

    // La función produce 6.062.000 que DIFIERE del metaDelDia correcto del backend (5.603.666).
    // Por eso el listado de rutas usa r.metaDelDia del backend, no este resultado.
    expect(stats.meta).toBe(metaEsperada)
    expect(stats.meta).not.toBe(5_603_666) // no igual al valor correcto del backend
  })
})
