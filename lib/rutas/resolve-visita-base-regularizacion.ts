/**
 * Helper para resolver la visita base en acciones de regularización de cierre pendiente.
 * Busca por prestamoId y cuotaId primero, con fallback a clienteId (legacy).
 */

export function resolveVisitaBaseRegularizacion(
  cliente: any,
  visitasBase: any[]
): any | null {
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
  const byPrestamoAndCuota = visitasBase.find((v: any) => {
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
  const byPrestamo = visitasBase.find((v: any) =>
    prestamoId && String(v?.prestamoId || '') === prestamoId
  )

  if (byPrestamo) return byPrestamo

  // Fallback legacy por clienteId
  return visitasBase.find((v: any) =>
    String(v?.clienteId || '') === String(cliente?.clienteId || '')
  )
}
