import { mapObligacionToRutaListVisita } from '@/components/rutas/RutasPageView'

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
