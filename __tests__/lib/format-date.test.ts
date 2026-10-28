import {
  formatFechaBogota,
  formatFechaCortaBogota,
  formatFechaHumanaBogota,
  formatHoraBogota,
} from '@/lib/format-date'

/**
 * `Intl` separa "p." de "m." con un espacio duro (U+00A0), no con uno normal.
 * Esa eleccion es cosa de ICU y no es lo que se esta comprobando aqui: lo que
 * importa es el dia y la hora. Se normalizan los espacios para que la prueba
 * no dependa de un detalle invisible.
 *
 * Por lo mismo, las pruebas de `formatFechaHumanaBogota` comprueban el dia y la
 * hora por separado y NO el texto entero: ICU tambien cambia el separador entre
 * los dos —hasta Node 24.13 era ", " y desde ICU 78 es " a las "—, y esas dos
 * pruebas empezaron a fallar con una actualizacion de Node sin que el codigo
 * hubiera cambiado.
 */
const conEspaciosNormales = (texto: string) => texto.replace(/[\u00a0\u202f]/g, ' ')

/**
 * Que una fecha no se corra de día.
 *
 * Es el error que ya apareció una vez: el servidor guarda en UTC y Colombia va
 * cinco horas por detrás, así que todo lo que pasa después de las 7 de la tarde
 * en Bogotá cae al día siguiente en UTC. Mostrado sin cuidado, un cobro de la
 * noche del 8 aparece hecho el 9, y un cierre de caja se descuadra contra el
 * día que la gente tiene en la cabeza.
 *
 * Este módulo lo resuelve de dos maneras, y las dos hay que sostenerlas:
 *  - una fecha operativa "YYYY-MM-DD" se ancla al mediodía de Bogotá, lejos de
 *    los dos bordes del día;
 *  - todo se formatea con `timeZone: 'America/Bogota'`, no con la zona de quien
 *    abre la pantalla.
 *
 * Lo usa el cierre de ruta, que es justo donde un día de diferencia se nota.
 */
describe('formatFechaCortaBogota', () => {
  it('muestra la fecha operativa tal cual, sin correrla', () => {
    expect(formatFechaCortaBogota('2026-03-08')).toBe('08 de marzo de 2026')
  })

  it('un cobro de las 9:30 de la noche sigue siendo del mismo dia', () => {
    // 2026-03-09T02:30Z son las 21:30 del 8 de marzo en Bogotá.
    expect(formatFechaCortaBogota('2026-03-09T02:30:00Z')).toBe('08 de marzo de 2026')
  })

  it('y uno de las 11 de la noche tampoco salta al dia siguiente', () => {
    // 2026-03-08T04:00Z son las 23:00 del 7 de marzo en Bogotá.
    expect(formatFechaCortaBogota('2026-03-08T04:00:00Z')).toBe('07 de marzo de 2026')
  })

  it('acepta un Date ya construido', () => {
    expect(formatFechaCortaBogota(new Date('2026-03-08T12:00:00-05:00'))).toBe(
      '08 de marzo de 2026',
    )
  })

  it('no inventa una fecha cuando no hay nada que mostrar', () => {
    expect(formatFechaCortaBogota(null)).toBe('No disponible')
    expect(formatFechaCortaBogota(undefined)).toBe('No disponible')
    expect(formatFechaCortaBogota('')).toBe('No disponible')
    expect(formatFechaCortaBogota('esto-no-es-una-fecha')).toBe('No disponible')
  })
})

describe('formatFechaHumanaBogota', () => {
  it('da la hora de Bogota, no la de quien abre la pantalla', () => {
    const texto = conEspaciosNormales(
      formatFechaHumanaBogota('2026-03-09T02:30:00Z'),
    )

    expect(texto).toContain('08 de marzo de 2026')
    expect(texto).toContain('9:30 p. m.')
  })

  it('la fecha operativa se ancla al mediodia, lejos de los bordes del dia', () => {
    const texto = conEspaciosNormales(formatFechaHumanaBogota('2026-03-08'))

    expect(texto).toContain('08 de marzo de 2026')
    expect(texto).toContain('12:00 p. m.')
  })

  it('no inventa una fecha cuando no hay nada que mostrar', () => {
    expect(formatFechaHumanaBogota(null)).toBe('No disponible')
    expect(formatFechaHumanaBogota('esto-no-es-una-fecha')).toBe('No disponible')
  })
})

/**
 * El ayudante general: cada sitio conserva sus opciones y gana la zona.
 */
describe('formatFechaBogota', () => {
  // 13 de octubre, 8:30 p. m. en Bogotá = 14 de octubre, 01:30 UTC.
  const nocheEnBogota = new Date('2026-10-13T20:30:00-05:00')

  it('no corre el día de una noche de Bogotá', () => {
    expect(formatFechaBogota(nocheEnBogota)).toBe('13/10/2026')
    // En UTC ese instante ya es el 14: así sale sin fijar la zona.
    expect(nocheEnBogota.toISOString()).toContain('2026-10-14')
  })

  it('una fecha operativa YYYY-MM-DD no se muestra un día antes', () => {
    // Este es el que falla incluso con el huso bien puesto:
    // `new Date('2026-10-13')` es medianoche UTC, o sea las 7 p. m. del 12 en
    // Bogotá, así que la pantalla mostraba el 12.
    expect(formatFechaBogota('2026-10-13')).toBe('13/10/2026')
    expect(
      new Date('2026-10-13').toLocaleDateString('es-CO', {
        timeZone: 'America/Bogota',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }),
    ).toBe('12/10/2026')
  })

  it('respeta las opciones que le pasa cada sitio', () => {
    expect(
      formatFechaBogota(nocheEnBogota, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
    ).toContain('2026')
    expect(formatFechaBogota(nocheEnBogota, { month: 'long', year: 'numeric' })).toContain(
      'octubre',
    )
  })

  it('acepta otro locale, para las claves YYYY-MM-DD de agrupación', () => {
    expect(formatFechaBogota(nocheEnBogota, undefined, 'en-CA')).toBe('2026-10-13')
  })

  it('sin valor o con una fecha que no sirve devuelve vacío', () => {
    expect(formatFechaBogota(null)).toBe('')
    expect(formatFechaBogota(undefined)).toBe('')
    expect(formatFechaBogota('')).toBe('')
    expect(formatFechaBogota('no es una fecha')).toBe('')
  })
})

describe('formatHoraBogota', () => {
  const nocheEnBogota = new Date('2026-10-13T20:30:00-05:00')

  it('da la hora de Bogotá, en reloj de 24 horas', () => {
    expect(conEspaciosNormales(formatHoraBogota(nocheEnBogota))).toBe('20:30')
  })

  it('con hour12 devuelve am/pm, para quien lo quiera así', () => {
    const texto = conEspaciosNormales(
      formatHoraBogota(nocheEnBogota, {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }),
    )
    expect(texto).toMatch(/8:30/)
    expect(texto.toLowerCase()).toContain('p')
  })

  it('sin valor devuelve vacío', () => {
    expect(formatHoraBogota(null)).toBe('')
  })
})
