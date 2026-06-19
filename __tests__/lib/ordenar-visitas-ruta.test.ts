import { ordenarVisitasRutaActual } from '@/lib/rutas/ordenar-visitas-ruta'

describe('ordenarVisitasRutaActual', () => {
  it('prioriza obligaciones no gestionadas por antiguedad de pago y deja gestionadas al final', () => {
    const sinAbonos = {
      id: 'sin-abonos',
      cliente: 'Ana',
      estado: 'pendiente',
      fechaUltimoPago: 0,
      ordenVisita: 5,
    }
    const abonoReciente = {
      id: 'abono-reciente',
      cliente: 'Beatriz',
      estado: 'pendiente',
      fechaUltimoPago: 2000,
      ordenVisita: 1,
    }
    const abonoAntiguo = {
      id: 'abono-antiguo',
      cliente: 'Carlos',
      estado: 'pendiente',
      fechaUltimoPago: 1000,
      ordenVisita: 2,
    }
    const pagado = {
      id: 'pagado',
      cliente: 'Diana',
      estado: 'pagado',
      fechaUltimoPago: 500,
      ordenVisita: 0,
    }

    expect(
      ordenarVisitasRutaActual([abonoReciente, pagado, sinAbonos, abonoAntiguo]).map(
        (visita) => visita.id,
      ),
    ).toEqual(['sin-abonos', 'abono-antiguo', 'abono-reciente', 'pagado'])
  })

  it('desempata por mayor saldo vencido, dias de mora y cuotas vencidas', () => {
    const bajoRiesgoOperativo = {
      id: 'bajo',
      cliente: 'Ana',
      estado: 'pendiente',
      fechaUltimoPago: 0,
      montoVencidoAcumulado: 20_000,
      diasMora: 1,
      cuotasVencidas: 1,
      ordenVisita: 1,
    }
    const altoRiesgoOperativo = {
      id: 'alto',
      cliente: 'Beatriz',
      estado: 'pendiente',
      fechaUltimoPago: 0,
      montoVencidoAcumulado: 50_000,
      diasMora: 1,
      cuotasVencidas: 1,
      ordenVisita: 2,
    }

    expect(ordenarVisitasRutaActual([bajoRiesgoOperativo, altoRiesgoOperativo])[0].id).toBe(
      'alto',
    )
  })
})
