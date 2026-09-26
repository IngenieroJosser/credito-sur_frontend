import {
  formatFechaCortaBogota,
  formatFechaHumanaBogota,
} from '@/lib/format-date'

/**
 * `Intl` separa "p." de "m." con un espacio duro (U+00A0), no con uno normal.
 * Esa eleccion es cosa de ICU y no es lo que se esta comprobando aqui: lo que
 * importa es el dia y la hora. Se normalizan los espacios para que la prueba
 * no dependa de un detalle invisible.
 */
const conEspaciosNormales = (texto: string) =>
  texto.replace(/[\u00a0\u202f]/g, ' ')

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
    expect(formatFechaCortaBogota('2026-03-09T02:30:00Z')).toBe(
      '08 de marzo de 2026',
    )
  })

  it('y uno de las 11 de la noche tampoco salta al dia siguiente', () => {
    // 2026-03-08T04:00Z son las 23:00 del 7 de marzo en Bogotá.
    expect(formatFechaCortaBogota('2026-03-08T04:00:00Z')).toBe(
      '07 de marzo de 2026',
    )
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
    expect(
      conEspaciosNormales(formatFechaHumanaBogota('2026-03-09T02:30:00Z')),
    ).toBe('08 de marzo de 2026, 9:30 p. m.')
  })

  it('la fecha operativa se ancla al mediodia, lejos de los bordes del dia', () => {
    expect(conEspaciosNormales(formatFechaHumanaBogota('2026-03-08'))).toBe(
      '08 de marzo de 2026, 12:00 p. m.',
    )
  })

  it('no inventa una fecha cuando no hay nada que mostrar', () => {
    expect(formatFechaHumanaBogota(null)).toBe('No disponible')
    expect(formatFechaHumanaBogota('esto-no-es-una-fecha')).toBe(
      'No disponible',
    )
  })
})
