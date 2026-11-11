import * as fs from 'fs'
import * as path from 'path'

/**
 * Las dos reglas de pantalla que se miden leyendo el código.
 *
 * No son de estilo. Las dos salieron de usar el sistema como lo usa la gente:
 *
 *  1. Un botón que es solo un icono tiene que decir qué hace. La papelera, el
 *     lápiz, el ojo: quien los usa a diario los reconoce, quien entra nuevo no.
 *     Medido antes: 9 botones sin Tooltip ni `aria-label`, casi todos con
 *     `title`, que tarda un segundo en salir, no se ve en el móvil —donde
 *     trabaja el cobrador— y no lo lee un lector de pantalla.
 *
 *  2. Un diálogo tiene que abrir desde abajo en el móvil. Medido antes: 102
 *     componentes pintan su propio contenedor y solo 27 anclaban el panel
 *     abajo. Un diálogo centrado en un teléfono deja los botones en la mitad
 *     de la pantalla, lejos del pulgar; deja franjas de fondo que al tocarlas
 *     cierran el diálogo a mitad de registrar un pago; y al salir el teclado
 *     se parte, escondiendo el campo que se está llenando.
 *
 * Las dos se miden con un TOPE que solo puede bajar, no con un cero absoluto.
 * Exigir cero en los diálogos obligaría a reescribir 75 archivos de golpe, y
 * varios manejan dinero. Con el tope, lo que queda no empeora y cada vez que
 * se arregla uno se baja el número.
 */

const RAIZ = path.join(__dirname, '..', '..')

/** Un `<button>` cuyo contenido es solo un componente de icono. */
const BOTON_DE_ICONO =
  // Sin el flag `s`: el objetivo de TypeScript que usa `next build` no lo
  // admite, y `tsc --noEmit` del proyecto si, asi que el error solo aparecia
  // al construir. Resulta que no hacia falta: `s` solo cambia que `.` case
  // con el salto de linea, y aqui no hay ningun `.` suelto. El primer intento
  // de arreglarlo cambiando `.` por `[\s\S]*?` fue peor: dejaba pasar los
  // botones CON texto y daba 406 falsos positivos.
  /<button\b[^>]*>\s*(?:\{[^}]*\})?\s*<([A-Z][A-Za-z0-9]*)\s[^>]*\/>\s*<\/button>/g

function pantallas(): string[] {
  const salida: string[] = []
  const recorrer = (dir: string) => {
    for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entrada.name === 'node_modules' || entrada.name === '.next') continue
      const completo = path.join(dir, entrada.name)
      if (entrada.isDirectory()) {
        recorrer(completo)
        continue
      }
      if (entrada.name.endsWith('.tsx')) salida.push(completo)
    }
  }
  for (const base of ['app', 'components']) {
    const dir = path.join(RAIZ, base)
    if (fs.existsSync(dir)) recorrer(dir)
  }
  return salida
}

describe('las pantallas se entienden y se usan con el dedo', () => {
  it('ningún botón de solo icono se queda sin decir qué hace', () => {
    const mudos: string[] = []

    for (const archivo of pantallas()) {
      const fuente = fs.readFileSync(archivo, 'utf8')
      const relativo = path.relative(RAIZ, archivo).replace(/\\/g, '/')

      for (const hallado of fuente.matchAll(BOTON_DE_ICONO)) {
        const etiqueta = hallado[0]
        // `aria-label` basta: el lector de pantalla ya tiene el nombre.
        if (etiqueta.includes('aria-label')) continue
        // O un <Tooltip> envolviéndolo, que además se ve.
        const antes = fuente.slice(Math.max(0, hallado.index - 220), hallado.index)
        if (antes.includes('<Tooltip')) continue

        const linea = fuente.slice(0, hallado.index).split('\n').length
        mudos.push(`${relativo}:${linea} -> <${hallado[1]} /> sin ayuda`)
      }
    }

    const informe = mudos.length
      ? [
          'Estos botones son solo un icono y no dicen qué hacen. Quien entra',
          'nuevo al sistema no puede saberlo, y en el móvil el `title` del',
          'navegador no se ve:',
          '',
          ...mudos.map((m) => `  - ${m}`),
          '',
          'Envuélvelo en <Tooltip texto="…"> o ponle aria-label.',
        ].join('\n')
      : 'ninguno'

    expect(informe).toBe('ninguno')
  })

  describe('los diálogos abren desde abajo en el móvil', () => {
    /**
     * Cuántos diálogos siguen saliendo centrados en el teléfono.
     *
     * El tope baja cada vez que se convierte uno. Empezó en 57; cada conversión lo baja.
     */
    const TOPE = 50

    const centradosEnMovil = () => {
      const pendientes: string[] = []
      for (const archivo of pantallas()) {
        const fuente = fs.readFileSync(archivo, 'utf8')
        if (!fuente.includes('fixed inset-0')) continue
        // Ancla abajo en móvil, por clase propia o por las compartidas.
        if (
          fuente.includes('items-end') ||
          fuente.includes('FONDO_HOJA_MODAL') ||
          fuente.includes('hoja-modal')
        ) {
          continue
        }
        pendientes.push(path.relative(RAIZ, archivo).replace(/\\/g, '/'))
      }
      return pendientes
    }

    it(`no quedan más de ${TOPE} sin convertir`, () => {
      const pendientes = centradosEnMovil()

      const informe =
        pendientes.length > TOPE
          ? [
              `Hay ${pendientes.length} diálogos centrados en el móvil y el tope`,
              `es ${TOPE}. Alguno nuevo se escribió pintando su propia caja en`,
              'vez de usar `components/ui/Modal` o las clases de',
              '`lib/ui/hoja-modal`:',
              '',
              ...pendientes.slice(0, 12).map((p) => `  - ${p}`),
            ].join('\n')
          : 'dentro del tope'

      expect(informe).toBe('dentro del tope')
    })

    it('el tope está ajustado: si bajara, hay que bajarlo aquí', () => {
      // Una prueba de tope solo sirve si el tope sigue pegado a la realidad.
      // Con holgura de sobra dejaría pasar una pantalla nueva mal hecha sin
      // que nadie se enterara.
      const cuantos = centradosEnMovil().length
      expect(TOPE - cuantos).toBeLessThanOrEqual(3)
    })
  })

  it('el diálogo compartido y las clases de hoja existen', () => {
    // Si alguien borra o renombra esto, las dos pruebas de arriba pasarían a
    // medir otra cosa sin fallar.
    expect(fs.existsSync(path.join(RAIZ, 'lib', 'ui', 'hoja-modal.ts'))).toBe(
      true,
    )
    const modal = fs.readFileSync(
      path.join(RAIZ, 'components', 'ui', 'Modal.tsx'),
      'utf8',
    )
    expect(modal).toContain('FONDO_HOJA_MODAL')
  })
})
