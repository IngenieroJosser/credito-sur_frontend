/**
 * El nombre de una persona, venga como texto ya armado o como objeto.
 *
 * El backend manda las dos formas segun el endpoint, y leer la que no es da
 * `undefined` sin fallar: el nombre sale EN BLANCO y nadie se entera. Ha pasado dos
 * veces, en sitios que no se parecen:
 *
 *  - El cobrador de una ruta llega como texto, y tres pantallas leian
 *    `ruta.cobrador.nombres`. Ver `nombreDelCobrador`.
 *  - `GET /loans` manda `cliente` como texto ya compuesto, y la copia offline lo
 *    trataba como objeto (`p.cliente.nombres`), asi que guardaba cadena vacia en
 *    todos los prestamos descargados. Ver `mapearPrestamoDescargado`.
 *
 * Por eso vive en un solo sitio y acepta las dos.
 */

interface PersonaComoObjeto {
  nombres?: string | null
  apellidos?: string | null
}

const esObjetoConNombre = (valor: unknown): valor is PersonaComoObjeto =>
  typeof valor === 'object' && valor !== null && ('nombres' in valor || 'apellidos' in valor)

/**
 * @param persona lo que venga en el campo: un nombre ya armado, un objeto con
 *   nombres y apellidos, o nada.
 * @param siNoHay que devolver cuando no se puede armar un nombre.
 */
export function nombreDePersona(persona: unknown, siNoHay = ''): string {
  if (esObjetoConNombre(persona)) {
    const armado = `${persona.nombres ?? ''} ${persona.apellidos ?? ''}`.trim()
    return armado || siNoHay
  }

  const texto = String(persona ?? '').trim()
  if (!texto) return siNoHay

  // `String({})` da "[object Object]", y eso no es un nombre. Pasa si algun
  // endpoint nuevo manda un objeto con otra forma.
  if (texto === '[object Object]') return siNoHay

  return texto
}
