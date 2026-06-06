import {
  buildRegularizedPaymentTarget,
  computeRutaHoyUiStatsFromVisitas,
  resolveRutaHoyKpiStats,
  shouldExcludeVisitaFromOperationalMeta,
  shouldIncludeVisitaInRutaHoyKpis,
  esDomingoBogota,
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

describe('buildRegularizedPaymentTarget', () => {
  it('abre el pago regularizado con la cuota objetivo historica en lugar de la cuota actual', () => {
    const target = buildRegularizedPaymentTarget({
      rutaId: 'ruta-3',
      cliente: {
        clienteId: 'cliente-1',
        estadoGestion: 'PENDIENTE',
        recaudadoDelDia: 0,
        prestamoObjetivoId: 'prestamo-historico',
        cuotaObjetivoId: 'cuota-16',
        cuotaObjetivo: {
          id: 'cuota-16',
          numeroCuota: 16,
          estadoActual: 'PENDIENTE',
          fechaVencimiento: '2026-05-27',
          fechaEfectiva: '2026-05-27',
          montoCuota: 10000,
          montoPagado: 0,
          saldoCuota: 10000,
          saldoExigibleEnFechaOperativa: 10000,
          enMoraEnFechaOperativa: false,
          puedePagar: true,
          puedeReprogramar: false,
        },
      },
      visitaBase: {
        clienteId: 'cliente-1',
        prestamoId: 'prestamo-actual',
        cuotaActual: 20,
        montoCuota: 70000,
        montoCuotaPendiente: 70000,
        saldoTotal: 70000,
        proximaVisita: '2026-05-30',
      },
      contextoRegularizacion: {
        fechaOperativa: '2026-05-27',
        origenGestion: 'CIERRE_PENDIENTE',
      },
    })

    expect(target.error).toBeUndefined()
    expect(target.visitaRegularizada).toMatchObject({
      prestamoId: 'prestamo-historico',
      cuotaActual: 16,
      montoCuota: 10000,
      montoCuotaPendiente: 10000,
      saldoTotal: 10000,
      proximaVisita: '2026-05-27',
    })
    expect(target.contextoPagoRegularizado).toMatchObject({
      rutaId: 'ruta-3',
      clienteId: 'cliente-1',
      prestamoId: 'prestamo-historico',
      cuotaId: 'cuota-16',
      cuotaNumeroEsperada: 16,
      montoCuotaEsperado: 10000,
      fechaOperativaRuta: '2026-05-27',
      origenGestion: 'CIERRE_PENDIENTE',
    })
  })

  it('usa el saldo operativo acumulado de la jornada para pagos regularizados diarios', () => {
    const target = buildRegularizedPaymentTarget({
      rutaId: 'ruta-3',
      cliente: {
        clienteId: 'cliente-1',
        estadoGestion: 'PENDIENTE',
        recaudadoDelDia: 0,
        saldoOperativoJornada: 916664,
        prestamoObjetivoId: 'prestamo-historico',
        cuotaObjetivoId: 'cuota-1',
        cuotaObjetivo: {
          id: 'cuota-1',
          numeroCuota: 1,
          estadoActual: 'PENDIENTE',
          fechaVencimiento: '2026-06-02',
          fechaEfectiva: '2026-06-02',
          montoCuota: 458332,
          montoPagado: 0,
          saldoCuota: 458332,
          saldoExigibleEnFechaOperativa: 458332,
          enMoraEnFechaOperativa: true,
          puedePagar: true,
          puedeReprogramar: false,
        },
      },
      visitaBase: {
        clienteId: 'cliente-1',
        prestamoId: 'prestamo-actual',
        cuotaActual: 1,
        montoCuota: 458332,
        montoCuotaPendiente: 458332,
        saldoTotal: 916664,
        proximaVisita: '2026-06-02',
      },
      contextoRegularizacion: {
        fechaOperativa: '2026-06-03',
        origenGestion: 'CIERRE_PENDIENTE',
      },
    })

    expect(target.error).toBeUndefined()
    expect(target.contextoPagoRegularizado).toMatchObject({
      montoCuotaEsperado: 916664,
      cuotaId: 'cuota-1',
      fechaOperativaRuta: '2026-06-03',
    })
    expect(target.visitaRegularizada).toMatchObject({
      montoCuota: 916664,
      montoCuotaPendiente: 916664,
      saldoTotal: 916664,
    })
  })

  it('mantiene compatibilidad si prestamos no trae saldo operativo calculado', () => {
    const target = buildRegularizedPaymentTarget({
      rutaId: 'ruta-3',
      cliente: {
        clienteId: 'cliente-1',
        estadoGestion: 'PENDIENTE',
        recaudadoDelDia: 0,
        prestamos: [{ id: 'prestamo-historico' }],
        prestamoObjetivoId: 'prestamo-historico',
        cuotaObjetivoId: 'cuota-16',
        cuotaObjetivo: {
          id: 'cuota-16',
          numeroCuota: 16,
          estadoActual: 'PENDIENTE',
          fechaVencimiento: '2026-05-27',
          fechaEfectiva: '2026-05-27',
          montoCuota: 10000,
          montoPagado: 0,
          saldoCuota: 10000,
          saldoExigibleEnFechaOperativa: 10000,
          enMoraEnFechaOperativa: false,
          puedePagar: true,
          puedeReprogramar: false,
        },
      },
      visitaBase: {
        clienteId: 'cliente-1',
        prestamoId: 'prestamo-actual',
        cuotaActual: 20,
        montoCuota: 70000,
        montoCuotaPendiente: 70000,
        saldoTotal: 70000,
        proximaVisita: '2026-05-30',
      },
      contextoRegularizacion: {
        fechaOperativa: '2026-05-27',
        origenGestion: 'CIERRE_PENDIENTE',
      },
    })

    expect(target.error).toBeUndefined()
    expect(target.contextoPagoRegularizado).toMatchObject({
      montoCuotaEsperado: 10000,
    })
  })
})

describe('esDomingoBogota', () => {
  it('detecta domingo en zona horaria de Bogota', () => {
    expect(esDomingoBogota(new Date('2026-05-31T12:00:00.000Z'))).toBe(true)
  })

  it('no marca lunes como domingo', () => {
    expect(esDomingoBogota(new Date('2026-06-01T12:00:00.000Z'))).toBe(false)
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

  it('reincorpora a meta y recaudo un cliente ausente cuando registra pago hoy', () => {
    const visitas = [
      { estado: 'pendiente', montoCuota: 564_998, saldoTotal: 564_998 },
      { estado: 'ausente', estadoVisita: 'ausente', montoCuota: 425_335, saldoTotal: 425_335, recaudadoDelDia: 425_335 },
    ]

    const visitasOperativas = visitas.filter((v) => !shouldExcludeVisitaFromOperationalMeta(v))
    const stats = computeRutaHoyUiStatsFromVisitas(visitasOperativas)

    expect(stats.recaudo).toBe(425_335)
    expect(stats.pendiente).toBe(564_998)
    expect(stats.meta).toBe(990_333)
  })

  it('excluye de meta a un cliente ausente mientras no tenga pago operativo', () => {
    const visitas = [
      { estado: 'pendiente', montoCuota: 564_998, saldoTotal: 564_998 },
      { estado: 'ausente', estadoVisita: 'ausente', montoCuota: 425_335, saldoTotal: 425_335, recaudadoDelDia: 0 },
    ]

    const visitasOperativas = visitas.filter((v) => !shouldExcludeVisitaFromOperationalMeta(v))
    const stats = computeRutaHoyUiStatsFromVisitas(visitasOperativas)

    expect(stats.recaudo).toBe(0)
    expect(stats.pendiente).toBe(564_998)
    expect(stats.meta).toBe(564_998)
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
  /**
   * Regresión: Ruta Josser (2026-05-18).
   *
   * Escenario real:
   * - 2 préstamos DIARIO en mora con deuda acumulada ($4.781.666 + $270.000)
   * - 4 préstamos pagados hoy (NO deben contribuir a pendiente)
   * - Recaudo total: $552.000
   *
   * Meta esperada = pendiente ($5.051.666) + recaudo ($552.000) = $5.603.666
   * Este valor debe coincidir con metaDelDia del backend (findAll/findOne).
   */
  it('Ruta Josser: meta = pendiente acumulado DIARIO + recaudo, excluyendo pagados', () => {
    const stats = computeRutaHoyUiStatsFromVisitas(
      [
        // Glenfor Loan 1 - DIARIO en mora, deuda acumulada
        { estado: 'en_mora', montoCuota: 4781666, saldoTotal: 5240000 },
        // Glenfor Loan 2 - DIARIO en mora, 9 cuotas vencidas acumuladas
        { estado: 'en_mora', montoCuota: 270000, saldoTotal: 1170000 },
        // Glenfor Loan 3 - pagado hoy
        { estado: 'pagado', montoCuota: 92000, saldoTotal: 0, recaudadoDelDia: 92000 },
        // jhon pastrana - pagado hoy
        { estado: 'pagado', montoCuota: 180000, saldoTotal: 0, recaudadoDelDia: 180000 },
        // lewis Loan 1 - pagado hoy
        { estado: 'pagado', montoCuota: 180000, saldoTotal: 0, recaudadoDelDia: 180000 },
        // lewis Loan 2 - pagado hoy
        { estado: 'pagado', montoCuota: 100000, saldoTotal: 0, recaudadoDelDia: 100000 },
      ],
      552000,
    )

    // Solo los 2 en mora contribuyen a pendiente
    expect(stats.pendiente).toBe(5051666)
    // Recaudo = fallback (552000) porque es mayor que la suma de recaudadoDelDia
    expect(stats.recaudo).toBe(552000)
    // Meta = pendiente + recaudo
    expect(stats.meta).toBe(5603666)
  })

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

describe('resolveRutaHoyKpiStats', () => {
  it('usa el pendiente real de visitas aunque el backend conserve una meta vieja con regularizados', () => {
    const stats = resolveRutaHoyKpiStats(
      { pendiente: 2_023_999, recaudo: 0, meta: 2_023_999 },
      { meta: 2_940_663, recaudo: 0 },
    )

    expect(stats).toMatchObject({
      meta: 2_023_999,
      pendiente: 2_023_999,
      recaudo: 0,
      eficiencia: 0,
    })
  })

  it('mantiene meta como pendiente real mas recaudo operativo del dia', () => {
    const stats = resolveRutaHoyKpiStats(
      { pendiente: 959_997, recaudo: 552_001, meta: 1_511_998 },
      { meta: 1_511_998, recaudo: 0 },
    )

    expect(stats.meta).toBe(1_511_998)
    expect(stats.pendiente).toBe(959_997)
    expect(stats.recaudo).toBe(552_001)
    expect(stats.eficiencia).toBe(36.5)
  })

  it('respeta meta cero cuando las visitas cargadas fueron excluidas por ausencia', () => {
    const stats = resolveRutaHoyKpiStats(
      { pendiente: 0, recaudo: 0, meta: 0 },
      { meta: 990_333, recaudo: 0 },
      { preferUi: true },
    )

    expect(stats.meta).toBe(0)
    expect(stats.pendiente).toBe(0)
    expect(stats.recaudo).toBe(0)
  })

  it('no deja que recaudo backend contaminado con cierre pendiente pise el recaudo operativo de visitas', () => {
    const stats = resolveRutaHoyKpiStats(
      { pendiente: 2_023_999, recaudo: 0, meta: 2_023_999 },
      { meta: 2_940_663, recaudo: 916_664 },
      { preferUi: true },
    )

    expect(stats.meta).toBe(2_023_999)
    expect(stats.pendiente).toBe(2_023_999)
    expect(stats.recaudo).toBe(0)
    expect(stats.eficiencia).toBe(0)
  })
})

describe('shouldIncludeVisitaInRutaHoyKpis', () => {
  it('incluye en KPI HOY una visita pagada aunque la proxima cuota ya avanzo', () => {
    expect(
      shouldIncludeVisitaInRutaHoyKpis(
        {
          estado: 'pagado',
          periodoRuta: 'DIA',
          proximaVisita: '2026-06-04',
          recaudadoDelDia: 425335,
          montoCuota: 425335,
          saldoTotal: 1000000,
        },
        '2026-06-03',
      ),
    ).toBe(true)
  })

  it('no incluye una visita futura sin recaudo de hoy', () => {
    expect(
      shouldIncludeVisitaInRutaHoyKpis(
        {
          estado: 'pendiente',
          periodoRuta: 'SEMANA',
          proximaVisita: '2026-06-04',
          recaudadoDelDia: 0,
          montoCuota: 425335,
        },
        '2026-06-03',
      ),
    ).toBe(false)
  })
})
