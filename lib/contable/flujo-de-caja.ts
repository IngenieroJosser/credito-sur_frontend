type MovimientoDeCaja = {
  impactoCaja?: number | null
  direction?: 'IN' | 'OUT' | null
  tipo?: string
  numero?: string
  monto: number
}

/** El impacto del libro ya está calculado para la caja consultada. */
export function deltaDeCaja(movimiento: MovimientoDeCaja): number | null {
  if (typeof movimiento.impactoCaja === 'number') {
    return Number.isFinite(movimiento.impactoCaja) ? movimiento.impactoCaja : null
  }

  // Los registros anteriores al libro identifican las dos puntas por su número.
  const monto = Math.abs(Number(movimiento.monto))
  if (!Number.isFinite(monto)) return null
  if (movimiento.direction === 'IN') return monto
  if (movimiento.direction === 'OUT') return -monto
  if (movimiento.tipo === 'INGRESO') return monto
  if (movimiento.tipo === 'EGRESO') return -monto
  if (movimiento.tipo === 'TRANSFERENCIA') {
    const numero = movimiento.numero?.toUpperCase()
    if (numero?.startsWith('TRX-IN')) return monto
    if (numero?.startsWith('TRX-OUT')) return -monto
  }
  return null
}
