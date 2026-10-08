import {
  estadoVisitaClasses,
  prioridadColor,
  riesgoBadgeClasses,
  riesgoOperativoLabel,
} from '@/lib/display-labels'

/**
 * Estos cuatro helpers estaban COPIADOS en las cuatro pantallas de ruta (el detalle de
 * admin y de coordinador, SupervisorCobroView y VistaCobrador) y habian divergido. No habia
 * ninguna prueba. Se escriben al unificarlos, porque lo que impide que vuelvan a divergir no
 * es el comentario sino esto.
 *
 * Importa mas de lo que parece: el color y el distintivo son la unica senal de estado que el
 * cobrador ve de un golpe en la lista de la ruta. Si "pagado" es verde en una pantalla y
 * azul en la siguiente, la senal deja de significar algo.
 */
describe('prioridadColor', () => {
  /**
   * Habia DOS juegos de colores: coordinador, supervisor y cobrador usaban
   * naranja / azul / gris, y el detalle de ruta de admin usaba rojo / ambar / verde. Se
   * unifico con el de las tres. Estos son esos valores.
   */
  it('usa el juego que ya compartian tres de las cuatro pantallas', () => {
    expect(prioridadColor('alta')).toBe('#f97316')
    expect(prioridadColor('media')).toBe('#08557f')
    expect(prioridadColor('baja')).toBe('#94a3b8')
  })

  it('sin prioridad cae en el gris, no en el verde', () => {
    // `prioridad` es opcional en `VisitaRuta` —no existe en el esquema, se deriva—, asi que
    // este caso ocurre. La version de admin devolvia VERDE aqui, que en esta pantalla
    // significa "al dia": justo lo contrario de "no se sabe".
    expect(prioridadColor(undefined)).toBe('#94a3b8')
    expect(prioridadColor(null)).toBe('#94a3b8')
  })
})

describe('estadoVisitaClasses', () => {
  it('pagado es VERDE', () => {
    // SupervisorCobroView lo pintaba de azul. Y su valor por defecto tambien era azul, asi
    // que un cliente pagado y uno de estado desconocido se veian igual.
    expect(estadoVisitaClasses('pagado')).toContain('emerald')
  })

  it('cada estado tiene su color, y no se repiten entre si', () => {
    const porEstado = {
      pagado: estadoVisitaClasses('pagado'),
      pendiente: estadoVisitaClasses('pendiente'),
      en_mora: estadoVisitaClasses('en_mora'),
      ausente: estadoVisitaClasses('ausente'),
      reprogramado: estadoVisitaClasses('reprogramado'),
    }
    const valores = Object.values(porEstado)
    expect(new Set(valores).size).toBe(valores.length)
  })

  it('reprogramado es azul y no cae al gris', () => {
    // Solo estaba declarado en admin. En el detalle de coordinador caia al gris por defecto,
    // asi que una cuota reprogramada se veia como un estado desconocido.
    expect(estadoVisitaClasses('reprogramado')).toContain('blue')
    expect(estadoVisitaClasses('reprogramado')).not.toBe(estadoVisitaClasses('cualquier_cosa'))
  })

  it('un estado desconocido es gris, distinto de pagado', () => {
    const desconocido = estadoVisitaClasses('lo_que_sea')
    expect(desconocido).toContain('slate')
    expect(desconocido).not.toBe(estadoVisitaClasses('pagado'))
  })
})

describe('riesgoOperativoLabel', () => {
  it('cambia el guion bajo por espacio, que es lo que hacian las tres copias', () => {
    expect(riesgoOperativoLabel('PELIGRO_MINIMO')).toBe('PELIGRO MINIMO')
    expect(riesgoOperativoLabel('ALTO_RIESGO')).toBe('ALTO RIESGO')
    expect(riesgoOperativoLabel('PRECAUCION')).toBe('PRECAUCION')
  })

  it('sin riesgo devuelve un texto, no una cadena vacia', () => {
    // Aqui NO habia mayoria: una pantalla devolvia '', otra 'Desconocido' y la tercera no lo
    // manejaba. El caso es alcanzable porque en `RutaDeListado` el campo es opcional, y un
    // distintivo sin texto parece roto.
    expect(riesgoOperativoLabel('')).toBe('Sin riesgo')
    expect(riesgoOperativoLabel(undefined)).toBe('Sin riesgo')
    expect(riesgoOperativoLabel(null)).toBe('Sin riesgo')
  })

  /**
   * Esta prueba existe para dejar constancia de por que `riesgoOperativoLabel` NO sirve para
   * el riesgo del cliente. Habia cuatro `getRiesgoLabel` con el mismo nombre y dos dominios
   * distintos: tres reciben el `nivelRiesgo` de una RUTA y la de `creditos-articulos` recibe
   * el riesgo del CLIENTE (`VERDE`, `AMARILLO`, `ROJO`, `LISTA_NEGRA`), que necesita
   * traduccion. Esa se dejo en su sitio y se renombro `riesgoClienteLabel`.
   */
  it('no traduce los valores del riesgo de CLIENTE: es otro dominio', () => {
    expect(riesgoOperativoLabel('VERDE')).toBe('VERDE')
    expect(riesgoOperativoLabel('LISTA_NEGRA')).toBe('LISTA NEGRA')
  })
})

describe('riesgoBadgeClasses', () => {
  it('cubre los cinco valores que produce el backend', () => {
    // Son los cinco literales de `routes.service`: se comprobaron uno por uno antes de
    // extraer la funcion, para que la extraccion fuera un movimiento y no un cambio.
    const clases = [
      'PELIGRO_MINIMO',
      'LEVE_RETRASO',
      'PRECAUCION',
      'RIESGO_MODERADO',
      'ALTO_RIESGO',
    ].map(riesgoBadgeClasses)
    expect(new Set(clases).size).toBe(5)
    for (const c of clases) expect(c).not.toContain('slate')
  })

  it('lo que no reconoce queda en gris', () => {
    expect(riesgoBadgeClasses('OTRA_COSA')).toContain('slate')
  })
})
