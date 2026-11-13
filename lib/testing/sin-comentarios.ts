/**
 * Borrar los comentarios de un archivo antes de buscar defectos en él.
 *
 * ── Por qué existe ──────────────────────────────────────────────────────────
 *
 * Las centinelas de este proyecto leen el código y buscan el defecto escrito
 * como literal: un `<select>`, un `z-[100]`, un `obtenerPagos({ limit: 5000 })`
 * sin filtro. Y el mismo literal aparece, inevitablemente, en el comentario que
 * EXPLICA que ese defecto se quitó.
 *
 * Ha pasado cuatro veces ya:
 *
 *   `sin-historial-completo.test.ts`  acusó dos veces a `VistaCobrador`,
 *                                     señalando las líneas donde se explica
 *                                     por qué ya no pide el historial entero
 *   `capas-z-index.test.ts`           acusó a `Portal.tsx` y a
 *                                     `DetallePrestamoModal.tsx` por citar el
 *                                     `z-[2147483620]` que se habia quitado
 *   `armazon-de-la-app.test.ts`       acusó a los seis layouts por nombrar
 *                                     `AdminLayout` al contar que ya no lo
 *                                     montan
 *
 * Cada vez se volvió a escribir el mismo recortador, un poco distinto. Aquí
 * está una sola vez.
 *
 * ── Cómo ────────────────────────────────────────────────────────────────────
 *
 * Línea por línea, no con una expresión sobre todo el texto: así el número de
 * línea de cada hallazgo sigue siendo el de verdad, que es lo que se le enseña
 * a quien tiene que arreglarlo. Las líneas de comentario se quedan vacías, no
 * desaparecen.
 *
 * ── Lo que NO hace ──────────────────────────────────────────────────────────
 *
 * No es un analizador de TypeScript. Un `//` dentro de una cadena de texto
 * —que no sea una URL, que esas sí están tratadas— se lleva por delante el
 * resto de la línea, y las plantillas con `${}` que contengan `/*` tampoco se
 * entienden. Para lo que se usa aquí —buscar literales en JSX— eso no ha dado
 * ningún falso negativo, y el día que lo dé, la prueba que lo note debe
 * arreglarlo AQUÍ y no por su cuenta otra vez.
 */
export function sinComentarios(fuente: string): string {
  let enBloque = false

  return fuente
    .split('\n')
    .map((linea) => {
      let salida = linea

      // Cerrar un bloque que venía abierto de líneas anteriores.
      if (enBloque) {
        const cierre = salida.indexOf('*/')
        if (cierre === -1) return ''
        salida = salida.slice(cierre + 2)
        enBloque = false
      }

      // Bloques que abren y cierran en la misma línea.
      salida = salida.replace(/\/\*[\s\S]*?\*\//g, '')

      // Un bloque que abre y no cierra: el resto de la línea es comentario.
      const apertura = salida.indexOf('/*')
      if (apertura !== -1) {
        salida = salida.slice(0, apertura)
        enBloque = true
      }

      // Y el comentario de línea. El `//` de `https://` no abre uno.
      const marca = salida.replace(/https?:\/\//g, 'https_/_/').indexOf('//')
      return marca === -1 ? salida : salida.slice(0, marca)
    })
    .join('\n')
}
