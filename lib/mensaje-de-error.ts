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
    }
    const delCuerpo = posible.response?.data?.message
    if (Array.isArray(delCuerpo) && delCuerpo.length) return delCuerpo.join(' · ')
    if (typeof delCuerpo === 'string' && delCuerpo.trim()) return delCuerpo
    if (typeof posible.message === 'string' && posible.message.trim()) return posible.message
  }

  return respaldo
}
