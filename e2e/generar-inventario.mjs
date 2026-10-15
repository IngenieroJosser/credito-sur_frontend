// @ts-check
import { readdirSync, statSync, writeFileSync } from 'node:fs'
import { join, posix } from 'node:path'

/**
 * Regenera `e2e/pantallas.generado.ts` a partir de `app/**\/page.tsx`.
 *
 * Existe para que una pantalla nueva entre SOLA en las pruebas de extremo a extremo. Una
 * lista escrita a mano se queda corta en la siguiente rama y nadie se entera: la pantalla
 * nueva es justo la que nadie probó.
 *
 *     node e2e/generar-inventario.mjs
 */

const RAIZ = 'app'

/** Recorre `app/` y devuelve la ruta URL de cada `page.tsx`. */
/** @param {string} dir @returns {string[]} */
function recorrer(dir) {
  const salida = []
  for (const nombre of readdirSync(dir)) {
    const ruta = join(dir, nombre)
    if (statSync(ruta).isDirectory()) {
      salida.push(...recorrer(ruta))
      continue
    }
    if (nombre !== 'page.tsx') continue
    const relativa = ruta.split(/[\\/]/).slice(1, -1)
    // Los grupos de rutas de Next -`(auth)`- organizan carpetas pero NO salen en la URL.
    const partes = relativa.filter((p) => !(p.startsWith('(') && p.endsWith(')')))
    salida.push('/' + posix.join(...partes, '').replace(/\/$/, ''))
  }
  return salida
}

const todas = [...new Set(recorrer(RAIZ))].map((r) => (r === '' ? '/' : r))
const estaticas = todas.filter((r) => !r.includes('[')).sort()
const dinamicas = todas.filter((r) => r.includes('[')).sort()

const lista = (xs) => xs.map((x) => `  '${x}',`).join('\r\n')

const contenido = `/**
 * Inventario de pantallas, GENERADO de \`app/**\\/page.tsx\`.
 *
 * Se genera y no se escribe a mano para que una pantalla nueva entre sola en la prueba:
 * una lista a mano se queda corta en la siguiente rama y nadie se entera.
 *
 * Regenerar: \`node e2e/generar-inventario.mjs\`
 */

/** Las ${estaticas.length} pantallas sin parametros en la URL. */
export const PANTALLAS_ESTATICAS = [
${lista(estaticas)}
] as const

/** Las ${dinamicas.length} pantallas que piden un id en la URL. Se resuelven con datos reales. */
export const PANTALLAS_DINAMICAS = [
${lista(dinamicas)}
] as const
`.replace(/\n/g, '\r\n')

writeFileSync('e2e/pantallas.generado.ts', contenido)
console.log(
  `pantallas.generado.ts: ${estaticas.length} estaticas, ${dinamicas.length} dinamicas`,
)
