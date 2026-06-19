/**
 * Helper compartido para calcular el nivel de riesgo de una visita/obligación.
 * Esta función extrae la lógica exacta de VistaCobrador para centralizar el cálculo de riesgo.
 * Todos los roles (Admin, SuperAdmin, Cobrador, Coordinador, Supervisor) deben usar esta función
 * para garantizar consistencia en el cálculo de riesgo.
 */

import { resolveRiesgoObligacion, resolveNivelRiesgoUi } from './riesgo-obligacion'

export function resolveNivelRiesgoVisita(
  visita: any,
  prestamo?: any,
  cuotaObjetivo?: any
): any {
  const estadoCalculado = visita?.estado || 'pendiente'
  const diasMora = Number(
    cuotaObjetivo?.diasMora || prestamo?.diasMora || visita?.diasMora || 0
  )
  const cuotasVencidas = Number(
    visita?.cuotasVencidas ?? cuotaObjetivo?.cuotasVencidas ?? 0
  )
  const esProvisional =
    Boolean(prestamo?.esProvisional) ||
    String(prestamo?.estadoAprobacion || '').toUpperCase() === 'PENDIENTE'

  const nivelRiesgoRaw = resolveRiesgoObligacion({
    row: visita,
    prestamo: prestamo || {},
    cuotaObjetivo,
    estadoCalculado,
    diasMora,
    cuotasVencidas,
    esProvisional,
  })

  return resolveNivelRiesgoUi(nivelRiesgoRaw)
}
