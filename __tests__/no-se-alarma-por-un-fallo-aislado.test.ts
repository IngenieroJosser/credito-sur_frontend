import {
  FALLOS_SEGUIDOS_PARA_AVISAR,
  anotarChequeo,
} from '@/lib/offline/aviso-de-backend'

/**
 * «Servidor no disponible» solo cuando lo está de verdad.
 *
 * ── Lo que pasaba ─────────────────────────────────────────────────────────
 *
 * Lo reportó el dueño con la pantalla delante: la cápsula decía «Servidor no
 * disponible — Tienes conexión, pero el servidor no respondió», y debajo,
 * en la misma cápsula, «No hay operaciones en cola». O sea que el aviso se
 * contradecía con lo que estaba viendo.
 *
 * Rastreado hasta `checkRealConnectivity`: un solo `GET /health` que tardara
 * más de **4 segundos** ya cambiaba el estado. En Render, con el servicio
 * dormido, el primer golpe tarda de sobra; en un móvil cambiando de antena,
 * un chequeo perdido es lo normal.
 *
 * Un aviso que salta por lo que no es una caída se vuelve ruido: quien lo lee
 * aprende a ignorarlo, y el día que el servidor se caiga de verdad no va a
 * mirarlo. Por eso el arreglo no fue rediseñar la cápsula sino dejar de
 * alarmar por un fallo aislado.
 */
describe('la cápsula tarda en alarmar y es rápida en calmarse', () => {
  it('un fallo aislado NO enciende el aviso', () => {
    const { disponible } = anotarChequeo(0, false)

    expect(disponible).toBe(true)
  })

  it('dos fallos seguidos sí', () => {
    const primero = anotarChequeo(0, false)
    const segundo = anotarChequeo(primero.fallos, false)

    expect(primero.disponible).toBe(true)
    expect(segundo.disponible).toBe(false)
  })

  it('un solo acierto lo apaga, aunque vinieran muchos fallos', () => {
    /*
     * Asimétrico a propósito. Equivocarse hacia «todo bien» no pierde un
     * peso —la cola encola igual, mire lo que mire la cápsula—; equivocarse
     * hacia «está caído» entrena a ignorar el aviso.
     */
    const { fallos, disponible } = anotarChequeo(37, true)

    expect(disponible).toBe(true)
    expect(fallos).toBe(0)
  })

  it('la cuenta se reinicia: fallo, acierto, fallo no alarma', () => {
    /*
     * El caso del móvil que va y viene. Sin reiniciar, dos fallos separados
     * por horas acabarían sumando y encendiendo el aviso sin que el servidor
     * se haya caído nunca.
     */
    const a = anotarChequeo(0, false)
    const b = anotarChequeo(a.fallos, true)
    const c = anotarChequeo(b.fallos, false)

    expect(c.disponible).toBe(true)
    expect(c.fallos).toBe(1)
  })

  it('el umbral es el que dice la constante, no un número escrito aquí', () => {
    /*
     * Si alguien sube el umbral a tres, esta prueba lo sigue; lo que vigila
     * es la REGLA —el último fallo antes del umbral no alarma, el que lo
     * alcanza sí—, no un dos.
     */
    let cuenta = 0
    for (let i = 1; i < FALLOS_SEGUIDOS_PARA_AVISAR; i += 1) {
      const paso = anotarChequeo(cuenta, false)
      cuenta = paso.fallos
      expect(paso.disponible).toBe(true)
    }

    expect(anotarChequeo(cuenta, false).disponible).toBe(false)
  })
})
