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

  // Los errores de axios traen el cuerpo del backend aquí dentro.
  if (error && typeof error === 'object') {
    const posible = error as {
      response?: { data?: { message?: unknown } }
      message?: unknown
      error?: { message?: unknown }
    }
    const delCuerpo = posible.response?.data?.message
    if (Array.isArray(delCuerpo) && delCuerpo.length) return delCuerpo.join(' · ')
    if (typeof delCuerpo === 'string' && delCuerpo.trim()) return delCuerpo
    if (typeof posible.message === 'string' && posible.message.trim()) return posible.message
    // Algunos fallos llegan con el motivo un nivel mas adentro, en `error.message`.
    // Seis ficheros lo leian a mano como `err?.message || err?.error?.message`, en
    // ese orden, y aqui se respeta: primero el de arriba, luego el de dentro.
    const delAnidado = posible.error?.message
    if (typeof delAnidado === 'string' && delAnidado.trim()) return delAnidado
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
    response?: { status?: unknown }
  }

  const numero = (valor: unknown): number | undefined => {
    if (typeof valor === 'number' && Number.isFinite(valor)) return valor
    if (typeof valor === 'string' && valor.trim() && !Number.isNaN(Number(valor))) {
      return Number(valor)
    }
    return undefined
  }

  return (
    numero(posible.statusCode) ??
    numero(posible.response?.status) ??
    numero(posible.status)
  )
}
