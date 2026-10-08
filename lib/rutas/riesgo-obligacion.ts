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
 * Lo que este helper lee de cada uno de sus tres argumentos, y nada mas.
 *
 * No son `ObligacionDeJornada` ni `VisitaRuta`: este helper lo llaman SEIS pantallas con
 * las dos formas, y el compilador lo demostro al intentar declararlo con una sola. Lo
 * comun entre ellas es lo que se lee, que son estos campos —los saco un `grep` de las
 * cascadas de `maxPositive`—. Antes eran `any`, asi que un `montoVencidoAcomulado` mal
 * escrito habria valido 0 y bajado el riesgo de un cliente sin que nadie lo viera.
 *
 * Los montos admiten texto porque Prisma serializa `Decimal` como string y todo entra por
 * `toPositiveNumber`.
 */
type MontoLeido = number | string | null | undefined

type FilaDeRiesgo = {
  // Los tres que siguen no los lee ESTE archivo: los lee `resolveNivelRiesgoVisita`, que
  // deriva sus parametros de esta firma. Por eso viven aqui.
  estado?: string | null
  diasMora?: number | null
  estadoAprobacion?: string | null
  esProvisional?: boolean | null
  montoCuota?: MontoLeido
  montoCuotaNormal?: MontoLeido
  montoMetaOperativaPendiente?: MontoLeido
  montoMoraAcumulada?: MontoLeido
  montoVencidoAcumulado?: MontoLeido
  saldoVencidoAcumulado?: MontoLeido
  cuotasVencidas?: number | null
  nivelRiesgoBackend?: string | null
  nivelRiesgoCredito?: string | null
  nivelRiesgoObligacion?: string | null
  riesgoCredito?: string | null
  riesgoOperativo?: string | null
}

type PrestamoDeRiesgo = FilaDeRiesgo & {
  valorCuota?: MontoLeido
}

type CuotaDeRiesgo = {
  diasMora?: number | null
  cuotasVencidas?: number | null
  monto?: MontoLeido
  montoCuota?: MontoLeido
  montoNominal?: MontoLeido
  montoMoraAcumulada?: MontoLeido
  montoVencidoAcumulado?: MontoLeido
  saldoVencidoAcumulado?: MontoLeido
  numeroCuotasVencidas?: number | null
}

/**
 * Convierte un valor a número positivo. Si el valor no es finito o es <= 0, devuelve 0.
 */
const toPositiveNumber = (value: unknown): number => {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : 0
}

/**
 * Devuelve el máximo valor positivo de una lista de valores.
 * Si todos son <= 0 o no válidos, devuelve 0.
 */
const maxPositive = (...values: unknown[]): number => {
  return Math.max(0, ...values.map(toPositiveNumber))
}

/**
 * Ponderación de riesgo para determinar el más severo.
 */
const RISK_WEIGHT: Record<string, number> = {
  VERDE: 0,
  LEVE: 1,
  PRECAUCION: 2,
  ROJO: 3,
  LISTA_NEGRA: 4,
}

/**
 * Normaliza un valor de riesgo a los valores estándar del sistema.
 */
const normalizeRisk = (value: unknown): string | null => {
  const nivel = String(value || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

  const riesgoMap: Record<string, string> = {
    VERDE: 'VERDE',
    MINIMO: 'VERDE',
    BAJO: 'VERDE',

    LEVE: 'LEVE',
    LEVE_RETRASO: 'LEVE',

    AMARILLO: 'PRECAUCION',
    PRECAUCION: 'PRECAUCION',

    ROJO: 'ROJO',
    MODERADO: 'ROJO',

    LISTA_NEGRA: 'LISTA_NEGRA',
    CRITICO: 'LISTA_NEGRA',
    CRÍTICO: 'LISTA_NEGRA',
    ALTO_RIESGO: 'LISTA_NEGRA',
    RIESGO_CRITICO: 'LISTA_NEGRA',
    RIESGO_CRÍTICO: 'LISTA_NEGRA',
  }

  return riesgoMap[nivel] || null
}

/**
 * Devuelve el riesgo más severo de una lista de valores.
 */
const maxRisk = (...values: Array<string | null | undefined>): string => {
  return values.reduce((max: string, current) => {
    const normalized = normalizeRisk(current)
    if (!normalized) return max
    return RISK_WEIGHT[normalized] > RISK_WEIGHT[max] ? normalized : max
  }, 'VERDE')
}

/**
 * Función compartida para resolver el riesgo de obligación/crédito.
 * El acumulado vencido es factor dominante para riesgo.
 * El riesgoFuente del backend se usa solo como fallback cuando no hay acumulado vencido suficiente.
 */
export const resolveRiesgoObligacion = (params: {
  row?: FilaDeRiesgo | null
  prestamo?: PrestamoDeRiesgo | null
  cuotaObjetivo?: CuotaDeRiesgo | null
  estadoCalculado?: string
  diasMora?: number
  cuotasVencidas?: number
  esProvisional?: boolean
}): string => {
  const { row, prestamo, cuotaObjetivo, estadoCalculado, diasMora, cuotasVencidas, esProvisional } =
    params

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

  // Verificar si hay mora estricta (solo cuotas vencidas antes de hoy)
  const dias = Number(diasMora || 0)
  const cuotas = Number(cuotasVencidas || 0)

  const tieneMoraEstricta =
    estadoCalculado === 'en_mora' && (montoVencidoAcumulado > 0 || dias > 0 || cuotas > 0)

  if (!tieneMoraEstricta) {
    return 'VERDE'
  }

  // Calcular riesgo por ratio sin retornar inmediatamente
  let riesgoPorRatio: string | null = null

  if (estadoCalculado === 'en_mora' && montoVencidoAcumulado > 0 && cuotaBase > 0) {
    const ratio = montoVencidoAcumulado / cuotaBase

    if (ratio >= 5) riesgoPorRatio = 'LISTA_NEGRA'
    else if (ratio >= 3) riesgoPorRatio = 'ROJO'
    else if (ratio >= 2) riesgoPorRatio = 'PRECAUCION'
    else if (ratio >= 1) riesgoPorRatio = 'LEVE'
  }

  // Calcular riesgo fuente del backend
  const riesgoFuente =
    row?.nivelRiesgoObligacion ??
    row?.nivelRiesgoCredito ??
    row?.riesgoCredito ??
    row?.riesgoOperativo ??
    row?.nivelRiesgoBackend ??
    prestamo?.nivelRiesgoObligacion ??
    prestamo?.nivelRiesgoCredito ??
    prestamo?.riesgoCredito ??
    prestamo?.riesgoOperativo ??
    prestamo?.nivelRiesgoBackend ??
    null

  // Calcular riesgo por días/cuotas
  let riesgoPorTiempo: string | null = null

  if (estadoCalculado === 'en_mora') {
    const dias = diasMora || 0
    const cuotas = cuotasVencidas || 0

    if (dias >= 15 || cuotas >= 5) riesgoPorTiempo = 'LISTA_NEGRA'
    else if (dias >= 8 || cuotas >= 3) riesgoPorTiempo = 'ROJO'
    else if (dias >= 4 || cuotas >= 2) riesgoPorTiempo = 'PRECAUCION'
    else if (dias >= 1 || cuotas >= 1) riesgoPorTiempo = 'LEVE'
  }

  // Devolver el más severo
  const riesgoFinal = maxRisk(riesgoFuente, riesgoPorRatio, riesgoPorTiempo)

  return riesgoFinal
}

/**
 * Calcular el monto vencido acumulado de una obligación/crédito.
 * Usa maxPositive para evitar que 0 bloquee el fallback a saldoTotal cuando está en mora.
 */
export const resolveMontoVencidoAcumulado = (params: {
  row?: FilaDeRiesgo | null
  prestamo?: PrestamoDeRiesgo | null
  cuotaObjetivo?: CuotaDeRiesgo | null
  estadoCalculado?: string
}): number => {
  const { row, prestamo, cuotaObjetivo, estadoCalculado } = params

  // Buscar el máximo valor positivo en campos explícitos de mora
  // NO incluir saldoOperativoJornada porque podría ser saldo total operativo, no saldo vencido
  const directo = maxPositive(
    row?.montoMoraAcumulada,
    row?.montoVencidoAcumulado,
    row?.saldoVencidoAcumulado,
    prestamo?.montoMoraAcumulada,
    prestamo?.montoVencidoAcumulado,
    prestamo?.saldoVencidoAcumulado,
    cuotaObjetivo?.montoMoraAcumulada,
    cuotaObjetivo?.montoVencidoAcumulado,
    cuotaObjetivo?.saldoVencidoAcumulado,
  )

  if (directo > 0) return directo

  // Si está en mora y no hay valor directo, usar cuota vencida por cuotas vencidas como fallback
  // NO usar saldoPendiente ni saldoTotal porque esos representan el saldo vivo del préstamo, no el monto vencido
  if (estadoCalculado === 'en_mora') {
    const cuotaBase = maxPositive(
      row?.montoCuotaNormal,
      row?.montoCuota,
      prestamo?.montoCuotaNormal,
      prestamo?.valorCuota,
      cuotaObjetivo?.montoNominal,
      cuotaObjetivo?.montoCuota,
      cuotaObjetivo?.monto,
    )

    const cuotasVencidas = maxPositive(
      row?.cuotasVencidas,
      prestamo?.cuotasVencidas,
      cuotaObjetivo?.numeroCuotasVencidas,
    )

    if (cuotaBase > 0 && cuotasVencidas > 0) {
      return cuotaBase * cuotasVencidas
    }

    return cuotaBase
  }

  return 0
}

/**
 * Normalizar el nivel de riesgo para UI.
 */
/** Los cinco niveles que entiende la interfaz. */
export type NivelRiesgoUi =
  | 'minimo'
  | 'leve'
  | 'precaucion'
  | 'moderado'
  | 'critico'
  /** Todavia no se sabe. NO es 'minimo': ver la nota en `resolveNivelRiesgoUi`. */
  | 'desconocido'

export const resolveNivelRiesgoUi = (nivelRiesgoRaw: string): NivelRiesgoUi => {
  const nivel = String(nivelRiesgoRaw || '').toUpperCase()

  const nivelMap: Record<string, NivelRiesgoUi> = {
    VERDE: 'minimo',
    LEVE: 'leve',
    PRECAUCION: 'precaucion',
    ROJO: 'moderado',
    LISTA_NEGRA: 'critico',
  }

  // Si el nivel no viene, NO se asume 'minimo'.
  //
  // Caia aqui mientras los datos todavia estaban cargando, y el cobrador veia la
  // ruta entera en verde —'MINIMO', el mas tranquilizador— para que un segundo
  // despues la mitad pasara a CRITICO con cientos de miles vencidos. En ese hueco
  // alguien decide a quien visita primero.
  return nivelMap[nivel] || 'desconocido'
}
