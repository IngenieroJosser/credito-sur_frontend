import {
  calcularPrestamoPreview,
  derivarPlazoMeses,
  repartoConInteresConocido,
} from '@/lib/creditos/preview-credito'
import { TipoAmortizacion } from '@/types/enums'

/**
 * La vista previa del modal de crédito contra las cuotas que se van a crear.
 *
 * El resumen financiero del modal es lo que el vendedor le lee al cliente antes
 * de firmar. Si no coincide con el reparto que hace el backend, se cotiza una
 * cifra y se cobra otra.
 *
 * `repartoDelBackend` de abajo es la réplica de
 * `LoansService.calculateInterestAndCuotas`, tal como está documentada y copiada
 * en `credito-sur_backend/src/importaciones/interes-credito.ts`
 * (`construirTablaCuotas`), incluidos los `Math.floor` de las bases y el residuo
 * que absorbe la última cuota. Si el backend cambia su reparto, esta prueba se
 * cae, que es justo lo que se quiere: no se pueden separar sin que se note.
 *
 * Antes de tener esto, la vista previa de interés simple no calculaba la última
 * cuota y mostraba la normal para todas: sobre esta misma rejilla se cobraba
 * hasta $80 más de lo mostrado en la última.
 */

interface CuotaReal {
  monto: number
  montoCapital: number
  montoInteres: number
}

function repartoDelBackend(
  tipo: TipoAmortizacion,
  monto: number,
  interesTotal: number,
  cantidadCuotas: number,
): CuotaReal[] {
  if (!(cantidadCuotas > 0) || !(monto > 0)) return []

  if (tipo === TipoAmortizacion.INTERES_PLANO || tipo === TipoAmortizacion.FRANCESA) {
    const totalFinanciado = monto + interesTotal
    const cuotaBase = Math.floor(totalFinanciado / cantidadCuotas)
    const interesBase = Math.floor(interesTotal / cantidadCuotas)

    let capitalRestante = monto
    let interesRestante = interesTotal

    return Array.from({ length: cantidadCuotas }, (_, i) => {
      const esUltima = i === cantidadCuotas - 1
      const montoCuota = esUltima ? capitalRestante + interesRestante : cuotaBase
      const montoInteres = esUltima ? interesRestante : Math.min(interesBase, interesRestante)
      const montoCapital = Math.max(0, montoCuota - montoInteres)

      capitalRestante = Math.max(0, capitalRestante - montoCapital)
      interesRestante = Math.max(0, interesRestante - montoInteres)

      return { monto: montoCuota, montoCapital, montoInteres }
    })
  }

  const baseCapital = Math.floor(monto / cantidadCuotas)
  const baseInteres = Math.floor(interesTotal / cantidadCuotas)

  let capitalRestante = monto
  let interesRestante = interesTotal

  return Array.from({ length: cantidadCuotas }, (_, i) => {
    const esUltima = i === cantidadCuotas - 1
    const montoCapital = esUltima ? capitalRestante : baseCapital
    const montoInteres = esUltima ? interesRestante : baseInteres

    capitalRestante = Math.max(0, capitalRestante - montoCapital)
    interesRestante = Math.max(0, interesRestante - montoInteres)

    return { monto: montoCapital + montoInteres, montoCapital, montoInteres }
  })
}

/** Cuotas que caben en un mes. Son los factores del modal y de `createLoan`. */
const CUOTAS_POR_MES: Record<string, number> = {
  DIARIO: 30,
  SEMANAL: 4,
  QUINCENAL: 2,
  MENSUAL: 1,
}

const MONTOS = [100_000, 300_000, 500_000, 1_000_000, 2_000_000, 3_000_000]
const TASAS = [5, 10, 15, 20, 29, 30]
const PLANES: Array<{ frecuencia: string; cuotas: number[] }> = [
  { frecuencia: 'DIARIO', cuotas: [20, 24, 30, 45, 60] },
  { frecuencia: 'SEMANAL', cuotas: [4, 8, 12, 16] },
  { frecuencia: 'QUINCENAL', cuotas: [2, 4, 6, 8] },
  { frecuencia: 'MENSUAL', cuotas: [1, 2, 3, 6, 12] },
]

type Caso = {
  etiqueta: string
  tipo: TipoAmortizacion
  monto: number
  tasa: number
  cuotas: number
  meses: number
}

const CASOS: Caso[] = []
for (const tipo of [TipoAmortizacion.INTERES_SIMPLE, TipoAmortizacion.INTERES_PLANO]) {
  for (const monto of MONTOS) {
    for (const tasa of TASAS) {
      for (const plan of PLANES) {
        for (const cuotas of plan.cuotas) {
          CASOS.push({
            etiqueta: `${tipo} $${monto} ${tasa}% ${cuotas}x${plan.frecuencia}`,
            tipo,
            monto,
            tasa,
            cuotas,
            meses: cuotas / CUOTAS_POR_MES[plan.frecuencia],
          })
        }
      }
    }
  }
}

describe('calcularPrestamoPreview contra el reparto del backend', () => {
  it('prueba la rejilla completa de combinaciones del negocio', () => {
    // 2 métodos x 6 montos x 6 tasas x 18 planes (5 diarios, 4 semanales,
    // 4 quincenales, 5 mensuales). Si alguien recorta la rejilla, se nota aquí.
    expect(CASOS.length).toBe(1296)
  })

  describe.each(CASOS.map((c) => [c.etiqueta, c] as const))('%s', (_etiqueta, caso) => {
    const preview = calcularPrestamoPreview({
      monto: caso.monto,
      cuotas: caso.cuotas,
      tasa: caso.tasa,
      meses: caso.meses,
      tipoInteres: caso.tipo,
    })!
    const reparto = repartoDelBackend(caso.tipo, caso.monto, preview.intereses, caso.cuotas)

    it('el total mostrado es la suma de las cuotas que se van a crear', () => {
      const sumaReal = reparto.reduce((acumulado, cuota) => acumulado + cuota.monto, 0)
      expect(preview.total).toBe(sumaReal)
    })

    it('el valor de cuota mostrado es el de las cuotas 1 a n-1', () => {
      if (caso.cuotas === 1) return
      expect(preview.valorCuota).toBe(reparto[0].monto)
    })

    it('la última cuota mostrada es la que de verdad se cobra', () => {
      expect(preview.valorUltimaCuota).toBe(reparto[reparto.length - 1].monto)
    })
  })
})

describe('bordes del formulario', () => {
  it('devuelve null mientras el monto está vacío, para no mostrar $∞', () => {
    expect(
      calcularPrestamoPreview({
        monto: 0,
        cuotas: 12,
        tasa: 10,
        meses: 12,
        tipoInteres: TipoAmortizacion.INTERES_SIMPLE,
      }),
    ).toBeNull()
  })

  it('devuelve null mientras el campo de cuotas está vacío', () => {
    expect(
      calcularPrestamoPreview({
        monto: 500_000,
        cuotas: 0,
        tasa: 10,
        meses: 1,
        tipoInteres: TipoAmortizacion.INTERES_SIMPLE,
      }),
    ).toBeNull()
  })

  it('con una sola cuota, esa cuota es el total del crédito', () => {
    const preview = calcularPrestamoPreview({
      monto: 500_000,
      cuotas: 1,
      tasa: 10,
      meses: 1,
      tipoInteres: TipoAmortizacion.INTERES_SIMPLE,
    })!
    expect(preview.valorUltimaCuota).toBe(preview.total)
  })

  it('un plazo en cero no anula el interés simple: cuenta como un mes', () => {
    const conCero = calcularPrestamoPreview({
      monto: 500_000,
      cuotas: 30,
      tasa: 10,
      meses: 0,
      tipoInteres: TipoAmortizacion.INTERES_SIMPLE,
    })!
    const conUnMes = calcularPrestamoPreview({
      monto: 500_000,
      cuotas: 30,
      tasa: 10,
      meses: 1,
      tipoInteres: TipoAmortizacion.INTERES_SIMPLE,
    })!
    expect(conCero.intereses).toBe(conUnMes.intereses)
    expect(conCero.intereses).toBeGreaterThan(0)
  })

  it('en amortización el plazo no cambia el interés: la tasa se aplica una vez', () => {
    const corto = calcularPrestamoPreview({
      monto: 500_000,
      cuotas: 30,
      tasa: 10,
      meses: 1,
      tipoInteres: TipoAmortizacion.INTERES_PLANO,
    })!
    const largo = calcularPrestamoPreview({
      monto: 500_000,
      cuotas: 360,
      tasa: 10,
      meses: 12,
      tipoInteres: TipoAmortizacion.INTERES_PLANO,
    })!
    expect(corto.intereses).toBe(largo.intereses)
    expect(corto.intereses).toBe(50_000)
  })
})

/**
 * `derivarPlazoMeses` y `repartoConInteresConocido`, que usan las pantallas de
 * aprobación y de detalle de una solicitud.
 *
 * Existen porque esas pantallas tenían su propia matemática: la del reparto era
 * una división directa del total, y la del interés tomaba el `plazoMeses` entero
 * de la base en lugar del fraccionario que usa el cálculo real.
 */
describe('derivarPlazoMeses', () => {
  it('el plazo puede quedar fraccionario a propósito', () => {
    // 45 cuotas diarias son mes y medio. Redondear a 2 infla el interés un 33%.
    expect(derivarPlazoMeses(45, 'DIARIO')).toBe(1.5)
    expect(derivarPlazoMeses(6, 'SEMANAL')).toBe(1.5)
    expect(derivarPlazoMeses(3, 'QUINCENAL')).toBe(1.5)
  })

  it('usa 4 semanas por mes, como el modal y el backend', () => {
    // El formulario de página completa usa 4,33 y por eso deriva otro número de
    // cuotas; esa divergencia está pendiente de decisión y no se replica aquí.
    expect(derivarPlazoMeses(12, 'SEMANAL')).toBe(3)
  })

  it('no le importan las mayúsculas de la frecuencia', () => {
    expect(derivarPlazoMeses(30, 'diario')).toBe(1)
  })

  it('devuelve 0 cuando no hay con qué derivar', () => {
    expect(derivarPlazoMeses(0, 'DIARIO')).toBe(0)
    expect(derivarPlazoMeses(30, 'QUINCENAL_Y_MEDIO')).toBe(0)
    expect(derivarPlazoMeses(30, '')).toBe(0)
  })
})

describe('repartoConInteresConocido contra el reparto del backend', () => {
  describe.each(CASOS.map((c) => [c.etiqueta, c] as const))('%s', (_etiqueta, caso) => {
    const preview = calcularPrestamoPreview({
      monto: caso.monto,
      cuotas: caso.cuotas,
      tasa: caso.tasa,
      meses: caso.meses,
      tipoInteres: caso.tipo,
    })!
    const reparto = repartoDelBackend(caso.tipo, caso.monto, preview.intereses, caso.cuotas)
    const conocido = repartoConInteresConocido(
      caso.tipo,
      caso.monto,
      preview.intereses,
      caso.cuotas,
    )

    it('da la misma cuota que el backend', () => {
      if (caso.cuotas === 1) return
      expect(conocido.valorCuota).toBe(reparto[0].monto)
    })

    it('da la misma última cuota que el backend', () => {
      expect(conocido.valorUltimaCuota).toBe(reparto[reparto.length - 1].monto)
    })

    it('coincide con lo que muestra el modal de creación', () => {
      expect(conocido.valorCuota).toBe(preview.valorCuota)
      expect(conocido.valorUltimaCuota).toBe(preview.valorUltimaCuota)
      expect(conocido.total).toBe(preview.total)
    })
  })

  it('no es una división directa del total: ahí estaba el peso de diferencia', () => {
    // $100.000 al 5% en 30 cuotas diarias: interés 5.000, total 105.000.
    // La división directa da 3.500; el reparto real, 3.499.
    const conocido = repartoConInteresConocido(TipoAmortizacion.INTERES_SIMPLE, 100_000, 5_000, 30)
    expect(Math.trunc(105_000 / 30)).toBe(3_500)
    expect(conocido.valorCuota).toBe(3_499)
  })

  it('en interés plano sí es la división del total', () => {
    const conocido = repartoConInteresConocido(TipoAmortizacion.INTERES_PLANO, 100_000, 5_000, 30)
    expect(conocido.valorCuota).toBe(3_500)
  })

  describe('datos incompletos', () => {
    it('sin cuotas no inventa un reparto', () => {
      const r = repartoConInteresConocido(TipoAmortizacion.INTERES_SIMPLE, 100_000, 5_000, 0)
      expect(r).toEqual({ valorCuota: 0, valorUltimaCuota: 0, total: 105_000 })
    })

    it('sin capital tampoco', () => {
      const r = repartoConInteresConocido(TipoAmortizacion.INTERES_SIMPLE, 0, 0, 12)
      expect(r).toEqual({ valorCuota: 0, valorUltimaCuota: 0, total: 0 })
    })

    it('un interés negativo se trata como cero, no contamina el total', () => {
      const r = repartoConInteresConocido(TipoAmortizacion.INTERES_SIMPLE, 120_000, -50, 12)
      expect(r.total).toBe(120_000)
      expect(r.valorCuota).toBe(10_000)
    })
  })
})
