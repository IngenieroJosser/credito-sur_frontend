import {
  mapAsignacionesToClientesRuta,
  mapObligacionToRutaListVisita,
} from '@/components/rutas/RutasPageView'

describe('mapObligacionToRutaListVisita', () => {
  it('conserva el estado provisional para el listado de rutas', () => {
    const visita = mapObligacionToRutaListVisita(
      {
        id: 'obligacion-1',
        clienteId: 'cliente-1',
        prestamoId: 'prestamo-pendiente',
        montoCuotaNormal: 100000,
        montoMetaOperativaPendiente: 100000,
        estadoAprobacion: 'PENDIENTE',
        estadoEfectoProvisional: 'PENDIENTE_REVISION',
        esProvisional: true,
        etiquetaRevision: 'Pendiente de revisión',
        cuotaObjetivo: {
          id: 'cuota-1',
          estado: 'PENDIENTE',
          fechaVencimiento: '2026-06-14',
          montoCuota: 100000,
        },
        prestamo: {
          id: 'prestamo-pendiente',
          estadoAprobacion: 'PENDIENTE',
          estadoEfectoProvisional: 'PENDIENTE_REVISION',
          esProvisional: true,
          etiquetaRevision: 'Pendiente de revisión',
          saldoPendiente: 500000,
        },
      },
      '2026-06-14',
    )

    expect(visita).toMatchObject({
      prestamoId: 'prestamo-pendiente',
      montoCuota: 100000,
      montoCuotaPendiente: 100000,
      pendienteAprobacion: true,
      estadoAprobacion: 'PENDIENTE',
      estadoEfectoProvisional: 'PENDIENTE_REVISION',
      esProvisional: true,
      etiquetaRevision: 'Pendiente de revisión',
    })
  })
})

describe('mapAsignacionesToClientesRuta', () => {
  it('incluye créditos pendientes operativos como parte de clientes asignados de ruta', () => {
    const clientes = mapAsignacionesToClientesRuta([
      {
        cliente: {
          id: 'cliente-1',
          nombres: 'Cliente',
          apellidos: 'Provisional',
          prestamos: [
            {
              id: 'prestamo-pendiente',
              estado: 'PENDIENTE_APROBACION',
              estadoAprobacion: 'PENDIENTE',
              efectoProvisional: { estado: 'PENDIENTE_REVISION' },
              saldoPendiente: 300_000,
            },
            {
              id: 'prestamo-rechazado',
              estado: 'PENDIENTE_APROBACION',
              estadoAprobacion: 'RECHAZADO',
              saldoPendiente: 300_000,
            },
          ],
        },
      },
    ])

    expect(clientes).toHaveLength(1)
    expect(clientes[0]?.prestamos).toHaveLength(1)
    expect(clientes[0]?.prestamos?.[0]).toMatchObject({
      id: 'prestamo-pendiente',
      saldoPendiente: 300_000,
    })
  })
})
