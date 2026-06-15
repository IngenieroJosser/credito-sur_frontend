import { mapAsignacionesToVisitasLite } from '@/lib/ruta-visitas-mapper'

describe('mapAsignacionesToVisitasLite', () => {
  it('muestra créditos pendientes como provisionales y excluye créditos rechazados', () => {
    const visitas = mapAsignacionesToVisitasLite({
      hoyKey: '2026-06-12',
      cobradorId: 'cobrador-1',
      asignaciones: [
        {
          id: 'asig-1',
          cliente: {
            id: 'cliente-1',
            nombres: 'Cliente',
            apellidos: 'Provisional',
            direccion: 'Calle 1',
            telefono: '3000000000',
            prestamos: [
              {
                id: 'prestamo-pendiente',
                estado: 'PENDIENTE_APROBACION',
                estadoAprobacion: 'PENDIENTE',
                efectoProvisional: { estado: 'PENDIENTE_REVISION' },
                tipoPrestamo: 'EFECTIVO',
                frecuenciaPago: 'DIARIO',
                valorCuota: 100_000,
                saldoPendiente: 300_000,
                cantidadCuotas: 3,
                cuotas: [
                  {
                    id: 'cuota-pendiente',
                    numeroCuota: 1,
                    estado: 'PENDIENTE',
                    fechaVencimiento: '2026-06-12',
                    montoNominal: 100_000,
                    montoPagado: 0,
                  },
                ],
              },
              {
                id: 'prestamo-rechazado',
                estado: 'PENDIENTE_APROBACION',
                estadoAprobacion: 'RECHAZADO',
                tipoPrestamo: 'EFECTIVO',
                frecuenciaPago: 'DIARIO',
                valorCuota: 200_000,
                saldoPendiente: 600_000,
                cantidadCuotas: 3,
                cuotas: [
                  {
                    id: 'cuota-rechazada',
                    numeroCuota: 1,
                    estado: 'PENDIENTE',
                    fechaVencimiento: '2026-06-12',
                    montoNominal: 200_000,
                    montoPagado: 0,
                  },
                ],
              },
            ],
          },
        },
      ],
    })

    expect(visitas).toHaveLength(1)
    expect(visitas[0]).toMatchObject({
      prestamoId: 'prestamo-pendiente',
      pendienteAprobacion: true,
      esProvisional: true,
      etiquetaRevision: 'Pendiente de revisión',
    })
  })

  it('muestra la cuota normal en tarjeta y conserva el exigible acumulado para cobro', () => {
    const visitas = mapAsignacionesToVisitasLite({
      hoyKey: '2026-06-12',
      cobradorId: 'cobrador-1',
      asignaciones: [
        {
          id: 'asig-1',
          cliente: {
            id: 'cliente-1',
            nombres: 'Cliente',
            apellidos: 'Mora',
            direccion: 'Calle 1',
            telefono: '3000000000',
            prestamos: [
              {
                id: 'prestamo-1',
                estado: 'EN_MORA',
                tipo: 'EFECTIVO',
                frecuenciaPago: 'DIARIO',
                valorCuota: 100_000,
                saldoPendiente: 300_000,
                cantidadCuotas: 3,
                cuotas: [
                  {
                    id: 'cuota-1',
                    numeroCuota: 1,
                    estado: 'PENDIENTE',
                    fechaVencimiento: '2026-06-10',
                    montoNominal: 100_000,
                    montoPagado: 0,
                  },
                  {
                    id: 'cuota-2',
                    numeroCuota: 2,
                    estado: 'PENDIENTE',
                    fechaVencimiento: '2026-06-11',
                    montoNominal: 100_000,
                    montoPagado: 0,
                  },
                ],
              },
            ],
          },
        },
      ],
    })

    expect(visitas).toHaveLength(1)
    expect(visitas[0]).toMatchObject({
      montoCuota: 100_000,
      montoCuotaNormal: 100_000,
      montoCuotaPendiente: 200_000,
      estado: 'en_mora',
    })
  })

  it('usa la misma normalizacion de riesgo que las tarjetas de admin', () => {
    const visitas = mapAsignacionesToVisitasLite({
      hoyKey: '2026-06-12',
      cobradorId: 'cobrador-1',
      asignaciones: [
        {
          id: 'asig-1',
          cliente: {
            id: 'cliente-1',
            nombres: 'Cliente',
            apellidos: 'Amarillo',
            direccion: 'Calle 1',
            telefono: '3000000000',
            nivelRiesgo: 'AMARILLO',
            prestamos: [
              {
                id: 'prestamo-1',
                estado: 'ACTIVO',
                tipo: 'EFECTIVO',
                frecuenciaPago: 'DIARIO',
                valorCuota: 100_000,
                saldoPendiente: 300_000,
                cantidadCuotas: 3,
                cuotas: [
                  {
                    id: 'cuota-1',
                    numeroCuota: 1,
                    estado: 'PENDIENTE',
                    fechaVencimiento: '2026-06-12',
                    montoNominal: 100_000,
                    montoPagado: 0,
                  },
                ],
              },
            ],
          },
        },
      ],
    })

    expect(visitas[0]?.nivelRiesgo).toBe('precaucion')
  })
})
