/**
 * El motivo real de un fallo, para enseñárselo a quien lo provocó.
 *
 * El backend se toma el trabajo de explicar por qué no pudo hacer algo —«El
 * artículo CEL-A15 tiene 4 plazos y la plantilla admite 3», «El dump no está
 * disponible: el servidor necesita pg_dump»— y `exportService` se toma el de
 * sacar ese texto de la respuesta. Y luego la pantalla hacía
 * `catch { toast.error('Error al exportar') }` y lo tiraba a la basura.
 *
 * El resultado para el usuario es el peor de los dos mundos: la operación no se
 * hizo y tampoco sabe por qué, así que vuelve a pulsar. En el caso del
 * inventario eso no iba a funcionar nunca: hacía falta quitarle un plazo a un
 * artículo, y el sistema lo sabía desde el primer intento.
 *
 * Si no hay motivo legible se usa el de respaldo, que es lo que había antes.
 */
export function mensajeDeError(error: unknown, respaldo: string): string {
  if (error instanceof Error && error.message.trim()) return error.message

  if (typeof error === 'string' && error.trim()) return error

  if (!error || typeof error !== 'object') return respaldo

  const posible = error as {
    response?: { data?: { message?: unknown }; message?: unknown }
    data?: { message?: unknown }
    message?: unknown
    error?: { message?: unknown }
  }

  // Los candidatos, en el orden en que los leian las cadenas escritas a mano:
  // primero el cuerpo de la respuesta de axios, luego el cuerpo desenvuelto, luego
  // el mensaje de arriba y por ultimo el que viene un nivel mas adentro.
  const candidatos = [
    posible.response?.data?.message,
    posible.response?.message,
    posible.data?.message,
    posible.message,
    posible.error?.message,
  ]

  for (const candidato of candidatos) {
    // El ValidationPipe de Nest manda una LISTA de mensajes, uno por campo. Se
    // unen todos: quedarse con el primero esconde los demas, y varias cadenas de
    // las que habia ya hacian `Array.isArray(...) ? ....join(', ') : ...`.
    if (Array.isArray(candidato)) {
      const limpios = candidato.map((m) => String(m ?? '').trim()).filter(Boolean)
      if (limpios.length) return limpios.join(' · ')
    }
    if (typeof candidato === 'string' && candidato.trim()) return candidato
  }

  return respaldo
}

/**
 * El estado HTTP de un fallo, sea de donde venga.
 *
 * Se leia a mano en 53 sitios y con tres cadenas distintas segun el fichero:
 * `err?.statusCode` (37 veces), `err?.response?.status` (13) y `err?.status` (3).
 * Depende de como se lanzo el fallo: nuestro `apiRequest` pone `statusCode`, axios
 * lo deja en `response.status`, y un `Response` de fetch en `status`. Ninguna de
 * las tres cadenas sola cubre los tres casos, asi que la misma comprobacion —«un
 * 401 no se reintenta»— se comportaba distinto segun donde estuviera escrita.
 *
 * El orden es el de esas cadenas, de la mas usada a la menos, para no cambiar lo
 * que ya decidian los sitios que las tenian.
 *
 * Devuelve `undefined` cuando no hay estado, que es lo que hacian los `?.`: asi
 * una comparacion como `estadoDeError(e) === 401` da falso en vez de reventar.
 */
export function estadoDeError(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined

  const posible = error as {
    statusCode?: unknown
    status?: unknown
    response?: { status?: unknown; data?: { statusCode?: unknown } }
    error?: { statusCode?: unknown }
  }

  const numero = (valor: unknown): number | undefined => {
    if (typeof valor === 'number' && Number.isFinite(valor)) return valor
    if (typeof valor === 'string' && valor.trim() && !Number.isNaN(Number(valor))) {
      return Number(valor)
    }
    return undefined
  }

  // El ultimo es el estado un nivel mas adentro, que 5 sitios leian como
  // `err?.error?.statusCode`: pasa cuando un ApiError envuelve a otro.
  return (
    numero(posible.statusCode) ??
    numero(posible.response?.status) ??
    numero(posible.status) ??
    numero(posible.error?.statusCode) ??
    numero(posible.response?.data?.statusCode)
  )
}

/**
 * El cuerpo crudo de un fallo, para dejarlo en el registro.
 *
 * Cuatro pantallas escribian el mismo par a mano dentro de su `console.error`:
 * `response: err?.response` y `data: err?.response?.data || err?.data`. Es para
 * mirar, no para decidir: quien tenga que decidir algo usa `estadoDeError` o
 * `mensajeDeError`.
 */
export function datosParaRegistro(error: unknown): {
  response?: unknown
  data?: unknown
} {
  if (!error || typeof error !== 'object') return {}
  const f = error as { response?: { data?: unknown }; data?: unknown }
  return { response: f.response, data: f.response?.data ?? f.data }
}

/**
 * El codigo del fallo: `ECONNABORTED` de axios cuando se agota el tiempo,
 * `ERR_NETWORK` cuando no hay red. De estos cuelgan decisiones, no textos.
 */
export function codigoDeError(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined
  const codigo = (error as { code?: unknown }).code
  return typeof codigo === 'string' && codigo ? codigo : undefined
}
