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
