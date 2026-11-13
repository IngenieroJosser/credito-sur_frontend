import * as fs from 'fs'
import * as path from 'path'

/**
 * Que no vuelva a entrar un control dibujado por el navegador.
 *
 * ── Lo que pasaba ───────────────────────────────────────────────────────────
 *
 * Medido antes de empezar: 56 `<select>` con 140 `<option>`, 18 campos de
 * fecha, 7 casillas, 5 campos numéricos con sus flechitas y 10 selectores de
 * archivo, todos con la apariencia del sistema operativo. La misma pantalla se
 * veía distinta en el teléfono del cobrador que en el escritorio del contador,
 * y el campo de fecha nativo enseñaba la fecha en el formato del SISTEMA: un
 * teléfono en inglés pinta `11/13/2026` donde el resto de la aplicación
 * —escrita entera en hora y formato de Colombia— pinta `13/11/2026`.
 *
 * ── Qué se exige ────────────────────────────────────────────────────────────
 *
 * Cada categoría se cierra donde se puede cerrar, y esta prueba vigila el
 * sitio donde se cerró:
 *
 *   `<select>` / `<option>`       no existen: va `components/ui/Selector`
 *   `date` / `datetime-local`     no existen: va `components/ui/CampoFecha`
 *   `alert` / `confirm` / `prompt`  no existen: van los modales propios
 *   casilla, número y archivo     siguen siendo `<input>`, y lo que les quita
 *                                 la pinta nativa está en `globals.css`; lo
 *                                 que se exige es que esas reglas sigan ahí
 *   `<details>`                   su triángulo está oculto en el CSS, así que
 *                                 tiene que traer su propia flecha
 *
 * ── El límite de la medición ────────────────────────────────────────────────
 *
 * Esto lee el código, no el navegador: ve lo que está escrito como literal. Un
 * `type={variable}` o un elemento creado con `document.createElement` no se
 * distinguen de ninguno. Por eso la última prueba le pone un piso: si el
 * lector se rompe y deja de mirar, pasar de cero no es señal de nada.
 */

const RAIZ = path.join(__dirname, '..', '..')
const CARPETAS = ['app', 'components', 'lib', 'hooks', 'services']

/** Las líneas y bloques de comentario se borran antes de buscar. */
function sinComentarios(fuente: string): string {
  const sinLinea = fuente
    .split('\n')
    .map((linea) => {
      // Un `//` dentro de una URL (`https://…`) no abre un comentario.
      const marca = linea.replace(/https?:\/\//g, 'https_/_/').indexOf('//')
      return marca === -1 ? linea : linea.slice(0, marca)
    })
    .join('\n')

  return sinLinea.replace(/\/\*[\s\S]*?\*\//g, (bloque) =>
    bloque
      .split('\n')
      .map(() => '')
      .join('\n'),
  )
}

type Fuente = { relativo: string; texto: string; lineas: number }

function fuentes(): Fuente[] {
  const salida: Fuente[] = []
  const recorrer = (dir: string) => {
    for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entrada.name === 'node_modules' || entrada.name === '.next') continue
      const completo = path.join(dir, entrada.name)
      if (entrada.isDirectory()) {
        recorrer(completo)
        continue
      }
      if (!/\.tsx?$/.test(entrada.name)) continue
      if (entrada.name.includes('.test.') || entrada.name.includes('.spec.')) {
        continue
      }
      const bruto = fs.readFileSync(completo, 'utf8')
      salida.push({
        relativo: path.relative(RAIZ, completo).replace(/\\/g, '/'),
        texto: sinComentarios(bruto),
        lineas: bruto.split('\n').length,
      })
    }
  }
  for (const base of CARPETAS) {
    const dir = path.join(RAIZ, base)
    if (fs.existsSync(dir)) recorrer(dir)
  }
  return salida
}

const TODAS = fuentes()

function buscar(patron: RegExp): string[] {
  const hallazgos: string[] = []
  for (const { relativo, texto } of TODAS) {
    for (const hallado of texto.matchAll(new RegExp(patron, 'g'))) {
      const linea = texto.slice(0, hallado.index).split('\n').length
      hallazgos.push(`${relativo}:${linea} -> ${hallado[0].trim()}`)
    }
  }
  return hallazgos
}

function informe(hallazgos: string[], consejo: string): string {
  if (!hallazgos.length) return 'ninguno'
  return [...hallazgos.map((h) => `  - ${h}`), '', consejo].join('\n')
}

describe('ningún control lo dibuja el navegador', () => {
  it('no queda ningún <select> ni <option>', () => {
    expect(
      informe(
        buscar(/<\s*(select|option)[\s>]/i),
        'Va `Selector` de `components/ui/Selector`: mismo valor y mismo ' +
          '`onChange`, pero con teclado, con flechas, con escribir para ' +
          'buscar, y en el móvil abriendo desde abajo como el resto de los ' +
          'diálogos.',
      ),
    ).toBe('ninguno')
  })

  it('no queda ningún campo de fecha nativo', () => {
    expect(
      informe(
        buscar(/type\s*=\s*["'](date|datetime-local|time|month|week)["']/i),
        'Va `CampoFecha` de `components/ui/CampoFecha`: el valor sigue ' +
          'siendo `YYYY-MM-DD`, así que el formulario no cambia, pero el ' +
          'calendario es el nuestro y la fecha se lee «13 de noviembre de ' +
          '2026» en vez de en el formato del sistema operativo.',
      ),
    ).toBe('ninguno')
  })

  it('no queda ningún alert, confirm ni prompt del navegador', () => {
    expect(
      informe(
        buscar(/(^|[^.\w$])(window\.)?(alert|confirm|prompt)\s*\(/),
        'Esos tres bloquean la pestaña entera y los pinta el navegador. Van ' +
          'los modales del sistema (`ConfirmModal`, `ConfirmRejectModal`) o ' +
          'un aviso de `sonner`.',
      ),
    ).toBe('ninguno')
  })

  it('no entra ningún otro control que el navegador pinte a su manera', () => {
    // Estos no existen hoy —medido: cero— y no hay componente propio para
    // ellos. Si alguien necesita uno, lo que toca es escribirlo, no colar el
    // nativo: de eso trata todo este archivo.
    expect(
      informe(
        buscar(/(type\s*=\s*["'](range|color|radio)["']|<\s*(progress|meter|dialog)[\s>])/i),
        'No hay componente propio para esto todavía. Escríbelo en ' +
          '`components/ui/` como se hizo con `Selector` y `CampoFecha`, ' +
          'reutilizando `Portal`, `lib/ui/hoja-modal` y `use-modal-dialog`.',
      ),
    ).toBe('ninguno')
  })

  it('cada <details> trae su propia flecha', () => {
    // El triángulo nativo está oculto en `globals.css`, así que un `<details>`
    // sin flecha propia no tiene NINGUNA señal de que se abre.
    const mudos = TODAS.filter(
      (f) => /<\s*details[\s>]/i.test(f.texto) && !/group-open:rotate/.test(f.texto),
    ).map((f) => f.relativo)

    expect(
      informe(
        mudos,
        'Al `<summary>` le falta un icono con `group-open:rotate-90` (y el ' +
          '`<details>` la clase `group`), como en ' +
          '`ImpactoCajaPreview.tsx`. Si no, el bloque se abre sin avisar de ' +
          'que se podía abrir.',
      ),
    ).toBe('ninguno')
  })
})

describe('lo que al <input> le quita la pinta nativa sigue en el CSS', () => {
  // Casillas, campos numéricos y selectores de archivo siguen siendo
  // `<input>`: lo que se cambió es cómo se ven, y eso vive en una sola hoja.
  // Borrar estas reglas devolvería la apariencia del sistema operativo a 6
  // casillas, 5 campos numéricos y 12 selectores de archivo de golpe, sin que
  // nada fallara a la vista.
  const CSS = fs.readFileSync(path.join(RAIZ, 'app', 'globals.css'), 'utf8')

  const REGLAS: Array<[string, string]> = [
    ['la casilla propia', "input[type='checkbox']:not([data-nativa])"],
    ['su palomita', 'clip-path'],
    ['las flechitas del campo numérico', '::-webkit-outer-spin-button'],
    ['el botón de elegir archivo', '::file-selector-button'],
    ['el triángulo del <details>', 'details > summary::marker'],
    ['el relleno amarillo de Chrome', ':-webkit-autofill'],
    ['el gris del placeholder', '::placeholder'],
  ]

  for (const [nombre, regla] of REGLAS) {
    it(`sigue estando ${nombre}`, () => {
      expect({ regla, enGlobalsCss: CSS.includes(regla) }).toEqual({
        regla,
        enGlobalsCss: true,
      })
    })
  }
})

describe('el lector de esta prueba mira de verdad', () => {
  /*
   * El piso, con los números del día que se midió.
   *
   * Una prueba como esta puede pasar por no mirar: una expresión regular mal
   * escrita, una carpeta que se renombra, un `readdirSync` que ya no entra en
   * los subdirectorios, y el resultado es cero hallazgos y verde. Ya pasó una
   * vez en este proyecto con otra centinela.
   *
   * Los topes van holgados a la baja —la mitad de lo medido— para que no
   * fallen cuando alguien borre pantallas, pero bastan para delatar a un
   * lector que se quedó a cero.
   */
  it('recorre todo el código, no un trozo', () => {
    // Medido: 424 archivos y ~200.000 líneas.
    const lineas = TODAS.reduce((suma, f) => suma + f.lineas, 0)
    expect({
      archivos: TODAS.length > 200,
      lineas: lineas > 50_000,
      carpetas: CARPETAS.every((c) => TODAS.some((f) => f.relativo.startsWith(`${c}/`))),
    }).toEqual({ archivos: true, lineas: true, carpetas: true })
  })

  it('los componentes que sustituyeron a los nativos están puestos', () => {
    // Si los hallazgos son cero porque nadie usa nada, esto lo delata: lo que
    // había eran 56 desplegables y 18 fechas, y ahora tienen que estar los
    // componentes propios en su lugar.
    const con = (patron: string) => TODAS.filter((f) => f.texto.includes(patron)).length
    expect({
      selector: con('<Selector') >= 12,
      campoFecha: con('<CampoFecha') >= 6,
    }).toEqual({ selector: true, campoFecha: true })
  })

  it('el lector encuentra el defecto cuando se le pone delante', () => {
    // Comprobada al revés: se le dan a los mismos patrones un texto con el
    // defecto metido a mano. Si alguno no lo ve, las pruebas de arriba están
    // dando verde por no mirar.
    const conDefecto = `
      export default function Mal() {
        return (
          <div>
            <select><option value="1">Uno</option></select>
            <input type="date" />
            <input type="datetime-local" />
            <input type="range" />
            <details><summary>Sin flecha</summary></details>
          </div>
        )
      }
    `
    const ve = (patron: RegExp) => patron.test(conDefecto)
    expect({
      select: ve(/<\s*(select|option)[\s>]/i),
      fecha: ve(/type\s*=\s*["'](date|datetime-local|time|month|week)["']/i),
      otros: ve(/(type\s*=\s*["'](range|color|radio)["']|<\s*(progress|meter|dialog)[\s>])/i),
      detailsMudo:
        /<\s*details[\s>]/i.test(conDefecto) && !/group-open:rotate/.test(conDefecto),
    }).toEqual({ select: true, fecha: true, otros: true, detailsMudo: true })
  })

  it('y no confunde un comentario con el defecto', () => {
    // El otro lado del mismo error: la primera versión de otra centinela
    // acusó a los comentarios que EXPLICAN el problema. Los `<select>` que
    // quedan en el código son todos texto de comentario.
    const soloComentario = [
      '// Antes esto era un <select> con sus <option>.',
      '/* Y aquí había un <input type="date" />. */',
      'const x = 1',
    ].join('\n')
    const limpio = sinComentarios(soloComentario)
    expect({
      select: /<\s*(select|option)[\s>]/i.test(limpio),
      fecha: /type\s*=\s*["'](date|datetime-local)["']/i.test(limpio),
      codigo: limpio.includes('const x = 1'),
    }).toEqual({ select: false, fecha: false, codigo: true })
  })
})
