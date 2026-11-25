import type { DashboardMetrics } from '@/services/dashboard-coordinador-service'

type MetricasMora = Pick<DashboardMetrics, 'delinquentAccounts' | 'delinquentAmount' | 'carteraPendiente'>

/** La muestra de detalle no forma parte del contrato de la tarjeta. */
export function tarjetaDeCarteraEnMora(metrics?: MetricasMora | null) {
  const monto = metrics?.delinquentAmount
  const cuentas = metrics?.delinquentAccounts
  const disponible = typeof monto === 'number' && Number.isFinite(monto)
  return {
    value: disponible ? monto : 'No disponible',
    isCurrency: disponible,
    subValue: typeof cuentas === 'number' && Number.isFinite(cuentas)
      ? textoDeCarteraEnMora({ cuentas, monto: disponible ? monto : 0, carteraPendiente: metrics?.carteraPendiente ?? 0 })
      : undefined,
  }
}
export function textoDeCarteraEnMora({
  cuentas,
  monto,
  carteraPendiente,
}: {
  /** Cuántas cuentas están en mora. */
  cuentas: number
  /** Cuánto suman, con la misma regla que el conteo. */
  monto: number
  /** La cartera pendiente completa, que es contra lo que se mide. */
  carteraPendiente: number
}): string {
  const n = Number(cuentas) || 0
  if (n <= 0) return 'Sin cuentas en mora'

  const etiquetaCuentas = n === 1 ? '1 cuenta' : `${n.toLocaleString('es-CO')} cuentas`

  const total = Number(carteraPendiente) || 0
  const enMora = Number(monto) || 0
  if (total <= 0 || enMora <= 0) {
    // No hay con qué comparar. Se dice lo que se sabe y nada más.
    return etiquetaCuentas
  }

  const porcentaje = (enMora / total) * 100
  const formateado = porcentaje.toLocaleString('es-CO', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })
  return `${etiquetaCuentas} · ${formateado}% de la cartera`
}
