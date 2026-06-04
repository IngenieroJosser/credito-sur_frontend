import { parseCierreRutaNotif } from './cierre-ruta'

describe('parseCierreRutaNotif', () => {
  it('prefiere metadata estructurada y conserva efectividad decimal', () => {
    const resumen = parseCierreRutaNotif({
      mensaje:
        'Cobrador: Cobrador cerró la ruta Ruta Centro - Norte. Recaudo Final: $0 (0% META). Todos visitados.',
      metadata: {
        rutaNombre: 'Ruta Centro - Norte',
        cobradorNombre: 'Cobrador Prueba',
        recaudoFinal: 552001,
        meta: 1511998,
        efectividad: 36.5,
        clientesFaltantes: 2,
        clientesAusentes: 1,
      },
    })

    expect(resumen).toEqual({
      cobrador: 'Cobrador Prueba',
      rutaNombre: 'Ruta Centro - Norte',
      recaudo: 552001,
      meta: 1511998,
      efectividad: 36.5,
      clientesFaltantes: 2,
      clientesAusentes: 1,
    })
  })

  it('parsea mensajes antiguos con porcentajes decimales como respaldo', () => {
    const resumen = parseCierreRutaNotif({
      mensaje:
        'Cobrador: Cobrador Prueba cerró la ruta Ruta Centro - Norte. Recaudo Final: $552.001 (36.5% META). Faltaron 2 clientes.',
    })

    expect(resumen.efectividad).toBe(36.5)
    expect(resumen.recaudo).toBe(552001)
    expect(resumen.clientesFaltantes).toBe(2)
  })
})
