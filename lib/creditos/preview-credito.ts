import { calcularInteresPlano, calcularInteresSimple } from '@/lib/interes'
import { TipoAmortizacion } from '@/types/enums'

/**
 * El resumen financiero que se le muestra a quien está creando un crédito.
 *
 * Esta función vivía dentro de `CrearCreditoModal`, así que no había forma de
 * probarla: es la cifra que el vendedor le lee al cliente antes de firmar, y
 * tiene que coincidir con las cuotas que el backend va a crear
 * (`LoansService.calculateInterestAndCuotas` y su réplica documentada en
 * `src/importaciones/interes-credito.ts`).
 *
 * `__tests__/lib/preview-credito.test.ts` compara las dos sobre la rejilla de
 * montos, tasas, frecuencias y cuotas que el negocio usa de verdad.
 */

export interface PreviewCredito {
  meses: number
  monto: number
  intereses: number
  total: number
  /** Cuotas 1 a n-1. */
  valorCuota: number
  /** Cuota n: absorbe el residuo del reparto, así que casi nunca es igual. */
  valorUltimaCuota: number
  numCuotas: number
  sistema: string
}

export function calcularPrestamoPreview(params: {
  monto: number
  cuotas: number
  tasa: number
  meses: number
  tipoInteres: TipoAmortizacion
}): PreviewCredito | null {
  const monto = Number(params.monto || 0)
  const cuotas = Number(params.cuotas || 0)
  const tasa = Number(params.tasa || 0)

  if (!(monto > 0) || !(cuotas > 0)) {
    return null
  }

  if (
    params.tipoInteres === TipoAmortizacion.INTERES_PLANO ||
    params.tipoInteres === TipoAmortizacion.FRANCESA
  ) {
    // Interés plano, que la empresa llama "Amortización": la tasa se aplica una
    // sola vez sobre el capital, sin importar el plazo.
    const intereses = calcularInteresPlano(monto, tasa)
    const total = monto + intereses
    // Protegido contra cuotas=0 (el campo puede estar vacío mientras se
    // escribe): sin esto la división da Infinity y el preview muestra "$∞".
    const valorCuota = cuotas > 0 ? Math.floor(total / cuotas) : 0
    // La última cuota absorbe el residuo
    const residuo = cuotas > 0 ? total - valorCuota * cuotas : 0

    return {
      meses: params.meses,
      monto,
      intereses,
      total,
      valorCuota,
      valorUltimaCuota: valorCuota + residuo,
      numCuotas: cuotas,
      sistema: 'Amortización',
    }
  }

  // INTERES_SIMPLE: la tasa se aplica por cada mes de plazo.
  const mesesInteres = Math.max(1, params.meses)
  const intereses = calcularInteresSimple(monto, tasa, mesesInteres)
  const total = monto + intereses
  // Reparto como el backend en interés simple: trunca capital e interés por
  // separado, no una división directa del total.
  const baseCapital = cuotas > 0 ? Math.floor(monto / cuotas) : 0
  const baseInteres = cuotas > 0 ? Math.floor(intereses / cuotas) : 0
  const valorCuota = baseCapital + baseInteres

  // La última cuota absorbe los dos residuos (el del capital y el del interés),
  // igual que `construirTablaCuotas` en el backend. Antes no se calculaba, así
  // que el resumen mostraba la cuota normal como si todas fueran iguales: medido
  // sobre 2268 combinaciones reales, la última se cobra hasta $80 por encima.
  const valorUltimaCuota =
    cuotas > 0
      ? monto - baseCapital * (cuotas - 1) + (intereses - baseInteres * (cuotas - 1))
      : 0

  return {
    meses: params.meses,
    monto,
    intereses,
    total,
    valorCuota,
    valorUltimaCuota,
    numCuotas: cuotas,
    sistema: 'Interés Simple',
  }
}
