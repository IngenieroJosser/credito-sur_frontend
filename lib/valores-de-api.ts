/**
 * Conversores para leer valores que llegan de la API sin tipo propio.
 *
 * Existe porque el mismo par de funciones estaba escrito a mano en la pantalla de
 * revisiones y en el modal de pago regularizado, y hacia falta en otros seis sitios. Los
 * dos leen campos de columnas `Json` (`datosSolicitud`, `metadata`) o de respuestas que el
 * backend arma a mano, donde cada valor es `unknown` de verdad.
 *
 * Son el equivalente de `textoDeJson` del backend, que existe por el mismo motivo: ahi
 * tambien hubo que convertir lo que salia de un `Json` en vez de leerlo a traves de un `any`.
 *
 * Lo que se gana sobre `any`: un nombre mal escrito deja de compilar en vez de pintar el
 * campo vacio, y un objeto donde se esperaba texto deja de salir como "[object Object]".
 */

/**
 * El valor como TEXTO, o `undefined` si no lo es.
 *
 * Los numeros si se convierten, porque un id o un numero de pago numerico es normal. Un
 * objeto NO: devolver `String(objeto)` daria "[object Object]", que es justo lo que hay que
 * evitar.
 */
export const texto = (valor: unknown): string | undefined => {
  if (typeof valor === 'string') return valor
  if (typeof valor === 'number' && Number.isFinite(valor)) return String(valor)
  return undefined
}

/** El valor como NUMERO, o `undefined` si no se puede convertir. */
export const numero = (valor: unknown): number | undefined => {
  if (valor === null || valor === undefined || valor === '') return undefined
  const n = Number(valor)
  return Number.isFinite(n) ? n : undefined
}

/** El valor como BOOLEANO, tolerando el 'true'/'false' en texto que manda un Json. */
export const booleano = (valor: unknown): boolean => {
  if (typeof valor === 'boolean') return valor
  const t = String(valor ?? '').trim().toLowerCase()
  return t === 'true' || t === '1' || t === 'si'
}

/**
 * El valor como OBJETO indexable, o `{}`.
 *
 * Para columnas `Json` que viajan a veces como objeto y a veces como texto JSON, segun
 * quien las emita. El `catch` devuelve `{}` a proposito: un metadata ilegible no deberia
 * tumbar la pantalla que lo muestra.
 */
export const objeto = (valor: unknown): Record<string, unknown> => {
  if (!valor) return {}
  if (typeof valor === 'object' && !Array.isArray(valor)) {
    return valor as Record<string, unknown>
  }
  if (typeof valor === 'string') {
    try {
      const parsed: unknown = JSON.parse(valor)
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {}
    } catch {
      return {}
    }
  }
  return {}
}

/** El valor como LISTA, o `[]`. Nunca devuelve `undefined`, para poder recorrerla directo. */
export const lista = (valor: unknown): unknown[] =>
  Array.isArray(valor) ? valor : []
