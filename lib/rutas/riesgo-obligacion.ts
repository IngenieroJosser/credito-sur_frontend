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
 * Convierte un valor a número positivo. Si el valor no es finito o es <= 0, devuelve 0.
 */
const toPositiveNumber = (value: any): number => {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : 0
}

/**
 * Devuelve el máximo valor positivo de una lista de valores.
 * Si todos son <= 0 o no válidos, devuelve 0.
 */
const maxPositive = (...values: any[]): number => {
  return Math.max(0, ...values.map(toPositiveNumber))
}

/**
 * Función compartida para resolver el riesgo de obligación/crédito.
 * El acumulado vencido es factor dominante para riesgo.
 * El riesgoFuente del backend se usa solo como fallback cuando no hay acumulado vencido suficiente.
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

  // Calcular acumulado vencido (factor dominante para riesgo)
  const montoVencidoAcumulado = resolveMontoVencidoAcumulado({
    row,
    prestamo,
    cuotaObjetivo,
    estadoCalculado,
  })

  // Calcular cuota base usando maxPositive para evitar que 0 bloquee fallback
  const cuotaBase = maxPositive(
    row?.montoCuotaNormal,
    row?.montoCuota,
    row?.montoMetaOperativaPendiente,
    prestamo?.montoCuotaNormal,
    prestamo?.valorCuota,
    cuotaObjetivo?.montoNominal,
    cuotaObjetivo?.montoCuota,
    cuotaObjetivo?.monto,
  )

  // Si está en mora con acumulado vencido, usar ratio como factor dominante
  if (estadoCalculado === 'en_mora' && montoVencidoAcumulado > 0 && cuotaBase > 0) {
    const ratio = montoVencidoAcumulado / cuotaBase

    if (ratio >= 3) return 'LISTA_NEGRA'
    if (ratio >= 2) return 'ROJO'
    if (ratio >= 1) return 'AMARILLO'
  }

  // Solo después usar riesgoFuente como fallback cuando no hay acumulado vencido suficiente
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

  // Si no hay acumulado vencido ni riesgoFuente, usar días de mora y cuotas vencidas
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
 * Usa maxPositive para evitar que 0 bloquee el fallback a saldoTotal cuando está en mora.
 */
export const resolveMontoVencidoAcumulado = (params: {
  row?: any
  prestamo?: any
  cuotaObjetivo?: any
  estadoCalculado?: string
}): number => {
  const { row, prestamo, cuotaObjetivo, estadoCalculado } = params

  // Buscar el máximo valor positivo en campos explícitos de mora
  const directo = maxPositive(
    row?.montoMoraAcumulada,
    row?.montoVencidoAcumulado,
    row?.saldoVencidoAcumulado,
    row?.saldoOperativoJornada,
    prestamo?.montoMoraAcumulada,
    prestamo?.montoVencidoAcumulado,
    prestamo?.saldoVencidoAcumulado,
    prestamo?.saldoOperativoJornada,
    cuotaObjetivo?.montoMoraAcumulada,
    cuotaObjetivo?.montoVencidoAcumulado,
    cuotaObjetivo?.saldoVencidoAcumulado,
  )

  if (directo > 0) return directo

  // Si está en mora y no hay valor directo, usar saldo pendiente/total como fallback
  if (estadoCalculado === 'en_mora') {
    return maxPositive(
      prestamo?.saldoPendiente,
      row?.saldoPendiente,
      row?.saldoTotal,
      prestamo?.saldoTotal,
    )
  }

  return 0
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
