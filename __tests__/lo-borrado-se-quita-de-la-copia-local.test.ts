import { separarBorrados } from '@/lib/offline/syncManager'

/**
 * Lo que se borra en la oficina desaparece del teléfono.
 *
 * ── Por qué existe ────────────────────────────────────────────────────────
 *
 * La copia sin conexión bajaba la cartera entera en cada arranque y
 * REEMPLAZABA el almacén. Con eso, un crédito borrado desaparecía solo: como
 * no venía en la respuesta nueva, el reemplazo lo dejaba fuera.
 *
 * Con la sincronización incremental eso deja de ser cierto. Ahora el servidor
 * manda solo lo que cambió, y la copia se FUSIONA en vez de reemplazarse. Si
 * lo borrado no viniera, o viniera y se guardara como una fila más, el
 * crédito se quedaría vivo en el aparato **para siempre**: nunca volvería a
 * aparecer en ninguna respuesta posterior que pudiera corregirlo.
 *
 * Y vivo en el aparato significa que sale en la ruta del cobrador y que se
 * puede cobrar. Por eso el backend incluye las filas con `eliminadoEn` cuando
 * se le pasa `desde`, y por eso esta función las aparta.
 */
describe('separar lo borrado de lo vivo', () => {
  it('lo que trae `eliminadoEn` va a la lista de borrados, no a la copia', () => {
    const { vivos, borradosIds } = separarBorrados([
      { id: 'a' },
      { id: 'b', eliminadoEn: '2026-11-26T10:00:00.000Z' },
      { id: 'c' },
    ])

    expect(vivos.map((v) => v.id)).toEqual(['a', 'c'])
    expect(borradosIds).toEqual(['b'])
  })

  it('«sin borrar» se escribe de varias formas, y ninguna borra nada', () => {
    /*
     * El caso peligroso es el contrario al que parece: confundir «vivo» con
     * «borrado» vacía la copia local del cobrador en mitad de la jornada.
     * `null`, `undefined` y la cadena vacía significan las tres que el
     * crédito sigue vivo.
     */
    const { vivos, borradosIds } = separarBorrados([
      { id: 'a', eliminadoEn: null },
      { id: 'b', eliminadoEn: undefined },
      { id: 'c', eliminadoEn: '' },
    ])

    expect(vivos.map((v) => v.id)).toEqual(['a', 'b', 'c'])
    expect(borradosIds).toEqual([])
  })

  it('un borrado sin id no se cuela como id vacío', () => {
    /*
     * Un `''` en la lista de borrados se le pasaría a `deleteMany`, que
     * intentaría borrar la clave vacía. No rompe nada hoy, pero es basura
     * que viaja: se corta aquí.
     */
    const { borradosIds } = separarBorrados([
      { id: '', eliminadoEn: '2026-11-26T10:00:00.000Z' },
      { eliminadoEn: '2026-11-26T10:00:00.000Z' },
    ])

    expect(borradosIds).toEqual([])
  })

  it('una respuesta vacía no borra ni guarda nada', () => {
    const { vivos, borradosIds } = separarBorrados([])

    expect(vivos).toEqual([])
    expect(borradosIds).toEqual([])
  })
})
