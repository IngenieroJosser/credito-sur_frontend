import * as fs from 'fs'
import * as path from 'path'

import { sinComentarios } from '@/lib/testing/sin-comentarios'

/**
 * Cada etiqueta de formulario nombra a su campo de verdad.
 *
 * ── Lo que había ────────────────────────────────────────────────────────────
 *
 * `FieldLabel` pintaba un `<label>` sin `htmlFor`, y el campo es su HERMANO,
 * no su hijo:
 *
 *     <FieldLabel required>Nombres</FieldLabel>
 *     <input value={formulario.nombres} … />
 *
 * Medido: 80 etiquetas en 11 archivos y CERO campos con `id`. Así que ninguna
 * estaba unida a nada.
 *
 * Lo que eso significa para quien usa el sistema:
 *
 *  - Un lector de pantalla anuncia «cuadro de edición, en blanco». La persona
 *    no sabe qué le están pidiendo.
 *  - Pulsar la etiqueta no lleva el cursor al campo, que es lo que todo el
 *    mundo espera y lo que más ayuda en un teléfono, donde el campo es
 *    pequeño y la etiqueta grande.
 *
 * Se descubrió por una tercera consecuencia: dos pruebas de extremo a extremo
 * que buscaban los campos por su etiqueta no los encontraban y se SALTABAN
 * solas, así que llevaban tiempo sin comprobar nada.
 *
 * ── Qué se exige ────────────────────────────────────────────────────────────
 *
 * Que ninguna etiqueta quede suelta, en cualquiera de las dos formas válidas:
 *
 *   `htmlFor`   cuando nombra UN campo.
 *   `id` + `aria-labelledby` en el contenedor, cuando encabeza un GRUPO —una
 *               fila de botones—. Ahí `htmlFor` apuntaría a un control que no
 *               existe.
 *
 * No se exige lo contrario: un campo puede tener su nombre por `aria-label`,
 * como hacen `Selector` y `CampoFecha` con su prop `etiqueta`.
 */

const RAIZ = path.join(__dirname, '..')
const CARPETAS = ['app', 'components']
const OMITIR = new Set(['node_modules', '.next', 'dist', 'coverage', '__tests__'])

function archivosFuente(dir: string, acc: string[] = []): string[] {
  for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
    if (OMITIR.has(entrada.name)) continue
    const completo = path.join(dir, entrada.name)
    if (entrada.isDirectory()) archivosFuente(completo, acc)
    else if (/\.tsx$/.test(entrada.name) && !/\.(test|spec)\./.test(entrada.name)) {
      acc.push(completo)
    }
  }
  return acc
}

/**
 * Las aperturas de `<FieldLabel …>`, con sus props.
 *
 * `[^>]*` no vale aquí: una prop puede llevar `=>` dentro —ya costó una
 * centinela en este proyecto—. Se busca la apertura y se corta en el primer
 * `>` que cierre la etiqueta contando llaves.
 */
function aperturasDeEtiqueta(texto: string): string[] {
  const aperturas: string[] = []
  const re = /<FieldLabel\b/g
  let m: RegExpExecArray | null

  while ((m = re.exec(texto))) {
    let llaves = 0
    for (let i = m.index; i < texto.length; i++) {
      const ch = texto[i]
      if (ch === '{') llaves++
      else if (ch === '}') llaves--
      else if (ch === '>' && llaves === 0) {
        aperturas.push(texto.slice(m.index, i + 1))
        break
      }
    }
  }
  return aperturas
}

describe('las etiquetas de los formularios apuntan a su campo', () => {
  const archivos = CARPETAS.flatMap((c) => {
    const dir = path.join(RAIZ, c)
    return fs.existsSync(dir) ? archivosFuente(dir) : []
  })

  it('encuentra archivos que revisar', () => {
    expect(archivos.length).toBeGreaterThan(100)
  })

  it('el lector ve las etiquetas que hay', () => {
    // Si el buscador se rompe, lo de abajo pasaría en vacío. Había 80.
    const total = archivos.reduce(
      (suma, a) => suma + aperturasDeEtiqueta(fs.readFileSync(a, 'utf8')).length,
      0,
    )

    expect(total).toBeGreaterThan(50)
  })

  /** El `id="x"` de una apertura, si lo lleva. */
  const idDe = (apertura: string): string | null => {
    // Un espacio delante: asi `data-id="x"` no cuela como si fuera el id
    // de la etiqueta.
    const m = /(?:^|\s)id="([^"]+)"/.exec(apertura)
    return m ? m[1] : null
  }

  it('ninguna queda suelta', () => {
    const infractoras: string[] = []

    for (const archivo of archivos) {
      const relativo = path.relative(RAIZ, archivo).replace(/\\/g, '/')
      const texto = sinComentarios(fs.readFileSync(archivo, 'utf8'))

      for (const apertura of aperturasDeEtiqueta(texto)) {
        // La definición del propio componente declara las props; no es un uso.
        if (relativo.endsWith('ui/FieldLabel.tsx')) continue
        if (apertura.includes('htmlFor')) continue

        /*
         * La otra forma válida: la etiqueta encabeza un GRUPO —una fila de
         * botones— y el contenedor la nombra con `aria-labelledby`. Ahí
         * `htmlFor` apuntaría a un control que no existe.
         */
        const id = idDe(apertura)
        if (id && texto.includes(`aria-labelledby="${id}"`)) continue

        const linea = texto.slice(0, texto.indexOf(apertura)).split('\n').length
        infractoras.push(`${relativo}:${linea}`)
      }
    }

    const informe = infractoras.length
      ? [
          'Estas etiquetas no nombran ningún campo:',
          '',
          ...infractoras.map((i) => `  - ${i}`),
          '',
          'Si nombra UN campo: ponle un `id` al campo y pásalo como `htmlFor`.',
          'Si encabeza un GRUPO de botones: `id` en la etiqueta y',
          '`role="group" aria-labelledby="<ese id>"` en el contenedor.',
          '',
          'Sin eso, el lector de pantalla anuncia el campo sin nombre y pulsar',
          'la etiqueta no lleva el cursor a ningún sitio.',
        ].join('\n')
      : ''

    expect(informe).toBe('')
  })

  it('y ese lector ve el defecto cuando se le pone delante', () => {
    // Comprobada al revés, incluida la prop con `=>` dentro que rompe un
    // `[^>]*` ingenuo.
    const conDefecto = '<FieldLabel required>Nombres</FieldLabel>'
    const correcta = '<FieldLabel htmlFor="x" required>Nombres</FieldLabel>'
    const conFlecha = '<FieldLabel onAlgo={() => ver()}>Nombres</FieldLabel>'

    expect(aperturasDeEtiqueta(conDefecto)[0]).toBe('<FieldLabel required>')
    expect(aperturasDeEtiqueta(correcta)[0]).toContain('htmlFor')
    expect(aperturasDeEtiqueta(conFlecha)[0]).toBe(
      '<FieldLabel onAlgo={() => ver()}>',
    )

    // Y la forma de grupo se reconoce por su id, no por casualidad.
    expect(idDe('<FieldLabel id="metodo" required>')).toBe('metodo')
    expect(idDe('<FieldLabel required>')).toBeNull()
  })
})
