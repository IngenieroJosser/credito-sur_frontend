/**
 * Los plazos en meses que la empresa financia en un crédito de artículo.
 *
 * Tres, cinco y ocho meses. Sale de las plantillas de precios que la empresa
 * usa: cada artículo trae su precio de contado y tres precios a plazo, uno para
 * cada uno de esos meses.
 *
 * Antes esta lista estaba escrita cuatro veces, y ninguna de las cuatro decía
 * esto. Tres pantallas ofrecían `[1, 2, 3, 4, 5, 6, 9, 12, 18, 24]` y el
 * servicio de artículos inventaba `[1, 2, 3, 4, 6, 12]` cuando un artículo no
 * tenía precios cargados. Con esas listas, los plazos de 5 y 8 meses —los que la
 * empresa cobra de verdad— no se podían elegir desde ninguna pantalla: solo
 * entraban importando el Excel. Y a cambio se ofrecían plazos de hasta 24 meses,
 * que el negocio no financia y que quedaron guardados en la base.
 *
 * Los precios de cada plazo no se calculan aquí: vienen del artículo, que los
 * trae cargados desde la plantilla. La cuenta con la que la empresa los fija
 * —costo × (1 + rentabilidad) y de ahí un recargo por plazo— vive en el backend,
 * en la plantilla de inventario.
 */
// `readonly number[]` y no `as const`: con la tupla de literales, el estado de
// los formularios quedaba tipado como `meses: 3` y no se le podia asignar el
// plazo que eligiera la persona.
export const PLAZOS_ARTICULO_MESES: readonly number[] = [3, 5, 8];

/** Una opción de crédito tal como la maneja el formulario de artículos. */
export interface OpcionDeCredito {
  meses: number
  precio: number
}

/**
 * Los plazos que ofrece el desplegable de una opción ya agregada.
 *
 * Son los de la empresa más, si hace falta, el que ya tenga esa opción. La
 * plantilla de Excel deja escribir cualquier número de meses, así que puede
 * haber artículos guardados con un plazo que no está en la lista. Sin esta
 * suma, un `<select>` cuyo valor no figura entre sus opciones se pinta en la
 * primera: abrir ese artículo para cambiarle el nombre le habría cambiado el
 * plazo de seis meses a tres sin avisar.
 */
export function opcionesDeMesesParaPlazo(meses: number): number[] {
  return PLAZOS_ARTICULO_MESES.includes(meses)
    ? [...PLAZOS_ARTICULO_MESES]
    : [...PLAZOS_ARTICULO_MESES, meses].sort((a, b) => a - b)
}

/** Plazos que aparecen más de una vez en la lista. */
export function plazosRepetidos(opciones: readonly OpcionDeCredito[]): Set<number> {
  return new Set(
    opciones.map((o) => o.meses).filter((m, i, todos) => todos.indexOf(m) !== i),
  )
}

/**
 * Lo que impide guardar las opciones de crédito, dicho en castellano.
 *
 * Las dos cosas pasaban sin aviso mientras las filas fueron texto de solo
 * lectura, porque lo único que se validaba era el formulario de arriba:
 *
 * - Un precio en cero entraba tal cual. El DTO del backend lo admite
 *   (`@Min(0)`), así que quedaba guardado un plazo que financia gratis.
 * - Dos opciones con el mismo plazo las rechaza la base por su índice único
 *   `@@unique([productoId, meses])`, y el mensaje que llegaba era el de Prisma:
 *   no nombraba el plazo, así que no se sabía qué corregir.
 */
export function problemasDeOpcionesDeCredito(
  opciones: readonly OpcionDeCredito[],
): string[] {
  const problemas: string[] = []

  if (opciones.some((o) => o.precio <= 0)) {
    problemas.push(
      'Hay opciones de crédito sin precio: escríbelo o quita la opción.',
    )
  }

  const repetidos = plazosRepetidos(opciones)
  if (repetidos.size > 0) {
    const lista = [...repetidos].sort((a, b) => a - b).join(' y ')
    problemas.push(
      `El plazo de ${lista} meses está repetido: debe haber una sola opción por plazo.`,
    )
  }

  return problemas
}
