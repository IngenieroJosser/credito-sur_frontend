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
    cuotas > 0 ? monto - baseCapital * (cuotas - 1) + (intereses - baseInteres * (cuotas - 1)) : 0

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

/**
 * Cuotas que caben en un mes según la frecuencia.
 *
 * Son los factores de `CrearCreditoModal` y de `createLoan` en el backend
 * (`CUOTAS_POR_MES` en `src/importaciones/interes-credito.ts`). El formulario de
 * página completa `CreacionPrestamo` usa 4,33 para SEMANAL y por eso deriva un
 * número de cuotas distinto; eso está pendiente de decisión y no se toca aquí.
 */
export const CUOTAS_POR_MES: Record<string, number> = {
  DIARIO: 30,
  SEMANAL: 4,
  QUINCENAL: 2,
  MENSUAL: 1,
}

/**
 * Plazo en meses derivado del número de cuotas y la frecuencia.
 *
 * Puede quedar fraccionario a propósito (45 cuotas diarias = 1,5 meses): ese es
 * el valor que entra al cálculo de interés simple, aunque la columna
 * `plazoMeses` de la base sea entera. Usar el entero redondeado en su lugar
 * infla el interés: para 45 cuotas diarias serían 2 meses en vez de 1,5, un 33%
 * más.
 */
export function derivarPlazoMeses(cuotas: number, frecuenciaPago: string): number {
  const factor = CUOTAS_POR_MES[String(frecuenciaPago || '').toUpperCase()]
  if (!factor || !(cuotas > 0)) return 0
  return cuotas / factor
}

/**
 * Reparto en cuotas cuando el interés total ya se conoce.
 *
 * Es el caso de las pantallas de aprobación y de los detalles de una solicitud:
 * el interés viene con los datos, no hay que recalcularlo, y lo único que falta
 * es partirlo en cuotas como lo hará el backend (`construirTablaCuotas`).
 *
 * Existe porque esas pantallas lo hacían con una división directa
 * (`total / cuotas`), que no es el reparto real en interés simple: ahí se trunca
 * capital e interés por separado.
 */
export function repartoConInteresConocido(
  tipoInteres: TipoAmortizacion,
  monto: number,
  interesTotal: number,
  cuotas: number,
): { valorCuota: number; valorUltimaCuota: number; total: number } {
  const capital = Math.max(0, Number(monto) || 0)
  const interes = Math.max(0, Number(interesTotal) || 0)
  const n = Number(cuotas) || 0
  const total = capital + interes

  if (!(n > 0) || !(capital > 0)) {
    return { valorCuota: 0, valorUltimaCuota: 0, total }
  }

  if (tipoInteres === TipoAmortizacion.INTERES_PLANO || tipoInteres === TipoAmortizacion.FRANCESA) {
    // Interés plano: la cuota base es la división del total, y la última absorbe
    // el residuo.
    const valorCuota = Math.floor(total / n)
    return { valorCuota, valorUltimaCuota: total - valorCuota * (n - 1), total }
  }

  const baseCapital = Math.floor(capital / n)
  const baseInteres = Math.floor(interes / n)
  return {
    valorCuota: baseCapital + baseInteres,
    valorUltimaCuota: capital - baseCapital * (n - 1) + (interes - baseInteres * (n - 1)),
    total,
  }
}
