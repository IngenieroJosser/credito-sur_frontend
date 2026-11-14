import * as fs from 'fs'
import * as path from 'path'

import { debeMostrarseEnListaDeRuta, visitaAtendidaHoy } from '@/lib/rutas-core'
import { sinComentarios } from '@/lib/testing/sin-comentarios'

/**
 * Una sola regla decide a qué clientes de una ruta ve cada rol.
 *
 * ── Lo que había ────────────────────────────────────────────────────────────
 *
 * Tres pantallas miran la ruta de un cobrador, y cada una decidía con su
 * propia regla a quién enseñaba:
 *
 *   cobrador      isVisitaExigibleHoy(v, hoy)
 *   supervisor    Number(v.montoCuota) > 0 || isTodayOrMora(v.proximaVisita)
 *   coordinador   isTodayOrMora(v.proximaVisita)
 *
 * Las tres se llamaban `filterByDate` y las tres estaban escritas dentro del
 * JSX de su pantalla, así que la diferencia no se veía desde ningún sitio. El
 * resultado: el supervisor y el coordinador supervisaban una lista que no era
 * la del cobrador, y nadie podía decir en qué se diferenciaban.
 *
 * ── Lo que se exige ahora ───────────────────────────────────────────────────
 *
 * La decisión vive en `debeMostrarseEnListaDeRuta`, con tres alcances con
 * nombre, y el valor por defecto en las tres pantallas es `PENDIENTES`: la
 * lista del cobrador. Ver más es una decisión visible, con su botón.
 */
const RAIZ = path.join(__dirname, '..', '..')

const PANTALLAS_DE_RUTA = [
  'components/dashboards/VistaCobrador.tsx',
  'components/dashboards/SupervisorCobroView.tsx',
  'app/coordinador/rutas/[id]/page.tsx',
]

describe('las pantallas de ruta no tienen su propia regla', () => {
  const fuentes = PANTALLAS_DE_RUTA.map((rel) => ({
    rel,
    texto: sinComentarios(fs.readFileSync(path.join(RAIZ, rel), 'utf8')),
  }))

  it('encuentra las tres pantallas', () => {
    // Si una se renombra, esto lo dice en vez de pasar en vacío.
    expect(fuentes.map((f) => f.texto.length > 1000)).toEqual([true, true, true])
  })

  it('ninguna define un `isTodayOrMora` propio', () => {
    const infractoras = fuentes
      .filter((f) => /const\s+isTodayOrMora\s*=/.test(f.texto))
      .map((f) => f.rel)

    expect(infractoras.join('\n')).toBe('')
  })

  it('las tres deciden con `debeMostrarseEnListaDeRuta`', () => {
    const sinLaRegla = fuentes
      .filter((f) => !f.texto.includes('debeMostrarseEnListaDeRuta('))
      .map((f) => f.rel)

    expect(sinLaRegla.join('\n')).toBe('')
  })

  it('y ese lector ve el defecto cuando se le pone delante', () => {
    /*
     * Comprobada al revés. El `sinComentarios` importa: la explicación de
     * arriba de cada pantalla nombra `isTodayOrMora` para contar qué había, y
     * sin quitar comentarios esta prueba se acusaría a sí misma.
     */
    const conElDefecto = 'const isTodayOrMora = (d) => true'
    const soloEnComentario = '// antes había un const isTodayOrMora = (d) => true'

    expect({
      elMalo: /const\s+isTodayOrMora\s*=/.test(sinComentarios(conElDefecto)),
      elComentado: /const\s+isTodayOrMora\s*=/.test(sinComentarios(soloEnComentario)),
    }).toEqual({ elMalo: true, elComentado: false })
  })

  it('el cobrador va fijo en PENDIENTES y no lleva el filtro', () => {
    /*
     * A propósito: volver a enseñarle un cliente que ya pagó hoy lo manda a
     * cobrarle dos veces, que es justo lo que la regla quita.
     */
    const cobrador = fuentes.find((f) => f.rel.includes('VistaCobrador'))!.texto

    expect(cobrador).toMatch(/debeMostrarseEnListaDeRuta\([^)]*'PENDIENTES'\)/)
    expect(cobrador).not.toContain('OPCIONES_DE_ALCANCE')
  })

  it('el supervisor y el coordinador arrancan en la lista del cobrador', () => {
    for (const rel of [
      'components/dashboards/SupervisorCobroView.tsx',
      'app/coordinador/rutas/[id]/page.tsx',
    ]) {
      const texto = fuentes.find((f) => f.rel === rel)!.texto
      // El estado nace en el valor por defecto compartido, no en una cadena
      // escrita a mano que pueda divergir.
      expect(texto).toContain('useState<AlcanceDeVisita>(ALCANCE_POR_DEFECTO)')
      expect(texto).toContain('OPCIONES_DE_ALCANCE')
    }
  })
})

describe('visitaAtendidaHoy', () => {
  const HOY = '2026-11-14'

  it('cuenta como atendida la que ya recaudó algo hoy', () => {
    expect(
      visitaAtendidaHoy({ proximaVisita: HOY, recaudadoDelDia: 15000 }, HOY),
    ).toBe(true)
  })

  it('y la que tiene estado de gestión escrito', () => {
    for (const estadoGestion of ['PAGADO', 'GESTIONADO', 'REPROGRAMADO', 'AUSENTE']) {
      expect(visitaAtendidaHoy({ proximaVisita: HOY, estadoGestion }, HOY)).toBe(true)
    }
  })

  it('incluye lo revertido y lo rechazado, que es lo que hay que supervisar', () => {
    expect(visitaAtendidaHoy({ proximaVisita: HOY, esRevertido: true }, HOY)).toBe(true)
    expect(
      visitaAtendidaHoy({ proximaVisita: HOY, estadoGestion: 'RECHAZADO' }, HOY),
    ).toBe(true)
  })

  it('no cuenta la que nadie tocó', () => {
    // Pendiente de hoy: esa va en PENDIENTES, no aquí.
    expect(
      visitaAtendidaHoy({ proximaVisita: HOY, estado: 'pendiente', montoCuota: 20000 }, HOY),
    ).toBe(false)
  })

  it('ni la de fecha futura, aunque arrastre un estado viejo', () => {
    /*
     * La guarda de la fecha es la que impide que una visita de la semana que
     * viene se cuele en la jornada de hoy por un estado de gestión antiguo.
     */
    expect(
      visitaAtendidaHoy({ proximaVisita: '2026-11-20', estadoGestion: 'PAGADO' }, HOY),
    ).toBe(false)
  })

  it('con prórroga manda la fecha de la prórroga', () => {
    // `proximaVisita` conserva la fecha vencida original; mirarla a ella
    // dejaba la prórroga sin efecto, como ya pasó en la regla de al lado.
    expect(
      visitaAtendidaHoy(
        {
          proximaVisita: '2026-11-01',
          enProrroga: true,
          fechaProrroga: '2026-11-25',
          estadoGestion: 'PAGADO',
        },
        HOY,
      ),
    ).toBe(false)
  })

  it('no decide nada sin visita', () => {
    expect(visitaAtendidaHoy(null, HOY)).toBe(false)
    expect(visitaAtendidaHoy(undefined, HOY)).toBe(false)
  })
})

describe('debeMostrarseEnListaDeRuta', () => {
  const HOY = '2026-11-14'

  const pendienteDeHoy = {
    proximaVisita: HOY,
    estado: 'pendiente',
    periodoRuta: 'DIA',
    saldoPendiente: 300000,
    montoCuota: 20000,
  } as const

  const yaCobradaHoy = {
    proximaVisita: HOY,
    estado: 'pendiente',
    periodoRuta: 'DIA',
    saldoPendiente: 280000,
    montoCuota: 20000,
    recaudadoDelDia: 20000,
  } as const

  const conFechaFutura = {
    proximaVisita: '2026-11-28',
    estado: 'pendiente',
    periodoRuta: 'MES',
    saldoPendiente: 500000,
    montoCuota: 50000,
  } as const

  it('PENDIENTES es la lista del cobrador', () => {
    expect(debeMostrarseEnListaDeRuta(pendienteDeHoy, HOY, 'PENDIENTES')).toBe(true)
    expect(debeMostrarseEnListaDeRuta(yaCobradaHoy, HOY, 'PENDIENTES')).toBe(false)
    expect(debeMostrarseEnListaDeRuta(conFechaFutura, HOY, 'PENDIENTES')).toBe(false)
  })

  it('y es el valor por defecto, sin tener que pedirlo', () => {
    /*
     * Importa: si el defecto fuera el ancho, una pantalla que olvide pasar el
     * alcance enseñaría más de lo que el cobrador tiene, que es el fallo que
     * se venía arreglando.
     */
    expect(debeMostrarseEnListaDeRuta(yaCobradaHoy, HOY)).toBe(false)
    expect(debeMostrarseEnListaDeRuta(pendienteDeHoy, HOY)).toBe(true)
  })

  it('ATENDIDAS enseña justo lo que PENDIENTES deja fuera del día', () => {
    expect(debeMostrarseEnListaDeRuta(yaCobradaHoy, HOY, 'ATENDIDAS')).toBe(true)
    expect(debeMostrarseEnListaDeRuta(pendienteDeHoy, HOY, 'ATENDIDAS')).toBe(false)
    // Lo de fecha futura no es «atendido»: es «no toca».
    expect(debeMostrarseEnListaDeRuta(conFechaFutura, HOY, 'ATENDIDAS')).toBe(false)
  })

  it('los dos alcances del día no se solapan', () => {
    // Ninguna visita puede estar en las dos listas a la vez: si se solaparan,
    // quien supervisa contaría dos veces el mismo cliente.
    for (const v of [pendienteDeHoy, yaCobradaHoy, conFechaFutura]) {
      const enPendientes = debeMostrarseEnListaDeRuta(v, HOY, 'PENDIENTES')
      const enAtendidas = debeMostrarseEnListaDeRuta(v, HOY, 'ATENDIDAS')
      expect(enPendientes && enAtendidas).toBe(false)
    }
  })

  it('TODAS no esconde nada, que es lo que se pedía', () => {
    /*
     * El miedo razonable al unificar era esconder un cliente al que hay que
     * ir. Con este alcance no hay nada que esconder: enseña la ruta entera, y
     * está a un toque.
     */
    for (const v of [pendienteDeHoy, yaCobradaHoy, conFechaFutura]) {
      expect(debeMostrarseEnListaDeRuta(v, HOY, 'TODAS')).toBe(true)
    }
  })

  it('un cliente en mora sigue apareciendo en PENDIENTES', () => {
    // El caso que no se podía perder: una fecha vencida sin gestionar.
    expect(
      debeMostrarseEnListaDeRuta(
        {
          proximaVisita: '2026-10-30',
          estado: 'en_mora',
          periodoRuta: 'SEMANA',
          saldoPendiente: 400000,
          montoCuota: 30000,
        },
        HOY,
        'PENDIENTES',
      ),
    ).toBe(true)
  })

  it('sin visita no se muestra nada, en ningún alcance', () => {
    for (const alcance of ['PENDIENTES', 'ATENDIDAS', 'TODAS'] as const) {
      expect(debeMostrarseEnListaDeRuta(null, HOY, alcance)).toBe(false)
    }
  })
})
