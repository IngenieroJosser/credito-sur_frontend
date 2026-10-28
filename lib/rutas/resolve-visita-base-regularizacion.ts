/**
 * Helper para resolver la visita base en acciones de regularización de cierre pendiente.
 * Busca por prestamoId y cuotaId primero, con fallback a clienteId (legacy).
 */

/**
 * Lo que esta busqueda lee de los dos lados: los ids con los que identifica una
 * obligacion.
 *
 * Son los MISMOS cuatro nombres en el cliente del cierre y en la visita, y por eso la
 * cascada esta duplicada: el dato llega con uno u otro segun el endpoint. `FuenteDeCuotaId`
 * de rutas-core declara justo esto, asi que se reutiliza.
 */
type FuenteDeObligacion = {
  prestamoId?: string | null
  prestamoObjetivoId?: string | null
  clienteId?: string | null
  cuotaId?: string | null
  cuotaObjetivoId?: string | null
  cuotaObjetivoPrestamoId?: string | null
  cuotaObjetivo?: { id?: string | null } | null
}

export function resolveVisitaBaseRegularizacion<T extends FuenteDeObligacion>(
  cliente: FuenteDeObligacion | null | undefined,
  visitasBase: T[],
): T | null {
  const prestamoId = String(
    cliente?.prestamoId ||
    cliente?.prestamoObjetivoId ||
    ''
  )

  const cuotaId = String(
    cliente?.cuotaId ||
    cliente?.cuotaObjetivoId ||
    cliente?.cuotaObjetivo?.id ||
    cliente?.cuotaObjetivoPrestamoId ||
    ''
  )

  // Primero buscar por prestamoId y cuotaId
  const byPrestamoAndCuota = visitasBase.find((v) => {
    const visitaPrestamoId = String(v?.prestamoId || '')
    const visitaCuotaId = String(
      v?.cuotaId ||
      v?.cuotaObjetivoId ||
      v?.cuotaObjetivo?.id ||
      v?.cuotaObjetivoPrestamoId ||
      ''
    )

    return (
      prestamoId &&
      visitaPrestamoId === prestamoId &&
      (!cuotaId || visitaCuotaId === cuotaId)
    )
  })

  if (byPrestamoAndCuota) return byPrestamoAndCuota

  // Segundo buscar solo por prestamoId
  const byPrestamo = visitasBase.find((v) =>
    prestamoId && String(v?.prestamoId || '') === prestamoId
  )

  if (byPrestamo) return byPrestamo

  // Fallback legacy por clienteId
  // `?? null` y no el `undefined` de `find`: la firma dice `| null`, y los consumidores
  // comparan contra `null`. Con `any` las dos cosas eran iguales.
  return (
    visitasBase.find(
      (v) => String(v?.clienteId || '') === String(cliente?.clienteId || ''),
    ) ?? null
  )
}
