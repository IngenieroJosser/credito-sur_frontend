/**
 * Helper compartido para calcular el nivel de riesgo de una visita/obligación.
 * Esta función extrae la lógica exacta de VistaCobrador para centralizar el cálculo de riesgo.
 * Todos los roles (Admin, SuperAdmin, Cobrador, Coordinador, Supervisor) deben usar esta función
 * para garantizar consistencia en el cálculo de riesgo.
 */

import { resolveRiesgoObligacion, resolveNivelRiesgoUi } from './riesgo-obligacion'

// Los tres parametros son los MISMOS que recibe `resolveRiesgoObligacion`, al que este
// helper delega entero: se derivan de su firma con `Parameters<...>` en vez de escribirlos
// otra vez. Asi no pueden separarse. El retorno lo infiere de `resolveNivelRiesgoUi`.
type ParamsDeRiesgo = Parameters<typeof resolveRiesgoObligacion>[0]

export function resolveNivelRiesgoVisita(
  visita: ParamsDeRiesgo['row'],
  prestamo?: ParamsDeRiesgo['prestamo'],
  cuotaObjetivo?: ParamsDeRiesgo['cuotaObjetivo'],
) {
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
