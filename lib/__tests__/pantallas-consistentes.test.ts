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

/**
 * Los `<button>` cuyo contenido es solo un componente de icono.
 *
 * Esto NO se puede hacer con una expresion regular, y la version anterior era
 * la prueba: usaba
 *
 *     /<button\b[^>]*>\s*(?:\{[^}]*\})?\s*<([A-Z][A-Za-z0-9]*)\s[^>]*\/>…/
 *
 * y `[^>]*` se detiene en el PRIMER `>`, que en
 * `onClick={() => cerrar()}` es el de la flecha. Medido: 496 de 711 botones
 * del proyecto llevan una funcion flecha en su apertura, asi que la prueba no
 * los veia. Pasaba por no mirar, no por estar bien: con un lector que respeta
 * las llaves aparecen 190 botones de solo icono, y 70 sin nada que los nombre.
 *
 * El cierre de la etiqueta se busca contando `{` y `}`, de modo que un `>`
 * dentro de una interpolacion no lo confunde.
 */
function cierreDeEtiqueta(fuente: string, desde: number): number {
  let profundidad = 0
  for (let i = desde; i < fuente.length; i += 1) {
    const c = fuente[i]
    if (c === '{') profundidad += 1
    else if (c === '}') profundidad -= 1
    else if (c === '>' && profundidad === 0) return i
  }
  return -1
}

type BotonDeIcono = { icono: string; apertura: string; indice: number }

function botonesDeIcono(fuente: string): BotonDeIcono[] {
  const salida: BotonDeIcono[] = []

  for (const hallado of fuente.matchAll(/<button[^A-Za-z]/g)) {
    const inicio = hallado.index ?? 0
    const finApertura = cierreDeEtiqueta(fuente, inicio + hallado[0].length)
    if (finApertura < 0) continue

    const cierra = fuente.indexOf('</button>', finApertura)
    if (cierra < 0) continue

    const cuerpo = fuente.slice(finApertura + 1, cierra).trim()
    // Un unico componente autocerrado y nada mas: `<X className="…" />`. Si
    // lleva texto al lado, el boton ya se explica solo.
    const icono = /^<([A-Z][A-Za-z0-9]*)[^<>]*\/>$/.exec(cuerpo)
    if (!icono) continue

    salida.push({
      icono: icono[1],
      apertura: fuente.slice(inicio, finApertura + 1),
      indice: inicio,
    })
  }

  return salida
}

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

      for (const boton of botonesDeIcono(fuente)) {
        // `aria-label` basta: el lector de pantalla ya tiene el nombre.
        if (boton.apertura.includes('aria-label')) continue
        // O un <Tooltip> envolviéndolo, que además se ve.
        const antes = fuente.slice(Math.max(0, boton.indice - 220), boton.indice)
        if (antes.includes('<Tooltip')) continue

        const linea = fuente.slice(0, boton.indice).split('\n').length
        mudos.push(`${relativo}:${linea} -> <${boton.icono} /> sin ayuda`)
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

  it('la misma acción no se nombra de dos formas distintas', () => {
    /**
     * Las etiquetas salieron en buena parte del `title` que ya tenía cada
     * botón, escrito por quien hizo la pantalla. Eso trae el texto bueno, y
     * también sus variantes: aparecieron «Ver detalle», «Ver detalles»,
     * «Ver Detalles» y «Ver Detalle» para el mismo botón según la pantalla, y
     * «Recolectar Dinero» con mayúscula en medio.
     *
     * Para un lector de pantalla son cuatro acciones distintas. Y para quien
     * usa el sistema es la queja de siempre: en una parte se ve una cosa y en
     * otra, otra.
     *
     * Se comparan sin tildes, sin mayúsculas y sin la `s` del plural: lo que se
     * persigue son las variantes de la MISMA etiqueta, no dos acciones que de
     * verdad se llaman parecido.
     */
    const porClave = new Map<string, Set<string>>()

    const clave = (texto: string) =>
      texto
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .trim()
        .replace(/s$/, '')

    for (const archivo of pantallas()) {
      const fuente = fs.readFileSync(archivo, 'utf8')
      for (const hallado of fuente.matchAll(/aria-label="([^"]*)"/g)) {
        const k = clave(hallado[1])
        if (!porClave.has(k)) porClave.set(k, new Set())
        porClave.get(k)?.add(hallado[1])
      }
    }

    const grupos = [...porClave.values()]
      .filter((v) => v.size > 1)
      .map((v) => [...v].sort().join('  /  '))

    const informe = grupos.length
      ? [
          'Estas etiquetas nombran la misma acción de varias formas. Para quien',
          'usa un lector de pantalla son acciones distintas:',
          '',
          ...grupos.map((g) => `  - ${g}`),
          '',
          'Elige una y úsala en todas las pantallas.',
        ].join('\n')
      : 'ninguna'

    expect(informe).toBe('ninguna')
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
