import { applyPagosDelDiaToHistorialVisitas, buildHistorialDiaFromBackend } from '@/lib/ruta-historial'

describe('buildHistorialDiaFromBackend', () => {
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
          },
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
    })
    expect(result.resumen.recaudo).toBe(50000)
    expect(result.resumen.visitados).toBe(1)
    expect(result.resumen.total).toBe(1)
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
})
