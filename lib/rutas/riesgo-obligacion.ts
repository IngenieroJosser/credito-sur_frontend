/**
 * Helper compartido para cálculo de riesgo de obligación/crédito.
 * Centraliza la lógica de semáforo de riesgo para todas las vistas:
 * - Ruta Actual
 * - Historial
 * - Mis clientes
 * - Vista Cobrador
 * - Vista Supervisor
 * - Vista Coordinador
 * - Vista Admin / SuperAdmin cuando entran a rutas
 *
 * El rol del usuario NO cambia el nivel de riesgo.
 * El rol solo cambia permisos/acciones disponibles.
 */

/**
 * Función compartida para resolver el riesgo de obligación/crédito.
 * Prioriza campos explícitos del backend sobre cálculo manual.
 * El acumulado vencido es factor dominante para riesgo.
 */
export const resolveRiesgoObligacion = (params: {
  row?: any
  prestamo?: any
  cuotaObjetivo?: any
  estadoCalculado?: string
  diasMora?: number
  cuotasVencidas?: number
  esProvisional?: boolean
}): string => {
  const { row, prestamo, cuotaObjetivo, estadoCalculado, diasMora, cuotasVencidas, esProvisional } = params

  // Créditos nuevos pendientes de aprobación sin mora: riesgo mínimo
  if (esProvisional && estadoCalculado === 'pendiente' && (diasMora || 0) === 0) {
    return 'VERDE'
  }

  // Créditos pagados: riesgo mínimo
  if (estadoCalculado === 'pagado') {
    return 'VERDE'
  }

  // Priorizar campos explícitos del backend
  const riesgoFuente =
    row?.nivelRiesgoObligacion ??
    row?.nivelRiesgoCredito ??
    row?.riesgoCredito ??
    row?.riesgoOperativo ??
    prestamo?.nivelRiesgoObligacion ??
    prestamo?.nivelRiesgoCredito ??
    prestamo?.riesgoCredito ??
    null

  if (riesgoFuente) {
    const nivel = String(riesgoFuente).toUpperCase()
    if (['VERDE', 'AMARILLO', 'ROJO', 'LISTA_NEGRA'].includes(nivel)) {
      return nivel
    }
  }

  // Calcular acumulado vencido (factor dominante)
  const montoVencidoAcumulado = Number(
    row?.montoMoraAcumulada ??
    row?.montoVencidoAcumulado ??
    row?.saldoVencidoAcumulado ??
    row?.saldoOperativoJornada ??
    prestamo?.montoMoraAcumulada ??
    prestamo?.montoVencidoAcumulado ??
    prestamo?.saldoVencidoAcumulado ??
    prestamo?.saldoOperativoJornada ??
    cuotaObjetivo?.montoMoraAcumulada ??
    cuotaObjetivo?.montoVencidoAcumulado ??
    cuotaObjetivo?.saldoVencidoAcumulado ??
    (
      estadoCalculado === 'en_mora'
        ? Number(prestamo?.saldoPendiente ?? row?.saldoPendiente ?? row?.saldoTotal ?? 0)
        : 0
    )
  )

  // Calcular cuota base
  const cuotaBase = Number(
    row?.montoCuotaNormal ??
    row?.montoCuota ??
    row?.montoMetaOperativaPendiente ??
    prestamo?.montoCuotaNormal ??
    prestamo?.valorCuota ??
    cuotaObjetivo?.montoNominal ??
    cuotaObjetivo?.montoCuota ??
    cuotaObjetivo?.monto ??
    0
  )

  // Si está en mora con acumulado vencido, usar ratio como factor dominante
  if (estadoCalculado === 'en_mora' && montoVencidoAcumulado > 0 && cuotaBase > 0) {
    const ratio = montoVencidoAcumulado / cuotaBase

    if (ratio >= 3) return 'LISTA_NEGRA'
    if (ratio >= 2) return 'ROJO'
    if (ratio >= 1) return 'AMARILLO'
  }

  // Si no hay acumulado vencido, usar días de mora y cuotas vencidas
  if (estadoCalculado === 'en_mora') {
    const dias = diasMora || 0
    const cuotas = cuotasVencidas || 0

    if (dias >= 30 || cuotas >= 3) {
      return 'LISTA_NEGRA'
    }
    if (dias >= 15 || cuotas >= 2) {
      return 'ROJO'
    }
    if (dias >= 7 || cuotas >= 1) {
      return 'AMARILLO'
    }
  }

  // Créditos pendientes sin mora: riesgo leve
  return 'VERDE'
}

/**
 * Calcular el monto vencido acumulado de una obligación/crédito.
 */
export const resolveMontoVencidoAcumulado = (params: {
  row?: any
  prestamo?: any
  cuotaObjetivo?: any
  estadoCalculado?: string
}): number => {
  const { row, prestamo, cuotaObjetivo, estadoCalculado } = params

  return Number(
    row?.montoMoraAcumulada ??
    row?.montoVencidoAcumulado ??
    row?.saldoVencidoAcumulado ??
    row?.saldoOperativoJornada ??
    prestamo?.montoMoraAcumulada ??
    prestamo?.montoVencidoAcumulado ??
    prestamo?.saldoVencidoAcumulado ??
    prestamo?.saldoOperativoJornada ??
    cuotaObjetivo?.montoMoraAcumulada ??
    cuotaObjetivo?.montoVencidoAcumulado ??
    cuotaObjetivo?.saldoVencidoAcumulado ??
    (
      estadoCalculado === 'en_mora'
        ? Number(prestamo?.saldoPendiente ?? row?.saldoPendiente ?? row?.saldoTotal ?? 0)
        : 0
    )
  )
}

/**
 * Normalizar el nivel de riesgo para UI.
 */
export const resolveNivelRiesgoUi = (nivelRiesgoRaw: string): string => {
  const nivel = String(nivelRiesgoRaw || '').toUpperCase()

  const nivelMap: Record<string, string> = {
    'VERDE': 'bajo',
    'AMARILLO': 'precaucion',
    'ROJO': 'moderado',
    'LISTA_NEGRA': 'critico',
  }

  return nivelMap[nivel] || 'bajo'
}
