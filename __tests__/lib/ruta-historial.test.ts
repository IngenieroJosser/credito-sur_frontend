import { applyPagosDelDiaToHistorialVisitas, buildHistorialDiaFromBackend, isPagoForHistorialFecha } from '@/lib/ruta-historial'

describe('isPagoForHistorialFecha', () => {
  it('asocia pagos normales por fecha de pago y pagos regularizados por fecha operativa', () => {
    expect(isPagoForHistorialFecha({
      fechaPago: '2026-06-05T09:00:00-05:00',
      montoTotal: 1000,
    }, '2026-06-05')).toBe(true)

    expect(isPagoForHistorialFecha({
      fechaPago: '2026-06-05T09:00:00-05:00',
      fechaOperativaRuta: '2026-06-03',
      origenGestion: 'CIERRE_PENDIENTE',
      montoTotal: 1000,
    }, '2026-06-03')).toBe(true)

    expect(isPagoForHistorialFecha({
      fechaPago: '2026-06-05T09:00:00-05:00',
      fechaOperativaRuta: '2026-06-03',
      origenGestion: 'CIERRE_PENDIENTE',
      montoTotal: 1000,
    }, '2026-06-05')).toBe(false)
  })
})

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
      // ROJO era 'moderado' cuando se escribio esta prueba. e6c23b1 centralizo
      // mapNivelRiesgo y redefinio la escala contra el enum del backend: ROJO
      // pasa a 'critico' y 'moderado' queda para RIESGO_MODERADO.
      nivelRiesgo: 'critico',
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
    expect(result.resumen.recaudoRegularizado).toBe(0)
    expect(result.resumen.recaudoContable).toBe(0)
    expect(result.resumen.visitados).toBe(0)
    expect(result.visitas[0]).toMatchObject({
      clienteId: 'cliente-1',
      prestamoId: 'prestamo-1',
      recaudadoDelDia: 0,
      estado: 'pendiente',
    })
  })

  it('respeta el cero enviado por backend aunque el saldo de caja venga contaminado', () => {
    const result = buildHistorialDiaFromBackend({
      fechaClave: '2026-06-05',
      visitasResp: {
        resumen: {
          recaudo: 0,
          recaudoOperativo: 0,
          recaudoRegularizado: 0,
          recaudoContable: 0,
          meta: 1980666,
          gastos: 0,
          efectividad: 0,
          visitados: 0,
          total: 4,
          jornadaEstado: 'PENDIENTE_CIERRE',
        },
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
      saldo: { recaudoDelDia: 959997, gastosDelDia: 20000 },
      pagosDelDia: [],
    })

    expect(result.resumen).toMatchObject({
      recaudo: 0,
      recaudoOperativo: 0,
      recaudoRegularizado: 0,
      recaudoContable: 0,
      meta: 1980666,
      gastos: 0,
      efectividad: 0,
      visitados: 0,
      jornadaEtiqueta: 'Pendiente de gestión',
    })
  })

  it('reconcilia tarjetas visibles y conserva visitados del backend en la misma jornada', () => {
    const result = buildHistorialDiaFromBackend({
      fechaClave: '2026-06-05',
      visitasResp: {
        resumen: {
          recaudo: 1767334,
          recaudoOperativo: 1767334,
          recaudoRegularizado: 1767334,
          recaudoContable: 0,
          meta: 1980666,
          gastos: 0,
          efectividad: 89.2,
          visitados: 2,
          total: 4,
          jornadaEstado: 'PENDIENTE_CIERRE',
        },
        visitas: [
          {
            asignacionId: 'asig-encarnacion',
            cliente: {
              id: 'cliente-encarnacion',
              nombres: 'Encarnación',
              apellidos: 'Mosquera',
              direccion: 'Calle 4',
              telefono: '123',
              nivelRiesgo: 'AMARILLO',
            },
            prestamos: [
              {
                id: 'prestamo-encarnacion',
                saldoPendiente: 1773334,
                proximaCuota: { monto: 126666, estado: 'PENDIENTE' },
                frecuenciaPago: 'DIARIO',
              },
            ],
          },
        ],
      },
      saldo: {},
      pagosDelDia: [
        {
          id: 'pago-juan',
          clienteId: 'cliente-juan',
          prestamoId: 'prestamo-juan',
          montoTotal: 916664,
          origenGestion: 'CIERRE_PENDIENTE',
          fechaPago: '2026-06-06T09:00:00-05:00',
          fechaOperativaRuta: '2026-06-05',
        },
        {
          id: 'pago-luis',
          clienteId: 'cliente-luis',
          prestamoId: 'prestamo-luis',
          montoTotal: 850670,
          origenGestion: 'CIERRE_PENDIENTE',
          fechaPago: '2026-06-06T09:00:00-05:00',
          fechaOperativaRuta: '2026-06-05',
        },
        {
          id: 'pago-encarnacion',
          clienteId: 'cliente-encarnacion',
          prestamoId: 'prestamo-encarnacion',
          montoTotal: 126666,
          origenGestion: 'CIERRE_PENDIENTE',
          fechaPago: '2026-06-06T09:00:00-05:00',
          fechaOperativaRuta: '2026-06-05',
        },
      ],
    })

    expect(result.resumen.recaudo).toBe(1894000)
    expect(result.resumen.recaudoOperativo).toBe(1894000)
    expect(result.resumen.recaudoRegularizado).toBe(1894000)
    expect(result.resumen.efectividad).toBe(95.6)
    expect(result.resumen.visitados).toBe(2)
    expect(result.visitas).toHaveLength(3)
    expect(result.visitas[0]).toMatchObject({
      recaudadoRegularizadoDespues: 126666,
      estado: 'pagado',
    })
  })

  it('muestra un pago regularizado en la jornada operativa original sin mezclarlo con pago del dia', () => {
    const result = buildHistorialDiaFromBackend({
      fechaClave: '2026-06-03',
      visitasResp: {
        resumen: {
          recaudo: 1468665,
          recaudoOperativo: 1468665,
          recaudoRegularizado: 916664,
          recaudoContable: 552001,
          meta: 1511998,
          jornadaEstado: 'PENDIENTE_CIERRE',
        },
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
      saldo: { recaudoDelDia: 552001 },
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

    expect(result.resumen).toMatchObject({
      recaudo: 1468665,
      recaudoOperativo: 1468665,
      recaudoRegularizado: 916664,
      recaudoContable: 552001,
      visitados: 1,
      total: 1,
      jornadaEstado: 'PENDIENTE_CIERRE',
      jornadaEtiqueta: 'Lista para cerrar',
    })
    expect(result.visitas[0]).toMatchObject({
      clienteId: 'cliente-1',
      prestamoId: 'prestamo-1',
      recaudadoDelDia: 0,
      recaudadoRegularizadoDespues: 916664,
      estado: 'pagado',
    })
  })

  it('usa el estado real de jornada para etiquetar el historial', () => {
    const result = buildHistorialDiaFromBackend({
      fechaClave: '2026-06-03',
      visitasResp: {
        resumen: {
          recaudo: 1468665,
          recaudoOperativo: 552001,
          recaudoRegularizado: 916664,
          recaudoContable: 1468665,
          meta: 1511998,
          jornadaEstado: 'REGULARIZADA',
        },
        visitas: [],
      },
      saldo: {},
      pagosDelDia: [],
    })

    expect(result.resumen).toMatchObject({
      jornadaEstado: 'REGULARIZADA',
      jornadaEtiqueta: 'Regularizada',
    })
  })

  it('cuenta y conserva tarjetas reprogramadas aunque no tengan recaudo', () => {
    const result = buildHistorialDiaFromBackend({
      fechaClave: '2026-06-10',
      visitasResp: {
        resumen: {
          recaudo: 0,
          recaudoOperativo: 0,
          recaudoRegularizado: 0,
          recaudoContable: 0,
          meta: 947000,
          jornadaEstado: 'PENDIENTE_CIERRE',
        },
        visitas: [
          {
            asignacionId: 'asig-epifanio',
            estadoVisita: 'reprogramado',
            cliente: {
              id: 'cliente-epifanio',
              nombres: 'Epifanio',
              apellidos: 'Mena',
              direccion: 'Barrio Playita',
              telefono: '311',
              nivelRiesgo: 'VERDE',
            },
            prestamos: [
              {
                id: 'prestamo-epifanio',
                saldoPendiente: 2296669,
                proximaCuota: { monto: 43333, estado: 'PRORROGADA' },
                frecuenciaPago: 'DIARIO',
              },
            ],
          },
        ],
      },
      saldo: {},
      pagosDelDia: [],
    })

    expect(result.resumen.visitados).toBe(1)
    expect(result.resumen.total).toBe(1)
    expect(result.visitas).toHaveLength(1)
    expect(result.visitas[0]).toMatchObject({
      clienteId: 'cliente-epifanio',
      prestamoId: 'prestamo-epifanio',
      estadoVisita: 'reprogramado',
      recaudadoDelDia: 0,
      recaudadoRegularizadoDespues: 0,
    })
  })

  it('prioriza obligaciones del backend y conserva el total resumido aunque haya menos tarjetas visibles', () => {
    const result = buildHistorialDiaFromBackend({
      fechaClave: '2026-06-12',
      visitasResp: {
        resumen: {
          recaudo: 43333,
          recaudoOperativo: 43333,
          recaudoRegularizado: 0,
          recaudoContable: 43333,
          meta: 390000,
          gastos: 0,
          efectividad: 11.1,
          visitados: 1,
          total: 9,
        },
        visitas: [
          {
            asignacionId: 'asig-cliente-1',
            cliente: {
              id: 'cliente-1',
              nombres: 'Epifanio',
              apellidos: 'Mena',
            },
          },
        ],
        obligaciones: [
          {
            asignacionId: 'asig-cliente-1',
            ordenVisita: 1,
            estadoGestion: 'PAGO_REGISTRADO',
            estadoVisita: 'pagado',
            recaudadoDelDia: 43333,
            montoMetaOperativaPendiente: 43333,
            cliente: {
              id: 'cliente-1',
              nombres: 'Epifanio',
              apellidos: 'Mena',
              direccion: 'Barrio Playita',
              telefono: '311',
              nivelRiesgo: 'VERDE',
            },
            prestamoId: 'prestamo-epifanio-1',
            prestamo: {
              id: 'prestamo-epifanio-1',
              saldoPendiente: 190000,
              frecuenciaPago: 'DIARIO',
              cantidadCuotas: 12,
            },
          },
        ],
      },
      saldo: {},
      pagosDelDia: [],
    })

    expect(result.resumen.total).toBe(9)
    expect(result.resumen.visitados).toBe(1)
    expect(result.visitas).toHaveLength(1)
    expect(result.visitas[0]).toMatchObject({
      clienteId: 'cliente-1',
      prestamoId: 'prestamo-epifanio-1',
      cliente: 'Epifanio Mena',
      estado: 'pagado',
      recaudadoDelDia: 43333,
    })
  })

  it('no vuelve a agrupar por cliente cuando daily-visits trae multiples obligaciones del mismo cliente', () => {
    const result = buildHistorialDiaFromBackend({
      fechaClave: '2026-06-12',
      visitasResp: {
        resumen: {
          recaudo: 0,
          recaudoOperativo: 0,
          recaudoRegularizado: 0,
          recaudoContable: 0,
          meta: 86666,
          gastos: 0,
          efectividad: 50,
          visitados: 1,
          total: 2,
        },
        visitas: [],
        obligaciones: [
          {
            asignacionId: 'asig-cliente-1',
            ordenVisita: 1,
            estadoGestion: 'REPROGRAMADO',
            estadoVisita: 'reprogramado',
            recaudadoDelDia: 0,
            montoMetaOperativaPendiente: 0,
            cliente: {
              id: 'cliente-1',
              nombres: 'Epifanio',
              apellidos: 'Mena',
              direccion: 'Barrio Playita',
              telefono: '311',
              nivelRiesgo: 'VERDE',
            },
            prestamoId: 'prestamo-viejo',
            prestamo: {
              id: 'prestamo-viejo',
              saldoPendiente: 2296669,
              frecuenciaPago: 'DIARIO',
              cantidadCuotas: 24,
              cuotaObjetivo: {
                numeroCuota: 8,
                montoCuota: 86666,
              },
            },
          },
          {
            asignacionId: 'asig-cliente-1',
            ordenVisita: 1,
            estadoGestion: 'PENDIENTE',
            estadoVisita: null,
            recaudadoDelDia: 0,
            montoMetaOperativaPendiente: 43333,
            cliente: {
              id: 'cliente-1',
              nombres: 'Epifanio',
              apellidos: 'Mena',
              direccion: 'Barrio Playita',
              telefono: '311',
              nivelRiesgo: 'VERDE',
            },
            prestamoId: 'prestamo-nuevo',
            prestamo: {
              id: 'prestamo-nuevo',
              saldoPendiente: 190000,
              frecuenciaPago: 'DIARIO',
              cantidadCuotas: 12,
              cuotaObjetivo: {
                numeroCuota: 1,
              },
            },
          },
        ],
      },
      saldo: {},
      pagosDelDia: [],
    })

    expect(result.visitas).toHaveLength(2)
    expect(result.resumen.total).toBe(2)
    expect(result.visitas.map((visita) => visita.prestamoId)).toEqual([
      'prestamo-viejo',
      'prestamo-nuevo',
    ])
    expect(result.visitas[0]).toMatchObject({
      estado: 'reprogramado',
      estadoVisita: 'reprogramado',
      montoCuota: 86666,
      montoMetaOperativaPendiente: 0,
    })
    expect(result.visitas[1]).toMatchObject({
      estado: 'pendiente',
      montoCuota: 43333,
    })
  })

  it('respeta visitados del backend aunque el calculo local encuentre mas gestiones', () => {
    const result = buildHistorialDiaFromBackend({
      fechaClave: '2026-06-12',
      visitasResp: {
        resumen: {
          recaudo: 43333,
          recaudoOperativo: 43333,
          recaudoRegularizado: 0,
          recaudoContable: 43333,
          meta: 129999,
          gastos: 0,
          efectividad: 11.1,
          visitados: 1,
          total: 3,
        },
        obligaciones: [
          {
            asignacionId: 'asig-1',
            ordenVisita: 1,
            estadoGestion: 'PAGO_REGISTRADO',
            estadoVisita: 'pagado',
            recaudadoDelDia: 43333,
            montoMetaOperativaPendiente: 43333,
            cliente: {
              id: 'cliente-1',
              nombres: 'Epifanio',
              apellidos: 'Mena',
            },
            prestamoId: 'prestamo-1',
            prestamo: {
              id: 'prestamo-1',
              saldoPendiente: 190000,
              frecuenciaPago: 'DIARIO',
            },
          },
          {
            asignacionId: 'asig-2',
            ordenVisita: 2,
            estadoGestion: 'REPROGRAMADO',
            estadoVisita: 'reprogramado',
            recaudadoDelDia: 0,
            montoMetaOperativaPendiente: 0,
            cliente: {
              id: 'cliente-2',
              nombres: 'Luis',
              apellidos: 'Perez',
            },
            prestamoId: 'prestamo-2',
            prestamo: {
              id: 'prestamo-2',
              saldoPendiente: 240000,
              frecuenciaPago: 'DIARIO',
              cuotaObjetivo: {
                numeroCuota: 3,
                montoCuota: 43333,
              },
            },
          },
        ],
      },
      saldo: {},
      pagosDelDia: [],
    })

    expect(result.resumen.visitados).toBe(1)
    expect(result.resumen.total).toBe(3)
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
