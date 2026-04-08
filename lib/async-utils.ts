// ==========================================================================
// Async utils (helpers compartidos)
//
// Objetivo:
// - Centralizar patrones repetidos en la app para:
//   - Limitar concurrencia (evitar picos de requests / bloqueo de UI)
//   - Memoizar promesas por key (evitar llamadas duplicadas dentro de una misma ejecución)
//
// Importante:
// - Estos helpers NO conocen del dominio (rutas/pagos/cuotas). Son utilidades genéricas.
// - No guardan estado global: el cache vive en el closure de cada invocación.
//   Eso evita fugas de memoria y mantiene el comportamiento determinista.
// ==========================================================================

export const mapWithConcurrency = async <T, R>(
  items: T[],
  mapper: (item: T, index: number) => Promise<R>,
  concurrency: number,
): Promise<R[]> => {
  // Ejecuta un map async con un límite de concurrencia.
  //
  // Garantías:
  // - Preserva el orden de salida: results[i] corresponde a items[i]
  // - No cancela: si una iteración lanza, la promesa general fallará (igual que Promise.all)
  //
  // Motivación:
  // - Muchas partes de la app hacen N requests (cuotas/pagos por id).
  //   Con Promise.all(N) se saturan red/CPU. Este helper evita esos picos.
  const list = Array.isArray(items) ? items : []
  const limit = Math.max(1, Math.floor(concurrency || 1))

  const results: R[] = new Array(list.length)
  let nextIndex = 0

  const worker = async () => {
    while (true) {
      const current = nextIndex
      nextIndex += 1
      if (current >= list.length) return

      results[current] = await mapper(list[current], current)
    }
  }

  const workers = Array.from({ length: Math.min(limit, list.length) }, () => worker())
  await Promise.all(workers)

  return results
}

export const memoizePromiseByKey = <V>(
  loader: (key: string) => Promise<V>,
  onError: () => V | Promise<V>,
) => {
  // Memoiza (cachea) la promesa retornada por `loader(key)`.
  //
  // Uso típico:
  // - getCuotasByPrestamoId = memoizePromiseByKey(id => obtenerCuotas(id), () => [])
  // - getPagosByClienteId  = memoizePromiseByKey(id => obtenerPagos(id),  () => ({ pagos: [] }))
  //
  // Reglas:
  // - Si se llama 2 veces con el mismo key, se reusa la MISMA promesa.
  // - Si falla, se retorna `onError()` (y la promesa fallida queda cacheada).
  //   Para el caso de uso actual, esto es deseable para no reintentar en loop
  //   dentro de la misma operación.
  const cache = new Map<string, Promise<V>>()

  return (key: string) => {
    if (cache.has(key)) return cache.get(key) as Promise<V>
    const p = loader(key).catch(async () => onError())
    cache.set(key, p)
    return p
  }
}
