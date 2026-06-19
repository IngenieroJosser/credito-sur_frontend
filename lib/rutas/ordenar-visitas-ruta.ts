/**
 * Helper compartido para ordenar visitas en la vista de ruta actual.
 * Nuevo contrato: ordenar por obligación operativa, no por cliente.
 *
 * Criterio de ordenamiento:
 * 1. Gestionados/pagados al final
 * 2. Primero créditos sin pagos/abonos registrados (fechaUltimoPago = 0)
 * 3. Luego créditos con pago más antiguo (fechaUltimoPago menor)
 * 4. Desempates: mayor monto vencido, más días de mora, más cuotas vencidas
 * 5. Fallback: ordenVisita, nombre, ID
 */

const toNumber = (value: any): number => {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

const isGestionado = (v: any): boolean => {
  const estado = String(v?.estado || '').toLowerCase()
  const estadoVisita = String(v?.estadoVisita || '').toLowerCase()

  return (
    estado === 'pagado' ||
    estado === 'gestionado' ||
    estadoVisita === 'pagado' ||
    estadoVisita === 'gestionado'
  )
}

const resolveFechaOrdenRutaTs = (v: any): number => {
  const fechaUltimoPago = toNumber(
    v?.fechaUltimoPago ??
    v?.ultimoPagoAt ??
    v?.ultimoPagoEn ??
    v?.ultimaFechaPago ??
    0
  )

  if (fechaUltimoPago > 0) return fechaUltimoPago

  return toNumber(
    v?.fechaOrdenRuta ??
    v?.fechaPrimeraCuotaPendienteTs ??
    0
  )
}

export function ordenarVisitasRutaActual(visitas: any[]): any[] {
  return [...(Array.isArray(visitas) ? visitas : [])].sort((a, b) => {
    const aGestionado = isGestionado(a)
    const bGestionado = isGestionado(b)

    if (aGestionado && !bGestionado) return 1
    if (!aGestionado && bGestionado) return -1

    const aOrdenFecha = resolveFechaOrdenRutaTs(a)
    const bOrdenFecha = resolveFechaOrdenRutaTs(b)

    // Si ambos tienen fechaOrdenRuta > 0, ordenar por fecha (más antiguo arriba)
    if (aOrdenFecha > 0 || bOrdenFecha > 0) {
      if (aOrdenFecha !== bOrdenFecha) return aOrdenFecha - bOrdenFecha
    }

    // Desempate 1: mayor monto vencido primero
    const aMora = toNumber(
      a?.montoVencidoAcumulado ??
      a?.montoMoraAcumulada ??
      a?.saldoVencidoAcumulado ??
      0
    )

    const bMora = toNumber(
      b?.montoVencidoAcumulado ??
      b?.montoMoraAcumulada ??
      b?.saldoVencidoAcumulado ??
      0
    )

    if (aMora !== bMora) return bMora - aMora

    // Desempate 2: más días de mora primero
    const aDias = toNumber(a?.diasMora ?? 0)
    const bDias = toNumber(b?.diasMora ?? 0)
    if (aDias !== bDias) return bDias - aDias

    // Desempate 3: más cuotas vencidas primero
    const aCuotas = toNumber(a?.cuotasVencidas ?? 0)
    const bCuotas = toNumber(b?.cuotasVencidas ?? 0)
    if (aCuotas !== bCuotas) return bCuotas - aCuotas

    // Desempate 4: orden operativo manual
    const aOrden = toNumber(a?.ordenVisita ?? 0)
    const bOrden = toNumber(b?.ordenVisita ?? 0)
    if (aOrden !== bOrden) return aOrden - bOrden

    // Fallback estable
    const aNombre = String(a?.cliente || '')
    const bNombre = String(b?.cliente || '')

    const byName = aNombre.localeCompare(bNombre)
    if (byName !== 0) return byName

    return String(a?.id || '').localeCompare(String(b?.id || ''))
  })
}
