import { sinComentarios } from '@/lib/testing/sin-comentarios'

/**
 * El recortador del que dependen cuatro centinelas.
 *
 * Si se rompe hacia un lado, las centinelas acusan a los comentarios que
 * explican el defecto —ya pasó cuatro veces—. Si se rompe hacia el otro, se
 * tragan código de verdad y dan verde sin mirar, que es peor porque no se
 * nota. Estas pruebas cierran los dos lados.
 */
describe('sinComentarios', () => {
  it('borra un comentario de línea y deja el código', () => {
    expect(sinComentarios("const x = 1 // antes era un <select>").trim()).toBe(
      'const x = 1',
    )
  })

  it('borra un bloque en una sola línea', () => {
    expect(sinComentarios('const x = /* <select> */ 1').replace(/\s+/g, ' ')).toBe(
      'const x = 1',
    )
  })

  it('borra un bloque de varias líneas y deja las de alrededor', () => {
    const fuente = [
      'const antes = 1',
      '/**',
      ' * Aquí había un <input type="date" /> y un z-[100].',
      ' */',
      'const despues = 2',
    ].join('\n')

    const limpio = sinComentarios(fuente)
    expect(limpio).toContain('const antes = 1')
    expect(limpio).toContain('const despues = 2')
    expect(limpio).not.toContain('<input')
    expect(limpio).not.toContain('z-[100]')
  })

  it('conserva el número de líneas, para que los informes no mientan', () => {
    // Las centinelas cuentan líneas sobre el texto recortado para decirle a
    // quien lo arregla dónde está. Si el recorte comiera líneas, el número
    // apuntaría a otro sitio.
    const fuente = ['a', '/* x', '   y', '   z */', 'b'].join('\n')
    expect(sinComentarios(fuente).split('\n')).toHaveLength(5)
  })

  it('código después de cerrar un bloque sigue estando', () => {
    const fuente = ['/* nota', 'sigue */ const vivo = 1'].join('\n')
    expect(sinComentarios(fuente)).toContain('const vivo = 1')
  })

  it('el `//` de una URL no abre un comentario', () => {
    const fuente = "const u = 'https://ejemplo.co/api-credisur/loans'"
    expect(sinComentarios(fuente)).toBe(fuente)
  })

  it('no se come el código de alrededor', () => {
    // El lado que no se nota: si esto borrara de más, las centinelas pasarían
    // por no mirar.
    const fuente = [
      '<div className="fixed inset-0 capa-modal bg-slate-900/50" />',
      '<Selector value={x} onChange={f} />',
      "const limite = { limit: 5000, cobradorId: id }",
    ].join('\n')
    expect(sinComentarios(fuente)).toBe(fuente)
  })

  it('un archivo sin comentarios sale igual que entró', () => {
    const fuente = ['export const A = 1', '', 'export const B = 2'].join('\n')
    expect(sinComentarios(fuente)).toBe(fuente)
  })
})
