import fs from 'fs'
import path from 'path'

/**
 * Que un campo obligatorio lo diga.
 *
 * Si el formulario no deja guardar sin un campo, la pantalla tiene que avisarlo
 * ANTES, no cuando el navegador bloquea el envío con un globo gris. Había 30
 * campos con `required` cuya etiqueta no decía nada: la persona rellenaba lo que
 * creía necesario, pulsaba Guardar y el formulario se quedaba quieto sin
 * explicar por qué.
 *
 * Se arregla mirando cada uno, pero vuelve solo: quien añade un campo copia el
 * de al lado y hereda lo que le falte. Esta prueba es el tope.
 *
 * La marca es la que pinta `FieldLabel required`: un asterisco rojo con
 * `aria-label="obligatorio"`, para que también se oiga en un lector de pantalla.
 */

const RAIZ = path.join(__dirname, '..')
const CARPETAS = ['app', 'components']
const OMITIR = new Set(['node_modules', '.next', 'dist', 'coverage', 'public'])

const CAMPO = /<(input|select|textarea)\b/
/** `required` suelto o a true; no `required={false}` ni `required={variable}`. */
const REQUERIDO = /\brequired\b(?!\s*=\s*\{(?:false|[a-zA-Z]))/
const ETIQUETA = /<FieldLabel\b([^>]*)>|<label\b[^>]*>([\s\S]*?)<\/label>/g

/** Cuántas líneas hacia arriba se busca la etiqueta del campo. */
const ALCANCE = 60

/**
 * Campos obligatorios que hoy no tienen ninguna etiqueta, con su motivo.
 *
 * No es una lista para ir creciendo: si aparece uno nuevo, la prueba falla y
 * hay que ponerle etiqueta, no apuntarlo aquí.
 */
const SIN_ETIQUETA_CONOCIDOS = new Map<string, string>([
  [
    'app/recuperar-contrasena/page.tsx',
    'Los dos campos del paso de recuperación (código y contraseña nueva) no ' +
      'tienen etiqueta, solo marcador de posición. Ponerles una es rehacer ese ' +
      'paso, no añadir un asterisco.',
  ],
])

function archivosTsx(dir: string): string[] {
  const salida: string[] = []
  for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
    if (OMITIR.has(entrada.name)) continue
    const completo = path.join(dir, entrada.name)
    if (entrada.isDirectory()) salida.push(...archivosTsx(completo))
    else if (entrada.name.endsWith('.tsx')) salida.push(completo)
  }
  return salida
}

describe('los campos obligatorios se anuncian', () => {
  it('todo campo con `required` tiene una etiqueta que lo dice', () => {
    const infractores: string[] = []

    for (const carpeta of CARPETAS) {
      for (const archivo of archivosTsx(path.join(RAIZ, carpeta))) {
        const rel = path.relative(RAIZ, archivo).split(path.sep).join('/')
        const lineas = fs.readFileSync(archivo, 'utf8').split('\n')

        lineas.forEach((linea, i) => {
          if (!CAMPO.test(linea)) return

          // El bloque de atributos del campo, hasta que cierra la etiqueta.
          const trozo = lineas.slice(i, i + 14).join('\n')
          const cierre = trozo.indexOf('/>') !== -1 ? trozo.indexOf('/>') : trozo.indexOf('>')
          const campo = cierre !== -1 ? trozo.slice(0, cierre + 2) : trozo
          if (!REQUERIDO.test(campo)) return

          const antes = lineas.slice(Math.max(0, i - ALCANCE), i).join('\n')
          const marcas = [...antes.matchAll(ETIQUETA)]

          if (marcas.length === 0) {
            if (SIN_ETIQUETA_CONOCIDOS.has(rel)) return
            infractores.push(`${rel}:${i + 1} campo obligatorio sin ninguna etiqueta`)
            return
          }

          const ultima = marcas[marcas.length - 1]
          const texto = (ultima[1] ?? '') + (ultima[2] ?? '')
          if (texto.includes('required') || texto.includes('*')) return

          const nombre = texto.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, 40)
          infractores.push(
            `${rel}:${i + 1} el campo "${nombre}" es obligatorio y la etiqueta no lo dice`,
          )
        })
      }
    }

    expect(infractores.join('\n')).toBe('')
  })
})
