import { applyPagosDelDiaToHistorialVisitas, buildHistorialDiaFromBackend } from '@/lib/ruta-historial'

describe('buildHistorialDiaFromBackend', () => {
  it('preserva recaudo operativo, regularizado y contable enviados por el backend', () => {
    const result = buildHistorialDiaFromBackend({
      fechaClave: '2026-05-27',
      visitasResp: {
        resumen: {
          recaudo: 190000,
          recaudoOperativo: 190000,
          recaudoRegularizado: 10000,
          recaudoContable: 200000,
          meta: 250000,
        },
        visitas: [],
      },
      saldo: { recaudoDelDia: 200000 },
      pagosDelDia: [],
    })

    expect(result.resumen).toMatchObject({
      recaudo: 190000,
      recaudoOperativo: 190000,
      recaudoRegularizado: 10000,
      recaudoContable: 200000,
      meta: 250000,
    })
  })

  it('agrupa pagos sinteticos del mismo prestamo en una sola tarjeta de historial', () => {
    const result = buildHistorialDiaFromBackend({
      fechaClave: '2026-05-09',
      visitasResp: { visitas: [] },
      saldo: {},
      pagosDelDia: [
        {
          id: 'pago-1',
          clienteId: 'cliente-1',
          prestamoId: 'prestamo-1',
          montoTotal: 30000,
          cliente: {
            id: 'cliente-1',
            nombres: 'Ana',
            apellidos: 'Diaz',
            direccion: 'Calle 1',
            telefono: '123',
            nivelRiesgo: 'ROJO',
          },
          prestamo: {
            id: 'prestamo-1',
            cantidadCuotas: 30,
            frecuenciaPago: 'DIARIO',
            saldoPendiente: 900000,
          },
          detalles: [{ cuota: { numeroCuota: 2, monto: 30000 } }],
        },
        {
          id: 'pago-2',
          clienteId: 'cliente-1',
          prestamoId: 'prestamo-1',
          montoTotal: 20000,
          cliente: {
            id: 'cliente-1',
            nombres: 'Ana',
            apellidos: 'Diaz',
            direccion: 'Calle 1',
            telefono: '123',
            nivelRiesgo: 'ROJO',
          },
          prestamo: {
            id: 'prestamo-1',
            cantidadCuotas: 30,
            frecuenciaPago: 'DIARIO',
            saldoPendiente: 900000,
          },
        },
      ],
    })

    expect(result.visitas).toHaveLength(1)
    expect(result.visitas[0]).toMatchObject({
      clienteId: 'cliente-1',
      prestamoId: 'prestamo-1',
      cliente: 'Ana Diaz',
      estado: 'pagado',
      recaudadoDelDia: 50000,
      nivelRiesgo: 'moderado',
      cuotaActual: 2,
      cuotasTotales: 30,
      saldoTotal: 900000,
    })
    expect(result.resumen.recaudo).toBe(50000)
    expect(result.resumen.visitados).toBe(1)
    expect(result.resumen.total).toBe(1)
  })

  it('no muestra un pago regularizado como recaudo operativo del dia fisico', () => {
    const result = buildHistorialDiaFromBackend({
      fechaClave: '2026-06-05',
      visitasResp: {
        visitas: [
          {
            asignacionId: 'asig-1',
            cliente: {
              id: 'cliente-1',
              nombres: 'Juan Camilo',
              apellidos: 'Marrugo',
              direccion: 'Calle 1',
              telefono: '123',
              nivelRiesgo: 'AMARILLO',
            },
            prestamos: [
              {
                id: 'prestamo-1',
                saldoPendiente: 4583336,
                proximaCuota: { monto: 916664, estado: 'PENDIENTE' },
                frecuenciaPago: 'DIARIO',
              },
            ],
          },
        ],
      },
      saldo: { recaudoDelDia: 916664 },
      pagosDelDia: [
        {
          id: 'pago-regularizado-1',
          clienteId: 'cliente-1',
          prestamoId: 'prestamo-1',
          montoTotal: 916664,
          origenGestion: 'CIERRE_PENDIENTE',
          fechaPago: '2026-06-05T09:00:00-05:00',
          fechaOperativaRuta: '2026-06-03',
        },
      ],
    })

    expect(result.resumen.recaudo).toBe(0)
    expect(result.resumen.recaudoOperativo).toBe(0)
    expect(result.resumen.recaudoRegularizado).toBe(916664)
    expect(result.resumen.recaudoContable).toBe(916664)
    expect(result.resumen.visitados).toBe(0)
    expect(result.visitas[0]).toMatchObject({
      clienteId: 'cliente-1',
      prestamoId: 'prestamo-1',
      recaudadoDelDia: 0,
      estado: 'pendiente',
    })
  })
})

describe('applyPagosDelDiaToHistorialVisitas', () => {
  it('marca como gestionado un cliente pagado por otro rol aunque la visita viva aun no tenga recaudo', () => {
    const result = applyPagosDelDiaToHistorialVisitas({
      fechaClave: '2026-05-18',
      visitas: [
        {
          id: 'visita-1',
          clienteId: 'cliente-1',
          prestamoId: 'prestamo-1',
          cliente: 'Lewis Martinez',
          estado: 'en_mora',
          recaudadoDelDia: 0,
          montoCuota: 180000,
          saldoTotal: 1180000,
        } as any,
      ],
      pagosDelDia: [
        {
          id: 'pago-admin-1',
          clienteId: 'cliente-1',
          prestamoId: 'prestamo-1',
          cobradorId: 'cobrador-ruta-1',
          montoTotal: 100000,
        },
      ],
    })

    expect(result.recaudo).toBe(100000)
    expect(result.visitados).toBe(1)
    expect(result.visitas).toHaveLength(1)
    expect(result.visitas[0]).toMatchObject({
      clienteId: 'cliente-1',
      prestamoId: 'prestamo-1',
      recaudadoDelDia: 100000,
    })
  })

  it('ignora pagos regularizados al pintar el historial operativo de hoy', () => {
    const result = applyPagosDelDiaToHistorialVisitas({
      fechaClave: '2026-06-05',
      visitas: [
        {
          id: 'visita-1',
          clienteId: 'cliente-1',
          prestamoId: 'prestamo-1',
          cliente: 'Juan Camilo Marrugo',
          estado: 'pendiente',
          recaudadoDelDia: 0,
          montoCuota: 916664,
          saldoTotal: 4583336,
        } as any,
      ],
      pagosDelDia: [
        {
          id: 'pago-regularizado-1',
          clienteId: 'cliente-1',
          prestamoId: 'prestamo-1',
          cobradorId: 'cobrador-ruta-1',
          montoTotal: 916664,
          origenGestion: 'CIERRE_PENDIENTE',
        },
      ],
    })

    expect(result.recaudo).toBe(0)
    expect(result.visitados).toBe(0)
    expect(result.visitas[0]).toMatchObject({
      clienteId: 'cliente-1',
      prestamoId: 'prestamo-1',
      recaudadoDelDia: 0,
      estado: 'pendiente',
    })
  })
})
