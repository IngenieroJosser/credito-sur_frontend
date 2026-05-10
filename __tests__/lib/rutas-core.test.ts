import { resolveCobradorIdForRouteAction, shouldShowVisitaEnRutaHoy } from '@/lib/rutas-core'

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
})

describe('resolveCobradorIdForRouteAction', () => {
  it('usa el cobrador de la ruta para acciones hechas desde supervisor', () => {
    expect(resolveCobradorIdForRouteAction('cobrador-ruta', 'supervisor-1')).toBe('cobrador-ruta')
  })

  it('usa la sesion como respaldo cuando la ruta no tiene cobrador cargado', () => {
    expect(resolveCobradorIdForRouteAction(undefined, 'cobrador-1')).toBe('cobrador-1')
  })
})
