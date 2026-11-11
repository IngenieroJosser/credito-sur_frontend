/**
 * Saca la lista de una respuesta de la API, sea como venga envuelta.
 *
 * Los listados de este backend no comparten forma. Medido endpoint por
 * endpoint, con la sesión del superadministrador:
 *
 *     GET /routes              -> { data, meta }
 *     GET /clients             -> { clientes, estadisticas }
 *     GET /loans               -> { prestamos, estadisticas, paginacion }
 *     GET /payments            -> { pagos, paginacion }
 *     GET /inventory           -> el arreglo, pelado
 *     GET /usuarios            -> el arreglo, pelado
 *     GET /accounting/cajas    -> el arreglo, pelado
 *
 * Siete listados, cuatro formas. El problema no es la variedad en sí: es que
 * **leer la clave equivocada no da error**. Da `undefined`, que un `|| []` o un
 * `?.map` convierte en lista vacía, y la pantalla sale en blanco como si no
 * hubiera datos. No hay nada que avise.
 *
 * No es hipotético y no le pasa solo a quien llega nuevo: escribiendo las
 * pruebas de caos de este mismo repositorio se leyó `rutas` en vez de `data`, y
 * la prueba se saltó sola diciendo «no hay ninguna ruta en la base» con dos
 * rutas activas dentro. Una prueba en verde que no comprobaba nada.
 *
 * La otra mitad del problema es la contraria: `resp.data.map(...)` sin guarda,
 * que hay en varias pantallas de contabilidad y reportes. Ahí acertar la clave
 * no basta —si la respuesta llega sin ella, la pantalla revienta en vez de
 * quedarse vacía—.
 *
 * ── Por qué aquí y no cambiando el backend ──────────────────────────────────
 *
 * Unificar las respuestas del servidor sería más limpio, y es lo que habría que
 * hacer algún día. Pero esas formas son el contrato que ya leen las pantallas,
 * los servicios y la copia que se guarda para trabajar sin conexión: cambiar
 * `{ data }` por `{ rutas }` dejaría en blanco cada sitio que hoy funciona, y
 * de golpe. Esto lo tolera desde el lado que lee, que es donde duele.
 */

/** Las claves con las que este backend envuelve una lista, en orden. */
const ENVOLTORIOS = [
  'data',
  'clientes',
  'prestamos',
  'pagos',
  'rutas',
  'items',
  'usuarios',
  'cajas',
  'productos',
  'resultados',
] as const

/**
 * De qué son los elementos de la lista que trae una respuesta.
 *
 * Existe para que el tipo no se pierda por el camino. Sin esto, cambiar
 * `resp.data.map(m => mapear(m))` por `listaDeRespuesta(resp).map(...)` dejaba
 * cada elemento en `unknown` y el compilador rechazaba todos los `.map` de las
 * pantallas de contabilidad y reportes —seis en un solo archivo—. Taparlo con
 * `as` habría apagado la comprobación justo en las pantallas que manejan
 * dinero, que es donde más vale tenerla.
 *
 * El orden de las ramas es el mismo que el de `ENVOLTORIOS` de abajo, para que
 * lo que afirma el tipo y lo que hace el código no se separen.
 */
type ElementoDe<R> =
  R extends readonly (infer T)[]
    ? T
    : R extends { data: readonly (infer T)[] }
      ? T
      : R extends { clientes: readonly (infer T)[] }
        ? T
        : R extends { prestamos: readonly (infer T)[] }
          ? T
          : R extends { pagos: readonly (infer T)[] }
            ? T
            : R extends { rutas: readonly (infer T)[] }
              ? T
              : R extends { items: readonly (infer T)[] }
                ? T
                : R extends { usuarios: readonly (infer T)[] }
                  ? T
                  : R extends { cajas: readonly (infer T)[] }
                    ? T
                    : R extends { productos: readonly (infer T)[] }
                      ? T
                      : R extends { resultados: readonly (infer T)[] }
                        ? T
                        : unknown

/**
 * La lista que trae una respuesta, o `[]` si no trae ninguna.
 *
 * Nunca lanza y nunca devuelve `undefined`: quien la llama puede hacer `.map`
 * sin guarda. Eso es justo lo que evita el reventón de `resp.data.map(...)`.
 */
export function listaDeRespuesta<R>(respuesta: R): ElementoDe<R>[] {
  type Elemento = ElementoDe<R>

  if (Array.isArray(respuesta)) return respuesta as Elemento[]
  if (!respuesta || typeof respuesta !== 'object') return []

  const objeto = respuesta as Record<string, unknown>
  for (const clave of ENVOLTORIOS) {
    const valor = objeto[clave]
    if (Array.isArray(valor)) return valor as Elemento[]
  }

  return []
}

/**
 * Igual, pero avisa cuando la respuesta traía algo y no se supo leer.
 *
 * Para los sitios donde una lista vacía y «no entendí la respuesta» tienen
 * consecuencias distintas: una prueba que debería fallar en vez de saltarse, o
 * una pantalla que debería decir «no se pudo cargar» en vez de «no hay nada».
 * Es la distinción entre el cero que es verdad y el hueco disfrazado de cero.
 *
 * `reconocida` es `false` solo cuando llegó un objeto con contenido y ninguna
 * de sus claves era una lista. Un `[]` de verdad, o un objeto cuya lista está
 * vacía, cuentan como reconocidos: ahí el vacío es el dato.
 */
export function listaDeRespuestaConAviso<T = unknown>(
  respuesta: unknown,
): { lista: T[]; reconocida: boolean } {
  if (Array.isArray(respuesta)) {
    return { lista: respuesta as T[], reconocida: true }
  }
  if (!respuesta || typeof respuesta !== 'object') {
    return { lista: [], reconocida: false }
  }

  const objeto = respuesta as Record<string, unknown>
  for (const clave of ENVOLTORIOS) {
    if (Array.isArray(objeto[clave])) {
      return { lista: objeto[clave] as T[], reconocida: true }
    }
  }

  // Un objeto vacío `{}` se cuenta como reconocido: no hay contenido que se
  // haya dejado sin leer, así que no hay nada de lo que avisar.
  return { lista: [], reconocida: Object.keys(objeto).length === 0 }
}
