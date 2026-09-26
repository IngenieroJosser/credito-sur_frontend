/**
 * El nombre del cobrador de una ruta, en un solo lugar.
 *
 * En una RUTA el cobrador es un string, no un objeto: los dos endpoints
 * (`GET /routes` y `GET /routes/:id`) pisan la relación de Prisma con
 * `` `${ruta.cobrador.nombres} ${ruta.cobrador.apellidos}` ``. Ver la nota completa
 * en `Ruta` de `types/domain.ts`.
 *
 * Existe porque tres pantallas leían `ruta.cobrador.nombres`. Como el string es
 * truthy, entraban a esa rama, sacaban `undefined` y mostraban el cobrador EN
 * BLANCO — y en `SupervisorCobroView` además se saltaban el respaldo que sí
 * funcionaba.
 *
 * Acepta también la forma de objeto porque hay endpoints que sí la mandan
 * (`reports/operational/route-detail`, y el cobrador de un préstamo), y así una
 * pantalla que reciba cualquiera de las dos no se rompe.
 */

interface CobradorComoObjeto {
  nombres?: string | null
  apellidos?: string | null
}

const esObjetoConNombre = (valor: unknown): valor is CobradorComoObjeto =>
  typeof valor === 'object' && valor !== null && ('nombres' in valor || 'apellidos' in valor)

/**
 * @param cobrador lo que venga en el campo `cobrador`: un nombre ya armado, un
 *   objeto con nombres y apellidos, o nada.
 * @param siNoHay qué devolver cuando no se puede armar un nombre.
 */
export function nombreDelCobrador(cobrador: unknown, siNoHay = ''): string {
  if (esObjetoConNombre(cobrador)) {
    const armado = `${cobrador.nombres ?? ''} ${cobrador.apellidos ?? ''}`.trim()
    return armado || siNoHay
  }

  // El caso normal en una ruta: ya viene armado.
  const texto = String(cobrador ?? '').trim()
  if (!texto) return siNoHay

  // `String({})` da "[object Object]", y eso no es un nombre. Pasa si algún
  // endpoint nuevo manda un objeto con otra forma.
  if (texto === '[object Object]') return siNoHay

  return texto
}
