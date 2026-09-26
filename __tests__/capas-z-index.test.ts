import fs from 'fs'
import path from 'path'

/**
 * Que nada de la página se dibuje encima del menú lateral.
 *
 * En móvil el aside va en `z-[70]` y su fondo oscuro en `z-[65]`. Cualquier
 * elemento de la página con un z igual o mayor sigue viéndose con el menú
 * abierto, y eso es justo lo que pasaba: el botón del ojo de cada tarjeta del
 * cobrador estaba en `z-[80]`, así que con diez visitas en pantalla quedaban
 * diez iconos flotando sobre el menú.
 *
 * El caso se arregla mirando cada elemento, pero vuelve solo: el que añade una
 * capa nueva escribe un número grande "por si acaso" y no tiene forma de saber
 * que existe un tope. Esta prueba es ese tope.
 *
 * Lo que SÍ puede estar por encima es un modal a pantalla completa: se abre
 * sobre todo, incluido el menú. Se reconoce porque tapa la ventana entera
 * (`fixed inset-0`). Lo demás —tarjetas, botones flotantes, avisos, menús
 * desplegables— tiene que caber por debajo; hay sitio de sobra, el contenido
 * normal no pasa de `z-50`.
 */

const RAIZ = path.join(__dirname, '..')
const CARPETAS = ['app', 'components']
const OMITIR = new Set(['node_modules', '.next', 'dist', 'coverage', 'public'])

/** Por encima de esto se tapa el menú. */
const TOPE = 65

/**
 * Excepciones, con su motivo. Son pantallas completas que no se reconocen por
 * `fixed inset-0` o que deben cubrirlo todo a propósito.
 */
const PERMITIDOS = new Map<string, string>([
  ['app/admin/layout.tsx', 'Es el propio menú, más la pantalla de carga inicial.'],
  ['app/login/page.tsx', 'No hay menú en el login.'],
])

const Z = /z-\[(\d+)\]|(?:^|[\s"'`])z-(\d+)(?=[\s"'`]|$)/g
const ES_PANTALLA_COMPLETA = /fixed[^"'`]*inset-0|inset-0[^"'`]*fixed/

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

describe('capas: nada de la página por encima del menú lateral', () => {
  it('todo lo que supera el menú es un modal a pantalla completa', () => {
    const infractores: string[] = []

    for (const carpeta of CARPETAS) {
      for (const archivo of archivosTsx(path.join(RAIZ, carpeta))) {
        const rel = path.relative(RAIZ, archivo).split(path.sep).join('/')
        if (PERMITIDOS.has(rel)) continue

        const lineas = fs.readFileSync(archivo, 'utf8').split('\n')
        lineas.forEach((linea, i) => {
          for (const m of linea.matchAll(Z)) {
            const valor = Number(m[1] ?? m[2])
            if (valor < TOPE) continue
            if (ES_PANTALLA_COMPLETA.test(linea)) continue
            infractores.push(
              `${rel}:${i + 1} usa z-${valor} sin ser pantalla completa\n` +
                `      ${linea.trim().slice(0, 100)}`,
            )
          }
        })
      }
    }

    expect(infractores.join('\n')).toBe('')
  })
})
